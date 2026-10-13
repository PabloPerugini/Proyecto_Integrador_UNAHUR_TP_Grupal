#!/usr/bin/env node
/*
 * Precarga oficial de planes (nueva arquitectura).
 * Uso: ADMIN_TOKEN=<jwt-de-admin> npm run seed:planes [-- --only <texto>] [--dry-run]
 *
 * Para cada plan de docs/testing/planes-referencia.json (tipo != correlativas):
 * preview + confirm con official:true -> StudyPlan createdBy=null + published,
 * visible para todos los usuarios (el usuario elige como en la oferta oficial).
 * Empareja la carrera de la referencia con el catálogo por nombre normalizado.
 * No borra nada: si ya existe un plan oficial para la carrera, se saltea.
 * Informe en backend/scripts/informes/seed-*.md.
 *
 * Env: API_URL (default http://localhost:3000), PLANES_DIR (default
 * files/UNAHUR-Oferta-Academica en la raíz, o ../files histórico),
 * ADMIN_TOKEN (obligatorio: JWT de un usuario ADMIN).
 */
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");
const { API, reqJson, reqPdf } = require("./lib/testAuth");
const { normKey } = require("../src/services/correlativas.service");

const PLANES_DIR = resolvePlanesDir(REPO_ROOT);
const INFORMES_DIR = path.join(__dirname, "informes");

