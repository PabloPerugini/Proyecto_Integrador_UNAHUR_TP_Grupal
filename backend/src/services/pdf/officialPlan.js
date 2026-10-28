// Parser del plan oficial
// Reconstruye la tabla de estructura por coordenadas (materias, horas, créditos, título intermedio).

const { groupRows } = require("./shared");
const { getRawItems } = require("./raw");
const { parseNumberedAreaTable } = require("./officialPlanArea");
const {
  detectIntermedioPages,
  detectIntermediateTitle,
  detectOfficialMeta,
} = require("./officialPlanMeta");
const { buildPageAnchors } = require("./officialPlanAnchors");
const { groupOfficialAnchors } = require("./officialPlanGroups");
const { attachOfficialPlanRows } = require("./officialPlanAttach");
const { pushOfficialPlanSubjects } = require("./officialPlanPush");
const { finalizeOfficialPlan } = require("./officialPlanFinalize");

async function parseOfficialPlan(data) {
  const rawPages = await getRawItems(data);

  const areaTable = parseNumberedAreaTable(rawPages);

  if (areaTable) {
    return areaTable;
  }

  const ctx = {
    meta: detectOfficialMeta(rawPages),
    intermedioPages: detectIntermedioPages(rawPages),
    intermediateTitle: detectIntermediateTitle(rawPages),
    subjects: [],
    seen: new Map(),
    state: { year: null, cuatrimestre: null, inIntermediate: false },
    intermedioAcaCredits: null,
    carry: null,
  };

  for (const page of rawPages) {
    const rows = groupRows(page);
    if (!rows.length) continue;

    ctx.state.inIntermediate = ctx.intermedioPages.has(page.num);

    const pageState = buildPageAnchors(page, rows, ctx.meta);
    if (!pageState) {
      ctx.carry = null;
      continue;
    }

    const { groups, W } = groupOfficialAnchors(
      page,
      rows,
      pageState.anchors,
      pageState.wrappedAnchors,
      pageState.wrappedDataY,
    );
    pageState.groups = groups;
    pageState.W = W;

    attachOfficialPlanRows(pageState, ctx);
    pushOfficialPlanSubjects(pageState, ctx);
  }

  return finalizeOfficialPlan(ctx);
}

module.exports = { parseOfficialPlan };
