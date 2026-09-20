let pdfjsPromise = null;

const getPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
};

async function getRawItems(data) {
  const { getDocument } = await getPdfjs();
  const doc = await getDocument({
    data: new Uint8Array(data),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if ("str" in it && it.str.trim()) {
        const tr = it.transform;
        items.push({
          x: Math.round(tr[4] * 10) / 10,
          y: Math.round(tr[5] * 10) / 10,
          t: it.str.replace(/\s+/g, " ").trim(),
        });
      }
    }
    pages.push({ num: i, items });
  }

  if (doc.destroy) {
    try {
      await doc.destroy();
    } catch {
      /* noop */
    }
  }
  return pages;
}

async function extractLines(data) {
  const rawPages = await getRawItems(data);
  const pages = [];
  for (const page of rawPages) {
    const lineMap = new Map();
    for (const it of page.items) {
      const key = Math.round(it.y);
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key).push(it);
    }

    const lines = [];
    for (const [y, arr] of lineMap) {
      arr.sort((a, b) => a.x - b.x);
      lines.push({ y, text: arr.map((v) => v.t).join(" ").trim() });
    }
    lines.sort((a, b) => b.y - a.y);
    pages.push({ num: page.num, lines });
  }
  return pages;
}

const isNumber = (s) => /^\d+([.,]\d+)?$/.test(s);

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

