// One Journal Briefings show: artwork, what it covers, subscribe links, every
// published episode. Revalidated every 5 min.
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SiteNav from '../../components/SiteNav';
import Footer from '../../components/Footer';
import { SubscribeLinks } from '../../components/SubscribeLinks';
import { briefingEpisode, PlayPill, fmtDur, fmtDate } from '../../components/BriefingPlayer';
import { getShowPublic, listPublishedBriefings } from '../../lib/briefings-public';
import { CONTACT_EMAIL } from '../../lib/contact';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const MUTED = '#6f6f6a';

export async function getStaticPaths() { return { paths: [], fallback: 'blocking' }; }
export async function getStaticProps({ params }) {
  try {
    const show = await getShowPublic(params.cluster);
    if (!show) return { notFound: true, revalidate: 3600 };
    const episodes = await listPublishedBriefings(params.cluster);
    return { props: { show, episodes }, revalidate: 300 };
  } catch { return { notFound: true, revalidate: 60 }; }
}

export default function ShowPage({ show, episodes }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const f = () => setIsMobile(window.innerWidth < 640); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const title = `${show.show} — The Dental Commute`;
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={show.description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={show.description} />
        <meta property="og:image" content={show.artwork} />
        <meta property="og:url" content={show.url} />
        <link rel="canonical" href={show.url} />
        <link rel="alternate" type="application/rss+xml" title={show.show} href={show.feed} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'PodcastSeries', name: show.show, description: show.description, url: show.url, image: show.artwork, webFeed: show.feed, author: { '@type': 'Organization', name: 'The Dental Commute' } }).replace(/</g, '\\u003c') }} />
      </Head>
      <div style={{ background: '#f5f2eb', minHeight: '100vh', fontFamily: FONT }}>
        <SiteNav />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '40px 24px 80px' }}>
          <Link href="/journals" style={{ fontSize: 13, color: GREEN, textDecoration: 'none', display: 'inline-flex', gap: 4, marginBottom: 24 }}>← All journal briefings</Link>
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 28 }}>
            <img src={show.artworkPath || show.artwork} alt={show.show} style={{ width: isMobile ? 140 : 220, height: isMobile ? 140 : 220, borderRadius: 14, flexShrink: 0, boxShadow: '0 6px 24px rgba(0,0,0,0.16)' }} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Journal Briefings · {show.label}</div>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 30 : 38, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.1, color: '#111' }}>{show.show}</h1>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6, margin: '0 0 16px' }}>{show.description}</p>
              <SubscribeLinks show={show} />
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? '18px 16px' : '24px 28px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 12 }}>Episodes</div>
            {episodes.length === 0 && <div style={{ fontSize: 14, color: MUTED }}>The first episode is on its way. Subscribe now and it will arrive in your app the moment it publishes.</div>}
            {episodes.map((b, i) => {
              const ep = briefingEpisode(b, show);
              return (
                <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: i ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/briefing/${b.id}`} style={{ fontSize: 15, fontWeight: 600, color: '#111', textDecoration: 'none', lineHeight: 1.35, display: 'block' }}>{b.title}</Link>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{[b.kind === 'trailer' ? 'Introduction' : `Week of ${b.week_of}`, fmtDate(b.published_at), fmtDur(b.duration_seconds), b.checks?.papers ? `${b.checks.papers} papers` : null].filter(Boolean).join(' · ')}</div>
                  </div>
                  <PlayPill ep={ep} size="sm" label={undefined} />
                </div>
              );
            })}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? '18px 16px' : '24px 28px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 12 }}>The journals</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
              {show.journals.map(j => (
                <div key={j.pubmed_abbr} style={{ fontSize: 14, color: '#222' }}>
                  <div style={{ fontWeight: 600 }}>{j.name}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{j.society ? `${j.society} · ` : ''}on air as “{j.spoken_name}”</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? '18px 16px' : '24px 28px', fontSize: 14, color: '#333', lineHeight: 1.7 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>How this show is made</div>
            <p style={{ margin: '0 0 10px' }}>Every night we check PubMed for new papers in these three journals. On Monday the week's papers are ordered mechanically (systematic reviews and trials first, then by journal, newest first). Up to eight are covered in depth; the rest get the title and the authors' conclusion.</p>
            <p style={{ margin: '0 0 10px' }}>For each paper, Adrian describes the study in our own words, written from the published abstract and checked against it number by number, and Grace quotes the authors' conclusion. When a paper is open access under a Creative Commons licence, the abstract is read exactly as published. Both are AI voices, and every episode says so.</p>
            <p style={{ margin: 0 }}>The show is independent of the journals, carries no advertising, and links to every paper. Bibliographic data courtesy of the U.S. National Library of Medicine (PubMed). Rightsholder questions: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: GREEN }}>{CONTACT_EMAIL}</a>; we act within 48 hours.</p>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
