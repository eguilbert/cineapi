// middleware/lucia.js
import { lucia } from "../lib/lucia.js";

export async function requireSession(req, res, next) {
  const { session, user } = await lucia.validateRequest(req, res);
  if (!session || !user) return res.status(401).json({ error: "NO_SESSION" });
  req.user = { id: user.userId, email: user.email ?? null };
  next();
}
