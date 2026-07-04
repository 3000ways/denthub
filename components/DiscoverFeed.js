import { useState, useEffect } from 'react';
import { Carousel } from './Carousel';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';

// The logged-out home "discovery" section: a rotating stack of episode
// carousels (goal-heavy), with a sign-in teaser woven in. Data comes from
// /api/home-feed (cacheable, rotates daily). Renders nothing until rows arrive,
// so there's never an empty shell.
export function DiscoverFeed({ isMobile, signedIn, onSignInRequired, hidden = [], counts = null }) {
  const [rows, setRows] = useState([]);

  // Admin curation (which tags to hide, how many rows per kind) travels to the
  // feed as query params so it applies live AND in draft preview.
  const hiddenKey = JSON.stringify(hidden || []);
  const countsKey = JSON.stringify(counts || {});

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    const h = JSON.parse(hiddenKey);
    if (h.length) params.set('hidden', hiddenKey);
    const c = JSON.parse(countsKey);
    ['goal', 'interest', 'career'].forEach(k => { if (c[k] !== undefined && c[k] !== null) params.set(k, String(c[k])); });
    const qs = params.toString();
    fetch(`/api/home-feed${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then(data => { if (active) setRows(data.rows || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [hiddenKey, countsKey]);

  if (!rows.length) return null;

  // Weave the teaser in after the third row (once they're clearly engaged),
  // but only for signed-out visitors.
  const TEASER_AFTER = 2;

  return (
    <div style={{ marginBottom: 8 }}>
      {rows.map((row, i) => (
        <div key={`${row.kind}-${row.tag}`}>
          <Carousel eyebrow={row.eyebrow} title={row.title} seeAllHref={row.seeAllHref} items={row.items} isMobile={isMobile} />
          {!signedIn && i === TEASER_AFTER && <Teaser onSignInRequired={onSignInRequired} isMobile={isMobile} />}
        </div>
      ))}
    </div>
  );
}

function Teaser({ onSignInRequired, isMobile }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      background: 'linear-gradient(90deg, #0F6E56 0%, #0a5240 100%)', borderRadius: 12,
      padding: isMobile ? '20px 18px' : '22px 28px', marginBottom: isMobile ? 30 : 40 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 700, color: '#fff', fontFamily: FONT_DISPLAY, letterSpacing: -0.3, marginBottom: 4 }}>
          Make this yours
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: FONT_BODY, lineHeight: 1.5 }}>
          Sign in and we&rsquo;ll put episodes matched to your specialty &amp; goals right at the top.
        </div>
      </div>
      <button onClick={onSignInRequired}
        style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer', whiteSpace: 'nowrap',
          padding: '10px 22px', borderRadius: 6, background: '#fff', color: GREEN, border: 'none', flexShrink: 0 }}>
        Sign in →
      </button>
    </div>
  );
}
