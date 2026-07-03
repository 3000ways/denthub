import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import { SpotlightCard } from '../components/SpotlightCard';
import { fetchEpisodesByTag, BROWSE_PAGE_SIZE } from '../lib/home-feed';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

const EYEBROW = { goal: 'Listen by goal', interest: 'By clinical area', career: 'For your stage' };

// "See all" page for one tag (goal / clinical area / career stage). Reached from
// the home-page Discover carousels' "See all →" link. Server-renders the first
// page for SEO, then Load More / search fetch client-side from /api/browse-episodes.
export async function getServerSideProps({ query }) {
  const tag  = typeof query.tag  === 'string' ? query.tag  : '';
  const kind = typeof query.kind === 'string' ? query.kind : '';
  if (!tag) return { notFound: true };
  let initialItems = [], total = 0;
  try {
    const r = await fetchEpisodesByTag({ tag, offset: 0, limit: BROWSE_PAGE_SIZE, withCount: true });
    initialItems = r.items;
    total = r.total ?? 0;
  } catch {}
  if (!total) return { notFound: true }; // unknown / empty tag → 404, never an empty page
  return { props: { tag, kind, initialItems, total } };
}

export default function BrowsePage({ tag, kind, initialItems, total }) {
  const [items, setItems]   = useState(initialItems);
  const [count, setCount]   = useState(total);
  const [offset, setOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialItems.length < total);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [term, setTerm]   = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setTerm(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const searching = term.trim().length >= 2;

  // Re-fetch from the top when the query changes (skip first mount = SSR data).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!mounted) { setMounted(true); return; }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ tag, offset: '0', count: '1' });
    if (searching) params.set('q', term.trim());
    fetch(`/api/browse-episodes?${params}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || d.error) return;
        setItems(d.items || []);
        setCount(d.total ?? 0);
        setOffset(d.nextOffset ?? (d.items || []).length);
        setHasMore(!!d.nextOffset);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const params = new URLSearchParams({ tag, offset: String(offset) });
    if (searching) params.set('q', term.trim());
    fetch(`/api/browse-episodes?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) return;
        setItems(prev => [...prev, ...(d.items || [])]);
        setOffset(d.nextOffset ?? (offset + (d.items || []).length));
        setHasMore(!!d.nextOffset);
      })
      .finally(() => setLoading(false));
  }

  return (
    <>
      <Head><title>{tag} — The Dental Commute</title></Head>
      <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>
        <SiteNav />
        <div style={{ maxWidth:1140, margin:'0 auto', padding: isMobile ? '20px 12px 80px' : '40px 28px 100px' }}>

          <Link href="/" style={{ fontSize:13, color:GREEN, textDecoration:'none', fontWeight:500 }}>← Back to home</Link>

          <div style={{ margin:'22px 0 24px' }}>
            {EYEBROW[kind] && (
              <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:10, fontWeight:600 }}>{EYEBROW[kind]}</div>
            )}
            <h1 style={{ fontSize: isMobile ? 28 : 34, fontWeight:700, color:'#111', lineHeight:1.1, margin:'0 0 8px', letterSpacing:-1, fontFamily:FONT_DISPLAY }}>{tag}</h1>
            <p style={{ fontSize:14, color:'#888', margin:0 }}>
              {searching ? `${count} ${count === 1 ? 'result' : 'results'}` : `${count} ${count === 1 ? 'episode' : 'episodes'}`}
            </p>
          </div>

          {/* Search within this tag */}
          <div style={{ position:'relative', marginBottom:24, maxWidth:520 }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Search these episodes…`}
              style={{ width:'100%', boxSizing:'border-box', fontSize:14, fontFamily:FONT_BODY, padding:'11px 34px 11px 14px', borderRadius:8, border:`1px solid ${BORDER}`, outline:'none', background:'#fff', color:'#111' }}
              onFocus={e => e.currentTarget.style.borderColor = GREEN}
              onBlur={e => e.currentTarget.style.borderColor = BORDER} />
            {input && (
              <button onClick={() => { setInput(''); setTerm(''); }} aria-label="Clear search"
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#bbb', fontSize:16, lineHeight:1, padding:4 }}>×</button>
            )}
          </div>

          {items.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 10 : 16 }}>
              {items.map((item, i) => <SpotlightCard key={item.guid || item.url || i} item={item} />)}
            </div>
          ) : (
            <div style={{ fontSize:14, color:'#999', padding:'40px 0' }}>No episodes match “{term.trim()}”.</div>
          )}

          {hasMore && (
            <div style={{ textAlign:'center', marginTop:28 }}>
              <button onClick={loadMore} disabled={loading}
                style={{ fontSize:13, fontWeight:600, fontFamily:FONT_BODY, cursor: loading ? 'default' : 'pointer', padding:'11px 26px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#fff', color: loading ? '#bbb' : GREEN }}>
                {loading ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
}
