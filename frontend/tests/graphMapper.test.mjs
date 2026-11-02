import test from 'node:test';
import assert from 'node:assert/strict';

import { mapGraphResponse } from '../src/utils/graphMapper.ts';

const plan = {
  name: 'Plan 2026',
  career: {
    _id: 'c1',
    name: 'Licenciatura en Informática',
    color: '',
    academicUnit: {
      _id: 'u1',
      name: 'Instituto de Tecnología e Ingeniería',
      color: '',
    },
  },
};

function response(overrides = {}) {
  return {
    title: 'Licenciatura en Informática · Plan 2026',
    color: null,
    nodes: [
      {
        id: 'A',
        planSubjectId: 'pa',
        code: 'A',
        name: 'Análisis',
        year: 1,
        cuatrimestre: 1,
        duration: 'ANUAL',
        credits: 4,
        kind: 'Materia',
        optional: false,
        intermediate: false,
        status: 'Pendiente',
        savedStatus: 'Pendiente',
        effectiveStatus: 'Disponible',
        position: { x: 0, y: 0 },
      },
      {
        id: 'B',
        planSubjectId: 'pb',
        code: 'B',
        name: 'Álgebra',
        year: 1,
        cuatrimestre: 2,
        duration: 'CUATRIMESTRAL',
        credits: 6,
        kind: 'Materia',
        optional: false,
        intermediate: true,
        status: 'Aprobada',
        savedStatus: 'Aprobada',
        effectiveStatus: 'Bloqueada',
        position: { x: 0, y: 140 },
      },
    ],
    edges: [{ id: 'A->B', source: 'A', target: 'B' }],
    availableNow: ['A'],
    criticalPath: ['A'],
    criticalPathCosts: [2],
    criticalPathCost: 2,
    criticalPathEdges: [],
    hasCycle: false,
    topologicalOrder: ['A', 'B'],
    targetPath: {
      target: 'B',
      chain: ['A', 'B'],
      chainCosts: [2, 1],
      cost: 3,
      edgeIds: ['A->B'],
      hasCycle: false,
    },
    stats: {
      total: 2,
      aprobadas: 0,
      pendientes: 2,
      disponibles: 1,
      bloqueadas: 1,
      enCurso: 0,
      regulares: 0,
      creditsTotal: 10,
      creditsAprobados: 0,
    },
    intermediate: { title: 'Tecnicatura', total: 1, aprobadas: 0, credits: 6, creditsAprob: 0 },
    ...overrides,
  };
}

test('mapea la respuesta del backend sin recalcular estados ni caminos', () => {
  const graph = mapGraphResponse(plan, response());

  assert.equal(graph.title, 'Licenciatura en Informática · Plan 2026');
  assert.equal(graph.color, undefined);
  assert.equal(graph.nodes[0].duration, 'A');
  assert.equal(graph.nodes[0].status, 'Disponible');
  assert.equal(graph.nodes[1].status, 'Bloqueada');
  assert.equal(graph.nodes[1].savedStatus, 'Aprobada');
  assert.deepEqual(graph.criticalPath, ['A']);
  assert.deepEqual(graph.criticalPathCosts, [2]);
  assert.equal(graph.criticalPathCost, 2);
  assert.deepEqual(graph.targetPath?.chain, ['A', 'B']);
  assert.equal(graph.targetPath?.cost, 3);
  assert.equal(graph.stats.bloqueadas, 1);
  assert.equal(graph.intermediate?.total, 1);
});

test('usa el título de la carrera cuando el backend no lo manda', () => {
  const graph = mapGraphResponse(plan, response({ title: '' }));

  assert.equal(graph.title, 'Licenciatura en Informática · Plan 2026');
});

test('conserva el color que manda el backend', () => {
  const graph = mapGraphResponse(plan, response({ color: '#123456' }));

  assert.equal(graph.color, '#123456');
});

test('normaliza un targetPath ausente a null', () => {
  const graph = mapGraphResponse(plan, response({ targetPath: null }));

  assert.equal(graph.targetPath, null);
});
