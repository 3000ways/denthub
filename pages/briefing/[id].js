// A Journal Briefings episode: the papers it covers (how each was covered, our
// summary, the authors' quoted conclusion, link to the paper), chapters to jump
// to, subscribe links and the credits. Built on demand, revalidated every 5 min.
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SiteNav from '../../components/SiteNav';
import Footer from '../../components/Footer';
import { ShareButton } from '../../components/ShareButton';
import { EpisodeBookmarkButton } from '../../components/EpisodeBookmarkButton';
import { PinButton } from '../../components/PinButton';
import { SignInModal } from '../../components/AuthModal';
import { SubscribeLinks } from '../../components/SubscribeLinks';
import { briefingEpisode, useBriefingPlayback, PlayPill, fmtDur, fmtDate, fmtClock } from '../../components/BriefingPlayer';
import { getBriefingPublic, briefingUrl, SITE } from '../../lib/briefings-public';
import { licenceLabel, licenceUrl } from '../../lib/briefing-script';
import { CONTACT_EMAIL } from '../../lib/contact';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const MUTED = '#6f6f6a';

export async function getStaticPaths() { return { paths: [], fallback: 'blocking' }; }
export async function getStaticProps({ params }) {
  try {
    const data = await getBriefingPublic(Number(params.id));
    if (!data) return { notFound: true, revalidate: 60 };
    return { props: { data }, revalidate: 300 };
  } catch { return { notFound: true, revalidate: 60 }; }
}

const MODE = {
  hybrid: { label: 'Summary in our words · conclusion quoted', color: GREEN },
  verbatim: { label: 'Open access · abstract read as published', color: '#1f4e9c' },
  verbatim_nd: { label: 'Open access · abstract read as published', color: '#1f4e9c' },
  quote_only: { label: 'Title and conclusion', color: MUTED },
};

function Chapters({ chapters, ep }) {
  const { playAt } = useBriefingPlayback(ep);
  if (!Array.isArray(chapters) || chapters.length < 2) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: '20px 24px', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Jump to a paper</div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>Each paper is its own chapter. In the player, ⏮ and ⏭ (or the next-track button on your headphones or in your car) move between them.</div>
      {chapters.map((ch, i) => (
        <button key={i} onClick={() => playAt(ch.start)} style={{ display: 'flex', gap: 14, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: i ? `1px solid ${BORDER}` : 'none', padding: '9px 0', cursor: 'pointer', fontFamily: FONT, color: '#111' }}>
          <span style={{ fontSize: 12, color: GREEN, fontWeight: 700, width: 44, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtClock(ch.start)}</span>
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>{ch.title}</span>
        </button>
      ))}
    </div>
  );
}

