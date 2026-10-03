import axios from 'axios';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { createTmdbService } from '../services/tmdb-service.mjs';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

// La fabrique reste exportée pour une intégration alternative.
export function createImportTmdbRouter({ requireAuth, requireAdmin }) {
  if (typeof requireAuth !== 'function' || typeof requireAdmin !== 'function') {
    throw new Error('Fournir les vrais middlewares requireAuth et requireAdmin.');
  }
  const router = Router();
  const service = createTmdbService({ prisma, axios });
  // Recherche conservée en lecture ; tous les imports exigent ADMIN.
  const handler = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
      const upstream = error.response?.status;
      const status = error.status || (upstream === 404 ? 404 : upstream ? 502 : 500);
      // Ne pas exposer l'erreur Axios : elle peut contenir la clé dans ses paramètres.
      res.status(status).json({ error: status === 404 ? 'Film introuvable sur TMDB.' : status === 503 ? 'TMDB_API_KEY non configurée.' : 'Opération TMDB impossible. Réessayez.' });
    }
  };
  router.get('/tmdb/search', handler(async (req, res) => {
    const q = req.query.q ?? req.query.query;
    if (!q) return res.json([]);
    if (typeof q !== 'string' || !q.trim() || q.length > 200) return res.status(400).json({ error: 'Titre invalide.' });
    res.json(await service.search(q.trim()));
  }));
  const importOne = handler(async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.tmdbId) || !Number.isSafeInteger(Number(req.params.tmdbId))) {
      return res.status(400).json({ error: 'tmdbId invalide.' });
    }
    res.json(await service.importFilm(Number(req.params.tmdbId)));
  });
  router.post('/import-one/:tmdbId', requireAuth, requireAdmin, importOne);
  // Compatibilité avec l'ancien frontend. Migrer ses appels vers POST ensuite.
  router.get('/import-one/:tmdbId', requireAuth, requireAdmin, importOne);
  router.get('/import/tmdb', requireAuth, requireAdmin, handler(async (req, res) => {
    const today = new Date();
    const endDefault = new Date(today);
    endDefault.setUTCDate(today.getUTCDate() + 6);
    const start = req.query.start ?? today.toISOString().slice(0, 10);
    const end = req.query.end ?? endDefault.toISOString().slice(0, 10);
    const valid = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!valid(start) || !valid(end) || start > end) return res.status(400).json({ error: 'Période invalide (YYYY-MM-DD).' });
    const { films, failedTmdbIds } = await service.weekly(start, end);
    res.set('X-TMDB-Failed-Count', String(failedTmdbIds.length));
    // Aucun secret dans le log ; conserve la réponse historique sous forme de tableau.
    if (failedTmdbIds.length) console.warn('Imports TMDB échoués :', failedTmdbIds);
    res.json(films);
  }));
  return router;
}

// Compatible avec app.use("/api", importTmdbRoutes) dans le serveur actuel.
export default createImportTmdbRouter({ requireAuth, requireAdmin });
