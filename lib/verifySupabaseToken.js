import jwt from "jsonwebtoken";

export function verifySupabaseToken(req) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) throw new Error("Token manquant");

  const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  return decoded.sub; // Supabase user ID
}
