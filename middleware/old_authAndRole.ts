/* export function requireRole(requiredRole: string) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token manquant" });

    const { data: user, error } = await supabase.auth.getUser(token);
    if (error || !user)
      return res.status(403).json({ error: "Utilisateur non valide" });

    const userProfile = await prisma.userProfile.findUnique({
      where: { user_id: user.id },
    });

    if (!userProfile || userProfile.role !== requiredRole)
      return res.status(403).json({ error: "Accès interdit" });

    // Ajoute le profil à la requête
    req.user = userProfile;
    next();
  };
} */

//usage
/* router.post("/films", requireRole("ADMIN"), async (req, res) => {
  // Tu es sûr ici que c'est un ADMIN
}); */
