import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

function specialtyList(f) {
  const s = f.Specialty;
  if (Array.isArray(s)) return s.map(x => x?.name || x).filter(Boolean);
  return s ? [s] : [];
}

function BookMini({ record }) {
  const f = record.fields;
  const [imgErr, setImgErr] = useState(false);
  const score = f['Final Score'] || f.Score;
  const coverSrc = f['Image URL'] || `https://covers.openlibrary.org/b/title/${encodeURIComponent(f.Name || '')}-M.jpg`;
  return (
    <Link href={`/resource/${record.id}`} style={{ textDecoration:'none', color:'inherit', display:'block' }}>
      <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden', height:'100%',
          transition:'box-shadow 0.15s, transform 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
        <div style={{ position:'relative', width:'100%', aspectRatio:'2 / 3', background:'#f5f2eb', overflow:'hidden' }}>
          {!imgErr
            ? <img src={coverSrc} alt={f.Name} onError={() => setImgErr(true)} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
            : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:32, color:'#ccc' }}>📚</span></div>
          }
          <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:'#6B48C2', padding:'3px 7px', borderRadius:3 }}>Book</div>
          {score && (
            <div style={{ position:'absolute', top:8, right:8, fontSize:11, fontWeight:700, color:GREEN, background:'#E8F5F0', border:`1px solid ${GREEN}`, borderRadius:4, padding:'2px 7px' }}>{Math.round(score)}</div>
          )}
        </div>
        <div style={{ padding:'10px 12px 14px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#111', lineHeight:1.3, marginBottom:5, fontFamily:FONT_DISPLAY,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{f.Name}</div>
          {(f.Author || f['Host or Author']) && (
            <div style={{ fontSize:11, color:'#999', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.Author || f['Host or Author']}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

// A sparse "Recommended reading" row for signed-in dentists: books whose
// specialty matches the reader's clinical interests / specialty. Matched on the
// clinical field (reliable in Airtable), not goals. Renders nothing unless there
// are a few genuine matches, so it never shows a thin/irrelevant row.
export function BooksForYou({ resources = [], isMobile }) {
  const { user, profile } = useAuth();
  if (!user || !profile) return null;

  const wanted = new Set([...(profile.interests || []), profile.specialty].filter(Boolean));
  if (!wanted.size) return null;

  const books = resources
    .filter(r => r.fields?.Type === 'Book')
    .filter(r => specialtyList(r.fields).some(s => wanted.has(s)))
    .sort((a, b) => (b.fields['Final Score'] || 0) - (a.fields['Final Score'] || 0))
    .slice(0, 6);

  if (books.length < 3) return null; // too few real matches — skip the row

  return (
    <div style={{ marginBottom:28, background:'rgba(255,255,255,0.55)', borderRadius:12,
      padding: isMobile ? '16px 12px' : '28px 28px 24px', border:`1px solid ${BORDER}`, boxShadow:'0 1px 6px rgba(0,0,0,0.04)', fontFamily:FONT_BODY }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12, marginBottom:20, paddingBottom:14, borderBottom:`2px solid #111`, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
          <div style={{ fontSize:17, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.4 }}>Recommended Reading</div>
          <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:GREEN, fontWeight:600 }}>Books in your field</div>
        </div>
        <Link href="/?category=Books" style={{ fontSize:12, fontWeight:600, color:GREEN, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>See all →</Link>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile ? 2 : Math.min(books.length, 6)}, minmax(0, 1fr))`, gap: isMobile ? 8 : 12 }}>
        {books.map(r => <BookMini key={r.id} record={r} />)}
      </div>
    </div>
  );
}
