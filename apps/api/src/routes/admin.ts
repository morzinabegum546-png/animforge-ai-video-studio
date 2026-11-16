import { Router } from 'express';
import { AuthenticatedRequest, requireAdmin, requireAuth } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/supabase';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/overview', async (_req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const [users, usage, jobs, settings] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('api_usage_logs').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('render_jobs').select('*, profiles(email), projects(title)').order('created_at', { ascending: false }).limit(100),
    supabase.from('system_settings').select('*'),
  ]);

  return res.json({
    users: users.data || [],
    usageLogs: usage.data || [],
    renderJobs: jobs.data || [],
    settings: settings.data || [],
  });
});

router.patch('/users/:userId', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { is_active, monthly_token_limit, monthly_render_limit, storage_limit_mb, role } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active, monthly_token_limit, monthly_render_limit, storage_limit_mb, role })
    .eq('id', req.params.userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ user: data });
});

router.patch('/settings/:key', async (req: AuthenticatedRequest, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('system_settings')
    .upsert({ key: req.params.key, value: req.body.value, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ setting: data });
});

export default router;
