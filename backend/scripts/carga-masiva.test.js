#!/usr/bin/env node
/*
 * Test masivo de carga de planes (E2E por API real, nueva arquitectura).
 * Uso: npm run test:planes
 *
 * Recorre docs/testing/planes-referencia.json de forma SECUENCIAL contra la
 * API por el mismo camino que la UI nueva: POST /plan-imports/preview con el
 * PDF (parseo + validación + caché). NO persiste StudyPlans: el guardado
 * (confirm) ya se ejercita en el smoke manual y borrar 29 planes con sus
 * materias por API es costo sin valor para medir el parser.
 *
 * Criterios por caso de plan: OK (en rango de referencia), OK-IA (rescate
 * por IA), WARN (observaciones), FAIL (fuera de rango o error), SKIP
 * (archivo ausente o caso derivado). Los PDFs de correlativas se reportan
 * como SKIP: se validan en npm run test:correlativas contra el endpoint
 * dedicado (POST /study-plans/:id/parse-correlativas).
 *
 * SEGURIDAD:
 *  - Usuario de prueba propio por corrida (test-masiva-<tag>), con login JWT;
 *    se borra al final. No crea carreras ni planes: nada que barrer.
 *  - Nunca se loguean API keys ni tokens.
 *
 * Env: API_URL (default http://localhost:3000), PLANES_DIR (default
 * files/UNAHUR-Oferta-Academica en la raíz del repo, o ../files histórico).
 */
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");
const PLANES_DIR = resolvePlanesDir(REPO_ROOT);
const INFORMES_DIR = path.join(__dirname, "informes");
const { API, setupTestUser, promoteToAdmin, reqPdf } = require("./lib/testAuth");

// Guard de corpus (plan maestro §1.5.3 C6/C7).
requireCorpus(PLANES_DIR, "carga-masiva");

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const RUN_TAG = `masiva-${stamp()}`;

let TEST = null; // { nick, token, cleanup }

// Atajo autenticado al preview (misma normalización que lib/testAuth).
const preview = (abs, timeoutMs) =>
  reqPdf(TEST.token, "/plan-imports/preview", abs, { timeoutMs });

function checkPersistedShape(subjects, entry, r) {
  r.total = subjects.length;
  r.sinAnio = subjects.filter((s) => s.year == null && s.kind === "Materia" && !s.optional).length;
  const names = subjects.map((s) => String(s.name || "").toLowerCase());
  const dups = names.length - new Set(names).size;
  if (r.sinAnio > 0) r.warns.push(`${r.sinAnio} materias sin año`);
  if (dups > 0) r.warns.push(`${dups} nombres duplicados`);
  if (entry.hasIntermediate && !subjects.some((s) => s.intermediate)) {
    r.warns.push("referencia espera título intermedio pero ninguna materia quedó marcada intermediate");
  }
}

async function runPlan(entry) {
  const abs = path.join(PLANES_DIR, ...entry.file.split("/"));
  const r = {
    file: entry.file, career: entry.career, tipo: entry.tipo,
    estado: "FAIL", mensaje: "", warns: [],
    httpParse: null, detectedCount: null, sourceKind: null,
    intermediateTitle: null,
    intermediateMarked: null, intermediateClassified: false,
    saved: null, total: null, sinAnio: null,
  };
  if (!fs.existsSync(abs)) {
    r.estado = "SKIP";
    r.mensaje = "archivo no encontrado en PLANES_DIR";
    return r;
  }

  // 1. preview (mismo camino que la UI: parseo + validación, sin guardar).
  let parsed = null;
  try {
    const { status, body } = await preview(abs, 300000);
    r.httpParse = status;
    if (status !== 200) {
      r.mensaje = `preview -> HTTP ${status}: ${body?.error?.message || body?.message || ""}`;
      return r;
    }
    parsed = body;
  } catch (e) {
    r.mensaje = `preview error: ${e.message}`;
    return r;
  }
  r.detectedCount = parsed.detectedCount ?? parsed.subjects?.length ?? 0;
  r.sourceKind = parsed.sourceKind;
  r.intermediateTitle = parsed.intermediateTitle || null;
  r.intermediateMarked = (parsed.subjects || []).filter((s) => s.intermediate).length;
  r.intermediateClassified = parsed.intermediateClassified === true;

  if (!parsed.subjects?.length) {
    r.mensaje = "detectedCount 0: el PDF no tiene texto extraíble (escaneado?) o formato no soportado";
    return r;
  }
  r.aiFallback = parsed.aiFallback === true;
  r.aiProvider = parsed.aiProvider || null;
  if (Array.isArray(entry.expectedSubjects)) {
    const [min, max] = entry.expectedSubjects;
    if (r.detectedCount < min || r.detectedCount > max) {
      r.mensaje = `fuera de rango referencia [${min}-${max}] para tipo ${entry.tipo}: detectadas ${r.detectedCount} (revisar rango o parser)`;
      return r;
    }
  } else {
    r.warns.push("sin rango de referencia: solo se reporta lo detectado");
  }

  // 2. controles de forma sobre lo parseado (sin persistir).
  checkPersistedShape(parsed.subjects, entry, r);

  r.estado = r.warns.length ? "WARN" : r.aiFallback ? "OK-IA" : "OK";
  const via = r.aiFallback ? ` (vía IA ${r.aiProvider || ""})` : "";
  r.mensaje = r.estado === "OK" || r.estado === "OK-IA"
    ? `preview OK: ${r.detectedCount} detectadas${via} (origen: ${r.sourceKind})`
    : "preview con observaciones" + via;
  return r;
}

