const { buildGraph } = require('./graph.service');

test('Devuelve un grafo vacio cuando no hay materias', () => {
    const resultado = buildGraph({ subjects: [] });
    expect(resultado.title).toBe('');
    expect(resultado.nodes).toEqual([]);
    expect(resultado.edges).toEqual([]);
    expect(resultado.availableNow).toEqual([]);
    expect(resultado.criticalPath).toEqual([]);
    expect(resultado.hasCycle).toBe(false);
    expect(resultado.topologicalOrder).toEqual([]);
    expect(resultado.stats).toEqual({
        total: 0,
        aprobadas: 0,
        disponibles: 0,
        pendientes: 0,
        enCurso: 0,
        regulares: 0,
        creditsTotal: 0,
        creditsAprobados: 0,
    });
});

test('Construye nodos, aristas y estadisticas en un caso normal', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, duration: 1, credits: 8, kind: 'base' },
        { code: 'B', name: 'Bases de Datos', year: 2, cuatrimestre: 1, duration: 1, credits: 6, kind: 'base', requires: ['A'] },
        { code: 'C', name: 'Complejos', year: 2, cuatrimestre: 2, duration: 1, credits: 6, kind: 'base', requires: ['A'] },
    ];
    const progress = [{ subjectCode: 'A', status: 'Aprobada' }];
    const resultado = buildGraph({ subjects, progress, title: 'Ingenieria' });

    expect(resultado.title).toBe('Ingenieria');
    expect(resultado.nodes).toHaveLength(3);
    expect(resultado.edges).toEqual([
        { id: 'A->B', source: 'A', target: 'B' },
        { id: 'A->C', source: 'A', target: 'C' },
    ]);
    expect(resultado.availableNow).toEqual(['B', 'C']);
    expect(resultado.hasCycle).toBe(false);
    expect(resultado.stats).toEqual({
        total: 3,
        aprobadas: 1,
        disponibles: 2,
        pendientes: 2,
        enCurso: 0,
        regulares: 0,
        creditsTotal: 20,
        creditsAprobados: 8,
    });
});

test('Cada nodo tiene id, status y posicion con valores por defecto', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, duration: 1, credits: 8, kind: 'base' },
    ];
    const resultado = buildGraph({ subjects });
    const nodo = resultado.nodes[0];

    expect(nodo.id).toBe('A');
    expect(nodo.code).toBe('A');
    expect(nodo.status).toBe('Pendiente');
    expect(nodo.intermediate).toBe(false);
    expect(nodo.position).toEqual({ x: 40, y: 40 });
});

test('Refleja el progreso de las materias en el status de cada nodo', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8 },
        { code: 'B', name: 'Bases', year: 1, cuatrimestre: 1, credits: 6 },
        { code: 'C', name: 'Complejos', year: 1, cuatrimestre: 1, credits: 6 },
    ];
    const progress = [
        { subjectCode: 'A', status: 'Aprobada' },
        { subjectCode: 'B', status: 'Cursando' },
        { subjectCode: 'C', status: 'Regular' },
    ];
    const resultado = buildGraph({ subjects, progress });
    const statusPorCodigo = Object.fromEntries(resultado.nodes.map((n) => [n.code, n.status]));

    expect(statusPorCodigo).toEqual({ A: 'Aprobada', B: 'Cursando', C: 'Regular' });
    expect(resultado.stats.aprobadas).toBe(1);
    expect(resultado.stats.enCurso).toBe(1);
    expect(resultado.stats.regulares).toBe(1);
});

test('Con datos incompletos no se rompe y completa valores por defecto', () => {
    const subjects = [
        { code: 'X', name: 'Sin datos' },
        { code: 'Y', name: 'Con correlativa', requires: ['X'] },
    ];
    const resultado = buildGraph({ subjects });

    expect(resultado.nodes).toHaveLength(2);
    expect(resultado.edges).toEqual([{ id: 'X->Y', source: 'X', target: 'Y' }]);
    expect(resultado.nodes[0].status).toBe('Pendiente');
    expect(resultado.nodes[0].intermediate).toBe(false);
    expect(resultado.availableNow).toEqual(['X']);
    expect(resultado.stats.creditsTotal).toBe(0);
    expect(resultado.stats.creditsAprobados).toBe(0);
    expect(resultado.criticalPath).toEqual(['X', 'Y']);
});

