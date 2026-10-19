#!/usr/bin/env node
/*
 * Control de cobertura del corpus (Fase 2): gate de clasificación.
 * Uso: node scripts/check-cobertura.js   (npm run test:cobertura)
 *
 * Regla: cada PDF de files/UNAHUR-Oferta-Academica debe estar O BIEN en
 * docs/testing/planes-referencia.json (y entonces tiene golden), O BIEN en
 * docs/testing/pdf-sin-referencia.json con un motivo explícito. Un PDF nuevo
 * sin clasificar hace fallar el gate: la decisión (entrar a la referencia u
 * excluirse) es humana, nunca silenciosa.
 *
 * También valida el resto de la cadena: referencia sin PDF, referencia sin
 * golden, golden huérfano y exclusiones muertas (PDF inexistente) o en
 * conflicto (excluido y en la referencia a la vez).
 */
const fs = require("fs");
const path = require("path");

const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");

const REPO_ROOT = path.join(__dirname, "..", "..");
const PLANES_DIR = resolvePlanesDir(REPO_ROOT);
const GOLDEN_DIR = path.join(REPO_ROOT, "docs", "testing", "golden");
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const EXC_PATH = path.join(REPO_ROOT, "docs", "testing", "pdf-sin-referencia.json");

requireCorpus(PLANES_DIR, "cobertura");

const norm = (p) => p.split(path.sep).join("/");
const slug = (f) => f.split("/").pop().replace(/\.pdf$/i, "");

function walkPdfs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPdfs(abs));
    else if (e.isFile() && /\.pdf$/i.test(e.name)) out.push(norm(path.relative(PLANES_DIR, abs)));
  }
  return out;
}

function main() {
  if (!fs.existsSync(EXC_PATH)) {
    console.error(`[cobertura] falta ${path.relative(REPO_ROOT, EXC_PATH)} (registro de exclusiones)`);
    process.exit(2);
  }
  const ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8"));
  const exc = JSON.parse(fs.readFileSync(EXC_PATH, "utf8"));
  const excluidos = exc.excluidos || [];
  const refList = ref.planes.map((e) => e.file);
  const excList = excluidos.map((e) => e.file);

  const problemas = [];
  const allPdfs = walkPdfs(PLANES_DIR);
  const refFiles = new Set(refList);
  const excFiles = new Set(excList);

  // 1) PDFs sin clasificar (ni referencia ni exclusión con motivo)
  for (const p of allPdfs) {
    if (!refFiles.has(p) && !excFiles.has(p)) {
      problemas.push(
        `PDF sin clasificar: agregalo a planes-referencia.json (con golden) o a pdf-sin-referencia.json (con motivo): ${p}`,
      );
    }
  }

  // 2) Referencia: PDF presente + golden presente + sin duplicados
  for (const f of refList.filter((v, i) => refList.indexOf(v) !== i)) {
    problemas.push(`referencia duplicada: ${f}`);
  }
  for (const e of ref.planes) {
    if (!fs.existsSync(path.join(PLANES_DIR, ...e.file.split("/")))) {
      problemas.push(`referencia sin PDF: ${e.file}`);
    }
    if (!fs.existsSync(path.join(GOLDEN_DIR, `${slug(e.file)}.json`))) {
      problemas.push(`referencia sin golden (corré npm run snapshot:planes): ${slug(e.file)}`);
    }
  }

  // 3) Exclusiones: motivo no vacío, PDF presente, sin conflicto con la referencia
  for (const f of excList.filter((v, i) => excList.indexOf(v) !== i)) {
    problemas.push(`exclusión duplicada: ${f}`);
  }
  for (const e of excluidos) {
    if (!e.motivo || !e.motivo.trim()) problemas.push(`exclusión sin motivo: ${e.file}`);
    if (refFiles.has(e.file)) {
      problemas.push(`excluido y en la referencia a la vez (borrar de pdf-sin-referencia.json): ${e.file}`);
    }
    if (!fs.existsSync(path.join(PLANES_DIR, ...e.file.split("/")))) {
      problemas.push(`exclusión muerta (el PDF ya no está en files/): ${e.file}`);
    }
  }

  // 4) Golden huérfano (sin entrada en la referencia)
  const refSlugs = new Set(refList.map(slug));
  for (const f of fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith(".json"))) {
    if (!refSlugs.has(f.replace(/\.json$/i, ""))) {
      problemas.push(`golden sin entrada en la referencia: ${f}`);
    }
  }

  if (problemas.length) {
    console.error(`cobertura: ${problemas.length} problema(s)`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(
    `cobertura OK: ${allPdfs.length} PDFs = ${ref.planes.length} en referencia (con golden) + ${excluidos.length} excluidos con motivo`,
  );
  console.log(`  exclusiones: ${path.relative(REPO_ROOT, EXC_PATH)}`);
}

main();
