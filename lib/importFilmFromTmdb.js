// lib/importFilmFromTmdb.js
import {
  fetchMovieFull,
  tmdbPoster,
  pickBestTrailer,
  topCast,
  directorName as getDirectorName,
  firstProdCountryName,
  genresText,
} from "./tmdb.js";
import { prisma } from "./prisma.js";

/**
 * Importe (ou met à jour) un film à partir d’un tmdbId.
 * Retourne l’enregistrement Film (avec quelques include légers).
 */
export async function importFilmFromTmdb(tmdbId, lang = "fr-FR") {
  if (!tmdbId) throw new Error("tmdbId manquant.");

  // 1) Fetch TMDB
  const m = await fetchMovieFull(tmdbId, lang);

  const title =
    m.title ||
    m.translations?.translations?.find((t) => t.iso_639_1 === "fr")?.data
      ?.title ||
    m.original_title;

  const synopsis =
    m.overview ||
    m.translations?.translations?.find((t) => t.iso_639_1 === "fr")?.data
      ?.overview ||
    null;

  const trailerUrl = pickBestTrailer(m.videos);
  const posterUrl = tmdbPoster(m.poster_path);
  const actors = topCast(m.credits);
  const director = getDirectorName(m.credits);
  const origin =
    (m.origin_country && m.origin_country[0]) ||
    m.original_language?.toUpperCase() ||
    null;
  const firstProductionCountry = firstProdCountryName(m);
  const genre = genresText(m);

  // 2) Upsert Film (base)
  const film = await prisma.film.upsert({
    where: { tmdbId: Number(tmdbId) },
    update: {
      title,
      synopsis,
      duration: m.runtime || null,
      posterUrl,
      trailerUrl,
      actors,
      origin: origin || null,
      genre: genre || null,
      releaseDate: m.release_date ? new Date(m.release_date) : null,
      rating: m.vote_average ? Math.round(m.vote_average) : null, // si tu stockes un rating entier
    },
    create: {
      tmdbId: Number(tmdbId),
      title,
      synopsis,
      duration: m.runtime || null,
      posterUrl,
      trailerUrl,
      actors,
      origin: origin || null,
      genre: genre || null,
      releaseDate: m.release_date ? new Date(m.release_date) : null,
      rating: m.vote_average ? Math.round(m.vote_average) : null,
    },
  });

  // 3) (Optionnel) Lier/Créer Réalisateur
  try {
    if (director) {
      const dir = await prisma.director.upsert({
        where: { name: director },
        update: {},
        create: { name: director },
      });
      await prisma.film.update({
        where: { id: film.id },
        data: { directorId: dir.id },
      });
    }
  } catch {
    // ignore si le modèle/clé n'existe pas dans ton schéma actuel
  }

  // 4) (Optionnel) Pays de prod principal → Country + pivot
  try {
    if (firstProductionCountry) {
      const c = await prisma.country.upsert({
        where: { name: firstProductionCountry },
        update: {},
        create: { name: firstProductionCountry },
      });
      // Selon ton schéma, ce pivot peut s’appeler différemment.
      // Ici, on suppose un modèle FilmProductionCountry avec filmId/countryId.
      await prisma.filmProductionCountry.upsert({
        where: { filmId_countryId: { filmId: film.id, countryId: c.id } },
        update: {},
        create: { filmId: film.id, countryId: c.id },
      });
    }
  } catch {
    // ignore si ces modèles n'existent pas
  }

  // 5) (Optionnel) External Links (TMDB, IMDB)
  try {
    const links = [];
    links.push({
      url: `https://www.themoviedb.org/movie/${tmdbId}`,
      label: "TMDB",
    });
    if (m.external_ids?.imdb_id) {
      links.push({
        url: `https://www.imdb.com/title/${m.external_ids.imdb_id}/`,
        label: "IMDB",
      });
    }
    for (const l of links) {
      await prisma.externalLink.upsert({
        where: { filmId_url: { filmId: film.id, url: l.url } },
        update: { label: l.label },
        create: { filmId: film.id, url: l.url, label: l.label },
      });
    }
  } catch {
    // ignore si externalLink n'existe pas ou contrainte différente
  }

  // 6) Revoie le film (avec un include léger si tu veux)
  const full = await prisma.film.findUnique({
    where: { id: film.id },
    include: {
      director: true,
      externalLinks: true,
      productionCountries: {
        include: { country: true },
      },
    },
  });
  return full || film;
}
