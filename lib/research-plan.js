// The research agent's target list. The admin picks a GROUP (a resource type
// like "Podcasts"); the agent then cycles through that group's SUBCATEGORIES,
// running one focused web search per subcategory — narrower queries find deeper,
// more relevant results than one broad "find dental podcasts" sweep.
//
// Each subcategory carries a deterministic `type` + `specialty`. We set those on
// the new resource ourselves (from the niche being searched) rather than trust
// the AI to guess them — the search target already tells us the answer, and it
// keeps resources filterable on the homepage (which groups by Type × Specialty).
//
// Note on tagging/scoring: the agent does NOT set quiz tags or scores. Quiz tags
// are per-episode and handled by the episode tagger after a resource is approved
// and its feed is harvested; the five scores are computed by the scoring engine.
// `specialty` here is the basic homepage-filter field (set at creation, no
// dedicated agent), not a quiz tag.

// Airtable Specialty field vocabulary (must match the app's list exactly).
export const SPECIALTIES = [
  'General Dentistry', 'Endodontics', 'Orthodontics', 'Periodontics', 'Oral Surgery',
  'Prosthodontics', 'Pediatric Dentistry', 'Oral Radiology', 'Dental Anesthesiology', 'Pain',
];

// Build the per-specialty subcategory rows for a "media" type (podcasts/YouTube),
// where searching one specialty at a time is what gives depth.
function bySpecialty(type, noun, specialties) {
  return specialties.map(s => ({
    label: `${s} ${noun}`,
    type,
    specialty: s,
    query: `${s.toLowerCase()} ${noun.toLowerCase()} for dentists`,
  }));
}

const CORE_SPECIALTIES = [
  'General Dentistry', 'Endodontics', 'Orthodontics', 'Periodontics',
  'Oral Surgery', 'Prosthodontics', 'Pediatric Dentistry',
];

// group label (what the admin picks) → ordered list of subcategories to cycle.
export const RESEARCH_PLAN = {
  Podcasts: [
    ...bySpecialty('Podcast', 'Podcasts', CORE_SPECIALTIES),
    { label: 'Dental Student Podcasts',     type: 'Podcast', specialty: 'General Dentistry', query: 'dental student and pre-dental podcasts' },
    { label: 'Practice Management Podcasts', type: 'Podcast', specialty: 'General Dentistry', query: 'dental practice management and business podcasts' },
    { label: 'Dental Technology Podcasts',   type: 'Podcast', specialty: 'General Dentistry', query: 'dental technology, digital dentistry and CAD/CAM podcasts' },
  ],
  YouTube: [
    ...bySpecialty('YouTube', 'YouTube Channels', CORE_SPECIALTIES),
    { label: 'Dental Student YouTube', type: 'YouTube', specialty: 'General Dentistry', query: 'dental student education YouTube channels' },
  ],
  Books: [
    ...bySpecialty('Book', 'Books', CORE_SPECIALTIES),
  ],
  'CE Courses': [
    { label: 'General CE Platforms',       type: 'Course', specialty: 'General Dentistry', query: 'online dental continuing education (CE) course platforms' },
    { label: 'Implant CE',                 type: 'Course', specialty: 'Oral Surgery',      query: 'dental implant continuing education courses' },
    { label: 'Endodontic CE',              type: 'Course', specialty: 'Endodontics',       query: 'endodontic continuing education courses' },
    { label: 'Orthodontic / Aligner CE',   type: 'Course', specialty: 'Orthodontics',      query: 'orthodontic and clear aligner continuing education courses' },
  ],
  Software: [
    { label: 'Practice Management Software', type: 'Software', specialty: 'General Dentistry', query: 'dental practice management software' },
    { label: 'Imaging / CBCT Software',      type: 'Software', specialty: 'Oral Radiology',    query: 'dental imaging and CBCT software' },
    { label: 'Dental AI Tools',              type: 'Software', specialty: 'General Dentistry', query: 'dental AI tools and software' },
    { label: 'Clear Aligner Software',       type: 'Software', specialty: 'Orthodontics',      query: 'clear aligner and orthodontic planning software' },
  ],
  Communities: [
    { label: 'Dental Communities', type: 'Community', specialty: 'General Dentistry', query: 'online communities and membership groups for dentists' },
    { label: 'Dental Forums',      type: 'Community', specialty: 'General Dentistry', query: 'active online forums for dentists' },
  ],
  Coaching: [
    { label: 'Dental Coaching',   type: 'Coaching',   specialty: 'General Dentistry', query: 'dental practice coaching and consulting programs' },
    { label: 'Mastermind Groups', type: 'Mastermind', specialty: 'General Dentistry', query: 'dental mastermind groups' },
  ],
};

export const RESEARCH_GROUPS = Object.keys(RESEARCH_PLAN);

// A flat list of every subcategory, tagged with its group — handy for the
// coverage panel (which shows one row per subcategory across all groups).
export function allSubcategories() {
  return RESEARCH_GROUPS.flatMap(group =>
    RESEARCH_PLAN[group].map(sub => ({ group, ...sub }))
  );
}

// The friendly noun used in prompts / progress ("up to 8 podcasts").
export function typeNoun(type) {
  const map = {
    Podcast: 'podcasts', YouTube: 'YouTube channels', Book: 'books', Course: 'CE course platforms',
    Software: 'software products', Community: 'communities', Coaching: 'coaching programs', Mastermind: 'mastermind groups',
  };
  return map[type] || 'resources';
}
