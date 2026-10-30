const { subjectDisplayName } = require("../src/services/studyPlanGraph.service");

describe("subjectDisplayName", () => {
  test("prioriza nameOverride sobre el nombre de la materia", () => {
    expect(
      subjectDisplayName({
        nameOverride: "Nombre editado",
        subject: { name: "Nombre base" },
        code: "MAT001",
      }),
    ).toBe("Nombre editado");
  });

  test("ignora un nameOverride vacío o con espacios", () => {
    expect(
      subjectDisplayName({
        nameOverride: "   ",
        subject: { name: "Nombre base" },
        code: "MAT001",
      }),
    ).toBe("Nombre base");
  });

  test("sin nameOverride usa el nombre de la materia", () => {
    expect(
      subjectDisplayName({
        subject: { name: "Nombre base" },
        code: "MAT001",
      }),
    ).toBe("Nombre base");
  });

  test("sin nombre de materia usa el código", () => {
    expect(subjectDisplayName({ code: "MAT001" })).toBe("MAT001");
  });

  test("sin nombre ni código devuelve el texto por defecto", () => {
    expect(subjectDisplayName({})).toBe("Materia sin nombre");
  });
});
