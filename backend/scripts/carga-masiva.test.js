#!/usr/bin/env node
/*
 * Test masivo de carga de planes (E2E por API real).
 * Uso: npm run test:planes
 *
 * Recorre docs/testing/planes-referencia.json de forma SECUENCIAL contra la
 * API (mismo camino que la UI: crear carrera -> parse-official ->
 * saveSubjects -> GET subjects; y parse-correlativas contra el plan par).
 * Criterios OK/WARN/FAIL/OK-IA/SKIP según docs/testing + plan del proyecto.
 *
 * SEGURIDAD (acuerdo del consejero crítico, obligatorio):
 *  - Carreras con prefijo único por corrida: [TEST-AAAAMMDD-HHMMSS].
 *  - Si createCareer responde reused:true se ABORTA ese caso (no se toca ni
 *    se borra: podría ser una carrera real).
 *  - DELETE solo por _id capturado al crear. Barrido inicial solo de
 *    nombres que empiezan con "[TEST".
 *  - Nunca se loguean API keys.
 *
 * Env: API_URL (default http://localhost:3000), PLANES_DIR (default
 * ../files/UNAHUR-Oferta-Academica respecto a la raíz del repo).
 */
const fs = require("fs");
const path = require("path");

const API = process.env.API_URL || "http://localhost:3000";
const REPO_ROOT = path.join(__dirname, "..", "..");
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const DEFAULT_PLANES = path.join(REPO_ROOT, "..", "files", "UNAHUR-Oferta-Academica");
const PLANES_DIR = process.env.PLANES_DIR || DEFAULT_PLANES;
const INFORMES_DIR = path.join(__dirname, "informes");
const { requireCorpus } = require("./lib/requireCorpus");

// Guard de corpus (plan maestro §1.5.3 C6/C7).
requireCorpus(PLANES_DIR, "carga-masiva");

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const RUN_TAG = `TEST-${stamp()}`;
const TEST_PREFIX = "[TEST";

const createdIds = [];
let sweeping = false;

async function req(method, urlPath, { json, form, timeoutMs = 60000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = { method, signal: controller.signal, headers: {} };
    if (json !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(json);
    }
    if (form) init.body = form;
    const res = await fetch(`${API}${urlPath}`, init);
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { _raw: text.slice(0, 300) };
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

const pdfForm = (absPath) => {
  const buf = fs.readFileSync(absPath);
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "application/pdf" }), path.basename(absPath));
  return fd;
};

// Payload idéntico al que arma el front (toSubjectPayload).
const toSubjectPayload = (s) => ({
  code: s.code,
  name: s.name,
  year: s.year ?? null,
  cuatrimestre: s.cuatrimestre ?? null,
  duration: s.duration,
  credits: s.credits,
  kind: s.kind,
  optional: s.optional,
  intermediate: s.intermediate,
});

async function deleteCareer(id) {
  try {
    await req("DELETE", `/careers/${id}`, { timeoutMs: 30000 });
  } catch {
    /* best-effort */
  }
}

async function sweepTestCareers(reason) {
  if (sweeping) return 0;
  sweeping = true;
  try {
    const { status, body } = await req("GET", "/careers", { timeoutMs: 30000 });
    if (status !== 200 || !Array.isArray(body)) return 0;
    const orphans = body.filter((c) => String(c.name || "").startsWith(TEST_PREFIX));
    for (const o of orphans) {
      // eslint-disable-next-line no-await-in-loop
      await deleteCareer(o._id);
    }
    if (orphans.length) console.log(`[limpieza ${reason}] eliminadas ${orphans.length} carreras ${TEST_PREFIX} huérfanas`);
    return orphans.length;
  } finally {
    sweeping = false;
  }
}

