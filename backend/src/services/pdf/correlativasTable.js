// Parser del anexo tabular de correlatividades (CÓDIGO | MATERIAS | CURSADA |
// CRÉDITOS | CORRELATIVAS).

const {
  isNumber,
  cleanName,
  rowText,
  normalizeDurationToken,
  classifyPeriodHeader,
  groupRows,
} = require("./shared");
const { normSubjectKey, splitCorrelativas } = require("./correlativasShared");

// --- Anexo tabular de correlatividades (p. ej. Lic. en Enfermería) ---------
// La "Modificación al plan de correlatividad" adjunta la tabla
// CÓDIGO | MATERIAS | CURSADA | CRÉDITOS | CORRELATIVAS donde cada materia
// suele ocupar dos líneas: una con el código (numérico "322" o alfanumérico
// "SC_FB01"/"EN_E19") y otra con el nombre, duración, créditos y las
// correlativas. Se parsea por columnas (x), a diferencia del resto de los
// planes que usan el esquema "un número por línea".
const CORREL_TABLE_HEADER_RE =
  /^C[ÓO]DIGO\b[\s\S]*\bMATERIAS\b[\s\S]*\bCURSADA\b[\s\S]*\bCORRELATIVAS?\b/i;

const CORREL_TABLE_NOISE_RE =
  /^(CICLO|TITULACI|RCS\b|20%|EQUIVALE\b|APROBADAS? TODAS)/i;

const isCorrelCodeToken = (t) =>
  /^\d{1,3}$/.test(t) ||
  (/^[A-Z]{1,5}_?[A-Z0-9]{0,5}$/i.test(t) &&
    /[A-Z_]/.test(t) &&
    !/^(C|A|CURSADA|ANUAL|MENSUAL|CUATRIMESTRAL)$/i.test(t));

function parseCorrelativasTable(rawPages) {
  const subjects = [];
  const byName = new Map();
  let seq = 0;

  for (const page of rawPages) {
    const rows = groupRows(page);
    const hdr = rows.find((r) => CORREL_TABLE_HEADER_RE.test(rowText(r)));
    if (!hdr) continue;
    const xOf = (t) => {
      const it = hdr.items.find((i) => i.t.toUpperCase() === t);
      return it ? it.x : null;
    };
    const codeX = xOf("CÓDIGO") ?? xOf("CODIGO");
    const matX = xOf("MATERIAS");
    const curX = xOf("CURSADA");
    const corrX = xOf("CORRELATIVAS") ?? xOf("CORRELATIVA");
    if (codeX == null || matX == null || curX == null || corrX == null) {
      continue;
    }
    const codeEnd = codeX + 20;
    const corrStart = corrX - 100;

    const markers = [];
    const starts = [];
    const generic = [];
    for (const r of rows) {
      if (r === hdr) continue;
      const text = rowText(r);
      if (!text) continue;
      // La línea de un marcador de año puede traer además la materia que sigue
      // (p. ej. "3er AÑO · 351 · 2°"): se registra el año y se sigue parseando.
      const peri = classifyPeriodHeader(text);
      const codeIt = r.items.find(
        (it) => it.x < codeEnd && isCorrelCodeToken(it.t),
      );
      if (peri && !codeIt) {
        markers.push({ y: r.y, year: peri.year, cuatrimestre: peri.cuatrimestre });
        continue;
      }
      if (peri) {
        markers.push({ y: r.y, year: peri.year, cuatrimestre: peri.cuatrimestre });
      }
      if (CORREL_TABLE_NOISE_RE.test(text)) continue;
      // "Créditos ACA" es una materia propia (sin código) que suma créditos.
      if (
        /^CR[ÉE]DITOS? ACA\b/i.test(text) &&
        r.items.some((it) => it.x >= codeEnd && it.x < curX)
      ) {
        starts.push({ row: r, cell: [], refCode: null, num: null });
        continue;
      }
      if (codeIt) {
        starts.push({
          row: r,
          cell: [],
          refCode: codeIt.t,
          num: /^\d+$/.test(codeIt.t) ? parseInt(codeIt.t, 10) : null,
        });
      } else {
        generic.push(r);
      }
    }

    // Las líneas sueltas (nombre partido, correlativas extra) se pegan a la
    // materia cuyo código está más cerca, considerando TODAS las materias.
    for (const r of generic) {
      let best = null;
      let bestD = Infinity;
      for (const s of starts) {
        const d = Math.abs(r.y - s.row.y);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      if (best) best.cell.push(r);
    }

    for (const s of starts) {
      const items = [...s.row.items, ...s.cell.flatMap((r) => r.items)];
      if (!items.length) continue;
      const cursada = items.find((it) => /^[12][°º]?$/.test(it.t)) || null;
      const dur = items.find((it) =>
        /^(C|A|Cuatrimestral|Anual|Mensual)$/i.test(it.t),
      );
      const creds = items.filter(
        (it) => it.x >= 300 && it.x < corrStart && isNumber(it.t),
      );
      const nameToks = items
        .filter(
          (it) =>
            it.x >= codeEnd &&
            it.x < curX &&
            !/^[12][°º]?$/.test(it.t) &&
            !/^CR[ÉE]DITOS? ACA$/i.test(it.t),
        )
        .sort((a, b) => b.y - a.y || a.x - b.x);
      const corrToks = items
        .filter((it) => it.x >= corrStart && !isNumber(it.t))
        .map((it) => it.t);

      const name = cleanName(nameToks.map((i) => i.t)).replace(
        /^Actividad Curricular(\s+|$)/i,
        "",
      );
      if (!name && !s.refCode) continue;
      const key = normSubjectKey(name || s.refCode);
      if (byName.has(key)) continue;

      let year = null;
      if (markers.length) {
        let bestM = markers[0];
        for (const mk of markers) {
          if (Math.abs(mk.y - s.row.y) < Math.abs(bestM.y - s.row.y)) bestM = mk;
        }
        year = bestM.year;
      }
      const subject = {
        num: s.num,
        refCode: s.refCode,
        code: `CR${String(seq + 1).padStart(3, "0")}`,
        name,
        year,
        cuatrimestre: cursada ? parseInt(cursada.t, 10) : null,
        duration: dur ? normalizeDurationToken(dur.t) : "C",
        credits: creds.length ? parseInt(creds[creds.length - 1].t, 10) : 0,
        kind: /^CR[ÉE]DITOS? ACA$/i.test(name) ? "ACA" : "Materia",
        optional: false,
        criteria: splitCorrelativas([...new Set(corrToks)].join(" ")),
        correlativas: [],
      };
      subject.correlativas = (subject.criteria || [])
        .map((c) => c.name)
        .filter(Boolean);
      subjects.push(subject);
      byName.set(key, subject);
      seq++;
    }
  }
  return subjects;
}

function hasCorrelativasTable(rawPages) {
  return rawPages.some((page) =>
    groupRows(page).some((r) => CORREL_TABLE_HEADER_RE.test(rowText(r))),
  );
}

module.exports = { parseCorrelativasTable, hasCorrelativasTable };
