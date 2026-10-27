// Helpers de texto compartidos por los parsers
// Clasificación de filas, nombres, períodos y agrupación por coordenadas.

const isNumber = (s) => /^\d+([.,]\d+)?$/.test(s);

const TAB_DURATION_RE =
  /^(C|A|Cuatr\.?|Cuatrimestral|Bimestral|Anual)$/i;
// Periodicidad que en algunas tablas aparece en la columna de duración pero NO
// es duración de la materia (p. ej. "Mensual"/"Semestral" en Prácticas). Se usa
// sólo para excluir la palabra del nombre, no para detectar anclas.
const TAB_PERIODICITY_RE = /^(Mensual|Semestral)$/i;

const TAB_AREA_RE =
  /^(CFB|CFC|CFE|CIC|CP|CBGyE|ASOyR|ISBDySO|OTRAS|TALLER|AyL|ASyP)$/i;

const TAB_HEADER_TOKEN_RE =
  /^(?:A[ÑN]O|NRO|N[°º]?|COD|C[ÓO]DIGO|N[ÚU]MERO|ASIGNATURA|UNIDAD|CURRICULAR|CAMP|IP|IPT|HS\.?|SEMA|NAL|HTAT|HITAT|TAE|TTE|TOTAL|CRE|HIS|HIT|HITE|HIP|TF|HT|CP|D|O|HORAS|CANTIDAD|TRABAJO|PEDAG|AUT[ÓO]N|INTERACCI|TOTALES|SELECCIONES)$/i;

