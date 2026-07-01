import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { attributionLine } from '../lib/pins';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';

const SLOTS = 4; // how many pins the board holds at once

function getDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return null; } }

// A stable, per-pin tilt so a card sits crooked but doesn't jump angles on
// re-render. Derived from the pin id: alternating direction, ~2–5° on desktop.
function tiltFor(id, isMobile) {
  const max = isMobile ? 1.5 : 5;
  const min = isMobile ? 0.8 : 2;
  const magnitude = min + (Math.abs(id) % 100) / 100 * (max - min);
  const direction = id % 2 === 0 ? 1 : -1;
  return (magnitude * direction).toFixed(2);
}

function Thumbtack() {
  // Upright tack that stays vertical while the card tilts beneath it.
  return (
    <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #ff8a80, #d32f2f 60%, #9a0007)',
        boxShadow: '0 2px 3px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.5)',
      }} />
      <div style={{
        width: 2, height: 5, background: 'rgba(0,0,0,0.35)',
        margin: '0 auto', borderRadius: '0 0 1px 1px',
      }} />
    </div>
  );
}

// `item` is a normalized card: { href, name, typeLabel, image, initial } —
// built from either an Airtable resource or an archived episode.
// When `isOwn`, a small ✕ lets the pinner remove their own pin (which also
// frees their pin for the day).
function PinCard({ pin, item, isMobile, isOwn, onUnpin }) {
  const tilt = tiltFor(pin.id, isMobile);
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: '#fffdf7',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 3,
        padding: isMobile ? '20px 12px 14px' : '24px 16px 16px',
        // The crooked-on-the-corkboard effect; lifts slightly on hover.
        transform: `rotate(${tilt}deg) ${hover ? 'translateY(-3px) scale(1.02)' : ''}`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        boxShadow: hover
          ? '0 10px 22px rgba(0,0,0,0.28)'
          : '0 4px 10px rgba(0,0,0,0.22)',
      }}
    >
      <Thumbtack />
      {isOwn && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnpin(pin.id); }}
          title="Remove your pin (frees your pin for today)"
          aria-label="Remove your pin"
          style={{
            position: 'absolute', top: -8, right: -8, zIndex: 4,
            width: 22, height: 22, borderRadius: '50%', border: 'none',
            background: '#fff', color: '#c0392b', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)', fontSize: 12, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>
          ✕
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
        {item.image
          ? <img src={item.image} alt={item.name}
              style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'contain', background: '#fff', border: '1px solid #eee' }} />
          : <div style={{ width: 52, height: 52, borderRadius: 8, background: '#e8f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: GREEN }}>{item.initial}</div>
        }
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN, fontWeight: 700, marginBottom: 3 }}>{item.typeLabel}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.3, fontFamily: FONT_DISPLAY,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.name}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(0,0,0,0.12)',
        fontSize: 11, color: '#6b6257', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4 }}>
        📌 {attributionLine({ specialty: pin.pinner_specialty, region: pin.pinner_region, anonymous: pin.is_anonymous })}
      </div>
    </Link>
  );
}

export function Pinboard({ resources = [], isMobile = false }) {
  const { user } = useAuth();
  const [pins, setPins] = useState([]);
  const [episodesById, setEpisodesById] = useState({});
  const [loaded, setLoaded] = useState(false);

  // Remove the current user's own pin from the board (RLS enforces ownership).
  // Deleting the row also frees their pin for the day.
  async function unpin(pinId) {
    const { error } = await supabase.from('pins').delete().eq('id', pinId);
    if (!error) setPins(prev => prev.filter(p => p.id !== pinId));
  }

  useEffect(() => {
    let cancelled = false;
    // Pull more than SLOTS so we can skip any pins whose target is no longer
    // available, then keep the newest SLOTS that resolve.
    supabase
      .from('pins')
      .select('id, user_id, resource_id, episode_id, pinner_specialty, pinner_region, is_anonymous, created_at')
      .order('created_at', { ascending: false })
      .limit(SLOTS * 4)
      .then(async ({ data }) => {
        const rows = data || [];
        if (cancelled) return;
        setPins(rows);
        // Fetch details for any episode pins (resource pins resolve from the prop).
        const epIds = [...new Set(rows.filter(p => p.episode_id).map(p => p.episode_id))];
        if (epIds.length) {
          const { data: eps } = await supabase
            .from('episodes')
            .select('id, title, image')
            .in('id', epIds);
          if (!cancelled && eps) {
            const map = {};
            eps.forEach(e => { map[e.id] = e; });
            setEpisodesById(map);
          }
        }
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Normalize each pin to a card (resource OR episode); drop unresolved; keep newest SLOTS.
  const byId = new Map(resources.map(r => [r.id, r]));
  const cards = pins
    .map(p => {
      if (p.episode_id) {
        const ep = episodesById[p.episode_id];
        if (!ep) return null;
        return { pin: p, item: { href: `/episode/${ep.id}`, name: ep.title, typeLabel: 'Episode', image: ep.image || null, initial: (ep.title || '?')[0] } };
      }
      const r = byId.get(p.resource_id);
      if (!r) return null;
      const f = r.fields;
      const domain = getDomain(f.URL);
      return { pin: p, item: { href: `/resource/${r.id}`, name: f.Name, typeLabel: f.Type, image: f['Image URL'] || (domain ? `/api/airtable?logo=${domain}` : null), initial: (f.Name || '?')[0] } };
    })
    .filter(Boolean)
    .slice(0, SLOTS);

  // Nothing to show yet (and nothing pinned) — hide the whole section rather than
  // render an empty board.
  if (loaded && cards.length === 0) return null;

  return (
    <div style={{ marginBottom: 52 }}>
      <div style={{
        position: 'relative',
        borderRadius: 12,
        padding: isMobile ? '22px 14px 26px' : '30px 30px 34px',
        // Cork-board texture — warm tan with a subtle speckle, deliberately
        // different from the clean magazine sections around it.
        background: '#c19a5b',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(0,0,0,0.08) 1px, transparent 2px),
          radial-gradient(circle at 70% 60%, rgba(0,0,0,0.07) 1px, transparent 2px),
          radial-gradient(circle at 45% 80%, rgba(255,255,255,0.10) 1px, transparent 2px),
          radial-gradient(circle at 85% 15%, rgba(0,0,0,0.06) 1px, transparent 2px)`,
        backgroundSize: '14px 14px, 19px 19px, 23px 23px, 16px 16px',
        border: '6px solid #6b4f2a',
        boxShadow: 'inset 0 2px 14px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {/* Heading */}
        <div style={{ marginBottom: isMobile ? 20 : 26 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: FONT_DISPLAY, letterSpacing: -0.4,
            textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
            📌 The Community Pinboard
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            Resources and episodes fellow dentists tacked up for you — pin your own from any resource or episode page.
          </div>
        </div>

        {/* The tacked-up cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${isMobile ? 2 : SLOTS}, 1fr)`,
          gap: isMobile ? 18 : 22,
          alignItems: 'start',
        }}>
          {cards.map(c => (
            <PinCard key={c.pin.id} pin={c.pin} item={c.item} isMobile={isMobile}
              isOwn={!!user && c.pin.user_id === user.id} onUnpin={unpin} />
          ))}
        </div>
      </div>
    </div>
  );
}
