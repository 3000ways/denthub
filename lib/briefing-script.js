// Journal Briefings — the script templates (pure, unit-tested).
//
// A briefing is a list of segments, each spoken by the HOST (Grace) or the
// READER (Adrian). Everything the reader says is a published abstract,
// verbatim (cleaned for the ear at render time). Everything the host says
// comes from these templates and from the papers' own Conclusions, so nothing
// is invented and no language model is needed to draft a weekly episode.
//
// Segment: { kind, speaker: 'host'|'reader', text, article_id?, label? }
//   kinds: welcome, disclosure, headlines, handoff, abstract, short_version,
//          headline_slot, close, trailer

export const VOICES = { host: 'Grace', reader: 'Adrian' };
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
  seg.push({ kind: 'disclosure', speaker: 'host', text: '[calm] A quick word before we start. This briefing is written from the published abstracts and narrated by synthetic voices. Links to every paper are on the episode page.' });

  // Headlines: the lead paper, then up to four more by title, then "and N more".
  if (fullReads.length) {
    const lead = fullReads[0];
    let h = `Today's headline: ${cleanTitle(lead.title)}, from ${say(lead.journal_abbr)}.`;
    const more = fullReads.slice(1, 5).map(a => `${cleanTitle(a.title)}, from ${say(a.journal_abbr)}`);
    if (more.length) h += ` Also this week: ${joinList(more)}.`;
    const rest = total - 1 - more.length;
    if (rest > 0) h += ` And ${rest} more.`;
    seg.push({ kind: 'headlines', speaker: 'host', text: h });
  }

  fullReads.forEach((a, i) => {
    const by = spokenAuthors(a.authors);
    const lead = i === 0 ? 'First' : i === fullReads.length - 1 ? 'And finally' : 'Next';
    seg.push({ kind: 'handoff', speaker: 'host', article_id: a.id,
      text: `${lead}, ${cleanTitle(a.title)}, from ${say(a.journal_abbr)}${by ? `, by ${by}` : ''}.${i === 0 ? ` ${VOICES.reader} has the abstract.` : ''}` });
    const secs = Array.isArray(a.abstract) ? a.abstract : [];
    secs.forEach(s => {
      if (!s.text) return;
      seg.push({ kind: 'abstract', speaker: 'reader', article_id: a.id, label: s.label || null, text: s.text });
    });
    const sv = shortVersion(secs);
    if (sv) seg.push({ kind: 'short_version', speaker: 'host', article_id: a.id, text: `The short version: ${sv}` });
  });

  if (headlines.length) {
    seg.push({ kind: 'headline_slot', speaker: 'host', text: `[calm] ${headlines.length === 1 ? 'One more paper' : `${headlines.length} more papers`} this week, in brief.` });
    headlines.forEach(a => {
      const sv = shortVersion(a.abstract);
      seg.push({ kind: 'headline_slot', speaker: 'host', article_id: a.id,
        text: `${cleanTitle(a.title)}, from ${say(a.journal_abbr)}.${sv ? ` ${sv}` : ''}` });
    });
  }

  seg.push({ kind: 'close', speaker: 'host', text: `[warm] That's ${show} for the week of ${date}. Every paper, with links, is on the episode page, and a new briefing arrives every Monday. Safe drive.` });

  // Welcome, now that we can estimate length.
  const minutes = Math.max(2, Math.round(estimateSeconds(seg) / 60));
  const n = total === 1 ? 'One new paper' : `${total} new papers`;
  const read = fullReads.length < total ? `, ${fullReads.length} read in full` : '';
  seg[0].text = `[warm] Welcome to ${show}, from The Dental Commute. This is what's new in ${label} for the week of ${date}. ${n} from ${joinList(journals)}${read}, about ${minutes} minutes.`;
  return seg;
}

// Episode 0: Grace alone, about ninety seconds, explaining the show.
export function buildTrailerScript({ show, label, journalNames = [] }) {
  const js = joinList(journalNames);
  return [
    { kind: 'trailer', speaker: 'host', text: `[warm] Welcome to ${show}, from The Dental Commute.` },
    { kind: 'trailer', speaker: 'host', text: `Every Monday, this show reads you the week's new research from the leading journals in ${label}: ${js}. Each paper's abstract is read exactly as it was published, followed by a one-line takeaway drawn from the authors' own conclusions.` },
    { kind: 'trailer', speaker: 'host', text: `[calm] Two things you should know. The narration is synthetic: a host voice and a reader voice, generated by a computer, and we say so in every episode. And nothing here is advice. It is the literature, read aloud, so you can decide what deserves a closer look.` },
    { kind: 'trailer', speaker: 'host', text: `Each paper is its own chapter. If one isn't for you, skip to the next with the forward button on your headphones or in your car. The full list of papers, with links, is on the episode page at The Dental Commute dot com. The first briefing arrives this Monday. Safe drive.` },
  ];
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

// Show notes for the episode description / RSS: what was read, with links.
export function showNotes({ show, weekOf, fullReads = [], headlines = [], kind = 'weekly' }) {
  if (kind === 'trailer') return `${show}: a weekly, AI-narrated reading of the week's new research. Episode 0 explains the show.`;
  const lines = [`${show} · week of ${spokenDate(weekOf)}. Abstracts read verbatim; narration is synthetic.`, ''];
  fullReads.forEach((a, i) => lines.push(`${i + 1}. ${cleanTitle(a.title)} — ${spokenAuthors(a.authors) || 'authors'}. ${a.journal_name || a.journal_abbr}. ${a.url || ''}`.trim()));
  if (headlines.length) {
    lines.push('', 'In brief:');
    headlines.forEach(a => lines.push(`• ${cleanTitle(a.title)} — ${a.journal_name || a.journal_abbr}. ${a.url || ''}`.trim()));
  }
  return lines.join('\n');
}

// Weekly cost formula (Soniox published token prices). Returns cents.
export function sonioxCostCents({ chars = 0, audioSeconds = 0 }) {
  const inputTokens = chars * 0.3;
  const outputTokens = audioSeconds / 3600 * 30000;
  return (inputTokens / 1e6 * 400) + (outputTokens / 1e6 * 2150);
}
