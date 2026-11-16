import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { env } from '../config/env';
import { getSupabaseAdmin } from '../db/supabase';
import { analyzeReferenceVideo } from '../services/ai/referenceAnalyzer';

const router = Router();
router.use(requireAuth);

const refDir = path.join(env.storageRoot, 'references');
fs.mkdirSync(refDir, { recursive: true });

const upload = multer({
  dest: refDir,
  limits: { fileSize: 150 * 1024 * 1024 },
});

router.get('/', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('reference_videos')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ references: data });
});

router.post('/upload', upload.single('video'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file uploaded.' });
  const title = String(req.body.title || req.file.originalname || 'Reference Video');
  const preferredProvider = req.body.provider === 'gemini' ? 'gemini' : 'codecraft';

  const supabase = getSupabaseAdmin();
  const { data: refRow, error: insertErr } = await supabase
    .from('reference_videos')
    .insert({
      user_id: req.user!.id,
      title,
      file_path: req.file.path,
      status: 'analyzing',
    })
    .select()
    .single();

  if (insertErr || !refRow) return res.status(500).json({ error: insertErr?.message || 'Insert failed' });

  try {
    const analysis = await analyzeReferenceVideo({
      videoPath: req.file.path,
      title,
      userId: req.user!.id,
      preferredProvider,
    });

    const { data: updated } = await supabase
      .from('reference_videos')
      .update({
        duration_seconds: analysis.metadata.durationSeconds,
        resolution: analysis.metadata.resolution,
        fps: analysis.metadata.fps,
        style_benchmark: analysis.benchmark,
        status: 'ready',
      })
      .eq('id', refRow.id)
      .select()
      .single();

    return res.status(201).json({ reference: updated });
  } catch (err) {
    await supabase.from('reference_videos').update({ status: 'failed' }).eq('id', refRow.id);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Reference analysis failed' });
  }
});

export default router;
