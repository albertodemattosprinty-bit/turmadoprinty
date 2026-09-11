import test from "node:test";
import assert from "node:assert/strict";

import {
  exerciseCatalogSearchScore,
  exerciseCatalogTextSimilarity,
  sortExerciseCatalog
} from "../public/200/exercise-catalog-search.js";

const stiff = {
  id: "romanian-deadlift",
  name: "Stiff",
  alternativeNames: ["Levantamento terra romeno", "Terra romeno"],
  difficulty: 3,
  popularity: 5,
  muscleLoads: [{ muscleId: "posterior-coxa", name: "Posterior da coxa", load: 1 }]
};

test("catalog search prioritizes exact primary and alternative names", () => {
  assert.equal(exerciseCatalogSearchScore(stiff, "Stiff"), 1);
  assert.equal(exerciseCatalogSearchScore(stiff, "Levantamento terra romeno"), 1);
  assert.ok(exerciseCatalogSearchScore(stiff, "levantamnto terra romeno") >= .75);
});

test("catalog search matches muscles and rejects weak coincidences", () => {
  assert.equal(exerciseCatalogSearchScore(stiff, "posterior da coxa"), 1);
  assert.equal(exerciseCatalogSearchScore(stiff, "posteriores", { resolvedMuscleIds: ["posterior-coxa"] }), 1);
  assert.ok(exerciseCatalogTextSimilarity("supino", "levantamento terra romeno") < .75);
});

test("catalog is naturally sorted by popularity", () => {
  const ordered = sortExerciseCatalog([
    { name: "Raro", difficulty: 2, popularity: 1 },
    { name: "Popular avançado", difficulty: 5, popularity: 5 },
    { name: "Popular fácil", difficulty: 1, popularity: 5 }
  ]);
  assert.deepEqual(ordered.map(({ name }) => name), ["Popular fácil", "Popular avançado", "Raro"]);
});
