// middleware/requireAuth.js
import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer token"
  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, iat, exp }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token invalid or expired" });
  }
}

/* // lib/requireAuth.js
import { lucia } from "./lucia.js";
import { verifyRequestOrigin } from "lucia";

const ORIGIN_ALLOWLIST = [
  /^http:\/\/localhost:\d+$/, // 3000, 3001, etc.
  "https://cineplages.vercel.app",
  /\.vercel\.app$/, // previews Vercel
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ORIGIN_ALLOWLIST.some((o) =>
    o instanceof RegExp ? o.test(origin) : o === origin
  );
}

export async function requireAuth(req, res, next) {
  try {
    // 0) Ne jamais bloquer le préflight
    if (req.method === "OPTIONS") return next();

    // 1) Lire les credentials possibles
    const cookieHeader = req.headers.cookie ?? "";
    const hasBearer = Boolean(req.headers.authorization);
    let sessionId = lucia.readSessionCookie(cookieHeader);
    if (!sessionId && hasBearer) {
      sessionId = lucia.readBearerToken(req.headers.authorization) ?? null;
    }

    // 2) CSRF / Origin check — seulement si state-changing ET cookie-based
    const isStateChanging = req.method !== "GET";
    const usingCookie = Boolean(sessionId) && !hasBearer;

    if (isStateChanging && usingCookie) {
      const origin = req.headers.origin || null;

      // a) Si tu fais *strictement* du same-site avec cookie: (optionnel)
      // const host = req.headers["x-forwarded-host"] || req.headers.host || null;
      // if (!origin || !host || !verifyRequestOrigin(origin, [host])) {
      //   return res.status(403).json({ error: "Origin non autorisée (same-site)" });
      // }

      // b) En cross-origin avec cookie, préfère une allowlist explicite :
      if (!isAllowedOrigin(origin)) {
        return res.status(403).json({ error: "Origin non autorisée" });
      }
    }

    // 3) Auth obligatoire
    if (!sessionId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { session, user } = await lucia.validateSession(sessionId);

    // 4) Gestion du cookie (refresh/purge) si nécessaire
    if (res && session?.fresh) {
      const c = lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", c.serialize());
    }
    if (res && !session) {
      const c = lucia.createBlankSessionCookie();
      res.setHeader("Set-Cookie", c.serialize());
    }

    if (!session || !user) {
      return res.status(401).json({ error: "Session invalide ou expirée" });
    }

    req.session = session;
    req.user = user;
    next();
  } catch (e) {
    console.error("Erreur requireAuth:", e);
    return res.status(401).json({ error: "Authentification requise" });
  }
}
 */
/* // lib/requireAuth.js
import { lucia } from "./lucia.js"; // <- ton instance Lucia v3 déjà configurée (adapter Prisma)
import { verifyRequestOrigin } from "lucia";

export async function requireAuth(req, res, next) {
  try {
    // CSRF: sur POST/PUT/PATCH/DELETE on vérifie l’Origin vs Host
    if (req.method !== "GET") {
      const origin = req.headers.origin || null;
      const host = req.headers["x-forwarded-host"] || req.headers.host || null;
      if (!origin || !host || !verifyRequestOrigin(origin, [host])) {
        return res.status(403).json({ error: "Origin non autorisée" });
      }
    }

    // 1) Cookie Lucia (recommandé)
    const cookieHeader = req.headers.cookie ?? "";
    let sessionId = lucia.readSessionCookie(cookieHeader);

    // 2) Optionnel: support Bearer (si tu appelles l’API depuis une autre origine/outil)
    if (!sessionId) {
      const authz = req.headers.authorization || "";
      sessionId = lucia.readBearerToken(authz) ?? null;
    }

    if (!sessionId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { session, user } = await lucia.validateSession(sessionId);

    // Rafraîchir / purger le cookie si nécessaire
    if (res && session?.fresh) {
      const c = lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", c.serialize());
    }
    if (res && !session) {
      const c = lucia.createBlankSessionCookie();
      res.setHeader("Set-Cookie", c.serialize());
    }

    if (!session || !user) {
      return res.status(401).json({ error: "Session invalide ou expirée" });
    }

    // Exposer au routeur
    req.session = session;
    req.user = user; // user.id = ton nouvel identifiant (Lucia)
    next();
  } catch (e) {
    console.error("Erreur requireAuth:", e);
    return res.status(401).json({ error: "Authentification requise" });
  }
}
 */
