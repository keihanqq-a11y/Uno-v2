import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password1", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@uno.local" },
    update: {},
    create: {
      email: "admin@uno.local",
      username: "admin",
      displayName: "Table Admin",
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      level: 10,
      xp: 2500,
      wins: 42,
      gamesPlayed: 60,
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: "player@uno.local" },
    update: {},
    create: {
      email: "player@uno.local",
      username: "goldhand",
      displayName: "Gold Hand",
      passwordHash,
      emailVerified: true,
      level: 3,
      xp: 420,
      wins: 8,
      gamesPlayed: 15,
    },
  });

  const achievements = [
    { key: "first_win", name: "First Blood", description: "Win your first match", xpReward: 50 },
    { key: "veteran_10", name: "Veteran", description: "Play 10 games", xpReward: 75 },
    { key: "champion_25", name: "Champion", description: "Win 25 games", xpReward: 150 },
    { key: "level_5", name: "Rising Star", description: "Reach level 5", xpReward: 100 },
    { key: "streak_3", name: "Consistent", description: "3-day login streak", xpReward: 40 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: a,
      create: a,
    });
    await prisma.badge.upsert({
      where: { key: a.key },
      update: {
        name: a.name,
        description: a.description,
        color: "#D4AF37",
      },
      create: {
        key: a.key,
        name: a.name,
        description: a.description,
        color: "#D4AF37",
      },
    });
  }

  console.log("Seeded admin:", admin.username, "demo:", demo.username);
  console.log("Login with Password1");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
