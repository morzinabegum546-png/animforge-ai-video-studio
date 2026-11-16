import { env } from '../config/env';
import { getSupabaseAdmin } from '../db/supabase';

export const KEY_NAMES = ['codecraftApiKey', 'geminiApiKey', 'sttApiKey', 'sttBaseUrl'] as const;
export type KeyName = (typeof KEY_NAMES)[number];

let cache: { at: number; values: Partial<Record<KeyName, string>> } | null = null;

async function loadStored(): Promise<Partial<Record<KeyName, string>>> {
  if (cache && Date.now() - cache.at < 15_000) return cache.values;
  let values: Partial<Record<KeyName, string>> = {};
  try {
    const { data } = await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'api_keys').maybeSingle();
    values = (data?.value as Partial<Record<KeyName, string>>) || {};
  } catch {
    // fall back to env only
  }
  cache = { at: Date.now(), values };
  return values;
}

/** Dashboard-saved value wins; falls back to the backend environment variable. */
export async function getKey(name: KeyName): Promise<string> {
  const stored = await loadStored();
  return (stored[name] || (env as Record<string, unknown>)[name] || '') as string;
}

export async function saveKeys(patch: Partial<Record<KeyName, string>>) {
  const current = await loadStored();
  const next = { ...current };
  for (const k of KEY_NAMES) {
    if (typeof patch[k] === 'string') {
      const v = patch[k]!.trim();
      if (v) next[k] = v;
      else delete next[k];
    }
  }
  const { error } = await getSupabaseAdmin()
    .from('system_settings')
    .upsert({ key: 'api_keys', value: next, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  cache = null;
}

export async function keyStatus() {
  const [c, g, s, b] = await Promise.all([getKey('codecraftApiKey'), getKey('geminiApiKey'), getKey('sttApiKey'), getKey('sttBaseUrl')]);
  return { codecraftConfigured: Boolean(c), geminiConfigured: Boolean(g), sttConfigured: Boolean(s && b) };
}
