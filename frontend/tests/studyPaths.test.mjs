import test from 'node:test';
import assert from 'node:assert/strict';
import { getRequirements, getSuggestedOrder } from '../src/utils/studyPaths.ts';

const nodes = [
  { code: 'A', status: 'Pendiente' },
  { code: 'B', status: 'Pendiente' },
  { code: 'C', status: 'Pendiente' },
  { code: 'D', status: 'Aprobada' },
  { code: 'E', status: 'Pendiente' },
  { code: 'F', status: 'Pendiente' },
];

const edges = [
  { id: 'A->B', source: 'A', target: 'B' },
  { id: 'B->C', source: 'B', target: 'C' },
  { id: 'D->C', source: 'D', target: 'C' },
  { id: 'C->E', source: 'C', target: 'E' },
];

test('los requisitos incluyen todas las correlativas pendientes, directas e indirectas', () => {
  const path = getRequirements(nodes, edges, 'C');
  // D está aprobada: no es requisito pendiente. A y B sí, aunque B sea indirecto.
  assert.deepEqual([...path.set].sort(), ['A', 'B', 'C']);
  assert.deepEqual(path.chain, ['A', 'B', 'C']);
  // La flecha desde la aprobada D no forma parte del recorrido.
  assert.deepEqual([...path.edgeSet].sort(), ['A->B', 'B->C']);
  assert.equal(path.hasCycle, false);
});

test('el rombo reúne los dos ramos, no solo el más largo', () => {
  const romboEdges = [
    { id: 'A->B', source: 'A', target: 'B' },
    { id: 'A->C', source: 'A', target: 'C' },
    { id: 'B->Z', source: 'B', target: 'Z' },
    { id: 'C->Z', source: 'C', target: 'Z' },
  ];
  const romboNodes = [
    { code: 'A', status: 'Pendiente' },
    { code: 'B', status: 'Pendiente' },
    { code: 'C', status: 'Pendiente' },
    { code: 'Z', status: 'Pendiente' },
  ];
  const path = getRequirements(romboNodes, romboEdges, 'Z');
  assert.deepEqual([...path.set].sort(), ['A', 'B', 'C', 'Z']);
  assert.equal(path.edgeSet.size, 4);
});

test('una materia sin correlativas pendientes queda igual en el recorrido', () => {
  const path = getRequirements(nodes, edges, 'F');
  assert.deepEqual([...path.set], ['F']);
  assert.deepEqual(path.chain, ['F']);
  assert.equal(path.edgeSet.size, 0);
});

test('una materia ya aprobada no genera recorrido', () => {
  const path = getRequirements(nodes, edges, 'D');
  assert.equal(path.chain.length, 0);
  assert.equal(path.set.size, 0);
});

test('sin materia elegida no hay recorrido', () => {
  assert.equal(getRequirements(nodes, edges, null).chain.length, 0);
  assert.equal(getRequirements(nodes, edges, undefined).chain.length, 0);
});

test('un ciclo entre los requisitos no permite calcular el recorrido', () => {
  const cicloEdges = [
    { id: 'X->Y', source: 'X', target: 'Y' },
    { id: 'Y->X', source: 'Y', target: 'X' },
    { id: 'Y->Z', source: 'Y', target: 'Z' },
  ];
  const cicloNodes = [
    { code: 'X', status: 'Pendiente' },
    { code: 'Y', status: 'Pendiente' },
    { code: 'Z', status: 'Pendiente' },
  ];
  const path = getRequirements(cicloNodes, cicloEdges, 'Z');
  assert.equal(path.hasCycle, true);
  assert.equal(path.chain.length, 0);
});

