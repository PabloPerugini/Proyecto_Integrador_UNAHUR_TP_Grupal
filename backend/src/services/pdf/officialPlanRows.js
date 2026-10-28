// Helpers de filas y columnas del plan oficial.
// Predicados de nombre, duración, horas y metadatos de tabla.

const {
  isNumber,
  TAB_DURATION_RE,
  TAB_AREA_RE,
  TAB_HEADER_TOKEN_RE,
  rowText,
  isHeaderLabelToken,
  isNameToken,
  stripPeriodPrefix,
  PERIOD_WORD_RE,
  isPeriodMarkerRow,
} = require("./shared");

function splitRowFacts(row) {
  const n = row.nums;
  if (n.length === 5) {
    // HIS HIT HTAT HT CRE (Kinesiología, Matemática)
    return {
      his: n[0] ?? 0,
      hit: n[1] ?? 0,
      hite: 0,
      hip: 0,
      htat: n[2] ?? 0,
      ht: n[3] ?? 0,
      credits: n[4] ?? 0,
    };
  }
  if (n.length === 6) {
    // IPS IP IPP TAE TTE CRE (Biotecnología): IPP cae en hite, TAE en htat
    return {
      his: n[0] ?? 0,
      hit: n[1] ?? 0,
      hite: n[2] ?? 0,
      hip: 0,
      htat: n[3] ?? 0,
      ht: n[4] ?? 0,
      credits: n[5] ?? 0,
    };
  }
  const [his, hit, hite, hip, htat, ht] = n;
  const credits = n[6] ?? ht;
  return {
    his: his ?? 0,
    hit: hit ?? 0,
    hite: hite ?? 0,
    hip: hip ?? 0,
    htat: htat ?? 0,
    ht: ht ?? 0,
    credits: credits ?? 0,
  };
}

// Valor de la columna "Modalidad de dictado" (a la derecha de las horas): no
// desborda la fila hacia la banda de horas (los DI de Enfermería/Metalúrgica
// traen "Presencial" a x>=300 en cada fila de materia).
const TAB_MODALITY_RE =
  /^(Presencial|Semipresencial|Virtual|A distancia|Distancia|Mixta)$/i;
