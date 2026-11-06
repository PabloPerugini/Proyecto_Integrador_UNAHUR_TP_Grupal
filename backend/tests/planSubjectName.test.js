const test = require("node:test");
const assert = require("node:assert/strict");
const { planSubjectName } = require("../src/utils/planSubjectName");

test("prioriza el nombre visible del plan", () => {
  assert.equal(planSubjectName({
      nameOverride: "  Nombre corregido  ",
      subject: { name: "Nombre del catálogo" },
      code: "MAT-01",
  }), "Nombre corregido");
});

test("usa el nombre del catálogo cuando el override está vacío", () => {
  assert.equal(planSubjectName({
      nameOverride: "  ",
      subject: { name: "Nombre del catálogo" },
      code: "MAT-01",
  }), "Nombre del catálogo");
});

test("usa el código y luego el respaldo cuando faltan nombres", () => {
  assert.equal(planSubjectName({ subject: null, code: " MAT-01 " }), "MAT-01");
  assert.equal(planSubjectName({ subject: null, code: " " }), "Materia sin nombre");
});
