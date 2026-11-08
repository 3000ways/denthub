import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSummary, sharedRun, numbersIn, spelledNumbers, summaryCostCents, NGRAM } from '../lib/briefing-summary.js';

const abstract = [
  { label: 'INTRODUCTION', text: 'Root resection is performed for endodontic or periodontal reasons.' },
  { label: 'METHODS', text: 'A systematic review was conducted of randomized and cohort studies published between 2000 and 2024.' },
  { label: 'RESULTS', text: 'Fourteen studies were included (n = 1,236). Pooled survival was 92.5% at 5 years and 87% at 10 years (95% CI 81–91).' },
  { label: 'CONCLUSIONS', text: 'Available evidence does not demonstrate a difference between indications.' },
];
const good = 'The authors ran a systematic review covering randomized and cohort work from 2000 through 2024, pulling together 14 studies and 1236 resected roots. '
  + 'They looked at how resected teeth fared when the reason was endodontic versus periodontal. Survival came out at 92.5% at the 5 year mark and 87% by 10 years, with the confidence interval running 81 to 91 at the later point. '
  + 'The team found nothing to separate the two indications on these numbers, and they frame the finding as reassuring for clinicians weighing a resection either way, while noting the evidence base remains modest in size.';

test('a faithful own-words summary passes', () => {
  const r = checkSummary(good, abstract);
  assert.deepEqual(r.problems, []);
  assert.ok(r.ok);
});

test('a run of eight shared words is caught', () => {
  const lifted = good.replace('The authors ran a systematic review', 'A systematic review was conducted of randomized and cohort studies published between');
  const r = checkSummary(lifted, abstract);
  assert.ok(r.problems.some(p => p.startsWith('copies the abstract')), r.problems.join(' | '));
  assert.equal(sharedRun('a b c d e f g h', 'x a b c d e f g h y'), 'a b c d e f g h');
  assert.equal(sharedRun('a b c d e f g', 'a b c d e f g'), null, 'seven words is below the threshold');
  assert.equal(NGRAM, 8);
});

test('a number the abstract never states is caught; formatting differences are tolerated', () => {
  const r = checkSummary(good.replace('87% by 10 years', '85% by 10 years'), abstract);
  assert.ok(r.problems.some(p => p.includes('85')), r.problems.join(' | '));
  assert.deepEqual(numbersIn('n = 1,236 and 92.5% and 5 years'), ['1236', '92.5', '5']);
  assert.ok(checkSummary(good, abstract).ok, '1236 matches 1,236 and 14 matches "Fourteen"');
  assert.deepEqual(spelledNumbers('Fourteen studies, twenty-one teeth, one hundred and five patients, two hundred'), ['14', '21', '105', '200']);
});

test('length, links and citation markers are rejected', () => {
  assert.ok(checkSummary('Too short.', abstract).problems.some(p => p.startsWith('too short')));
  assert.ok(checkSummary(good + ' See https://example.com for more.', abstract).problems.includes('contains a link or DOI'));
  assert.ok(checkSummary(good + ' As shown before [3].', abstract).problems.includes('contains citation markers'));
  assert.ok(checkSummary('', abstract).problems.includes('empty'));
});

test('summary cost uses the published sonar-pro prices plus a request fee', () => {
  // 1,000 input + 300 output tokens: $0.003 + $0.0045 + $0.005 request = 1.25 cents
  assert.ok(Math.abs(summaryCostCents({ prompt_tokens: 1000, completion_tokens: 300 }) - 1.25) < 0.001);
});
