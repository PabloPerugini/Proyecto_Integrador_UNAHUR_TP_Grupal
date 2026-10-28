// Construcción de anclas para nombres de materia partidos en varias líneas.

const {
  isNumber,
  rowText,
  normalizeDurationToken,
  isPeriodMarkerRow,
} = require("./shared");
const {
  TAB_TOTAL_RE,
  TAB_ACA_RE,
  isDurToken,
  isOfficialNameLine,
  officialNameTokens,
  firstTokX,
} = require("./officialPlanRows");

function buildWrappedAnchors(page, rows, meta, agroPage) {
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
  // Filas de nombre ya colgadas de una materia: permiten encadenar líneas de
  // continuación (incluidas las que siguen en la página siguiente).
  const nameAttach = new Map();
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
    if (TAB_TOTAL_RE.test(joined) || TAB_ACA_RE.test(joined)) return false;
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
      !isPeriodMarkerRow(r)
    );
  });
  // Competidores para el veto de fragmentos: toda fila con datos de tabla
  // (incluidas las que traen el prefijo de período "PRIMER/SEGUNDO AÑO …",
  // que isPeriodMarkerRow deja fuera de dataRows2 por compatibilidad con el
  // pipeline de años/créditos). Si no compitieran, un fragmento pegado a
  // ellas (p. ej. "Eléctrica" en Energía P17 o "Mineralogía y tratamiento"
  // en Metalúrgica P21) quedaría a merced de la materia vecina.
  const competitors = dataRows2.concat(
    rows.filter(
      (r) =>
        !dataRows2.includes(r) &&
        hasPlanData(r) &&
        !TAB_TOTAL_RE.test(rowText(r)) &&
        !TAB_ACA_RE.test(rowText(r)),
    ),
  );
  const fragRows2 = rows.filter(isNameFragRow);
  // Distancia de un fragmento a la fila de datos más cercana que no sea la
  // propia celda (una celda puede ocupar 2 líneas pegadas: número, datos y
  // a veces el hueco de 6-8 px entre ambas, p. ej. GA 275/283 o Nutrición
  // 566/572). Esa banda se excluye para no vetar el fragmento propio.
  const otherDataDist = (f, d) => {
    let best = Infinity;
    for (const dd of competitors) {
      if (dd.y === d.y || Math.abs(dd.y - d.y) <= 8) continue;
      // En el dialecto agro (TUPAP) el nombre de una materia se despliega
      // debajo de su fila y puede invadir la distancia de la materia
      // siguiente: esa fila (nombre inline, p. ej. "6 Sistemas…") no
      // compite. En tablas estándar SÍ compite: es el veto que impide
      // robarle el fragmento a la materia vecina (p. ej. "Eléctrica" en
      // Energía P17, "Mineralogía y tratamiento" en Metalúrgica P21,
      // "Investigación en Salud"/"Enfermería en" en Enfermería P5).
      if (agroPage && officialNameTokens(dd).length) continue;
      const dist = Math.abs(f.y - dd.y);
      if (dist < best) best = dist;
    }
    return best;
  };
  // Primera x de la columna del nombre de una fila: los fragmentos del mismo
  // nombre comparten sangría (evita encadenar títulos centrados como
  // "Licenciado/a en Enfermería", x≈222, al nombre de la tabla, x≈49).
  for (const d of dataRows2) {
    // Un fragmento sólo se consume si no está más cerca de otra fila de
    // datos (el nombre partido pertenece a la materia que lo contiene).
    const own = (f) => Math.abs(f.y - d.y) <= otherDataDist(f, d) + 1;
    let fa = null;
    let faD = 15;
    let fb = null;
    let fbD = 15;
    for (const f of fragRows2) {
      if (consumedFragY.has(f.y)) continue;
      if (!own(f)) continue;
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
    // Líneas adicionales del mismo nombre (p. ej. "Nuevos Entornos y" sobre
    // "Lenguajes: …" en el DI de Enfermería, o las 4 líneas de "Nuevos
    // entornos y lenguajes: …" del dialecto agro): fragmentos encadenados a
    // <= 18 px del elegido, en la misma columna del nombre y sin alejarse
    // más de ~media fila de la celda de datos (excepto en el dialecto agro,
    // donde los nombres largos se despliegan en varias líneas).
    const used = [fa, fb].filter(Boolean);
    const xRef =
      (fa ? firstTokX(fa) : null) ?? (fb ? firstTokX(fb) : null) ?? null;
    for (const side of [fa, fb]) {
      const down = side === fa; // fa: fragmentos hacia abajo (y menor)
      let prev = side;
      while (prev) {
        let nx = null;
        let nxD = 19;
        for (const f of fragRows2) {
          if (f === prev || consumedFragY.has(f.y) || used.includes(f)) {
            continue;
          }
          const dy = prev.y - f.y;
          const gap = Math.abs(dy);
          if (gap === 0 || gap >= nxD) continue;
          if (down ? dy <= 0 : dy >= 0) continue;
          if (!agroPage && Math.abs(f.y - d.y) > 24) continue;
          // El salto sólo vale si el fragmento pertenece a esta celda: más
          // cerca de esta fila de datos que de otra (evita colgar "Nuevos
          // entornos y" tras "…alimentaria" en Agrario, cuyo fragmento ya
          // pertenece a la materia de abajo).
          if (!own(f)) continue;
          const fx = firstTokX(f);
          if (xRef != null && fx != null && Math.abs(fx - xRef) > 45) {
            continue;
          }
          nxD = gap;
          nx = f;
        }
        if (!nx) break;
        used.push(nx);
        prev = nx;
      }
    }
    if (agroPage && (!fa || !fb)) continue;
    // Un solo lado sólo dispara si está pegado a la fila (mitad de celda
    // partida): un wrap de un lado lejano le roba el nombre a la materia
    // vecina (p. ej. "Dispositivos e instalaciones" en Energía, que debe
    // fusionarse por cercanía con "eléctricas I" en el merge de anclas).
    // Además la fila debe tener datos "de cuerpo" (D, código o números de
    // horas en la zona de la tabla): las filas que sólo traen un número de
    // la columna de correlativas (p. ej. "13"/"6" en Desarrollo Agrario)
    // no son media celda partida y no capturan el fragmento de arriba.
    const durOwn = d.items.find(isDurToken);
    const codeOwn =
      meta && meta.codeX != null
        ? d.items.find(
            (it) =>
              /^\d{1,2}$/.test(it.t) && Math.abs(it.x - meta.codeX) <= 14,
          )
        : null;
    const bodyNums = d.items.filter(
      (it) => isNumber(it.t) && it.x >= 300 && it.x < 460,
    ).length;
    const dTiny = !durOwn && !codeOwn && bodyNums === 0;
    const oneSideStrong =
      ((fa && !fb && faD <= 3) || (fb && !fa && fbD <= 3)) && !dTiny;
    if (!(fa && fb) && !oneSideStrong) continue;
    if (!used.length) continue;
    for (const f of used) consumedFragY.add(f.y);
    wrappedDataY.add(d.y);
    if (process.env.PARSE_DEBUG && page.num === Number(process.env.PARSE_PAGE || 17)) {
      console.log(
        `[wrap] d=${d.y} fa=${fa ? fa.y : "-"} fb=${fb ? fb.y : "-"} used=[${used
          .map((f) => f.y)
          .join(",")}] txt="${used.map((f) => rowText(f)).join(" | ").slice(0, 70)}"`,
      );
    }
    const durTok = d.items.find(isDurToken);
    const codeTok =
      meta && meta.codeX != null
        ? d.items.find(
            (it) =>
              /^\d{1,2}$/.test(it.t) && Math.abs(it.x - meta.codeX) <= 14,
          )
        : null;
    const w = {
      y: d.y,
      duration: durTok ? normalizeDurationToken(durTok.t) : null,
      num: codeTok ? parseInt(codeTok.t, 10) : null,
      yearCol: null,
      nameParts: [
        ...used.flatMap((f) => officialNameTokens(f)),
        ...officialNameTokens(d),
      ],
      nums: [],
      ownNums300: d.items.filter(
        (it) => isNumber(it.t) && it.x >= 300,
      ).length,
      group: null,
      merged: false,
    };
    wrappedAnchors.push(w);
    for (const f of used) {
      nameAttach.set(f.y, { anchor: w, x: firstTokX(f) });
    }
  }

  return { wrappedAnchors, wrappedDataY, consumedFragY, nameAttach };
}

module.exports = { buildWrappedAnchors };
