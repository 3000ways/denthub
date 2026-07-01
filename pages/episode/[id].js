import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import SiteNav from '../../components/SiteNav';
import { ShareButton } from '../../components/ShareButton';
import { EpisodeBookmarkButton } from '../../components/EpisodeBookmarkButton';
import { SignInModal } from '../../components/AuthModal';
import { usePlayer } from '../../lib/player-context';
import { supabase } from '../../lib/supabase';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Strip HTML tags from RSS descriptions (which often contain markup) so we can
// render + preview them as plain text safely.
function stripHtml(s) {
  if (!s) return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtDur(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m} min`;
}

// No episode pages are pre-built at deploy (zero DB calls then). The first
// visitor to an episode link triggers a one-time render; afterward it's served
// from cache and revalidated at most once an hour (ISR). Nothing is created for
// episodes nobody opens — this reads existing archive rows, it stores nothing.
export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  try {
    const { data: ep } = await supabase
      .from('episodes')
      .select('id, show_resource_id, show_name, title, description, published_at, link, audio_url, image, duration_seconds')
      .eq('id', params.id)
      .single();

    if (!ep || !ep.audio_url) return { notFound: true, revalidate: 60 };

    // A few more episodes from the same show, for internal links + discovery.
    const { data: more } = await supabase
      .from('episodes')
      .select('id, title, image, published_at, duration_seconds')
      .eq('show_resource_id', ep.show_resource_id)
      .neq('id', ep.id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(6);

    return {
      props: {
        ep: { ...ep, descriptionText: stripHtml(ep.description) },
        more: more || [],
      },
      revalidate: 3600,
    };
  } catch {
    return { notFound: true, revalidate: 60 };
  }
}

// Play/pause this episode via the shared player. Upserts nothing new — the
// episode already exists in the archive (that's how we have its id).
function PlayButton({ ep }) {
  const { play, pause, resume, isPlaying, currentEpisode } = usePlayer();
  const isActive = currentEpisode && currentEpisode.id === ep.id;

  function handle() {
    if (isActive) { isPlaying ? pause() : resume(); return; }
    play({
      id: ep.id,
      title: ep.title,
      show_name: ep.show_name,
      show_resource_id: ep.show_resource_id,
      audio_url: ep.audio_url,
      image: ep.image,
      duration_seconds: ep.duration_seconds,
    });
  }

  const label = isActive && isPlaying ? '❚❚ Pause' : isActive ? '▶ Resume' : '▶ Play episode';
  return (
    <button onClick={handle}
      style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: GREEN, border: 'none',
        padding: '11px 22px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label}
    </button>
  );
}

export default function EpisodePage({ ep, more }) {
  const date = fmtDate(ep.published_at);
  const dur = fmtDur(ep.duration_seconds);
  const [showSignIn, setShowSignIn] = useState(false);
  const title = `${ep.title} — ${ep.show_name || 'The Dental Commute'}`;
  const description = ep.descriptionText
    ? ep.descriptionText.slice(0, 200)
    : `Listen to ${ep.title}${ep.show_name ? ` from ${ep.show_name}` : ''} on The Dental Commute.`;
  const ogImage = ep.image || 'https://thedentalcommute.com/og-image.jpg';
  const url = `https://thedentalcommute.com/episode/${ep.id}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <link rel="canonical" href={url} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT }}>
        <SiteNav />

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>

          {ep.show_resource_id && (
            <Link href={`/resource/${ep.show_resource_id}`} style={{ fontSize: 13, color: GREEN, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
              ← {ep.show_name || 'Back to show'}
            </Link>
          )}

          {/* Hero */}
          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: 32, border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {ep.image && (
                <img src={ep.image} alt={ep.show_name || ''}
                  style={{ width: 132, height: 132, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }} />
              )}
              <div style={{ flex: 1, minWidth: 240 }}>
                {ep.show_name && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {ep.show_resource_id
                      ? <Link href={`/resource/${ep.show_resource_id}`} style={{ color: GREEN, textDecoration: 'none' }}>{ep.show_name}</Link>
                      : ep.show_name}
                  </div>
                )}
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px', fontFamily: FONT_DISPLAY, lineHeight: 1.25, letterSpacing: -0.3 }}>{ep.title}</h1>
                <div style={{ fontSize: 13, color: '#999', display: 'flex', gap: 12, marginBottom: 20 }}>
                  {date && <span>{date}</span>}
                  {dur && <span>{dur}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <PlayButton ep={ep} />
                  <EpisodeBookmarkButton episodeId={ep.id} variant="labeled" onSignInRequired={() => setShowSignIn(true)} />
                  <ShareButton episodeId={ep.id} episodeTitle={ep.title} name={ep.show_name} type="Podcast" variant="labeled" />
                  {ep.link && (
                    <a href={ep.link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 13, fontWeight: 500, color: '#555', background: '#fff', textDecoration: 'none', padding: '10px 18px', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                      Episode page ↗
                    </a>
                  )}
                </div>
              </div>
            </div>

            {ep.descriptionText && (
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.75, margin: '26px 0 0', whiteSpace: 'pre-line' }}>
                {ep.descriptionText}
              </p>
            )}
          </div>

          {/* More from this show */}
          {more.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: '26px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>
                More from {ep.show_name || 'this show'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {more.map((m, i) => (
                  <Link key={m.id} href={`/episode/${m.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < more.length - 1 ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', color: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {m.image
                      ? <img src={m.image} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#ccc', flexShrink: 0 }}>🎙</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 2, display: 'flex', gap: 10 }}>
                        {fmtDate(m.published_at) && <span>{fmtDate(m.published_at)}</span>}
                        {fmtDur(m.duration_seconds) && <span>{fmtDur(m.duration_seconds)}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        <div style={{ borderTop: '1px solid #e8e8e8', marginTop: 40 }}>
          <div style={{ maxWidth: 1140, margin: '0 auto', padding: '20px 28px' }}>
            <div style={{ fontSize: 12, color: '#bbb' }}>© {new Date().getFullYear()} The Dental Commute. All rights reserved.</div>
          </div>
        </div>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </>
  );
}
