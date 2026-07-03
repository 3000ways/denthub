import { useRef } from 'react';
import Link from 'next/link';
import { SpotlightCard } from './SpotlightCard';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

// A horizontal, swipeable lane of episode cards — the Spotify/Netflix row.
// Mobile: native swipe + scroll-snap, with the next card peeking so it reads as
// scrollable. Desktop: hover arrow buttons page the lane (mouse horizontal
// scroll is bad). A "See all →" header link routes to the full paginated page.
export function Carousel({ eyebrow, title, seeAllHref, items = [], isMobile }) {
  const scrollRef = useRef(null);
  if (!items.length) return null;

  const CARD_W = isMobile ? 152 : 196;
  const GAP = 12;

  function page(dir) {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  }

  return (
    <div style={{ marginBottom: isMobile ? 30 : 40, position: 'relative' }}>
      <style>{`.tdc-hscroll::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', fontWeight: 600, marginBottom: 4 }}>{eyebrow}</div>
          )}
          <div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY, letterSpacing: -0.4, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        </div>
        {seeAllHref && (
          <Link href={seeAllHref} style={{ fontSize: 12, color: GREEN, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: FONT_BODY, flexShrink: 0 }}>
            See all →
          </Link>
        )}
      </div>

      {/* Lane */}
      <div style={{ position: 'relative' }}>
        <div ref={scrollRef} className="tdc-hscroll"
          style={{ display: 'flex', gap: GAP, overflowX: 'auto', scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none', paddingBottom: 4,
            WebkitOverflowScrolling: 'touch' }}>
          {items.map((item, i) => (
            <div key={item.guid || item.url || i}
              style={{ flex: `0 0 ${CARD_W}px`, width: CARD_W, scrollSnapAlign: 'start' }}>
              <SpotlightCard item={item} />
            </div>
          ))}
        </div>

        {/* Desktop paging arrows */}
        {!isMobile && (
          <>
            <ArrowButton side="left"  onClick={() => page(-1)} />
            <ArrowButton side="right" onClick={() => page(1)} />
          </>
        )}
      </div>
    </div>
  );
}

function ArrowButton({ side, onClick }) {
  return (
    <button onClick={onClick} aria-label={side === 'left' ? 'Scroll left' : 'Scroll right'}
      style={{ position: 'absolute', top: '38%', [side]: -14, transform: 'translateY(-50%)',
        width: 34, height: 34, borderRadius: '50%', background: '#fff', border: `1px solid ${BORDER}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#555', fontSize: 15, zIndex: 5, padding: 0 }}
      onMouseEnter={e => { e.currentTarget.style.color = GREEN; e.currentTarget.style.borderColor = GREEN; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = BORDER; }}>
      {side === 'left' ? '‹' : '›'}
    </button>
  );
}
