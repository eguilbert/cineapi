import { lucia } from "../lib/lucia.js";
import { verifyRequestOrigin } from "lucia";

export async function requireSession(req, res, next) {
  if (req.method !== "GET") {
    const origin = req.headers.origin ?? null;
    const host = req.headers.host ?? null;

    const isDev = process.env.NODE_ENV !== "production";
    const ALLOWED_ORIGINS = [
      `http://${host}`, // autorise la même origine que celle du host
      ...(isDev
        ? [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
          ]
        : []),
    ];

    if (!origin || !host || !verifyRequestOrigin(origin, ALLOWED_ORIGINS)) {
      return res.status(403).json({ error: "BAD_ORIGIN", origin, host });
    }
  }

  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "");
  if (!sessionId) {
    req.user = null;
    return res.status(401).json({ error: "NO_SESSION" });
  }

  const { session, user } = await lucia.validateSession(sessionId);

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

  req.user = {
    id: user.id ?? user.userId ?? user.user_id,
    email: user.email ?? null,
  };
  next();
}
