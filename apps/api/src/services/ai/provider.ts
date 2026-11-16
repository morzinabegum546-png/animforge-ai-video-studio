import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { getSupabaseAdmin } from '../../db/supabase';
import { getKey } from '../keyStore';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
  userId: string;
  projectId?: string;
  operation: string;
}

export interface AICompletionResult {
  text: string;
  provider: 'codecraft' | 'gemini';
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  name: 'codecraft' | 'gemini';
  complete(messages: ChatMessage[], options: AICompletionOptions): Promise<AICompletionResult>;
}

async function checkUserTokenQuota(userId: string) {
  const supabase = getSupabaseAdmin();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: profile }, { data: logs }] = await Promise.all([
    supabase.from('profiles').select('monthly_token_limit').eq('id', userId).single(),
    supabase
      .from('api_usage_logs')
      .select('total_tokens')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString()),
  ]);

  const limit = profile?.monthly_token_limit ?? 500000;
  const used = (logs || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);
  if (used >= limit) {
    throw new Error(`Monthly AI token quota reached (${used}/${limit}). Contact an administrator.`);
  }
}

async function logUsage(params: {
  userId: string;
  projectId?: string;
  provider: 'codecraft' | 'gemini' | 'stt';
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: 'success' | 'error' | 'rate_limited';
  errorMessage?: string;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('api_usage_logs').insert({
      user_id: params.userId,
      project_id: params.projectId || null,
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      status: params.status,
      error_message: params.errorMessage || null,
    });
  } catch {
    // Non-blocking audit log failure
  }
}

export class CodeCraftProvider implements AIProvider {
  name = 'codecraft' as const;

  async complete(messages: ChatMessage[], options: AICompletionOptions): Promise<AICompletionResult> {
    const apiKey = await getKey('codecraftApiKey');
    if (!apiKey) {
      throw new Error('CodeCraft API key is not set. Add it in Settings or CODECRAFT_API_KEY.');
    }
    await checkUserTokenQuota(options.userId);
    const model = options.model || env.codecraftDefaultModel;

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 4096,
    };
    if (options.responseFormatJson) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${env.codecraftBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      await logUsage({
        userId: options.userId,
        projectId: options.projectId,
        provider: 'codecraft',
        model,
        operation: options.operation,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        status: res.status === 429 ? 'rate_limited' : 'error',
        errorMessage: errText.slice(0, 400),
      });
      throw new Error(`CodeCraft API error (${res.status}): ${errText}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const text = json.choices?.[0]?.message?.content || '';
    const usage = {
      promptTokens: json.usage?.prompt_tokens || 0,
      completionTokens: json.usage?.completion_tokens || 0,
      totalTokens: json.usage?.total_tokens || 0,
    };

    await logUsage({
      userId: options.userId,
      projectId: options.projectId,
      provider: 'codecraft',
      model,
      operation: options.operation,
      ...usage,
      status: 'success',
    });

    return { text, provider: 'codecraft', model, usage };
  }
}

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;

  async complete(messages: ChatMessage[], options: AICompletionOptions): Promise<AICompletionResult> {
    const geminiKey = await getKey('geminiApiKey');
    if (!geminiKey) {
      throw new Error('Gemini API key is not set. Add it in Settings or GEMINI_API_KEY.');
    }
    await checkUserTokenQuota(options.userId);
    const model = options.model || env.geminiDefaultModel;
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const promptText = messages
      .map((m) => {
        const content =
          typeof m.content === 'string'
            ? m.content
            : m.content.map((p) => (p.type === 'text' ? p.text : '[image]')).join('\n');
        return `[${m.role.toUpperCase()}]: ${content}`;
      })
      .join('\n\n');

    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          temperature: options.temperature ?? 0.4,
          responseMimeType: options.responseFormatJson ? 'application/json' : undefined,
        },
      });

      const text = response.text || '';
      const meta = response.usageMetadata;
      const usage = {
        promptTokens: meta?.promptTokenCount || 0,
        completionTokens: meta?.candidatesTokenCount || 0,
        totalTokens: meta?.totalTokenCount || 0,
      };

      await logUsage({
        userId: options.userId,
        projectId: options.projectId,
        provider: 'gemini',
        model,
        operation: options.operation,
        ...usage,
        status: 'success',
      });

      return { text, provider: 'gemini', model, usage };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gemini API error';
      await logUsage({
        userId: options.userId,
        projectId: options.projectId,
        provider: 'gemini',
        model,
        operation: options.operation,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        status: 'error',
        errorMessage: msg.slice(0, 400),
      });
      throw err;
    }
  }
}

export function getAIProvider(preferred: 'codecraft' | 'gemini' = 'codecraft'): AIProvider {
  return preferred === 'gemini' ? new GeminiProvider() : new CodeCraftProvider();
}
