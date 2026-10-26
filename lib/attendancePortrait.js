export function attendancePortrait(projections) {
  const films = new Map();
  let admissions = 0;
  for (const row of projections) {
    if (row.audienceCount == null || row.audienceCount < 0) continue;
    admissions += row.audienceCount;
    const id = row.filmId;
    const entry = films.get(id) || { filmId: id, title: row.film.title, category: row.film.category || 'Sans catégorie', admissions: 0, shows: 0 };
    entry.admissions += row.audienceCount;
    entry.shows++;
    films.set(id, entry);
  }
  const rows = [...films.values()].map((f) => ({ ...f, averagePerShow: Math.round(f.admissions / f.shows) }));
  const categories = new Map();
  for (const f of rows) {
    const entry = categories.get(f.category) || { category: f.category, admissions: 0, shows: 0, films: 0 };
    entry.admissions += f.admissions;
    entry.shows += f.shows;
    entry.films++;
    categories.set(f.category, entry);
  }
  return {
    admissions, shows: rows.reduce((sum, f) => sum + f.shows, 0), films: rows.length,
    categories: [...categories.values()].map((c) => ({ ...c, averagePerShow: Math.round(c.admissions / c.shows) })).sort((a, b) => b.admissions - a.admissions),
    topFilms: rows.sort((a, b) => b.admissions - a.admissions).slice(0, 10),
  };
}
