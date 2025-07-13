import jwt from "jsonwebtoken";

export function verifySupabaseToken(req) {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) throw new Error("Token manquant");

  const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  console.log("🔎 JWT payload:", decoded);

  const userId = decoded.sub;
  if (!userId) {
    throw new Error("Le token JWT ne contient pas de 'sub' (user id)");
  }

  return userId;
}
