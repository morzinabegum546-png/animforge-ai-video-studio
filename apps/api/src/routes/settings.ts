import { Router } from 'express';
import { AuthenticatedRequest, requireAdmin, requireAuth } from '../middleware/auth';
import { KEY_NAMES, KeyName, keyStatus, saveKeys } from '../services/keyStore';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/keys', async (_req, res) => {
  res.json(await keyStatus());
});

router.put('/keys', async (req: AuthenticatedRequest, res) => {
  try {
    const patch: Partial<Record<KeyName, string>> = {};
    for (const k of KEY_NAMES) if (typeof req.body?.[k] === 'string') patch[k] = req.body[k];
    await saveKeys(patch);
    res.json(await keyStatus());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save keys' });
  }
});

export default router;
