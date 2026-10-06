#!/usr/bin/env node
/*
 * Carga correlativas a carreras REALES (uso explícito, no masivo).
 * Uso: node scripts/cargar-correlativas-reales.js
 *
 * REGLA DE ORO: solo AGREGA requires donde no hay. Lo existente se conserva
 * siempre. Antes de tocar nada guarda backup en backend/scripts/informes/.
 * Si algo sale mal, el backup permite restaurar a mano.
 */
const fs = require("fs");
const path = require("path");

const API = process.env.API_URL || "http://localhost:3000";
const PLANES_DIR = process.env.PLANES_DIR || path.join(
  __dirname, "..", "..", "..", "files", "UNAHUR-Oferta-Academica",
);
const INFORMES_DIR = path.join(__dirname, "informes");
const { requireCorpus } = require("./lib/requireCorpus");

// Guard de corpus (plan maestro §1.5.3 C6/C7).
requireCorpus(PLANES_DIR, "corr-reales");

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const JOBS = [
  {
    careerName: "Licenciatura En Obstetricia",
    corr: "Instituto de Salud Comunitaria/Licenciadoa en Obstetricia/Plan-de-correlatividades-Licenciatura-en-Obstetricia-.pdf",
  },
  {
    careerName: "Licenciatura En Nutricion",
    corr: "Instituto de Salud Comunitaria/Licenciatura en Nutrición/Plan-de-correlatividades-Licenciatura-en-Nutricion-.pdf",
  },
  {
    careerName: "Licenciatura en Gestion del Mantenimiento",
    corr: "Instituto de Tecnología e Ingeniería/Licenciatura en Gestión del mantenimiento/RCS-029_25-Plan-de-correlatividades-Licenciatura-en-Mantenimiento-con-titulo-intermedio.pdf",
  },
];

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

async function main() {
  const tag = stamp();
  console.log(`== Correlativas reales ${tag} (solo agregar) ==`);
  await req("GET", "/health", { timeoutMs: 10000 }).then(({ status }) => {
    if (status !== 200) throw new Error("backend no responde");
  });
  const all = await req("GET", "/careers", { timeoutMs: 30000 });
  const byName = new Map((all.body || []).map((c) => [c.name, c]));
  const backup = {};
  const report = [];
  for (const job of JOBS) {
    const career = byName.get(job.careerName);
    if (!career) {
      console.log(`NO EXISTE (no se toca): ${job.careerName}`);
      report.push({ career: job.careerName, estado: "no-encontrada" });
      continue;
    }
    console.log(`[${job.careerName}] ...`);
    const subs = await req("GET", `/careers/${career._id}/subjects`, { timeoutMs: 60000 });
    const db = subs.body || [];
    backup[career._id] = {
      career: career.name,
      requires: db.map((s) => ({ code: s.code, name: s.name, requires: s.requires || [] })),
    };
    const existing = new Map(db.map((s) => [s.code, s.requires || []]));
    const buf = fs.readFileSync(path.join(PLANES_DIR, ...job.corr.split("/")));
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: "application/pdf" }), job.corr.split("/").pop());
    // eslint-disable-next-line no-await-in-loop
    const q = await req("POST", `/careers/${career._id}/parse-correlativas`, {
      form: fd, timeoutMs: 240000,
    });
    if (q.status !== 200) {
      console.log(`  parse ERROR HTTP=${q.status}, no se toca nada`);
      report.push({ career: job.careerName, estado: `parse-${q.status}` });
      continue;
    }
    // Solo agregar: materias SIN requires que el parse trae CON requires.
    const payload = [];
    let kept = 0;
    for (const s of (q.body.subjects || []).filter((x) => x.matched && x.dbCode)) {
      const cur = existing.get(s.dbCode) || [];
      if (cur.length) {
        kept += 1;
        continue;
      }
      if ((s.requires || []).length) {
        payload.push({ code: s.dbCode, name: s.dbName || s.name, requires: s.requires });
      }
    }
    let saved = 0;
    let dropped = [];
    if (payload.length) {
      // eslint-disable-next-line no-await-in-loop
      const sv = await req("POST", `/careers/${career._id}/correlativas`, {
        json: { subjects: payload }, timeoutMs: 120000,
      });
      saved = sv.body?.saved ?? 0;
      dropped = sv.body?.dropped ?? [];
    }
    // eslint-disable-next-line no-await-in-loop
    const g = await req("GET", `/careers/${career._id}/graph`, { timeoutMs: 60000 });
    const after = await req("GET", `/careers/${career._id}/subjects`, { timeoutMs: 60000 });
    const withReq = (after.body || []).filter((s) => (s.requires || []).length).length;
    console.log(`  matched=${q.body.matchedCount}/${q.body.total} nuevas=${saved} conservadas=${kept} conReq=${withReq}/${(after.body || []).length} aristas=${g.body?.edges?.length} ciclo=${g.body?.hasCycle} IA_sug=${q.body.aiSuggested?.length ?? 0}`);
    report.push({
      career: job.careerName, estado: "ok",
      matched: `${q.body.matchedCount}/${q.body.total}`, nuevas: saved, conservadas: kept,
      conReq: withReq, aristas: g.body?.edges?.length, ciclo: g.body?.hasCycle,
      aiSug: q.body.aiSuggested?.length ?? 0, aiRev: q.body.aiReview?.length ?? 0,
      dropped,
    });
  }
  fs.mkdirSync(INFORMES_DIR, { recursive: true });
  fs.writeFileSync(path.join(INFORMES_DIR, `backup-requires-${tag}.json`), JSON.stringify(backup, null, 1));
  fs.writeFileSync(path.join(INFORMES_DIR, `correlativas-reales-${tag}.md`), [
    `# Correlativas reales — ${tag}`,
    ``,
    `Regla: solo se agregaron requires vacíos; lo existente se conservó. Backup en \`backup-requires-${tag}.json\`.`,
    ``,
    ...report.map((r) => `- ${r.career}: ${r.estado}${r.matched ? ` matched=${r.matched} nuevas=${r.nuevas} conservadas=${r.conservadas} conReq=${r.conReq} aristas=${r.aristas} ciclo=${r.ciclo} IA=${r.aiSug}/${r.aiRev}` : ""}${r.dropped?.length ? ` descartadas=${JSON.stringify(r.dropped)}` : ""}`),
    ``,
  ].join("\n"));
  console.log(`Backup + informe en backend/scripts/informes/ (backup-requires-${tag}.json)`);
}

main().catch((e) => { console.error(`ERROR: ${e.message}`); process.exitCode = 2; });
