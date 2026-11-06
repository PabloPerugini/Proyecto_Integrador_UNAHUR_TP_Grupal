import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutAcademicEdges, roundedOrthogonalPath } from '../src/utils/academicEdgeLayout.ts';

test('devuelve un layout vacío cuando no hay columnas académicas', async () => {
  const layout = await layoutAcademicEdges([], [], { layout: async () => ({}) });
  assert.deepEqual(layout, { positions: {}, yearWidths: {}, routes: {} });
});

test('redondea esquinas sin alterar segmentos rectos', () => {
  assert.equal(
    roundedOrthogonalPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 2),
    'M 0 0 L 8 0 Q 10 0 10 2 L 10 10',
  );
});

test('elimina puntos consecutivos duplicados al construir la ruta', () => {
  assert.equal(
    roundedOrthogonalPath([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }]),
    'M 0 0 L 5 0',
  );
});