const TAB_TOTAL_RE = /^(TOTAL|SUBTOTAL)\b/i;
const TAB_ACA_RE = /ACTIVIDADES CURRICULARES (?:ACREDITABLES|DE)|(^|\s)ACA([\s(]|$)/i;
// Tabla-resumen de carga horaria por campo (CFC/CFE/CIC) en los planes de
// licenciaturas: filas "Común", "Básica", "Específica", "Integración
// curricular", ... que NO son materias. También las filas de las tablas
// comparativas del final del plan ("Bloque de fundamentos…", "Formación…",
// "Horas según decisión de cada institución…").
const TAB_SUMMARY_ROW_RE =
  /^(Com[\u00fa]n|B[\u00e1]sica|Espec[i\u00ed]fica|Integraci[\u00f3]n curricular|Integraci[\u00f3]n|Curriculares|Actividades([\u00b4\u2019'`\s]|$)|Acreditables|Bloque de|Formaci[\u00f3]n|Horas seg[\u00fa]n decisi[\u00f3]n de cada)(?=[\u00b4\u2019'`\s]|$)|\bcr[e\u00e9]\u0301?ditos?\b|CARGA HORARIA TOTAL/i;
// El texto extraído puede venir con acentos descompuestos (NFD): se prueba
// sobre la forma compuesta para que "créditos"/"Común"/"Formación" matcheen.
const isSummaryRowText = (text) =>
  TAB_SUMMARY_ROW_RE.test(String(text).normalize("NFC"));

const TAB_FIELD_BY_LABEL = {
  HS: "his",
  HIS: "his",
  IPS: "his",
  SEMANAL: "his",
  HIT: "hit",
  IP: "hit",
  IPT: "hit",
  HITE: "hite",
  IPP: "hite",
  PRÁCTICA: "hite",
  PRACTICA: "hite",
  HIP: "hip",
  HITAT: "htat",
  HTAT: "htat",
  TAE: "htat",
  HT: "ht",
  TTE: "ht",
  TOTAL: "ht",
  CRE: "credits",
  CRÉDITOS: "credits",
  CREDITOS: "credits",
  TF: "tf",
};
const TAB_LABEL_TOKEN_RE =
  /^(HS\.?|HIS|HIT|HITE|HIP|HITAT|HTAT|IPS|IP|IPP|IPT|TAE|TTE|HT|TF|CRE|SEMANAL|TE[ÓO]RICA|PR[ÁA]CTICA|TOTAL|CR[EÉ]DITOS)$/i;
const TAB_LABEL_KEY = (t) =>
  String(t).trim().toUpperCase().replace(/[.\s:]/g, "");

const TAB_YEAR_COL_RE = /^A[ÑN]O$/i;
const TAB_CODE_COL_RE = /^(COD|C[ÓO]DIGO|NRO|N[°º]?[.]?$|N[ÚU]MERO)$/i;

// Dialecto "Asignatura|Campo|Carga" (p. ej. Tec. en Producción Agroecológica):
// filas "N° Nombre CAMPO cargasemanal cargatotal correlatividad", sin columna
// D ni duración. Se detecta por encabezado a nivel página.
function isAgroPage(rows) {
  let hasAsig = false;
  let hasCampo = false;
  let hasCarga = false;
  for (const row of rows) {
    for (const it of row.items) {
      const t = it.t.trim().toUpperCase();
      if (t === "ASIGNATURA") hasAsig = true;
      else if (t === "CAMPO") hasCampo = true;
      else if (t === "CARGA" || t === "HORARIA") hasCarga = true;
    }
    if (hasAsig && hasCampo && hasCarga) return true;
  }
  return false;
}

function isDialectDataRow(row) {
  const first = row.items[0];
  if (!first || !/^\d{1,3}$/.test(first.t) || first.x >= 200) return false;
  if (!row.items.some((it) => TAB_AREA_RE.test(it.t))) return false;
  const joined = row.items.map((i) => i.t).join(" ").trim();
  if (TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined)) return false;
  if (isPeriodMarkerRow(row)) return false;
  return true;
}

const TAB_HEADER_ROW_RE =
  /^(UNIDAD CURRICULAR|ASIGNATURA|C[ÓO]DIGO|NRO|N[°º]?|N[ÚU]MERO|A[ÑN]O|CANTIDAD DE|CAMP|HORAS DE|CR[EÉ]DITOS|REQUISIT|R[ÉE]GIMEN|CORRELATIV|CARRERA|PROFESORADO|PLAN|VERSI[ÓO]N|PROPUESTA|D[=:;]\s|T[ÍI]TULO)/i;
const TAB_TITLE_ROW_RE =
  /^(LICENCIAD[AO]|T[EÉ]CNIC[AO]|PROFESORADO|UNIVERSIDAD|DISE[ÑN]O CURRICULAR|NOMENCLATURA|ACTIVIDADES CURRICULARES ACREDITABLES|Gr[áa]fica)/i;

const numVal = (s) => {
  const t = String(s).trim();
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d+\.\d{3}$/.test(t)) return parseInt(t.replace(/\./g, ""), 10);
  return parseFloat(t.replace(",", ".")) || 0;
};

const isDurToken = (it) =>
  TAB_DURATION_RE.test(it.t) && it.x >= 150 && it.x <= 399;

function isOfficialDataRow(row, meta) {
  if (row.items.some(isDurToken)) return true;
  if (meta && meta.codeX != null) {
    return row.items.some(
      (it) => /^\d{1,2}$/.test(it.t) && Math.abs(it.x - meta.codeX) <= 14,
    );
  }
  return false;
}

// True si una fila con números es parte real de una materia (y no un total,
// un pie de tabla o el número de página).
function officialNumberRowUsable(row) {
  const text = row.items.filter((it) => !isNumber(it.t));
  const nums = row.items.filter((it) => isNumber(it.t));
  if (!nums.length) return false;
  if (text.length) return true;
  const sum = nums.reduce((acc, n) => acc + numVal(n.t), 0);
  return sum < 800 && nums.length <= 4;
}

// True si la fila tiene texto de prosa que se desborda hacia la banda de las
// columnas de horas (x >= 300). Las filas reales de materia mantienen el nombre
// en la franja izquierda; los párrafos de notas/fundamentación continúan a la
// derecha y NO deben disparar anclas de materia.
function rowSpillsRight(row) {
  return row.items.some(
    (it) =>
      it.x >= 300 &&
      !isNumber(it.t) &&
      !TAB_DURATION_RE.test(it.t) &&
      !TAB_MODALITY_RE.test(it.t) &&
      !TAB_AREA_RE.test(it.t) &&
      !TAB_LABEL_TOKEN_RE.test(it.t) &&
      !TAB_HEADER_TOKEN_RE.test(it.t) &&
      !/^-?\d/.test(it.t) &&
      !/^[-–—‐\u00a0\s.]+$/.test(it.t),
  );
}

function isOfficialNameLine(row) {
  const joined = rowText(row);
  if (rowSpillsRight(row)) return false;
  if (isPeriodMarkerRow(row)) return false;
  if (TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined)) return false;
  if (isSummaryRowText(joined)) return false;
  if (TAB_HEADER_ROW_RE.test(joined)) {
    // Un encabezado de tabla es una fila de puras etiquetas. "Asignatura
    // UNAHUR …" también empieza con "ASIGNATURA", pero es una materia real
    // (lleva duración y más palabras de nombre), así que no se descarta acá.
    const hasDur = row.items.some(isDurToken);
    const nameish = row.items.some(
      (it) => it.x < 300 && isNameToken(it),
    );
    if (!hasDur && !nameish) return false;
  }
  // Fila compuesta únicamente por etiquetas de encabezado (AÑO, NRO, CÓDIGO,
  // CURRICULAR, ...). Un fragmento real como "curricular I" lleva además otras
  // palabras y sí es parte del nombre de una materia.
  if (
    row.items.every(
      (it) => isHeaderLabelToken(it.t) || isNumber(it.t),
    )
  ) {
    return false;
  }
  return true;
}

function officialNameTokens(row) {
  const out = [];
  for (const it of row.items) {
    if (!isNameToken(it)) continue;
    const s = stripPeriodPrefix(it.t.trim());
    if (!s) continue;
    if (PERIOD_WORD_RE.test(s.trim())) continue;
    out.push({ y: row.y, x: it.x, t: s });
  }
  return out;
}

function medianGap(ys) {
  if (!ys.length) return 0;
  if (ys.length === 1) return 40;
  const gaps = [];
  const sorted = [...ys].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

const windowFor = (gapMedian) => Math.max(20, Math.round(gapMedian * 0.75));

// Primera x de la columna del nombre de una fila. Los fragmentos del mismo
// nombre comparten sangría; evita encadenar títulos centrados al nombre.
function firstTokX(row) {
  const t = officialNameTokens(row)[0];
  return t ? t.x : null;
}

module.exports = {
  splitRowFacts,
  TAB_MODALITY_RE,
  TAB_TOTAL_RE,
  TAB_ACA_RE,
  TAB_SUMMARY_ROW_RE,
  TAB_HEADER_ROW_RE,
  TAB_TITLE_ROW_RE,
  TAB_LABEL_TOKEN_RE,
  TAB_FIELD_BY_LABEL,
  TAB_LABEL_KEY,
  TAB_YEAR_COL_RE,
  TAB_CODE_COL_RE,
  isSummaryRowText,
  isAgroPage,
  isDialectDataRow,
  numVal,
  isDurToken,
  isOfficialDataRow,
  officialNumberRowUsable,
  rowSpillsRight,
  isOfficialNameLine,
  officialNameTokens,
  firstTokX,
  medianGap,
  windowFor,
};