function cleanName(parts) {
  return parts
    .map((p) => p.replace(/\s+/g, " "))
    .join(" ")
    // Artefactos de extracción de los PDFs: la ñ puede venir descompuesta
    // (n + tilde combinante), la i puede ser la "ı" sin punto, y algunos
    // glifos dejan controles (p. ej. NUL donde falta la "f" en
    // "Eco\0isiología" del TUPAP-2025). NFC compone los acentos.
    .replace(/\u0131/g, "i")
    // PDFs reales dejan controles donde falta un glifo; se limpian a propósito.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .normalize("NFC")
    // En algunos anexos (RES-1467) la extracción pega la duración al nombre
    // en un solo token: "Economía de la innovación Cuatrimestral".
    .replace(
      /\s+(?:Cuatrimestral|Bimestral|Semestral|Trimestral|Mensual|Anual)\s*$/iu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

const rowText = (row) => row.items.map((i) => i.t).join(" ").trim();

// Etiqueta de columna o encabezado: una sola palabra sin espacios ("CRE",
// "CURRICULAR", "NRO"...). Una frase como "curricular I" o "digital en la
// universidad" NO es etiqueta, es parte del nombre de una materia.
const isHeaderLabelToken = (t) => !/\s/.test(t) && TAB_HEADER_TOKEN_RE.test(t);

function isNameToken(it) {
  const t = it.t.trim();
  if (!t) return false;
  if (isNumber(t) || /^[-–—‐]+$/.test(t)) return false;
  if (TAB_DURATION_RE.test(t)) return false;
  if (TAB_PERIODICITY_RE.test(t)) return false;
  if (TAB_AREA_RE.test(t)) return false;
  if (isHeaderLabelToken(t)) return false;
  // Notas al pie pegadas a la celda ("20 (6)", "(5)") NO son parte del nombre.
  if (/^[\d\s()]+$/.test(t)) return false;
  if (it.x >= 300) return false;
  return true;
}

function normalizeDurationToken(t) {
  return /^(C|Cuatr\.?|Cuatrimestral)$/i.test(t) ? "C" : "A";
}

const PERIOD_ORD = {
  PRIMER: 1,
  SEGUNDO: 2,
  TERCER: 3,
  TERCERO: 3,
  CUARTO: 4,
  QUINTO: 5,
  SEXTO: 6,
};

function classifyPeriodHeader(text) {
  const t = text.trim().replace(/\s+/g, " ");
  let m = t.toUpperCase().match(
    /^(PRIMER|SEGUNDO|TERCER|TERCERO|CUARTO|QUINTO|SEXTO)\s+(AÑO|A?NO|CUATRIMESTRE)\b/,
  );
  if (m) {
    const ord = PERIOD_ORD[m[1]];
    if (m[2] === "CUATRIMESTRE") return { year: null, cuatrimestre: ord };
    return { year: ord, cuatrimestre: null };
  }
m = t.match(
    /^(\d{1,2})\s*(?:er|do|to|ro|\u00ba|\u00b0)?\.?\s*(?:a\u00f1\s*o|ano|cuatrimestre)\b/i,
  );
  if (m) {
    const n = parseInt(m[1], 10);
    if (/cuatrimestre/i.test(t)) return { year: null, cuatrimestre: n };
    return { year: n, cuatrimestre: null };
  }
  return null;
}

// Un marcador de período es solo un título de año/cuatrimestre. Si la fila
// además trae el nombre de una materia (p. ej. "PRIMER AÑO ... Introducción a
// la Energía Eléctrica ..." en las Ingenierías) es una fila de datos con la
// celda AÑO repetida y NO un marcador de período.
const PERIOD_WORD_RE =
  /^(PRIMER|SEGUNDO|TERCER|TERCERO|CUARTO|QUINTO|SEXTO)(\s+(A\u00d1O|ANO|CUATRIMESTRE))?$|^(A\u00d1O|ANO|CUATRIMESTRE)$|^[1-6]\s*(?:er|do|to|ro|\u00ba|\u00b0)?\.?(\s+(A\u00d1O|ANO|CUATRIMESTRE))?$/i;

// Como la celda "AÑO/MÓDULO" de las Ingenierías se repite en cada línea, a veces
// viene pegada al nombre como un solo token p. ej. "SEGUNDO AÑO Sistemas de
// mediciones". Se recorta el prefijo para que el nombre quede limpio.
const PERIOD_PREFIX_RE =
  /^(?:PRIMER|SEGUNDO|TERCER|TERCERO|CUARTO|QUINTO|SEXTO)\s+(?:A\u00d1O|ANO|CUATRIMESTRE)\b\s+(.+)$/i;

function stripPeriodPrefix(s) {
  const m = s.match(PERIOD_PREFIX_RE);
  return m ? m[1] : s;
}

function isPeriodMarkerRow(row) {
  // Una fila con números es de datos (p. ej. "PRIMER AÑO 4 64 111 175 7" en las
  // Ingenierías: resto de la celda), nunca un marcador de período.
  // NOTA: se mantiene la comparación histórica (sobre el ítem, no sobre .t)
  // para no alterar la atribución de año/créditos de los planes ya validados;
  // el veto de fragmentos usa una lista de competidores propia (ver
  // otherDataDist), que sí incluye estas filas de datos con prefijo de período.
  if (row.items.some(isNumber)) return false;
  const peri = classifyPeriodHeader(rowText(row));
  if (!peri) return false;
  return !row.items.some(
    (it) =>
      isNameToken(it) &&
      !PERIOD_WORD_RE.test(stripPeriodPrefix(it.t.trim()).trim()),
  );
}

function groupRows(page) {
  const rowMap = new Map();
  for (const it of page.items) {
    const key = Math.round(it.y);
    if (!rowMap.has(key)) rowMap.set(key, []);
    rowMap.get(key).push(it);
  }
  const rows = [];
  for (const [y, arr] of rowMap) {
    arr.sort((a, b) => a.x - b.x);
    rows.push({ y, items: arr });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows;
}

module.exports = {
  isNumber,
  TAB_DURATION_RE,
  TAB_PERIODICITY_RE,
  TAB_AREA_RE,
  TAB_HEADER_TOKEN_RE,
  cleanName,
  rowText,
  isHeaderLabelToken,
  isNameToken,
  normalizeDurationToken,
  classifyPeriodHeader,
  stripPeriodPrefix,
  PERIOD_WORD_RE,
  isPeriodMarkerRow,
  groupRows,
};
