// Parser de planes de correlatividades
// Soporta tabla de tres columnas, anexo tabular y formato de dos columnas.

const {
  isNumber,
  cleanName,
  rowText,
  normalizeDurationToken,
  classifyPeriodHeader,
  groupRows,
} = require("./shared");
const { getRawItems } = require("./raw");

// ---------------------------------------------------------------------------
// Parser de documentos "Plan de correlatividades".
// Detecta tres columnas por posición (número | nombre | correlativas) usando las
// coordenadas x/y del PDF, así las materias con nombres largos que se envuelven
// se reconstruyen correctamente.
// ---------------------------------------------------------------------------

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

async function parseCorrelativas(data) {
  const rawPages = await getRawItems(data);

  if (isTwoColCorrelativas(rawPages)) {
    return correlativasPayload(resolveCorrelativas(parseTwoColCorrelativas(rawPages)));
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
  if (process.env.PARSE_DEBUG === "corr") {
    console.log(`[corr] mode=${mode}`);
  }

  for (const page of rawPages) {
    const rows = groupRows(page);
    const anchors = collectAnchors(rows);
    if (!anchors.length) continue;

    // Líneas envolventes: se asignan al ancla que la convención corresponde.
    // Fix A (Obst/Nutr/Mant.Hosp, solo modo below): las anclas son solo el
    // número y el nombre llega en fragmentos que pueden envolver por arriba
    // (cabeza del sujeto de abajo) o por abajo (cola del de arriba).
    // Redirige al ancla de abajo SOLO si las tres se cumplen: (1) el ancla
    // de arriba ya absorbió su "-" de cierre (correlativas explícitamente
    // vacías, x>=250: nada más puede pertenecerle); (2) su nombre en orden
    // de lectura está completo —se excluyen cabezas de arriba por Y—
    // ("Genética Humana" sí, "Organización de sistemas de" no); (3) el
    // fragmento trae texto en banda de nombre (x<250), porque las
    // continuaciones de correlativas (x>=250) son del de arriba.
    for (const g of fragmentGroups(rows)) {
      const { P, N } = nearestSides(anchors, g.y);
      let target = mode === "below" ? P || N : N || P;
      if (mode === "below" && target && target === P && N) {
        const closed = P.items.some((it) => it.t === "-" && it.x >= 250);
        const fragHasName = g.items.some(
          (it) => it.x < 250 && !/^\d{1,3}$/.test(it.t) && it.t !== "-",
        );
        if (closed && fragHasName) {
          const pname = P.items
            .filter(
              (it) =>
                it.y <= P.y + 2 &&
                it.x < 250 &&
                !/^\d{1,3}$/.test(it.t) &&
                it.t !== "-",
            )
            .map((it) => it.t)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (pname && !TWOCOL_TAIL_RE.test(`${pname} `)) target = N;
        }
      }
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
      // (x >= 250; Obstetricia la tiene en ≈285). Un umbral mayor pierde esas
      // columnas y todo el texto cae en el nombre. Los cortes dentro del
      // nombre por glifos ("Didáctica y curr" / "í" / "culum") generan saltos
      // chicos: gana el salto mayor.
      let splitX = Infinity;
      if (other.length > 1) {
        let gapIdx = -1;
        let maxGap = 30;
        for (let i = 1; i < other.length; i++) {
          const gap = other[i].x - other[i - 1].x;
          if (gap > maxGap && other[i].x >= 250) {
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

      const name = cleanName(nameItems.map((i) => i.t)).replace(
        /^Actividad Curricular(\s+|$)/i,
        "",
      );
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


module.exports = { parseCorrelativas };
