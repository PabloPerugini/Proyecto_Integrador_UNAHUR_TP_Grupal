import test from 'node:test';
import assert from 'node:assert/strict';

import { buildConfirmPayload } from '../src/utils/planImport.ts';

const base = {
  fileHash: 'hash1',
  fileName: 'plan.pdf',
  careerId: 'carrera1',
  name: 'Plan 2026',
  subjects: [{ code: 'MAT001' }],
};

test('sin marcar el plan oficial, el payload envía official false', () => {
  assert.equal(buildConfirmPayload(base).official, false);
  assert.equal(buildConfirmPayload({ ...base, official: false }).official, false);
});

test('marcado el plan oficial, el payload envía official true', () => {
  assert.equal(buildConfirmPayload({ ...base, official: true }).official, true);
});

test('el payload conserva los datos del plan y completa los créditos', () => {
  const payload = buildConfirmPayload({
    ...base,
    creditsFinal: undefined,
    creditsIntermediate: undefined,
    intermediateTitle: undefined,
  });

  assert.equal(payload.fileHash, 'hash1');
  assert.equal(payload.fileName, 'plan.pdf');
  assert.equal(payload.careerId, 'carrera1');
  assert.equal(payload.name, 'Plan 2026');
  assert.deepEqual(payload.subjects, base.subjects);
  assert.equal(payload.creditsFinal, 0);
  assert.equal(payload.creditsIntermediate, 0);
  assert.equal(payload.intermediateTitle, null);
});
