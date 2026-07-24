import { prisma } from "@/lib/db/prisma";
import { levelFromXp, xpForLevel } from "@/lib/utils";

const DAILY_XP = 25;
const WIN_XP = 100;
const LOSS_XP = 25;
const PLAY_XP = 15;

export async function grantXp(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const xp = user.xp + amount;
  const level = levelFromXp(xp);

  return prisma.user.update({
    where: { id: userId },
    data: { xp, level },
  });
}

export async function claimDailyLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, error: "User not found" };

  const now = new Date();
  if (user.lastDailyRewardAt) {
    const last = new Date(user.lastDailyRewardAt);
    const sameDay =
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate();
    if (sameDay) {
      return { ok: false as const, error: "Already claimed today" };
    }
  }

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const streakContinues =
    !!user.lastDailyRewardAt &&
    user.lastDailyRewardAt.getUTCFullYear() === yesterday.getUTCFullYear() &&
    user.lastDailyRewardAt.getUTCMonth() === yesterday.getUTCMonth() &&
    user.lastDailyRewardAt.getUTCDate() === yesterday.getUTCDate();

  const loginStreak = streakContinues ? user.loginStreak + 1 : 1;
  const bonus = Math.min(loginStreak * 5, 50);
  const total = DAILY_XP + bonus;
  const xp = user.xp + total;
  const level = levelFromXp(xp);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      lastDailyRewardAt: now,
      lastLoginAt: now,
      loginStreak,
      xp,
      level,
    },
  });

  await maybeUnlockAchievements(userId);

  return {
    ok: true as const,
    xpGained: total,
    loginStreak,
    user: updated,
    nextLevelXp: xpForLevel(level + 1),
  };
}

export async function recordMatchResult(params: {
  userId: string;
  gameId: string;
  won: boolean;
  placement: number;
  playerCount: number;
  cardsLeft: number;
}) {
  const xpEarned = PLAY_XP + (params.won ? WIN_XP : LOSS_XP);
  await prisma.matchHistory.create({
    data: {
      userId: params.userId,
      gameId: params.gameId,
      won: params.won,
      placement: params.placement,
      playerCount: params.playerCount,
      cardsLeft: params.cardsLeft,
      xpEarned,
    },
  });

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      gamesPlayed: { increment: 1 },
      wins: params.won ? { increment: 1 } : undefined,
      losses: params.won ? undefined : { increment: 1 },
    },
  });

  await grantXp(params.userId, xpEarned);
  await maybeUnlockAchievements(params.userId);
  return xpEarned;
}

export async function maybeUnlockAchievements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { achievements: true },
  });
  if (!user) return;

  const owned = new Set(user.achievements.map((a) => a.achievementId));
  const achievements = await prisma.achievement.findMany();

  for (const a of achievements) {
    if (owned.has(a.id)) continue;
    let unlock = false;
    if (a.key === "first_win" && user.wins >= 1) unlock = true;
    if (a.key === "veteran_10" && user.gamesPlayed >= 10) unlock = true;
    if (a.key === "champion_25" && user.wins >= 25) unlock = true;
    if (a.key === "level_5" && user.level >= 5) unlock = true;
    if (a.key === "streak_3" && user.loginStreak >= 3) unlock = true;

    if (unlock) {
      await prisma.userAchievement.create({
        data: { userId, achievementId: a.id },
      });
      await grantXp(userId, a.xpReward);

      const badge = await prisma.badge.findUnique({ where: { key: a.key } });
      if (badge) {
        await prisma.userBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: badge.id } },
          create: { userId, badgeId: badge.id },
          update: {},
        });
      }
    }
  }
}

export { DAILY_XP, WIN_XP, LOSS_XP, PLAY_XP };
