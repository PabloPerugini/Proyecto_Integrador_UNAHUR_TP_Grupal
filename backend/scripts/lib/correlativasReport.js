// Reporte Markdown del test E2E de correlatividades.
// Separado de verificar-correlativas.test.js para respetar el límite de 300
// líneas por archivo; no tiene lógica de API ni de negocio.
const fs = require("fs");
const path = require("path");

const md = (value) => String(value ?? "").replace(/\|/g, "\\|");

function countResults(results) {
  const counts = { OK: 0, WARN: 0, FAIL: 0, SKIP: 0 };
  for (const result of results) counts[result.estado] += 1;
  return counts;
}

function writeCorrelativasReport(results, { runTag, api, planesDir, informesDir }) {
  const counts = countResults(results);
  const fname = `correlativas-${runTag}.md`;
  fs.mkdirSync(informesDir, { recursive: true });
  const lines = [
    `# Correlatividades E2E — ${runTag}`,
    ``,
    `API=${api} · PLANES_DIR=${planesDir} · referencia=docs/testing/planes-referencia.json`,
    ``,
    `Resumen: OK=${counts.OK} WARN=${counts.WARN} FAIL=${counts.FAIL} SKIP=${counts.SKIP} (total ${results.length})`,
    ``,
    `| Carrera | Plan par (materias) | Correlativas | Matched | % | Estado | Detalle |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
  ];
  for (const result of results) {
    const detail = [result.mensaje, ...result.warns].filter(Boolean).join("<br>");
    const ratio = result.ratio === null ? "–" : `${(result.ratio * 100).toFixed(1)}%`;
    lines.push(`| ${md(result.career)} | ${result.planSubjects ?? "–"} | ${result.total ?? "–"} | ${result.matched ?? "–"} | ${ratio} | **${result.estado}** | ${md(detail)} |`);
  }
  lines.push(``);
  fs.writeFileSync(path.join(informesDir, fname), lines.join("\n"), "utf8");
  return { fname, counts };
}

module.exports = { writeCorrelativasReport };
