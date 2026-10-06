const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGraph } = require("../src/services/graph.service");

// RN04: desmarcar revierte el sustento de dependientes (sin destruir datos:
// el estado guardado se conserva, la disponibilidad se re-deriva).
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

test("RN04: desmarcar M1 quita sustento a M2 y M3", () => {
  const g = buildGraph({
    subjects,
    progress: [
      { subjectCode: "M1", status: "Pendiente" },
      { subjectCode: "M2", status: "Aprobada" },
    ],
  });
  assert.ok(!g.availableNow.includes("M3"));
  assert.ok(!g.availableNow.includes("M2"));
});

test("RN04: estado guardado intacto, stats conservan aprobadas", () => {
  const g = buildGraph({
    subjects,
    progress: [
      { subjectCode: "M1", status: "Pendiente" },
      { subjectCode: "M2", status: "Aprobada" },
    ],
  });
  assert.equal(g.stats.aprobadas, 1);
  assert.equal(
    g.nodes.find((n) => n.id === "M2").status,
    "Aprobada",
  );
});
