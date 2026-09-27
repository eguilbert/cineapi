import { tmdbGet } from './tmdb.js';

export async function researchFilm(film) {
  const id = film.tmdbId;
  const base = `https://www.themoviedb.org/movie/${id}`;
  const [details, keywords, reviews] = await Promise.all([
    tmdbGet(`/movie/${id}`, { language: 'fr-FR' }),
    tmdbGet(`/movie/${id}/keywords`),
    tmdbGet(`/movie/${id}/reviews`, { language: 'en-US', page: 1 }),
  ]);
  return {
    searchedAt: new Date().toISOString(),
    source: base,
    reception: { average: details.vote_average ?? null, count: details.vote_count ?? 0, source: base },
    reviews: (reviews.results || []).slice(0, 5).map((r) => ({
      author: r.author, rating: r.author_details?.rating ?? null, url: r.url,
    })),
    reviewCountOnTmdb: reviews.total_results ?? 0,
    keywords: (keywords.keywords || []).map((k) => k.name).slice(0, 30),
    localTags: film.filmTags.map(({ tag }) => tag.label),
    awards: { status: 'non_verifie', reason: 'Aucune source de prix fiable raccordée.' },
  };
}
