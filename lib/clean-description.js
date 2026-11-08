// Tidies text that arrives from podcast feeds and listings before visitors see it.
// Pure: no I/O. Deliberately narrow: it removes only boilerplate we have actually
// seen in feeds, because a looser rule could eat a real sentence.

const INVISIBLE = /[​-‍⁠﻿]/g;

// "** SOME SPONSOR FREE CONSULT: https://… or text 321-521-3133" at the very start.
const LEAD_PROMO = /^\s*\*\*[^*:]{0,200}:\s*(?:https?:\/\/\S+|\b[\w-]+\.(?:com|org|net|co)\b\S*)(?:\s+or text\s+[\d-]+)?(?:\s*Use code \S+ for [^!.]{0,60}[!.])?\s*/i;

// A short promo with a link, closed off by a long divider ("———————").
const LEAD_DIVIDER = /^[\s\S]{0,250}?https?:\/\/[\s\S]{0,200}?[—–_=-]{6,}\s*/;

export function cleanEpisodeDescription(text) {
  let t = (text || '').replace(INVISIBLE, '');
  // Buzzsprout's button labels, which arrive glued to the text around them.
  t = t.replace(/Send us Fan Mail\s*(?:Support the show(?=[A-Z]|\s|$))?/g, ' ');
  t = t.replace(/Support the show(?=[A-Z])/g, ' ');
  t = t.replace(/\s*Support the show\.?\s*$/, '');
  for (let i = 0; i < 4 && LEAD_PROMO.test(t); i += 1) t = t.replace(LEAD_PROMO, '');
  t = t.replace(LEAD_DIVIDER, '').replace(/^\s*\*\*\s*/, '');
  return t.replace(/\s+/g, ' ').trim();
}

// The first sentence of a description. A full stop after a title or an initial
// ("Dr. Chang", "J. Smith") doesn't end a sentence.
export function firstSentence(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.split(/(?<=[.!?])(?<!\b(?:Dr|Drs|Mr|Mrs|Ms|Prof|St|vs|No|Inc|Ltd|Jr|Sr|[A-Z])\.)\s/)[0] || t;
}
