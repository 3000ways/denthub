// AI Voice disclosure — shared classification helpers.
//
// The editorial record lives in two Airtable fields on the Resources table:
//   • "Voice Type"   — Human | AI-generated | Mixed
//   • "Voice Status" — Suspected | Confirmed
//
// ⚠️ False-positive rule (see the "AI Voice disclosure" roadmap theme): wrongly
// labeling a real human's show as AI is insulting/defamatory. So a guess —
// whether from a listener report or a bot heuristic — is only ever "Suspected"
// and stays INTERNAL. Nothing is shown publicly (badge OR exclude filter) until
// a human (Andrei) sets Voice Status = Confirmed. `isPublicAiVoice` is the single
// gate every public surface must go through.

export const VOICE_TYPES    = ['Human', 'AI-generated', 'Mixed'];
export const VOICE_STATUSES = ['Suspected', 'Confirmed'];

// Airtable field accessors — tolerant of a missing/partial fields object.
export function voiceType(fields = {}) { return (fields && fields['Voice Type']) || ''; }
export function voiceStatus(fields = {}) { return (fields && fields['Voice Status']) || ''; }

// The public gate: an AI-generated (or partially-AI "Mixed") show that a human
// has CONFIRMED. This — and only this — drives the public badge and the
// listener-facing "hide AI-narrated podcasts" filter.
export function isPublicAiVoice(fields = {}) {
  const t = voiceType(fields);
  return (t === 'AI-generated' || t === 'Mixed') && voiceStatus(fields) === 'Confirmed';
}

// Badge copy. "Mixed" is disclosed as partial so we never overstate. Returns
// null when there's nothing to show publicly.
export function aiVoiceBadge(fields = {}) {
  if (!isPublicAiVoice(fields)) return null;
  const partial = voiceType(fields) === 'Mixed';
  return {
    label: partial ? '🤖 Partial AI voice' : '🤖 AI voice',
    title: partial
      ? 'This show uses a mix of human and AI-generated narration (verified by our team).'
      : 'This show is narrated by an AI-generated voice (verified by our team).',
  };
}
