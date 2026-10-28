// Anclas de materia y filas ACA de una página del plan oficial.

const {
  isNumber,
  rowText,
  stripPeriodPrefix,
  PERIOD_WORD_RE,
  isNameToken,
  isPeriodMarkerRow,
  normalizeDurationToken,
} = require("./shared");
const {
  TAB_TOTAL_RE,
  TAB_ACA_RE,
  isAgroPage,
  isDialectDataRow,
  isDurToken,
  isOfficialNameLine,
  officialNameTokens,
  numVal,
} = require("./officialPlanRows");
const { buildWrappedAnchors } = require("./officialPlanWrapped");

function buildPageAnchors(page, rows, meta) {
  let numeric300 = 0;
  for (const row of rows) {
    for (const it of row.items) {
      if (isNumber(it.t) && it.x >= 300) numeric300 += 1;
    }
  }
  const durCandidates = rows.filter((r) => r.items.some(isDurToken)).length;
  // Dialecto Asignatura|Campo|Carga: solo cuando el modo genérico no tiene de
  // dónde agarrarse (sin columna código ni duración: Agrario tiene "Código"
  // y Mant. Hospitalario "Cuatr.", esos siguen por vía genérica). Las páginas
  // de continuación sin header se detectan por filas de datos.
  const agroPage =
    (isAgroPage(rows) || rows.filter(isDialectDataRow).length >= 2) &&
    !(meta && meta.codeX != null) &&
    durCandidates < 2;
  if (
    numeric300 < 3 ||
    (durCandidates < 2 && !(meta && meta.codeX != null) && !agroPage)
  ) {
    return null;
  }

  const {
    wrappedAnchors,
    wrappedDataY,
    consumedFragY,
    nameAttach,
  } = buildWrappedAnchors(page, rows, meta, agroPage);

  const anchors = [];
  if (agroPage) {
    // Solo anclas dialectales (número inicial + token de Campo): las filas
    // de prosa de estas páginas nunca generan anclas.
    for (const row of rows) {
      if (!isDialectDataRow(row)) continue;
      anchors.push({
        y: row.y,
        duration: null,
        num: parseInt(row.items[0].t, 10),
        yearCol: null,
        nameParts: [],
        nums: [],
        ownNums300: row.items.filter(
          (it) => isNumber(it.t) && it.x >= 250 && it !== row.items[0],
        ).length,
        dialectAgro: true,
        group: null,
        merged: false,
      });
    }
  } else
  for (const row of rows) {
    const joined = rowText(row);
    if (TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined)) continue;
    if (isPeriodMarkerRow(row)) continue;
    if (consumedFragY.has(row.y) || wrappedDataY.has(row.y)) continue;
    if (isOfficialNameLine(row) && officialNameTokens(row).length) {
      const durTok = row.items.find(isDurToken);
      const codeTok = row.items.find(
        (it) =>
          meta &&
          meta.codeX != null &&
          /^\d{1,2}$/.test(it.t) &&
          Math.abs(it.x - meta.codeX) <= 14,
      );
      anchors.push({
        y: row.y,
        duration: durTok ? normalizeDurationToken(durTok.t) : null,
        num: codeTok ? parseInt(codeTok.t, 10) : null,
        yearCol: null,
        nameParts: [],
        nums: [],
        ownNums300: row.items.filter(
          (it) => isNumber(it.t) && it.x >= 300,
        ).length,
        group: null,
        merged: false,
      });
    }
  }
  anchors.push(...wrappedAnchors);
  anchors.sort((a, b) => b.y - a.y);

  // Filas de "Actividades Curriculares Acreditables (ACA)": no son materias
  // regulares, pero suman créditos al total de cada título (licenciatura e
  // intermedio) y aparecen al final de cada tabla con su propia fila de
  // créditos. Se agregan como materia de tipo ACA para que el total del plan
  // coincida con el del PDF (p. ej. 287 y 120 créditos). Viven en un array
  // aparte para no interferir con el agrupado de nombres de las materias.
  const acaAnchors = [];
  for (const row of rows) {
    const joined = rowText(row);
    if (TAB_TOTAL_RE.test(joined) || !TAB_ACA_RE.test(joined)) continue;
    const nums = row.items
      .filter((it) => isNumber(it.t) && it.x >= 300)
      .map((it) => ({ x: it.x, v: numVal(it.t), y: row.y }));
    // En algunas tablas la fila ACA está partida: el nombre en una línea y
    // los números (horas y créditos) en la línea siguiente de la misma celda.
    // Se suman esos números cercanos (la línea de puro datos de la celda).
    for (const other of rows) {
      if (other === row) continue;
      if (Math.abs(other.y - row.y) > 12) continue;
      const joinedOther = rowText(other);
      if (!joinedOther) continue;
      if (TAB_TOTAL_RE.test(joinedOther) || TAB_ACA_RE.test(joinedOther)) continue;
      const onlyNumerics = other.items.every(
        (it) => isNumber(it.t) || /^\s*[-–—‐´`'\u00a0.]\s*$/.test(it.t),
      );
      if (!onlyNumerics) continue;
      for (const it of other.items) {
        if (isNumber(it.t) && it.x >= 300 && !nums.some((n) => n.x === it.x)) {
          nums.push({ x: it.x, v: numVal(it.t), y: other.y });
        }
      }
    }
    const nameParts = row.items
      .filter((it) => isNameToken(it))
      .map((it) => ({ y: row.y, x: it.x, t: stripPeriodPrefix(it.t.trim()) }))
      .filter((p) => p.t && !PERIOD_WORD_RE.test(p.t));
    let acaCredits = null;
    if (meta) {
      for (const n of nums) {
        let bestField = null;
        let bestD = Infinity;
        for (const [field, x] of meta.labels) {
          const d = Math.abs(n.x - x);
          if (d < bestD) {
            bestD = d;
            bestField = field;
          }
        }
        if (bestD <= 45 && bestField === "credits") acaCredits = n.v;
      }
    }
    if (acaCredits == null && nums.length) acaCredits = nums[nums.length - 1].v;
    acaAnchors.push({
      y: row.y,
      duration: null,
      num: null,
      yearCol: null,
      nameParts,
      nums,
      isAcaRow: true,
      acaCredits,
    });
  }

  if (!anchors.length && !acaAnchors.length) return null;

  return {
    page,
    rows,
    anchors,
    acaAnchors,
    agroPage,
    wrappedAnchors,
    wrappedDataY,
    consumedFragY,
    nameAttach,
  };
}

module.exports = { buildPageAnchors };
