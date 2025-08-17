// middleware/requireSession.js
export const requireSession = async (req, res, next) => {
  try {
    const cookieName = lucia.sessionCookie?.name || "auth_session";
    const sessionId = req.cookies?.[cookieName];
    if (!sessionId) return res.status(401).json({ error: "NO_SESSION" });

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
      const blank = lucia.createBlankSessionCookie();
      res.setHeader("Set-Cookie", blank.serialize());
      return res.status(401).json({ error: "NO_SESSION" });
    }
    if (session.fresh) {
      const rotated = lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", rotated.serialize());
    }
    req.auth = { userId: session.userId };
    next();
  } catch (e) {
    return res.status(401).json({ error: "NO_SESSION" });
  }
};
