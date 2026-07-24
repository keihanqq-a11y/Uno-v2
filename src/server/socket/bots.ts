import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/session";

const BOT_NAMES = [
  "Bot Nova",
  "Bot Ember",
  "Bot Cipher",
  "Bot Vesper",
  "Bot Quill",
  "Bot Atlas",
  "Bot Echo",
  "Bot Meridian",
];

/** Runtime set of bot user ids (Prisma cuids). */
const botUserIds = new Set<string>();

export function markBotUser(id: string) {
  botUserIds.add(id);
}

export function isBotUserId(id: string): boolean {
  return botUserIds.has(id);
}

export async function createBotUser(slot: number) {
  const tag = nanoid(6).toLowerCase();
  const username = `bot_${tag}`;
  const passwordHash = await hashPassword(nanoid(24));
  const displayName = BOT_NAMES[slot % BOT_NAMES.length];

  const bot = await prisma.user.create({
    data: {
      email: `${username}@bot.local`,
      username,
      displayName,
      passwordHash,
      emailVerified: true,
      role: "USER",
      level: 1 + (slot % 5),
      xp: 50 * slot,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  markBotUser(bot.id);
  return bot;
}

export function botLobbyPlayer(bot: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  markBotUser(bot.id);
  return {
    userId: bot.id,
    username: bot.username,
    displayName: bot.displayName,
    avatarUrl: bot.avatarUrl,
    ready: true,
    connected: true,
    isSpectator: false,
    isBot: true as const,
    seat: null as number | null,
    buyInUsd: 0,
  };
}

/** Warm the bot set from usernames already in a lobby/game. */
export function rememberBotFromUsername(userId: string, username: string) {
  if (username.startsWith("bot_")) markBotUser(userId);
}
