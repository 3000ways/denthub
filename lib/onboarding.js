// Shared constants + helpers for the onboarding quiz and the homepage
// "Recommended for you" personalization. Kept in one place so the questions the
// user answers and the logic that acts on the answers can never drift apart.

// Q1 — career stage. A "when in your career" axis, distinct from profiles.role
// (which is a job type: Dentist / Hygienist / …). Stored on profiles.career_stage.
export const CAREER_STAGES = [
  'Student',
  'New grad',
  'Associate',
  'Practice owner',
  'Specialist',
  'Retiring',
  'Retired',
];

// Q2 — specialty. `label` is what the user sees; `value` is the canonical tag that
// matches the resource `Specialty` field (so a pick lines up with personalization
// and the homepage specialty filter). Stored on profiles.specialty.
export const QUIZ_SPECIALTIES = [
  { label: 'General practice', value: 'General Dentistry' },
  { label: 'Endodontics',      value: 'Endodontics' },
  { label: 'Periodontics',     value: 'Periodontics' },
  { label: 'Orthodontics',     value: 'Orthodontics' },
  { label: 'Oral surgery',     value: 'Oral Surgery' },
  { label: 'Prosthodontics',   value: 'Prosthodontics' },
  { label: 'Pediatric',        value: 'Pediatric Dentistry' },
  { label: 'Oral radiology',   value: 'Oral Radiology' },
];

// Q3 — focus areas (pick up to 3). Each maps to one or more resource Topic tags
// (the homepage TOPICS list). We store the `label` the user clicked on
// profiles.focus_areas, then translate to topics at render time via focusTopics().
export const MAX_FOCUS = 3;

// Each focus maps to the canonical homepage topics PLUS the legacy Topic tag
// names still present on ~125 Airtable records (e.g. 'Dental Technology',
// 'Practice Management', 'Mindset & Performance'). Including them here keeps
// those resources recommendable without a data cleanup in Airtable.
export const FOCUS_OPTIONS = [
  { label: 'Growing production',         topics: ['Practice Growth', 'Practice Management', 'Entrepreneurship'] },
  { label: 'Hiring or building a team',  topics: ['Team & HR', 'Practice Management'] },
  { label: 'Technology',                 topics: ['Technology', 'Dental Technology'] },
  { label: 'Marketing',                  topics: ['Marketing'] },
  { label: 'Finance or tax',             topics: ['Finance & Investment'] },
  { label: 'Work-life balance',          topics: ['Wellness', 'Mindset & Performance'] },
  { label: 'Clinical skills',            topics: ['Clinical', 'Clinical Techniques', 'CE & Education', 'Implants', 'Specialty Topics'] },
  { label: 'Practice transition or sale',topics: ['Finance & Investment', 'Leadership'] },
];

// Turn the stored focus-area labels into the set of resource Topic tags they imply.
export function focusTopics(focusAreas) {
  const set = new Set();
  (focusAreas || []).forEach(label => {
    const opt = FOCUS_OPTIONS.find(o => o.label === label);
    (opt?.topics || []).forEach(t => set.add(t));
  });
  return set;
}

// Read a resource's Topic tags into a plain string array. The Airtable field can
// come back as a string or an array of strings.
function resourceTopics(fields) {
  const t = fields?.Topic;
  if (Array.isArray(t)) return t;
  return t ? [t] : [];
}

// Read a resource's Specialty tags. The field can be a string, an array of strings,
// or an array of Airtable option objects ({ name }).
function resourceSpecialties(fields) {
  const s = fields?.Specialty;
  if (Array.isArray(s)) return s.map(x => x?.name || x);
  return s ? [s] : [];
}

// Score how well a resource fits a person's quiz answers. A focus/topic hit is
// weighted above a specialty hit because focus areas are the more intentional,
// specific signal (specialty like "General Dentistry" is very broad).
//   returns { any, score } — `any` is whether it matched at all.
export function relevanceFor(fields, { focusAreas, specialty } = {}) {
  const topics = focusTopics(focusAreas);
  const resTopics = resourceTopics(fields);
  const topicHits = topics.size ? resTopics.filter(t => topics.has(t)).length : 0;

  const resSpecs = resourceSpecialties(fields);
  const specHit = specialty && resSpecs.includes(specialty) ? 1 : 0;

  const score = topicHits * 2 + specHit;
  return { any: score > 0, score };
}

// Rank a resource list by relevance to the profile, then by Final Score as the
// tie-breaker. Only returns resources that matched at all, capped at `limit`.
export function recommendResources(resources, profile, limit = 6) {
  if (!profile) return [];
  const answers = { focusAreas: profile.focus_areas, specialty: profile.specialty };
  if (!focusTopics(answers.focusAreas).size && !answers.specialty) return [];

  return resources
    .map(r => ({ r, rel: relevanceFor(r.fields, answers) }))
    .filter(x => x.rel.any)
    .sort((a, b) =>
      b.rel.score - a.rel.score ||
      (b.r.fields['Final Score'] || 0) - (a.r.fields['Final Score'] || 0)
    )
    .slice(0, limit)
    .map(x => x.r);
}
