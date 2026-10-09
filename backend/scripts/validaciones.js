#!/usr/bin/env node
/*
 * Punto único de validaciones (plan maestro Fase 2).
 * Uso: node scripts/validaciones.js <masiva|salud|golden|todo|--help> [-- args...]
 *   npm run validar          -> todo (golden --check + salud + masiva)
 *   npm run test:planes      -> masiva (carga E2E por API real, 43 PDFs)
 *   npm run test:salud       -> salud (control de correlativas + negativo)
 *   npm run snapshot:planes  -> golden (snapshot determinístico, -- --check)
 *
 * NOTA DE DISEÑO: los motores (carga-masiva, verificar-salud, golden) siguen
 * en sus archivos —reescribir 30KB de E2E probado es riesgo sin valor—.
 * Este dispatcher es la única entrada: chequeo previo de corpus (Fase 2.2),
 * ayuda y corrida completa. Los npm scripts pasan por acá (Fase 2.3).
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const { requireCorpus, resolvePlanesDir } = require("./lib/requireCorpus");

const REPO_ROOT_VALID = path.join(__dirname, "..", "..");
const PLANES_DIR = resolvePlanesDir(REPO_ROOT_VALID);

const ENGINES = {
  masiva: "carga-masiva.test.js",
  salud: "verificar-salud.test.js",
  golden: "golden-snapshot.js",
};

function help() {
  console.log(`validaciones.js <comando> [-- args del motor]

  masiva   carga E2E de planes por API real (necesita backend + Mongo + Redis)
  salud    control de correlativas de Salud + control negativo (idem API)
  golden   snapshot determinístico del parser (sin API; -- --check compara)
  todo     golden --check, luego salud y masiva (falla rápido)
  --help   esta ayuda

Ej.: node scripts/validaciones.js golden -- --check`);
}

function run(engine, extraArgs) {
  const file = path.join(__dirname, ENGINES[engine]);
  const r = spawnSync(process.execPath, [file, ...extraArgs], {
    stdio: "inherit",
  });
  return r.status ?? 1;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "--help" || cmd === "-h") {
    help();
    process.exit(cmd ? 0 : 1);
  }
  // El golden no necesita API pero sí corpus; masiva/salud lo re-chequean
  // en sus motores. Un solo mensaje claro si falta.
  requireCorpus(PLANES_DIR, "validaciones");
  if (cmd === "todo") {
    const steps = [
      ["golden", ["--check"]],
      ["salud", []],
      ["masiva", []],
    ];
    for (const [engine, args] of steps) {
      console.log(`\n=== validaciones: ${engine} ===`);
      const code = run(engine, args);
      if (code !== 0) {
        console.error(`validaciones: ${engine} falló (${code}), se aborta todo`);
        process.exit(code);
      }
    }
    console.log("\nvalidaciones: todo OK");
    return;
  }
  if (!ENGINES[cmd]) {
    console.error(`comando desconocido: ${cmd}`);
    help();
    process.exit(1);
  }
  process.exit(run(cmd, rest));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
