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
 * (archivo ausente). Los casos de correlativas miden que el preview responda
 * 200 con materias (el matching texto->prerrequisitos aún no tiene endpoint
 * en la API nueva: se reporta, no se exige).
 *
 * SEGURIDAD:
 *  - Usuario de prueba propio por corrida (test-masiva-<tag>), con login JWT;
 *    se borra al final. No crea carreras ni planes: nada que barrer.
 *  - Nunca se loguean API keys ni tokens.
 *
 * Env: API_URL (default http://localhost:3000), PLANES_DIR (default
 * files/UNAHUR-Oferta-Academica en la raíz del repo, o ../files histórico),
 * STRICT_IA=1 (auditoría: la falta de respuesta IA en correlativas es FAIL).
 */
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");
const PLANES_DIR = resolvePlanesDir(REPO_ROOT);
const INFORMES_DIR = path.join(__dirname, "informes");
const { API, setupTestUser, reqPdf } = require("./lib/testAuth");

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
  r.sumCredits = subjects.reduce((a, s) => a + (s.credits || 0), 0);
  r.sinAnio = subjects.filter((s) => s.year == null && s.kind === "Materia" && !s.optional).length;
  const names = subjects.map((s) => String(s.name || "").toLowerCase());
  const dups = names.length - new Set(names).size;
  if (r.sumCredits === 0) r.warns.push("créditos totales 0");
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
    creditsFinal: null, creditsIntermediate: null, intermediateTitle: null,
    saved: null, total: null, sumCredits: null, sinAnio: null,
  };
  if (!fs.existsSync(abs)) {
    r.estado = "SKIP";
    r.mensaje = "archivo no encontrado en PLANES_DIR";
    return r;
  }

  // 1. preview (mismo camino que la UI: parseo + validación, sin guardar).
  let parsed = null;
  try {
    const { status, body } = await preview(abs, 180000);
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
  r.creditsFinal = parsed.creditsFinal;
  r.creditsIntermediate = parsed.creditsIntermediate;
  r.intermediateTitle = parsed.intermediateTitle || null;

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

async function runCorrelativas(entry) {
  const abs = path.join(PLANES_DIR, ...entry.file.split("/"));
  const r = {
    file: entry.file, career: entry.career, tipo: "correlativas",
    estado: "FAIL", mensaje: "", warns: [],
    httpParse: null, total: null, sourceKind: null,
  };
  if (!fs.existsSync(abs)) {
    r.estado = "SKIP";
    r.mensaje = "archivo no encontrado en PLANES_DIR";
    return r;
  }
  let parsed = null;
  try {
    const { status, body } = await preview(abs, 240000);
    r.httpParse = status;
    if (status !== 200) {
      // El formato correlativas suele requerir IA (cuotas externas): WARN, no FAIL,
      // salvo auditoría explícita de disponibilidad IA (STRICT_IA=1).
      r.mensaje = `preview -> HTTP ${status}: ${body?.error?.message || body?.message || ""} (formato correlativas fuera del parser determinístico; ver cobertura IA)`;
      if (process.env.STRICT_IA === "1") {
        r.estado = "FAIL";
        return r;
      }
      r.estado = "WARN";
      return r;
    }
    parsed = body;
  } catch (e) {
    r.mensaje = `preview error: ${e.message}`;
    return r;
  }
  const subjects = parsed.subjects || [];
  r.total = parsed.detectedCount ?? subjects.length;
  r.sourceKind = parsed.sourceKind;
  r.aiFallback = parsed.aiFallback === true;
  r.aiProvider = parsed.aiProvider || null;
  const withCorr = subjects.filter((s) => s.correlativasTexto).length;
  r.mensaje = `correlativas: preview 200, ${r.total} materias (origen: ${r.sourceKind}), ${withCorr} con correlativasTexto. El matching a prerequisites aún no tiene endpoint en la API nueva.`;
  if (r.aiFallback) r.warns.push(`rescate por IA (${r.aiProvider || "?"})`);
  if (withCorr === 0) r.warns.push("ninguna materia trae correlativasTexto");
  r.estado = r.warns.length ? "WARN" : "OK";
  return r;
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
  console.log(`usuario de prueba: ${TEST.nick}`);

  const results = [];
  const planEntries = entries.filter((e) => e.tipo !== "correlativas");
  const corrEntries = entries.filter((e) => e.tipo === "correlativas");

  for (const entry of planEntries) {
    console.log(`[plan] ${entry.career} ...`);
    // eslint-disable-next-line no-await-in-loop
    const r = await runPlan(entry);
    results.push(r);
    console.log(`  -> ${r.estado}: ${r.mensaje}${r.warns.length ? ` | WARN: ${r.warns.join("; ")}` : ""}`);
  }
  for (const entry of corrEntries) {
    console.log(`[corr] ${entry.career} ...`);
    // eslint-disable-next-line no-await-in-loop
    const r = await runCorrelativas(entry);
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
    `| Archivo | Tipo | Detect. | Origen | Créd. | Estado | Detalle |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
  ];
  for (const r of results) {
    const det = r.tipo === "correlativas" ? (r.total ?? "–") : (r.detectedCount ?? "–");
    const cred = r.sumCredits ?? r.creditsFinal ?? "–";
    const det2 = [r.mensaje, ...r.warns].filter(Boolean).join("<br>").replace(/\|/g, "\\|");
    lines.push(`| ${r.file.split("/").pop()} | ${r.tipo} | ${det} | ${r.sourceKind ?? "–"} | ${cred} | **${r.estado}** | ${det2} |`);
  }
  lines.push(``);
  fs.writeFileSync(path.join(INFORMES_DIR, fname), lines.join("\n"), "utf8");
  console.log(`\nResumen: OK=${counts.OK} OK-IA=${counts["OK-IA"]} WARN=${counts.WARN} FAIL=${counts.FAIL} SKIP=${counts.SKIP}`);
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
