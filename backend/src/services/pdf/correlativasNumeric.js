// Parser de correlatividades con anclas numeradas.

const { cleanName, groupRows } = require("./shared");
const {
  normSubjectKey,
  splitCorrelativas,
  collectAnchors,
  fragmentGroups,
  nearestSides,
  CORREL_TOKEN_NOISE_RE,
} = require("./correlativasShared");
const { TWOCOL_TAIL_RE } = require("./correlativasTwoCol");

function parseNumericCorrelativas(rawPages) {
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

  return subjects;
}

module.exports = { parseNumericCorrelativas };
