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

          {/* ── Card 0: Team ── */}
          <div style={card}>
            <SectionLabel>The team</SectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>

              {/* Andrei */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
                <img src="/andrei.png" alt="Andrei Ionescu"
                  style={{ width:100, height:100, borderRadius:'50%', objectFit:'cover',
                    border:`3px solid ${BORDER}`, marginBottom:16 }} />
                <div style={{ fontSize:16, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, marginBottom:4 }}>Dr. Andrei Ionescu</div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:GREEN, marginBottom:12 }}>Founder · Endodontist</div>
                <p style={{ fontSize:13, color:'#777', lineHeight:1.65, margin:0 }}>
                  Practicing endodontist and lifelong learner who built The Dental Commute out of frustration with how hard it is to find quality dental education in one place. His commute time became his CE time — and this site is the result.
                </p>
              </div>

              {/* YODA_Bot */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
                <img src="/yoda-bot.png" alt="YODA_Bot"
                  style={{ width:100, height:100, borderRadius:'50%', objectFit:'cover',
                    border:`3px solid ${BORDER}`, marginBottom:16 }} />
                <div style={{ fontSize:16, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, marginBottom:4 }}>YODA_Bot</div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:GREEN, marginBottom:12 }}>AI Curator · Scoring Engine</div>
                <p style={{ fontSize:13, color:'#777', lineHeight:1.65, margin:0 }}>
                  The AI behind the scores. YODA_Bot (Your Optimal Dental Advisor) evaluates each resource against publicly available signals — reviews, reach, recency, and clinical depth — to generate the composite scores you see across the directory.
                </p>
              </div>

            </div>
          </div>

          {/* ── Card 1: Mission + Stats ── */}
          <div style={card}>
            <SectionLabel>What we do</SectionLabel>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 20px' }}>
              The Dental Commute is a curated directory of the best learning resources in dentistry — podcasts, YouTube channels, books, CE courses, conferences, coaching programs, and professional communities — all in one place.
            </p>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 20px' }}>
              Think of it as a search engine for dental education. Instead of sifting through Google results or asking colleagues for recommendations, you can browse by category or specialty and find what other dental professionals are actually listening to, reading, and learning from.
            </p>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 28px' }}>
              Each resource carries a score generated from publicly available signals — reviews, reach, recency, and clinical relevance. The score isn't meant to declare one resource better than another; it's a starting point to help you discover what's out there and decide what's right for you.
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

            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 16px' }}>
              Every resource on The Dental Commute receives a composite score out of 100, calculated across five weighted dimensions. The score is generated using an AI model that evaluates each resource against publicly available information — listener reviews, download trends, citation frequency in dental education, recency of content, and clinical relevance.
            </p>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 24px' }}>
              <strong style={{ color:'#333' }}>The score is not a ranking of quality.</strong> It is a signal, not a verdict. A podcast with a score of 72 is not objectively better than one with a score of 68 — they may simply serve different audiences, specialties, or learning styles. The score is intended to give visitors a starting point, not to declare a winner.
            </p>

            {[
              { label:'Expert Score',     weight:'25%', desc:'How often the resource is cited or recommended by educators, lecturers, and specialists in the field.' },
              { label:'Community Score',  weight:'25%', desc:'Aggregated listener and reader sentiment drawn from reviews, ratings, and community discussions.' },
              { label:'Popularity Score', weight:'20%', desc:'Reach and visibility — download numbers, subscriber counts, and search presence within dentistry.' },
              { label:'Recency Score',    weight:'15%', desc:'How actively the resource is being updated. Fresh, consistent content scores higher than dormant archives.' },
              { label:'Clinical Depth',   weight:'15%', desc:'The degree to which the content engages with evidence-based clinical material rather than lifestyle or business topics alone.' },
            ].map(({ label, weight, desc }) => (
              <div key={label} style={{ padding:'14px 0', borderBottom:`0.5px solid ${BORDER}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'#333' }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:GREEN, background:'#E8F5F0',
                    borderRadius:4, padding:'2px 10px', flexShrink:0 }}>{weight}</span>
                </div>
                <p style={{ fontSize:13, color:'#888', lineHeight:1.6, margin:0 }}>{desc}</p>
              </div>
            ))}

            <p style={{ fontSize:13, color:'#aaa', lineHeight:1.6, margin:'20px 0 0', fontStyle:'italic' }}>
              Scores are periodically recalculated as new community data becomes available. As The Dental Commute grows, community voting from verified dental professionals will carry increasing weight in the formula.
            </p>
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

            <p style={{ fontSize:13, color:'#aaa', lineHeight:1.65, margin:'20px 0 0', fontStyle:'italic' }}>
              📬 Suggestions and positive feedback go to Dr. Ionescu. Complaints go directly to YODA_Bot, who will process them with patience, wisdom, and zero emotional response.
            </p>
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
