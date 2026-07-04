import { useState, useEffect } from 'react';
import { Carousel } from './Carousel';
import { useAuth } from '../lib/auth-context';
import { buildPersonalFeed } from '../lib/home-feed';

// Signed-in personalization: a stack of episode carousels built from the
// dentist's own quiz answers ("Because you're working on …", "More on …",
// "For your stage"). Complements the blended "Recommended for You" row with
// per-answer deep dives. Renders nothing until rows arrive.
export function PersonalFeed({ isMobile, counts = null, ready = true }) {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState([]);
  const countsKey = JSON.stringify(counts || {});

  useEffect(() => {
    // Wait until the admin layout (row-count settings) is known, so we build once
    // with the right caps instead of flashing rows that a count of 0 should hide.
    if (!ready) return;
    let active = true;
    if (!profile) { setRows([]); return; }
    buildPersonalFeed(profile, { counts: JSON.parse(countsKey) }).then(r => { if (active) setRows(r); }).catch(() => {});
    return () => { active = false; };
  }, [profile, countsKey, ready]);

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