function Paper({ p, n }) {
  const mode = MODE[p.readMode] || MODE.hybrid;
  return (
    <div style={{ padding: '18px 0', borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: GREEN, width: 30, flexShrink: 0, lineHeight: 1.2 }}>{n}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3, color: '#111' }}>
            {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#111', textDecoration: 'none' }}>{p.title}</a> : p.title}
          </h3>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>{p.by ? `${p.by} · ` : ''}{p.journal}</div>
          <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: mode.color, border: `1px solid ${mode.color}`, borderRadius: 4, padding: '2px 7px', marginBottom: 10 }}>
            {mode.label}{p.licence && p.readMode !== 'hybrid' ? ` · ${licenceLabel(p.licence)}` : ''}
          </div>
          {p.summary && <p style={{ fontSize: 14, color: '#333', lineHeight: 1.7, margin: '0 0 10px' }}>{p.summary}</p>}
          {p.conclusion && (
            <blockquote style={{ margin: '0 0 10px', padding: '10px 14px', borderLeft: `3px solid ${GREEN}`, background: 'rgba(15,110,86,0.05)', fontSize: 14, color: '#222', lineHeight: 1.6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: GREEN, display: 'block', marginBottom: 4 }}>In the authors' own words</span>
              “{p.conclusion}”
            </blockquote>
          )}
          <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
            {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Read the paper ↗</a>}
            {p.licence && licenceUrl(p.licence) && p.readMode !== 'hybrid' && <a href={licenceUrl(p.licence)} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, textDecoration: 'none' }}>Licence: {licenceLabel(p.licence)}</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BriefingPage({ data }) {
  const { briefing: b, show, fullReads, headlines, newer, older } = data;
  const ep = briefingEpisode(b, show);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const f = () => setIsMobile(window.innerWidth < 640); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const title = `${b.title} — ${show.show}`;
  const description = b.kind === 'trailer'
    ? `Episode 0 of ${show.show}: what the show is and how it works.`
    : `${fullReads.length} paper${fullReads.length === 1 ? '' : 's'} in depth${headlines.length ? ` and ${headlines.length} in brief` : ''} from ${show.journals.map(j => j.name).join(', ')}. AI-narrated, independent.`;
  const url = briefingUrl(b.id);
  const date = fmtDate(b.published_at), dur = fmtDur(b.duration_seconds);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={show.artwork} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={url} />
        <link rel="alternate" type="application/rss+xml" title={show.show} href={show.feed} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'PodcastEpisode', name: b.title, description, url, image: show.artwork,
          ...(b.published_at ? { datePublished: new Date(b.published_at).toISOString() } : {}),
          ...(b.duration_seconds ? { timeRequired: `PT${Math.round(b.duration_seconds / 60)}M` } : {}),
          associatedMedia: { '@type': 'MediaObject', contentUrl: b.audio_url },
          partOfSeries: { '@type': 'PodcastSeries', name: show.show, url: show.url, webFeed: show.feed },
        }).replace(/</g, '\\u003c') }} />
      </Head>
      <div style={{ background: '#f5f2eb', minHeight: '100vh', fontFamily: FONT }}>
        <SiteNav />
        <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '40px 24px 80px' }}>
          <Link href={`/journals/${show.key}`} style={{ fontSize: 13, color: GREEN, textDecoration: 'none', display: 'inline-flex', gap: 4, marginBottom: 24 }}>← {show.show}</Link>

          <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: isMobile ? 20 : 32, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <img src={show.artworkPath || show.artwork} alt={show.show} style={{ width: 132, height: 132, borderRadius: 10, flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }} />
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  <Link href={`/journals/${show.key}`} style={{ color: GREEN, textDecoration: 'none' }}>{show.show}</Link> · AI-narrated · independent
                </div>
                <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: '#111', margin: '0 0 8px', fontFamily: FONT_DISPLAY, lineHeight: 1.25 }}>{b.title}</h1>
                <div style={{ fontSize: 13, color: '#999', display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                  {date && <span>{date}</span>}{dur && <span>{dur}</span>}
                  {fullReads.length > 0 && <span>{fullReads.length} paper{fullReads.length === 1 ? '' : 's'} in depth{headlines.length ? `, ${headlines.length} in brief` : ''}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                  <PlayPill ep={ep} />
                  {ep.id && <EpisodeBookmarkButton episodeId={ep.id} variant="labeled" onSignInRequired={() => setShowSignIn(true)} />}
                  {ep.id && <ShareButton episodeId={ep.id} episodeTitle={b.title} name={show.show} type="Podcast" variant="labeled" />}
                  {ep.id && <PinButton episodeId={ep.id} onSignInRequired={() => setShowSignIn(true)} />}
                </div>
                <SubscribeLinks show={show} compact />
              </div>
            </div>
          </div>

          <Chapters chapters={b.chapters} ep={ep} />

          {fullReads.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: isMobile ? '18px 16px' : '24px 32px', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>The papers</div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Summaries are ours, written from the published abstract and checked against it. Quoted conclusions are the authors'. Open-access abstracts are read as published.</div>
              {fullReads.map((p, i) => <Paper key={p.id} p={p} n={i + 1} />)}
              {headlines.length > 0 && (
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>In brief</div>
                  {headlines.map(p => (
                    <div key={p.id} style={{ fontSize: 13, lineHeight: 1.5, padding: '6px 0', color: '#333' }}>
                      {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#111', fontWeight: 600, textDecoration: 'none' }}>{p.title}</a> : <strong>{p.title}</strong>}
                      <span style={{ color: MUTED }}> · {p.journal}</span>
                      {p.conclusion && <div style={{ color: '#444', fontSize: 13 }}>“{p.conclusion}”</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, padding: '0 4px', marginBottom: 24 }}>
            Independently produced by The Dental Commute. Not affiliated with or endorsed by any journal or publisher. Narration is synthetic (Grace and Adrian are AI voices). Bibliographic data courtesy of the U.S. National Library of Medicine (PubMed). Rightsholder questions: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: GREEN }}>{CONTACT_EMAIL}</a>; we act within 48 hours.
          </div>

          {(newer || older) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              {older ? <Link href={`/briefing/${older.id}`} style={{ color: GREEN, textDecoration: 'none' }}>← {older.title}</Link> : <span />}
              {newer ? <Link href={`/briefing/${newer.id}`} style={{ color: GREEN, textDecoration: 'none', textAlign: 'right' }}>{newer.title} →</Link> : <span />}
            </div>
          )}
        </div>
        <Footer />
      </div>
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </>
  );
}
