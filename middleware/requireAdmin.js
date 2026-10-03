// À utiliser après requireAuth, qui charge le rôle depuis la base.
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  return next();
}
