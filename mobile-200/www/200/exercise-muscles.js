export const PROJECT200_MUSCLES = Object.freeze([
  ["pescoco", "Pescoço", "front-upper"],
  ["deltoide", "Deltoide", "front-upper"],
  ["peitoral-maior", "Peitoral maior", "front-upper"],
  ["serratil-anterior", "Serrátil anterior", "front-upper"],
  ["reto-abdominal-superior", "Reto abdominal superior", "front-upper"],
  ["reto-abdominal-medio", "Reto abdominal médio", "front-upper"],
  ["reto-abdominal-inferior", "Reto abdominal inferior", "front-upper"],
  ["obliquo-externo", "Oblíquo externo", "front-upper"],
  ["biceps", "Bíceps", "front-upper"],
  ["antebraco", "Antebraço", "front-upper"],
  ["flexores-quadril", "Flexores do quadril", "front-lower"],
  ["vasto-lateral", "Vasto lateral", "front-lower"],
  ["reto-femoral", "Reto femoral", "front-lower"],
  ["vasto-medial", "Vasto medial", "front-lower"],
  ["adutores", "Adutores", "front-lower"],
  ["regiao-patelar", "Região patelar", "front-lower"],
  ["tibial-anterior", "Tibial anterior", "front-lower"],
  ["panturrilha", "Panturrilha", "front-lower"],
  ["pe", "Pé", "front-lower"],
  ["trapezio", "Trapézio", "posterior"],
  ["deltoide-posterior", "Deltoide posterior", "posterior"],
  ["romboide", "Romboide", "posterior"],
  ["latissimo-dorso", "Latíssimo do dorso", "posterior"],
  ["triceps", "Tríceps", "posterior"],
  ["antebraco-posterior", "Antebraço posterior", "posterior"],
  ["lombar", "Lombar", "posterior"],
  ["gluteo-medio", "Glúteo médio", "posterior"],
  ["gluteo-maximo", "Glúteo máximo", "posterior"],
  ["posterior-coxa", "Posterior da coxa", "posterior"],
  ["panturrilha-posterior", "Panturrilha posterior", "posterior"]
].map(([id, name, map]) => Object.freeze({ id, name, map })));

export const PROJECT200_MUSCLE_IDS = Object.freeze(PROJECT200_MUSCLES.map(({ id }) => id));
export const PROJECT200_MUSCLE_BY_ID = Object.freeze(Object.fromEntries(PROJECT200_MUSCLES.map((muscle) => [muscle.id, muscle])));

function comparable(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const aliases = new Map();
function addAliases(values, ids) { values.forEach((value) => aliases.set(comparable(value), ids)); }
PROJECT200_MUSCLES.forEach(({ id, name }) => addAliases([id, name], [id]));
addAliases(["Abdômen", "Abdominal", "Abdominais"], ["reto-abdominal-superior", "reto-abdominal-medio", "reto-abdominal-inferior"]);
addAliases(["Abdutores"], ["gluteo-medio"]);
addAliases(["Antebraços"], ["antebraco", "antebraco-posterior"]);
addAliases(["Braquial"], ["biceps"]);
addAliases(["Braços"], ["biceps", "triceps", "antebraco"]);
addAliases(["Cardio", "Aeróbico"], ["reto-femoral", "posterior-coxa", "panturrilha"]);
addAliases(["Core"], ["reto-abdominal-medio", "obliquo-externo", "lombar"]);
addAliases(["Corpo inteiro"], ["peitoral-maior", "reto-femoral", "latissimo-dorso"]);
addAliases(["Costas"], ["latissimo-dorso", "romboide", "trapezio"]);
addAliases(["Deltoides", "Ombro"], ["deltoide"]);
addAliases(["Dorsais", "Dorsal", "Latíssimo"], ["latissimo-dorso"]);
addAliases(["Glúteos", "Glúteo"], ["gluteo-maximo", "gluteo-medio"]);
addAliases(["Oblíquos"], ["obliquo-externo"]);
addAliases(["Ombros"], ["deltoide", "deltoide-posterior"]);
addAliases(["Panturrilhas"], ["panturrilha", "panturrilha-posterior"]);
addAliases(["Peitoral", "Peito"], ["peitoral-maior"]);
addAliases(["Pernas"], ["reto-femoral", "posterior-coxa", "panturrilha"]);
addAliases(["Posteriores", "Posteriores da coxa"], ["posterior-coxa"]);
addAliases(["Quadríceps"], ["vasto-lateral", "reto-femoral", "vasto-medial"]);

export function project200MuscleIdsFor(value) {
  const direct = PROJECT200_MUSCLE_BY_ID[String(value || "").trim()];
  return direct ? [direct.id] : [...(aliases.get(comparable(value)) || [])];
}

export function normalizeProject200MuscleSelections(values, { quantize } = {}) {
  const normalized = new Map();
  for (const raw of Array.isArray(values) ? values : []) {
    const ids = project200MuscleIdsFor(raw?.muscleId ?? raw?.id ?? raw?.name ?? raw);
    const hasLoad = raw?.load !== null && raw?.load !== undefined && raw?.load !== "";
    const numeric = Number(raw?.load);
    const load = !hasLoad ? null : (typeof quantize === "function" ? quantize(raw?.load) : (Number.isFinite(numeric) ? Math.max(.25, Math.min(1, Math.round(numeric * 20) / 20)) : null));
    for (const id of ids) {
      const muscle = PROJECT200_MUSCLE_BY_ID[id];
      if (!muscle) continue;
      const previous = normalized.get(id);
      if (!previous || (Number.isFinite(load) && (!Number.isFinite(previous.load) || load > previous.load))) normalized.set(id, { muscleId: id, name: muscle.name, load });
    }
  }
  return [...normalized.values()].sort((left, right) => (Number(right.load) || 0) - (Number(left.load) || 0)).slice(0, 3);
}
