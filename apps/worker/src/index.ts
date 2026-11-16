import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { RenderJobPayload } from '@animforge/shared';
import { renderRemotionVideo } from './remotionRenderer';
import { mixAudioAndExportMp4 } from './ffmpegPipeline';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const storageRoot = path.resolve(process.env.STORAGE_ROOT || './storage');
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker<RenderJobPayload>(
  'video-render',
  async (job) => {
    const payload = job.data;
    const jobDir = path.join(storageRoot, 'renders', payload.jobId);
    await fs.mkdir(jobDir, { recursive: true });

    const updateStatus = async (status: string, progress: number, extra: Record<string, unknown> = {}) => {
      await supabase
        .from('render_jobs')
        .update({ status, progress, ...extra })
        .eq('id', payload.jobId);
    };

    try {
      await updateStatus('bundling', 15, { started_at: new Date().toISOString() });
      const silentVideoPath = await renderRemotionVideo(payload, jobDir, async (pct) => {
        await updateStatus('rendering', pct);
      });

      await updateStatus('mixing', 90);
      const finalMp4 = path.join(jobDir, 'final_output.mp4');
      await mixAudioAndExportMp4({
        silentVideoPath,
        voiceFilePath: payload.voiceFilePath,
        musicFilePath: payload.musicFilePath,
        outputPath: finalMp4,
        audioConfig: payload.customization?.audio,
      });

      await updateStatus('completed', 100, {
        output_path: finalMp4,
        completed_at: new Date().toISOString(),
      });
      await supabase.from('projects').update({ status: 'completed' }).eq('id', payload.projectId);
      return { outputPath: finalMp4 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Render worker failure';
      await updateStatus('failed', 0, { error_message: msg });
      await supabase.from('projects').update({ status: 'failed' }).eq('id', payload.projectId);
      throw err;
    }
  },
  {
    connection,
    concurrency: Number(process.env.RENDER_CONCURRENCY || 2),
  }
);

worker.on('ready', () => {
  console.log('[AnimForge Worker] Isolated Remotion + FFmpeg render worker ready.');
});