async function cleanupOwn() {
  for (const id of createdIds.splice(0)) {
    // eslint-disable-next-line no-await-in-loop
    await deleteCareer(id);
  }
  console.log(`[limpieza] carreras propias de ${RUN_TAG} eliminadas`);
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
    r.mensaje = "archivo no encontrado en PLANES_DIR";
    return r;
  }

  // 1. crear
  let careerId = null;
  try {
    const { status, body } = await req("POST", "/careers", {
      json: { name: `[${RUN_TAG}] ${entry.career}`, institute: "", durationYears: 5 },
      timeoutMs: 30000,
    });
    if (status !== 200 && status !== 201) {
      r.mensaje = `POST /careers -> HTTP ${status}: ${body?.message || ""}`;
      return r;
    }
    if (body?.reused === true) {
      r.mensaje = "SEGURIDAD: el backend reutilizó una carrera existente (reused:true); caso abortado sin tocar ni borrar nada";
      return r;
    }
    careerId = body._id;
    createdIds.push(careerId);
  } catch (e) {
    r.mensaje = `POST /careers error: ${e.message}`;
    return r;
  }

  // 2. parse-official
  let parsed = null;
  try {
    const { status, body } = await req("POST", `/careers/${careerId}/parse-official`, {
      form: pdfForm(abs), timeoutMs: 180000,
    });
    r.httpParse = status;
    if (status !== 200) {
      r.mensaje = `parse-official -> HTTP ${status}: ${body?.message || ""}`;
      return r;
    }
    parsed = body;
  } catch (e) {
    r.mensaje = `parse-official error: ${e.message}`;
    return r;
  }
  r.detectedCount = parsed.detectedCount;
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
  // Rango de referencia Lic vs Tec (el fallback IA futuro usa este mismo disparo).
  if (Array.isArray(entry.expectedSubjects)) {
    const [min, max] = entry.expectedSubjects;
    if (parsed.detectedCount < min || parsed.detectedCount > max) {
      r.mensaje = `fuera de rango referencia [${min}-${max}] para tipo ${entry.tipo}: detectadas ${parsed.detectedCount} (revisar rango o parser)`;
      return r;
    }
  } else {
    r.warns.push("sin rango de referencia: solo se reporta lo detectado");
  }

  // 3. saveSubjects
  try {
    const payload = {
      subjects: parsed.subjects.map(toSubjectPayload),
      ...(parsed.intermediateTitle ? { intermediateTitle: parsed.intermediateTitle } : {}),
      ...(parsed.creditsFinal > 0 ? { creditsFinal: parsed.creditsFinal } : {}),
      ...(parsed.creditsIntermediate > 0 ? { creditsIntermediate: parsed.creditsIntermediate } : {}),
    };
    const { status, body } = await req("POST", `/careers/${careerId}/subjects`, { json: payload, timeoutMs: 120000 });
    if (status !== 200) {
      r.mensaje = `saveSubjects -> HTTP ${status}: ${body?.message || ""}`;
      return r;
    }
    r.saved = body.saved;
    if (!body.saved) {
      r.mensaje = "parseó pero saved=0: no se persistió nada";
      return r;
    }
  } catch (e) {
    r.mensaje = `saveSubjects error: ${e.message}`;
    return r;
  }

  // 4. verificación persistida
  try {
    const { status, body } = await req("GET", `/careers/${careerId}/subjects`, { timeoutMs: 60000 });
    if (status !== 200 || !Array.isArray(body)) {
      r.mensaje = `GET subjects -> HTTP ${status}`;
      return r;
    }
    r.total = body.length;
    r.sumCredits = body.reduce((a, s) => a + (s.credits || 0), 0);
    r.sinAnio = body.filter((s) => s.year == null && s.kind === "Materia" && !s.optional).length;
    const names = body.map((s) => String(s.name || "").toLowerCase());
    const dups = names.length - new Set(names).size;
    if (r.total !== r.detectedCount) r.warns.push(`total persistido (${r.total}) != detectadas (${r.detectedCount})`);
    if (r.sumCredits === 0) r.warns.push("créditos totales 0");
    if (r.sinAnio > 0) r.warns.push(`${r.sinAnio} materias sin año`);
    if (dups > 0) r.warns.push(`${dups} nombres duplicados`);
    if (entry.hasIntermediate && !body.some((s) => s.intermediate)) r.warns.push("referencia espera título intermedio pero ninguna materia quedó marcada intermediate");
  } catch (e) {
    r.warns.push(`no se pudo verificar persistencia: ${e.message}`);
  }

  r.estado = r.warns.length ? "WARN" : r.aiFallback ? "OK-IA" : "OK";
  const via = r.aiFallback ? ` (vía IA ${r.aiProvider || ""})` : "";
  r.mensaje = r.estado === "OK" || r.estado === "OK-IA"
    ? `pipeline completo: ${r.detectedCount} detectadas, ${r.total} persistidas${via}`
    : "pipeline completo con observaciones" + via;
  return r;
}

