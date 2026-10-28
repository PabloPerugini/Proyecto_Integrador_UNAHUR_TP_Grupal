// Empuje de materias aplicando marcadores de período.

const {
  isNumber,
  rowText,
  classifyPeriodHeader,
} = require("./shared");
const { applyMarkerRow, pushSubject } = require("./officialPlanState");

function pushOfficialPlanSubjects(pageState, ctx) {
  const { page, rows, anchors, groups, acaAnchors, agroPage } = pageState;
  const { meta, state } = ctx;

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
      const entry = pushSubject(ctx, aca);
      if (entry && state.inIntermediate && ctx.intermedioAcaCredits == null) {
        ctx.intermedioAcaCredits = aca.acaCredits ?? entry.credits;
      }
      continue;
    }
    if (applyMarkerRow(ctx, row)) continue;
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
    const entry = pushSubject(ctx, a);
    if (!a.isAcaRow && a === bottomGroupTop) {
      ctx.carry = entry ? { entry, agro: agroPage, anchorY: a.y } : null;
    }
  }
}

module.exports = { pushOfficialPlanSubjects };
