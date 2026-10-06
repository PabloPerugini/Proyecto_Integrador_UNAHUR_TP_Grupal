const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSugerencias } = require("../src/services/sugerencias.service");

const subjects = [
  { code: "M1", name: "Matemática", year: 1, requires: [] },
  { code: "M2", name: "Física", year: 1, requires: ["M1"] },
  { code: "A1", name: "Taller", year: 1, kind: "ACA", requires: [] },
];

test("materias A clasifica C1/C2/C3 y mensajes R0/R6 siempre", () => {
  const r = buildSugerencias({
    subjects,
    progress: [
      { subjectCode: "M1", status: "Aprobada", nota: 8 },
      { subjectCode: "M2", status: "Regular", nota: 5 },
    ],
  });
  assert.deepEqual(r.materiasA.C1, ["M1"]);
  assert.deepEqual(r.materiasA.C3, ["M2"]);
  assert.equal(r.mensajes[0].regla, "R0");
  assert.equal(r.mensajes[r.mensajes.length - 1].regla, "R6");
  assert.ok(r.mensajes.some((m) => m.regla === "R1"));
  assert.ok(r.mensajes.some((m) => m.regla === "R4"));
});

test("fusión C5 cuando no hay C1/C2", () => {
  const r = buildSugerencias({
    subjects,
    progress: [{ subjectCode: "M1", status: "Aprobada", nota: null }],
  });
  assert.deepEqual(r.materiasA.C5, ["M1"]);
  assert.deepEqual(r.materiasA.C1, []);
});

test("materias B en orden decreciente y ritmo x+1", () => {
  const r = buildSugerencias({
    subjects,
    progress: [
      { subjectCode: "M1", status: "Aprobada", nota: 9 },
      { subjectCode: "M2", status: "Regular", nota: 4 },
    ],
  });
  const counts = r.materiasB.map((b) => b.count);
  assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
  assert.equal(r.ritmo.sugeridas, r.ritmo.regularizadas + 1);
  const r2 = r.mensajes.find((m) => m.regla === "R2");
  assert.match(r2.texto, /inscribirte en 2 materia/);
});

test("comunes disponibles excluye cursadas", () => {
  const r = buildSugerencias({
    subjects,
    progress: [{ subjectCode: "A1", status: "Cursando", nota: null }],
  });
  assert.deepEqual(r.comunesDisponibles, []);
});
