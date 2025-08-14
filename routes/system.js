// routes/system.js
import { Router } from "express";
const router = Router();

const healthHandler = async (req, res) => {
  try {
    console.log("Health check received");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
    // ou test DB si tu veux :
    // await prisma.$executeRawUnsafe("SELECT 1");
    // res.status(200).json({ status: "ok", db: true });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
};

router.get("/health", healthHandler); // => /api/health via app.use('/api', router)
export default router;
