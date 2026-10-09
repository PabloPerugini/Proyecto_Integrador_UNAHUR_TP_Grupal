#!/usr/bin/env node
/*
 * Control de correlativas: Instituto de Salud Comunitaria (nueva arquitectura).
 * Uso: npm run test:salud
 *
 * Para cada carrera: preview del plan oficial (materias detectadas + cobertura
 * de correlativasTexto extraído) y preview de su PDF de correlativas (el
 * endpoint resuelve por parser determinístico o rescate IA). Además dos
 * CONTROLES NEGATIVOS del blindaje de subida: preview sin archivo (400) y
 * preview con buffer que no es PDF (400).
 *
 * NOTA: la API nueva aún no tiene endpoint de matching texto->prerequisites
 * ni de grafo por carrera (el grafo lo calcula el frontend desde study-plans).
 * Este control mide extracción, no resolución: cuando exista el endpoint de
 * correlativas se vuelve a agregar guardado + aristas + ciclo.
 *
 * No persiste nada (preview no guarda StudyPlans): la única limpieza es el
 * usuario de prueba propio de la corrida.
 *
 * Env: STRICT_IA=1 vuelve FAIL la falta de respuesta en correlativas
 * (auditoría de disponibilidad IA; por defecto es informativa).
 */
const fs = require("fs");
const path = require("path");

const API = process.env.API_URL || "http://localhost:3000";
const REPO_ROOT = path.join(__dirname, "..", "..");
const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");
const PLANES_DIR = resolvePlanesDir(REPO_ROOT);
const INFORMES_DIR = path.join(__dirname, "informes");
const { setupTestUser } = require("./lib/testAuth");
const { reqPdf, reqPreviewRaw } = require("./lib/testAuth");

// Guard de corpus (plan maestro §1.5.3 C6/C7).
requireCorpus(PLANES_DIR, "salud");

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const RUN_TAG = `TEST-CTRL-${stamp()}`;

const CAREERS = [
  {
    career: "Licenciatura en Kinesiología y Fisiatría",
    plan: "Instituto de Salud Comunitaria/Licenciadoa en Kinesiología y Fisiatría/Licenciatura-en-Kinesiologia-y-Fisiatria.pdf",
    corr: "Instituto de Salud Comunitaria/Licenciadoa en Kinesiología y Fisiatría/Plan-de-correlatividades-Licenciatura-en-Kinesiologia-y-fisiatria-web-Unahur.pdf",
  },
  {
    career: "Licenciatura en Obstetricia",
    plan: "Instituto de Salud Comunitaria/Licenciadoa en Obstetricia/Licenciatura-en-Obstetricia.pdf",
    corr: "Instituto de Salud Comunitaria/Licenciadoa en Obstetricia/Plan-de-correlatividades-Licenciatura-en-Obstetricia-.pdf",
  },
  {
    career: "Licenciatura en Enfermería",
    plan: "Instituto de Salud Comunitaria/Licenciatura en Enfermería/RCS.-385-20-11-2024-EXP.-999-2024-Plan-de-Estudios-de-la-carrera-denominada-Licenciatura-en-Enfermeria-1-1_removed.pdf",
    corr: "Instituto de Salud Comunitaria/Licenciatura en Enfermería/RCS.-246-15-10-2025-EXP.-088-2025-Modificacion-al-plan-de-correlatividad-de-la-carrera-Licenciatura-en-Enfermeria.pdf",
  },
  {
    career: "Licenciatura en Nutrición",
    plan: "Instituto de Salud Comunitaria/Licenciatura en Nutrición/Licenciatura-en-Nutricion.pdf",
    corr: "Instituto de Salud Comunitaria/Licenciatura en Nutrición/Plan-de-correlatividades-Licenciatura-en-Nutricion-.pdf",
  },
];

let TEST = null;

async function previewPdf(rel, timeoutMs) {
  return reqPdf(
    TEST.token,
    "/plan-imports/preview",
    path.join(PLANES_DIR, ...rel.split("/")),
    { timeoutMs },
  );
}

