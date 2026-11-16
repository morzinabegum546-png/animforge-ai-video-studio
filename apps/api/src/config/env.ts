import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  storageRoot: path.resolve(process.env.STORAGE_ROOT || './storage'),

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  codecraftBaseUrl: process.env.CODECRAFT_API_BASE_URL || 'https://codecraftapi.com/v1',
  codecraftApiKey: process.env.CODECRAFT_API_KEY || '',
  codecraftDefaultModel: process.env.CODECRAFT_DEFAULT_MODEL || 'claude-opus-4-5',

  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiDefaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',

  sttBaseUrl: process.env.STT_API_BASE_URL || '',
  sttApiKey: process.env.STT_API_KEY || '',
  sttModel: process.env.STT_MODEL || 'whisper-1',

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  renderConcurrency: Number(process.env.RENDER_CONCURRENCY || 2),
};
