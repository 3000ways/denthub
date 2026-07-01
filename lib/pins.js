// Shared helpers for the Community Pinboard — used by both the board (display)
// and the pin button (live preview) so the attribution line reads identically.

// Maps a profile specialty value to the practitioner noun used in attribution,
// e.g. "Periodontics" → "periodontist" ("Pinned by a periodontist in Ohio").
const SPECIALTY_NOUN = {
  'General Dentistry':              'general dentist',
  'Endodontics':                    'endodontist',
  'Orthodontics':                   'orthodontist',
  'Periodontics':                   'periodontist',
  'Oral & Maxillofacial Surgery':   'oral surgeon',
  'Prosthodontics':                 'prosthodontist',
  'Pediatric Dentistry':            'pediatric dentist',
  'Oral Medicine':                  'oral medicine specialist',
  'Oral Pathology':                 'oral pathologist',
  'Dental Public Health':           'dental public health specialist',
  'Dental Anesthesiology':          'dental anesthesiologist',
  'Dental Student':                 'dental student',
  'Other':                          'dental professional',
};

// The generic fallback when we have no specialty (anonymous or incomplete profile).
export const GENERIC_PINNER = 'dental professional';

export function specialtyNoun(specialty) {
  return SPECIALTY_NOUN[specialty] || GENERIC_PINNER;
}

// "a" vs "an" based on the leading vowel sound (good enough for our fixed noun set).
function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

// Builds the attribution line from a pin's snapshot fields.
// Examples:
//   { specialty:'Periodontics', region:'Ohio' } -> "Pinned by a periodontist in Ohio"
//   { specialty:'Endodontics' }                 -> "Pinned by an endodontist"
//   { anonymous:true }                          -> "Pinned by a dental professional"
export function attributionLine({ specialty, region, anonymous } = {}) {
  const noun = anonymous ? GENERIC_PINNER : specialtyNoun(specialty);
  const base = `Pinned by ${article(noun)} ${noun}`;
  return region && !anonymous ? `${base} in ${region}` : base;
}
