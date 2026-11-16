import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/supabase';
import { regenerateSingleScenePlan } from '../services/ai/storyboardGenerator';
import { generateSceneAnimationCode } from '../services/ai/animationCodeGen';
import { validateAnimationCode } from '../services/sandbox/codeValidator';

const router = Router();
router.use(requireAuth);

router.patch('/:sceneId', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() };

  if (typeof req.body.generated_code === 'string') {
    const validation = validateAnimationCode(req.body.generated_code);
    updates.code_valid = validation.valid;
    updates.validation_errors = validation.errors;
  }

  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', req.params.sceneId)
    .eq('user_id', req.user!.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ scene: data });
});

router.post('/:sceneId/validate-code', async (req: AuthenticatedRequest, res) => {
  const code = String(req.body.code || '');
  const result = validateAnimationCode(code);
  return res.json(result);
});

router.post('/:sceneId/regenerate', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: scene } = await supabase
      .from('scenes')
      .select('*, projects!inner(customization)')
      .eq('id', req.params.sceneId)
      .eq('user_id', req.user!.id)
      .single();

    if (!scene) return res.status(404).json({ error: 'Scene not found.' });
    if (scene.is_locked) return res.status(409).json({ error: 'Scene is locked. Unlock it before regenerating.' });

    const updatedPlan = await regenerateSingleScenePlan({
      userId: req.user!.id,
      projectId: scene.project_id,
      existingScene: {
        sceneOrder: scene.scene_order,
        title: scene.title,
        narrationSegment: scene.narration_segment,
        startTime: scene.start_time,
        durationSeconds: scene.duration_seconds,
        animationType: scene.animation_type,
        visualPlan: scene.visual_plan,
      },
      userInstruction: String(req.body.instruction || 'Improve visual storytelling and motion detail.'),
      customization: scene.projects.customization,
    });

    const { data: saved, error } = await supabase
      .from('scenes')
      .update({
        title: updatedPlan.title,
        narration_segment: updatedPlan.narrationSegment,
        visual_plan: updatedPlan.visualPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scene.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ scene: saved });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Scene regeneration failed' });
  }
});

router.post('/:sceneId/generate-code', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: scene } = await supabase
      .from('scenes')
      .select('*, projects!inner(customization)')
      .eq('id', req.params.sceneId)
      .eq('user_id', req.user!.id)
      .single();

    if (!scene) return res.status(404).json({ error: 'Scene not found.' });

    const result = await generateSceneAnimationCode({
      userId: req.user!.id,
      projectId: scene.project_id,
      sceneTitle: scene.title,
      narrationSegment: scene.narration_segment,
      durationSeconds: scene.duration_seconds,
      animationType: scene.animation_type,
      visualPlan: scene.visual_plan,
      customization: scene.projects.customization,
    });

    const { data: saved, error } = await supabase
      .from('scenes')
      .update({
        generated_code: result.code,
        code_valid: result.valid,
        validation_errors: result.errors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scene.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ scene: saved, validation: result });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Code generation failed' });
  }
});

router.post('/reorder', async (req: AuthenticatedRequest, res) => {
  const { projectId, orderedSceneIds } = req.body as { projectId: string; orderedSceneIds: string[] };
  if (!projectId || !Array.isArray(orderedSceneIds)) {
    return res.status(400).json({ error: 'projectId and orderedSceneIds[] are required.' });
  }
  const supabase = getSupabaseAdmin();
  for (let i = 0; i < orderedSceneIds.length; i++) {
    await supabase
      .from('scenes')
      .update({ scene_order: i + 1 })
      .eq('id', orderedSceneIds[i])
      .eq('project_id', projectId)
      .eq('user_id', req.user!.id);
  }
  return res.json({ ok: true });
});

export default router;
