// Run: npm test   (node --test tests)
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanEpisodeDescription as clean, firstSentence } from '../lib/clean-description.js';

test('removes the Buzzsprout button labels', () => {
  assert.equal(clean('Send us Fan Mail Support the showEnd of year audit'), 'End of year audit');
  assert.equal(clean('A good talk. Send us Fan Mail More notes here.'), 'A good talk. More notes here.');
  assert.equal(clean('A good talk. Support the show'), 'A good talk.');
});

test('keeps "support the show" when it is a real sentence', () => {
  const t = 'If you want to Support the show please leave a review.';
  assert.equal(clean(t), t);
});

test('removes sponsor blocks at the very start, including several in a row', () => {
  assert.equal(
    clean('** TWINLEAF FINANCIAL FREE CONSULT: ⁠https://www.twinleafadv.com/ or text 321-521-3133 What type of job?'),
    'What type of job?',
  );
  assert.equal(
    clean('** IMPACT SUMMIT REGISTRATION LINK: towerimpactsummit.com Use code DRHALEY30 for 30% off your ticket! ** TWINLEAF FINANCIAL FREE CONSULT: https://www.twinleafadv.com/ or text 321-521-3133 Getting married'),
    'Getting married',
  );
});

test('removes a link promo closed by a divider', () => {
  assert.equal(
    clean('UK Dentists: Collect your verifiable CPD here >>> https://courses.example.com/smart-money———————————VAT is creeping in'),
    'VAT is creeping in',
  );
});

test('leaves ordinary descriptions and mid-text sponsors alone', () => {
  const t = 'Dr. Smith on molar endo. Visit https://example.com for notes. Sponsored by Acme.';
  assert.equal(clean(t), t);
  assert.equal(clean(''), '');
  assert.equal(clean(null), '');
});

test('firstSentence does not stop at titles or initials', () => {
  assert.equal(firstSentence('A highly clinical weekly podcast by Dr. Jaz Gulati. It covers lots.'), 'A highly clinical weekly podcast by Dr. Jaz Gulati.');
  assert.equal(firstSentence('Hosted by J. Smith today! More.'), 'Hosted by J. Smith today!');
  assert.equal(firstSentence('One sentence only'), 'One sentence only');
});
