// Resolución de referencias y armado del payload de correlatividades.

const { normSubjectKey } = require("./correlativasShared");

// Resuelve las correlativas contra los códigos internos del propio documento
// (CR###) listos para re-mapear contra la base: por número, por código cuyo
// nombre vino pegado ("301-Anatomo-Fisiología I", "SC_FB01-Salud...") o por
// nombre.
function resolveCorrelativas(subjects) {
  const byNum = new Map(
    subjects.map((s) => [s.num, s.code]).filter(([n]) => n != null),
  );
  const byRefCode = new Map(
    subjects.map((s) => [s.refCode, s.code]).filter(([c]) => c != null),
  );
  const byName = new Map(subjects.map((s) => [normSubjectKey(s.name), s]));
  for (const s of subjects) {
    const requires = [];
    for (const c of s.criteria || []) {
      let code = null;
      if (c.refs.length) {
        code = byNum.get(c.refs[c.refs.length - 1]) || null;
      }
      if (!code && c.codeRef) {
        code = byRefCode.get(c.codeRef) || null;
      }
      if (!code && c.name) {
        const match = byName.get(normSubjectKey(c.name));
        if (match) code = match.code;
      }
      if (code) requires.push(code);
    }
    s.requires = [...new Set(requires)];
  }
  return subjects;
}

function correlativasPayload(subjects) {
  return {
    sourceKind: "correlativas",
    subjects: subjects.map((s) => ({
      num: s.num,
      code: s.code,
      name: s.name,
      year: s.year,
      cuatrimestre: s.cuatrimestre,
      requires: s.requires || [],
      correlativas: s.correlativas,
    })),
    total: subjects.length,
  };
}

module.exports = { resolveCorrelativas, correlativasPayload };