async function main() {
  console.log(`== Control correlativas Salud ${RUN_TAG} ==`);
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(10000) });
    if (res.status !== 200) throw new Error("backend no responde");
  } catch (e) {
    console.error(`ERROR: ${e.message}. Levantá el backend primero (docker compose up desde la raíz).`);
    process.exitCode = 2;
    return;
  }

  TEST = await setupTestUser(RUN_TAG);
  console.log(`usuario de prueba: ${TEST.nick}`);

  const rows = [];
  let failed = false;
  for (const entry of CAREERS) {
    console.log(`[${entry.career}] ...`);
    // eslint-disable-next-line no-await-in-loop
    const p = await previewPdf(entry.plan, 180000);
    const subjects = p.body?.subjects || [];
    const detected = p.status === 200 ? (p.body.detectedCount ?? subjects.length) : 0;
    const withCorr = subjects.filter((s) => s.correlativasTexto).length;
    // eslint-disable-next-line no-await-in-loop
    const q = await previewPdf(entry.corr, 240000);
    const corrSubjects = q.body?.subjects?.length ?? 0;
    const strictIA = process.env.STRICT_IA === "1";
    const row = {
      career: entry.career,
      httpPlan: p.status, detected,
      aiPlan: p.body?.aiFallback === true,
      cobertura: detected ? `${withCorr}/${detected}` : "—",
      httpCorr: q.status, corrMaterias: corrSubjects,
      corrOrigen: q.body?.sourceKind ?? null,
    };
    rows.push(row);
    if (p.status !== 200 || !detected) {
      failed = true;
      console.log(`  FAIL plan: HTTP ${p.status} detectadas=${detected}`);
    } else if (q.status !== 200 && strictIA) {
      failed = true;
      console.log(`  plan=${detected} | FAIL corr (STRICT_IA): HTTP ${q.status}`);
    } else {
      console.log(`  plan=${detected} (IA: ${row.aiPlan}) correlativasTexto=${row.cobertura} | corr: HTTP ${q.status} materias=${corrSubjects} origen=${row.corrOrigen}`);
    }
  }

  // CONTROLES NEGATIVOS: blindaje de subida (sin archivo / archivo no-PDF).
  console.log("[CONTROL NEGATIVO: preview sin archivo] ...");
  const neg1 = await reqPreviewRaw(TEST.token, { json: {} });
  const neg1ok = neg1.status === 400;
  console.log(`  HTTP ${neg1.status} (esperado 400): ${neg1ok ? "OK" : "FAIL"}`);

  console.log("[CONTROL NEGATIVO: preview con buffer no-PDF] ...");
  const neg2 = await reqPreviewRaw(TEST.token, {
    buffer: Buffer.from("esto no es un pdf", "utf8"),
  });
  const neg2ok = neg2.status === 400;
  console.log(`  HTTP ${neg2.status} (esperado 400): ${neg2ok ? "OK" : "FAIL"}`);

  if (!neg1ok || !neg2ok) failed = true;

  const fname = `control-salud-${RUN_TAG}.md`;
  fs.mkdirSync(INFORMES_DIR, { recursive: true });
  const L = [
    `# Control de correlativas — Salud (${RUN_TAG}, nueva arquitectura: preview sin persistir)`,
    ``,
    `| Carrera | Plan HTTP | Materias | Cobertura correlativasTexto | Corr HTTP | Corr materias | Corr origen |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
  ];
  for (const r of rows) {
    L.push(`| ${r.career} | ${r.httpPlan} | ${r.detected}${r.aiPlan ? " (IA)" : ""} | ${r.cobertura} | ${r.httpCorr} | ${r.corrMaterias} | ${r.corrOrigen ?? "—"} |`);
  }
  L.push(``);
  L.push(`**Controles negativos:** sin archivo → HTTP ${neg1.status} (${neg1ok ? "OK" : "FAIL"}); buffer no-PDF → HTTP ${neg2.status} (${neg2ok ? "OK" : "FAIL"}).`);
  L.push(``);
  fs.writeFileSync(path.join(INFORMES_DIR, fname), L.join("\n"), "utf8");
  console.log(`Informe: backend/scripts/informes/${fname}`);

  await TEST.cleanup();
  console.log("[limpieza] usuario de prueba eliminado (preview no persiste planes)");
  if (failed) {
    console.error("salud: hay casos FAIL (ver arriba)");
    process.exitCode = 1;
  } else {
    console.log("salud: todo OK");
  }
}

process.on("SIGINT", async () => {
  console.log("\nlimpiando...");
  try { await TEST?.cleanup(); } catch { /* noop */ }
  process.exit(130);
});
main().catch(async (e) => {
  console.error(`ERROR: ${e.message}`);
  try { await TEST?.cleanup(); } catch { /* noop */ }
  process.exitCode = 2;
});
