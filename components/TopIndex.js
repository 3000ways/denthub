import { useState } from 'react';
import Link from 'next/link';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';
const MUTED  = '#6f6f6a';

const TOP_N = 10;

// Shorten a description to one editorial line ("why it ranks").
function oneLine(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const firstSentence = t.split(/(?<=[.!?])\s/)[0] || t;
  return firstSentence.length > 110 ? `${firstSentence.slice(0, 107).trimEnd()}…` : firstSentence;
}

// "The Index": the ranking is the product's whole premise, so it is the second
// thing on the page. Rendered in the server HTML (resources arrive via
// getStaticProps), so crawlers see real resource links on the home page too.
//
//   resources  — home-visible resources, Airtable-shaped records
//   categories — [{ label, types }] tabs (All is added here)
//   onSeeAll   — (categoryLabel) → opens the full ranked list for that tab
//   renderLogo — (record, size) → the page's <Logo> (kept in pages/index.js)
export function TopIndex({ resources, categories, onSeeAll, renderLogo, isMobile }) {
  const [tab, setTab] = useState('All');
  const tabs = [{ label: 'All', types: null }, ...categories];
  const current = tabs.find(t => t.label === tab) || tabs[0];
  const items = resources
    .filter(r => r.fields && r.fields['Final Score'] != null && (!current.types || current.types.includes(r.fields.Type || '')))
    .sort((a, b) => (b.fields['Final Score'] || 0) - (a.fields['Final Score'] || 0))
    .slice(0, TOP_N);
  if (!items.length) return null;

  return (
    <section id="the-index" aria-labelledby="tdc-index-h" style={{ marginBottom: isMobile ? 40 : 56, scrollMarginTop: 72, fontFamily: FONT_BODY }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, borderBottom: '2px solid #111', paddingBottom: 10, marginBottom: 2, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
          <h2 id="tdc-index-h" style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: isMobile ? 20 : 26, letterSpacing: -0.4, color: '#111' }}>The Index</h2>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, fontWeight: 700, whiteSpace: 'nowrap' }}>
            Top {items.length} this week
          </span>
        </div>
        <div role="tablist" aria-label="Resource type" style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => {
            const active = t.label === tab;
            return (
              <button key={t.label} role="tab" aria-selected={active} onClick={() => setTab(t.label)}
                style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: FONT_BODY,
                  background: active ? '#111' : 'transparent', color: active ? '#fff' : MUTED, fontWeight: active ? 700 : 500 }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((r, i) => {
          const f = r.fields;
          const why = oneLine(f.Description);
          return (
            <li key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <Link href={`/resource/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, padding: isMobile ? '11px 0' : '13px 4px', textDecoration: 'none', color: 'inherit', borderRadius: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: isMobile ? 22 : 26, color: GREEN, width: isMobile ? 26 : 34, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{i + 1}</span>
                {renderLogo ? renderLogo(r, isMobile ? 44 : 52) : null}
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: isMobile ? 14 : 15, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.Name}</span>
                  <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: GREEN, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>{f.Type}</span>
                    {f['Host or Author'] ? ` · ${f['Host or Author']}` : ''}
                    {!isMobile && why ? ` · ${why}` : ''}
                  </span>
                </span>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ display: 'block', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: isMobile ? 18 : 22, color: '#111', lineHeight: 1 }}>{Math.round(f['Final Score'])}</span>
                  <span style={{ display: 'block', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, fontWeight: 600, marginTop: 3 }}>score</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => onSeeAll && onSeeAll(tab)}
          style={{ fontSize: 13, color: GREEN, fontWeight: 600, border: `1px solid ${GREEN}`, padding: '9px 18px', borderRadius: 8, fontFamily: FONT_BODY, background: 'transparent', cursor: 'pointer' }}>
          See the full ranking →
        </button>
        <Link href="/about" style={{ fontSize: 12, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>How we rank →</Link>
      </div>
    </section>
  );
}