function cleanName(parts) {
  return parts
    .map((p) => p.replace(/\s+/g, " "))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Parser del plan oficial por columnas (x).
// Reconstruye la tabla de estructura a partir de las coordenadas de cada token
// en lugar de depender de que cada línea contenga todos los datos de una materia:
//  - filas ancla = tokens de duración (C / A / Cuatrimestral / Anual) en la
//    columna D; si la carrera no tiene columna D (p. ej. Desarrollo Agrario),
//    las anclas son los números de orden (columna N° / Código).
//  - nombre   = tokens de texto en la franja izquierda (x < 300) cercanos al ancla.
//  - horas    = tokens numéricos de la franja derecha (x >= 300) asignados a
//    cada columna según las etiquetas del encabezado (HIS/HIT/IPP/HTAT/CRE…).
// ---------------------------------------------------------------------------

const TAB_DURATION_RE = /^(C|A|Cuatrimestral|Anual)$/i;
// Periodicidad que en algunas tablas aparece en la columna de duración pero NO
// es duración de la materia (p. ej. "Mensual"/"Semestral" en Prácticas). Se usa
// sólo para excluir la palabra del nombre, no para detectar anclas.
const TAB_PERIODICITY_RE = /^(Mensual|Semestral)$/i;
const TAB_AREA_RE =
  /^(CFB|CFC|CFE|CIC|CP|CBGyE|ASOyR|ISBDySO|OTRAS|TALLER|AyL|ASyP)$/i;
const TAB_TOTAL_RE = /^(TOTAL|SUBTOTAL)\b/i;
// Fila de totales que cierra la tabla de un plan: "TÍTULO: …", "TÍTULO DE
// GRADO: …", "TÍTULO: Técnico/a …" seguidas de la suma de horas y créditos por
// columna (p. ej. "TÍTULO DE GRADO: Ingeniería Metalúrgica 3.600 3.900 7.500
// 300" y "TÍTULO: … en Metalurgia 1440 2110 3550 142"). No son materias: en
// Electromovilidad terminaban parseándose como la materia OF02x con 1903
// créditos y en Metalurgia agregaban 300 y 142 créditos fantasma.
const TAB_FOOTER_RE = /^T[ÍI]TULO\b/i;
const TAB_ACA_RE = /ACTIVIDADES CURRICULARES (?:ACREDITABLES|DE)|(^|\s)ACA([\s(]|$)/i;
// Tabla-resumen de carga horaria por campo (CFC/CFE/CIC) en los planes de
// licenciaturas: filas "Común", "Básica", "Específica", "Integración
// curricular", ... que NO son materias.
const TAB_SUMMARY_ROW_RE =
  /^(Com[\u00fa]n|B[\u00e1]sica|Espec[i\u00ed]fica|Integraci[\u00f3]n curricular|Integraci[\u00f3]n|Curriculares|Actividades([\u00b4\u2019'`\s]|$)|Acreditables)(?=[\u00b4\u2019'`\s]|$)/i;

const TAB_FIELD_BY_LABEL = {
  HS: "his",
  HIS: "his",
  IPS: "his",
  SEMANAL: "his",
  HIT: "hit",
  IP: "hit",
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
  /^(HS\.?|HIS|HIT|HITE|HIP|HITAT|HTAT|IPS|IP|IPP|TAE|TTE|HT|TF|CRE|SEMANAL|TE[ÓO]RICA|PR[ÁA]CTICA|TOTAL|CR[EÉ]DITOS)$/i;
const TAB_LABEL_KEY = (t) =>
  String(t).trim().toUpperCase().replace(/[.\s:]/g, "");

const TAB_YEAR_COL_RE = /^A[ÑN]O$/i;
const TAB_CODE_COL_RE = /^(COD|C[ÓO]DIGO|NRO|N[°º]?[.]?$|N[ÚU]MERO)$/i;

const TAB_HEADER_ROW_RE =
  /^(UNIDAD CURRICULAR|ASIGNATURA|C[ÓO]DIGO|NRO|N[°º]?|N[ÚU]MERO|A[ÑN]O|CANTIDAD DE|CAMP|HORAS DE|CR[EÉ]DITOS|REQUISIT|R[ÉE]GIMEN|CORRELATIV|CARRERA|PROFESORADO|PLAN|VERSI[ÓO]N|PROPUESTA|D[=:;]\s|T[ÍI]TULO)/i;
const TAB_TITLE_ROW_RE =
  /^(LICENCIAD[AO]|T[EÉ]CNIC[AO]|PROFESORADO|UNIVERSIDAD|DISE[ÑN]O CURRICULAR|NOMENCLATURA|ACTIVIDADES CURRICULARES ACREDITABLES|Gr[áa]fica)/i;
const TAB_HEADER_TOKEN_RE =
  /^(?:A[ÑN]O|NRO|N[°º]?|COD|C[ÓO]DIGO|N[ÚU]MERO|ASIGNATURA|UNIDAD|CURRICULAR|CAMP|IP|HS\.?|SEMA|NAL|HTAT|HITAT|TAE|TTE|TOTAL|CRE|HIS|HIT|HITE|HIP|TF|HT|CP|D|O|HORAS|CANTIDAD|TRABAJO|PEDAG|AUT[ÓO]N|INTERACCI|TOTALES|SELECCIONES)$/i;

const numVal = (s) => {
  const t = String(s).trim();
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d+\.\d{3}$/.test(t)) return parseInt(t.replace(/\./g, ""), 10);
  return parseFloat(t.replace(",", ".")) || 0;
};

const isDurToken = (it) =>
  TAB_DURATION_RE.test(it.t) && it.x >= 150 && it.x <= 399;

// Título intermedio ---------------------------------------------------------
// Muchos planes de UNAHUR otorgan un título intermedio (Técnico/a …) que se
// obtiene cursando un subconjunto del plan. La tabla de ese título ("…del
// título del intermedio") suele aparecer como una sección propia luego de la
// tabla principal, y es la única con marcadores de cuatrimestre. Acá se detecta
// ese rango de páginas para marcar las materias que lo integran y el nombre.

const INTERMEDIO_START_RE =
  /estructura del (?:t[u\u00fa]tulo|t\u00edtulo)(?:[^.]*?)intermedio|7\.\d+\.\d+\s+[^.]*intermedio/i;
const INTERMEDIO_END_RE =
  /seguimiento curricular|correlativid?ades?|\bcorrelativ\b|materias?\s+optativas|pr[a\u00e1]ctica\s+profesional|proyecto\s+(?:fi[ñn]al|final)|formaci[o\u00f3]n\s+pr[a\u00e1]ctica|contenidos\s+m[i\u00ed]nimos|actividades curriculares acreditables|estructura de (?:la|el) (?:licenciad|profesorad|ingenier|t[u\u00fa]tulo)|^\s*\d{1,2}\.(?:\.\d+)?\s+[A-ZÑÁÉÍÓÚÜ][\wẂẄ]/m;

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
    // Escaneo de abajo hacia arriba. En páginas donde la tabla arranca en la
    // parte alta (sin nota de leyenda arriba), la primera fila "de datos"
    // (token de duración o fila con números) puede quedar ENCIMA de las
    // etiquetas de horas/total de esa misma página. En vez de cortar al primer
    // dato, se sigue subiendo para juntar las etiquetas de la cabecera.
    for (const row of [...rows].sort((a, b) => b.y - a.y)) {
      if (isDurToken(row.items[0]) || row.items.some(isDurToken)) {
        sawData = true;
        continue;
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
    if (process.env.PARSE_DEBUG) {
      console.log(
        `[meta] page=${page.num} yearX=${yearX} codeX=${codeX} labels=${JSON.stringify(
          [...labels],
        )} real=${JSON.stringify([...realLabels])}`,
      );
    }
    if (realLabels.length >= 2) {
      return { labels: new Map(realLabels), yearX, codeX };
    }
    if (sawData && realLabels.length) {
      return { labels: new Map(realLabels), yearX, codeX };
    }
  }
  return null;
}

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
  if (
    TAB_TOTAL_RE.test(joined) ||
    TAB_ACA_RE.test(joined) ||
    TAB_FOOTER_RE.test(joined)
  )
    return false;
  if (TAB_SUMMARY_ROW_RE.test(joined)) return false;
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

function normalizeDurationToken(t) {
  return /^(C|Cuatrimestral)$/i.test(t) ? "C" : "A";
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

// ---------------------------------------------------------------------------
// Plan "columnar compacto": una fila = una materia, con el número pegado al
// nombre en un solo token ("1 Matemática para informática I") y 4 columnas
// numéricas (Hs Semana, Hs Inter., Hs Trabajo, Créditos) seguidas de una
// columna de correlativas (referencias por número: "-", "1", "5 - 6") y una de
// equivalencias / nombre anterior ("Igual", "Inglés II").
// Encabezado en 3 filas: "Nro | Materia | Créditos | Correlativas | Nombre
// anterior / | Equivalencia", más "Hs | Hs Inter. | Hs Trabajo" y sus
// sub-etiquetas "Semana | Pedag. | Auton.". Usado por los planes
// "para comunicar" / "para web" de Informática (IA, Ciberseguridad,
// Videojuegos, Hojas de cálculo de Google).
// ---------------------------------------------------------------------------
const COLUMNAR_NRO_RE = /^NRO$/i;
const COLUMNAR_MATERIA_RE = /^MATERIA$/i;
const COLUMNAR_CRED_RE = /^CR[EÉ]DITOS\b/i;
const COLUMNAR_CORR_RE = /^CORRELATIVAS$/i;
const COLUMNAR_YEAR_TOTAL_RE = /^Total\s+(\d)\s*[°º]?\s*A[ÑN]O/i;
const COLUMNAR_ACA_RE = /^CR[EÉ]DITOS\s+ACA\b/i;
const COLUMNAR_GLUE_RE = /^(\d{1,3})\s+(\S.*)$/;
const COLUMNAR_REF_RE = /^[\d\s.,\-–—‐]+$/;

// Mapeo de trayectos/áreas de formación detectados (clásico o columnar) al
// campo "generic" del modelo. Sólo los códigos que existen en el enum se
// traducen; el resto queda como `trayecto` textual sin generic.
const TRAJECTORY_GENERIC = {
  CFC: "CFC",
  CFB: "CFB",
  CFP: "CFP",
};

// Token de trayecto/área de formación dentro de una fila de materia:
// un texto corto ("CBGyE", "AyL", "ISBDySO"...) a la derecha del nombre.
const findTrayectoTok = (row) =>
  (row.items || []).find(
    (it) => TAB_AREA_RE.test(it.t.trim()) && it.t.trim().length <= 8,
  );

const trajectoryFor = (tok) => {
  if (!tok) return { trayecto: null, generic: null };
  const trayecto = tok.t.trim();
  return {
    trayecto,
    generic: TRAJECTORY_GENERIC[trayecto.toUpperCase()] || null,
  };
};

function detectColumnarMeta(rawPages) {
  for (const page of rawPages) {
    const rows = groupRows(page);
    if (!rows.length) continue;
    for (const row of rows) {
      const byTok = {};
      for (const it of row.items) {
        if (COLUMNAR_NRO_RE.test(it.t)) byTok.nro = it.x;
        else if (COLUMNAR_MATERIA_RE.test(it.t)) byTok.materia = it.x;
        else if (COLUMNAR_CRED_RE.test(it.t)) byTok.cred = it.x;
        else if (COLUMNAR_CORR_RE.test(it.t)) byTok.corr = it.x;
      }
      if (byTok.nro == null || byTok.materia == null || byTok.cred == null) {
        continue;
      }
      // Requiere al menos una fila de dato con el número pegado al nombre
      // ("1 Matemática para informática I") para no secuestrar tablas de
      // estructura clásicas (Cód | Unidad curricular | horas | CRE).
      const hasGlued = rows.some(
        (r) =>
          r.y < row.y - 20 &&
          r.items.some(
            (it) =>
              it.x < byTok.materia + 40 && COLUMNAR_GLUE_RE.test(it.t),
          ),
      );
      if (hasGlued) {
        const meta = {
          pageNum: page.num,
          headerY: row.y,
          codeX: byTok.nro,
          nameX: byTok.materia,
          credX: byTok.cred,
          corrX: byTok.corr,
          careerName: null,
          intermediateTitle: null,
          trayectoX: null,
        };
        // Leyenda por encima de la cabecera ("Carrera: Licenciatura en …",
        // "Título intermedio: Técnico/a …") y columna de trayecto/área cuando
        // el encabezado la declara ("TRAYECTO", "FORMACIÓN", "CAMPO").
        for (const legendRow of rows) {
          const byLine = legendRow.items
            .slice()
            .sort((a, b) => a.x - b.x);
          if (byLine.some((it) => COLUMNAR_CRED_RE.test(it.t))) {
            for (const it of byLine) {
              if (
                /^(TRAYECTO|FORMACI[ÓO]N|CAMP[ÓO])$/.test(it.t.trim()) &&
                it.x >= byTok.materia + 20
              ) {
                meta.trayectoX = it.x;
              }
            }
          } else {
            for (let i = 0; i < byLine.length; i++) {
              const tok = byLine[i].t.trim();
              if (/^T[ÍI]TULO\s+INTERMEDIO$/i.test(tok)) {
                const val = byLine[i + 1];
                if (val && /[a-z\u00c0-\u017f]/i.test(val.t)) {
                  meta.intermediateTitle = val.t.trim();
                }
              } else if (/^CARRERA$/i.test(tok) && !meta.careerName) {
                const val = byLine[i + 1];
                if (val && /[a-z\u00c0-\u017f]/i.test(val.t)) {
                  meta.careerName = val.t.trim();
                }
              }
            }
          }
        }
        return meta;
      }
    }
  }
  return null;
}

// Filas del bloque de encabezado columnar, para excluirlas de los datos:
// "Nro | Materia | Créditos (Correlativas)", "Hs | Hs Inter. | Hs Trabajo"
// y "Semana | Pedag. | Auton.". ("Créditos ACA..." es dato, no header).
const COLUMNAR_HDR_TOKEN_TEST = (it) =>
  /^(NRO|MATERIA|CORRELATIVAS|HS|SEMANA|PEDAG\.|AUTON\.)$/i.test(it.t) ||
  /^CR[EÉ]DITOS$/i.test(it.t);

// Obtiene las filas de materia de una página columnar: tokens pegados
// "N Nombre..." a la izquierda del encabezado, con números a la derecha.
// También emite filas marcadoras (totales de año, Créditos ACA) sin token pegado.
function columnarSubjectRows(page, meta) {
  const out = [];
  const headerY = meta.headerY;
  for (const row of groupRows(page)) {
    if (row.y > headerY) continue;
    if (row.items.some(COLUMNAR_HDR_TOKEN_TEST)) continue;
    const text = rowText(row);
    const isMarker =
      COLUMNAR_YEAR_TOTAL_RE.test(text) ||
      COLUMNAR_ACA_RE.test(text) ||
      /^Total\s*T[ÍI]TULO/i.test(text);
    const nameTok = row.items.find(
      (it) => it.x < meta.nameX + 40 && COLUMNAR_GLUE_RE.test(it.t),
    );
    if (!nameTok && !isMarker) continue;
    const numbers = row.items
      .filter((it) => isNumber(it.t) && it.x > meta.nameX)
      .sort((a, b) => a.x - b.x);
    out.push({ row, nameTok: nameTok || null, numbers, isMarker });
  }
  return out;
}

function parseColumnarOfficial(rawPages, meta) {
  const subjects = [];
  const seen = new Map();
  let year = null;
  let unassigned = [];
  let seq = 0;
  let creditsIntermediate = 0;
  let creditsFinalOverride = null;

  const flush = (y) => {
    for (const s of unassigned) if (s.year == null) s.year = y;
    unassigned = [];
  };

  const push = (entry) => {
    const key = entry.name.toLowerCase().replace(/\s+/g, " ").trim();
    const existing = seen.get(key);
    if (existing) {
      if (existing.year == null && entry.year != null) existing.year = entry.year;
      for (const [k, v] of Object.entries(entry.hours || {})) {
        if (!existing.hours[k]) existing.hours[k] = v;
      }
      return existing;
    }
    seen.set(key, entry);
    subjects.push(entry);
  };

  for (const page of rawPages) {
    for (const { row, nameTok, numbers } of columnarSubjectRows(page, meta)) {
      const text = rowText(row);
      const ym = text.match(COLUMNAR_YEAR_TOTAL_RE);
      if (ym) {
        // El total llega DESPUÉS de las materias de ese año.
        flush(parseInt(ym[1], 10));
        year = parseInt(ym[1], 10) + 1;
        continue;
      }
      if (/^Total\s*(?:T[ÍI]TULO\s+INTERMEDIO|INTERMEDIO)/i.test(text)) {
        // "Total Título intermedio": el último número de la fila es la meta de
        // créditos del título intermedio (p. ej. 120).
        creditsIntermediate = numbers.length
          ? numVal(numbers[numbers.length - 1].t)
          : 0;
        continue;
      }
      if (/^Total\s*(?:T[ÍI]TULO\s*(?:DE\s*GRADO|FINAL))/i.test(text)) {
        creditsFinalOverride = numbers.length
          ? numVal(numbers[numbers.length - 1].t)
          : null;
        continue;
      }
      if (COLUMNAR_ACA_RE.test(text)) {
        // Créditos ACA separados por tramo: el que acredita el título
        // intermedio y el del tramo de grado. Cada uno es su propia materia
        // ACA (con nombre distinto para no colisionar en el dedupe).
        const credits = numbers.length
          ? numVal(numbers[numbers.length - 1].t)
          : 0;
        const belongsIntermediate =
          /T[ÍI]TULO\s+INTERMEDIO/i.test(text);
        const acaName = belongsIntermediate
          ? "Créditos ACA (Título intermedio)"
          : "Créditos ACA (Tramo final)";
        push({
          code: belongsIntermediate ? "ACA" : "ACAD",
          name: acaName,
          year: null,
          cuatrimestre: null,
          duration: "C",
          hours: { his: 0, hit: 0, hite: 0, hip: 0, htat: 0, ht: 0 },
          credits,
          kind: "ACA",
          generic: "ACA",
          optional: true,
          intermediate: belongsIntermediate,
        });
        continue;
      }
      if (/^Total\b/i.test(text)) continue;

      const glue = nameTok.t.match(COLUMNAR_GLUE_RE);
      const num = glue ? parseInt(glue[1], 10) : null;
      const name = cleanName([glue ? glue[2] : nameTok.t]);
      if (!name) continue;
      const n = numbers.map((x) => numVal(x.t));
      const code = num != null ? `OF${String(num).padStart(3, "0")}` : `OF${String(++seq).padStart(3, "0")}`;
      const tfg = meta && meta.trayectoX != null ? trajectoryFor(findTrayectoTok(row)) : { trayecto: null, generic: null };
      const entry = {
        code,
        name,
        year: null,
        cuatrimestre: null,
        duration: "C",
        hours: {
          his: n[0] ?? 0,
          hit: n[1] ?? 0,
          hite: 0,
          hip: 0,
          htat: n[2] ?? 0,
          ht: 0,
        },
        credits: n[3] ?? (n.length ? n[n.length - 1] : 0),
        kind: "Materia",
        generic: tfg.generic,
        trayecto: tfg.trayecto,
        optional: /^AU[_ ]/i.test(name),
        intermediate: false,
      };
      push(entry);
      unassigned.push(entry);
    }
  }
  // Año por defecto para materias sin marcador (p. ej. planes de una sola tabla).
  flush(year ?? 1);

  const creditsFinal =
    creditsFinalOverride ??
    subjects.reduce((acc, s) => acc + (s.credits || 0), 0);
  return {
    sourceKind: "oficial",
    subjects,
    intermediateTitle: (meta && meta.intermediateTitle) || null,
    careerName: (meta && meta.careerName) || null,
    creditsFinal,
    creditsIntermediate: creditsIntermediate || 0,
  };
}

// Parser de plan oficial (tabla de estructura: Cód, Unidad curricular, TF, D, horas, CRE)
async function parseOfficialPlan(data) {
  const rawPages = await getRawItems(data);
  const columnarMeta = detectColumnarMeta(rawPages);
  if (columnarMeta) return parseColumnarOfficial(rawPages, columnarMeta);
  const meta = detectOfficialMeta(rawPages);
  const intermedioPages = detectIntermedioPages(rawPages);
  const intermediateTitle = detectIntermediateTitle(rawPages);

  const subjects = [];
  const seen = new Map();

  const state = { year: null, cuatrimestre: null, inIntermediate: false };

  // Créditos que la tabla del título intermedio le asigna a la fila de
  // Actividades Curriculares Acreditables (ACA). Se suma al total del título
  // intermedio porque esa materia no se cuenta como materia regular.
  let intermedioAcaCredits = null;

  const fillRetroactiveCuat = (cuat) => {
    for (const s of subjects) {
      if (s.cuatrimestre == null && (s.year == null || s.year === state.year)) {
        s.cuatrimestre = cuat;
      }
    }
  };

  const applyMarkerRow = (row) => {
    const joined = rowText(row);
    if (!joined) return false;
    const isTotalish = TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined);
    if (isTotalish) {
      const stripped = joined.replace(TAB_TOTAL_RE, " ").replace(TAB_ACA_RE, " ");
      const peri = classifyPeriodHeader(stripped);
      if (peri && peri.cuatrimestre) {
        fillRetroactiveCuat(peri.cuatrimestre);
        state.cuatrimestre = peri.cuatrimestre + 1;
      } else if (peri) {
        state.year = peri.year;
        state.cuatrimestre = null;
      }
      return true;
    }
    if (isPeriodMarkerRow(row)) {
      const peri = classifyPeriodHeader(joined);
      if (peri.year) {
        state.year = peri.year;
        // en carreras con subtotales por cuatrimestre el año no define cuatrimestre
        state.cuatrimestre = null;
      } else if (peri.cuatrimestre) {
        state.cuatrimestre = peri.cuatrimestre;
      }
      return true;
    }
    return false;
  };

  const pushSubject = (anchor) => {
    const nums = anchor.nums;
    const yearCol = meta && meta.yearX != null;
    if (yearCol && anchor.yearCol != null) state.year = anchor.yearCol;

    let facts;
    let credits;
    if (meta) {
      const byC = {};
      let tf = null;
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
        if (bestD > 45) continue;
        if (bestField === "credits") {
          credits = n.v;
        } else if (bestField === "tf") {
          tf = n.v;
        } else {
          if (byC[bestField] == null) byC[bestField] = n.v;
        }
      }
      facts = {
        his: byC.his ?? 0,
        hit: byC.hit ?? 0,
        hite: byC.hite ?? 0,
        hip: byC.hip ?? 0,
        htat: byC.htat ?? 0,
        ht: byC.ht ?? 0,
        ...(tf != null ? { tf } : {}),
      };
      if (credits == null) credits = nums.length ? nums[nums.length - 1].v : 0;
    } else {
      facts = splitRowFacts({
        nums: nums.map((n) => n.v),
        duration: anchor.duration,
      });
      credits = facts.credits;
    }

    const name = cleanName(anchor.nameParts.map((p) => p.t));
    if (!name) return null;

    const isAca = /\bACA\b/i.test(name);
    const isAu = /^AU[_ ]/i.test(name);
    const tfg = trajectoryFor(anchor.tfTok || null);

    const code = `OF${String(anchor.num ?? subjects.length + 1).padStart(3, "0")}`;

    const entry = {
      code,
      name,
      year: (yearCol ? anchor.yearCol : null) ?? state.year,
      cuatrimestre: state.cuatrimestre,
      duration: anchor.duration || "C",
      hours: facts,
      credits: credits ?? 0,
      kind: isAca ? "ACA" : "Materia",
      generic: isAca ? "ACA" : tfg.generic,
      trayecto: isAca ? null : tfg.trayecto,
      optional: isAu || isAca,
      intermediate: !!state.inIntermediate,
    };

    if (isAca) {
      // La ACA no pertenece a ningún año/cuatrimestre y su código es estable.
      entry.year = null;
      entry.cuatrimestre = null;
      entry.code = "ACA";
    }

    const key = name.toLowerCase().replace(/\s+/g, " ").trim();
    const existing = seen.get(key);
    if (existing) {
      if (existing.cuatrimestre == null && entry.cuatrimestre != null) {
        existing.cuatrimestre = entry.cuatrimestre;
      }
      if (existing.year == null && entry.year != null) {
        existing.year = entry.year;
      }
      if (entry.intermediate) existing.intermediate = true;
      for (const [k, v] of Object.entries(entry.hours || {})) {
        if (!existing.hours[k]) existing.hours[k] = v;
      }
      if (!existing.credits) existing.credits = entry.credits;
      return existing;
    }
    seen.set(key, entry);
    subjects.push(entry);
    return entry;
  };

  let carry = null;

  for (const page of rawPages) {
    const rows = groupRows(page);
    if (!rows.length) continue;

    state.inIntermediate = intermedioPages.has(page.num);

    // Pasa 1: definir filas ancla (duración o N° de orden) con sus metadatos.
    //
    // La columna D puede repetirse en varias líneas de la misma materia
    // (Ingenierías: la celda se parte y las horas quedan repartidas en 2-3
    // líneas). Las líneas de continuación tienen <4 números y ningún nombre;
    // se descartan como ancla y sus números se cuelgan de la materia más
    // cercana en el pasa 2.
    //
    // Puerta de "página de tabla": las páginas con prosa (contenidos mínimos,
    // fundamentación, etc.) pueden contener palabras como "Anual"/"Cuatrimestral"
    // y no deben generar anclas falsas. Una página real de plan tiene al menos
    // algunos números en la banda de columnas (x >= 300).
    let numeric300 = 0;
    for (const row of rows) {
      for (const it of row.items) {
        if (isNumber(it.t) && it.x >= 300) numeric300 += 1;
      }
    }
    const durCandidates = rows.filter((r) => r.items.some(isDurToken)).length;
    if (
      numeric300 < 3 ||
      (durCandidates < 2 && !(meta && meta.codeX != null))
    ) {
      carry = null;
      continue;
    }

    // Pasa 1: filas ancla = líneas que llevan el NOMBRE de una materia.
    // Es la identidad confiable de una materia: la celda se puede partir en 2-3
    // líneas (Ingenierías) y la columna D ("Cuatrimestral") puede aparecer en
    // cualquiera de ellas, o incluso faltar en la línea del nombre. Las líneas
    // de continuación (solo D y/o números) no son anclas y sus datos se cuelgan
    // de la mater+cercana en el pasa 2.
    //
    // Los fragmentos de un mismo nombre (envueltos en 2 líneas alrededor de la
    // fila de horas, p. ej. Profesorados) se fusionan en un mismo grupo, de modo
    // que no generen dos materias.
    // Nombres "envueltos": la celda del nombre puede partirse y dejar la fila de
    // datos (horas + duración) entre dos fragmentos del nombre (p. ej. el plan
    // de la Lic. en Enfermería: "Taller de Investigación en" / "39 … Anual … 16"
    // / "Enfermería"). Se fusionan los fragmentos a <= 14 px de ambos lados de la
    // fila de datos en una única materia. La puerta (fragmento arriba Y abajo)
    // evita tocar tablas donde el nombre ya está completo en una sola línea.
    const wrappedDataY = new Set();
    const consumedFragY = new Set();
    const wrappedAnchors = [];
    const hasPlanData = (r) =>
      r.items.some(isDurToken) ||
      r.items.some((it) => isNumber(it.t) && it.x >= 300) ||
      (meta &&
        meta.codeX != null &&
        r.items.some(
          (it) => /^\d{1,2}$/.test(it.t) && Math.abs(it.x - meta.codeX) <= 14,
        ));
    const isNameFragRow = (r) => {
      const joined = rowText(r);
      if (TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined) || TAB_FOOTER_RE.test(joined)) return false;
      if (isPeriodMarkerRow(r)) return false;
      if (!isOfficialNameLine(r)) return false;
      if (!officialNameTokens(r).length) return false;
      if (hasPlanData(r)) return false;
      return true;
    };
    const dataRows2 = rows.filter((r) => {
      if (!hasPlanData(r)) return false;
      const joined = rowText(r);
      return (
        !TAB_TOTAL_RE.test(joined) &&
        !TAB_ACA_RE.test(joined) &&
        !TAB_FOOTER_RE.test(joined) &&
        !isPeriodMarkerRow(r)
      );
    });
    const fragRows2 = rows.filter(isNameFragRow);
    for (const d of dataRows2) {
      let fa = null;
      let faD = 15;
      let fb = null;
      let fbD = 15;
      for (const f of fragRows2) {
        if (consumedFragY.has(f.y)) continue;
        const above = d.y - f.y;
        const below = f.y - d.y;
        if (above >= 0 && above < faD) {
          faD = above;
          fa = f;
        }
        if (below >= 0 && below < fbD) {
          fbD = below;
          fb = f;
        }
      }
      if (!fa || !fb) continue;
      consumedFragY.add(fa.y);
      consumedFragY.add(fb.y);
      wrappedDataY.add(d.y);
      const durTok = d.items.find(isDurToken);
      const codeTok =
        meta && meta.codeX != null
          ? d.items.find(
              (it) =>
                /^\d{1,2}$/.test(it.t) && Math.abs(it.x - meta.codeX) <= 14,
            )
          : null;
      wrappedAnchors.push({
        y: d.y,
        duration: durTok ? normalizeDurationToken(durTok.t) : null,
        num: codeTok ? parseInt(codeTok.t, 10) : null,
        tfTok: [fa, d, fb].map(findTrayectoTok).find(Boolean) || null,
        yearCol: null,
        nameParts: [
          ...officialNameTokens(fa),
          ...officialNameTokens(d),
          ...officialNameTokens(fb),
        ],
        nums: [],
        ownNums300: d.items.filter(
          (it) => isNumber(it.t) && it.x >= 300,
        ).length,
        group: null,
        merged: false,
      });
    }

    const anchors = [];
    for (const row of rows) {
      const joined = rowText(row);
      if (
        TAB_TOTAL_RE.test(joined) ||
        TAB_ACA_RE.test(joined) ||
        TAB_FOOTER_RE.test(joined)
      )
        continue;
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
          tfTok: findTrayectoTok(row) || null,
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

    if (!anchors.length && !acaAnchors.length) {
      carry = null;
      continue;
    }

    // Agrupa los anclas del mismo nombre envuelto. Dos anclas consecutivas son
    // el mismo nombre si:
    //  - entre ellas hay una "fila fuerte" (D + 4+ números: la fila de horas que
    //    queda entre los dos fragmentos del nombre, p. ej. Profesorados), o
    //  - están muy juntas (<= 13 px) y el fragmento inferior trae números
    //    (p. ej. "Sistemas de representación gráfica" partido en las Ingenierías).
    const groups = [];
    const strongBetween = (a, b) => {
      // Fila(s) que forman la celda de datos entre dos fragmentos del mismo
      // nombre: hace falta una línea con D y 4+ números en total en la banda
      // (pueden estar repartidos en 2 líneas, p. ej. "Estabilidad y
      // Resistencia de materiales" en Metalúrgica).
      let hasDur = false;
      let numCount = 0;
      for (const r of rows) {
        if (!(b.y < r.y && r.y < a.y)) continue;
        if (r.items.some(isDurToken)) hasDur = true;
        numCount += r.items.filter((it) => isNumber(it.t) && it.x >= 300).length;
      }
      return hasDur && numCount >= 4;
    };
    for (const a of anchors) {
      // anchors ya vienen ordenados de arriba hacia abajo (rows vienen desc).
      if (!groups.length) {
        a.group = 0;
        groups.push({ top: a, members: [a] });
        continue;
      }
      const top = groups[groups.length - 1].top;
      const gap = top.y - a.y;
      const strong = strongBetween(top, a);
      // El merge por cercanía (<= 13 px) es para nombres partidos en dos líneas
      // donde la línea superior sólo trae fragmento de nombre (sin D ni nro.) y
      // los datos caen en la inferior. Dos filas reales a esa distancia (ambas
      // con D y números, p. ej. "Tecnología educativa" / "Política educativa" en
      // Profesorado, o "Introducción a la Biotecnología" / "Matemática I") NO
      // deben fusionarse.
      const topHasData = top.duration != null || top.num != null;
      const sameCell = strong
        ? gap <= 20
        : gap <= 13 && a.ownNums300 >= 1 && !topHasData;
      if (process.env.PARSE_DEBUG && page.num === 17) {
        console.log(
          `[p17][merge?] cur=${a.y} top=${top.y} gap=${gap} strong=${strong} ownN=${a.ownNums300}`,
        );
      }
      if (sameCell) {
        a.group = groups.length - 1;
        groups[groups.length - 1].members.push(a);
      } else {
        a.group = groups.length;
        groups.push({ top: a, members: [a] });
      }
    }

    if (process.env.PARSE_DEBUG) {
      console.log(
        `[p${page.num}] anchors=${anchors.length} groups=${groups.length} W=${windowFor(
          medianGap(groups.map((g) => g.top.y)),
        )} nums=${anchors.reduce((n, a) => n + a.nums.length, 0)}`,
      );
    }

    const W = windowFor(medianGap(groups.map((g) => g.top.y)));

    // Continuación del nombre de la última materia de la página anterior
    // (los fragmentos envueltos pueden terminar en el tope de la página siguiente).
    if (carry && carry.nameParts) {
      const firstAnchor = [...anchors].sort((a, b) => a.y - b.y)[0];
      const topLimit = firstAnchor.y + W;
      for (const row of rows) {
        if (row.y <= topLimit) break;
        if (anchors.some((a) => Math.abs(a.y - row.y) < 1)) continue;
        if (!isOfficialNameLine(row)) continue;
        if (row.items.some(isDurToken)) continue;
        if (isOfficialDataRow(row, meta)) continue;
        const tokens = officialNameTokens(row);
        if (!tokens.length) continue;
        carry.nameParts.push(...tokens);
      }
      carry = null;
    }

    // Pasa 2: asignar cada fila (fragmento de nombre y/o números) a su materia.
    // Las filas ancla se quedan con sus propios tokens; el resto se cuelga de la
    // materia LEÍDA ANTES (el ancla inmediatamente arriba en la página), porque
    // en las celdas partidas las líneas de continuación siguen a su nombre y no
    // a la materia vecina de abajo.
    for (const row of rows) {
      const joined = rowText(row);
      if (TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined)) continue;
      if (TAB_SUMMARY_ROW_RE.test(joined)) continue;
      if (isPeriodMarkerRow(row)) continue;
      if (consumedFragY.has(row.y)) continue;
      if (!officialNumberRowUsable(row) && !isOfficialNameLine(row)) continue;

      let best = anchors.find((a) => Math.abs(a.y - row.y) < 1) || null;
      if (!best) {
        let above = null;
        for (const a of anchors) {
          if (a.y > row.y && (!above || a.y < above.y)) above = a;
        }
        if (above) best = above;
        else {
          let bestD = Infinity;
          for (const a of anchors) {
            const d = Math.abs(row.y - a.y);
            if (d < bestD) {
              bestD = d;
              best = a;
            }
          }
        }
      }
      if (!best) continue;
      const selfRow = Math.abs(best.y - row.y) < 1;
      if (!selfRow && Math.abs(row.y - best.y) > W) continue;

      if (officialNumberRowUsable(row)) {
        for (const it of row.items) {
          if (isNumber(it.t) && it.x >= 300) {
            best.nums.push({ x: it.x, v: numVal(it.t), y: row.y });
          }
        }
      }
      const durTok = row.items.find(isDurToken);
      if (durTok && !best.duration) {
        best.duration = normalizeDurationToken(durTok.t);
      }
      if (isOfficialNameLine(row) && !wrappedDataY.has(row.y)) {
        best.nameParts.push(...officialNameTokens(row));
      }
    }

    // Consolida cada grupo: los fragmentos del mismo nombre vuelcan sus tokens
    // en el ancla superior (la que se empuja en el pasa 3).
    for (const g of groups) {
      const top = g.top;
      for (const m of g.members) {
        if (m === top) continue;
        top.nameParts.push(...m.nameParts);
        top.nums.push(...m.nums);
        if (!top.duration && m.duration) top.duration = m.duration;
        if (top.num == null && m.num != null) top.num = m.num;
        m.merged = true;
      }
    }

    for (const a of anchors) {
      a.nums.sort((p, q) => p.x - q.x || p.y - q.y);
      a.nameParts.sort((p, q) => q.y - p.y || p.x - q.x);
    }

    // Pasa 3: recorrer en orden de lectura, aplicando marcadores de período y
    // empujando cada materia con el estado (año/cuatrimestre) que corresponde.
    const orderedRows = [...rows].sort((a, b) => b.y - a.y);
    const bottomGroupTop = groups.reduce(
      (best, g) => (!best || g.top.y < best.y ? g.top : best),
      null,
    );
    for (const row of orderedRows) {
      const aca = acaAnchors.find((x) => Math.abs(x.y - row.y) < 1);
      if (aca) {
        const entry = pushSubject(aca);
        if (entry && state.inIntermediate && intermedioAcaCredits == null) {
          intermedioAcaCredits = aca.acaCredits ?? entry.credits;
        }
        continue;
      }
      if (applyMarkerRow(row)) continue;
      const a = anchors.find((x) => Math.abs(x.y - row.y) < 1);
      if (!a || a.merged) continue;
      // Actualizar el estado de año/cuatrimestre ANTES de descartar filas sin
      // datos (p. ej. un "2° Añ o" partido que no pasó como marcador), para que
      // el período valga aunque la fila no genere materia.
      const emb = classifyPeriodHeader(rowText(row));
      if (emb && emb.year) {
        state.year = emb.year;
      } else if (emb && emb.cuatrimestre) {
        state.cuatrimestre = emb.cuatrimestre;
      }
      if (process.env.PARSE_DEBUG) {
        console.log(
          `[p${page.num}][push] y=${a.y} m=${a.merged} np=${a.nameParts.map(
            (p) => p.t,
          ).join(" ")} nums=${a.nums.length} dur=${a.duration} num=${a.num}`,
        );
      }
      // Títulos de sección, notas o encabezados sin datos no son materias.
      if (!a.nums.length && !a.duration && a.num == null) continue;
      if (meta && meta.yearX != null) {
        const yt = row.items.find(
          (it) => isNumber(it.t) && Math.abs(it.x - meta.yearX) <= 15,
        );
        if (yt) state.year = parseInt(yt.t, 10);
      }
      const entry = pushSubject(a);
      if (!a.isAcaRow && a === bottomGroupTop) {
        carry = entry
          ? { ...entry, nameParts: a.nameParts, anchorY: a.y }
          : null;
      }
    }
  }

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
      .reduce((acc, s) => acc + (s.credits || 0), 0) + (intermedioAcaCredits || 0);

  return {
    sourceKind: "oficial",
    subjects,
    intermediateTitle,
    creditsFinal,
    creditsIntermediate,
  };
}

const STATUS_RE = /\((Promocionado|Aprobado|Regular|Libre|Pendiente|En [cC]urso)\)/i;
const ORIGEN_RE = /\b(Promoci[oó]n|Equivalencia|Final|Examen final)\b/i;
const KING_RE = /(Materia|ACA_UC|Actividad\s*Curricular)/i;

// Normaliza el estado leído del PDF a uno de los valores válidos de la app
// (Promocionado/En curso/Libre son variantes que el frontend no maneja).
const STATUS_ALIASES = {
  promocionado: "Aprobada",
  aprobado: "Aprobada",
  aprobada: "Aprobada",
  libre: "Aprobada",
  "en_curso": "Cursando",
  cursando: "Cursando",
  regular: "Regular",
  pendiente: "Pendiente",
};

function normalizeStatus(raw) {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return STATUS_ALIASES[key] || null;
}

// Parser del documento "Plan de estudios" / reporte con estado del alumno.
// Línea tipo: Nombre (código) [!] Materia 3 -Cuatrimestral 9 (Promocionado) Promoción 7.00
function parseStudentReportLine(text) {
  const m = text.match(/^(?<name>.+?)\s+\((?<code>[^()]+)\)\s*(?<rest>.*)$/);
  if (!m) return null;

  let rest = m.groups.rest.replace(/\([!*\-]\)/g, " ").replace(/\s+/g, " ").trim();

  const statusMatch = STATUS_RE.exec(rest);
  const status = statusMatch ? statusMatch[1] : null;

  const notaMatch = rest.match(/(\d{1,2})\s*\((Promocionado|Aprobado|Regular|Libre|Pendiente)\)/i);
  const nota = notaMatch ? parseInt(notaMatch[1], 10) : null;

  const origenMatch = ORIGEN_RE.exec(rest);
  const origen = origenMatch ? origenMatch[1] : null;

  const yearMatch = rest.match(/(^|\s)(\d)\s*-?\s*Cuatrimestral/);
  const year = yearMatch ? parseInt(yearMatch[2], 10) : null;
  const duration = /Cuatrimestral/.test(rest) ? "C" : "A";

  const kindMatch = KING_RE.exec(rest);
  const kindRaw = kindMatch ? kindMatch[1] : null;
  const kind = kindRaw === "ACA_UC" ? "ACA" : "Materia";

  // Créditos solo si vienen explicitados con etiqueta (evita tomar la nota
  // de la línea, p.ej. "Promoción 7.00", como si fueran créditos).
  const creditsMatch = rest.match(/(?:cr[eé]ditos?|cre)\b[:\s]*(\d+(?:\.\d{1,2})?)/i);
  const credits = creditsMatch ? parseFloat(creditsMatch[1]) : 0;

  return {
    code: m.groups.code.trim(),
    name: cleanName([m.groups.name]),
    year,
    cuatrimestre: null,
    duration,
    credits: credits ?? 0,
    kind,
    optional: kind === "ACA" || /^AU[_ ]/i.test(m.groups.name),
    status: normalizeStatus(status || (origen ? "Aprobada" : "Pendiente")) ?? "Pendiente",
    nota,
    fecha: null,
    origen,
  };
}

const HISTORIA_RE = /^(?<name>.+?)\s+\((?<code>[^()]+)\)\s+(?<fecha>\d{2}\/\d{2}\/\d{4})\s+(?<tipo>\w+)\s+(?<nota>\d{1,2})\s+(?<resultado>.+)$/;

// Parser de la "Historia académica" (materias aprobadas con fecha y nota).
function parseHistoriaLine(text) {
  const m = text.match(HISTORIA_RE);
  if (!m) return null;
  const resultado = m.groups.resultado.trim();
  const status = /Libre|Regular/.test(resultado)
    ? resultado
    : /Aprobado|Promocionad/i.test(resultado)
      ? "Aprobada"
      : "Pendiente";
  return {
    code: m.groups.code.trim(),
    name: cleanName([m.groups.name]),
    year: null,
    cuatrimestre: null,
    duration: "C",
    credits: 0,
    kind: "Materia",
    optional: /^AU[_ ]/i.test(m.groups.name) || /^ACA/.test(m.groups.name),
    status: normalizeStatus(status) ?? "Pendiente",
    nota: parseInt(m.groups.nota, 10),
    fecha: m.groups.fecha,
    origen: /Promoci/i.test(m.groups.tipo) ? "Promoción" : m.groups.tipo,
  };
}

// Parser del PDF personal (plan de estudios con estado u historia académica).
async function parseAcademicHistory(data) {
  const pages = await extractLines(data);
  const subjects = [];
  const seen = new Set();
  let careerHint = null;

  for (const page of pages) {
    for (const line of page.lines) {
      const text = line.text.trim();
      if (!text) continue;

      if (!careerHint && /Propuesta:/i.test(text)) {
        careerHint = text
          .replace(/Propuesta:/i, "")
          .replace(/Plan:.*$/i, "")
          .trim();
      }

      let parsed = parseHistoriaLine(text) || parseStudentReportLine(text);
      if (!parsed) continue;
      if (!parsed.name || !parsed.name.trim()) continue;
      if (/^(Propuesta|Versi[oó]n|Plan[:]?|Cuadro de equivalencias)/i.test(parsed.name.trim())) continue;
      if (seen.has(parsed.code)) continue;
      seen.add(parsed.code);

      if (parsed.status === "Pendiente" && !parsed.nota) {
        parsed.status = "Pendiente";
      }
      subjects.push(parsed);
    }
  }

  return {
    sourceKind: subjects.length
      ? /historia/i.test(pages.map((p) => p.lines.map((l) => l.text).join(" ")).join(" ").slice(0, 200))
        ? "historia"
        : "plan"
      : "desconocido",
    careerHint,
    subjects,
  };
}

// ---------------------------------------------------------------------------
// Parser de documentos "Plan de correlatividades".
// Detecta tres columnas por posición (número | nombre | correlativas) usando las
// coordenadas x/y del PDF, así las materias con nombres largos que se envuelven
// se reconstruyen correctamente.
// ---------------------------------------------------------------------------

const PERIOD_ORD = {
  PRIMER: 1,
  SEGUNDO: 2,
  TERCER: 3,
  TERCERO: 3,
  CUARTO: 4,
  QUINTO: 5,
  SEXTO: 6,
};

const CORREL_NOISE_RE =
  /^(ANEXO|PLAN NUEVO|SISTEMA DE CORRELATIVIDADES|UNIDAD CURRICULAR|CORRELATIVA\/?S?|CORRELATIVIDADES\b|ACTIVIDADES CURRICULARES ACREDITABLES|EDUCACI[OÓ]N F[IÍ]SICA|LICENCIATURA EN|MATEM[ÁA]TICA|PROFESORADO\b)/i;

const CORREL_FRAG_NOISE_RE =
  /CS\s*-?\s*\d+|RCS\b|REG[ÍI]STRESE|Art[íi]culo 2|40 ANIVERSARIO|CONSEJO INTERUNIVERSITARIO|ACTIVIDADES CURRICULARES ACREDITABLES|Tener aprobada al menos|con t[íi]tulo intermedio|T[EÉ]CNICO|CARRERA DENOMINADA|EXP\.[\s\d]|REMOVED|^000\d+$|SEDE|PROTOCOLO|~[\d@X]{2,}/i;

const CORREL_ITEM_NOISE_RE =
  /^[-–—‐–\u00A0\s]{2,}$|^(CS|RCS|ANEXO|PLAN|UNIDAD|CORRELATIVA|PROFESORADO|EDUCACI)/i;

const CORREL_TOKEN_NOISE_RE =
  /^(CS|RCS|ANEXO)\b|ANIVERSARIO|INTERUNIVERSITARIO|^ACTIVIDADES CURRICULARES$|^ACREDITABLES$|\(ACA\)|ACTIVIDADES CURRICULARES ACREDITABLES|al menos|materias? regularizad|materia$/i;

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
  if (row.items.some(isNumber)) return false;
  const peri = classifyPeriodHeader(rowText(row));
  if (!peri) return false;
  return !row.items.some(
    (it) =>
      isNameToken(it) &&
      !PERIOD_WORD_RE.test(stripPeriodPrefix(it.t.trim()).trim()),
  );
}

function normSubjectKey(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(el|la|los|las)\s+/, "");
}

function splitCorrelativas(text) {
  const cleaned = text
    .replace(/[—–‐-]{2,}/g, " ")
    .replace(/\bAPROBADAS? TODAS LAS MATERIAS DEL (?:CICLO)?\s*[IVX]+\b/gi, " ")
    .replace(/\b(?:aprobadas? todas las materias(?: del (?:ciclo\s*)?[ivx]+)?)\b/gi, " ")
    .replace(/\bTener\s+\d+\s*(?:materias?|asignaturas?)\s+regularizadas?/gi, " ")
    .replace(
      /\b\d+\s*(?:materias?|asignaturas?)\s+regularizadas?[*]?\b/gi,
      " ",
    )
    .replace(/\b(en el nivel|regularizad[aos]*)\b/gi, " ")
    .replace(/\+/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned
    .split(/[;,]+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return parts
    .map((part) => {
      if (/^[-–—‐\u00A0]+$/.test(part)) return null;
      const refs = [...part.matchAll(/\((\d{1,3})\)/g)].map((mm) =>
        parseInt(mm[1], 10),
      );
      // Referencia pegada "301-Anatomo-Fisiología I" / "SC_FB01-Salud...":
      // el prefijo antes del guión es el código de la materia vinculada.
      let codeRef = null;
      let name = part;
      const glued = name.match(/^\s*([A-Z0-9_]{1,8})[—–-](?=\S)/);

      if (glued) {
        const prefix = glued[1].toUpperCase();
        if (/^\d+$/.test(prefix) || /^[A-Z]+[0-9_]*[A-Z0-9]*$/i.test(prefix)) {
          codeRef = prefix;
        }
      }
      if (codeRef) {
        name = name.replace(/^\s*[A-Z0-9_]{1,8}[—–-]/, " ");
      }
      name = name
        .replace(/\(\d{1,3}\)/g, " ")
        .replace(/[()[\]{}]/g, " ")
        .replace(/[.,;:]+$/g, " ")
        .replace(/\b(?:y|con)\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!name && !refs.length && !codeRef) return null;
      if (/^\d{1,2}$/.test(name)) return null;
      return { name: name || null, refs, codeRef };
    })
    .filter(
      (c) =>
        c &&
        !CORREL_ITEM_NOISE_RE.test(c.name || "") &&
        !CORREL_FRAG_NOISE_RE.test(c.name || ""),
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

function isAnchorRow(row) {
  const first = row.items[0];
  return !!first && /^\d{1,3}$/.test(first.t) && first.x < 400;
}

function isNoiseRow(row) {
  const joined = row.items.map((i) => i.t).join(" ").trim();
  if (!joined) return true;
  if (classifyPeriodHeader(joined)) return true;
  return (
    CORREL_NOISE_RE.test(joined) ||
    CORREL_ITEM_NOISE_RE.test(joined) ||
    CORREL_FRAG_NOISE_RE.test(joined)
  );
}

function collectAnchors(rows) {
  const anchors = [];
  let period = null;
  for (const row of rows) {
    const peri = classifyPeriodHeader(
      row.items.map((i) => i.t).join(" ").trim(),
    );
    if (peri) {
      period = peri;
      continue;
    }
    if (isNoiseRow(row)) continue;
    if (isAnchorRow(row)) {
      const tidy = row.items.filter(
        (it) => !CORREL_TOKEN_NOISE_RE.test(it.t),
      );
      if (!tidy.length) continue;
      anchors.push({ y: row.y, items: tidy, period });
    }
  }
  return anchors;
}

function fragmentGroups(rows) {
  const groups = [];
  for (const row of rows) {
    if (isAnchorRow(row)) continue;
    if (isNoiseRow(row)) continue;
    const keep = row.items.filter(
      (it) => !CORREL_TOKEN_NOISE_RE.test(it.t),
    );
    if (!keep.some((it) => !/^\d{1,3}$/.test(it.t))) continue;
    groups.push({ y: row.y, items: keep });
  }
  return groups;
}

function nearestSides(anchors, gy) {
  let P = null;
  let N = null;
  let dP = Infinity;
  let dN = Infinity;
  for (const a of anchors) {
    const d = a.y - gy;
    if (d >= 0 && d < dP) {
      dP = d;
      P = a;
    }
    if (d < 0 && -d < dN) {
      dN = -d;
      N = a;
    }
  }
  return { P, N, dP, dN };
}

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

      const name = cleanName(nameToks.map((i) => i.t));
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

// ---------------------------------------------------------------------------
// Formato columnar (Informática "para comunicar" / "para web"): las
// correlativas son NÚMEROS en su propia columna ("-", "1", "5 - 6").
// ---------------------------------------------------------------------------
function parseColumnarCorrelativas(rawPages, meta) {
  const subjects = [];
  const byName = new Map();
  let seq = 0;
  let year = null;
  let unassigned = [];

  const flush = (y) => {
    for (const s of unassigned) if (s.year == null) s.year = y;
    unassigned = [];
  };

  for (const page of rawPages) {
    for (const { row, nameTok, numbers } of columnarSubjectRows(page, meta)) {
      const text = rowText(row);
      const ym = text.match(COLUMNAR_YEAR_TOTAL_RE);
      if (ym) {
        flush(parseInt(ym[1], 10));
        year = parseInt(ym[1], 10) + 1;
        continue;
      }
      if (COLUMNAR_ACA_RE.test(text)) continue;
      if (/^Total\b/i.test(text)) continue;
      if (!nameTok) continue;

      const glue = nameTok.t.match(COLUMNAR_GLUE_RE);
      const num = glue ? parseInt(glue[1], 10) : null;
      const name = cleanName([glue ? glue[2] : nameTok.t]);
      if (!name) continue;

      const key = normSubjectKey(name);
      if (byName.has(key)) continue;

      // La columna de correlativas queda después de los 4 números fijos
      // (Hs Semana, Hs Inter., Hs Trabajo, Créditos); los tokens que quedan a
      // la derecha y son solo dígitos/guiones son las referencias. Nota: en
      // filas con correlativa de un solo número ("1"), ese ref aparece dentro
      // de `numbers`, así que la cota de la columna es el 4º número.
      const credX =
        numbers.length >= 4
          ? numbers[3].x
          : numbers.length
            ? numbers[numbers.length - 1].x
            : meta.credX;
      const refToks = row.items
        .filter((it) => it.x > credX + 2 && COLUMNAR_REF_RE.test(it.t))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      const refs = [
        ...new Set(
          refToks.flatMap((it) =>
            [...it.t.matchAll(/\d{1,3}/g)].map((m) => parseInt(m[0], 10)),
          ),
        ),
      ];

      // Una correlativa por referencia para que todas resuelvan a código.
      const criteria = refs.map((r) => ({ name: null, refs: [r] }));
      const subject = {
        num,
        code: `CR${String(seq + 1).padStart(3, "0")}`,
        name,
        year: null,
        cuatrimestre: null,
        duration: "C",
        credits: 0,
        kind: "Materia",
        optional: false,
        criteria,
        correlativas: [],
      };
      byName.set(key, subject);
      subjects.push(subject);
      unassigned.push(subject);
      seq++;
    }
  }

  flush(year ?? 1);
  return subjects;
}

// ---------------------------------------------------------------------------
// Formato de DOS columnas (correlatividades de Diseño Industrial): a la
// izquierda "Actividad Curricular" (nombre que puede ocupar varias líneas), a
// la derecha las correlativas (varias líneas, separadas por " - "). No hay
// números. Una celda derecha más alta que su izquierda aparece como líneas
// solo-derecha ANTES de la fila de su materia: se encolan y se adosan a la
// siguiente materia.
// ---------------------------------------------------------------------------
const COL2_HDR_TOKEN_RE = /^(ACTIVIDAD|CURRICULAR|CORRELATIVAS)$/i;
const COL2_NOISE_RE = /^\d+\s*\/\s*\d+$|^(?:CS|RCS)\b|^ANEXO\b/i;
const COL2_GAP_THRESHOLD = 21;

function splitTwoColumnCorrelativas(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  return cleaned
    .split(/\s+[-‐–—]\s+/)
    .map((p) => p.replace(/^\s*[-‐–—]+\s*/, "").replace(/\s+[-‐–—]+\s*$/, "").trim())
    .filter((p) => p && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/i.test(p))
    .map((p) => ({ name: p, refs: [] }));
}

function detectTwoColumnMeta(rawPages) {
  for (const page of rawPages) {
    const rows = groupRows(page);
    let corrRow = null;
    let hasCurricular = false;
    for (const row of rows) {
      let hasCorr = false;
      for (const it of row.items) {
        if (/^CORRELATIVAS$/i.test(it.t)) hasCorr = true;
        if (/^CURRICULAR$/i.test(it.t)) hasCurricular = true;
      }
      if (hasCorr) corrRow = row;
    }
    if (!corrRow || !hasCurricular) continue;
    return { pageNum: page.num };
  }
  return null;
}

function parseTwoColumnCorrelativas(rawPages) {
  const subjects = [];
  const byName = new Map();
  let seq = 0;

  const pushSubject = (entry) => {
    const key = normSubjectKey(entry.name);
    if (byName.has(key)) return;
    byName.set(key, entry);
    subjects.push(entry);
    seq++;
  };

  const closeSubject = (current) => {
    current.criteria = splitTwoColumnCorrelativas(current.corrText.join(" "));
    current.correlativas = current.criteria.map((c) => c.name).filter(Boolean);
    current.code = `CR${String(subjects.length + 1).padStart(3, "0")}`;
    pushSubject(current);
  };

  const isHeaderRow = (row) =>
    row.items.some((it) => COL2_HDR_TOKEN_RE.test(it.t));

  // Límite entre columnas: se toman las X frecuentes de todos los tokens de
  // datos (sin encabezado). Los nombres de materia se repiten por fila a una X
  // fija a la izquierda y las correlativas a otra X a la derecha; títulos y
  // ruido suelto ("RCS...", "7/9", "ANEXO I") aparecen una o dos veces y se
  // ignoran pidiendo frecuencia mínima. La columna derecha empieza tras el
  // mayor salto entre esas X.
  const counts = new Map();
  for (const page of rawPages) {
    for (const row of groupRows(page)) {
      if (isHeaderRow(row)) continue;
      for (const it of row.items) {
        const x = Math.round(it.x);
        counts.set(x, (counts.get(x) || 0) + 1);
      }
    }
  }
  const freqXs = [...counts.entries()]
    .filter(([, n]) => n >= 3)
    .map(([x]) => x)
    .sort((a, b) => a - b);
  let boundary = Infinity;
  if (freqXs.length >= 2) {
    let gapIdx = -1;
    let maxGap = 40;
    for (let i = 1; i < freqXs.length; i++) {
      const gap = freqXs[i] - freqXs[i - 1];
      if (gap > maxGap) {
        maxGap = gap;
        gapIdx = i;
      }
    }
    boundary =
      gapIdx > 0
        ? (freqXs[gapIdx - 1] + freqXs[gapIdx]) / 2
        : (freqXs[0] + freqXs[freqXs.length - 1]) / 2;
  }
  if (!Number.isFinite(boundary)) return [];

  for (const page of rawPages) {
    const rows = groupRows(page);
    // En la página que tiene encabezado, el título queda arriba de él; en las
    // demás no hay encabezado y toda la página es tabla.
    const headerRows = rows.filter(isHeaderRow);
    const headerY = headerRows.length ? Math.max(...headerRows.map((r) => r.y)) : null;

    let current = null;
    let pendingRight = [];
    let lastLeftY = 0;
    for (const row of rows) {
      if (isHeaderRow(row)) continue;
      if (headerY != null && row.y >= headerY) continue;
      const left = row.items.filter((it) => it.x < boundary && !/^[-‐–—\s]+$/.test(it.t));
      const right = row.items.filter((it) => it.x >= boundary && !/^[-‐–—\s]+$/.test(it.t));
      if (!left.length && !right.length) continue;

      const Ltext = cleanName(left.map((i) => i.t));
      const Rtext = cleanName(right.map((i) => i.t));
      if (COL2_NOISE_RE.test(Ltext) || COL2_NOISE_RE.test(Rtext)) continue;

      if (left.length) {
        const newSubject = !current || lastLeftY - row.y > COL2_GAP_THRESHOLD;
        if (newSubject) {
          if (current) closeSubject(current);
          current = {
            num: null,
            code: null,
            name: Ltext,
            year: null,
            cuatrimestre: null,
            duration: "C",
            credits: 0,
            kind: "Materia",
            optional: false,
            corrText: pendingRight.concat(right).map((i) => i.t),
          };
          pendingRight = [];
        } else {
          current.name += " " + Ltext;
          if (right.length) current.corrText = current.corrText.concat(right.map((i) => i.t));
        }
        lastLeftY = row.y;
      } else {
        pendingRight = pendingRight.concat(right);
      }
    }
    if (current) closeSubject(current);
  }

  return subjects;
}

async function parseCorrelativas(data) {
  const rawPages = await getRawItems(data);

  const columnarMeta = detectColumnarMeta(rawPages);
  if (columnarMeta) {
    const subjects = parseColumnarCorrelativas(rawPages, columnarMeta);
    return correlativasPayload(resolveCorrelativas(subjects));
  }

  const twoColumnMeta = detectTwoColumnMeta(rawPages);
  if (twoColumnMeta) {
    const subjects = parseTwoColumnCorrelativas(rawPages, twoColumnMeta);
    return correlativasPayload(resolveCorrelativas(subjects));
  }

  if (hasCorrelativasTable(rawPages)) {
    return correlativasPayload(resolveCorrelativas(parseCorrelativasTable(rawPages)));
  }

  const subjects = [];
  const byName = new Map();
  let seq = 0;

  // Convención de maquetado del documento:
  //  - "below": el número va en la primera línea de la celda y el texto que
  //    sigue pertenece a la materia de arriba (Kinesiología, Matemática, EF).
  //  - "above": el número va en la última línea y el texto que precede
  //    pertenece a la materia de abajo (Biotecnología).
  // Se detecta con la primera celda envuelta del documento.
  let mode = null;
  outer: for (const page of rawPages) {
    const rows = groupRows(page);
    const anchors = collectAnchors(rows);
    if (!anchors.length) continue;
    for (const g of fragmentGroups(rows)) {
      const { P, dP, N, dN } = nearestSides(anchors, g.y);
      if (P && N) {
        mode = dP < dN ? "below" : "above";
        break outer;
      }
    }
  }
  mode = mode || "below";

  for (const page of rawPages) {
    const rows = groupRows(page);
    const anchors = collectAnchors(rows);
    if (!anchors.length) continue;

    // Líneas envolventes: se asignan al ancla que la convención corresponde.
    for (const g of fragmentGroups(rows)) {
      const { P, N } = nearestSides(anchors, g.y);
      const target = mode === "below" ? P || N : N || P;
      if (!target) continue;
      const keep = g.items.filter((it) => !CORREL_TOKEN_NOISE_RE.test(it.t));
      if (!keep.some((it) => !/^\d{1,3}$/.test(it.t))) continue;
      if (keep.length) target.items.push(...keep);
    }

    for (const anchor of anchors) {
      const ordered = [...anchor.items].sort((a, b) => a.x - b.x || b.y - a.y);
      const numIdx = ordered.findIndex((i) => /^\d{1,3}$/.test(i.t));
      if (numIdx === -1) continue;
      const num = parseInt(ordered[numIdx].t, 10);
      const other = ordered.filter((_, idx) => idx !== numIdx);

      // La columna de correlativas empieza después del mayor salto en X cuyo
      // lado derecho está (la derecha) dentro de la banda real de correlativas
      // (x >= 300). Sin ese filtro, un nombre partido por glifos en la celda
      // ("Didáctica y curr" / "í" / "culum") hace que el mayor salto caiga en
      // medio del nombre y los fragmentos se pierdan en las correlativas.
      let splitX = Infinity;
      if (other.length > 1) {
        let gapIdx = -1;
        let maxGap = 30;
        for (let i = 1; i < other.length; i++) {
          const gap = other[i].x - other[i - 1].x;
          if (gap > maxGap && other[i].x >= 300) {
            maxGap = gap;
            gapIdx = i;
          }
        }
        if (gapIdx > 0) {
          splitX = (other[gapIdx].x + other[gapIdx - 1].x) / 2;
        }
      }

      const nameItems = other
        .filter((i) => i.x < splitX)
        .sort((a, b) => b.y - a.y || a.x - b.x);
      const corrItems = other
        .filter((i) => i.x >= splitX)
        .sort((a, b) => b.y - a.y || a.x - b.x);

      const name = cleanName(nameItems.map((i) => i.t));
      if (!name) continue;

      const key = normSubjectKey(name);
      if (byName.has(key)) continue;

      const corrText = corrItems.map((i) => i.t).join(" ").trim();
      const criteria = splitCorrelativas(corrText);

      const subject = {
        num,
        code: `CR${String(seq + 1).padStart(3, "0")}`,
        name,
        year: anchor.period ? anchor.period.year : null,
        cuatrimestre: anchor.period ? anchor.period.cuatrimestre : null,
        duration: "C",
        credits: 0,
        kind: "Materia",
        optional: false,
        criteria,
        correlativas: criteria.map((c) => c.name).filter(Boolean),
      };
      subjects.push(subject);
      byName.set(key, subject);
      seq++;
    }
  }

  // Resuelve correlativas por número dentro del propio documento y devuelve
  // códigos provisorios (CR###) listos para re-mapear contra la base.
  return correlativasPayload(resolveCorrelativas(subjects));
}

module.exports = { parseOfficialPlan, parseAcademicHistory, parseCorrelativas };
