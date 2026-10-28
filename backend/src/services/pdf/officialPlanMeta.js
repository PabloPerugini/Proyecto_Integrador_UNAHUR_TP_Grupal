// Detección del título intermedio y de las columnas del plan oficial.

const { groupRows } = require("./shared");
const {
  TAB_LABEL_TOKEN_RE,
  TAB_FIELD_BY_LABEL,
  TAB_LABEL_KEY,
  TAB_YEAR_COL_RE,
  TAB_CODE_COL_RE,
  isDurToken,
} = require("./officialPlanRows");

// Título intermedio ---------------------------------------------------------
// Muchos planes de UNAHUR otorgan un título intermedio (Técnico/a …) que se
// obtiene cursando un subconjunto del plan. La tabla de ese título ("…del
// título del intermedio") suele aparecer como una sección propia luego de la
// tabla principal, y es la única con marcadores de cuatrimestre. Acá se detecta
// ese rango de páginas para marcar las materias que lo integran y el nombre.

// Además del encabezado "…del título intermedio", algunas carreras titulan la
// sección numerada "7.x.y TITULACIÓN DE TÉCNICA/O UNIVERSITARIA/O …"
// (p. ej. Lic. en Tecnología de los Alimentos).
const INTERMEDIO_START_RE =
  /estructura del (?:t[u\u00fa]tulo|t\u00edtulo)(?:[^.]*?)intermedio|7\.\d+\.\d+\s+[^.]*intermedio|\d+(?:\.\d+)+\s+titulaci[o\u00f3]n\s+(?:de\s+)?t[e\u00e9]cnica/i;
const INTERMEDIO_END_RE =
  /seguimiento curricular|correlativid?ades?|\bcorrelativ\b|materias?\s+optativas|pr[a\u00e1]ctica\s+profesional|proyecto\s+(?:fi[ñn]al|final)|formaci[o\u00f3]n\s+pr[a\u00e1]ctica|contenidos\s+m[i\u00ed]nimos|actividades curriculares acreditables|estructura de (?:la|el) (?:licenciad|profesorad|ingenier|t[u\u00fa]tulo)|\d+(?:\.\d+)+\s+licenciatura\b|^\s*\d{1,2}\.(?:\.\d+)?\s+[A-ZÑÁÉÍÓÚÜ][\wẂẄ]/im;

function pageConcat(page) {
  return page.items
    .map((it) => it.t)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Devuelve un Set con los números de página que pertenecen a la tabla del
// título intermedio. Empieza en el encabezado propio de esa sección y termina
// cuando aparece una sección que le sigue (correlativas, optativas, contenidos,
// seguimiento curricular, la tabla de grado, etc.). El END sólo se considera
// válido si aparece en el comienzo de la página: las secciones nuevas arrancan
// la página, mientras que frases como "actividades curriculares acreditables"
// o "práctica profesional supervisada" también aparecen como filas de la tabla
// del intermedio.
function detectIntermedioPages(rawPages) {
  const intermedio = new Set();
  let started = false;
  for (const page of rawPages) {
    const txt = pageConcat(page);
    if (started) {
      const end = INTERMEDIO_END_RE.exec(txt);
      if (end && end.index < txt.length * 0.4) started = false;
      else intermedio.add(page.num);
    }
    if (!started && INTERMEDIO_START_RE.test(txt)) {
      started = true;
      intermedio.add(page.num);
    }
  }
  return intermedio;
}

// Devuelve el nombre del título intermedio ("Técnico/a Universitario en X")
// leído de la línea "…: Intermedio: Técnico/a …" de la sección 1.2, o null.
function detectIntermediateTitle(rawPages) {
  for (const page of rawPages) {
    const byY = new Map();
    for (const it of page.items) {
      const key = Math.round(it.y);
      if (!byY.has(key)) byY.set(key, []);
      byY.get(key).push(it);
    }
    for (const [, arr] of byY) {
      arr.sort((a, b) => a.x - b.x);
      const line = arr.map((v) => v.t).join(" ").trim();
      const m = line.match(/(?:intermedio|titulaci[o\u00f3]n\s+intermedia)\s*:\s*(.+)/i);
      if (m) {
        const title = m[1].split(/\s*Final\s*:/i)[0].trim();
        if (title) return title;
      }
    }
  }
  return null;
}

// Escanea las páginas de encabezado y devuelve la x de las columnas:
// { labels: {FIELD: x} (reales, x>=300), yearX, codeX } o null si no hay encabezado.
function detectOfficialMeta(rawPages) {
  for (const page of rawPages) {
    const rows = groupRows(page);
    if (!rows.length) continue;
    const labels = new Map();
    let yearX = null;
    let codeX = null;
    let sawData = false;
    // Encabezado con "Carga horaria" (semanal/total) y sin columna de
    // créditos: el plan no declara créditos (p. ej. Lic. en Desarrollo
    // Agrario). Sin esto, el fallback "último número = créditos" sumaría
    // horas como si fueran créditos.
    let sawCargaHoraria = false;
    for (const row of [...rows].sort((a, b) => b.y - a.y)) {
      if (isDurToken(row.items[0]) || row.items.some(isDurToken)) {
        sawData = true;
        break;
      }
      const lineTxt = row.items.map((it) => it.t).join(" ");
      if (/\bcarga\b/i.test(lineTxt) && /\bhoraria\b/i.test(lineTxt)) {
        sawCargaHoraria = true;
      }
      for (const it of row.items) {
        if (TAB_LABEL_TOKEN_RE.test(it.t) && TAB_FIELD_BY_LABEL[TAB_LABEL_KEY(it.t)]) {
          labels.set(TAB_FIELD_BY_LABEL[TAB_LABEL_KEY(it.t)], it.x);
        }
        if (TAB_YEAR_COL_RE.test(it.t)) yearX = it.x;
        if (TAB_CODE_COL_RE.test(it.t) && codeX == null) codeX = it.x;
      }
    }
    const realLabels = [...labels].filter(([, x]) => x >= 300);
    const noCredits = sawCargaHoraria && !labels.has("credits");
    if (realLabels.length >= 2) {
      return { labels: new Map(realLabels), yearX, codeX, noCredits };
    }
    if (sawData && realLabels.length) {
      return { labels: new Map(realLabels), yearX, codeX, noCredits };
    }
  }
  return null;
}

module.exports = {
  detectIntermedioPages,
  detectIntermediateTitle,
  detectOfficialMeta,
};
