import { useState, useEffect } from 'react';
import { Carousel } from './Carousel';
import { useAuth } from '../lib/auth-context';
import { buildPersonalFeed } from '../lib/home-feed';

// Signed-in personalization: a stack of episode carousels built from the
// dentist's own quiz answers ("Because you're working on …", "More on …",
// "For your stage"). Complements the blended "Recommended for You" row with
// per-answer deep dives. Renders nothing until rows arrive.
export function PersonalFeed({ isMobile }) {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;
    if (!profile) { setRows([]); return; }
    buildPersonalFeed(profile).then(r => { if (active) setRows(r); }).catch(() => {});
    return () => { active = false; };
  }, [profile]);

  if (!user || !rows.length) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      {rows.map(row => (
        <Carousel key={`${row.kind}-${row.tag}`} eyebrow={row.eyebrow} title={row.title}
          seeAllHref={row.seeAllHref} items={row.items} isMobile={isMobile} />
      ))}
    </div>
  );
}
