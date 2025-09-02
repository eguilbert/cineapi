// lib/tmdb.js
import axios from "axios";

const TMDB_BASE = "https://api.themoviedb.org/3";

/**
 * Utilise de préférence un token v4 (TMDB_BEARER).
 * Sinon retombe sur la clé v3 (TMDB_API_KEY) via query string.
 */
export async function tmdbGet(path, params = {}) {
  const bearer = process.env.TMDB_BEARER;
  const apiKey = process.env.TMDB_API_KEY;

  const url = `${TMDB_BASE}${path}`;

  const headers = {};
  const query = { ...params };

  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  } else if (apiKey) {
    query.api_key = apiKey;
  } else {
    throw new Error(
      "TMDB_BEARER ou TMDB_API_KEY manquant(s) dans les variables d'environnement."
    );
  }

  const { data } = await axios.get(url, {
    headers,
    params: query,
    timeout: 15000,
  });
  return data;
}

/**
 * Récupère un film TMDB (id num) avec tous les extras utiles.
 * Langue par défaut: fr-FR (retombe sur en-US si vide).
 */
export async function fetchMovieFull(tmdbId, lang = "fr-FR") {
  return tmdbGet(`/movie/${tmdbId}`, {
    language: lang,
    append_to_response:
      "credits,release_dates,videos,external_ids,translations",
  });
}

/** Construit une URL d’affiche TMDB (taille w500 par défaut). */
export function tmdbPoster(path, size = "w500") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/** Sélectionne une bande-annonce (priorité fr puis en, YouTube/Trailer). */
export function pickBestTrailer(videos) {
  const list = (videos?.results || []).filter(
    (v) => v.site === "YouTube" && v.type === "Trailer" && v.key
  );
  if (!list.length) return null;

  // Priorité fr, puis en, sinon premier
  const fr = list.find((v) => v.iso_639_1 === "fr");
  const en = list.find((v) => v.iso_639_1 === "en");
  const chosen = fr || en || list[0];
  return `https://www.youtube.com/watch?v=${chosen.key}`;
}

/** Top X noms d’acteurs */
export function topCast(credits, take = 5) {
  return (credits?.cast || [])
    .slice(0, take)
    .map((c) => c?.name)
    .filter(Boolean)
    .join(", ");
}

/** Nom du réalisateur (premier crew avec job Director) */
export function directorName(credits) {
  return (credits?.crew || []).find((c) => c.job === "Director")?.name || null;
}

/** Nom du premier pays de production (ou code) */
export function firstProdCountryName(movie) {
  const c = (movie?.production_countries || [])[0];
  return c?.name || c?.iso_3166_1 || null;
}

/** Genre(s) sous forme de texte */
export function genresText(movie) {
  const g = movie?.genres || [];
  return g
    .map((x) => x.name)
    .filter(Boolean)
    .join(", ");
}
export async function fetchTmdbDetails(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR&append_to_response=videos`;

  const res = await axios.get(url);
  return res.data;
}
