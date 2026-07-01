import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import SiteNav from '../components/SiteNav';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

const card = {
  background:   'rgba(255,255,255,0.85)',
  border:       `1px solid ${BORDER}`,
  borderRadius: 12,
  boxShadow:    '0 1px 6px rgba(0,0,0,0.05)',
  padding:      '32px 32px 28px',
  marginBottom: 16,
};

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
      color:'#999', paddingBottom:14, marginBottom:24, borderBottom:`1px solid ${BORDER}` }}>
      {children}
    </div>
  );
}

export default function About() {
  const [resources, setResources]     = useState([]);
  const [episodeCount, setEpisodeCount] = useState(0);

  useEffect(() => {
    fetch('/api/airtable?table=Resources')
      .then(r => r.json())
      .then(d => setResources(d.records || []))
      .catch(() => {});
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setEpisodeCount(d.episodes || 0))
      .catch(() => {});
  }, []);

  const byType = t => resources.filter(r => r.fields?.Type === t).length;

  return (
    <>
      <Head>
        <title>About — The Dental Commute</title>
        <meta name="description" content="The Dental Commute is a curated index of the best dental resources — built by a dentist, for dentists." />
        <meta property="og:title" content="About — The Dental Commute" />
        <meta property="og:description" content="The Dental Commute is a curated index of the best dental resources — built by a dentist, for dentists." />
        <meta property="og:url" content="https://thedentalcommute.com/about" />
        <meta property="og:image" content="https://thedentalcommute.com/logo.png" />
        <link rel="canonical" href="https://thedentalcommute.com/about" />
      </Head>

      <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>
        <SiteNav />

        <div style={{ maxWidth:720, margin:'0 auto', padding:'40px 20px 100px' }}>

          {/* Page heading — outside the cards */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:10, fontWeight:500 }}>About The Dental Commute</div>
            <h1 style={{ fontSize:38, fontWeight:700, color:'#111', lineHeight:1.1, margin:0, letterSpacing:-1.2, fontFamily:FONT_DISPLAY }}>
              Built by a dentist,<br/>for dentists
            </h1>
          </div>

          {/* ── Card 1: Mission + Stats ── */}
          <div style={card}>
            <SectionLabel>What we do</SectionLabel>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 28px' }}>
              The Dental Commute is a curated index of the best learning resources in dentistry — podcasts, books, CE courses, YouTube channels, software, and more — scored and ranked by dental professionals.
            </p>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 28px' }}>
              Every resource is scored using a weighted formula that combines expert opinion, community feedback, popularity, recency, and clinical depth. The goal is a trusted, living directory that gets better as more dentists contribute.
            </p>

            {/* Stats bar — live data */}
            <div style={{ display:'flex', gap:28, padding:'20px 0', borderTop:`1px solid ${BORDER}`, flexWrap:'wrap' }}>
              {[
                { value: episodeCount > 0 ? episodeCount.toLocaleString() : '—', label:'episodes indexed' },
                { value: resources.length > 0 ? resources.length.toLocaleString() : '—', label:'total resources' },
                { value: byType('Podcast') || '—', label:'podcasts' },
                { value: byType('YouTube') || '—', label:'YouTube channels' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div style={{ fontSize:22, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Card 2: Scoring formula ── */}
          <div style={card}>
            <SectionLabel>The scoring formula</SectionLabel>
            <p style={{ fontSize:14, color:'#777', lineHeight:1.65, margin:'0 0 20px' }}>
              Each resource receives a composite score weighted across five dimensions.
            </p>
            {[
              { label:'Expert Score',      weight:'25%' },
              { label:'Community Score',   weight:'25%' },
              { label:'Popularity Score',  weight:'20%' },
              { label:'Recency Score',     weight:'15%' },
              { label:'Clinical Depth',    weight:'15%' },
            ].map(({ label, weight }) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'11px 0', borderBottom:`0.5px solid ${BORDER}` }}>
                <span style={{ fontSize:14, color:'#444' }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:GREEN, background:'#E8F5F0',
                  borderRadius:4, padding:'2px 10px' }}>{weight}</span>
              </div>
            ))}
          </div>

          {/* ── Card 3: Submit ── */}
          <div style={card}>
            <SectionLabel>Know a great resource?</SectionLabel>
            <p style={{ fontSize:14, color:'#777', lineHeight:1.65, margin:'0 0 20px' }}>
              The Dental Commute is only as good as its community. If there's a podcast, book, course, or tool you think belongs here, submit it and we'll review it.
            </p>
            <Link href="/?submit=1"
              style={{ fontSize:13, padding:'10px 24px', borderRadius:6, background:GREEN, color:'#fff',
                fontFamily:FONT_BODY, fontWeight:600, textDecoration:'none', display:'inline-block' }}>
              Submit a resource
            </Link>
          </div>

          {/* ── Card 4: Contact ── */}
          <div style={card}>
            <SectionLabel>Get in touch</SectionLabel>
            <p style={{ fontSize:14, color:'#777', lineHeight:1.65, margin:'0 0 16px' }}>
              Questions, feedback, or partnership inquiries — reach out directly.
            </p>
            <a href="mailto:hello@thedentalcommute.com"
              style={{ fontSize:14, color:GREEN, fontWeight:600, textDecoration:'none' }}>
              hello@thedentalcommute.com
            </a>
          </div>

        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${BORDER}` }}>
          <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:12, color:'#bbb' }}>© {new Date().getFullYear()} The Dental Commute. All rights reserved.</div>
            <a href="mailto:hello@thedentalcommute.com" style={{ fontSize:12, color:'#bbb', textDecoration:'none' }}>hello@thedentalcommute.com</a>
          </div>
        </div>

      </div>
    </>
  );
}
