// Parser de tablas numeradas con columnas Área | Asignatura | Horas | Carga |
// Correlatividades.

const {
  classifyPeriodHeader,
  rowText,
  groupRows,
} = require("./shared");

function parseNumberedAreaTable(rawPages) {
  for (const page of rawPages) {
    const rows = groupRows(page);
    const tokens = page.items;

    const header = {
      subject: tokens.find((i) => /^Asignatura\b/i.test(i.t)),
      weekly: tokens.find((i) => /^Hs\.?\s*(por)?/i.test(i.t)),
      total: tokens.find((i) => /^Carga\b/i.test(i.t)),
      corr: tokens.find((i) => /^Correlatividades\b/i.test(i.t)),
      area: tokens.find((i) => /^Área\b/i.test(i.t)),
    };

    // Si no encontramos todas las columnas,
    // este PDF no utiliza este formato.
    if (Object.values(header).some((h) => !h)) {
      continue;
    }

    // Comprobar el orden horizontal de las columnas.
    if (
      !(
        header.area.x < header.subject.x &&
        header.subject.x < header.weekly.x &&
        header.weekly.x < header.total.x &&
        header.total.x < header.corr.x
      )
    ) {
      continue;
    }

    const left = header.subject.x - 10;
    const nameEnd = header.weekly.x - 5;
    const weeklyEnd = header.total.x - 5;
    const totalEnd = header.corr.x - 5;

    // Buscar materias numeradas: 1. Nombre, 2. Nombre...
    const anchors = tokens
      .filter((i) =>
        i.x >= left && i.x < nameEnd
      )
      .map((i) => {
        const match = i.t.match(
          /^(\d{1,3})\s*[.)]\s*(.*)$/
        );

        return match
          ? {
              y: i.y,
              n: Number(match[1]),
              item: i,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.y - a.y);

    // Evitar interpretar otros números como materias.
    if (
      anchors.length < 6 ||
      anchors[0].n !== 1 ||
      !anchors.every((a, i) => a.n === i + 1)
    ) {
      continue;
    }

    // Identificar los encabezados de cuatrimestre.
    const periodRows = rows
      .map((row) => ({
        row,
        period: classifyPeriodHeader(
          rowText(row)
        ),
      }))
      .filter(
        ({ period }) =>
          period &&
          period.cuatrimestre >= 1 &&
          period.cuatrimestre <= 12
      );

    if (!periodRows.length) {
      continue;
    }

    // Excluir encabezados y totales.
    const excludedYs = new Set();

    for (const row of rows) {
      const text = rowText(row);

      if (
        /\bcuatrimestre\b/i.test(text) ||
        /^carga horaria total\b/i.test(text) ||
        /^área\s+asignatura\b/i.test(text)
      ) {
        excludedYs.add(row.y);
      }
    }

    // Reconstruir celdas divididas en varias líneas.
    const joinColumn = (parts) =>
      parts
        .sort(
          (a, b) =>
            b.y - a.y || a.x - b.x
        )
        .map((i) => i.t)
        .join(" ")
        .replace(
          /(\p{L})-\s+(?=\p{L})/gu,
          "$1"
        )
        .replace(/\s+/g, " ")
        .trim();

    const subjects = [];
    let missingHours = false;

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const previous = anchors[i - 1];
      const next = anchors[i + 1];

      // Calcular el espacio correspondiente a la materia.
      const top = previous
        ? (previous.y + anchor.y) / 2
        : anchor.y + 22;

      const bottom = next
        ? (anchor.y + next.y) / 2
        : anchor.y - 22;

      const cells = tokens.filter(
        (item) =>
          item.y <= top &&
          item.y > bottom &&
          !excludedYs.has(
            Math.round(item.y)
          )
      );

      // Obtener nombre completo.
      const nameParts = cells
        .filter(
          (item) =>
            item.x >= left &&
            item.x < nameEnd
        )
        .map((item) => ({
          ...item,
          t:
            item === anchor.item
              ? item.t.replace(
                  /^\d{1,3}\s*[.)]\s*/,
                  ""
                )
              : item.t,
        }));

      const name = joinColumn(nameParts);

      // Obtener horas semanales.
      const weeklyValues = cells.filter(
        (item) =>
          item.x >= header.weekly.x - 5 &&
          item.x < weeklyEnd &&
          /^\d+(?:[.,]\d+)?$/.test(item.t)
      );

      // Obtener carga horaria total.
      const totalValues = cells.filter(
        (item) =>
          item.x >= header.total.x - 5 &&
          item.x < totalEnd &&
          /^\d+(?:[.,]\d+)?$/.test(item.t)
      );

      // Rechazar resultados incompletos.
      if (
        !name ||
        weeklyValues.length !== 1 ||
        totalValues.length !== 1
      ) {
        missingHours = true;
        break;
      }

      // Determinar el cuatrimestre de la materia.
      const period = periodRows
        .filter(
          (p) => p.row.y > anchor.y
        )
        .sort(
          (a, b) => a.row.y - b.row.y
        )[0]?.period;

      if (!period) {
        missingHours = true;
        break;
      }

      const weekly = Number(
        weeklyValues[0].t.replace(",", ".")
      );

      const total = Number(
        totalValues[0].t.replace(",", ".")
      );

      if (!(weekly > 0 && total > 0)) {
        missingHours = true;
        break;
      }

      // Extraer correlatividades en texto.
      const correlative = joinColumn(
        cells.filter(
          (item) =>
            item.x >= header.corr.x - 5
        )
      );

      // Crear la materia detectada.
      subjects.push({
        code: `OF${String(
          anchor.n
        ).padStart(3, "0")}`,

        name,

        year: Math.ceil(
          period.cuatrimestre / 2
        ),

        cuatrimestre:
          ((period.cuatrimestre - 1) % 2) + 1,

        duration: "C",

        hours: {
          weekly,
          total,
          his: 0,
          hit: 0,
          hite: 0,
          hip: 0,
          htat: 0,
          ht: total,
        },

        credits: 0,
        kind: "Materia",
        generic: null,

        optional: /^Electiva\b/i.test(name),

        intermediate: false,

        correlativasTexto:
          correlative &&
          correlative !== "-"
            ? correlative
            : null,
      });
    }

    // No devolver ni cachear un resultado parcial.
    if (
      !missingHours &&
      subjects.length === anchors.length
    ) {
      return {
        sourceKind: "oficial",
        subjects,
        intermediateTitle: null,
        creditsFinal: 0,
        creditsIntermediate: 0,
      };
    }
  }

  // Si no reconocemos este formato,
  // dejamos que trabajen los parsers originales.
  return null;
}

module.exports = { parseNumberedAreaTable };
