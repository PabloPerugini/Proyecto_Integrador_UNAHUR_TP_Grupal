const test = require("node:test");
const assert = require("node:assert/strict");

const {
  dedupeSubjectsBySlug,
} = require("../src/services/planImportConfirmationService");

// El confirm conserva la primera fila de cada slug: un PDF oficial puede
// repetir ACA por año o traer una fila cortada y antes se rechazaba entero.
test("dedupeSubjectsBySlug conserva la primera fila repetida", () => {
  const { unique, dropped } = dedupeSubjectsBySlug([
    { name: "Álgebra", slug: "algebra" },
    { name: "ACA", slug: "aca" },
    { name: "Álgebra (optativa)", slug: "algebra-optativa" },
    { name: "Actividades Curriculares Acreditables (ACA)", slug: "aca" },
  ]);

  assert.deepEqual(unique.map((s) => s.name), [
    "Álgebra",
    "ACA",
    "Álgebra (optativa)",
  ]);
  assert.deepEqual(dropped, ["Actividades Curriculares Acreditables (ACA)"]);
});

test("dedupeSubjectsBySlug no toca un plan sin repetidos", () => {
  const subjects = [
    { name: "Materia A", slug: "materia-a" },
    { name: "Materia B", slug: "materia-b" },
  ];
  const { unique, dropped } = dedupeSubjectsBySlug(subjects);

  assert.equal(unique.length, 2);
  assert.equal(dropped.length, 0);
});
