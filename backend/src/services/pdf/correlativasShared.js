// Helpers compartidos del parser de correlatividades.

const { classifyPeriodHeader } = require("./shared");

const CORREL_NOISE_RE =
  /^(ANEXO|PLAN NUEVO|SISTEMA DE CORRELATIVIDADES|UNIDAD CURRICULAR|CORRELATIVA\/?S?|CORRELATIVIDADES\b|ACTIVIDADES CURRICULARES ACREDITABLES|EDUCACI[OÓ]N F[IÍ]SICA|LICENCIATURA EN|MATEM[ÁA]TICA|PROFESORADO\b|QUE LA PRESENTE MEDIDA|HABERSE RESUELTO|LA PRESENTE RESOLUCI[ÓO]N|POR ELLO\b|EL CONSEJO SUPERIOR|UNIVERSIDAD NACIONAL DE HURLINGHAM QUE|UNIVERSITARIA EN MANTENIMIENTO HOSPITALARIO|DE ESTE CONSEJO|REGLAMENTO INTERNO|ANEXO [ÚU]NICO FORMANDO PARTE|[ÚU]NICO FORMANDO PARTE)/i;

const CORREL_FRAG_NOISE_RE =
  /CS\s*-?\s*\d+|RCS\b|REG[ÍI]STRESE|Art[íi]culo 2|40 ANIVERSARIO|CONSEJO INTERUNIVERSITARIO|ACTIVIDADES CURRICULARES ACREDITABLES|Tener aprobada al menos|con t[íi]tulo intermedio|T[EÉ]CNICO|CARRERA DENOMINADA|EXP\.[\s\d]|REMOVED|^000\d+$|SEDE|PROTOCOLO|~[\d@X]{2,}|EL CONSEJO SUPERIOR|ATRIBUCIONES|RESUELVE\b|REGLAMENTO INTERNO/i;

const CORREL_ITEM_NOISE_RE =
  /^[-–—‐–\u00A0\s]{2,}$|^(CS|RCS|ANEXO|PLAN|UNIDAD|CORRELATIVA|PROFESORADO|EDUCACI)/i;

const CORREL_TOKEN_NOISE_RE =
  /^(CS|RCS|ANEXO)\b|ANIVERSARIO|INTERUNIVERSITARIO|^ACTIVIDADES CURRICULARES$|^ACREDITABLES$|\(ACA\)|ACTIVIDADES CURRICULARES ACREDITABLES|al menos|materias? regularizad|materia$/i;

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
    // Fila suelta "Créditos en ACA": es requisito (o resto de encabezado),
    // nunca parte del nombre vecino; si se pegara lo contamina y no matchea.
    // Igual los números de página ("6/6", "7/9"): nunca son contenido.
    const joinedFrag = row.items.map((i) => i.t).join(" ").trim();
    if (/^cr[eé]ditos en aca$/i.test(joinedFrag)) continue;
    if (/^\d+\s*\/\s*\d+$/.test(joinedFrag)) continue;
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

module.exports = {
  normSubjectKey,
  splitCorrelativas,
  isAnchorRow,
  isNoiseRow,
  collectAnchors,
  fragmentGroups,
  nearestSides,
  CORREL_TOKEN_NOISE_RE,
};
