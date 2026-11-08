// The "I'm a…" specialty picker on the home page.
//
// One pick ties together three things that already exist under different
// names: the resource-level `Specialty` multi-select (e.g. 'Endodontics'), the
// episode-level quiz tag the AI tagger writes (`quiz_tags`, e.g. 'Endodontics'
// / 'General practice' / 'Oral surgery'), and the audience label a visitor
// recognises ("Endodontist"). Keep this list the single source of truth so the
// hero card, the episode search and the Discover feed all scope the same way.
//
//   specialty — value in resources.specialty (null = no resource-level filter)
//   tag/kind  — quiz_options row that scopes episodes (kind: interest | career)

export const SPECIALTY_PICKS = [
  { key: 'general',   label: 'General dentist',   short: 'General',   specialty: 'General Dentistry',  tag: 'General practice', kind: 'interest' },
  { key: 'endo',      label: 'Endodontist',       short: 'Endo',      specialty: 'Endodontics',        tag: 'Endodontics',      kind: 'interest' },
  { key: 'ortho',     label: 'Orthodontist',      short: 'Ortho',     specialty: 'Orthodontics',       tag: 'Orthodontics',     kind: 'interest' },
  { key: 'perio',     label: 'Periodontist',      short: 'Perio',     specialty: 'Periodontics',       tag: 'Periodontics',     kind: 'interest' },
  { key: 'oms',       label: 'Oral surgeon',      short: 'OMS',       specialty: 'Oral Surgery',       tag: 'Oral surgery',     kind: 'interest' },
  { key: 'prostho',   label: 'Prosthodontist',    short: 'Prostho',   specialty: 'Prosthodontics',     tag: 'Prosthodontics',   kind: 'interest' },
  { key: 'pedo',      label: 'Pediatric dentist', short: 'Pediatric', specialty: 'Pediatric Dentistry', tag: 'Pediatric',       kind: 'interest' },
  { key: 'hygienist', label: 'Hygienist',         short: 'Hygienist', specialty: null,                 tag: 'Dental Hygiene',   kind: 'interest' },
  { key: 'student',   label: 'Student',           short: 'Student',   specialty: null,                 tag: 'Student',          kind: 'career' },
];

export function findPick(key) {
  if (!key) return null;
  return SPECIALTY_PICKS.find(p => p.key === key) || null;
}

// Map a profile's free-form specialty ("Endodontics", "General Dentistry") to a
// pick key so a signed-in dentist's picker defaults to their profile answer.
export function pickKeyForProfileSpecialty(specialty) {
  if (!specialty) return null;
  const s = String(specialty).toLowerCase();
  const hit = SPECIALTY_PICKS.find(p => p.specialty && p.specialty.toLowerCase() === s);
  return hit ? hit.key : null;
}

// "32 min", "1 h 08 min", or null when the feed gave no duration.
export function formatMinutes(secs) {
  const n = Number(secs);
  if (!Number.isFinite(n) || n <= 0) return null;
  const m = Math.round(n / 60);
  if (m < 1) return '1 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${String(rem).padStart(2, '0')} min` : `${h} h`;
}
