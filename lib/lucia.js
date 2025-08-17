import { Lucia } from "lucia";

// import ton adapter Prisma/Drizzle etc.
//import { adapter } from "./adapter.js";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma.js";

// ⚠️ Passer bien les 3 délégués: session, user, key

const adapter = new PrismaAdapter(prisma.session, prisma.user, prisma.key);

const isProd = process.env.NODE_ENV === "production";
// Mets CROSS_SITE=1 si, en prod, le navigateur appelle DIRECTEMENT l'API sur un autre domaine (vercel.app → railway.app).
// Si tu gardes le proxy Nuxt en prod (recommandé), laisse CROSS_SITE non défini ou à 0.
const crossSite = process.env.CROSS_SITE === "1";

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "session",
    expires: true,
    attributes: {
      // SameSite:
      // - proxy same-site (dev/prod) → "lax"
      // - cross-site (front ≠ API en prod) → "none" OBLIGATOIRE
      sameSite: crossSite ? "none" : "lax",
      // Secure:
      // - prod (HTTPS) → true OBLIGATOIRE
      // - dev (HTTP local) → false
      secure: isProd,
      path: "/",
      // Ne définis "domain" que si tu veux partager le cookie entre sous-domaines.
      // Sinon, laisse undefined: il sera limité à l'hôte courant (plus simple et plus sûr).
      domain: process.env.COOKIE_DOMAIN || undefined,
      partitioned: true,
    },
  },
  getUserAttributes: (user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
  }),
});

// Recommandé derrière Vercel/Railway pour que "secure" et les X-Forwarded-* soient fiables
export function setupExpress(app) {
  app.set("trust proxy", 1);
}
