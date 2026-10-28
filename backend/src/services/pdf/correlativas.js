// Parser de planes de correlatividades
// Soporta tabla de tres columnas, anexo tabular y formato de dos columnas.

const { getRawItems } = require("./raw");
const {
  isTwoColCorrelativas,
  parseTwoColCorrelativas,
} = require("./correlativasTwoCol");
const {
  hasCorrelativasTable,
  parseCorrelativasTable,
} = require("./correlativasTable");
const { parseNumericCorrelativas } = require("./correlativasNumeric");
const {
  resolveCorrelativas,
  correlativasPayload,
} = require("./correlativasResolve");

async function parseCorrelativas(data) {
  const rawPages = await getRawItems(data);

  if (isTwoColCorrelativas(rawPages)) {
    return correlativasPayload(
      resolveCorrelativas(parseTwoColCorrelativas(rawPages)),
    );
  }

  if (hasCorrelativasTable(rawPages)) {
    return correlativasPayload(
      resolveCorrelativas(parseCorrelativasTable(rawPages)),
    );
  }

  return correlativasPayload(
    resolveCorrelativas(parseNumericCorrelativas(rawPages)),
  );
}

module.exports = { parseCorrelativas };
