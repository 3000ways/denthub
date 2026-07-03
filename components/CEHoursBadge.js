import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const GREEN = '#0F6E56';

// A small, motivating achievement badge for signed-in dentists: total CE hours
// they've logged by listening (completed episodes). Positive framing only — a
// count of what they've done, not "how far behind" they are. Links to the CE
// report. Renders nothing until they've logged at least a minute.
export function CEHoursBadge({ isMobile }) {
  const { user } = useAuth();
  const [secs, setSecs] = useState(null);

  useEffect(() => {
    if (!user) { setSecs(null); return; }
    let active = true;
    supabase
      .from('listening_progress')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .eq('completed', true)
      .then(({ data }) => {
        if (active) setSecs((data || []).reduce((s, r) => s + (r.duration_seconds || 0), 0));
      });
    return () => { active = false; };
  }, [user]);

  if (!user || !secs || secs < 60) return null;

  const hours = secs / 3600;
  const label = hours >= 1
    ? `${hours.toFixed(hours < 10 ? 1 : 0)} CE hours logged`
    : `${Math.round(hours * 60)} min of CE logged`;

  return (
    <Link href="/ce-report" style={{ display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none',
      background:'#E8F5F0', border:`1px solid ${GREEN}`, borderRadius:20, padding:'7px 14px', marginBottom:24,
      fontFamily:FONT_BODY, maxWidth:'100%' }}>
      <span style={{ fontSize:15 }}>🎓</span>
      <span style={{ fontSize:13, fontWeight:700, color:'#0a5240' }}>{label}</span>
      <span style={{ fontSize:12, color:GREEN, fontWeight:600 }}>· view report →</span>
    </Link>
  );
}
