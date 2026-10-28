// Inferencia de cuatrimestre y totales finales del plan oficial.

function finalizeOfficialPlan(ctx) {
  const { subjects, intermediateTitle } = ctx;

  // Inferencia de cuatrimestre por posición dentro del año.
  //
  // La tabla principal de la licenciatura no marca PRIMER/SEGUNDO CUATRIMESTRE:
  // solo la tabla del título intermedio los declara (para un subconjunto de
  // materias). Las materias que quedan sin cuatrimestre (todas con duración C)
  // se reparten siguiendo el orden del plan: la primera mitad del año va al 1º
  // cuatrimestre y la segunda al 2º. Así el tablero no genera una separación
  // "Cuatrimestral" espuria (p. ej. Tecnología y Sociedad u Organización de
  // Computadoras 2 en 1º año). Las materias anuales/TF y las optativas (AU) no
  // se tocan: conservan su agrupación original.
  const numOf = (s) => {
  const m = String(s.code || "").match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
  };
  const allByYear = new Map();
  for (const s of subjects) {
  if (s.year == null || s.kind !== "Materia" || s.optional) continue;
  if ((s.duration || "C") !== "C") continue;
  if (!allByYear.has(s.year)) allByYear.set(s.year, []);
  allByYear.get(s.year).push(s);
  }
  for (const list of allByYear.values()) {
  const nulls = list.filter((s) => s.cuatrimestre == null);
  if (!nulls.length) continue;
  const n = list.length;
  const cut = Math.ceil(n / 2);
  list.sort((a, b) => numOf(a) - numOf(b));
  list.forEach((s, i) => {
    if (s.cuatrimestre == null) s.cuatrimestre = i < cut ? 1 : 2;
  });
  }

  // Total de créditos del plan completo (incluye la ACA, que ya figura como
  // materia) y del título intermedio (materias del intermedio + la ACA según
  // la tabla de ese título). Ambos deberían coincidir con los totales del PDF.
  const creditsFinal = subjects.reduce((acc, s) => acc + (s.credits || 0), 0);
  const creditsIntermediate =
  subjects
    .filter((s) => s.intermediate && s.kind !== "ACA")
    .reduce((acc, s) => acc + (s.credits || 0), 0) + (ctx.intermedioAcaCredits || 0);

  return {
  sourceKind: "oficial",
  subjects,
  intermediateTitle,
  creditsFinal,
  creditsIntermediate,
  };
}

module.exports = { finalizeOfficialPlan };
