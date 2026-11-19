const { buildGraph } = require("../src/services/graph.service");

const materias = [
    { code: "M1", name: "Matemática 1", year: 1, requires: [] },
    { code: "M2", name: "Matemática 2", year: 1, requires: ["M1"] },
    { code: "M3", name: "Matemática 3", year: 2, requires: ["M2"] },
    { code: "M4", name: "Inglés", year: 1, requires: [] },
];

describe("buildGraph (grafo de correlatividades)", () => {
    test("crea un nodo por materia y una arista por correlativa", () => {
        const g = buildGraph({ subjects: materias });
        expect(g.nodes).toHaveLength(4);
        expect(g.edges).toHaveLength(2);
        expect(g.edges[0].id).toBe("M1->M2");
    });

    test("sin progreso, están disponibles las materias sin correlativas", () => {
        const g = buildGraph({ subjects: materias });
        expect(g.availableNow).toEqual(["M1", "M4"]);
        expect(g.stats.aprobadas).toBe(0);
        expect(g.stats.pendientes).toBe(4);
    });

    test("el camino crítico es la cadena más larga de materias pendientes", () => {
        const g = buildGraph({ subjects: materias });
        expect(g.criticalPath).toEqual(["M1", "M2", "M3"]);
        expect(g.hasCycle).toBe(false);
    });

    test("el orden topológico pone cada correlativa antes de la materia", () => {
        const g = buildGraph({ subjects: materias });
        const orden = g.topologicalOrder;
        expect(orden.indexOf("M1")).toBeLessThan(orden.indexOf("M2"));
        expect(orden.indexOf("M2")).toBeLessThan(orden.indexOf("M3"));
    });

    test("al aprobar M1 se habilita M2 y el camino crítico se acorta", () => {
        const g = buildGraph({
            subjects: materias,
            progress: [{ subjectCode: "M1", status: "Aprobada" }],
        });
        expect(g.availableNow).toEqual(["M2", "M4"]);
        expect(g.criticalPath).toEqual(["M2", "M3"]);
        expect(g.stats.aprobadas).toBe(1);
    });

    test("detecta un ciclo entre correlativas", () => {
        const g = buildGraph({
            subjects: [
                { code: "A", name: "A", year: 1, requires: ["B"] },
                { code: "B", name: "B", year: 1, requires: ["A"] },
            ],
        });
        expect(g.hasCycle).toBe(true);
    });

    test("una correlativa que no existe en el plan se ignora", () => {
        const g = buildGraph({
            subjects: [{ code: "X1", name: "X", year: 1, requires: ["NOEXISTE"] }],
        });
        expect(g.edges).toHaveLength(0);
        expect(g.availableNow).toEqual(["X1"]);
    });
});