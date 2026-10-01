const test = require("node:test");
const assert = require("node:assert/strict");
const { bestDbMatch, cleanRequiresList, findCycle } = require("../src/controllers/career.controllers");

const db = [
  { code: "MAT001", name: "Análisis Matemático I" },
  { code: "FIS001", name: "Física I" },
  { code: "DID001", name: "Didáctica de la matemática II" },
];

test("bestDbMatch exact", () => {
  const r = bestDbMatch("Análisis Matemático I", db);
  assert.equal(r.db.code, "MAT001");
  assert.equal(r.confidence, "exact");
});

test("bestDbMatch compact (artefacto PDF con espacios)", () => {
  const r = bestDbMatch("Análi sis Matemático I", db);
  assert.equal(r.db.code, "MAT001");
});

test("bestDbMatch no confunde I con II", () => {
  const r = bestDbMatch("Didáctica de la matemática", [{ code: "X", name: "Didáctica" }]);
  assert.equal(r.db, null);
});

test("bestDbMatch prefix por palabras", () => {
  const r = bestDbMatch("Historia de la Nación Argentina y sus", [
    { code: "H1", name: "Historia de la Nación Argentina y sus Instituciones" },
  ]);
  assert.equal(r.db.code, "H1");
  assert.equal(r.confidence, "prefix");
});

test("cleanRequiresList descarta inexistente y autorreferencia (BUG-009)", () => {
  const valid = new Set(["A", "B"]);
  const { clean, dropped } = cleanRequiresList("A", ["B", "ZZZ", "A", "B"], valid);
  assert.deepEqual(clean, ["B"]);
  assert.equal(dropped.length, 2);
});

test("findCycle detecta A->B->A", () => {
  const cycle = findCycle({ A: [], B: ["A"] }, [{ code: "A", requires: ["B"] }]);
  assert.ok(Array.isArray(cycle) && cycle[0] === "A");
});

test("findCycle null sin ciclo", () => {
  assert.equal(findCycle({ A: [], B: [] }, [{ code: "A", requires: ["B"] }]), null);
});
