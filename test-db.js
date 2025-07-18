app.get("/test-db", async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    res.json({ dbTime: result });
  } catch (e) {
    console.error("Erreur Prisma:", e);
    res.status(500).json({ error: "Connexion échouée" });
  }
});
