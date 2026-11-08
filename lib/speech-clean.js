// Cleaning text for the ear — what runs on every abstract section and host line
// before it is sent to the speech engine (Journal Briefings).
//
// Rules (docs/journal-briefings-build-plan.md, "Cleaning text for the ear"):
//   • strip what should never be read aloud: URLs, DOIs, PubMed ids, trial and
//     review registration numbers, grant codes, email addresses, bracketed
//     citation markers, trademark/copyright symbols;
//   • rewrite statistics and symbols into words a listener can follow;
//   • keep every number that carries meaning;
//   • apply a pronunciation dictionary (admin-maintained) last.
//
// Pure and deterministic: no I/O, no randomness. Returns what it removed so a
// complaint can be traced to a rule.

const RULES_STRIP = [
  // URLs and bare domains
  { name: 'url',      re: /\bhttps?:\/\/[^\s)\]>,;]+|\bwww\.[^\s)\]>,;]+/gi },
  // DOIs, with or without a "doi:" prefix
  { name: 'doi',      re: /\b(?:doi:?\s*)?10\.\d{4,9}\/[^\s,;)]+/gi },
  // PubMed / PMC ids
  { name: 'pmid',     re: /\b(?:PMID|PMCID|PMC)\s*:?\s*\d+\b/gi },
  // Trial / review registrations
  { name: 'registry', re: /\b(?:NCT\d{8}|CRD\d{6,}|ISRCTN\d{8}|ChiCTR[-\w]*\d+|UMIN\d{9}|ACTRN\d{14}|CTRI\/\d{4}\/\d{2}\/\d+|DRKS\d{8}|IRCT\w*\d+|EudraCT\s*\d{4}-\d{6}-\d{2}|JPRN-\w+)\b/gi },
  // Grant / award codes: "grant 1R01DE012345", "No. R21DE028741-01A1", "#2021/12345-6"
  { name: 'grant',    re: /\b(?:grant|award|contract|project)\s*(?:no\.?|number|#)?\s*[:#]?\s*[A-Z0-9][A-Z0-9\/\-\.]{5,}\b/gi },
  // Email addresses
  { name: 'email',    re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  // Bracketed citation markers: [12], [3,4], [5-7], (12), (3, 4)
  { name: 'citation', re: /\s?\[(?:\d{1,3}(?:\s*[-–,]\s*\d{1,3})*)\]|\s?\((?:\d{1,3}(?:\s*[-–,]\s*\d{1,3})+)\)/g },
  // ®, ™, ©
  { name: 'symbol',   re: /[®™©]/g },
];

// Phrases that introduce an identifier we just stripped; the sentence usually
// reads fine with a short stand-in.
const REGISTRY_PHRASES = [
  { re: /\b(?:registered|registration)\s+(?:in|with|at|on|number|no\.?)?\s*(?:prospero|clinicaltrials\.gov|clinical\s*trials\.gov)\s*[:(]?\s*[),.]?/gi, to: ' registered in advance' },
  { re: /\bprospero\s*(?:registration|id|number|no\.?)?\s*[:(]?\s*\)?/gi, to: 'PROSPERO' },
  { re: /\bclinicaltrials\.gov\b/gi, to: 'the trial registry' },
];

const RULES_REWRITE = [
  // statistics
  { re: /\bn\s*=\s*(\d[\d,]*)/gi,                      to: 'n equals $1' },
  { re: /\bp\s*<\s*0?\.(\d+)/gi,                       to: (m, d) => `p less than point ${spellDigits(d)}` },
  { re: /\bp\s*≤\s*0?\.(\d+)/gi,                       to: (m, d) => `p at most point ${spellDigits(d)}` },
  { re: /\bp\s*>\s*0?\.(\d+)/gi,                       to: (m, d) => `p greater than point ${spellDigits(d)}` },
  { re: /\bp\s*=\s*0?\.(\d+)/gi,                       to: (m, d) => `p equals point ${spellDigits(d)}` },
  { re: /\b(\d{2,3})\s*%\s*CI\b/gi,                    to: '$1 percent confidence interval' },
  { re: /\bCI\s*[:=]?\s*(?=[\d(\[-])/g,                 to: 'confidence interval ' },
  { re: /\b(RR|OR|HR|MD|SMD|WMD)\s*[:=]\s*/g,           to: (m, k) => ({ RR: 'risk ratio ', OR: 'odds ratio ', HR: 'hazard ratio ', MD: 'mean difference ', SMD: 'standardized mean difference ', WMD: 'weighted mean difference ' }[k]) },
  { re: /\bI\s*²\s*=\s*/g,                              to: 'I squared equals ' },
  { re: /\bI2\s*=\s*/g,                                 to: 'I squared equals ' },
  // symbols
  { re: /±/g,                                           to: ' plus or minus ' },
  { re: /≥/g,                                           to: ' at least ' },
  { re: /≤/g,                                           to: ' at most ' },
  { re: /\s*(?:vs\.?|versus)\s+/gi,                     to: ' versus ' },
  { re: /(\d)\s*[–—-]\s*(\d)/g,                         to: '$1 to $2' },         // numeric ranges 0.8–1.4
  { re: /(\d)\s*×\s*(\d)/g,                             to: '$1 by $2' },
  { re: /°C\b/g,                                        to: ' degrees Celsius' },
  { re: /\bμm\b|\bµm\b/g,                               to: ' micrometres' },
  { re: /(\d)\s*mm\b/g,                                 to: '$1 millimetres' },
  { re: /(\d)\s*cm\b/g,                                 to: '$1 centimetres' },
  { re: /(\d)\s*mL\b/g,                                 to: '$1 millilitres' },
  { re: /(\d)\s*mg\b/g,                                 to: '$1 milligrams' },
  { re: /(\d)\s*Ncm\b/g,                                to: '$1 newton centimetres' },
  { re: /(\d)\s*kVp\b/g,                                to: '$1 kilovolts peak' },
  { re: /(\d)\s*MPa\b/g,                                to: '$1 megapascals' },
  { re: /(\d)\s*µSv\b|(\d)\s*μSv\b/g,                   to: '$1$2 microsieverts' },
  { re: /\be\.g\.,?/gi,                                 to: 'for example,' },
  { re: /\bi\.e\.,?/gi,                                 to: 'that is,' },
  { re: /\bet al\.?/gi,                                 to: 'and colleagues' },
];

function spellDigits(d) {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  return String(d).split('').map(ch => (ch === '0' ? 'oh' : words[Number(ch)] || ch)).join(' ');
}

function tidy(text) {
  return text
    .replace(/\(\s*\)/g, '')              // empty parens left by a strip
    .replace(/\s+([,.;:!?])/g, '$1')      // space before punctuation
    .replace(/([,.;:])\1+/g, '$1')        // doubled punctuation
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s*,/g, '(')
    .trim();
}

/**
 * cleanForSpeech(text, { pronunciations, minimal })
 *   pronunciations: [{ from: 'periapical', to: 'perry-apical' }, …] applied last,
 *   whole-word, case-insensitive.
 *   minimal: strip-only. Removes what must never be read aloud (links, DOIs,
 *   registry numbers…) and applies pronunciations, but rewrites NOTHING — no
 *   statistics or units are reworded. Used for abstracts published under a
 *   Creative Commons NoDerivatives licence, where rewording could count as an
 *   adaptation; a format shift (text → speech) alone does not.
 * Returns { text, removed: [{ rule, match }] }.
 */
export function cleanForSpeech(input, { pronunciations = [], minimal = false } = {}) {
  let text = String(input || '');
  const removed = [];

  for (const { name, re } of RULES_STRIP) {
    text = text.replace(re, (m) => { removed.push({ rule: name, match: m }); return ' '; });
  }
  if (!minimal) {
    for (const { re, to } of REGISTRY_PHRASES) text = text.replace(re, to);
    for (const { re, to } of RULES_REWRITE) text = text.replace(re, to);
  }

  for (const p of pronunciations) {
    if (!p || !p.from) continue;
    const esc = String(p.from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`\\b${esc}\\b`, 'gi'), p.to || '');
  }

  return { text: tidy(text), removed };
}

// A section heading spoken as a heading: "Results." with a pause after.
export function sectionHeading(label) {
  const l = String(label || '').trim();
  if (!l) return '';
  const nice = l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
  return `${nice}.`;
}
