// Agrupado de anclas del mismo nombre y ventana vertical de la página.

const { isNumber } = require("./shared");
const {
  isDurToken,
  officialNameTokens,
  medianGap,
  windowFor,
} = require("./officialPlanRows");

function groupOfficialAnchors(page, rows, anchors, wrappedAnchors, wrappedDataY) {
  // Agrupa los anclas del mismo nombre envuelto. Dos anclas consecutivas son
  // el mismo nombre si:
  //  - entre ellas hay una "fila fuerte" (D + 4+ números: la fila de horas que
  //    queda entre los dos fragmentos del nombre, p. ej. Profesorados), o
  //  - están muy juntas (<= 15 px) y el fragmento inferior trae números
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
  // Tokens del nombre de un ancla, en orden de lectura, para chequear la
  // continuidad textual al fusionar: los anclas de wrap ya traen nameParts
  // armadas; los anclas propias, la fila original.
  const anchorTokens = (an) => {
    if (wrappedDataY.has(an.y)) {
      const w = wrappedAnchors.find((x) => x.y === an.y);
      return w
        ? [...w.nameParts].sort((p, q) => q.y - p.y || p.x - q.x)
        : [];
    }
    const r = rows.find((x) => x.y === an.y);
    return r ? officialNameTokens(r) : [];
  };
  const OPEN_TAIL_RE =
    /[-–—,;]$|(?:^|\s)(?:y|e|o|u|de|del|la|las|el|los|al|en|con|sin|para|por|a|ante|bajo|contra|desde|entre|hacia|hasta|según|sobre|tras|su|sus)$/i;
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
    // El merge por cercanía es para nombres partidos en dos líneas donde la
    // línea superior sólo trae fragmento de nombre (sin D ni nro.) y los
    // datos caen en la inferior (p. ej. "Laboratorio de Química Instrumental
    // y" / "Analítica" en Alimentos: 14 px de separación con la tabla a ~35
    // px por fila — media fila). Dos filas reales a esa distancia (ambas con
    // D y números, p. ej. "Tecnología educativa" / "Política educativa" en
    // Profesorado, o "Introducción a la Biotecnología" / "Matemática I") NO
    // deben fusionarse; tampoco filas consecutivas de una tabla cuyo paso es
    // parecido al gap (Chino: "Lenguas (CMER)" / "A1" a 14 px con la página
    // a 22 — no es media fila, son dos renglones reales). Por eso el extra
    // de 13-14 px exige gap <= mitad del paso de fila de la página.
    const topHasData = top.duration != null || top.num != null;
    const pagePitch = medianGap(anchors.map((x) => x.y));
    // Continuidad textual: evita fusionar dos materias distintas pegadas
    // (p. ej. "Cultura Digital" / "3 Anátomo-Fisiología I…" en el DI de
    // Enfermería) pero completa un nombre partido cuando la línea superior
    // queda abierta ("…de la" / "Investigación en Salud", "…Instrumental
    // y" / "Analítica", "Dispositivos e" / "eléctricas I").
    const topToks = anchorTokens(top);
    const topTail = topToks.length ? topToks[topToks.length - 1].t : "";
    const aToks = anchorTokens(a);
    const continues =
      !aToks.length ||
      /^\p{Ll}/u.test(aToks[0].t) ||
      OPEN_TAIL_RE.test(topTail);
    const sameCell = strong
      ? gap <= 20
      : (gap <= 13 ||
          (gap <= 14 &&
            (gap * 2 <= pagePitch ||
              (aToks[0] && /^\p{Ll}/u.test(aToks[0].t))))) &&
        (a.ownNums300 >= 1 || aToks.length) &&
        continues &&
        (!topHasData || OPEN_TAIL_RE.test(topTail));
    if (process.env.PARSE_DEBUG && page.num === Number(process.env.PARSE_PAGE || 17)) {
      console.log(
        `[pmerge][merge?] pag=${page.num} cur=${a.y} top=${top.y} gap=${gap.toFixed(2)} pitch=${pagePitch.toFixed(2)} strong=${strong} ownN=${a.ownNums300}`,
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

  return { groups, W };
}

module.exports = { groupOfficialAnchors };
