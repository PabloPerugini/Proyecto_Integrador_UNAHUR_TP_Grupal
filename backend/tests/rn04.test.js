const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGraph } = require("../src/services/graph.service");

// RN04: una correlativa que deja de estar aprobada no revoca materias ya
// aprobadas; una aprobación registrada sigue habilitando sus correlativas.
const subjects = [
  { code: "M1", name: "M1", year: 1, cuatrimestre: 1, requires: [] },
  { code: "M2", name: "M2", year: 1, cuatrimestre: 2, requires: ["M1"] },
  { code: "M3", name: "M3", year: 2, cuatrimestre: 1, requires: ["M2"] },
];

test("RN04: cadena aprobada habilita el siguiente", () => {
  const g = buildGraph({
    subjects,
    progress: [
      { subjectCode: "M1", status: "Aprobada" },
      { subjectCode: "M2", status: "Aprobada" },
    ],
  });
  assert.ok(g.availableNow.includes("M3"));
});

test("RN04: M2 aprobada habilita M3 aunque M1 esté libre", () => {
  const g = buildGraph({
    subjects,
    progress: [
      { subjectCode: "M1", status: "Libre" },
      { subjectCode: "M2", status: "Aprobada" },
    ],
  });
  assert.ok(g.availableNow.includes("M3"));
  assert.ok(!g.availableNow.includes("M2"));
});

test("RN04: el estado libre y las aprobaciones guardadas se conservan", () => {
  const g = buildGraph({
    subjects,
    progress: [
      { subjectCode: "M1", status: "Libre" },
      { subjectCode: "M2", status: "Aprobada" },
    ],
  });
  assert.equal(g.stats.aprobadas, 1);
  assert.equal(g.nodes.find((n) => n.id === "M1").status, "Libre");
  assert.equal(
    g.nodes.find((n) => n.id === "M2").status,
    "Aprobada",
  );
});
