// Guard de corpus compartido (plan maestro §1.5.3 C6/C7 + Fase 2).
// Sin los 43 PDFs de ../files/UNAHUR-Oferta-Academica el gate golden queda
// mudo: los scripts masivos deben fallar con mensaje claro, no en silencio.
const fs = require("fs");

function requireCorpus(planesDir, who) {
  if (!fs.existsSync(planesDir)) {
    console.error(`[${who}] falta corpus de PDFs: ${planesDir} (PLANES_DIR)`);
    console.error(
      `[${who}] conseguí la carpeta ../files/UNAHUR-Oferta-Academica o seteá PLANES_DIR`,
    );
    process.exit(2);
  }
}

module.exports = { requireCorpus };
