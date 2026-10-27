#!/usr/bin/env node
/*
 * Control E2E por instituto: un plan oficial + su PDF de correlatividades.
 * Uso: npm run test:institutos   (necesita backend + Mongo/Redis)
 *
 * Recorre planes-referencia.json, agrupa por instituto y prueba el camino
 * real de la UI: POST /plan-imports/preview con multipart para el plan y su
 * correlativa. No persiste planes (preview no guarda), solo crea y borra su
 * usuario de prueba.
 *
 * Por defecto prueba UN par por instituto (smoke rápido). Con ALL_PAIRS=1
 * prueba todos los pares disponibles. Un instituto sin pairCorrelativas se
 * reporta como FAIL: el corpus debe tener al menos un par por instituto.
 *
 * Env: API_URL, PLANES_DIR, ALL_PAIRS=1 (todos los pares), STRICT_IA=1
 * (la falta de materias en la correlativa pasa a FAIL).
 */
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");
const { setupTestUser, promoteToAdmin, reqPdf, reqPreviewRaw } = require("./lib/testAuth");

const PLANES_DIR = resolvePlanesDir(REPO_ROOT);
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const INFORMES_DIR = path.join(__dirname, "informes");
const ALL_PAIRS = process.env.ALL_PAIRS === "1";
const STRICT_IA = process.env.STRICT_IA === "1";
requireCorpus(PLANES_DIR, "institutos");

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const RUN_TAG = `INST-${stamp()}`;

let TEST = null;

function pairsByInstitute() {
  const ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8"));
  const plans = ref.planes.filter((e) => e.tipo !== "correlativas" && e.pairCorrelativas);
  const byInst = new Map();
  for (const plan of plans) {
    const inst = plan.file.split("/")[0];
    if (!byInst.has(inst)) byInst.set(inst, []);
    byInst.get(inst).push(plan);
  }
  const out = [];
  for (const [instituto, entries] of byInst) {
    const selected = ALL_PAIRS ? entries : entries.slice(0, 1);
    out.push({ instituto, available: entries.length, entries: selected });
  }
  return out.sort((a, b) => a.instituto.localeCompare(b.instituto));
}

function absOf(rel) {
  return path.join(PLANES_DIR, ...rel.split("/"));
}

async function preview(rel) {
  const abs = absOf(rel);
  if (!fs.existsSync(abs)) return { status: 0, body: { error: { message: "archivo ausente" } } };
  return reqPdf(TEST.token, "/plan-imports/preview", abs, { timeoutMs: 300000 });
}

function countSubjects(body) {
  return body?.detectedCount ?? body?.subjects?.length ?? 0;
}

function countCorrText(body) {
  return (body?.subjects || []).filter((s) => s.correlativasTexto).length;
}

async function main() {
  console.log(`== Control por instituto ${RUN_TAG} (ALL_PAIRS=${ALL_PAIRS ? 1 : 0}) ==`);
  console.log(`PLANES_DIR=${PLANES_DIR}`);

  try {
    const res = await fetch(`${process.env.API_URL || "http://localhost:3000"}/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.status !== 200) throw new Error("health no responde 200");
  } catch (e) {
    console.error(`ERROR: ${e.message}. Levantá el backend primero (docker compose up).`);
    process.exitCode = 2;
    return;
  }

  const groups = pairsByInstitute();
  if (!groups.length) {
    console.error("ERROR: la referencia no tiene ningún par plan+correlativa.");
    process.exitCode = 1;
    return;
  }

  TEST = await setupTestUser(RUN_TAG);
  await promoteToAdmin(TEST.nick);
  console.log(`usuario de prueba: ${TEST.nick} (ADMIN)`);

  const rows = [];
  let failed = false;

  try {
    for (const group of groups) {
      const tested = [];
      for (const entry of group.entries) {
        console.log(`[${group.instituto}] ${entry.career} ...`);
        const p = await preview(entry.file);
        const q = await preview(entry.pairCorrelativas);
        const detected = countSubjects(p.body);
        const corrTotal = countSubjects(q.body);
        const corrWithText = countCorrText(q.body);
        const okPlan = p.status === 200 && detected > 0;
        const corrDetected = q.status === 200 && corrTotal > 0;
        // 422 = el parser no detectó materias y el fallback IA no respondió
        // (cuota/red). Es WARN informativo salvo auditoría STRICT_IA=1.
        const corrAiMissing = q.status === 422;
        const corrOk = corrDetected || (!STRICT_IA && corrAiMissing);
        const corrHardFail = q.status === 0 || q.status >= 500;
        const status = !okPlan || corrHardFail || !corrOk ? "FAIL" : corrDetected ? "OK" : "WARN";
        if (status === "FAIL") failed = true;
        tested.push(`${entry.career} (${status})`);
        rows.push({
          instituto: group.instituto,
          career: entry.career,
          status,
          httpPlan: p.status,
          detected,
          httpCorr: q.status,
          corrTotal,
          corrWithText,
          corrOrigen: q.body?.sourceKind ?? "—",
          planError: p.body?.error?.message ?? null,
          corrError: q.body?.error?.message ?? null,
          ok: status !== "FAIL",
        });
        console.log(
          `  plan=${detected} (HTTP ${p.status}) | corr=${corrTotal} (HTTP ${q.status}, texto=${corrWithText}, origen=${q.body?.sourceKind ?? "—"}) ${status}`,
        );
        if (status !== "OK") {
          console.log(`  detalle: plan=${p.body?.error?.message || "—"} | corr=${q.body?.error?.message || "—"}`);
        }
      }
      console.log(`  pares disponibles=${group.available}, probados=${group.entries.length}: ${tested.join(", ")}`);
    }

    // Controles negativos (una sola vez).
    const noFile = await reqPreviewRaw(TEST.token, { json: {} });
    const notPdf = await reqPreviewRaw(TEST.token, {
      buffer: Buffer.from("no soy un pdf"),
      fileName: "no-pdf.pdf",
    });
    console.log(`[negativo] sin archivo -> HTTP ${noFile.status}; no-PDF -> HTTP ${notPdf.status}`);
    if (noFile.status !== 400 || notPdf.status !== 400) failed = true;

    const report = {
      run: RUN_TAG,
      api: process.env.API_URL || "http://localhost:3000",
      allPairs: ALL_PAIRS,
      groups: groups.map((g) => ({ instituto: g.instituto, disponibles: g.available, probados: g.entries.length })),
      rows,
      negative: { noFile: noFile.status, notPdf: notPdf.status },
      failed,
    };
    fs.mkdirSync(INFORMES_DIR, { recursive: true });
    const reportPath = path.join(INFORMES_DIR, `institutos-${RUN_TAG}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`informe: ${path.relative(REPO_ROOT, reportPath)}`);

    const resumen = [...new Set(rows.map((r) => r.instituto))].map((inst) => {
      const states = rows.filter((r) => r.instituto === inst).map((r) => r.status);
      const worst = states.includes("FAIL") ? "FAIL" : states.includes("WARN") ? "WARN" : "OK";
      return `${inst} ${worst}`;
    });
    console.log(`\ninstitutos: ${resumen.join(" | ")}`);
    if (failed) {
      console.error("resultado: FAIL");
      process.exitCode = 1;
    } else {
      console.log("resultado: OK");
    }
  } finally {
    if (TEST) await TEST.cleanup();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
