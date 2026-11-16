import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../db/supabase';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }
    const token = authHeader.slice(7);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single();

    if (profile && !profile.is_active) {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email || '',
      role: (profile?.role as 'user' | 'admin') || 'user',
    };
    return next();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Authentication error' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator privileges required.' });
  }
  return next();
}
