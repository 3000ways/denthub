import { useState, useEffect } from 'react';
import { Carousel } from './Carousel';
import { SpotlightCard } from './SpotlightCard';
import { useAiVoiceExclusion } from '../lib/use-ai-voice-pref';
import { track } from '../lib/analytics';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const MUTED  = '#6f6f6a';

const OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min+' },
];
const KEY = 'tdc_commute';

// "Fits your commute": a 15 / 30 / 45+ minute pick that fills a carousel with
// fresh episodes of that length from the best-ranked shows (/api/commute-episodes).
// The chosen length is remembered in the browser. `pick` is the visitor's
// "I'm a…" specialty (scopes the row when the specialty has enough episodes).
export function CommuteFilter({ isMobile, pick }) {
  const [bucket, setBucket] = useState(30);
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState({});          // `${bucket}|${pick}` → items
  const { isHiddenShow } = useAiVoiceExclusion();
  const pickKey = pick ? pick.key : '';
  const cacheKey = `${bucket}|${pickKey}`;

  useEffect(() => {
    try {
      const v = Number(window.localStorage.getItem(KEY));
      if (OPTIONS.some(o => o.value === v)) setBucket(v);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || rows[cacheKey]) return;
    let active = true;
    const qs = new URLSearchParams({ bucket: String(bucket) });
    if (pickKey) qs.set('specialty', pickKey);
    fetch(`/api/commute-episodes?${qs}`).then(r => r.json())
      .then(d => { if (active) setRows(prev => ({ ...prev, [cacheKey]: Array.isArray(d.items) ? d.items : [] })); })
      .catch(() => { if (active) setRows(prev => ({ ...prev, [cacheKey]: [] })); });
    return () => { active = false; };
  }, [hydrated, cacheKey, bucket, pickKey, rows]);

  function choose(v) {
    if (v === bucket) return;
    setBucket(v);
    try { window.localStorage.setItem(KEY, String(v)); } catch {}
    track('commute_filter', { minutes: v, specialty: pickKey || undefined });
  }

  const items = (rows[cacheKey] || []).filter(it => !isHiddenShow(it.resourceId));
  const loaded = cacheKey in rows;

  return (
    <section aria-labelledby="tdc-commute-h" style={{ marginBottom: isMobile ? 36 : 52, fontFamily: FONT_BODY }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
          <h2 id="tdc-commute-h" style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: isMobile ? 20 : 24, letterSpacing: -0.4, color: '#111' }}>Fits your commute</h2>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, fontWeight: 700, whiteSpace: 'nowrap' }}>Episodes by length</span>
        </div>
        <div role="group" aria-label="Commute length"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', border: `1px solid ${GREEN}`, borderRadius: 10, overflow: 'hidden', background: '#fff', width: isMobile ? '100%' : 300 }}>
          {OPTIONS.map((o, i) => {
            const active = o.value === bucket;
            return (
              <button key={o.value} type="button" aria-pressed={active} onClick={() => choose(o.value)}
                style={{ height: 42, border: 'none', borderLeft: i > 0 ? `1px solid ${GREEN}` : 'none', cursor: 'pointer',
                  background: active ? GREEN : '#fff', color: active ? '#fff' : GREEN,
                  fontFamily: FONT_BODY, fontWeight: active ? 700 : 600, fontSize: 14 }}>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.length > 0 ? (
        <Carousel items={items} isMobile={isMobile} renderItem={item => <SpotlightCard item={item} compact />} />
      ) : (
        <div aria-hidden={!loaded} style={{ minHeight: isMobile ? 200 : 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 13, background: 'rgba(255,255,255,0.55)', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          {loaded ? 'Nothing this length just now. Try another.' : ''}
        </div>
      )}
    </section>
  );
}
