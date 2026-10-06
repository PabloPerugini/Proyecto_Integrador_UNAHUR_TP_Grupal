#!/usr/bin/env node
/*
 * Control de correlativas: Instituto de Salud Comunitaria.
 * Uso: npm run test:salud
 *
 * Para cada carrera: crea [TEST-CTRL-<ts>], carga plan oficial, carga su PDF
 * de correlativas (con fallback IA lectora si aplica), guarda lasrequires
 * determinísticas (flujo real del usuario, con blindaje de servidor) y lee el
 * grafo. Además un CONTROL NEGATIVO: una carrera con plan pero SIN
 * correlativas, para documentar qué valores da (requires [], grafo sin
 * aristas). Todo se borra al final.
 */
const fs = require("fs");
const path = require("path");

const API = process.env.API_URL || "http://localhost:3000";
const REPO_ROOT = path.join(__dirname, "..", "..");
const DEFAULT_PLANES = path.join(REPO_ROOT, "..", "files", "UNAHUR-Oferta-Academica");
const PLANES_DIR = process.env.PLANES_DIR || DEFAULT_PLANES;
const INFORMES_DIR = path.join(__dirname, "informes");
const { requireCorpus } = require("./lib/requireCorpus");

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

const createdIds = [];

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
      body = { _raw: text.slice(0, 200) };
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

const pdfForm = (rel) => {
  const buf = fs.readFileSync(path.join(PLANES_DIR, ...rel.split("/")));
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "application/pdf" }), rel.split("/").pop());
  return fd;
};

const toPayload = (s) => ({
  code: s.code, name: s.name, year: s.year ?? null, cuatrimestre: s.cuatrimestre ?? null,
  duration: s.duration, credits: s.credits, kind: s.kind, optional: s.optional,
  intermediate: s.intermediate,
});

async function loadPlan(entry, tag) {
  const c = await req("POST", "/careers", {
    json: { name: `[${tag}] ${entry.career}`, durationYears: 5 }, timeoutMs: 30000,
  });
  if (c.status !== 200 && c.status !== 201) throw new Error(`create ${c.status}`);
  if (c.body?.reused) throw new Error("SEGURIDAD: reused:true, abortado");
  const id = c.body._id;
  createdIds.push(id);
  const p = await req("POST", `/careers/${id}/parse-official`, {
    form: pdfForm(entry.plan), timeoutMs: 180000,
  });
  if (p.status !== 200 || !p.body.subjects?.length) throw new Error(`parse-official ${p.status}`);
  const payload = { subjects: p.body.subjects.map(toPayload) };
  if (p.body.intermediateTitle) payload.intermediateTitle = p.body.intermediateTitle;
  if (p.body.creditsFinal > 0) payload.creditsFinal = p.body.creditsFinal;
  if (p.body.creditsIntermediate > 0) payload.creditsIntermediate = p.body.creditsIntermediate;
  await req("POST", `/careers/${id}/subjects`, { json: payload, timeoutMs: 120000 });
  return { id, detected: p.body.detectedCount, aiPlan: p.body.aiFallback === true };
}

