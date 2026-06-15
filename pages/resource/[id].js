import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CommunitySection } from '../../components/Community';
import { useAuth } from '../../lib/auth-context';
import { SignInModal, OnboardingModal } from '../../components/AuthModal';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

function parseYtRss(xml, limit = 9) {
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  const videos = [];
  let match;
  while ((match = entryRegex.exec(xml)) !== null && videos.length < limit) {
    const entry = match[1];
    const getId = tag => { const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')); return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null; };
    const getAt = (tag, attr) => { const m = entry.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'i')); return m ? m[1] : null; };
    const videoId = getId('yt:videoId');
    const title = getId('title');
    const published = getId('published');
    const thumbnail = getAt('media:thumbnail', 'url');
    if (!videoId) continue;
    videos.push({
      videoId,
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      date: published ? new Date(published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    });
  }
  return videos;
}

export async function getServerSideProps({ params }) {
  try {
    const base = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';
    const pat = process.env.AIRTABLE_PAT;
    const origin = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://thedentalcommute.com';

    // Fetch the main record
    const r = await fetch(`https://api.airtable.com/v0/${base}/Resources/${params.id}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!r.ok) return { notFound: true };
    const record = await r.json();
    if (record.fields?.Status !== 'Published') return { notFound: true };

    const type = record.fields?.Type;

    // Fetch related resources (same type)
    const filterFormula = `AND({Status}='Published', RECORD_ID() != '${params.id}', {Type}='${type}')`;
    const relRes = await fetch(
      `https://api.airtable.com/v0/${base}/Resources?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=Final+Score&sort[0][direction]=desc&pageSize=4`,
      { headers: { Authorization: `Bearer ${pat}` } }
    );
    const relData = await relRes.json();
    const related = (relData.records || []).filter(rec => rec.id !== params.id).slice(0, 4);

    // Fetch type-specific enrichment data
    let ytData = null;
    let bookData = null;

    if (type === 'YouTube') {
      // Try the full youtube-stats API first (gives subscriber count + stats)
      try {
        const ytRes = await fetch(`${origin}/api/youtube-stats`);
        if (ytRes.ok) {
          const ytAll = await ytRes.json();
          ytData = ytAll[params.id] || null;
        }
      } catch {}
      // Fall back to direct RSS parsing if API key not set or call failed
      if (!ytData?.recentVideos?.length) {
        const rssUrl = record.fields['RSS Feed URL'];
        if (rssUrl) {
          try {
            const feedRes = await fetch(rssUrl, {
              headers: { 'User-Agent': 'TheDentalCommute/1.0 (+https://thedentalcommute.com)' },
              signal: AbortSignal.timeout(8000),
            });
            if (feedRes.ok) {
              const xml = await feedRes.text();
              const recentVideos = parseYtRss(xml, 9);
              ytData = { ...(ytData || {}), recentVideos };
            }
          } catch {}
        }
      }
    }

    if (type === 'Book') {
      try {
        const bookRes = await fetch(`${origin}/api/book-stats`);
        if (bookRes.ok) {
          const bookAll = await bookRes.json();
          bookData = bookAll[params.id] || null;
        }
      } catch {}
    }

    return { props: { record, related, ytData, bookData } };
  } catch {
    return { notFound: true };
  }
}

function ScoreBar({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#666', fontFamily: FONT }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: value != null ? GREEN : '#ddd', fontFamily: FONT }}>{value ?? '—'}</span>
      </div>
      <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2 }}>
        <div style={{ height: 3, width: value ? `${Math.min(value, 100)}%` : '0%', background: GREEN, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function Logo({ url, name, imageUrl, size = 64 }) {
  const [src, setSrc] = useState(imageUrl || null);
  const domain = (() => { try { return new URL(url).hostname; } catch { return null; } })();
  const favicon = domain ? `/api/airtable?logo=${domain}` : null;

  useEffect(() => {
    if (!src && favicon) setSrc(favicon);
  }, []);

  if (!src) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: '#e8f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: GREEN, fontFamily: FONT, flexShrink: 0 }}>
        {name?.[0] || '?'}
      </div>
    );
  }
  return (
    <img src={src} alt={name}
      onError={() => { if (src !== favicon && favicon) setSrc(favicon); else setSrc(null); }}
      style={{ width: size, height: size, borderRadius: 12, objectFit: 'contain', border: `1px solid ${BORDER}`, background: '#fafafa', flexShrink: 0 }} />
  );
}