test('el orden sugerido arranca por la materia que más desbloquea en el cuatrimestre más temprano', () => {
  // A y Z comparten el 1.er cuatrimestre del 1.er año; Z desbloquea dos materias.
  const orderNodes = [
    { code: 'A', status: 'Pendiente', year: 1, cuatrimestre: 1 },
    { code: 'B', status: 'Pendiente', year: 1, cuatrimestre: 2 },
    { code: 'X', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'Y', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'Z', status: 'Pendiente', year: 1, cuatrimestre: 1 },
  ];
  const orderEdges = [
    { id: 'Z->Y', source: 'Z', target: 'Y' },
    { id: 'Z->X', source: 'Z', target: 'X' },
    { id: 'A->B', source: 'A', target: 'B' },
  ];
  const path = getSuggestedOrder(orderNodes, orderEdges);
  // Dentro del cuatrimestre gana Z (2 desbloqueos contra 1).
  assert.deepEqual(path.chain, ['Z', 'X']);
  assert.deepEqual([...path.edgeSet], ['Z->X']);
  assert.equal(path.hasCycle, false);
});

test('el camino arranca en el cuatrimestre más temprano aunque otro ramo desbloquee más', () => {
  // A es de 2.° año/1.er cuat. y desbloquea 3; B es de 1.er año/2.° cuat. y desbloquea 1.
  const orderNodes = [
    { code: 'A', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'B', status: 'Pendiente', year: 1, cuatrimestre: 2 },
    { code: 'C', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'X', status: 'Pendiente', year: 2, cuatrimestre: 2 },
    { code: 'Y', status: 'Pendiente', year: 3, cuatrimestre: 1 },
    { code: 'Z', status: 'Pendiente', year: 3, cuatrimestre: 2 },
  ];
  const orderEdges = [
    { id: 'A->X', source: 'A', target: 'X' },
    { id: 'A->Y', source: 'A', target: 'Y' },
    { id: 'A->Z', source: 'A', target: 'Z' },
    { id: 'B->C', source: 'B', target: 'C' },
  ];
  const path = getSuggestedOrder(orderNodes, orderEdges);
  // El avance actual manda: empieza en B (1.er año/2.° cuat.), no en A.
  assert.deepEqual(path.chain, ['B', 'C']);
});

test('el camino sigue el cuatrimestre inmediato antes que un ramo más profundo', () => {
  // B está en el cuatrimestre inmediato (1.er año/2.° cuat.) y C dos cuatrimestres después.
  const orderNodes = [
    { code: 'A', status: 'Pendiente', year: 1, cuatrimestre: 1 },
    { code: 'B', status: 'Pendiente', year: 1, cuatrimestre: 2 },
    { code: 'C', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'D', status: 'Pendiente', year: 2, cuatrimestre: 2 },
    { code: 'E', status: 'Pendiente', year: 3, cuatrimestre: 1 },
    { code: 'F', status: 'Pendiente', year: 3, cuatrimestre: 1 },
  ];
  const orderEdges = [
    { id: 'A->B', source: 'A', target: 'B' },
    { id: 'A->C', source: 'A', target: 'C' },
    { id: 'B->D', source: 'B', target: 'D' },
    { id: 'C->E', source: 'C', target: 'E' },
    { id: 'C->F', source: 'C', target: 'F' },
  ];
  const path = getSuggestedOrder(orderNodes, orderEdges);
  // C desbloquea más, pero B es del cuatrimestre inmediato.
  assert.deepEqual(path.chain, ['A', 'B', 'D']);
});

test('si el cuatrimestre inmediato no abre camino, sigue por el siguiente cuatrimestre con sucesoras', () => {
  const orderNodes = [
    { code: 'A', status: 'Pendiente', year: 1, cuatrimestre: 1 },
    { code: 'B', status: 'Pendiente', year: 1, cuatrimestre: 2 },
    { code: 'C', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'D', status: 'Pendiente', year: 2, cuatrimestre: 2 },
  ];
  const orderEdges = [
    { id: 'A->B', source: 'A', target: 'B' },
    { id: 'A->C', source: 'A', target: 'C' },
    { id: 'C->D', source: 'C', target: 'D' },
  ];
  const path = getSuggestedOrder(orderNodes, orderEdges);
  // B no desbloquea nada; C abre D. El camino salta el cuatrimestre muerto.
  assert.deepEqual(path.chain, ['A', 'C', 'D']);
});

