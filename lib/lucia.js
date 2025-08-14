/* // lib/lucia.js
import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma.js";

// ⚠️ Passer bien les 3 délégués: session, user, key
const adapter = new PrismaAdapter(prisma.session, prisma.user, prisma.key);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    // Assure-toi que le frontend utilise le même nom
    name: "session",
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // "strict" si tout est même site, sinon garde "lax"
      path: "/",
      httpOnly: true, // par défaut chez Lucia, mais on le rappelle
    },
  },
  getUserAttributes: (user) => ({
    id: user.id, // UUID (string)
    email: user.email,
    role: user.role,
  }),
});

export default lucia;
 */
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
const crossSite = process.env.CROSS_SITE === "0";

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "session",
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
