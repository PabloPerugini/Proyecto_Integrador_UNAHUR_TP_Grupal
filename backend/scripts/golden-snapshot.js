#!/usr/bin/env node
/*
 * Snapshot golden del parser (red anti-regresiones).
 * Uso: npm run snapshot:planes         -> (re)genera docs/testing/golden/*.json
 *        npm run snapshot:planes -- --check -> compara parseo actual vs golden
 *
 * Parsea los 29 PDFs DIRECTO con pdfParser.service (sin DB, sin IA, sin
 * cuota): planes con parseOfficialPlan, correlativas con parseCorrelativas.
 * Cada fix del parser se aprueba solo con diff=0 en los archivos que ya
 * estaban bien + mejora en su objetivo.
 */
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const REF_PATH = path.join(REPO_ROOT, "docs", "testing", "planes-referencia.json");
const PLANES_DIR = process.env.PLANES_DIR ||
  path.join(REPO_ROOT, "..", "files", "UNAHUR-Oferta-Academica");
const GOLDEN_DIR = path.join(REPO_ROOT, "docs", "testing", "golden");
const { requireCorpus } = require("./lib/requireCorpus");

// Guard de corpus (plan maestro §1.5.3 C6/C7): sin los PDFs el gate diff=0
// queda mudo. Falla con mensaje claro en vez de 0 archivos silencioso.
requireCorpus(PLANES_DIR, "golden");

const { parseOfficialPlan, parseCorrelativas } = require("../src/services/pdfParser.service");

const slug = (f) => f.split("/").pop().replace(/\.pdf$/i, "");

async function snapPlan(abs) {
  const buf = fs.readFileSync(abs);
  const r = await parseOfficialPlan(buf);
  return {
    kind: "plan",
    sourceKind: r.sourceKind,
    count: r.subjects.length,
    credits: r.subjects.reduce((a, s) => a + (s.credits || 0), 0),
    intermediateTitle: r.intermediateTitle || null,
    names: r.subjects.map((s) => s.name),
    years: r.subjects.map((s) => `${s.name}||y${s.year}||c${s.cuatrimestre}`),
  };
}

async function snapCorr(abs) {
  const buf = fs.readFileSync(abs);
  const r = await parseCorrelativas(buf);
  return {
    kind: "correlativas",
    sourceKind: r.sourceKind,
    total: r.total,
    withCriteria: (r.subjects || []).filter((s) => (s.criteria || s.correlativas || []).length).length,
    names: (r.subjects || []).map((s) => s.name),
  };
}

async function main() {
  const check = process.argv.includes("--check");
  const ref = JSON.parse(fs.readFileSync(REF_PATH, "utf8"));
  if (!check) fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  let diffs = 0;
  for (const entry of ref.planes) {
    const abs = path.join(PLANES_DIR, ...entry.file.split("/"));
    const out = path.join(GOLDEN_DIR, `${slug(entry.file)}.json`);
    if (!fs.existsSync(abs)) {
      console.log(`FALTA ARCHIVO: ${entry.file}`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const snap = entry.tipo === "correlativas" ? await snapCorr(abs) : await snapPlan(abs);
    snap.file = entry.file;
    if (!check) {
      fs.writeFileSync(out, JSON.stringify(snap, null, 1) + "\n");
      console.log(`golden: ${slug(entry.file)} -> count=${snap.count ?? snap.total}`);
    } else {
      if (!fs.existsSync(out)) {
        console.log(`SIN GOLDEN: ${slug(entry.file)}`);
        diffs += 1;
        continue;
      }
      const base = JSON.parse(fs.readFileSync(out, "utf8"));
      const diffList = (a = [], b = []) => ({
        added: a.filter((n) => !b.includes(n)),
        removed: b.filter((n) => !a.includes(n)),
      });
      const dn = diffList(snap.names, base.names);
      const dy = diffList(snap.years || [], base.years || []);
      const added = [...dn.added, ...dy.added.filter((k) => !dn.added.some((n) => k.startsWith(n)))];
      const removed = [...dn.removed, ...dy.removed.filter((k) => !dn.removed.some((n) => k.startsWith(n)))];
      const countDelta = (snap.count ?? snap.total) - (base.count ?? base.total);
      if (!added.length && !removed.length && countDelta === 0) {
        console.log(`= ${slug(entry.file)}`);
      } else {
        diffs += 1;
        console.log(`≠ ${slug(entry.file)} delta=${countDelta} +${added.length} -${removed.length}`);
        for (const n of added.slice(0, 5)) console.log(`    + ${n.slice(0, 80)}`);
        for (const n of removed.slice(0, 5)) console.log(`    - ${n.slice(0, 80)}`);
      }
    }
  }
  if (check) {
    console.log(diffs ? `\nDIFERENCIAS: ${diffs} archivos` : "\nSIN DIFERENCIAS");
    process.exitCode = diffs ? 1 : 0;
  } else {
    console.log("\nBaseline golden generada.");
  }
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
