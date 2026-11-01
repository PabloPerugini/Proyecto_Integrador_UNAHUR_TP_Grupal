const { buildGraph } = require("../src/services/graph.service");
const { computeTargetPath } = require("../src/services/graphPaths.service");

function subject(code, requires = [], extra = {}) {
  return {
    code,
    name: `Materia ${code}`,
    year: 1,
    cuatrimestre: 1,
    duration: "CUATRIMESTRAL",
    credits: 4,
    requires,
    ...extra,
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

  test("los costos del camino crítico usan la duración de cada materia", () => {
    const graph = buildGraph({
      subjects: [
        subject("A", [], { duration: "ANUAL" }),
        subject("B", ["A"]),
        subject("C", ["B"], { duration: "OTRA" }),
      ],
    });

    expect(graph.criticalPath).toEqual(["A", "B", "C"]);
    expect(graph.criticalPathCosts).toEqual([2, 1, 2]);
    expect(graph.criticalPathCost).toBe(5);
    expect(graph.criticalPathEdges).toEqual(["A->B", "B->C"]);
  });
});

describe("buildGraph: estados efectivos", () => {
  test("una aprobada sin sustento queda bloqueada y no suma a las aprobadas", () => {
    const graph = buildGraph({
      subjects: [subject("A"), subject("B", ["A"])],
      progress: [
        { subjectCode: "A", status: "Pendiente" },
        { subjectCode: "B", status: "Aprobada" },
      ],
    });

    const b = graph.nodes.find((node) => node.code === "B");

    expect(b.savedStatus).toBe("Aprobada");
    expect(b.effectiveStatus).toBe("Bloqueada");
    expect(graph.stats.aprobadas).toBe(0);
    expect(graph.stats.bloqueadas).toBe(1);
  });

  test("una regularizada sustenta REGULARIZADA pero no APROBADA", () => {
    const graph = buildGraph({
      subjects: [
        subject("A"),
        subject("B", [], {
          requirements: [{ code: "A", requiredStatus: "REGULARIZADA" }],
        }),
        subject("C", [], {
          requirements: [{ code: "A", requiredStatus: "APROBADA" }],
        }),
      ],
      progress: [{ subjectCode: "A", status: "Regular" }],
    });

    expect(graph.nodes.find((n) => n.code === "B").effectiveStatus).toBe("Disponible");
    expect(graph.nodes.find((n) => n.code === "C").effectiveStatus).toBe("Bloqueada");
  });

  test("stats y nodos comparten el estado efectivo", () => {
    const graph = buildGraph({
      subjects: [
        subject("A"),
        subject("B", ["A"]),
        subject("C", ["B"]),
        subject("D", ["C"]),
      ],
      progress: [
        { subjectCode: "A", status: "Aprobada" },
        { subjectCode: "B", status: "Cursando" },
        { subjectCode: "C", status: "Pendiente" },
        { subjectCode: "D", status: "Pendiente" },
      ],
    });

    expect(graph.stats).toMatchObject({
      total: 4,
      aprobadas: 1,
      pendientes: 3,
      disponibles: 0,
      bloqueadas: 2,
      enCurso: 1,
      regulares: 0,
    });
    expect(graph.availableNow).toEqual([]);
  });
});

describe("computeTargetPath", () => {
  const nodes = [
    { id: "A", code: "A", duration: "CUATRIMESTRAL", effectiveStatus: "Aprobada" },
    { id: "B", code: "B", duration: "CUATRIMESTRAL", effectiveStatus: "Disponible" },
    { id: "C", code: "C", duration: "ANUAL", effectiveStatus: "Bloqueada" },
  ];
  const edges = [
    { id: "A->B", source: "A", target: "B" },
    { id: "B->C", source: "B", target: "C" },
  ];

  test("sin target devuelve null", () => {
    expect(computeTargetPath(nodes, edges, null)).toBeNull();
    expect(computeTargetPath(nodes, edges, undefined)).toBeNull();
  });

  test("arma la cadena, los costos y las aristas hasta el target", () => {
    const path = computeTargetPath(nodes, edges, "C");

    expect(path).toEqual({
      target: "C",
      chain: ["B", "C"],
      chainCosts: [1, 2],
      cost: 3,
      edgeIds: ["B->C"],
      hasCycle: false,
    });
  });

  test("un target inexistente devuelve la cadena vacía", () => {
    expect(computeTargetPath(nodes, edges, "Z")).toEqual({
      target: "Z",
      chain: [],
      chainCosts: [],
      cost: 0,
      edgeIds: [],
      hasCycle: false,
    });
  });

  test("detecta ciclos sin colgarse", () => {
    const cyclicNodes = [
      { id: "A", code: "A", duration: "CUATRIMESTRAL", effectiveStatus: "Disponible" },
      { id: "B", code: "B", duration: "CUATRIMESTRAL", effectiveStatus: "Bloqueada" },
    ];
    const cyclicEdges = [
      { id: "A->B", source: "A", target: "B" },
      { id: "B->A", source: "B", target: "A" },
    ];

    const path = computeTargetPath(cyclicNodes, cyclicEdges, "B");

    expect(path.hasCycle).toBe(true);
    expect(path.chain).toEqual([]);
  });
});
