import { useState, useEffect } from 'react';
import Link from 'next/link';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

function BookCard({ record, isMobile }) {
  const f = record.fields;
  const [imgErr, setImgErr] = useState(false);
  const score = f['Final Score'] || f.Score;
  // Use Airtable Image URL if set, otherwise Open Library covers by title (free, no API key)
  const coverSrc = f['Image URL'] ||
    `https://covers.openlibrary.org/b/title/${encodeURIComponent(f.Name || '')}-M.jpg`;

  return (
    <Link href={`/resource/${record.id}`} style={{ textDecoration:'none', color:'inherit', display:'block' }}>
      <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden',
          transition:'box-shadow 0.15s, transform 0.15s', height:'100%' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>

        {/* Cover image area — 2:3 (book-shaped) so portrait covers aren't cropped top/bottom */}
        <div style={{ position:'relative', width:'100%', aspectRatio:'2 / 3', background:'#f5f2eb', overflow:'hidden' }}>
          {!imgErr ? (
            <img
              src={coverSrc}
              alt={f.Name}
              onError={() => setImgErr(true)}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
            />
          ) : (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:32, color:'#ccc' }}>📚</span>
            </div>
          )}
          <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:'#6B48C2', padding:'3px 7px', borderRadius:3 }}>Book</div>
          {score && (
            <div style={{ position:'absolute', top:8, right:8, fontSize:11, fontWeight:700, color:GREEN, background:'#E8F5F0', border:`1px solid ${GREEN}`, borderRadius:4, padding:'2px 7px' }}>
              {Math.round(score)}
            </div>
          )}
        </div>

        <div style={{ padding:'10px 12px 14px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#111', lineHeight:1.3, marginBottom:5, fontFamily:FONT_DISPLAY,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {f.Name}
          </div>
          {f.Author && (
            <div style={{ fontSize:11, color:'#999', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {f.Author}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function FeaturedBooks({ isMobile = false }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/featured?section=Books')
      .then(r => r.json())
      .then(d => setBooks(d.records || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || books.length === 0) return null;

  const display = books.slice(0, 6);

  return (
    <div style={{ marginBottom:28, background:'rgba(255,255,255,0.55)', borderRadius:12,
      padding: isMobile ? '16px 10px 16px' : '28px 28px 24px',
      border:`1px solid ${BORDER}`, boxShadow:'0 1px 6px rgba(0,0,0,0.04)', fontFamily:FONT_BODY }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:24, paddingBottom:14, borderBottom:`2px solid #111` }}>
        <div style={{ fontSize:17, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.4 }}>Featured Books</div>
        <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', fontWeight:600 }}>Editor&rsquo;s picks</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile ? 2 : Math.min(display.length, 6)}, minmax(0, 1fr))`, gap: isMobile ? 8 : 12 }}>
        {display.map(r => <BookCard key={r.id} record={r} isMobile={isMobile} />)}
      </div>
    </div>
  );
}