function SmallLogo({ url, name, imageUrl, size = 40 }) {
  const [err, setErr] = useState(false);
  const domain = (() => { try { return new URL(url).hostname; } catch { return null; } })();
  const src = imageUrl || (domain ? `/api/airtable?logo=${domain}` : null);
  if (!src || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: 8, background: '#e8f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: GREEN, fontFamily: FONT, flexShrink: 0 }}>
        {name?.[0] || '?'}
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 8, objectFit: 'contain', border: `1px solid ${BORDER}`, background: '#fafafa', flexShrink: 0 }} />;
}

function EpisodeCard({ ep, isNew }) {
  return (
    <a href={ep.audioUrl || '#'} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', gap: 12, textDecoration: 'none', color: 'inherit', alignItems: 'center', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = GREEN}
      onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
      {ep.image && <img src={ep.image} alt={ep.title} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ep.title}</div>
        {ep.description && <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{ep.description}</div>}
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>
          {isNew && <span style={{ color: GREEN, fontWeight: 600, marginRight: 6 }}>New</span>}
          {ep.date}
        </div>
      </div>
      <span style={{ fontSize: 11, color: GREEN, fontWeight: 500, flexShrink: 0 }}>Listen →</span>
    </a>
  );
}

export default function ResourcePage({ record, related, ytData, bookData }) {
  const f = record.fields;
  const { user } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [podData, setPodData] = useState(null);
  const [logoSrc, setLogoSrc] = useState(f['Image URL'] || null);

  const isPodcast = f.Type === 'Podcast';
  const isYouTube = f.Type === 'YouTube';
  const isBook    = f.Type === 'Book';

  useEffect(() => {
    if (isPodcast && f['RSS Feed URL']) {
      fetch(`/api/podcast-single?id=${record.id}`)
        .then(r => r.json())
        .then(data => {
          setPodData(data);
          if (!f['Image URL'] && data.showArt) setLogoSrc(data.showArt);
        })
        .catch(() => {});
    }
  }, [record.id]);

  const score = f['Final Score'] ? (f['Final Score'] % 1 === 0 ? f['Final Score'].toString() : f['Final Score'].toFixed(1)) : null;
  const breakdown = [
    { label: 'Expert Score', value: f['Expert Score'], weight: 25 },
    { label: 'Community Score', value: f['Community Score'], weight: 25 },
    { label: 'Popularity Score', value: f['Popularity Score'], weight: 20 },
    { label: 'Recency Score', value: f['Recency Score'], weight: 15 },
    { label: 'Clinical Depth', value: f['Clinical Depth Score'], weight: 15 },
  ];

  const title = `${f.Name} — The Dental Commute`;
  const description = f.Description ? f.Description.slice(0, 155) : `${f.Name} is a ${f.Type} resource ranked on The Dental Commute — the dental professional's resource directory.`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://thedentalcommute.com/resource/${record.id}`} />
        <meta property="og:image" content="https://thedentalcommute.com/og-image.jpg" />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://thedentalcommute.com/resource/${record.id}`} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Review",
          "name": f.Name,
          "description": description,
          "url": f.URL,
          "reviewRating": score ? { "@type": "Rating", "ratingValue": score, "bestRating": "100" } : undefined,
          "author": { "@type": "Organization", "name": "The Dental Commute" },
          "itemReviewed": { "@type": "Thing", "name": f.Name, "url": f.URL }
        })}} />
      </Head>

      <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT }}>
        <div style={{ height: 3, background: GREEN }} />

        {/* Header */}
        <div style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(245,242,235,0.95)' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/">
              <img src="/logo.png" alt="The Dental Commute" style={{ height: 48, width: 'auto' }} />
            </Link>
            {user ? (
              <span style={{ fontSize: 13, color: '#555' }}>{user.email}</span>
            ) : (
              <button onClick={() => setShowSignIn(true)} style={{ fontSize: 13, padding: '7px 18px', borderRadius: 4, background: GREEN, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>
                Sign in
              </button>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>

          <Link href="/" style={{ fontSize: 13, color: GREEN, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
            ← Back to all resources
          </Link>

          {/* Hero */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <Logo url={f.URL} name={f.Name} imageUrl={logoSrc} size={80} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: '#e8f5f0', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.Type}</span>
                  {f.Specialty && <span style={{ fontSize: 11, color: '#888', background: '#f0f0f0', padding: '3px 10px', borderRadius: 20 }}>{f.Specialty}</span>}
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 4px', fontFamily: FONT_DISPLAY, letterSpacing: -0.5, lineHeight: 1.2 }}>{f.Name}</h1>
                {f['Host or Author'] && <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>{f['Host or Author']}</div>}
                {score && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: GREEN, color: '#fff', padding: '5px 14px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
                    ★ {score}
                  </div>
                )}
              </div>
            </div>

            {f.Description && (
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: '24px 0 0' }}>{f.Description}</p>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {f.URL && (
                <a href={f.URL} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: GREEN, textDecoration: 'none', padding: '10px 20px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {isYouTube ? 'Subscribe on YouTube →' : isBook ? 'View on Amazon →' : `Visit ${f.Name} →`}
                </a>
              )}
              {isPodcast && (
                <>
                  <a href={`https://podcasts.apple.com/search?term=${encodeURIComponent(f.Name)}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, fontWeight: 500, color: '#555', background: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Apple Podcasts
                  </a>
                  <a href={`https://open.spotify.com/search/${encodeURIComponent(f.Name)}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, fontWeight: 500, color: '#555', background: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Spotify
                  </a>
                </>
              )}
              {isBook && (
                <a href={`https://www.goodreads.com/search?q=${encodeURIComponent(f.Name)}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 500, color: '#555', background: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Goodreads
                </a>
              )}
              {f['RSS Feed URL'] && !isPodcast && (
                <a href={f['RSS Feed URL']} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 500, color: '#555', background: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  RSS Feed
                </a>
              )}
            </div>
          </div>

          {/* YouTube section */}
          {isYouTube && ytData && (
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
              {/* Stats bar */}
              {(ytData.subscribers || ytData.videos) && (
                <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
                  {ytData.subscribers && (
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>{ytData.subscribers}</div>
                      <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Subscribers</div>
                    </div>
                  )}
                  {ytData.videos && (
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>{ytData.videos}</div>
                      <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Videos</div>
                    </div>
                  )}
                </div>
              )}
              {/* Recent videos */}
              {ytData.recentVideos?.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>Recent Videos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {ytData.recentVideos.map((v, i) => (
                      <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                        style={{ textDecoration: 'none', color: 'inherit', borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}`, background: '#fff', display: 'flex', flexDirection: 'column', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,110,86,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#111' }}>
                          <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: '#fff', fontSize: 14, marginLeft: 3 }}>▶</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{v.title}</div>
                          {v.date && <div style={{ fontSize: 11, color: '#bbb', marginTop: 'auto', paddingTop: 4 }}>{v.date}</div>}
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Book section */}
          {isBook && bookData && (
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                {bookData.cover && (
                  <img src={bookData.cover} alt={f.Name}
                    style={{ width: 110, borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  {/* Metadata row */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                    {bookData.year && (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>{bookData.year}</div>
                        <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Published</div>
                      </div>
                    )}
                    {bookData.pages && (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>{bookData.pages}</div>
                        <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Pages</div>
                      </div>
                    )}
                    {bookData.publisher && (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>{bookData.publisher}</div>
                        <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Publisher</div>
                      </div>
                    )}
                  </div>
                  {bookData.description && (
                    <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, margin: 0 }}>{bookData.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Episodes */}
          {isPodcast && podData?.recent?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>Recent Episodes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {podData.recent.map((ep, i) => <EpisodeCard key={i} ep={ep} isNew={i === 0} />)}
              </div>
            </div>
          )}

          {/* Notable Episodes */}
          {isPodcast && podData?.notable?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>Notable Episodes</div>
              </div>
              <div style={{ fontSize: 12, color: '#bbb', marginBottom: 16 }}>Classic episodes still in the feed — evergreen content worth revisiting.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {podData.notable.map((ep, i) => <EpisodeCard key={i} ep={ep} isNew={false} />)}
              </div>
            </div>
          )}

          {/* Score breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 20 }}>Score Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
              {breakdown.map(b => <ScoreBar key={b.label} label={`${b.label} (${b.weight}%)`} value={b.value} />)}
            </div>
          </div>

          {/* Community */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>Community</div>
            <CommunitySection resourceId={record.id} onSignInRequired={() => setShowSignIn(true)} />
          </div>

          {/* You might also like */}
          {related?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>You Might Also Like</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {related.map((r, i) => {
                  const rf = r.fields;
                  const relScore = rf['Final Score'] ? (rf['Final Score'] % 1 === 0 ? rf['Final Score'].toString() : rf['Final Score'].toFixed(1)) : null;
                  return (
                    <Link key={r.id} href={`/resource/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < related.length - 1 ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', color: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <SmallLogo url={rf.URL} name={rf.Name} imageUrl={rf['Image URL']} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 2 }}>{rf.Name}</div>
                        {rf['Host or Author'] && <div style={{ fontSize: 12, color: '#aaa' }}>{rf['Host or Author']}</div>}
                      </div>
                      {relScore && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, flexShrink: 0 }}>★ {relScore}</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </>
  );
}
