// The Journal Briefings hub: every show that has episodes, the newest episode
// of each, how the format works, and what is coming. Revalidated every 5 min.
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SiteNav from '../../components/SiteNav';
import Footer from '../../components/Footer';
import { briefingEpisode, PlayPill, fmtDur, fmtDate } from '../../components/BriefingPlayer';
import { listShowsWithEpisodes, SITE } from '../../lib/briefings-public';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const MUTED = '#6f6f6a';

export async function getStaticProps() {
  try {
    const shows = await listShowsWithEpisodes();
    return { props: { shows }, revalidate: 300 };
  } catch { return { props: { shows: [] }, revalidate: 60 }; }
}

export default function JournalsHub({ shows }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const f = () => setIsMobile(window.innerWidth < 640); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const live = shows.filter(s => s.episodes > 0);
  const coming = shows.filter(s => s.episodes === 0);
  const title = 'Journal Briefings — the week\'s new research, read to you';
  const description = 'A weekly, AI-narrated briefing per dental specialty: the new papers from the top three journals, summarised in our own words with the authors\' conclusions quoted. Independent, no ads. Every Monday.';
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE}/journals`} />
        <link rel="canonical" href={`${SITE}/journals`} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <div style={{ background: '#f5f2eb', minHeight: '100vh', fontFamily: FONT }}>
        <SiteNav />
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 24px 80px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Journal Briefings · new every Monday</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 30 : 40, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.1, color: '#111', letterSpacing: -0.5 }}>The week's new research, read to you.</h1>
          <p style={{ fontSize: 16, color: '#444', lineHeight: 1.6, maxWidth: 680, margin: '0 0 28px' }}>
            One show per specialty. Every Monday it covers the week's new papers from the specialty's top three journals: each paper summarised in our own words, then the authors' own conclusion, quoted. Open-access papers get the full abstract. You drive. We read.
          </p>

          {live.length === 0 && (
            <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28, fontSize: 15, color: '#444', marginBottom: 28 }}>
              The first shows are being prepared. Episodes appear here the moment they publish.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, marginBottom: 40 }}>
            {live.map(s => {
              const ep = s.latest ? briefingEpisode(s.latest, { show: s.show, row: s.row, artwork: s.artwork }) : null;
              return (
                <div key={s.key} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <Link href={`/journals/${s.key}`}><img src={s.artworkPath || s.artwork} alt={s.show} style={{ width: '100%', display: 'block', aspectRatio: '1 / 1' }} /></Link>
                  <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <Link href={`/journals/${s.key}`} style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: '#111', textDecoration: 'none' }}>{s.show}</Link>
                    <div style={{ fontSize: 12, color: MUTED }}>{s.journals.map(j => j.name).join(' · ')}</div>
                    {s.latest && (
                      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, marginTop: 2 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN, marginBottom: 4 }}>Latest</div>
                        <Link href={`/briefing/${s.latest.id}`} style={{ fontSize: 14, fontWeight: 600, color: '#111', textDecoration: 'none', display: 'block', lineHeight: 1.35 }}>{s.latest.title}</Link>
                        <div style={{ fontSize: 12, color: MUTED, margin: '4px 0 10px' }}>{[fmtDate(s.latest.published_at), fmtDur(s.latest.duration_seconds)].filter(Boolean).join(' · ')}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <PlayPill ep={ep} size="sm" />
                          <Link href={`/journals/${s.key}`} style={{ fontSize: 12, color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Episodes &amp; subscribe →</Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? 20 : 28, marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 12 }}>How it works</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 18, fontSize: 14, color: '#333', lineHeight: 1.6 }}>
              <div><strong>Picked mechanically, not by taste.</strong> Every paper the three journals published that week, systematic reviews and trials first. Up to eight in depth; the rest in brief.</div>
              <div><strong>Their facts, our words.</strong> For each paper we describe the study in our own words, checked number by number against the abstract, then quote the authors' conclusion. Open-access abstracts are read exactly as published.</div>
              <div><strong>Honest about the voices.</strong> Grace and Adrian are AI voices and say so in every episode. The shows are independent of the journals, carry no ads, and link to every paper.</div>
            </div>
            <div style={{ fontSize: 13, marginTop: 14 }}><Link href="/journals/policy" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Read the editorial and corrections policy →</Link></div>
          </div>

          {coming.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Coming</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {coming.map(s => <span key={s.key} style={{ fontSize: 12, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '5px 12px', background: '#fff' }}>{s.show}</span>)}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
}
