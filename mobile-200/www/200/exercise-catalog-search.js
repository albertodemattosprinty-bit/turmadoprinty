export function normalizeExerciseCatalogSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinDistance(left, right) {
  const a = normalizeExerciseCatalogSearch(left);
  const b = normalizeExerciseCatalogSearch(right);
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

export function exerciseCatalogTextSimilarity(query, candidate) {
  const needle = normalizeExerciseCatalogSearch(query);
  const text = normalizeExerciseCatalogSearch(candidate);
  if (!needle || !text) return 0;
  if (needle === text) return 1;
  if (text.startsWith(needle)) return .98;
  if (text.includes(needle)) return .95;
  if (needle.includes(text) && text.length >= 4) return .9;
  const phrases = [text, ...text.split(" ")];
  const needleWords = needle.split(" ");
  const textWords = text.split(" ");
  if (needleWords.length > 1 && textWords.length >= needleWords.length) {
    for (let index = 0; index <= textWords.length - needleWords.length; index += 1) {
      phrases.push(textWords.slice(index, index + needleWords.length).join(" "));
    }
  }
  return Math.max(...phrases.map((phrase) => {
    const longest = Math.max(needle.length, phrase.length);
    return longest ? 1 - (levenshteinDistance(needle, phrase) / longest) : 0;
  }));
}

function exerciseSearchCandidates(exercise) {
  const aliases = Array.isArray(exercise?.alternativeNames) ? exercise.alternativeNames : [];
  const names = Array.isArray(exercise?.names) ? exercise.names : [];
  const muscles = Array.isArray(exercise?.muscleLoads) ? exercise.muscleLoads : Array.isArray(exercise?.muscles) ? exercise.muscles : [];
  return [exercise?.name, exercise?.exerciseName, ...aliases, ...names, ...muscles.flatMap((muscle) => [muscle?.name, muscle?.muscleId])].filter(Boolean);
}

export function exerciseCatalogSearchScore(exercise, query, { resolvedMuscleIds = [] } = {}) {
  const needle = normalizeExerciseCatalogSearch(query);
  if (!needle) return 1;
  const muscleIds = new Set((Array.isArray(resolvedMuscleIds) ? resolvedMuscleIds : []).map(String));
  if (muscleIds.size && (Array.isArray(exercise?.muscleLoads) ? exercise.muscleLoads : exercise?.muscles || []).some((muscle) => muscleIds.has(String(muscle?.muscleId || muscle?.id || "")))) return 1;
  return Math.max(0, ...exerciseSearchCandidates(exercise).map((candidate) => exerciseCatalogTextSimilarity(needle, candidate)));
}

export function sortExerciseCatalog(exercises, order = "popular") {
  const list = [...(Array.isArray(exercises) ? exercises : [])];
  return list.sort((left, right) => {
    if (order === "easy") return (Number(left.difficulty) || 1) - (Number(right.difficulty) || 1) || (Number(right.popularity) || 0) - (Number(left.popularity) || 0) || String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
    if (order === "hard") return (Number(right.difficulty) || 1) - (Number(left.difficulty) || 1) || (Number(right.popularity) || 0) - (Number(left.popularity) || 0) || String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
    if (order === "az") return String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
    return (Number(right.popularity) || 0) - (Number(left.popularity) || 0) || (Number(left.difficulty) || 1) - (Number(right.difficulty) || 1) || String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
  });
}
