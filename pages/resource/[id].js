import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../../components/SiteNav';
import Footer from '../../components/Footer';
import { useState, useEffect } from 'react';
import { CommunitySection } from '../../components/Community';
import { useAuth } from '../../lib/auth-context';
import { SignInModal, OnboardingModal } from '../../components/AuthModal';
import { BookmarkButton } from '../../components/BookmarkButton';
import { ShareButton } from '../../components/ShareButton';
import { PinButton } from '../../components/PinButton';
import { ClaimButton } from '../../components/ClaimButton';
import { ReportButton } from '../../components/ReportButton';
import { AllEpisodes } from '../../components/AllEpisodes';
import { supabase } from '../../lib/supabase';
import { fetchResourceEpisodes, mapEpisodeRow, EPISODES_PAGE_SIZE } from '../../lib/resource-episodes';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// "Listen on" / platform pill used in the hero button cluster.
const CHIP = { fontSize: 13, fontWeight: 500, color: '#333', background: '#fafafa', textDecoration: 'none', padding: '9px 16px', borderRadius: 20, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };

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

// No paths are pre-built at deploy time (zero Airtable calls then). With
// fallback: 'blocking', the first visitor to a resource triggers a one-time
// build of that page; afterward it's served from cache and refreshed at most
// once every 5 minutes (ISR). New resources still render on first view.
export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}

