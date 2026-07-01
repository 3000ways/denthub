// ─────────────────────────────────────────────────────────────────────────────
// Automated scoring engine — shared math.
//
// The site's Final Score is an Airtable formula (Expert 25% + Community 25% +
// Popularity 20% + Recency 15% + Clinical Depth 15%). We never write Final
// Score directly; we compute the five 0–100 sub-scores from REAL signals and
// write those, and Airtable recomputes the composite.
//
// Design principles (see the "automated scoring" plan):
//   1. Ground every score in a measurable signal, not an LLM guess.
//   2. Compare each resource to its PEERS (percentile within its type), so a
//      YouTube channel's subscriber count and a podcast's review count aren't
//      forced onto the same absolute axis.
//   3. Shrink thin-data scores toward a neutral prior (Bayesian) so a brand-new
//      resource with 3 data points can't shoot to 100 — the anti-gaming lever.
//
// This module is pure (no I/O), so it is unit-testable on its own.
// ─────────────────────────────────────────────────────────────────────────────

export function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function round(n) {
  return Math.round(n);
}

// Percentile rank of `value` within `peers` (0–100). This is our main
// normalizer for signals that only make sense relative to a peer group
// (subscriber counts, review counts, etc.). Ties share the midpoint rank.
// An empty/single peer set returns the neutral 50 (no basis to rank).
export function percentile(value, peers) {
  const xs = (peers || []).filter(v => typeof v === 'number' && !isNaN(v));
  if (value == null || isNaN(value)) return 0;
  if (xs.length <= 1) return 50;
  let below = 0, equal = 0;
  for (const v of xs) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  // Mid-rank: count everything below plus half the ties.
  return clamp(round(((below + equal / 2) / xs.length) * 100));
}

// Bayesian shrinkage of a 0–100 sub-score toward a prior, by evidence count.
// `observed` is the raw 0–100 score, `n` is how many data points backed it,
// `prior` is the neutral baseline to fall back to (default 50), and `k` is the
// confidence constant — the number of data points at which observed and prior
// carry equal weight. Small n → pulled toward prior; large n → trust observed.
//   shrink(90, n=2,  prior=50, k=10) → ≈57  (barely any evidence)
//   shrink(90, n=40, prior=50, k=10) → ≈82  (lots of evidence)
export function shrink(observed, n, prior = 50, k = 10) {
  if (observed == null || isNaN(observed)) return null;
  const count = Math.max(0, n || 0);
  return clamp(round((observed * count + prior * k) / (count + k)));
}

// Map a raw count (subscribers, votes, reviews…) to 0–100 on a log scale, where
// `mid` is the count that should land near 50. Diminishing returns at the top.
// Used as a fallback when there's no peer set to percentile against.
export function logScore(value, mid) {
  if (!value || value <= 0) return 0;
  if (!mid || mid <= 0) return 0;
  const score = 100 * (Math.log10(value + 1) / (2 * Math.log10(mid + 1)));
  return clamp(round(score));
}

// ── Recency ──────────────────────────────────────────────────────────────────
// Fully deterministic. Combines two things: freshness (how long since the last
// piece of content) and cadence (how much it published recently). A show that
// dropped an episode yesterday and posts weekly scores near the top; one that
// went quiet a year ago scores near the floor.
//   freshnessDays  — days since the most recent episode/video/upload
//   itemsLast90    — number of items published in the last 90 days
// Weighting: 70% freshness, 30% cadence (staying active matters most).
export function recencyScore({ freshnessDays, itemsLast90 } = {}) {
  if (freshnessDays == null) return null; // unknown — leave the score untouched

  // Freshness: 100 at ≤14 days, linear decay to 0 by ~547 days (18 months) —
  // matches the "active in the last 18 months" bar used elsewhere.
  let fresh;
  if (freshnessDays <= 14) fresh = 100;
  else if (freshnessDays >= 547) fresh = 0;
  else fresh = 100 * (1 - (freshnessDays - 14) / (547 - 14));

  // Cadence: 0 items → 0, ~12+ items in 90 days (weekly or better) → 100.
  const cadence = clamp((Math.min(itemsLast90 || 0, 12) / 12) * 100);

  return clamp(round(fresh * 0.7 + cadence * 0.3));
}

// A book's recency from its publication year — books don't "publish weekly",
// so this is a gentle decay: recent editions score high, decades-old classics
// settle around the middle rather than the floor (an evergreen classic isn't
// "stale" the way a dormant podcast is).
export function bookRecencyScore(pubYear, currentYear) {
  if (!pubYear || !currentYear) return null;
  const age = Math.max(0, currentYear - pubYear);
  if (age <= 1) return 100;
  if (age >= 30) return 40;                     // floor for old-but-evergreen
  return clamp(round(100 - (age - 1) * (60 / 29)));
}

// The five weights, mirrored from the Airtable Final Score formula. We don't
// write Final Score (Airtable computes it), but this lets the admin preview the
// composite and lets us sanity-check.
export const WEIGHTS = {
  expert: 0.25, community: 0.25, popularity: 0.20, recency: 0.15, clinicalDepth: 0.15,
};

export function composite({ expert, community, popularity, recency, clinicalDepth }) {
  const parts = [
    [expert, WEIGHTS.expert], [community, WEIGHTS.community], [popularity, WEIGHTS.popularity],
    [recency, WEIGHTS.recency], [clinicalDepth, WEIGHTS.clinicalDepth],
  ].filter(([v]) => v != null && !isNaN(v));
  if (!parts.length) return null;
  const wsum = parts.reduce((s, [, w]) => s + w, 0);
  const vsum = parts.reduce((s, [v, w]) => s + v * w, 0);
  return clamp(round(vsum / wsum));
}
