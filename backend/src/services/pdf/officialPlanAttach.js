// Asignación de filas a materias y consolidación de grupos.

const {
  isNumber,
  cleanName,
  rowText,
  normalizeDurationToken,
  isPeriodMarkerRow,
} = require("./shared");
const {
  TAB_TOTAL_RE,
  TAB_ACA_RE,
  TAB_TITLE_ROW_RE,
  isSummaryRowText,
  isDurToken,
  isOfficialDataRow,
  officialNumberRowUsable,
  isOfficialNameLine,
  officialNameTokens,
  firstTokX,
  numVal,
} = require("./officialPlanRows");

function attachOfficialPlanRows(pageState, ctx) {
  const {
    page,
    rows,
    anchors,
    groups,
    W,
    agroPage,
    nameAttach,
    consumedFragY,
    wrappedDataY,
  } = pageState;
  const { meta } = ctx;

  // Continuación del nombre de la última materia de la página anterior: sólo
  // en el dialecto agro (p. ej. TUPAP: "…conocimiento en la" / "cultura
  // digital" al tope de la página siguiente). Esa materia ya se publicó, así
  // que el texto se anexa a su entry.
  if (ctx.carry) {
    if (ctx.carry.entry && ctx.carry.agro) {
      const topAnchor = anchors.reduce(
        (best, a) => (!best || a.y > best.y ? a : best),
        null,
      );
      const extra = [];
      if (topAnchor) {
        for (const row of rows) {
          if (row.y <= topAnchor.y) break;
          if (!isOfficialNameLine(row)) continue;
          if (TAB_TITLE_ROW_RE.test(rowText(row))) continue;
          if (row.items.some(isDurToken)) continue;
          if (isOfficialDataRow(row, meta)) continue;
          const tokens = officialNameTokens(row);
          if (!tokens.length) continue;
          extra.push(...tokens.map((p) => p.t));
          consumedFragY.add(row.y);
        }
      }
      if (extra.length) {
        ctx.carry.entry.name = cleanName([
          ...ctx.carry.entry.name.split(/\s+/),
          ...extra,
        ]);
      }
    }
    ctx.carry = null;
  }

  // Pasa 2: asignar cada fila (fragmento de nombre y/o números) a su materia.
  // Las filas ancla se quedan con sus propios tokens; el resto se cuelga de la
  // materia LEÍDA ANTES (el ancla inmediatamente arriba en la página), porque
  // en las celdas partidas las líneas de continuación siguen a su nombre y no
  // a la materia vecina de abajo.
  for (const row of rows) {
    const joined = rowText(row);
    if (TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined)) continue;
    if (isSummaryRowText(joined)) continue;
    if (isPeriodMarkerRow(row)) continue;
    if (consumedFragY.has(row.y)) continue;
    if (!officialNumberRowUsable(row) && !isOfficialNameLine(row)) continue;

    let best = anchors.find((a) => Math.abs(a.y - row.y) < 1) || null;
    if (!best) {
      // Ancla pegada (±2 px): rescata la mitad de una fila partida que la
      // regla general descartaría por lejos (caso Alimentos: "86 150 6" a
      // 1 px del nombre, con la fila de arriba a 28-35 px). Sólo se usa
      // cuando NO hay ancla de arriba a distancia de fila normal (≤ W): en
      // tablas con filas cada ~20 px la duración "Cuatrimestral" a 1 px del
      // nombre vecino se colgaría mal de él y robaría datos entre materias
      // (p. ej. Probabilidad/Mineralogía en Metalúrgica).
      let near = null;
      let nearD = 3;
      for (const a of anchors) {
        const d = Math.abs(a.y - row.y);
        if (d <= 2 && d < nearD) {
          nearD = d;
          near = a;
        }
      }
      if (near) {
        let above = null;
        for (const a of anchors) {
          if (a.y > row.y && (!above || a.y < above.y)) above = a;
        }
        if (!above || above.y - row.y > W) best = near;
      }
    }
    let chained = false;
    if (!best && isOfficialNameLine(row)) {
      // Línea de continuación del mismo nombre: cuelga del ancla del
      // fragmento inmediatamente anterior (<= 18 px arriba, misma columna),
      // aunque el ancla quede fuera de la ventana W de la página.
      let chain = null;
      let chainD = 19;
      const rowX = firstTokX(row);
      for (const [y, e] of nameAttach) {
        const g = y - row.y;
        if (g <= 0 || g >= chainD) continue;
        if (rowX != null && e.x != null && Math.abs(rowX - e.x) > 45) {
          continue;
        }
        chainD = g;
        chain = e.anchor;
      }
      if (chain) {
        best = chain;
        chained = true;
      }
    }
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
    if (!selfRow && !chained && Math.abs(row.y - best.y) > W) continue;

    if (officialNumberRowUsable(row)) {
      // Dialecto agro: la carga semanal vive en x>=250 (la banda de 300 la
      // perdería) y el número de orden (x<200) no es dato. El resto de los
      // planes mantiene el umbral original.
      const numX = best.dialectAgro ? 250 : 300;
      for (const it of row.items) {
        if (!isNumber(it.t) || it.x < numX) continue;
        best.nums.push({ x: it.x, v: numVal(it.t), y: row.y });
      }
    }
    const durTok = row.items.find(isDurToken);
    if (durTok && !best.duration) {
      best.duration = normalizeDurationToken(durTok.t);
    }
    if (isOfficialNameLine(row) && !wrappedDataY.has(row.y)) {
      if (process.env.PARSE_DEBUG && page.num === Number(process.env.PARSE_PAGE || 17)) {
        console.log(
          `[attach] row=${row.y} -> best=${best.y} self=${selfRow} txt="${rowText(row).slice(0, 40)}"`,
        );
      }
      best.nameParts.push(...officialNameTokens(row));
      if (agroPage) {
        nameAttach.set(row.y, { anchor: best, x: firstTokX(row) });
      }
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
}

module.exports = { attachOfficialPlanRows };
