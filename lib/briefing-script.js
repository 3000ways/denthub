// Journal Briefings — the script templates (pure, unit-tested).
//
// A briefing is a list of segments, each spoken by the HOST (Grace) or the
// READER (Adrian). What the reader says depends on the paper's licence — the
// "hybrid format" decided 2026-11-08 after the legal review (see
// docs/journal-briefings-build-plan.md, "Format decision"):
//
//   read_mode 'hybrid'      (all-rights-reserved, the default) — the reader gives
//                           an original summary in the show's own words
//                           (lib/briefing-summary.js, checked against the
//                           abstract), then the host quotes the authors' first
//                           Conclusions sentence, explicitly attributed.
//   read_mode 'verbatim'    (CC BY / CC BY-NC family, publisher-hosted) — the
//                           reader reads the abstract as published; the host
//                           gives the one-line short version.
//   read_mode 'verbatim_nd' (CC ND family) — as verbatim, but rendered with
//                           strip-only cleaning (no rewording of statistics).
//   read_mode 'quote_only'  (summary failed its checks) — title and quoted
//                           conclusion only.
//
// Everything the host says comes from these templates and from the papers' own
// Conclusions; facts and numbers are the authors', the wording of summaries is
// ours. Cleaning for the ear happens at render time.
//
// Segment: { kind, speaker: 'host'|'reader', text, article_id?, label?, nd? }
//   kinds: welcome, disclosure, headlines, handoff, abstract, summary, quote,
//          short_version, headline_slot, close, trailer

import { CONTACT_EMAIL } from './contact.js';

export const VOICES = { host: 'Grace', reader: 'Adrian' };