async function runCorrelativas(entry, careerByPlan) {
  const abs = path.join(PLANES_DIR, ...entry.file.split("/"));
  const r = {
    file: entry.file, career: entry.career, tipo: "correlativas",
    estado: "FAIL", mensaje: "", warns: [],
    httpParse: null, total: null, matchedCount: null, savedCorr: null,
  };
  if (!fs.existsSync(abs)) {
    r.mensaje = "archivo no encontrado en PLANES_DIR";
    return r;
  }
  const careerId = careerByPlan.get(entry.pairCorrelativas);
  if (!careerId) {
    r.estado = "SKIP";
    r.mensaje = "sin plan par cargado en esta corrida (el plan falló o no existe); no se puede probar el matching";
    return r;
  }
  let parsed = null;
  try {
    const { status, body } = await req("POST", `/careers/${careerId}/parse-correlativas`, {
      form: pdfForm(abs), timeoutMs: 180000,
    });
    r.httpParse = status;
    if (status !== 200) {
      r.mensaje = `parse-correlativas -> HTTP ${status}: ${body?.message || ""}`;
      return r;
    }
    parsed = body;
  } catch (e) {
    r.mensaje = `parse-correlativas error: ${e.message}`;
    return r;
  }
  r.total = parsed.total;
  r.matchedCount = parsed.matchedCount;
  r.aiSuggestedCount = parsed.aiSuggested?.length ?? 0;
  r.aiReviewCount = parsed.aiReview?.length ?? 0;
  r.aiCoverage = parsed.aiCoverage || null;
  r.aiProvider = parsed.aiProvider || null;
  const ratio = parsed.total ? parsed.matchedCount / parsed.total : 0;
  if (ratio < 0.7) r.warns.push(`matching bajo: ${parsed.matchedCount}/${parsed.total} (<70%)`);
  const unresolved = (parsed.unresolved || []).slice(0, 5).map((u) => u.name);
  if (unresolved.length) r.warns.push(`no matcheadas (muestra): ${unresolved.join(" | ")}`);

  try {
    const payload = (parsed.subjects || []).filter((s) => s.matched).map((s) => ({
      code: s.dbCode, name: s.dbName || s.name, requires: s.requires || [],
    }));
    const { status, body } = await req("POST", `/careers/${careerId}/correlativas`, {
      json: { subjects: payload }, timeoutMs: 120000,
    });
    if (status !== 200) {
      r.warns.push(`saveCorrelativas -> HTTP ${status}`);
    } else {
      r.savedCorr = body.saved;
    }
  } catch (e) {
    r.warns.push(`saveCorrelativas error: ${e.message}`);
  }
  r.estado = r.warns.length ? "WARN" : "OK";
  // Las sugerencias de IA se miden pero NO se guardan: requieren revisión
  // humana en Editar plan (botón "Aplicar sugerencias de IA").
  const aiMsg = parsed.aiFallback
    ? ` IA: ${r.aiSuggestedCount} exactas + ${r.aiReviewCount} a revisión vía ${r.aiProvider || "IA"} (cobertura ${r.aiCoverage ? `${r.aiCoverage.extraidos}/${r.aiCoverage.total}` : "?"}; no guardadas).`
    : "";
  r.mensaje = `correlativas: ${r.matchedCount}/${r.total} matcheadas.${aiMsg}`;
  return r;
}

