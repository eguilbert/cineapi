import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendFilm } from "../lib/recommendationV1.js";

test("le calcul explicite les correspondances sans inventer de données public ou presse", () => {
  const result = recommendFilm(
    { genre: "Documentaire", category: "Art et essai", origin: "France", keywords: "" },
    { favoredTerms: ["documentaire", "art et essai"], avoidedTerms: ["horreur"] },
  );
  assert.equal(result.editorialFit, 80);
  assert.deepEqual(result.evidence.matchedFavoredTerms, ["documentaire", "art et essai"]);
  assert.equal(result.audienceFit, null);
  assert.equal(result.recommendedShows, null);
});

test("aucune correspondance ne produit pas un faux score", () => {
  assert.equal(recommendFilm({ genre: "Drame" }, { favoredTerms: ["documentaire"], avoidedTerms: [] }).editorialFit, null);
});

test("l'historique est conservé comme observation, sans prédiction de fréquentation", () => {
  const history = { category: "Documentaire", projectionCount: 8, filmCount: 3, averagePerShow: 24 };
  const result = recommendFilm({ genre: "Documentaire" }, { favoredTerms: ["documentaire"], avoidedTerms: [] }, history);
  assert.deepEqual(result.evidence.attendanceHistory, history);
  assert.equal(result.audienceFit, null);
});