// Cached per-resource and refreshed at most once every 5 minutes (ISR), so a
// busy resource page hits Airtable roughly once per 5-minute window instead of
// once per visitor. Returned props are unchanged from the previous version.
export async function getStaticProps({ params }) {
  try {
    const base = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';
    const pat = process.env.AIRTABLE_PAT;
    const origin = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://thedentalcommute.com';

    // Fetch the main record
    const r = await fetch(`https://api.airtable.com/v0/${base}/Resources/${params.id}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!r.ok) return { notFound: true, revalidate: 60 };
    const record = await r.json();
    if (record.fields?.Status !== 'Published') return { notFound: true, revalidate: 60 };

    const type = record.fields?.Type;

    // Resolve the "auto box" image — the machine-derived logo that sits below any
    // human-set image in the icon ladder. It's Airtable's "Auto Image URL" (RSS
    // show art for podcasts, or the AI research guess for other types); for a
    // podcast not yet backfilled, borrow any episode image from the archive.
    let autoImage = record.fields?.['Auto Image URL'] || null;
    if (!autoImage && type === 'Podcast') {
      try {
        const { data } = await supabase
          .from('episodes')
          .select('image')
          .eq('show_resource_id', params.id)
          .not('image', 'is', null)
          .limit(1);
        if (data && data[0]?.image) autoImage = data[0].image;
      } catch {}
    }
    // Open Graph / social image: a human "Image URL" wins, else the auto image.
    const ogImage = record.fields?.['Image URL'] || autoImage || null;

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

    // Server-render the first page of the full episode archive (podcasts only),
    // so episode titles are indexable content and the "All Episodes" section
    // paints instantly. Subsequent pages/search load client-side.
    let initialEpisodes = [];
    let episodeTotal = 0;
    if (type === 'Podcast') {
      try {
        const { episodes, total } = await fetchResourceEpisodes({
          id: params.id, sort: 'newest', offset: 0, limit: EPISODES_PAGE_SIZE, withCount: true,
        });
        initialEpisodes = episodes;
        episodeTotal = total ?? 0;
      } catch {}
    }

    return { props: { record, related, ytData, bookData, ogImage: ogImage || null, autoImage: autoImage || null, initialEpisodes, episodeTotal }, revalidate: 300 };
  } catch {
    return { notFound: true, revalidate: 60 };
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
  const domain = (() => { try { return new URL(url).hostname; } catch { return null; } })();
  const favicon = domain ? `/api/airtable?logo=${domain}` : null;
  // Start with the best image we have (owner/Image URL/auto), else the favicon.
  const [src, setSrc] = useState(imageUrl || favicon || null);

  // React to a higher-priority image arriving after mount — e.g. the owner's
  // logo loads client-side and should replace whatever we started with. (The old
  // version initialised state once and ignored prop changes, so the show art /
  // owner logo never actually took over from the favicon.)
  useEffect(() => {
    if (imageUrl) setSrc(imageUrl);
  }, [imageUrl]);

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

export default function ResourcePage({ record, related, ytData, bookData, ogImage, autoImage, initialEpisodes = [], episodeTotal = 0 }) {
  const f = record.fields;
  const { user, profile } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Resource icon, resolved through the ladder: owner logo (loads client-side,
  // wins) → human "Image URL" → machine "auto box" (RSS show art / AI guess) →
  // favicon → letter (the last two handled inside <Logo>).
  const [logoSrc, setLogoSrc] = useState(f['Image URL'] || autoImage || null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isPodcast = f.Type === 'Podcast';
  const isYouTube = f.Type === 'YouTube';
  const isBook    = f.Type === 'Book';
  const [isClaimed, setIsClaimed] = useState(false);
  const [ownerContent, setOwnerContent] = useState(null);
  const [featuredEpisodes, setFeaturedEpisodes] = useState([]);

  // Claim Your Profile: is this listing claimed, and did its owner add a bio,
  // vision, logo, or feature any episodes? Public-read, so this shows to everyone.
  useEffect(() => {
    supabase.from('resource_claims').select('id').eq('resource_id', record.id).eq('status', 'approved').limit(1)
      .then(({ data }) => setIsClaimed(!!data?.length));
    supabase.from('resource_owner_content').select('bio, vision, logo_url, featured_episode_ids').eq('resource_id', record.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setOwnerContent(data);
        // Owner logo is top of the icon ladder — it wins over Image URL / auto.
        if (data.logo_url) setLogoSrc(data.logo_url);
        if (data.featured_episode_ids?.length) {
          // Fetch the featured episodes with the full card shape and preserve the
          // owner's chosen order. They're rendered — badged — at the top of the
          // "All Episodes" list (there's no separate Featured section anymore).
          supabase.from('episodes')
            .select('id, show_resource_id, show_name, title, description, published_at, link, audio_url, image, duration_seconds')
            .in('id', data.featured_episode_ids)
            .then(({ data: eps }) => {
              if (!eps) return;
              const byId = new Map(eps.map(e => [e.id, mapEpisodeRow(e)]));
              setFeaturedEpisodes(data.featured_episode_ids.map(id => byId.get(id)).filter(Boolean));
            });
        }
      });
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
        <meta property="og:image" content={ogImage || 'https://thedentalcommute.com/og-image.jpg'} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage || 'https://thedentalcommute.com/og-image.jpg'} />
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
        <SiteNav />

        <div style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '20px 12px 60px' : '40px 24px 80px' }}>

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
                  {(Array.isArray(f.Specialty) ? f.Specialty : f.Specialty ? [f.Specialty] : []).map(s => (
                    <span key={s} style={{ fontSize: 11, color: '#888', background: '#f0f0f0', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s}</span>
                  ))}
                  {isClaimed && (
                    <span title="This listing is managed by its creator" style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', padding: '3px 10px', borderRadius: 20 }}>✓ Claimed</span>
                  )}
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

            <div style={{ marginTop: 24 }}>
              {/* Tier 1 — the primary action, then where to listen / find it. One
                  strong green CTA; platforms grouped as quieter "Listen on" chips. */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {f.URL && (
                  <a href={f.URL} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', background: GREEN, textDecoration: 'none', padding: '11px 22px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {isYouTube ? 'Subscribe on YouTube →' : isBook ? 'View on Amazon →' : `Visit ${f.Name} →`}
                  </a>
                )}
                {isPodcast && (
                  <>
                    <span style={{ width: 1, height: 24, background: BORDER, margin: '0 2px' }} aria-hidden="true" />
                    <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>Listen on</span>
                    <a href={`https://podcasts.apple.com/search?term=${encodeURIComponent(f.Name)}`} target="_blank" rel="noopener noreferrer" style={CHIP}>Apple Podcasts</a>
                    <a href={`https://open.spotify.com/search/${encodeURIComponent(f.Name)}`} target="_blank" rel="noopener noreferrer" style={CHIP}>Spotify</a>
                  </>
                )}
                {isBook && (
                  <a href={`https://www.goodreads.com/search?q=${encodeURIComponent(f.Name)}`} target="_blank" rel="noopener noreferrer" style={CHIP}>Goodreads</a>
                )}
                {f['RSS Feed URL'] && !isPodcast && (
                  <a href={f['RSS Feed URL']} target="_blank" rel="noopener noreferrer" style={CHIP}>RSS Feed</a>
                )}
              </div>

              {/* Tier 2 — personal/utility actions (save, pin, share), with the
                  quiet Report link pushed to the far right so it never competes. */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <BookmarkButton resourceId={record.id} variant="labeled" kind={(isPodcast || isYouTube) ? 'follow' : 'save'} onSignInRequired={() => setShowSignIn(true)} />
                <PinButton resourceId={record.id} onSignInRequired={() => setShowSignIn(true)} />
                <ShareButton resourceId={record.id} name={f.Name} type={f.Type} variant="labeled" />
                <span style={{ flex: 1, minWidth: 12 }} />
                <ReportButton resourceId={record.id} name={f.Name} />
              </div>
            </div>
          </div>

          {/* From the creator — owner-controlled, clearly separate from editorial scoring */}
          {ownerContent && (ownerContent.bio || ownerContent.vision) && (
            <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid #e9d5ff', borderRadius: 14, padding: '24px 28px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7c3aed', marginBottom: 14 }}>From the creator</div>
              {ownerContent.bio && <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, margin: '0 0 14px' }}>{ownerContent.bio}</p>}
              {ownerContent.vision && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>Their vision for dentistry</div>
                  <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>&ldquo;{ownerContent.vision}&rdquo;</p>
                </div>
              )}
            </div>
          )}

          {/* YouTube section */}
          {isYouTube && ytData && (
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: isMobile ? '18px 14px' : '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
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
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: isMobile ? '18px 14px' : '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
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

          {/* All Episodes — the show's whole back-catalog: newest-first,
              searchable, with the creator's featured picks pinned + badged at the
              top. (Replaces the old separate Featured/Recent/Notable sections;
              refreshed on view so it's current the moment you open the page.) */}
          {isPodcast && episodeTotal > 0 && (
            <AllEpisodes
              showResourceId={record.id}
              showName={f.Name}
              initialEpisodes={initialEpisodes}
              initialTotal={episodeTotal}
              featuredEpisodes={featuredEpisodes}
              onSignInRequired={() => setShowSignIn(true)}
            />
          )}

          {/* Score breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: isMobile ? '18px 14px' : '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 20 }}>Score Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
              {breakdown.map(b => <ScoreBar key={b.label} label={`${b.label} (${b.weight}%)`} value={b.value} />)}
            </div>
          </div>

          {/* Community */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: isMobile ? '18px 14px' : '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>Community</div>
            <CommunitySection resourceId={record.id} onSignInRequired={() => setShowSignIn(true)} />
          </div>

          {/* You might also like */}
          {related?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: isMobile ? '18px 14px' : '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>You Might Also Like</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {related.map((r, i) => {
                  const rf = r.fields;
                  const relScore = rf['Final Score'] ? (rf['Final Score'] % 1 === 0 ? rf['Final Score'].toString() : rf['Final Score'].toFixed(1)) : null;
                  return (
                    <Link key={r.id} href={`/resource/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < related.length - 1 ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', color: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <SmallLogo url={rf.URL} name={rf.Name} imageUrl={rf['Image URL'] || rf['Auto Image URL']} size={40} />
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

          {/* Claim this page */}
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>
              Are you the creator of {f.Name}? Claim this page to correct the info, add your links, and feature your favorite episodes.
            </div>
            <ClaimButton resourceId={record.id} resourceName={f.Name} onSignInRequired={() => setShowSignIn(true)} />
          </div>

        </div>

        <Footer />
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </>
  );
}