test('dentro del cuatrimestre, el camino sigue la correlativa que más desbloquea', () => {
  const orderNodes = [
    { code: 'A', status: 'Pendiente', year: 1, cuatrimestre: 1 },
    { code: 'B', status: 'Pendiente', year: 1, cuatrimestre: 2 },
    { code: 'C', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'D', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'E', status: 'Pendiente', year: 1, cuatrimestre: 2 },
  ];
  const orderEdges = [
    { id: 'A->B', source: 'A', target: 'B' },
    { id: 'B->C', source: 'B', target: 'C' },
    { id: 'B->D', source: 'B', target: 'D' },
    { id: 'A->E', source: 'A', target: 'E' },
  ];
  const path = getSuggestedOrder(orderNodes, orderEdges);
  // B y E comparten cuatrimestre; B desbloquea 2 y E no desbloquea nada.
  assert.deepEqual(path.chain, ['A', 'B', 'C']);
  assert.deepEqual([...path.set].sort(), ['A', 'B', 'C']);
  assert.deepEqual([...path.edgeSet].sort(), ['A->B', 'B->C']);
});

test('el camino respeta la correlatividad de cada paso', () => {
  // B depende de S y de A: no puede entrar antes que A.
  const pasoNodes = [
    { code: 'S', status: 'Pendiente', year: 1, cuatrimestre: 1 },
    { code: 'A', status: 'Pendiente', year: 1, cuatrimestre: 2 },
    { code: 'B', status: 'Pendiente', year: 2, cuatrimestre: 1 },
  ];
  const pasoEdges = [
    { id: 'S->A', source: 'S', target: 'A' },
    { id: 'S->B', source: 'S', target: 'B' },
    { id: 'A->B', source: 'A', target: 'B' },
  ];
  const path = getSuggestedOrder(pasoNodes, pasoEdges);
  assert.deepEqual(path.chain, ['S', 'A', 'B']);
  assert.deepEqual([...path.edgeSet].sort(), ['A->B', 'S->A', 'S->B']);
});

test('el camino arranca desde el avance actual (las aprobadas quedan fuera)', () => {
  const avanceNodes = [
    { code: 'A', status: 'Pendiente', year: 1, cuatrimestre: 1 },
    { code: 'B', status: 'Pendiente', year: 1, cuatrimestre: 2 },
    { code: 'C', status: 'Pendiente', year: 2, cuatrimestre: 1 },
    { code: 'D', status: 'Aprobada', year: 2, cuatrimestre: 2 },
  ];
  const path = getSuggestedOrder(avanceNodes, edges);
  assert.deepEqual(path.chain, ['A', 'B', 'C']);
  assert.deepEqual([...path.set].sort(), ['A', 'B', 'C']);
  // Las flechas entre pendientes forman el recorrido; la aprobada queda fuera.
  assert.deepEqual([...path.edgeSet].sort(), ['A->B', 'B->C']);
  assert.equal(path.hasCycle, false);
});

test('un ciclo entre correlativas impide calcular el orden sugerido', () => {
  const cicloNodes = [
    { code: 'X', status: 'Pendiente', year: 1, cuatrimestre: 1 },
    { code: 'Y', status: 'Pendiente', year: 1, cuatrimestre: 2 },
  ];
  const cicloEdges = [
    { id: 'X->Y', source: 'X', target: 'Y' },
    { id: 'Y->X', source: 'Y', target: 'X' },
  ];
  const path = getSuggestedOrder(cicloNodes, cicloEdges);
  assert.equal(path.hasCycle, true);
  assert.equal(path.chain.length, 0);
});

test('sin materias pendientes el orden sugerido es vacío', () => {
  const aprobadas = [
    { code: 'A', status: 'Aprobada' },
    { code: 'B', status: 'Aprobada' },
  ];
  const path = getSuggestedOrder(aprobadas, edges);
  assert.equal(path.chain.length, 0);
  assert.equal(path.hasCycle, false);
});
