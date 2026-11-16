import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RenderJobPayload } from '@animforge/shared';
import { env } from '../config/env';

let connection: IORedis | null = null;
let renderQueue: Queue<RenderJobPayload> | null = null;

export function getRenderQueue(): Queue<RenderJobPayload> {
  if (!connection) {
    connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
  }
  if (!renderQueue) {
    renderQueue = new Queue<RenderJobPayload>('video-render', {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }
  return renderQueue;
}
