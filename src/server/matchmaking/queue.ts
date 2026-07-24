import type { QueuePlayer } from "./types";

export type { QueuePlayer };

/** In-memory matchmaking — no Redis required. */
const queues = new Map<number, QueuePlayer[]>();

function getQueue(size: number): QueuePlayer[] {
  if (!queues.has(size)) queues.set(size, []);
  return queues.get(size)!;
}

export async function enqueue(
  size: number,
  player: Omit<QueuePlayer, "queuedAt">,
): Promise<QueuePlayer[]> {
  const queue = getQueue(size);
  const filtered = queue.filter((p) => p.userId !== player.userId);
  filtered.push({ ...player, queuedAt: Date.now() });
  queues.set(size, filtered);

  if (filtered.length >= size) {
    const matched = filtered.slice(0, size);
    queues.set(size, filtered.slice(size));
    return matched;
  }

  return [];
}

export async function dequeue(size: number, userId: string) {
  const queue = getQueue(size);
  queues.set(
    size,
    queue.filter((p) => p.userId !== userId),
  );
}

export async function queueLength(size: number): Promise<number> {
  return getQueue(size).length;
}
