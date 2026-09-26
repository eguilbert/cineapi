export const ALGORITHM_VERSION = "editorial-v1";

const normalize = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function recommendFilm(film, profile, attendanceHistory = null) {
  const terms = [film.genre, film.category, film.origin, film.keywords]
    .filter(Boolean).join(" ");
  const haystack = normalize(terms);
  const favored = (profile?.favoredTerms ?? []).filter((term) => haystack.includes(normalize(term)));
  const avoided = (profile?.avoidedTerms ?? []).filter((term) => haystack.includes(normalize(term)));
  // A neutral 50 is deliberately not presented as evidence when nothing matches.
  const editorialFit = favored.length || avoided.length
    ? Math.max(0, Math.min(100, 50 + favored.length * 15 - avoided.length * 20))
    : null;
  const evidence = {
    filmFields: { genre: film.genre, category: film.category, origin: film.origin, keywords: film.keywords },
    matchedFavoredTerms: favored,
    matchedAvoidedTerms: avoided,
    attendanceHistory,
  };
  const reasoning = editorialFit === null
    ? "Données insuffisantes pour estimer l'affinité éditoriale."
    : `Affinité éditoriale fondée sur ${favored.length} préférence(s) et ${avoided.length} exclusion(s) correspondant aux métadonnées du film.`;
  return {
    editorialFit, audienceFit: null, criticalInterest: null, discoveryValue: null,
    recommendedWeek: null, recommendedShows: null,
    reasoning, evidence, algorithmVersion: ALGORITHM_VERSION,
  };
}
