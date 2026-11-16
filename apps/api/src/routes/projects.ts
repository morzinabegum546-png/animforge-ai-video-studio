import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/supabase';
import { probeAudioDuration, segmentScriptWithTiming, transcribeAudioIfConfigured } from '../services/ai/voiceAnalyzer';
import { generateStoryboard } from '../services/ai/storyboardGenerator';
import { StyleBenchmark, TranscriptSegment } from '@animforge/shared';

const router = Router();
router.use(requireAuth);

const createProjectSchema = z.object({
  title: z.string().min(1).max(160),
  topicOrScript: z.string().default(''),
  language: z.enum(['bn', 'en']).default('bn'),
  animationMode: z.enum(['2d', '3d', 'mixed', 'ai-assisted']).default('2d'),
  referenceMode: z.enum(['ref1', 'ref2', 'combined', 'custom']).default('combined'),
  referenceIds: z.array(z.string().uuid()).default([]),
  voiceAssetId: z.string().uuid().optional().nullable(),
  musicAssetId: z.string().uuid().optional().nullable(),
  customization: z.record(z.unknown()).default({}),
});

router.get('/', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ projects: data });
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const supabase = getSupabaseAdmin();
  const p = parsed.data;
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: req.user!.id,
      title: p.title,
      topic_or_script: p.topicOrScript,
      language: p.language,
      animation_mode: p.animationMode,
      reference_mode: p.referenceMode,
      reference_ids: p.referenceIds,
      voice_asset_id: p.voiceAssetId || null,
      music_asset_id: p.musicAssetId || null,
      customization: p.customization,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ project: data });
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .single();
  if (error || !project) return res.status(404).json({ error: 'Project not found.' });

  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', project.id)
    .eq('user_id', req.user!.id)
    .order('scene_order', { ascending: true });

  return res.json({ project, scenes: scenes || [] });
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('projects')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ project: data });
});

router.post('/:id/analyze-voice', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    let duration = Number(req.body.fallbackDurationSeconds || 30);
    let segments: TranscriptSegment[] = [];
    let sttSource: 'stt_api' | 'script_alignment' = 'script_alignment';

    if (project.voice_asset_id) {
      const { data: asset } = await supabase
        .from('assets')
        .select('file_path')
        .eq('id', project.voice_asset_id)
        .eq('user_id', req.user!.id)
        .single();

      if (asset?.file_path) {
        duration = await probeAudioDuration(asset.file_path);
        const stt = await transcribeAudioIfConfigured(asset.file_path, project.language);
        if (stt.source === 'stt_api' && stt.segments.length > 0) {
          segments = stt.segments;
          sttSource = 'stt_api';
        }
      }
    }

    if (segments.length === 0) {
      if (!project.topic_or_script?.trim()) {
        return res.status(400).json({
          error:
            'No Speech-to-Text API is configured (STT_API_KEY) and no script text was provided. Please enter your narration script or configure STT_API_KEY.',
        });
      }
      segments = await segmentScriptWithTiming({
        scriptText: project.topic_or_script,
        totalDurationSeconds: duration,
        language: project.language,
        userId: req.user!.id,
        projectId: project.id,
      });
    }

    await supabase
      .from('projects')
      .update({ transcript_segments: segments, updated_at: new Date().toISOString() })
      .eq('id', project.id);

    return res.json({ durationSeconds: duration, source: sttSource, segments });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Voice analysis failed' });
  }
});

router.post('/:id/storyboard', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    let benchmarks: StyleBenchmark[] = [];
    if (Array.isArray(project.reference_ids) && project.reference_ids.length > 0) {
      const { data: refs } = await supabase
        .from('reference_videos')
        .select('style_benchmark')
        .in('id', project.reference_ids)
        .eq('user_id', req.user!.id);
      benchmarks = (refs || []).map((r) => r.style_benchmark as StyleBenchmark);
    }

    const scenes = await generateStoryboard({
      userId: req.user!.id,
      projectId: project.id,
      title: project.title,
      topicOrScript: project.topic_or_script,
      language: project.language,
      animationMode: project.animation_mode,
      transcriptSegments: project.transcript_segments || [],
      benchmarks,
      customization: project.customization,
    });

    // Preserve locked scenes if regenerating unlocked storyboard
    await supabase.from('scenes').delete().eq('project_id', project.id).eq('is_locked', false);

    const rows = scenes.map((s) => ({
      project_id: project.id,
      user_id: req.user!.id,
      scene_order: s.sceneOrder,
      title: s.title,
      narration_segment: s.narrationSegment,
      start_time: s.startTime,
      duration_seconds: s.durationSeconds,
      animation_type: s.animationType,
      visual_plan: s.visualPlan,
    }));

    const { data: inserted, error } = await supabase.from('scenes').insert(rows).select();
    if (error) return res.status(500).json({ error: error.message });

    await supabase
      .from('projects')
      .update({ status: 'storyboard_ready', updated_at: new Date().toISOString() })
      .eq('id', project.id);

    return res.json({ scenes: inserted });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Storyboard generation failed' });
  }
});

export default router;
