import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { attributionLine } from '../lib/pins';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Today's date in UTC (YYYY-MM-DD) — matches how the DB stamps `pinned_on`,
// so we can tell whether this user has already used their one pin for the day.
function todayUTC() { return new Date().toISOString().slice(0, 10); }

const btnBase = {
  fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 6,
  border: `1px solid ${BORDER}`, background: '#fff', color: GREEN,
  cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 6,
};

// Pins either a resource (pass resourceId) or a single episode (pass episodeId)
// to the shared Community Pinboard. Everything else — the one-per-day limit,
// anonymity, and attribution — is identical for both. If this item is already
// the user's pin, the button becomes an "Unpin" control; unpinning frees their
// pin for the day (the daily limit is a unique index on (user_id, pinned_on),
// so deleting the row lifts it).
export function PinButton({ resourceId, episodeId, onSignInRequired }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  // The user's own recent pins (one per day at most), used to tell whether they
  // pinned THIS item and whether they've already used today's pin.
  const [myPins, setMyPins] = useState([]);

  useEffect(() => {
    if (!user) { setMyPins([]); return; }
    let cancelled = false;
    supabase
      .from('pins')
      .select('id, resource_id, episode_id, pinned_on')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { if (!cancelled) setMyPins(data || []); });
    return () => { cancelled = true; };
  }, [user]);

  const matches = (p) => episodeId ? p.episode_id === episodeId : p.resource_id === resourceId;
  const myItemPin   = myPins.find(matches) || null;   // this item, if the user pinned it
  const pinnedToday = myPins.some(p => p.pinned_on === todayUTC());

  const hasSpecialty = !!profile?.specialty;
  const region = profile?.province_state || null;
  // Effective anonymity: the user opted in, OR they have no specialty to show.
  const effectiveAnon = anon || !hasSpecialty;

  function handleClick() {
    if (!user) { onSignInRequired?.(); return; }
    setOpen(o => !o);
  }

  async function confirmPin() {
    setBusy(true);
    const { data, error } = await supabase.from('pins').insert({
      user_id:          user.id,
      ...(episodeId ? { episode_id: episodeId } : { resource_id: resourceId }),
      is_anonymous:     effectiveAnon,
      pinner_specialty: effectiveAnon ? null : profile.specialty,
      pinner_region:    effectiveAnon ? null : region,
    }).select('id, resource_id, episode_id, pinned_on').single();
    setBusy(false);
    if (error) {
      // Unique-violation on (user_id, pinned_on) → they already pinned today
      // (something else). Reflect that state.
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('pins').select('id, resource_id, episode_id, pinned_on')
          .eq('user_id', user.id).eq('pinned_on', todayUTC()).maybeSingle();
        if (existing) setMyPins(prev => [existing, ...prev]);
        setOpen(false);
      }
      return;
    }
    setMyPins(prev => [data, ...prev]);
    setOpen(false);
  }

  async function unpin() {
    if (!myItemPin || busy) return;
    setBusy(true);
    const { error } = await supabase.from('pins').delete().eq('id', myItemPin.id).eq('user_id', user.id);
    setBusy(false);
    if (!error) setMyPins(prev => prev.filter(p => p.id !== myItemPin.id));
  }

  // Already pinned THIS item → show a confirmation + an Unpin control.
  if (myItemPin) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span style={{ ...btnBase, cursor: 'default', color: GREEN, background: '#E8F5F0', borderColor: GREEN }}>
          📌 Pinned to the board
        </span>
        <button onClick={unpin} disabled={busy} title="Remove your pin (frees your pin for today)"
          style={{ fontSize: 12, fontWeight: 600, color: '#999', background: 'none', border: 'none',
            textDecoration: 'underline', cursor: busy ? 'default' : 'pointer', fontFamily: FONT }}>
          {busy ? 'Unpinning…' : 'Unpin'}
        </button>
      </span>
    );
  }

  // Used today's pin on something else.
  if (pinnedToday) {
    return (
      <span style={{ ...btnBase, cursor: 'default', color: '#999', background: '#f7f7f5' }}>
        📌 You've pinned today
      </span>
    );
  }

  const previewLine = attributionLine({
    specialty: profile?.specialty,
    region,
    anonymous: effectiveAnon,
  });

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={handleClick} style={btnBase}>
        📌 Pin to community board
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 20,
          width: 288, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 16, fontFamily: FONT,
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Your pin will show as:</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontStyle: 'italic', marginBottom: 12 }}>
            📌 {previewLine}
          </div>

          {/* Nudge when there's no specialty to attribute. */}
          {!hasSpecialty && (
            <div style={{ fontSize: 11, color: '#8a6d3b', background: '#fcf6e6', border: '1px solid #f2e4bf',
              borderRadius: 6, padding: '8px 10px', marginBottom: 12, lineHeight: 1.45 }}>
              Add your specialty &amp; region in your{' '}
              <Link href="/profile" style={{ color: GREEN, fontWeight: 600 }}>profile</Link>{' '}
              so your pins show where they&rsquo;re from. You can still pin now.
            </div>
          )}

          {/* Anonymous opt-in (only meaningful if they have a specialty to hide). */}
          {hasSpecialty && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#555', marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} />
              Pin anonymously
            </label>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirmPin} disabled={busy} style={{
              flex: 1, fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 6,
              border: 'none', background: GREEN, color: '#fff',
              cursor: busy ? 'default' : 'pointer', fontFamily: FONT, opacity: busy ? 0.7 : 1,
            }}>
              {busy ? 'Pinning…' : 'Pin it'}
            </button>
            <button onClick={() => setOpen(false)} style={{
              fontSize: 13, padding: '8px 14px', borderRadius: 6, border: `1px solid ${BORDER}`,
              background: '#fff', color: '#888', cursor: 'pointer', fontFamily: FONT,
            }}>
              Cancel
            </button>
          </div>
          <div style={{ fontSize: 10.5, color: '#bbb', marginTop: 10, textAlign: 'center' }}>
            One pin per day · you can unpin to free it
          </div>
        </div>
      )}
    </span>
  );
}
