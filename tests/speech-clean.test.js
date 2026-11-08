// Run: npm test   (node --test tests)
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanForSpeech, sectionHeading } from '../lib/speech-clean.js';
import { rankTier, isExcludedPubType } from '../lib/journals.js';

test('strips URLs, DOIs, PMIDs, registrations, emails and citation markers', () => {
  const { text, removed } = cleanForSpeech(
    'Registered in PROSPERO (CRD42023456789). See https://example.org/x and doi:10.1016/j.joen.2026.01.001 [12]. Contact a.b@uni.edu. PMID: 42971465.'
  );
  assert.doesNotMatch(text, /https?:|10\.1016|CRD4|@|\[12\]|PMID/);
  const rules = removed.map(r => r.rule);
  for (const r of ['url', 'doi', 'pmid', 'registry', 'email', 'citation']) assert.ok(rules.includes(r), `expected rule ${r}`);
  assert.match(text, /registered in advance|PROSPERO/);
});

test('rewrites statistics into words and keeps the numbers', () => {
  const { text } = cleanForSpeech('Failure differed (RR = 1.12, 95% CI 0.84–1.49; p = 0.43; I2 = 61%) with n = 20 per group.');
  assert.match(text, /risk ratio 1\.12/);
  assert.match(text, /95 percent confidence interval 0\.84 to 1\.49/);
  assert.match(text, /p equals point four three/);
  assert.match(text, /I squared equals 61%/);
  assert.match(text, /n equals 20/);
});

test('symbols and units become words', () => {
  const { text } = cleanForSpeech('Torque ≥ 35 Ncm, length 12 mm ± 0.5, 37 °C, 5 mL vs. control.');
  assert.match(text, /at least 35 newton centimetres/);
  assert.match(text, /12 millimetres plus or minus 0\.5/);
  assert.match(text, /37 degrees Celsius/);
  assert.match(text, /5 millilitres versus control/);
});

test('keeps meaningful numbers and names untouched', () => {
  const { text } = cleanForSpeech('Sabeti and Wang included 14 studies and 1,236 teeth; success was 87.5% at 5 years.');
  assert.match(text, /14 studies/);
  assert.match(text, /1,236 teeth/);
  assert.match(text, /87\.5%/);
  assert.match(text, /Sabeti and Wang/);
});

test('pronunciation dictionary applies whole words, case-insensitively', () => {
  const { text } = cleanForSpeech('Periapical lesions and periapical healing.', { pronunciations: [{ from: 'periapical', to: 'perry-apical' }] });
  assert.equal(text, 'perry-apical lesions and perry-apical healing.');
});

test('tidies punctuation left behind by stripping', () => {
  const { text } = cleanForSpeech('Methods were preregistered (https://osf.io/abc) , and analysed.');
  assert.equal(text, 'Methods were preregistered, and analysed.');
});

test('section headings are spoken as headings', () => {
  assert.equal(sectionHeading('RESULTS'), 'Results.');
  assert.equal(sectionHeading(''), '');
});

test('publication types rank and exclude as designed', () => {
  assert.equal(rankTier(['Journal Article', 'Systematic Review']), 1);
  assert.equal(rankTier(['Randomized Controlled Trial']), 2);
  assert.equal(rankTier(['Comparative Study']), 3);
  assert.equal(rankTier(['Journal Article']), 4);
  assert.equal(rankTier(['Case Reports']), 5);
  assert.equal(isExcludedPubType(['Letter']), true);
  assert.equal(isExcludedPubType(['Journal Article', 'Published Erratum']), true);
  assert.equal(isExcludedPubType(['Journal Article']), false);
});

test('minimal mode strips links and identifiers but rewords nothing (ND-licensed abstracts)', () => {
  const src = 'Success was 92% (p < 0.05; 95% CI 81–91), n = 120. Registered at https://clinicaltrials.gov NCT01234567. Mean 3.2 mm.';
  const full = cleanForSpeech(src).text;
  const min = cleanForSpeech(src, { minimal: true }).text;
  assert.ok(!/https?:|NCT0123/.test(min), 'links and registry ids are still removed');
  assert.ok(/p < 0\.05/.test(min), 'statistics are left as written');
  assert.ok(/3\.2 mm/.test(min), 'units are left as written');
  assert.ok(/p less than point oh five/.test(full), 'normal mode still rewrites');
  assert.equal(cleanForSpeech('periapical lesion', { minimal: true, pronunciations: [{ from: 'periapical', to: 'perry-apical' }] }).text, 'perry-apical lesion');
});
