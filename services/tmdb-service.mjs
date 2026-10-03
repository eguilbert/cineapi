// Service partagé. Les dépendances sont injectées pour permettre les tests sans DB.
export function createTmdbService({ prisma, axios, apiKey = () => process.env.TMDB_API_KEY }) {
  const include = { director: true, productionCountries: { include: { country: true } } };
  const safeDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  async function get(path, params = {}) {
    const key = apiKey();
    if (!key) throw Object.assign(new Error('TMDB_API_KEY non configurée.'), { status: 503 });
    return (await axios.get(`https://api.themoviedb.org/3${path}`, {
      params: { api_key: key, language: 'fr-FR', ...params }, timeout: 15000,
    })).data;
  }
  function theatricalDate(releases, country, range) {
    const dates = (releases.results?.find(r => r.iso_3166_1 === country)?.release_dates || [])
      .filter(r => r.type === 2 || r.type === 3).map(r => safeDate(r.release_date)).filter(Boolean)
      .sort((a, b) => a - b);
    return dates.find(date => !range || (date >= range.start && date <= range.end)) || null;
  }
  // Conservation de la règle actuelle, sans prétendre à un classement AFCAE officiel.
  function category(detail) {
    const genres = (detail.genres || []).map(g => g.name.toLowerCase());
    if (genres.includes('animation') || genres.includes('familial')) return 'Jeunesse';
    if (genres.some(g => ['comédie', 'action', 'aventure', 'fantasy', 'science-fiction', 'thriller'].includes(g))) return 'Grand Public';
    if (genres.includes('documentaire')) return 'Documentaire';
    return 'Art et Essai';
  }
  const validInt = value => Number.isInteger(value) && value >= 0 && value <= 2147483647 ? value : null;
  async function trailer(tmdbId) {
    const select = data => (data.results || []).filter(v => v.site === 'YouTube' && v.key && ['Trailer', 'Teaser', 'Clip'].includes(v.type))
      .sort((a, b) => (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0))[0];
    let video = select(await get(`/movie/${tmdbId}/videos`));
    if (!video) video = select(await get(`/movie/${tmdbId}/videos`, { language: 'en-US' }));
    return video ? `https://www.youtube.com/watch?v=${video.key}` : null;
  }
  async function importFilm(tmdbId, { refresh = false, range = null, skipShort = false } = {}) {
    if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) throw Object.assign(new Error('tmdbId invalide.'), { status: 400 });
    const existing = await prisma.film.findUnique({ where: { tmdbId }, include });
    if (existing && !refresh) return existing;
    const [detail, releases] = await Promise.all([get(`/movie/${tmdbId}`), get(`/movie/${tmdbId}/release_dates`)]);
    const releaseDate = theatricalDate(releases, 'FR', range);
    // Ces filtres restent propres à l'import hebdomadaire, pas à l'ajout manuel.
    if ((range && !releaseDate) || (skipShort && detail.runtime && detail.runtime <= 45)) return null;
    const [credits, trailerUrl] = await Promise.all([get(`/movie/${tmdbId}/credits`), trailer(tmdbId)]);
    const directorName = credits.crew?.find(p => p.job === 'Director')?.name;
    const posterUrl = detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null;
    const common = {
      title: detail.title || detail.original_title,
      releaseDate, releaseCanDate: theatricalDate(releases, 'CA'), posterUrl, trailerUrl,
    };
    if (!common.title) throw new Error('Titre TMDB absent.');
    try {
      return await prisma.$transaction(async tx => {
        // Nouvelle vérification après les appels réseau.
        const current = await tx.film.findUnique({ where: { tmdbId }, include });
        if (current && !refresh) return current;
        const director = directorName ? await tx.director.upsert({ where: { name: directorName }, update: {}, create: { name: directorName } }) : null;
        const directorLink = director ? { director: { connect: { id: director.id } } } : {};
        if (current) {
          // Champs déjà rafraîchis par l'import hebdomadaire d'origine.
          return tx.film.update({ where: { tmdbId }, data: { ...common, ...directorLink }, include });
        }
        const countries = [];
        for (const name of new Set((detail.production_countries || []).map(c => c.name).filter(Boolean))) {
          countries.push(await tx.country.upsert({ where: { name }, update: {}, create: { name } }));
        }
        return tx.film.create({ data: {
          tmdbId, ...common, ...directorLink,
          genre: detail.genres?.[0]?.name || '', category: category(detail), synopsis: detail.overview || null,
          duration: validInt(detail.runtime), budget: validInt(detail.budget), origin: detail.origin_country?.[0] || '',
          actors: (credits.cast || []).slice(0, 4).map(actor => actor.name).join(', '), seances: 0,
          productionCountries: { create: countries.map(c => ({ country: { connect: { id: c.id } } })) },
        }, include });
      });
    } catch (error) {
      // Deux imports concurrents peuvent se rencontrer sur l'unicité de tmdbId.
      if (error.code === 'P2002') {
        const winner = await prisma.film.findUnique({ where: { tmdbId }, include });
        if (winner) return winner;
      }
      throw error;
    }
  }
  async function search(query) {
    const data = await get('/search/movie', { query, include_adult: false });
    return (data.results || []).map(movie => ({ tmdbId: movie.id, title: movie.title,
      originalTitle: movie.original_title, releaseDate: movie.release_date, synopsis: movie.overview,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : null }));
  }
  async function weekly(start, end) {
    const range = { start: new Date(`${start}T00:00:00.000Z`), end: new Date(`${end}T23:59:59.999Z`) };
    const ids = new Set();
    let totalPages = 1;
    for (let page = 1; page <= Math.min(totalPages, 5); page++) {
      const data = await get('/discover/movie', { region: 'FR', sort_by: 'release_date.desc',
        'release_date.gte': start, 'release_date.lte': end, with_release_type: '2|3', include_video: false, include_adult: false, page });
      totalPages = data.total_pages;
      for (const film of data.results || []) ids.add(film.id);
    }
    const films = [];
    const failedTmdbIds = [];
    for (const id of ids) {
      try {
        const film = await importFilm(id, { refresh: true, range, skipShort: true });
        if (film) films.push({ ...film, directorName: film.director?.name });
      } catch { failedTmdbIds.push(id); }
    }
    return { films, failedTmdbIds };
  }
  return { importFilm, search, weekly };
}
