import test from 'node:test';
import assert from 'node:assert/strict';
import { getDirectSuccessorCodes, tintStatusSvg } from '../src/utils/graphHighlight.ts';

const edges = [
  { id: 'ab', source: 'A', target: 'B' },
  { id: 'ac', source: 'A', target: 'C' },
  { id: 'ba', source: 'B', target: 'A' },
];

test('devuelve solo sucesores directos del nodo seleccionado', () => {
  assert.deepEqual(getDirectSuccessorCodes(edges, 'A'), new Set(['B', 'C']));
  assert.deepEqual(getDirectSuccessorCodes(edges, null), new Set());
});

test('tiñe trazos SVG sin reemplazar el fondo ni los trazos transparentes', () => {
  const svg = '<svg><path stroke="#000" fill="none"/><circle fill="transparent"/></svg>';
  assert.equal(
    tintStatusSvg(svg, '#0D9488'),
    '<svg><path stroke="#0D9488" fill="none"/><circle fill="transparent"/></svg>',
  );
});

test('escapa colores antes de insertarlos en el SVG', () => {
  assert.equal(
    tintStatusSvg('<svg><path fill="#000"/></svg>', '" onload="x'),
    '<svg fill="&quot; onload=&quot;x"><path fill="&quot; onload=&quot;x"/></svg>',
  );
});
