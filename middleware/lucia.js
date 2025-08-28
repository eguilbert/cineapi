/* // middleware/lucia.js
import { lucia } from "../lib/lucia.js";

export async function requireSession(req, res, next) {
  const { session, user } = await lucia.validateRequest(req, res);
  if (!session || !user) return res.status(401).json({ error: "NO_SESSION" });
  req.user = { id: user.userId, email: user.email ?? null };
  next();
}
 */

// middleware/lucia.js (v3)
import { lucia } from "../lib/lucia.js"; // ton instance Lucia v3
import { verifyRequestOrigin } from "lucia";

export async function requireSession(req, res, next) {
  // CSRF pour requêtes non-GET
  if (req.method !== "GET") {
    const origin = req.headers.origin ?? null;
    const host = req.headers.host ?? null;
    if (!origin || !host || !verifyRequestOrigin(origin, [host])) {
      return res.status(403).json({ error: "BAD_ORIGIN" });
    }
  }

  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "");
  if (!sessionId) {
    req.user = null;
    return res.status(401).json({ error: "NO_SESSION" });
  }

  const { session, user } = await lucia.validateSession(sessionId);

  // refresh cookie si nécessaire
  if (session && session.fresh) {
    res.appendHeader(
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize()
    );
  }
  if (!session) {
    res.appendHeader(
      "Set-Cookie",
      lucia.createBlankSessionCookie().serialize()
    );
    return res.status(401).json({ error: "INVALID_SESSION" });
  }

  // ✅ ce que tu veux utiliser dans tes routes
  req.user = {
    id: user.id ?? user.userId ?? user.user_id,
    email: user.email ?? null,
  };
  next();
}
