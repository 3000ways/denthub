// Journal Briefings — the specialty clusters and their journals.
//
// Single source of truth for which journals feed which weekly show. The
// database `journals` table is seeded from this list (migration 0025) and the
// admin Briefings tab edits the live rows (spoken name, active); this file is
// the code default and the shape every consumer relies on.
//
//   key          — cluster key, also the podcast show key ("endo" → "Endodontics This Week")
//   show         — the show's directory title
//   pick         — matching "I'm a…" pick key (lib/specialties.js), or null
//   journals[]   — pubmed_abbr is the PubMed journal title abbreviation ([ta] search);
//                  spoken_name is what the host voice says ("from the J-O-E");
//                  filter (optional) is an extra PubMed clause for broad medical journals.
//
// Volumes per week were measured against PubMed for the 8 weeks ending
// 2026-11-08 with letters/editorials/comments/errata excluded; see
// docs/journal-briefings-build-plan.md.

export const CLUSTERS = [
  { key: 'endo', label: 'Endodontics', show: 'Endodontics This Week', pick: 'endo', journals: [
    { pubmed_abbr: 'J Endod',      name: 'Journal of Endodontics',          spoken_name: 'the J-O-E',                 society: 'AAE' },
    { pubmed_abbr: 'Int Endod J',  name: 'International Endodontic Journal', spoken_name: 'the I-E-J',                 society: 'ESE / BES' },
    { pubmed_abbr: 'Eur Endod J',  name: 'European Endodontic Journal',      spoken_name: 'the European Endo Journal', society: null },
  ] },
  { key: 'ortho', label: 'Orthodontics', show: 'Orthodontics This Week', pick: 'ortho', journals: [
    { pubmed_abbr: 'Am J Orthod Dentofacial Orthop', name: 'American Journal of Orthodontics and Dentofacial Orthopedics', spoken_name: 'A-J-O-D-O',  society: 'AAO' },
    { pubmed_abbr: 'Angle Orthod',                   name: 'The Angle Orthodontist',                                      spoken_name: 'the Angle',  society: 'EHASO' },
    { pubmed_abbr: 'Eur J Orthod',                   name: 'European Journal of Orthodontics',                            spoken_name: 'the E-J-O',  society: 'EOS' },
  ] },
  { key: 'perio', label: 'Periodontics', show: 'Periodontics This Week', pick: 'perio', journals: [
    { pubmed_abbr: 'J Periodontol',          name: 'Journal of Periodontology',          spoken_name: 'the Journal of Periodontology',   society: 'AAP' },
    { pubmed_abbr: 'J Clin Periodontol',     name: 'Journal of Clinical Periodontology', spoken_name: 'the J-C-P',                       society: 'EFP' },
    { pubmed_abbr: 'Clin Oral Implants Res', name: 'Clinical Oral Implants Research',    spoken_name: 'Clinical Oral Implants Research', society: 'EAO' },
  ] },
  { key: 'prostho', label: 'Prosthodontics', show: 'Prosthodontics This Week', pick: 'prostho', journals: [
    { pubmed_abbr: 'J Prosthet Dent',   name: 'Journal of Prosthetic Dentistry',           spoken_name: 'the J-P-D',                 society: null },
    { pubmed_abbr: 'J Prosthodont',     name: 'Journal of Prosthodontics',                 spoken_name: 'the Journal of Prosthodontics', society: 'ACP' },
    { pubmed_abbr: 'Int J Prosthodont', name: 'International Journal of Prosthodontics',   spoken_name: 'the I-J-P',                 society: null },
  ] },
  { key: 'oms', label: 'Oral & maxillofacial surgery', show: 'Oral Surgery This Week', pick: 'oms', journals: [
    { pubmed_abbr: 'J Oral Maxillofac Surg',     name: 'Journal of Oral and Maxillofacial Surgery',               spoken_name: 'the J-O-M-S',     society: 'AAOMS' },
    { pubmed_abbr: 'Int J Oral Maxillofac Surg', name: 'International Journal of Oral and Maxillofacial Surgery', spoken_name: 'the I-J-O-M-S',   society: 'IAOMS' },
    { pubmed_abbr: 'Br J Oral Maxillofac Surg',  name: 'British Journal of Oral and Maxillofacial Surgery',       spoken_name: 'the British Journal', society: 'BAOMS' },
  ] },
  { key: 'pedo', label: 'Pediatric dentistry', show: 'Pediatric Dentistry This Week', pick: 'pedo', journals: [
    { pubmed_abbr: 'Pediatr Dent',           name: 'Pediatric Dentistry',                           spoken_name: 'Pediatric Dentistry',          society: 'AAPD' },
    { pubmed_abbr: 'Int J Paediatr Dent',    name: 'International Journal of Paediatric Dentistry', spoken_name: 'the International Journal',    society: 'IAPD / BSPD' },
    { pubmed_abbr: 'Eur Arch Paediatr Dent', name: 'European Archives of Paediatric Dentistry',     spoken_name: 'the European Archives',         society: 'EAPD' },
  ] },
  { key: 'radiology', label: 'Oral & maxillofacial radiology', show: 'Oral Radiology This Week', pick: null, journals: [
    { pubmed_abbr: 'Dentomaxillofac Radiol',                     name: 'Dentomaxillofacial Radiology', spoken_name: 'Dentomaxillofacial Radiology', society: 'IADMFR' },
    { pubmed_abbr: 'Oral Surg Oral Med Oral Pathol Oral Radiol', name: 'Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology', spoken_name: 'Triple-O', society: null },
    { pubmed_abbr: 'Oral Radiol',                                name: 'Oral Radiology',               spoken_name: 'Oral Radiology',               society: 'JSOMR' },
  ] },
  { key: 'pathology', label: 'Oral & maxillofacial pathology', show: 'Oral Pathology This Week', pick: null, journals: [
    { pubmed_abbr: 'J Oral Pathol Med',                          name: 'Journal of Oral Pathology and Medicine', spoken_name: 'the Journal of Oral Pathology and Medicine', society: null },
    { pubmed_abbr: 'Oral Surg Oral Med Oral Pathol Oral Radiol', name: 'Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology', spoken_name: 'Triple-O', society: null },
    { pubmed_abbr: 'Head Neck Pathol',                           name: 'Head and Neck Pathology',                spoken_name: 'Head and Neck Pathology',    society: null },
  ] },
  { key: 'oralmed', label: 'Oral medicine', show: 'Oral Medicine This Week', pick: null, journals: [
    { pubmed_abbr: 'Oral Dis',                                   name: 'Oral Diseases',                           spoken_name: 'Oral Diseases', society: null },
    { pubmed_abbr: 'J Oral Pathol Med',                          name: 'Journal of Oral Pathology and Medicine',  spoken_name: 'the Journal of Oral Pathology and Medicine', society: null },
    { pubmed_abbr: 'Oral Surg Oral Med Oral Pathol Oral Radiol', name: 'Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology', spoken_name: 'Triple-O', society: null },
  ] },
  { key: 'pain', label: 'Orofacial pain', show: 'Orofacial Pain This Week', pick: null, journals: [
    { pubmed_abbr: 'J Oral Facial Pain Headache', name: 'Journal of Oral and Facial Pain and Headache', spoken_name: 'the Journal of Oral and Facial Pain', society: 'AAOP' },
    { pubmed_abbr: 'J Oral Rehabil',              name: 'Journal of Oral Rehabilitation',                spoken_name: 'the Journal of Oral Rehabilitation', society: null },
    { pubmed_abbr: 'Cranio',                      name: 'CRANIO',                                        spoken_name: 'Cranio',                          society: null },
  ] },
  { key: 'anesthesia', label: 'Dental anesthesiology', show: 'Dental Anesthesia This Week', pick: null, journals: [
    { pubmed_abbr: 'Anesth Prog',            name: 'Anesthesia Progress',                             spoken_name: 'Anesthesia Progress', society: 'ADSA' },
    { pubmed_abbr: 'J Dent Anesth Pain Med', name: 'Journal of Dental Anesthesia and Pain Medicine',  spoken_name: 'the Journal of Dental Anesthesia', society: 'KDSA' },
    { pubmed_abbr: 'Paediatr Anaesth',       name: 'Pediatric Anesthesia',                            spoken_name: 'Pediatric Anesthesia', society: null,
      filter: '(dental[tiab] OR dentistry[tiab] OR tooth[tiab] OR teeth[tiab] OR oral surgery[tiab])' },
  ] },
  { key: 'publichealth', label: 'Dental public health', show: 'Dental Public Health This Week', pick: null, journals: [
    { pubmed_abbr: 'Community Dent Oral Epidemiol', name: 'Community Dentistry and Oral Epidemiology', spoken_name: 'Community Dentistry and Oral Epidemiology', society: null },
    { pubmed_abbr: 'J Public Health Dent',          name: 'Journal of Public Health Dentistry',        spoken_name: 'the Journal of Public Health Dentistry', society: 'AAPHD' },
    { pubmed_abbr: 'Community Dent Health',         name: 'Community Dental Health',                   spoken_name: 'Community Dental Health', society: 'BASCD' },
  ] },
  { key: 'general', label: 'General dentistry', show: 'Dentistry This Week', pick: 'general', journals: [
    { pubmed_abbr: 'J Am Dent Assoc', name: 'The Journal of the American Dental Association', spoken_name: 'JADA',                          society: 'ADA' },
    { pubmed_abbr: 'J Dent Res',      name: 'Journal of Dental Research',                     spoken_name: 'the Journal of Dental Research', society: 'IADR' },
    { pubmed_abbr: 'J Dent',          name: 'Journal of Dentistry',                           spoken_name: 'the Journal of Dentistry',       society: null },
  ] },
  { key: 'implants', label: 'Implant dentistry', show: 'Implant Dentistry This Week', pick: null, journals: [
    { pubmed_abbr: 'Clin Oral Implants Res',        name: 'Clinical Oral Implants Research',                  spoken_name: 'Clinical Oral Implants Research', society: 'EAO' },
    { pubmed_abbr: 'Int J Oral Maxillofac Implants', name: 'International Journal of Oral and Maxillofacial Implants', spoken_name: 'the J-O-M-I', society: 'AO' },
    { pubmed_abbr: 'Clin Implant Dent Relat Res',   name: 'Clinical Implant Dentistry and Related Research', spoken_name: 'Clinical Implant Dentistry', society: null },
  ] },
];

