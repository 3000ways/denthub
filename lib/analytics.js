// Tiny wrapper over Google Analytics 4 (gtag is loaded in pages/_app.js).
//
// Why: the 2026-11 home redesign was built to hold a visitor's first 15 seconds.
// Without events there is no way to know whether it does. These are the few
// interactions that answer that question; nothing here is personal data.
//
//   featured_play   — hero "Play episode" / "Start listening" pressed (first play only)
//   search          — GA4's standard search event, with the term and whether it
//                     was scoped to a specialty
//   specialty_pick  — "I'm a…" chip chosen or cleared
//   commute_filter  — 15 / 30 / 45 min length chosen
//   index_see_all   — "See the full ranking" from The Index
//
// Never throws; a no-op when gtag is absent (local dev, ad blockers, SSR).

export function track(name, params = {}) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.gtag !== 'function') return;
    const clean = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      clean[k] = typeof v === 'string' ? v.slice(0, 100) : v;
    }
    window.gtag('event', name, clean);
  } catch { /* analytics must never break the page */ }
}
