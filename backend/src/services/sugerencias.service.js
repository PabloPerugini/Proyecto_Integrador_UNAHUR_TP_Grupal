// Sugerencias de inscripción AR-3 (FRD §3.1.2–3.1.3).
// Reglas C1–C6 y mensajes R0–R6/Msj0–Msj6 calculados sobre historial real.
// Limitación honesta: el modelo de progreso no registra abandono/ausencia
// (no hay C4/C5/C6 observables) → rigen las fusiones del FRD: sin C4 en A
// se usan C1–C3; sin C1/C2, todo lo aprobado va a C5 [APROBADA]. Sin término
// por cuatrimestre: "últimos dos cuatrimestres" ≈ actividad de 12 meses.
const { buildGraph } = require("./graph.service");

const YEAR_MS = 365 * 24 * 3600 * 1000;

const isAprobada = (p) => p.status === "Aprobada";
const isRegular = (p) => p.status === "Regular";

function classA(p) {
  if (isAprobada(p)) {
    if (p.nota != null && p.nota >= 7) return "C1";
    if (p.nota != null) return "C2"; // 4–7 (o <4: igual aprobada, conservador)
    return "CX"; // aprobada sin nota: no se distingue C1/C2
  }
  if (isRegular(p)) return "C3";
  return null; // Cursando/Pendiente no entran en A
}

function buildSugerencias({ subjects, progress = [] }) {
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  const nameOf = (code) => (byCode.get(code)?.name || code);

  // MATERIAS A
  const A = { C1: [], C2: [], C3: [], C5: [] };
  const sinNota = [];
  for (const p of progress) {
    const c = classA(p);
    if (c === "CX") sinNota.push(p.subjectCode);
    else if (c) A[c].push(p.subjectCode);
  }
  if (!A.C1.length && !A.C2.length) {
    // Fusión C5 [APROBADA] (FRD §3.1.2): sin C1/C2 no se distingue nota.
    A.C5 = sinNota;
  } else {
    // Con C1/C2 presentes, las sin nota van a C2 (conservador).
    A.C2.push(...sinNota);
  }

  // MATERIAS B (estadísticas observables, orden decreciente)
  const B = { C1: A.C1.length, C2: A.C2.length, C3: A.C3.length, C4: 0, C5: 0, C6: 0 };
  const bStats = Object.entries(B)
    .map(([k, v]) => ({ regla: k, count: v }))
    .sort((a, b) => b.count - a.count);

  // Grafo: disponibles ahora y camino crítico
  const graph = buildGraph({ subjects, progress });
  const disponibles = (graph.availableNow || []).map((code) => ({
    code,
    name: nameOf(code),
    critica: (graph.criticalPath || []).includes(code),
  }));

  // Finales pendientes = Regularizadas
  const finales = progress.filter(isRegular).map((p) => ({
    code: p.subjectCode,
    name: nameOf(p.subjectCode),
  }));

  // Comunes no cursadas: kind ACA/AU/OTRA o genéricas, sin progreso iniciado
  const touched = new Set(progress.filter((p) => p.status !== "Pendiente").map((p) => p.subjectCode));
  const comunes = subjects
    .filter(
      (s) =>
        ["ACA", "AU", "OTRA"].includes(s.kind) && !touched.has(s.code),
    )
    .map((s) => ({ code: s.code, name: s.name }));

  // Ritmo R2: actividad últimos ~12 meses
  const since = Date.now() - YEAR_MS;
  const recent = progress.filter((p) => {
    const t = p.fecha ? new Date(p.fecha).getTime() : NaN;
    const c = p.createdAt ? new Date(p.createdAt).getTime() : NaN;
    const when = Number.isFinite(t) ? t : c;
    return p.status !== "Pendiente" && (!Number.isFinite(when) || when >= since);
  });
  const y = new Set(recent.map((p) => p.subjectCode)).size;
  const x = recent.filter(isRegular).length;

  // R5: inscripto hace más de 2 años
  const firsts = progress
    .map((p) => (p.createdAt ? new Date(p.createdAt).getTime() : NaN))
    .filter(Number.isFinite);
  const oldest = firsts.length ? Math.min(...firsts) : null;
  const regularizadas = progress.filter(isRegular).length;
  const aprobadas1er = progress.filter(
    (p) => isAprobada(p) && (byCode.get(p.subjectCode)?.year === 1 || byCode.get(p.subjectCode)?.year == null),
  ).length;
  const r5 =
    oldest != null &&
    Date.now() - oldest > 2 * YEAR_MS &&
    (regularizadas < 3 || finales.length > 4);

  const mensajes = [
    {
      regla: "R0",
      texto:
        "Estimado/a estudiante, en función de tu recorrido académico, te enviamos las siguientes sugerencias de inscripción para el próximo período.",
    },
  ];
  if (regularizadas) {
    mensajes.push({
      regla: "R1",
      texto: `Considerando las ${regularizadas} materias que regularizaste, te sugerimos para tu inscripción (en orden de correlatividad y camino crítico): ${disponibles
        .slice(0, 8)
        .map((d) => `${d.name}${d.critica ? " [crítica]" : ""}`)
        .join("; ") || "—"}.`,
    });
  }
  mensajes.push({
    regla: "R2",
    texto: `En los últimos cuatrimestres registraste actividad en ${y} materia/s y regularizaste ${x}. Para el próximo cuatrimestre te sugerimos inscribirte en ${x + 1} materia/s.`,
  });
  if (comunes.length) {
    mensajes.push({
      regla: "R3",
      texto: `También podés cursar en cualquier momento estas materias comunes como complemento: ${comunes
        .slice(0, 6)
        .map((c) => c.name)
        .join("; ")}.`,
    });
  }
  if (finales.length) {
    mensajes.push({
      regla: "R4",
      texto: `Considerá preparar los exámenes finales de: ${finales.map((f) => f.name).join("; ")}.`,
    });
  }
  if (r5) {
    mensajes.push({
      regla: "R5",
      texto:
        "Te sugerimos acercarte a la Dirección de Orientación y Acompañamiento (orientacionestudiantil@unahur.edu.ar) para planificar tu trayectoria.",
    });
  }
  mensajes.push({
    regla: "R6",
    texto:
      "La planificación del cuatrimestre es fundamental para sostener la cursada. En la UNAHUR estamos para acompañarte.",
  });

  return {
    materiasA: {
      C1: A.C1,
      C2: A.C2,
      C3: A.C3,
      ...(A.C5.length ? { C5: A.C5 } : {}),
    },
    materiasB: bStats,
    disponibles,
    finalesPendientes: finales,
    comunesDisponibles: comunes,
    ritmo: { ultimos12Meses: y, regularizadas: x, sugeridas: x + 1 },
    mensajes,
  };
}

module.exports = { buildSugerencias };