async function main() {
  console.log(`== Control correlativas Salud ${RUN_TAG} ==`);
  await req("GET", "/health", { timeoutMs: 10000 }).then(({ status }) => {
    if (status !== 200) throw new Error("backend no responde");
  });
  const rows = [];
  for (const entry of CAREERS) {
    console.log(`[${entry.career}] ...`);
    // eslint-disable-next-line no-await-in-loop
    const { id, detected, aiPlan } = await loadPlan(entry, RUN_TAG);
    // eslint-disable-next-line no-await-in-loop
    const q = await req("POST", `/careers/${id}/parse-correlativas`, {
      form: pdfForm(entry.corr), timeoutMs: 240000,
    });
    const b = q.body;
    let savedCorr = null;
    let dropped = null;
    if (q.status === 200) {
      const payload = (b.subjects || []).filter((s) => s.matched).map((s) => ({
        code: s.dbCode, name: s.dbName || s.name, requires: s.requires || [],
      }));
      if (payload.length) {
        // eslint-disable-next-line no-await-in-loop
        const s = await req("POST", `/careers/${id}/correlativas`, {
          json: { subjects: payload }, timeoutMs: 120000,
        });
        savedCorr = s.body?.saved ?? null;
        dropped = s.body?.dropped ?? null;
      } else {
        savedCorr = 0;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    const g = await req("GET", `/careers/${id}/graph`, { timeoutMs: 60000 });
    const gb = g.body || {};
    rows.push({
      career: entry.career, detected, aiPlan,
      httpCorr: q.status, matched: b?.matchedCount ?? null, total: b?.total ?? null,
      aiSug: b?.aiSuggested?.length ?? 0, aiRev: b?.aiReview?.length ?? 0,
      aiCov: b?.aiCoverage ? `${b.aiCoverage.extraidos}/${b.aiCoverage.total}` : null,
      savedCorr, dropped: dropped?.length ?? 0,
      nodes: gb.nodes?.length ?? null, edges: gb.edges?.length ?? null,
      hasCycle: gb.hasCycle ?? null, available: gb.availableNow?.length ?? null,
    });
    console.log(`  plan=${detected} corr=${b?.matchedCount}/${b?.total} guardadas=${savedCorr} aristas=${gb.edges?.length} ciclo=${gb.hasCycle}`);
  }

  // CONTROL NEGATIVO: plan sin correlativas
  console.log("[CONTROL NEGATIVO: Nutrición sin correlativas] ...");
  const neg = await loadPlan(
    { career: "CONTROL-NEGATIVO Nutrición sin correlativas", plan: CAREERS[3].plan },
    RUN_TAG,
  );
  const gn = await req("GET", `/careers/${neg.id}/graph`, { timeoutMs: 60000 });
  const gb = gn.body || {};
  const subs = await req("GET", `/careers/${neg.id}/subjects`, { timeoutMs: 60000 });
  const withReq = (subs.body || []).filter((s) => (s.requires || []).length).length;
  rows.push({
    career: "CONTROL NEGATIVO (sin correlativas)", detected: neg.detected, aiPlan: neg.aiPlan,
    httpCorr: null, matched: null, total: null, aiSug: null, aiRev: null, aiCov: null,
    savedCorr: null, dropped: null,
    nodes: gb.nodes?.length ?? null, edges: gb.edges?.length ?? null,
    hasCycle: gb.hasCycle ?? null, available: gb.availableNow?.length ?? null,
    subjectsWithRequires: withReq,
  });
  console.log(`  materias con requires: ${withReq}/${subs.body?.length} · aristas=${gb.edges?.length} · disponibles=${gb.availableNow?.length}`);

  const fname = `control-salud-${RUN_TAG}.md`;
  fs.mkdirSync(INFORMES_DIR, { recursive: true });
  const L = [
    `# Control de correlativas — Salud (${RUN_TAG})`,
    ``,
    `| Carrera | Materias | Corr matched | IA sug/rev/cob | Guardadas (descartadas) | Nodos | Aristas | Ciclo | Disponibles ya |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  ];
  for (const r of rows) {
    L.push(`| ${r.career} | ${r.detected}${r.aiPlan ? " (IA)" : ""} | ${r.matched ?? "—"}/${r.total ?? "—"} | ${r.aiSug ?? "—"}/${r.aiRev ?? "—"}/${r.aiCov ?? "—"} | ${r.savedCorr ?? "—"} (${r.dropped ?? "—"}) | ${r.nodes ?? "—"} | ${r.edges ?? "—"} | ${r.hasCycle ?? "—"} | ${r.available ?? "—"} |`);
  }
  L.push(``);
  const negRow = rows[rows.length - 1];
  L.push(`**Control negativo:** sin cargar correlativas, ${negRow.subjectsWithRequires} materias tienen requires, el grafo tiene ${negRow.edges} aristas y ${negRow.available} disponibles (las de 1er año / sin prerequisito).`);
  L.push(``);
  fs.writeFileSync(path.join(INFORMES_DIR, fname), L.join("\n"), "utf8");
  console.log(`Informe: backend/scripts/informes/${fname}`);

  for (const id of createdIds.splice(0)) {
    // eslint-disable-next-line no-await-in-loop
    await req("DELETE", `/careers/${id}`, { timeoutMs: 30000 }).catch(() => {});
  }
  console.log("[limpieza] carreras de control eliminadas");
}

process.on("SIGINT", async () => { console.log("\nlimpiando..."); process.exit(130); });
main().catch((e) => { console.error(`ERROR: ${e.message}`); process.exitCode = 2; });
