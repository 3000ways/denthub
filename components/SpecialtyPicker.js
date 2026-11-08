import { SPECIALTY_PICKS } from '../lib/specialties';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const GREEN  = '#0F6E56';
const BORDER = '#d9d5c9';
const MUTED  = '#6f6f6a';

// "I'm a…" — one question instead of nineteen filter chips. The pick scopes the
// featured episode, the episode search and the Discover feed (see
// lib/use-specialty-pick.js). Tapping the active chip clears it.
export function SpecialtyPicker({ value, onChange, style }) {
  return (
    <div style={{ fontFamily: FONT_BODY, ...style }}>
      <style>{`.tdc-picks::-webkit-scrollbar{display:none}`}</style>
      <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, fontWeight: 700, marginBottom: 8 }}>
        Tune the page · I&rsquo;m a…
      </div>
      <div className="tdc-picks" role="group" aria-label="Choose your specialty"
        style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2, marginRight: -16, paddingRight: 16 }}>
        {SPECIALTY_PICKS.map(p => {
          const active = value === p.key;
          return (
            <button key={p.key} type="button" aria-pressed={active}
              onClick={() => onChange(active ? null : p.key)}
              style={{ height: 40, padding: '0 14px', borderRadius: 20, flexShrink: 0, cursor: 'pointer',
                border: `1px solid ${active ? GREEN : BORDER}`, background: active ? GREEN : '#fff',
                color: active ? '#fff' : '#111', fontFamily: FONT_BODY, fontWeight: active ? 600 : 500, fontSize: 13,
                transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