export function findCluster(key) {
  return CLUSTERS.find(c => c.key === key) || null;
}

// PubMed publication types that are not papers. Dropped at harvest.
export const EXCLUDED_PUB_TYPES = [
  'Letter', 'Editorial', 'Comment', 'Published Erratum', 'News', 'Retraction of Publication',
  'Retracted Publication', 'Biography', 'Interview', 'Congress', 'Address', 'Portrait',
  'Expression of Concern', 'Autobiography', 'Lecture', 'Newspaper Article', 'Patient Education Handout',
];

// Reading order inside a briefing (lower tier reads first). Decided from
// PubMed publication types; 4 is the default for ordinary research papers.
export function rankTier(pubTypes = []) {
  const t = new Set((pubTypes || []).map(s => String(s).toLowerCase()));
  if (t.has('meta-analysis') || t.has('systematic review')) return 1;
  if (t.has('randomized controlled trial') || t.has('clinical trial') || t.has('clinical trial, phase iii') || t.has('clinical trial, phase ii')) return 2;
  if (t.has('comparative study') || t.has('multicenter study') || t.has('observational study') || t.has('cohort studies') || t.has('clinical study')) return 3;
  if (t.has('case reports')) return 5;
  return 4;
}

export function isExcludedPubType(pubTypes = []) {
  const ex = new Set(EXCLUDED_PUB_TYPES.map(s => s.toLowerCase()));
  return (pubTypes || []).some(p => ex.has(String(p).toLowerCase()));
}
