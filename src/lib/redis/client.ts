import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return globalForRedis.redis;
}

export const redisKeys = {
  session: (token: string) => `session:${token}`,
  matchmaking: (size: number) => `matchmaking:${size}`,
  lobby: (code: string) => `lobby:${code}`,
  game: (id: string) => `game:${id}`,
  userSocket: (userId: string) => `user:socket:${userId}`,
  rateLimit: (key: string) => `rl:${key}`,
} as const;
