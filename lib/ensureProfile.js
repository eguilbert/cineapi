// lib/ensureProfile.js
import { prisma } from "./prisma.js";

const DEFAULT_CINEMA_ID = 2;

export async function ensureUserProfile(userId) {
  return prisma.userProfile.upsert({
    where: { user_id: userId },
    update: {},
    create: {
      user_id: userId,
      cinemaId: DEFAULT_CINEMA_ID,
      username: "Invité_" + String(userId).slice(0, 6),
    },
  });
}
