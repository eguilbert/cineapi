/* // middleware/requireAuth.js
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
 */

import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // payload.sub ou payload.userId selon ton token
    const userId = payload.sub || payload.userId;
    if (!userId)
      return res.status(401).json({ error: "Invalid token payload" });

    // IMPORTANT: récupérer role en DB (source de vérité)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        cinemaId: true,
        email: true,
        username: true,
      },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = {
      userId: user.id,
      role: user.role || "INVITE",
      cinemaId: user.cinemaId ?? null,
      email: user.email,
      username: user.username ?? null,
    };

    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
