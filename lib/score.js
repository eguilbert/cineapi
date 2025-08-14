export const interestWeights = {
  SANS_OPINION: 0,
  NOT_INTERESTED: -1,
  CURIOUS: 1,
  VERY_INTERESTED: 2,
  MUST_SEE: 3,
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeInterestStats(stats = {}) {
  const base = {
    SANS_OPINION: 0,
    NOT_INTERESTED: 0,
    CURIOUS: 0,
    VERY_INTERESTED: 0,
    MUST_SEE: 0,
  };
  const out = { ...base };
  for (const [k, v] of Object.entries(stats)) out[k] = toNum(v);
  return out;
}

export function getInterestCount(stats) {
  return Object.values(normalizeInterestStats(stats)).reduce(
    (s, n) => s + toNum(n),
    0
  );
}
export function computeAggregateScore(interestStats, avgRating = 0) {
  const total = Object.entries(interestStats || {}).reduce(
    (sum, [key, count]) => {
      const w = interestWeights[key] ?? 0;
      return sum + w * (Number.isFinite(count) ? Number(count) : 0);
    },
    0
  );

  const count = getInterestCount(interestStats);
  const avgInterestScore = count > 0 ? total / count : 0;

  return Math.round(avgInterestScore * 2 + (avgRating ?? 0) * 1);
}

export function computeAverageInterest(stats) {
  const s = normalizeInterestStats(stats);
  const total = Object.entries(s).reduce(
    (sum, [k, c]) => sum + (interestWeights[k] ?? 0) * toNum(c),
    0
  );
  const count = getInterestCount(s);
  return count > 0 ? total / count : 0; // lisibilité 1/2/3
}

// ⭐️ Popularité (volume) : somme pondérée
export function computePopularityScore(stats) {
  const s = normalizeInterestStats(stats);
  return Object.entries(s).reduce(
    (sum, [k, c]) => sum + (interestWeights[k] ?? 0) * toNum(c),
    0
  );
}
