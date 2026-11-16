#!/usr/bin/env node
/*
 * Test E2E dedicado de correlatividades (flujo real de PlanAdmin).
 * Uso: npm run test:correlativas
 *
 * Para cada entrada tipo "correlativas" de docs/testing/planes-referencia.json:
 *  1. preview del PLAN PAR (pairCorrelativas) para obtener fileHash + materias;
 *  2. confirm para crear el plan (usuario ADMIN de la corrida);
 *  3. POST /study-plans/:id/parse-correlativas con el PDF de correlatividades;
 *  4. validaciones + DELETE del plan en finally.
 *
 * No usa el preview genérico para el PDF de correlatividades: ese camino es el
 * de planes y responde 422. El endpoint dedicado es el que usa la UI.
 *
 * Criterios: OK (todas las validaciones), WARN (matching < 90% o duplicado
 * de slug deduplicado), FAIL (error, total distinto del golden, planSubjects
 * distinto de lo guardado o ratio de matching < 60%), SKIP (archivo ausente).
 *
 * SEGURIDAD:
 *  - Usuario de prueba propio por corrida (test-corr-<tag>), borrado al final.
 *  - Los planes creados se borran por API; si el proceso se corta, SIGINT/
 *    SIGTERM intentan limpiar los IDs pendientes.
 *  - Nunca se loguean tokens ni API keys.
 *
 * Env: API_URL (default http://localhost:3000), PLANES_DIR (default
 * files/UNAHUR-Oferta-Academica en la raíz del repo).
 */
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const GOLDEN_DIR = path.join(REPO_ROOT, "docs", "testing", "golden");
const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");
const PLANES_DIR = resolvePlanesDir(REPO_ROOT);
const INFORMES_DIR = path.join(__dirname, "informes");
const { API, setupTestUser, promoteToAdmin, reqJson, reqPdf } = require("./lib/testAuth");
const { writeCorrelativasReport } = require("./lib/correlativasReport");
const { dedupeSubjects, goldenTotal } = require("./lib/correlativasFixtures");

requireCorpus(PLANES_DIR, "correlativas");

const MIN_MATCH_RATIO = 0.6;
const WARN_MATCH_RATIO = 0.9;

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const RUN_TAG = `corr-${stamp()}`;

let TEST = null;
const PLAN_IDS = new Set();

const norm = (value) => String(value || "").trim().toLowerCase();
const absFromRel = (rel) => path.join(PLANES_DIR, ...rel.split("/"));

function makeResult(entry, overrides = {}) {
  return {
    career: entry.career, file: entry.file, pair: entry.pairCorrelativas,
    estado: "FAIL", mensaje: "", warns: [],
    planSubjects: null, total: null, goldenTotal: null,
    matched: null, ratio: null, unmatched: [],
    ...overrides,
  };
}

async function loadCareers() {
  const { status, body } = await reqJson("GET", "/careers", { token: TEST.token });
  if (status !== 200 || !Array.isArray(body)) {
    throw new Error(`GET /careers -> HTTP ${status}`);
  }
  return new Map(body.map((career) => [norm(career.name), String(career._id)]));
}

async function deletePlan(id) {
  if (!id) return true;
  const { status } = await reqJson("DELETE", `/study-plans/${id}`, { token: TEST.token });
  return status === 200 || status === 404;
}