// Licence → how much of the paper we may read aloud. Only a publisher-hosted
// open-access copy counts: a repository manuscript's licence may not cover the
// published abstract text PubMed gives us. Anything unknown is treated as
// all-rights-reserved (hybrid) — the safe default.
const VERBATIM_LICENSES = ['cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc0', 'public-domain', 'pd'];
const ND_LICENSES = ['cc-by-nd', 'cc-by-nc-nd'];
export function readModeFor({ oa_status, oa_license, oa_host_type } = {}) {
  const lic = String(oa_license || '').toLowerCase().trim();
  if (oa_status === 'open' && oa_host_type === 'publisher') {
    if (VERBATIM_LICENSES.includes(lic)) return 'verbatim';
    if (ND_LICENSES.includes(lic)) return 'verbatim_nd';
  }
  return 'hybrid';
}
export function licenceLabel(lic) {
  const l = String(lic || '').toLowerCase().trim();
  if (!l) return '';
  if (l === 'cc0') return 'CC0';
  if (l === 'public-domain' || l === 'pd') return 'public domain';
  if (l.startsWith('cc-')) return l.toUpperCase().replace(/-/g, ' ');
  return l;
}
export function licenceUrl(lic) {
  const l = String(lic || '').toLowerCase().trim();
  if (l === 'cc0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (l.startsWith('cc-')) return `https://creativecommons.org/licenses/${l.slice(3)}/`;
  return '';
}
const isVerbatim = mode => mode === 'verbatim' || mode === 'verbatim_nd';
export const TTS_MODEL = 'tts-rt-v2';
export const TTS_SPEED = 1.0;
export const CHARS_PER_SECOND = 11.3;   // measured in the voice test (Adrian, 2,492 chars → 221 s)
export const FULL_READS = 8;            // abstracts read in full per weekly briefing

const ORDINAL = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export function spokenDate(d) {
  const x = d instanceof Date ? d : new Date(`${d}T12:00:00Z`);
  const month = x.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${month} ${ORDINAL(x.getUTCDate())}, ${x.getUTCFullYear()}`;
}

export function surname(author) {
  const a = String(author || '').trim();
  if (!a) return '';
  const parts = a.split(/\s+/);
  return parts[parts.length - 1];
}
export function spokenAuthors(authors = []) {
  const names = (authors || []).map(surname).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and colleagues`;
}

export function cleanTitle(t) {
  return String(t || '').replace(/\s+/g, ' ').replace(/\.\s*$/, '').trim();
}

// The title as a host would say it: the part before the colon when the rest is
// a subtitle ("…: A Systematic Review and Meta-Analysis"), minus trailing
// study-type tags. The full title stays in the show notes.
export function spokenTitle(t) {
  let title = cleanTitle(t);
  const m = title.match(/^(.{20,}?)\s*[:–—]\s+(.+)$/);
  if (m && m[1].split(/\s+/).length >= 4) title = m[1].trim();
  title = title.replace(/\s*[(\[]\s*(?:an?\s+)?(?:in[- ]vitro|ex[- ]vivo|laboratory|pilot|exploratory|retrospective|prospective)\s+study\s*[)\]]\s*$/i, '');
  return title.replace(/[.,;]\s*$/, '').trim();
}

// What kind of study it is, in words a host can say ("a systematic review").
const STUDY_KINDS = [
  [/systematic review.*meta-analys|meta-analys.*systematic review/i, 'systematic review and meta-analysis'],
  [/meta-analys/i, 'meta-analysis'],
  [/systematic review/i, 'systematic review'],
  [/scoping review/i, 'scoping review'],
  [/umbrella review/i, 'umbrella review'],
  [/bibliometric/i, 'bibliometric analysis'],
  [/randomi[sz]ed/i, 'randomised trial'],
  [/prospective cohort|prospective clinical|prospective study/i, 'prospective clinical study'],
  [/retrospective/i, 'retrospective study'],
  [/cohort/i, 'cohort study'],
  [/cross-sectional/i, 'cross-sectional study'],
  [/case report|case series/i, 'case report'],
  [/in vitro|ex vivo|laboratory study|lab study/i, 'laboratory study'],
  [/finite element/i, 'finite element study'],
  [/survey|questionnaire/i, 'survey'],
  [/\breview\b/i, 'review'],
];
export function studyKind(a = {}) {
  const hay = `${cleanTitle(a.title)} || ${(a.pub_types || []).join(' ')}`;
  for (const [re, kind] of STUDY_KINDS) if (re.test(hay)) return kind;
  return '';
}

// Deterministic variety: the same week always builds the same script (so a
// re-draft is a cache hit), but consecutive papers never share a phrasing.
export function weekSeed(weekOf) {
  const s = String(weekOf || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const pick = (bank, seed, i) => bank[(seed + i) % bank.length];

// First sentence of the Conclusions (or the abstract's last section), clipped
// at a clause boundary so it stays one breath long.
export function shortVersion(abstract = [], max = 260) {
  const secs = Array.isArray(abstract) ? abstract : [];
  const concl = secs.find(s => /conclu/i.test(s.label || '')) || secs[secs.length - 1];
  if (!concl || !concl.text) return '';
  const first = concl.text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/)[0].trim();
  if (first.length <= max) return first;
  const head = first.slice(0, max);
  const cut = Math.max(head.lastIndexOf('; '), head.lastIndexOf(', '), head.lastIndexOf(' and '));
  return `${head.slice(0, cut > max * 0.5 ? cut : head.lastIndexOf(' ')).trim()}.`;
}

export function estimateSeconds(segments) {
  const chars = segments.reduce((n, s) => n + (s.text || '').length, 0);
  return Math.round(chars / CHARS_PER_SECOND + segments.length * 0.6); // ~0.6 s pause per segment
}

function joinList(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * buildWeeklyScript({ show, label, weekOf, fullReads, headlines, spokenName })
 *   show       — "Endodontics This Week"
 *   label      — "endodontics" (lower-case field name for the welcome line)
 *   weekOf     — Monday date (YYYY-MM-DD or Date)
 *   fullReads  — ordered article rows (id, title, authors, abstract, journal_abbr)
 *   headlines  — remaining article rows (30-second slot each)
 *   spokenName — fn(journal_abbr) → "the J-O-E"
 */
export function buildWeeklyScript({ show, label, weekOf, fullReads = [], headlines = [], spokenName }) {
  const say = abbr => (spokenName && spokenName(abbr)) || abbr;
  const seg = [];
  const total = fullReads.length + headlines.length;
  const journals = [...new Set([...fullReads, ...headlines].map(a => a.journal_abbr))].map(say);
  const date = spokenDate(weekOf);

  // Welcome (minutes filled in after the estimate below)
  seg.push({ kind: 'welcome', speaker: 'host', text: '' });
  seg.push({ kind: 'disclosure', speaker: 'host', text: `[calm] Quick housekeeping. For each paper, we tell you what the study did and what it found, in our own words, then quote the authors' conclusion, in theirs. Open-access papers get the full abstract, as published. ${VOICES.reader} and I are AI voices, this show isn't affiliated with any journal, and every link is on the episode page. Right. Headlines.` });

  // Headlines: the lead paper, then up to four more by title, then "and N more".
  if (fullReads.length) {
    const lead = fullReads[0];
    let h = `Today's headline: ${spokenTitle(lead.title)}, from ${say(lead.journal_abbr)}.`;
    const more = fullReads.slice(1, 5).map(a => `${spokenTitle(a.title)}, from ${say(a.journal_abbr)}`);
    if (more.length) h += ` Also this week: ${joinList(more)}.`;
    const rest = total - 1 - more.length;
    if (rest > 0) h += ` And ${rest} more.`;
    seg.push({ kind: 'headlines', speaker: 'host', text: h });
  }

  const seed = weekSeed(weekOf);
  const LEADS_MID = ['Next', 'Moving on', 'Next up', 'Also this week'];
  const HANDOFF = [
    (lead, kind, journal, by, title) => `${lead}: ${title}. ${kind ? `A ${kind} in` : 'In'} ${journal}${by ? `, from ${by}` : ''}.`,
    (lead, kind, journal, by, title) => `${lead}, ${kind ? `a ${kind}` : 'a paper'} from ${journal}. ${by ? `${by} on ` : ''}${title}.`,
    (lead, kind, journal, by, title) => `${lead}, from ${journal}: ${title}${by ? `, by ${by}` : ''}.`,
  ];
  const OA_NOTE = [
    `This one is open access, so ${VOICES.reader} reads the abstract as published.`,
    `It's open access under a Creative Commons licence, so you'll hear the abstract exactly as published.`,
    `Open access, Creative Commons, so ${VOICES.reader} has the full abstract.`,
  ];
  const READER_CUE = ['', `${VOICES.reader}?`, `Over to ${VOICES.reader}.`, ''];
  const LINK = [`Thanks, ${VOICES.reader}. `, 'Right. ', '', `Thanks, ${VOICES.reader}. `, 'Okay. '];
  const QUOTE_LEAD = ["In the authors' own words:", 'Their conclusion, word for word:', "Here's how the authors put it:", 'Straight from the paper:', "The authors' bottom line, verbatim:"];
  const SHORT_LEAD = ['The short version:', 'Boiled down, in their words:', 'In one line, from the authors:'];

  fullReads.forEach((a, i) => {
    const mode = a.read_mode || 'hybrid';
    const by = spokenAuthors(a.authors);
    const lead = i === 0 ? 'First up' : i === fullReads.length - 1 ? 'And finally' : pick(LEADS_MID, seed, i);
    const secs = Array.isArray(a.abstract) ? a.abstract : [];
    const sv = shortVersion(secs);
    const who = pick(HANDOFF, seed, i)(lead, studyKind(a), say(a.journal_abbr), by, spokenTitle(a.title));

    if (isVerbatim(mode)) {
      // Open-access paper: the abstract as published, then the short version.
      seg.push({ kind: 'handoff', speaker: 'host', article_id: a.id, text: `${who} ${pick(OA_NOTE, seed, i)}` });
      secs.forEach(s => {
        if (!s.text) return;
        seg.push({ kind: 'abstract', speaker: 'reader', article_id: a.id, label: s.label || null, text: s.text, ...(mode === 'verbatim_nd' ? { nd: true } : {}) });
      });
      if (sv) seg.push({ kind: 'short_version', speaker: 'host', article_id: a.id, text: `${pick(LINK, seed, i)}${pick(SHORT_LEAD, seed, i)} ${sv}` });
    } else if (mode === 'hybrid' && a.summary) {
      // All-rights-reserved paper: our summary, then the authors' own conclusion, attributed.
      const cue = i === 0 ? ` ${VOICES.reader}, take it away.` : (pick(READER_CUE, seed, i) ? ` ${pick(READER_CUE, seed, i)}` : '');
      seg.push({ kind: 'handoff', speaker: 'host', article_id: a.id, text: `${who}${cue}` });
      seg.push({ kind: 'summary', speaker: 'reader', article_id: a.id, text: a.summary });
      if (sv) seg.push({ kind: 'quote', speaker: 'host', article_id: a.id, text: `${pick(LINK, seed, i)}${pick(QUOTE_LEAD, seed, i)} ${sv}` });
    } else {
      // No usable summary: title and the authors' conclusion only.
      seg.push({ kind: 'handoff', speaker: 'host', article_id: a.id, text: who });
      if (sv) seg.push({ kind: 'quote', speaker: 'host', article_id: a.id, text: `The authors conclude: ${sv}` });
    }
  });

  if (headlines.length) {
    seg.push({ kind: 'headline_slot', speaker: 'host', text: `[calm] ${headlines.length === 1 ? 'One more paper' : `${headlines.length} more papers`} this week, in brief: the title, and the authors' bottom line.` });
    const BRIEF_LEAD = ['The authors conclude:', 'In their words:', 'Their conclusion:'];
    headlines.forEach((a, i) => {
      const sv = shortVersion(a.abstract);
      const kind = studyKind(a);
      const by = spokenAuthors(a.authors);
      // Rule: every paper is credited to its authors when it is covered, in brief or in depth.
      seg.push({ kind: 'headline_slot', speaker: 'host', article_id: a.id,
        text: `${spokenTitle(a.title)}${kind ? `, a ${kind}` : ''}, from ${say(a.journal_abbr)}${by ? `, by ${by}` : ''}.${sv ? ` ${pick(BRIEF_LEAD, seed, i)} ${sv}` : ''}` });
    });
  }

  seg.push({ kind: 'close', speaker: 'host', text: `[warm] That's ${show} for the week of ${date}. Every paper, with links, is on the episode page, and we're back next Monday. The research keeps moving. Now you can keep up. Safe drive.` });

  // Welcome, now that we can estimate length.
  const minutes = Math.max(2, Math.round(estimateSeconds(seg) / 60));
  const n = total === 1 ? 'One new paper' : `${total} new papers`;
  const depth = fullReads.length < total ? `, ${fullReads.length} covered in depth` : '';
  seg[0].text = `[warm] Welcome to ${show}, from The Dental Commute. Here's what's new in ${label} for the week of ${date}: ${n} from ${joinList(journals)}${depth}, in about ${minutes} minutes. You drive. We read.`;
  return seg;
}

// Episode 0: the introduction. Grace alone. When Andrei has written the
// intro in the admin (`briefing_shows.intro_script`, one paragraph per spoken
// segment), that text is used verbatim; otherwise the template below.
export function buildTrailerScript({ show, label, journalNames = [], customText = '' }) {
  const paras = String(customText || '').split(/\n\s*\n/).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (paras.length) return paras.map(text => ({ kind: 'trailer', speaker: 'host', text }));
  const js = joinList(journalNames);
  return [
    { kind: 'trailer', speaker: 'host', text: `[warm] Welcome to ${show}, from The Dental Commute.` },
    { kind: 'trailer', speaker: 'host', text: `Every Monday, this show brings you the week's new research from the leading journals in ${label}: ${js}. For each paper, we describe the study in our own words, numbers included, and then quote the authors' conclusion, in their words. When a paper is open access, we read its abstract exactly as published.` },
    { kind: 'trailer', speaker: 'host', text: `[calm] Two things you should know. The narration is synthetic: a host voice and a reader voice, generated by a computer, and we say so in every episode. And we're independent: this show isn't affiliated with any journal or publisher. It's the literature, explained, so you can decide what deserves a closer look.` },
    { kind: 'trailer', speaker: 'host', text: `Each paper is its own chapter. If one isn't for you, skip to the next with the forward button on your headphones or in your car. The full list of papers, with links, is on the episode page at The Dental Commute dot com. The first briefing arrives this Monday. Safe drive.` },
  ];
}

// The template intro as plain text (what the admin editor starts from).
export function defaultIntroText({ show, label, journalNames = [] }) {
  return buildTrailerScript({ show, label, journalNames }).map(s => s.text).join('\n\n');
}

// Chapter list from rendered segment durations: one chapter per paper read in
// full, plus the open and close. `durations` aligns with `segments`.
export function chaptersFrom(segments, durations, articlesById = {}) {
  const out = [];
  let t = 0, lastArticle = null;
  segments.forEach((s, i) => {
    const start = Math.round(t * 100) / 100;
    if (i === 0) out.push({ title: 'Welcome', start, article_id: null });
    else if (s.kind === 'handoff' && s.article_id !== lastArticle) {
      const a = articlesById[s.article_id];
      out.push({ title: a ? cleanTitle(a.title) : 'Paper', start, article_id: s.article_id });
      lastArticle = s.article_id;
    } else if (s.kind === 'headline_slot' && !out.some(c => c.title === 'In brief')) {
      out.push({ title: 'In brief', start, article_id: null });
    } else if (s.kind === 'close') out.push({ title: 'Close', start, article_id: null });
    t += Number(durations[i] || 0);
  });
  return out;
}

// Show notes for the episode description / RSS: what was covered, how (our
// summary vs the published abstract), with links, licence and credits.
export function showNotes({ show, weekOf, fullReads = [], headlines = [], kind = 'weekly' }) {
  if (kind === 'trailer') return `${show}: a weekly, AI-narrated briefing on the week's new research. Episode 0 explains the show. Independently produced by The Dental Commute; not affiliated with any journal or publisher.`;
  const lines = [`${show} · week of ${spokenDate(weekOf)}. Summaries are ours; quoted conclusions are the authors'. Open-access abstracts are read as published. Narration is synthetic.`, ''];
  const how = a => {
    const mode = a.read_mode || 'hybrid';
    if (isVerbatim(mode)) return `Open access${a.oa_license ? ` (${licenceLabel(a.oa_license)}${licenceUrl(a.oa_license) ? `, ${licenceUrl(a.oa_license)}` : ''})` : ''}: abstract read as published.`;
    if (mode === 'quote_only') return 'Title and quoted conclusion only.';
    return 'Summary in our words; conclusion quoted from the abstract.';
  };
  fullReads.forEach((a, i) => lines.push(`${i + 1}. ${cleanTitle(a.title)} — ${spokenAuthors(a.authors) || 'authors'}. ${a.journal_name || a.journal_abbr}. ${a.url || ''} ${how(a)}`.replace(/\s+/g, ' ').trim()));
  if (headlines.length) {
    lines.push('', 'In brief (title and quoted conclusion):');
    headlines.forEach(a => lines.push(`• ${cleanTitle(a.title)} — ${a.journal_name || a.journal_abbr}. ${a.url || ''}`.trim()));
  }
  lines.push('', `Independently produced by The Dental Commute. Not affiliated with or endorsed by any journal or publisher. Bibliographic data courtesy of the U.S. National Library of Medicine (PubMed). Rightsholder questions: ${CONTACT_EMAIL} — we act within 48 hours.`);
  return lines.join('\n');
}

// Weekly cost formula (Soniox published token prices). Returns cents.
export function sonioxCostCents({ chars = 0, audioSeconds = 0 }) {
  const inputTokens = chars * 0.3;
  const outputTokens = audioSeconds / 3600 * 30000;
  return (inputTokens / 1e6 * 400) + (outputTokens / 1e6 * 2150);
}
