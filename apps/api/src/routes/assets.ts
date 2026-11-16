import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { env } from '../config/env';
import { getSupabaseAdmin } from '../db/supabase';

const router = Router();
router.use(requireAuth);

const assetDir = path.join(env.storageRoot, 'assets');
fs.mkdirSync(assetDir, { recursive: true });

const upload = multer({
  dest: assetDir,
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.get('/', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ assets: data });
});

router.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const assetType = String(req.body.assetType || 'image');
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('assets')
    .insert({
      user_id: req.user!.id,
      name: String(req.body.name || req.file.originalname),
      asset_type: assetType,
      mime_type: req.file.mimetype,
      file_path: req.file.path,
      size_bytes: req.file.size,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ asset: data });
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('assets')
    .select('file_path')
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Asset not found.' });
  await fs.promises.rm(existing.file_path, { force: true }).catch(() => {});
  await supabase.from('assets').delete().eq('id', req.params.id).eq('user_id', req.user!.id);
  return res.json({ ok: true });
});

export default router;
