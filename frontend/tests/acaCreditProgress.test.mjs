import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAcaCredits } from '../src/utils/acaCreditProgress.ts';

const activity = (category, credits, interactionHours = 0) => ({
  _id: `${category}-${credits}-${interactionHours}`,
  userStudyPlan: 'plan',
  title: 'Actividad',
  category,
  credits,
  interactionHours,
});

test('requires four CRE in each category for the intermediate title', () => {
  const summary = summarizeAcaCredits([
    activity('UC', 4),
    activity('EF', 4),
    activity('INSTITUTO', 4),
  ]);
  assert.equal(summary.intermediateComplete, true);
  assert.equal(summary.degreeComplete, false);
});

test('does not let one category replace another or ignore the 75-hour rule', () => {
  const uneven = summarizeAcaCredits([
    activity('UC', 8),
    activity('EF', 4),
  ]);
  assert.equal(uneven.intermediateComplete, false);
  assert.equal(uneven.intermediateCredits, 8);

  const withoutHours = summarizeAcaCredits([
    activity('UC', 10),
    activity('EF', 10),
    activity('INSTITUTO', 10),
    activity('UC', 0.01, 74.5),
  ]);
  assert.equal(withoutHours.degreeComplete, false);
});

test('completes the degree requirement at 30 CRE with 75 pedagogical hours', () => {
  const summary = summarizeAcaCredits([
    activity('UC', 10),
    activity('EF', 10),
    activity('INSTITUTO', 10),
    activity('UC', 0.5, 75),
  ]);
  assert.equal(summary.degreeComplete, true);
});
