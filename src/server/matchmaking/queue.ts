import { getRedis, redisKeys } from "@/lib/redis/client";

export interface QueuePlayer {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  queuedAt: number;
}

/** Simple Redis list-based matchmaking for a target player count (2–5). */
export async function enqueue(
  size: number,
  player: Omit<QueuePlayer, "queuedAt">,
): Promise<QueuePlayer[]> {
  const redis = getRedis();
  if (redis.status !== "ready") await redis.connect().catch(() => undefined);

  const key = redisKeys.matchmaking(size);
  await redis.lrem(key, 0, player.userId);
  // Store JSON payloads; also keep a set of userIds for quick membership
  const payload: QueuePlayer = { ...player, queuedAt: Date.now() };
  await redis.rpush(key, JSON.stringify(payload));

  const raw = await redis.lrange(key, 0, -1);
  const players = raw.map((r) => JSON.parse(r) as QueuePlayer);

  if (players.length >= size) {
    const matched = players.slice(0, size);
    // Remove matched from queue
    await redis.del(key);
    const remaining = players.slice(size);
    if (remaining.length) {
      await redis.rpush(key, ...remaining.map((p) => JSON.stringify(p)));
    }
    return matched;
  }

  return [];
}

export async function dequeue(size: number, userId: string) {
  const redis = getRedis();
  if (redis.status !== "ready") await redis.connect().catch(() => undefined);
  const key = redisKeys.matchmaking(size);
  const raw = await redis.lrange(key, 0, -1);
  const filtered = raw
    .map((r) => JSON.parse(r) as QueuePlayer)
    .filter((p) => p.userId !== userId);
  await redis.del(key);
  if (filtered.length) {
    await redis.rpush(key, ...filtered.map((p) => JSON.stringify(p)));
  }
}

export async function queueLength(size: number): Promise<number> {
  const redis = getRedis();
  if (redis.status !== "ready") await redis.connect().catch(() => undefined);
  return redis.llen(redisKeys.matchmaking(size));
}