function skipCorrelativas(entry) {
  return {
    file: entry.file, career: entry.career, tipo: "correlativas",
    estado: "SKIP",
    mensaje: "se valida en test:correlativas (endpoint parse-correlativas)",
    warns: [], httpParse: null, detectedCount: null, sourceKind: null,
    intermediateTitle: null, intermediateMarked: null, intermediateClassified: false,
    saved: null, total: null, sinAnio: null,
  };
}

async function main() {
  console.log(`== Test masivo de planes ${RUN_TAG} ==\nAPI=${API}\nPLANES_DIR=${PLANES_DIR}`);
  const ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8"));
  const entries = ref.planes;

  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(10000) });
    if (res.status !== 200) throw new Error(`backend no responde (HTTP ${res.status})`);
  } catch (e) {
    console.error(`ERROR: ${e.message}. Levantá el backend primero (docker compose up desde la raíz).`);
    process.exitCode = 2;
    return;
  }

  TEST = await setupTestUser(RUN_TAG);
  await promoteToAdmin(TEST.nick);
  console.log(`usuario de prueba: ${TEST.nick} (ADMIN)`);

  const results = [];

  for (const entry of entries) {
    if (entry.tipo === "correlativas") {
      const r = skipCorrelativas(entry);
      results.push(r);
      console.log(`[corr] ${entry.career} -> SKIP (test:correlativas)`);
      continue;
    }
    console.log(`[plan] ${entry.career} ...`);
    // eslint-disable-next-line no-await-in-loop
    const r = await runPlan(entry);
    results.push(r);
    console.log(`  -> ${r.estado}: ${r.mensaje}${r.warns.length ? ` | WARN: ${r.warns.join("; ")}` : ""}`);
  }

  // Informe
  const counts = { OK: 0, "OK-IA": 0, WARN: 0, FAIL: 0, SKIP: 0 };
  for (const r of results) counts[r.estado] = (counts[r.estado] || 0) + 1;
  const fname = `carga-planes-${RUN_TAG}.md`;
  fs.mkdirSync(INFORMES_DIR, { recursive: true });
  const lines = [
    `# Carga masiva de planes — ${RUN_TAG} (nueva arquitectura: preview sin persistir)`,
    ``,
    `API=${API} · PLANES_DIR=${PLANES_DIR} · referencia=docs/testing/planes-referencia.json`,
    ``,
    `Resumen: OK=${counts.OK} OK-IA=${counts["OK-IA"]} WARN=${counts.WARN} FAIL=${counts.FAIL} SKIP=${counts.SKIP} (total ${results.length})`,
    ``,
  ];
  const corrCount = results.filter((r) => r.tipo === "correlativas").length;
  if (corrCount) {
    lines.push(`Correlativas: ${corrCount} PDFs derivados a \`npm run test:correlativas\` (no se prueban con el preview genérico).`, ``);
  }
  lines.push(
    `| Archivo | Tipo | Detect. | Origen | Tec. (mat) | Estado | Detalle |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
  );
  for (const r of results) {
    const det = r.tipo === "correlativas" ? (r.total ?? "–") : (r.detectedCount ?? "–");
    const tec = r.tipo !== "correlativas" && r.intermediateTitle
      ? `${r.intermediateMarked}${r.intermediateClassified ? " IA" : ""}`
      : "–";
    const det2 = [r.mensaje, ...r.warns].filter(Boolean).join("<br>").replace(/\|/g, "\\|");
    lines.push(`| ${r.file.split("/").pop()} | ${r.tipo} | ${det} | ${r.sourceKind ?? "–"} | ${tec} | **${r.estado}** | ${det2} |`);
  }
  const withInt = results.filter((r) => r.tipo !== "correlativas" && r.intermediateTitle);
  if (withInt.length) {
    lines.push(``);
    lines.push(`Planes con título intermedio declarado: **${withInt.length}**, con materias marcadas: **${withInt.filter((r) => r.intermediateMarked > 0).length}**, clasificados por IA: **${withInt.filter((r) => r.intermediateClassified).length}**.`);
  }
  lines.push(``);
  fs.writeFileSync(path.join(INFORMES_DIR, fname), lines.join("\n"), "utf8");
  console.log(`\nResumen: OK=${counts.OK} OK-IA=${counts["OK-IA"]} WARN=${counts.WARN} FAIL=${counts.FAIL} SKIP=${counts.SKIP}`);
  if (withInt.length) {
    console.log(`Título intermedio: ${withInt.length} declarados, ${withInt.filter((r) => r.intermediateMarked > 0).length} con materias marcadas, ${withInt.filter((r) => r.intermediateClassified).length} por IA`);
  }
  console.log(`Informe: backend/scripts/informes/${fname}`);
  if (counts.FAIL) process.exitCode = 1;

  await TEST.cleanup();
  console.log("[limpieza] usuario de prueba eliminado (preview no persiste planes)");
}

process.on("SIGINT", async () => {
  console.log("\nSIGINT: limpiando...");
  try { await TEST?.cleanup(); } catch { /* noop */ }
  process.exit(130);
});
process.on("SIGTERM", async () => {
  console.log("\nSIGTERM: limpiando...");
  try { await TEST?.cleanup(); } catch { /* noop */ }
  process.exit(143);
});

main().catch(async (e) => {
  console.error(`ERROR fatal: ${e.message}`);
  try { await TEST?.cleanup(); } catch { /* noop */ }
  process.exitCode = 2;
});