// Guard de corpus.
requireCorpus(PLANES_DIR, "seed-planes");

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const RUN_TAG = `seed-${stamp()}`;
const args = process.argv.slice(2);
const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const dryRun = args.includes("--dry-run");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function main() {
  if (!ADMIN_TOKEN) {
    console.error("Falta ADMIN_TOKEN (JWT de un usuario ADMIN). Nada para hacer.");
    process.exitCode = 2;
    return;
  }
  const me = await reqJson("GET", "/users/me", { token: ADMIN_TOKEN });
  if (me.status !== 200 || me.body?.rol !== "ADMIN") {
    console.error(`ADMIN_TOKEN inválido o sin rol ADMIN (HTTP ${me.status}). Nada para hacer.`);
    process.exitCode = 2;
    return;
  }
  console.log(`== Precarga oficial ${RUN_TAG} == (admin: ${me.body.nickName}${dryRun ? ", DRY-RUN" : ""})`);

  const ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8"));
  const entries = ref.planes.filter((e) => e.tipo !== "correlativas")
    .filter((e) => !onlyArg || normKey(`${e.career} ${e.file}`).includes(normKey(onlyArg)));

  const careersRes = await reqJson("GET", "/careers", { token: ADMIN_TOKEN });
  if (careersRes.status !== 200 || !Array.isArray(careersRes.body)) {
    throw new Error(`GET /careers -> HTTP ${careersRes.status}`);
  }
  const careerByNorm = new Map(careersRes.body.map((c) => [normKey(c.name), c]));
  // Universidad + institutos para crear carreras faltantes (somos ADMIN).
  const uniRes = await reqJson("GET", "/universities", { token: ADMIN_TOKEN });
  const unis = Array.isArray(uniRes.body) ? uniRes.body : [];
  let unahur = unis.find((u) => normKey(u.name).includes("hurlingham"));
  if (!unahur) {
    const created = await reqJson("POST", "/universities", {
      token: ADMIN_TOKEN,
      timeoutMs: 30000,
      json: { name: "Universidad Nacional de Hurlingham" },
    });
    if (created.status !== 200 && created.status !== 201) {
      throw new Error(`No se pudo crear la universidad (HTTP ${created.status})`);
    }
    unahur = created.body?.university || created.body;
    console.log(`universidad creada: ${unahur.name}`);
  }
  const auRes = await reqJson("GET", "/academic-units", { token: ADMIN_TOKEN });
  const units = Array.isArray(auRes.body) ? auRes.body : [];
  const ensureUnit = async (instituteName) => {
    const found = units.find((u) => normKey(u.name) === normKey(instituteName));
    if (found) return found;
    const created = await reqJson("POST", "/academic-units", {
      token: ADMIN_TOKEN,
      timeoutMs: 30000,
      json: { name: instituteName, type: "INSTITUTO", university: unahur._id },
    });
    if (created.status !== 200 && created.status !== 201) {
      throw new Error(`No se pudo crear ${instituteName} (HTTP ${created.status})`);
    }
    const unit = created.body?.academicUnit || created.body;
    units.push(unit);
    return unit;
  };
  const matchCareer = (wanted) => {
    const key = normKey(wanted);
    if (careerByNorm.get(key)) return { career: careerByNorm.get(key), created: false };
    const hit = careersRes.body.find((c) => {
      const ck = normKey(c.name);
      return ck.includes(key) || key.includes(ck);
    });
    return hit ? { career: hit, created: false } : null;
  };

  const plansRes = await reqJson("GET", "/study-plans", { token: ADMIN_TOKEN });
  const existing = Array.isArray(plansRes.body) ? plansRes.body : [];
  const officialCareerIds = new Set(
    existing
      .filter((p) => !p.createdBy && p.status === "published")
      .map((p) => String(typeof p.career === "object" ? p.career?._id : p.career)),
  );

  const results = [];
  for (const entry of entries) {
    const abs = path.join(PLANES_DIR, ...entry.file.split("/"));
    const r = { file: entry.file, career: entry.career, estado: "FAIL", mensaje: "" };
    console.log(`[plan] ${entry.career} ...`);
    if (!fs.existsSync(abs)) {
      r.estado = "SKIP";
      r.mensaje = "archivo no encontrado en PLANES_DIR";
      results.push(r);
      console.log(`  -> SKIP: ${r.mensaje}`);
      continue;
    }
    let career = matchCareer(entry.career)?.career || null;
    let careerCreated = false;
    if (!career) {
      // Sin homónima ni contenida: crearla en el catálogo (somos ADMIN),
      // con universidad e instituto correspondientes.
      const instituteName = entry.file.split("/")[0] || "UNAHUR";
      // eslint-disable-next-line no-await-in-loop
      const unit = await ensureUnit(instituteName);
      // eslint-disable-next-line no-await-in-loop
      const created = await reqJson("POST", "/careers", {
        token: ADMIN_TOKEN,
        timeoutMs: 30000,
        json: { name: entry.career, university: unahur._id, academicUnit: unit._id },
      });
      if (created.status !== 200 && created.status !== 201) {
        r.estado = "SKIP";
        r.mensaje = `sin carrera en catálogo y no se pudo crear (HTTP ${created.status})`;
        results.push(r);
        console.log(`  -> SKIP: ${r.mensaje}`);
        continue;
      }
      career = created.body?.career || created.body;
      careerCreated = true;
      careersRes.body.push(career);
      careerByNorm.set(normKey(career.name), career);
    }
    if (officialCareerIds.has(String(career._id))) {
      r.estado = "SKIP";
      r.mensaje = "ya existe plan oficial para esta carrera";
      results.push(r);
      console.log(`  -> SKIP: ${r.mensaje}`);
      continue;
    }
    let parsed;
    try {
      // eslint-disable-next-line no-await-in-loop
      const pv = await reqPdf(ADMIN_TOKEN, "/plan-imports/preview", abs, { timeoutMs: 180000 });
      if (pv.status !== 200 || !pv.body?.subjects?.length) {
        r.mensaje = `preview -> HTTP ${pv.status}: ${pv.body?.error?.message || pv.body?.message || "sin materias"}`;
        results.push(r);
        console.log(`  -> FAIL: ${r.mensaje}`);
        continue;
      }
      parsed = pv.body;
    } catch (e) {
      r.mensaje = `preview error: ${e.message}`;
      results.push(r);
      console.log(`  -> FAIL: ${r.mensaje}`);
      continue;
    }
    if (dryRun) {
      r.estado = "OK";
      r.mensaje = `dry-run: ${parsed.subjects.length} materias (${parsed.sourceKind})`;
      results.push(r);
      console.log(`  -> OK: ${r.mensaje}`);
      continue;
    }
    // El confirm exige slugs únicos: si el PDF repite una fila (p. ej. ACA
    // genérica), se conserva la primera y se informa.
    const seenSlugs = new Set();
    const deduped = [];
    let dupCount = 0;
    for (const s of parsed.subjects) {
      const k = normKey(s.name);
      if (seenSlugs.has(k)) { dupCount += 1; continue; }
      seenSlugs.add(k);
      deduped.push(s);
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const cf = await reqJson("POST", "/plan-imports/confirm", {
        token: ADMIN_TOKEN,
        timeoutMs: 120000,
        json: {
          fileHash: parsed.fileHash,
          careerId: career._id,
          name: entry.career,
          fileName: entry.file.split("/").pop(),
          subjects: deduped,
          official: true,
        },
      });
      if (cf.status !== 200 && cf.status !== 201) {
        r.mensaje = `confirm -> HTTP ${cf.status}: ${cf.body?.error?.message || cf.body?.message || ""}`;
        results.push(r);
        console.log(`  -> FAIL: ${r.mensaje}`);
        continue;
      }
      r.estado = "OK";
      r.mensaje = `oficial${careerCreated ? " (carrera creada)" : ""}: ${cf.body.saved} materias, ${cf.body.prerequisitesResolved ?? 0} correlativas${dupCount ? ` (${dupCount} filas repetidas descartadas)` : ""}`;
      officialCareerIds.add(String(career._id));
      results.push(r);
      console.log(`  -> OK: ${r.mensaje}`);
    } catch (e) {
      r.mensaje = `confirm error: ${e.message}`;
      results.push(r);
      console.log(`  -> FAIL: ${r.mensaje}`);
    }
  }

  const counts = { OK: 0, FAIL: 0, SKIP: 0 };
  for (const r of results) counts[r.estado] = (counts[r.estado] || 0) + 1;
  const fname = `seed-oficial-${RUN_TAG}.md`;
  fs.mkdirSync(INFORMES_DIR, { recursive: true });
  const lines = [
    `# Precarga oficial — ${RUN_TAG}${dryRun ? " (dry-run)" : ""}`,
    ``,
    `Resumen: OK=${counts.OK} FAIL=${counts.FAIL} SKIP=${counts.SKIP} (total ${results.length})`,
    ``,
    `| Archivo | Carrera | Estado | Detalle |`,
    `| --- | --- | --- | --- |`,
  ];
  for (const r of results) {
    lines.push(`| ${r.file.split("/").pop()} | ${r.career} | **${r.estado}** | ${r.mensaje.replace(/\|/g, "\\|")} |`);
  }
  lines.push(``);
  fs.writeFileSync(path.join(INFORMES_DIR, fname), lines.join("\n"), "utf8");
  console.log(`\nResumen: OK=${counts.OK} FAIL=${counts.FAIL} SKIP=${counts.SKIP}`);
  console.log(`Informe: backend/scripts/informes/${fname}`);
  if (counts.FAIL) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`ERROR fatal: ${e.message}`);
  process.exitCode = 2;
});
