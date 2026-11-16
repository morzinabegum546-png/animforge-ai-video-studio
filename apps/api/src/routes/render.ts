import { Router } from 'express';
import fs from 'fs';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/supabase';
import { getRenderQueue } from '../queue/renderQueue';
import { validateAnimationCode } from '../services/sandbox/codeValidator';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('render_jobs')
    .select('*, projects(title)')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ jobs: data });
});

router.post('/enqueue', async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.body as { projectId: string };
    const supabase = getSupabaseAdmin();

    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', req.user!.id)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const { data: scenes } = await supabase
      .from('scenes')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', req.user!.id)
      .order('scene_order', { ascending: true });

    if (!scenes || scenes.length === 0) {
      return res.status(400).json({ error: 'Generate a storyboard and scene code before rendering.' });
    }

    for (const s of scenes) {
      const check = validateAnimationCode(s.generated_code || '');
      if (!check.valid) {
        return res.status(400).json({
          error: `Scene ${s.scene_order} ("${s.title}") failed security/syntax validation: ${check.errors.join('; ')}`,
        });
      }
    }

    let voiceFilePath: string | undefined;
    let musicFilePath: string | undefined;
    if (project.voice_asset_id) {
      const { data: v } = await supabase.from('assets').select('file_path').eq('id', project.voice_asset_id).single();
      voiceFilePath = v?.file_path;
    }
    if (project.music_asset_id) {
      const { data: m } = await supabase.from('assets').select('file_path').eq('id', project.music_asset_id).single();
      musicFilePath = m?.file_path;
    }

    const outputCfg = project.customization?.output || { resolution: '1080p', aspectRatio: '16:9', fps: 30 };

    const { data: jobRow, error: jobErr } = await supabase
      .from('render_jobs')
      .insert({
        project_id: project.id,
        user_id: req.user!.id,
        status: 'queued',
        progress: 0,
        resolution: outputCfg.resolution || '1080p',
        aspect_ratio: outputCfg.aspectRatio || '16:9',
      })
      .select()
      .single();

    if (jobErr || !jobRow) return res.status(500).json({ error: jobErr?.message || 'Failed to create render job' });

    const queue = getRenderQueue();
    await queue.add('render-video', {
      jobId: jobRow.id,
      projectId: project.id,
      userId: req.user!.id,
      resolution: outputCfg.resolution || '1080p',
      aspectRatio: outputCfg.aspectRatio || '16:9',
      fps: outputCfg.fps || 30,
      scenes: scenes.map((s) => ({
        id: s.id,
        projectId: s.project_id,
        sceneOrder: s.scene_order,
        title: s.title,
        narrationSegment: s.narration_segment,
        startTime: Number(s.start_time),
        durationSeconds: Number(s.duration_seconds),
        animationType: s.animation_type,
        visualPlan: s.visual_plan,
        generatedCode: s.generated_code,
        codeValid: s.code_valid,
        validationErrors: s.validation_errors,
        isLocked: s.is_locked,
      })),
      customization: project.customization,
      voiceFilePath,
      musicFilePath,
      transcriptSegments: project.transcript_segments || [],
    });

    await supabase.from('projects').update({ status: 'rendering' }).eq('id', project.id);
    return res.status(202).json({ job: jobRow });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Render enqueue failed' });
  }
});

router.get('/:jobId/download', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data: job } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('id', req.params.jobId)
    .eq('user_id', req.user!.id)
    .single();

  if (!job || job.status !== 'completed' || !job.output_path || !fs.existsSync(job.output_path)) {
    return res.status(404).json({ error: 'Rendered MP4 file is not available.' });
  }
  return res.download(job.output_path, `animforge_${job.id}.mp4`);
});

export default router;
