import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countCrossings,
  orderColumnsForCrossings,
} from '../src/utils/academicOrdering.ts';

const subject = code => ({ code });
const codes = columns => columns.map(column => column.map(item => item.code));
const crossingGraph = {
  columns: [[subject('A'), subject('B')], [subject('C'), subject('D')]],
  edges: [
    { source: 'A', target: 'D' },
    { source: 'B', target: 'C' },
  ],
};

test('countCrossings counts a crossing between two edges', () => {
  assert.equal(
    countCrossings(crossingGraph.columns, crossingGraph.edges),
    1,
  );
});

test('orderColumnsForCrossings removes the crossing without changing column membership', () => {
  const ordered = orderColumnsForCrossings(
    crossingGraph.columns,
    crossingGraph.edges,
  );

  assert.equal(countCrossings(ordered, crossingGraph.edges), 0);
  assert.deepEqual(codes(ordered), [['A', 'B'], ['D', 'C']]);
});

test('orderColumnsForCrossings keeps the original order when there are no edges', () => {
  const columns = [
    [subject('B'), subject('A')],
    [subject('D'), subject('C')],
  ];

  assert.deepEqual(codes(orderColumnsForCrossings(columns, [])), [
    ['B', 'A'],
    ['D', 'C'],
  ]);
});

test('countCrossings ignores edges that share an endpoint', () => {
  const columns = [
    [subject('A')],
    [subject('B'), subject('C'), subject('D')],
  ];
  const edges = [
    { source: 'A', target: 'C' },
    { source: 'A', target: 'B' },
  ];

  assert.equal(countCrossings(columns, edges), 0);
});

test('orderColumnsForCrossings is deterministic for equal barycenters', () => {
  const columns = [
    [subject('A'), subject('B')],
    [subject('C'), subject('D')],
  ];
  const edges = [
    { source: 'A', target: 'C' },
    { source: 'B', target: 'D' },
  ];

  assert.deepEqual(
    codes(orderColumnsForCrossings(columns, edges)),
    codes(orderColumnsForCrossings(columns, edges)),
  );
});

test('orderColumnsForCrossings does not create or drop subjects', () => {
  const columns = [
    [subject('A'), subject('B'), subject('C')],
    [subject('D'), subject('E')],
  ];
  const edges = [
    { source: 'A', target: 'E' },
    { source: 'B', target: 'D' },
    { source: 'C', target: 'E' },
  ];

  const ordered = orderColumnsForCrossings(columns, edges);
  assert.deepEqual(
    ordered.map(column => column.length),
    [3, 2],
  );
  assert.deepEqual(
    codes(ordered).flat().sort(),
    ['A', 'B', 'C', 'D', 'E'],
  );
});
