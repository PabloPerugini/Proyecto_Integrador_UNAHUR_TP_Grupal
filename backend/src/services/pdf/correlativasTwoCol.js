// Parser de correlatividades en dos columnas sin numeración.

const { cleanName, groupRows } = require("./shared");
const {
  normSubjectKey,
  splitCorrelativas,
  isAnchorRow,
  isNoiseRow,
  CORREL_TOKEN_NOISE_RE,
} = require("./correlativasShared");

// Rama dos-columnas sin números (p. ej. correlativas de Diseño Industrial):
// columna izquierda con nombres envueltos (x≈87), columna derecha con
// correlativas (x≈221). Cada fila con celda derecha cierra una materia; las
// filas solo-derecha que terminan truncadas ("...Gestión del") continúan
// hacia abajo, el resto se cuelga hacia arriba. Gated: header con
// "Correlativas"+"Curricular" y cero anclas numeradas en todo el doc.
const TWOCOL_TAIL_RE = /(\b(de|del|y|e|en|la|el|los|las|un|una|con|para|por|al)|[-–—])\s*$/i;

function isTwoColCorrelativas(rawPages) {
  let sawHeader = false;
  let numbered = 0;
  for (const page of rawPages) {
    const rows = groupRows(page);
    let hasCorr = false;
    let hasCurr = false;
    for (const row of rows) {
      for (const it of row.items) {
        if (it.t === "Correlativas") hasCorr = true;
        if (it.t === "Curricular") hasCurr = true;
      }
      if (isAnchorRow(row) && !isNoiseRow(row)) numbered += 1;
    }
    if (hasCorr && hasCurr) sawHeader = true;
  }
  return sawHeader && numbered === 0;
}

function parseTwoColCorrelativas(rawPages) {
  const subjects = [];
  const byName = new Map();
  let seq = 0;
  const push = (nameToks, corrToks) => {
    const name = cleanName(nameToks);
    if (!name) return;
    const key = normSubjectKey(name);
    if (byName.has(key)) return;
    const corrText = corrToks.join(" ").replace(/\s+/g, " ").trim();
    const criteria = corrText
      .split(/\s+-\s+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .flatMap((p) => splitCorrelativas(p));
    const subject = {
      num: null,
      refCode: null,
      code: `CR${String(seq + 1).padStart(3, "0")}`,
      name,
      year: null,
      cuatrimestre: null,
      duration: "C",
      credits: 0,
      kind: /\bACA\b/i.test(name) ? "ACA" : "Materia",
      optional: false,
      criteria,
      correlativas: [],
    };
    subject.correlativas = (subject.criteria || [])
      .map((c) => c.name)
      .filter(Boolean);
    subjects.push(subject);
    byName.set(key, subject);
    seq += 1;
  };

  for (const page of rawPages) {
    const rows = groupRows(page);
    let headerY = Infinity;
    for (const row of rows) {
      if (row.items.some((it) => it.t === "Correlativas")) {
        headerY = row.y;
        break;
      }
    }
    let dashX = Infinity;
    for (const row of rows) {
      for (const it of row.items) {
        if (it.t === "-" && it.x > 150 && it.x < dashX) dashX = it.x;
      }
    }
    const splitX = Number.isFinite(dashX) ? dashX - 15 : 180;

    let cur = { name: [], corr: [] };
    let last = null;
    let pendingHead = [];
    const flush = () => {
      if (!cur.name.length && !cur.corr.length && !pendingHead.length) return;
      const s = { name: [...cur.name], corr: [...pendingHead, ...cur.corr] };
      cur = { name: [], corr: [] };
      pendingHead = [];
      const before = subjects.length;
      push(s.name, s.corr);
      if (subjects.length > before) last = subjects[subjects.length - 1];
    };
    for (const row of rows) {
      if (row.y >= headerY) continue;
      if (isNoiseRow(row)) continue;
      const joined = row.items.map((i) => i.t).join(" ").trim();
      if (!joined || !/[A-Za-zÁÉÍÓÚÜÑñ]/.test(joined)) continue;
      const left = row.items
        .filter((it) => it.x < splitX && !CORREL_TOKEN_NOISE_RE.test(it.t))
        .map((it) => it.t);
      const right = row.items
        .filter((it) => it.x >= splitX && !CORREL_TOKEN_NOISE_RE.test(it.t))
        .map((it) => it.t);
      if (!left.length && !right.length) continue;
      if (!left.length && right.length) {
        // Fila solo-derecha: si termina truncada ("...Gestión del") es la
        // cabeza de lo que viene (se antepone); si no, cola de lo anterior.
        if (TWOCOL_TAIL_RE.test(right.join(" ")) && !cur.name.length) {
          pendingHead.push(...right);
        } else if (cur.name.length) {
          cur.corr.push(...right);
        } else if (last) {
          last.extra = [...(last.extra || []), ...right];
        } else {
          cur.corr.push(...right);
        }
        continue;
      }
      if (cur.corr.length) flush();
      cur.name.push(...left);
      if (right.length) {
        cur.corr.push(...right);
        flush();
      }
    }
    flush();
  }

  // Reinyecta las continuaciones guardadas en sus materias.
  for (const s of subjects) {
    if (s.extra?.length) {
      const more = s.extra.join(" ").replace(/\s+/g, " ").trim();
      if (more) {
        const extra = more
          .split(/\s+-\s+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .flatMap((p) => splitCorrelativas(p));
        s.criteria.push(...extra);
        s.correlativas = s.criteria.map((c) => c.name).filter(Boolean);
      }
      delete s.extra;
    }
  }
  return subjects;
}

module.exports = {
  TWOCOL_TAIL_RE,
  isTwoColCorrelativas,
  parseTwoColCorrelativas,
};
