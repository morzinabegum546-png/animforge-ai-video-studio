import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import projectsRouter from './routes/projects';
import scenesRouter from './routes/scenes';
import referencesRouter from './routes/references';
import assetsRouter from './routes/assets';
import renderRouter from './routes/render';
import adminRouter from './routes/admin';
import settingsRouter from './routes/settings';
import { keyStatus } from './services/keyStore';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, providers: await keyStatus() });
});

app.use('/api/projects', projectsRouter);
app.use('/api/scenes', scenesRouter);
app.use('/api/references', referencesRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/render', renderRouter);
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);

app.listen(env.port, () => {
  console.log(`[AnimForge API] Running on http://localhost:${env.port}`);
});