async function main() {
  console.log(`== Test masivo de planes ${RUN_TAG} ==\nAPI=${API}\nPLANES_DIR=${PLANES_DIR}`);
  const ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8"));
  const entries = ref.planes;

  try {
    await req("GET", "/health", { timeoutMs: 10000 }).then(({ status }) => {
      if (status !== 200) throw new Error(`backend no responde (HTTP ${status})`);
    });
  } catch (e) {
    console.error(`ERROR: ${e.message}. Levantá el backend primero (npm start en backend/).`);
    process.exitCode = 2;
    return;
  }
  await sweepTestCareers("inicial");

  const results = [];
  const careerByPlan = new Map(); // file plan -> careerId (solo planes OK/WARN)
  const planEntries = entries.filter((e) => e.tipo !== "correlativas");
  const corrEntries = entries.filter((e) => e.tipo === "correlativas");

  for (const entry of planEntries) {
    console.log(`[plan] ${entry.career} ...`);
    // eslint-disable-next-line no-await-in-loop
    const r = await runPlan(entry);
    results.push(r);
    console.log(`  -> ${r.estado}: ${r.mensaje}${r.warns.length ? ` | WARN: ${r.warns.join("; ")}` : ""}`);
    const lastId = createdIds[createdIds.length - 1];
    if (lastId && (r.estado === "OK" || r.estado === "WARN" || r.estado === "OK-IA")) careerByPlan.set(entry.file, lastId);
    if (r.estado === "FAIL" && /SEGURIDAD/.test(r.mensaje)) {
      // No seguimos borrando nada de este caso; el id ni siquiera es nuestro.
      createdIds.pop();
    }
  }
  for (const entry of corrEntries) {
    console.log(`[corr] ${entry.career} ...`);
    // eslint-disable-next-line no-await-in-loop
    const r = await runCorrelativas(entry, careerByPlan);
    results.push(r);
    console.log(`  -> ${r.estado}: ${r.mensaje}${r.warns.length ? ` | WARN: ${r.warns.join("; ")}` : ""}`);
  }

  // Informe
  const counts = { OK: 0, "OK-IA": 0, WARN: 0, FAIL: 0, SKIP: 0 };
  for (const r of results) counts[r.estado] = (counts[r.estado] || 0) + 1;
  const fname = `carga-planes-${RUN_TAG}.md`;
  fs.mkdirSync(INFORMES_DIR, { recursive: true });
  const lines = [
    `# Carga masiva de planes — ${RUN_TAG}`,
    ``,
    `API=${API} · PLANES_DIR=${PLANES_DIR} · referencia=docs/testing/planes-referencia.json`,
    ``,
    `Resumen: OK=${counts.OK} OK-IA=${counts["OK-IA"]} WARN=${counts.WARN} FAIL=${counts.FAIL} SKIP=${counts.SKIP} (total ${results.length})`,
    ``,
    `| Archivo | Tipo | Detect. | Guard. | Créd. | Estado | Detalle |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
  ];
  for (const r of results) {
    const det = r.tipo === "correlativas" ? `${r.matchedCount ?? "–"}/${r.total ?? "–"}` : (r.detectedCount ?? "–");
    const guard = r.tipo === "correlativas" ? (r.savedCorr ?? "–") : (r.total ?? "–");
    const cred = r.sumCredits ?? r.creditsFinal ?? "–";
    const det2 = [r.mensaje, ...r.warns].filter(Boolean).join("<br>").replace(/\|/g, "\\|");
    lines.push(`| ${r.file.split("/").pop()} | ${r.tipo} | ${det} | ${guard} | ${cred} | **${r.estado}** | ${det2} |`);
  }
  lines.push(``);
  fs.writeFileSync(path.join(INFORMES_DIR, fname), lines.join("\n"), "utf8");
  console.log(`\nResumen: OK=${counts.OK} OK-IA=${counts["OK-IA"]} WARN=${counts.WARN} FAIL=${counts.FAIL} SKIP=${counts.SKIP}`);
  console.log(`Informe: backend/scripts/informes/${fname}`);
  if (counts.FAIL) process.exitCode = 1;

  await cleanupOwn();
}

process.on("SIGINT", async () => { console.log("\nSIGINT: limpiando..."); await cleanupOwn(); process.exit(130); });
process.on("SIGTERM", async () => { console.log("\nSIGTERM: limpiando..."); await cleanupOwn(); process.exit(143); });

main().catch(async (e) => {
  console.error(`ERROR fatal: ${e.message}`);
  try { await cleanupOwn(); } catch { /* noop */ }
  process.exitCode = 2;
});
