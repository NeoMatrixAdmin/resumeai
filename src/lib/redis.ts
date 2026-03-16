import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const FREE_LIMIT = 2;

export async function getUsageCount(fingerprint: string): Promise<number> {
  const count = await redis.get<number>(`usage:${fingerprint}`);
  return count ?? 0;
}

export async function incrementUsage(fingerprint: string): Promise<number> {
  const key = `usage:${fingerprint}`;
  const newCount = await redis.incr(key);
  await redis.expire(key, 60 * 60 * 24 * 30);
  return newCount;
}