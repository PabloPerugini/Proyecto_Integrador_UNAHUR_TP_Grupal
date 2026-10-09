// Guard de corpus compartido (plan maestro §1.5.3 C6/C7 + Fase 2).
// Sin los 43 PDFs el gate golden queda mudo: los scripts masivos deben
// fallar con mensaje claro, no en silencio.
const fs = require("fs");
const path = require("path");

function resolvePlanesDir(repoRoot) {
  // Orden: PLANES_DIR explícito -> files/ local en la raíz del repo
  // (ubicación recomendada) -> carpeta hermana ../files (histórico).
  // Devuelve el primero existente.
  const candidates = [
    process.env.PLANES_DIR,
    path.join(repoRoot, "files", "UNAHUR-Oferta-Academica"),
    path.join(repoRoot, "..", "files", "UNAHUR-Oferta-Academica"),
  ].filter(Boolean);
  return (
    candidates.find((d) => {
      try {
        return fs.existsSync(d);
      } catch {
        return false;
      }
    }) || candidates[0]
  );
}

function requireCorpus(planesDir, who) {
  if (!fs.existsSync(planesDir)) {
    console.error(`[${who}] falta corpus de PDFs: ${planesDir} (PLANES_DIR)`);
    console.error(
      `[${who}] poné la carpeta files/UNAHUR-Oferta-Academica en la raíz del repo o seteá PLANES_DIR`,
    );
    process.exit(2);
  }
}

module.exports = { requireCorpus, resolvePlanesDir };