async function runEntry(entry, careerId) {
  const result = makeResult(entry);

  const pairAbs = absFromRel(entry.pairCorrelativas);
  const corrAbs = absFromRel(entry.file);
  if (!fs.existsSync(pairAbs) || !fs.existsSync(corrAbs)) {
    result.estado = "SKIP";
    result.mensaje = "archivo no encontrado en PLANES_DIR";
    return result;
  }

  let planId = null;
  try {
    // 1. Preview del plan par: mismas materias que importaría la UI.
    const preview = await reqPdf(TEST.token, "/plan-imports/preview", pairAbs, {
      timeoutMs: 300000,
    });
    if (preview.status !== 200) {
      result.mensaje = `preview plan par -> HTTP ${preview.status}: ${preview.body?.error?.message || preview.body?.message || ""}`;
      return result;
    }
    const subjects = preview.body?.subjects || [];
    const fileHash = preview.body?.fileHash;
    if (!subjects.length || !fileHash) {
      result.mensaje = "preview del plan par sin materias o sin fileHash";
      return result;
    }
    const deduped = dedupeSubjects(subjects);
    const planSubjects = deduped.subjects;
    if (deduped.duplicates.length) {
      result.warns.push(`preview con ${deduped.duplicates.length} duplicado(s) de slug; se conserva la variante más completa: ${deduped.duplicates.slice(0, 2).join(" | ")}`);
    }
    result.planSubjects = planSubjects.length;

    // 2. Confirmar importación: crea el StudyPlan y sus PlanSubject.
    const confirm = await reqJson("POST", "/plan-imports/confirm", {
      token: TEST.token,
      json: {
        fileHash,
        careerId,
        name: `[E2E correlativas] ${entry.career} ${RUN_TAG}`,
        fileName: path.basename(pairAbs),
        subjects: planSubjects,
        official: false,
        durationYears: 0,
      },
      timeoutMs: 120000,
    });
    planId = confirm.body?.studyPlanId ? String(confirm.body.studyPlanId) : null;
    if (confirm.status !== 201 || !planId) {
      result.mensaje = `confirm -> HTTP ${confirm.status}: ${confirm.body?.message || ""}`;
      return result;
    }
    PLAN_IDS.add(planId);

    const saved = Number(confirm.body.saved ?? 0);

    // 3. Endpoint real de correlatividades (el que usa PlanAdmin).
    const parsed = await reqPdf(
      TEST.token,
      `/study-plans/${planId}/parse-correlativas`,
      corrAbs,
      { timeoutMs: 300000 },
    );
    if (parsed.status !== 200) {
      result.mensaje = `parse-correlativas -> HTTP ${parsed.status}: ${parsed.body?.error?.message || parsed.body?.message || ""}`;
      return result;
    }

    const body = parsed.body || {};
    result.total = Number(body.total ?? 0);
    result.matched = Number(body.matchedCount ?? 0);
    result.goldenTotal = goldenTotal(GOLDEN_DIR, entry.file);
    result.unmatched = Array.isArray(body.unmatched) ? body.unmatched : [];
    result.ratio = result.total ? result.matched / result.total : 0;

    const problems = [];
    if (body.sourceKind !== "correlativas") {
      problems.push(`sourceKind=${body.sourceKind ?? "?"}`);
    }
    if (result.goldenTotal === null) {
      problems.push(`sin golden para ${path.basename(entry.file)}`);
    } else if (result.total !== result.goldenTotal) {
      problems.push(`total=${result.total} vs golden=${result.goldenTotal}`);
    }
    if (!Array.isArray(body.rows) || body.rows.length !== result.total) {
      problems.push(`rows=${body.rows?.length ?? "?"} vs total=${result.total}`);
    }
    if (saved !== planSubjects.length) {
      problems.push(`confirm guardó ${saved}/${planSubjects.length}`);
    }
    if (body.planSubjects !== saved) {
      problems.push(`planSubjects=${body.planSubjects} vs saved=${saved}`);
    }
    if (!(result.matched > 0)) {
      problems.push(`matchedCount=${result.matched}`);
    }
    if (result.matched + result.unmatched.length !== result.total) {
      problems.push(`matched+unmatched=${result.matched + result.unmatched.length} vs total=${result.total}`);
    }
    if (result.ratio < MIN_MATCH_RATIO) {
      problems.push(`matching ${(result.ratio * 100).toFixed(1)}% < ${(MIN_MATCH_RATIO * 100).toFixed(0)}%`);
    }
    if (problems.length) {
      result.mensaje = problems.join("; ");
      return result;
    }

    result.estado = result.warns.length || result.ratio < WARN_MATCH_RATIO ? "WARN" : "OK";
    result.mensaje = `${result.matched}/${result.total} matcheadas (${(result.ratio * 100).toFixed(1)}%)`;
    if (result.unmatched.length) {
      const sample = result.unmatched.slice(0, 3).join(" | ");
      const extra = result.unmatched.length > 3 ? ` (+${result.unmatched.length - 3})` : "";
      result.warns.push(`sin match: ${sample}${extra}`);
    }
    return result;
  } catch (error) {
    result.mensaje = error.message;
    return result;
  } finally {
    const cleaned = await deletePlan(planId).catch(() => false);
    if (cleaned) {
      PLAN_IDS.delete(planId);
    } else {
      result.estado = "FAIL";
      result.mensaje = `${result.mensaje ? `${result.mensaje}; ` : ""}no se pudo borrar el plan ${planId}`;
    }
  }
}