test('Ignora las correlatividades que apuntan a codigos desconocidos', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8 },
        { code: 'B', name: 'Bases', year: 1, cuatrimestre: 1, credits: 6, requires: ['A', 'ZZZ'] },
    ];
    const resultado = buildGraph({ subjects });

    expect(resultado.edges).toEqual([{ id: 'A->B', source: 'A', target: 'B' }]);
    expect(resultado.nodes.map((n) => n.code)).toEqual(['A', 'B']);
});

test('Con correlatividades duplicadas genera una sola arista', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8 },
        { code: 'B', name: 'Bases', year: 1, cuatrimestre: 1, credits: 6, requires: ['A', 'A'] },
    ];
    const resultado = buildGraph({ subjects });

    expect(resultado.edges).toHaveLength(1);
    expect(resultado.edges[0]).toEqual({ id: 'A->B', source: 'A', target: 'B' });
});

test('availableNow excluye las materias con correlatividades sin aprobar', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8 },
        { code: 'B', name: 'Bases', year: 2, cuatrimestre: 1, credits: 6, requires: ['A'] },
        { code: 'C', name: 'Complejos', year: 2, cuatrimestre: 1, credits: 6 },
    ];
    const resultado = buildGraph({ subjects });

    expect(resultado.availableNow).toEqual(['A', 'C']);
    expect(resultado.stats.disponibles).toBe(2);
});

test('Detecta un ciclo entre materias sin aprobar', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8, requires: ['B'] },
        { code: 'B', name: 'Bases', year: 1, cuatrimestre: 1, credits: 6, requires: ['A'] },
    ];
    const resultado = buildGraph({ subjects });

    expect(resultado.hasCycle).toBe(true);
    expect(resultado.topologicalOrder).toEqual([]);
    expect(resultado.criticalPath).toEqual([]);
});

test('Un ciclo que pasa por una materia aprobada no se marca como ciclo', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8, requires: ['B'] },
        { code: 'B', name: 'Bases', year: 1, cuatrimestre: 1, credits: 6, requires: ['A'] },
    ];
    const progress = [{ subjectCode: 'B', status: 'Aprobada' }];
    const resultado = buildGraph({ subjects, progress });

    expect(resultado.hasCycle).toBe(false);
    expect(resultado.criticalPath).toEqual(['A']);
});

test('El camino critico sigue la cadena larga de correlatividades pendientes', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8 },
        { code: 'B', name: 'Bases', year: 2, cuatrimestre: 1, credits: 6, requires: ['A'] },
        { code: 'C', name: 'Complejos', year: 3, cuatrimestre: 1, credits: 6, requires: ['B'] },
    ];
    const resultado = buildGraph({ subjects });

    expect(resultado.criticalPath).toEqual(['A', 'B', 'C']);
    expect(resultado.topologicalOrder).toEqual(['A', 'B', 'C']);
});

test('Ubica los nodos por año y cuatrimestre, y manda sin año al final', () => {
    const subjects = [
        { code: 'Z', name: 'Zeta', year: 1, cuatrimestre: 1, credits: 8 },
        { code: 'F', name: 'Alfa', year: 1, cuatrimestre: 2, credits: 6 },
        { code: 'B', name: 'Beta', year: 2, cuatrimestre: 1, credits: 6 },
        { code: 'S', name: 'Sin Anio', credits: 4 },
    ];
    const resultado = buildGraph({ subjects });
    const porCodigo = Object.fromEntries(resultado.nodes.map((n) => [n.code, n]));

    expect(porCodigo.Z.position.y).toBe(40);
    expect(porCodigo.F.position.y).toBeGreaterThan(porCodigo.Z.position.y);
    expect(porCodigo.B.position.x).toBeGreaterThan(porCodigo.Z.position.x);
    expect(porCodigo.S.position.x).toBeGreaterThan(porCodigo.B.position.x);
});

test('Suma los creditos solo de las materias aprobadas', () => {
    const subjects = [
        { code: 'A', name: 'Algoritmos', year: 1, cuatrimestre: 1, credits: 8 },
        { code: 'B', name: 'Bases', year: 1, cuatrimestre: 1, credits: 6 },
    ];
    const progress = [{ subjectCode: 'A', status: 'Aprobada' }];
    const resultado = buildGraph({ subjects, progress });

    expect(resultado.stats.creditsTotal).toBe(14);
    expect(resultado.stats.creditsAprobados).toBe(8);
    expect(resultado.stats.pendientes).toBe(1);
});
