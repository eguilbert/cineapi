import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma.js";

export const lucia = new Lucia(new PrismaAdapter(prisma.session, prisma.user), {
  sessionCookie: {
    name: "session",
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },
  getUserAttributes: (user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
  }),
});
