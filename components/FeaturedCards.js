import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

const SECTION_CONFIG = {
  Podcasts:     { accent: '#0F6E56', badge: 'Podcast',    icon: '🎙' },
  YouTube:      { accent: '#e52d27', badge: 'YouTube',    icon: '▶'  },
  'CE Courses': { accent: '#1a56a0', badge: 'CE',         icon: '🎓' },
  Coaching:     { accent: '#7c3aed', badge: 'Coaching',   icon: '🏆' },
  Communities:  { accent: '#d97706', badge: 'Community',  icon: '👥' },
  Conferences:  { accent: '#0e7490', badge: 'Conference', icon: '📅' },
};

function ResourceCard({ record, artworkUrl }) {
  const f = record.fields;
  const [imgErr, setImgErr] = useState(false);

  const typeName = f.Type || '';
  const config = SECTION_CONFIG[typeName] || { accent: GREEN, badge: typeName, icon: '⭐' };

  const imageUrl = f['Image URL'] || artworkUrl || null;
  const domain = (() => {
    try { return new URL(f.URL || '').hostname.replace('www.', ''); }
    catch { return null; }
  })();
  const score  = f['Final Score'] || f.Score;
  const src    = imageUrl || (domain ? `/api/airtable?logo=${domain}` : null);
  const isFavicon = !imageUrl;

  return (
    <Link href={`/resource/${record.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
      <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden',
          transition: 'box-shadow 0.15s, transform 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>

        {/* Square image — flexShrink:0 so it never gets squeezed */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', flexShrink: 0,
          background: isFavicon ? '#fff' : '#f5f2eb', overflow: 'hidden',
          borderBottom: `1px solid ${BORDER}` }}>
          {src && !imgErr ? (
            <img src={src} alt={f.Name} onError={() => setImgErr(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: isFavicon ? 'contain' : 'cover',
                padding: isFavicon ? 16 : 0 }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32, color: '#ccc' }}>{config.icon}</span>
            </div>
          )}
          <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff',
            background: config.accent, padding: '3px 7px', borderRadius: 3 }}>
            {config.badge}
          </div>
          {score && (
            <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 700,
              color: GREEN, background: '#E8F5F0', border: `1px solid ${GREEN}`,
              borderRadius: 4, padding: '2px 7px' }}>
              {Math.round(score)}
            </div>
          )}
        </div>

        {/* Text: fixed 70px height — no card-to-card variation */}
        <div style={{ height: 70, padding: '9px 11px 0', overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111', lineHeight: 1.3,
            fontFamily: FONT_DISPLAY, display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4 }}>
            {f.Name}
          </div>
          <div style={{ fontSize: 10, color: '#aaa', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {f['Host or Author'] || f.Author || ''}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedCards({ section, title, subtitle, isMobile = false }) {
  const [records, setRecords] = useState([]);
  const [artworkMap, setArtworkMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/featured?section=${encodeURIComponent(section)}`)
      .then(r => r.json())
      .then(async d => {
        const recs = d.records || [];
        setRecords(recs);

        // For podcasts, look up show artwork from Supabase episodes table
        if (section === 'Podcasts' && recs.length > 0) {
          const ids = recs.map(r => r.id);
          const { data } = await supabase
            .from('episodes')
            .select('show_resource_id, image')
            .in('show_resource_id', ids)
            .not('image', 'is', null)
            .limit(ids.length * 3);
          if (data) {
            const map = {};
            data.forEach(ep => { if (!map[ep.show_resource_id]) map[ep.show_resource_id] = ep.image; });
            setArtworkMap(map);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [section]);

  if (loading || records.length === 0) return null;

  const display = records.slice(0, 6);
  const cols = isMobile ? 2 : Math.min(display.length, 6);

  return (
    <div style={{ marginBottom: 28, background: 'rgba(255,255,255,0.55)', borderRadius: 12,
      padding: isMobile ? '16px 10px 16px' : '28px 28px 24px',
      border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', fontFamily: FONT_BODY }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24,
        paddingBottom: 14, borderBottom: '2px solid #111' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY, letterSpacing: -0.4 }}>
          {title || `Featured ${section}`}
        </div>
        {subtitle && (
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', fontWeight: 600 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: isMobile ? 8 : 12, alignItems: 'stretch' }}>
        {display.map(r => <ResourceCard key={r.id} record={r} artworkUrl={artworkMap[r.id]} />)}
      </div>
    </div>
  );
}
