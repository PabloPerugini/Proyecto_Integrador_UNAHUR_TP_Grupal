const test = require("node:test");
const assert = require("node:assert/strict");
const { shouldValidatePrerequisites } = require("../src/services/subjectProgressService");

test("validates prerequisites for new progress but allows Libre and pending", () => {
  assert.equal(shouldValidatePrerequisites("CURSANDO", undefined), true);
  assert.equal(shouldValidatePrerequisites("LIBRE", undefined), false);
  assert.equal(shouldValidatePrerequisites("PENDIENTE", undefined), false);
});

test("preserves already registered progress without rechecking prerequisites", () => {
  assert.equal(shouldValidatePrerequisites("APROBADA", "CURSANDO"), false);
  assert.equal(shouldValidatePrerequisites("REGULARIZADA", "APROBADA"), false);
  assert.equal(shouldValidatePrerequisites("CURSANDO", "LIBRE"), true);
});
