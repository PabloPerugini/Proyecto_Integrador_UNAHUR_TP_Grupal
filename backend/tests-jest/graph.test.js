const { buildGraph } = require("../src/services/graph.service");

function subject(code, requires = []) {
  return {
    code,
    name: `Materia ${code}`,
    year: 1,
    cuatrimestre: 1,
    duration: "CUATRIMESTRAL",
    credits: 4,
    requires,
  };
}

describe("buildGraph: camino crítico", () => {
  test("un ciclo entre pendientes no cuelga y se marca hasCycle", () => {
    const graph = buildGraph({
      subjects: [
        subject("A", ["B", "C"]),
        subject("B", ["A"]),
        subject("C"),
      ],
    });

    expect(graph.hasCycle).toBe(true);
    expect(new Set(graph.criticalPath).size).toBe(graph.criticalPath.length);
  });

  test("sin ciclo devuelve la cadena completa de pendientes", () => {
    const graph = buildGraph({
      subjects: [subject("A"), subject("B", ["A"]), subject("C", ["B"])],
    });

    expect(graph.hasCycle).toBe(false);
    expect(graph.criticalPath).toEqual(["A", "B", "C"]);
  });

  test("las aprobadas no forman parte del camino pendiente", () => {
    const graph = buildGraph({
      subjects: [subject("A"), subject("B", ["A"]), subject("C", ["B"])],
      progress: [
        { subjectCode: "A", status: "Aprobada" },
        { subjectCode: "B", status: "Aprobada" },
      ],
    });

    expect(graph.criticalPath).toEqual(["C"]);
  });
});