async function cleanup() {
  for (const id of [...PLAN_IDS]) {
    try {
      // eslint-disable-next-line no-await-in-loop
      if (await deletePlan(id)) PLAN_IDS.delete(id);
    } catch { /* best-effort */ }
  }
  try { await TEST?.cleanup(); } catch { /* best-effort */ }
}

async function main() {
  console.log(`== Correlatividades E2E ${RUN_TAG} ==\nAPI=${API}\nPLANES_DIR=${PLANES_DIR}`);

  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(10000) });
    if (res.status !== 200) throw new Error(`backend no responde (HTTP ${res.status})`);
  } catch (error) {
    console.error(`ERROR: ${error.message}. Levantá el backend primero (docker compose up desde la raíz).`);
    process.exitCode = 2;
    return;
  }

  const ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8"));
  const entries = ref.planes.filter((entry) => entry.tipo === "correlativas");
  if (!entries.length) {
    console.error("ERROR: no hay entradas tipo 'correlativas' en la referencia.");
    process.exitCode = 2;
    return;
  }

  TEST = await setupTestUser(RUN_TAG);
  await promoteToAdmin(TEST.nick);
  console.log(`usuario de prueba: ${TEST.nick} (ADMIN)`);

  const careers = await loadCareers();
  const results = [];

  for (const entry of entries) {
    console.log(`[corr] ${entry.career} ...`);
    const careerId = careers.get(norm(entry.career));
    // eslint-disable-next-line no-await-in-loop
    const result = careerId
      ? await runEntry(entry, careerId)
      : makeResult(entry, { mensaje: `carrera no encontrada: ${entry.career}` });
    results.push(result);
    console.log(`  -> ${result.estado}: ${result.mensaje}${result.warns.length ? ` | ${result.estado === "OK" ? "INFO" : "WARN"}: ${result.warns.join("; ")}` : ""}`);
  }

  const { fname, counts } = writeCorrelativasReport(results, {
    runTag: RUN_TAG,
    api: API,
    planesDir: PLANES_DIR,
    informesDir: INFORMES_DIR,
  });

  console.log(`\nResumen: OK=${counts.OK} WARN=${counts.WARN} FAIL=${counts.FAIL} SKIP=${counts.SKIP}`);
  console.log(`Informe: backend/scripts/informes/${fname}`);

  await cleanup();
  console.log("[limpieza] planes y usuario de prueba eliminados");

  if (counts.FAIL) process.exitCode = 1;
  else console.log("correlativas: todo OK");
}

process.on("SIGINT", async () => {
  console.log("\nSIGINT: limpiando...");
  await cleanup();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  console.log("\nSIGTERM: limpiando...");
  await cleanup();
  process.exit(143);
});

main().catch(async (error) => {
  console.error(`ERROR fatal: ${error.message}`);
  await cleanup();
  process.exitCode = 2;
});
