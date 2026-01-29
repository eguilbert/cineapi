import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        cinemaId: true,
        username: true,
      },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role || "INVITE",
      cinemaId: user.cinemaId ?? null,
      username: user.username ?? null,
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Token invalid or expired" });
  }
}
