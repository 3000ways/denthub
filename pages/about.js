import { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';
import Head from 'next/head';
import SiteNav from '../components/SiteNav';
import { CONTACT_EMAIL } from '../lib/contact';

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
                  Practicing endodontist and lifelong learner who built The Dental Commute to give back to the community that shaped him — and to thank and support the creators who take time out of their day to share what they know. His commute time became his CE time, and this site is his way of paying it forward.
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
                  The AI reviewer behind part of each score. YODA_Bot (Your Optimal Dental Advisor) reads each resource's recent content and checks its creator's credentials against a fixed rubric to produce the Expert and Clinical Depth scores.
                </p>
              </div>

            </div>
          </div>

          {/* ── Card 1: Mission + Stats ── */}
          <div style={card}>
            <SectionLabel>What we do</SectionLabel>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 20px' }}>
              The Dental Commute is a curated directory of the best learning resources in dentistry: podcasts, YouTube channels, and books.
            </p>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 20px' }}>
              Want to dive deep into a particular topic in dentistry? You've found a search engine that indexes {episodeCount > 0 ? `${episodeCount.toLocaleString()}+` : '38,000+'} podcast episodes and surfaces the exact moment your subject comes up — with a single click. Instead of sifting through Google results or asking colleagues for recommendations, browse by category or specialty and find what dental professionals are actually listening to, reading, and learning from.
            </p>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 28px' }}>
              Each resource carries a score built from measurable data and an AI review of its recent content. The score sets the order of our rankings, but it isn't the final word. It's a starting point to help you discover what's out there and decide what's right for you.
            </p>

            {/* Stats bar — live data */}
            <div style={{ display:'flex', gap:28, padding:'20px 0', borderTop:`1px solid ${BORDER}`, flexWrap:'wrap' }}>
              {[
                { value: episodeCount > 0 ? episodeCount.toLocaleString() : '—', label:'episodes indexed' },
                { value: resources.length > 0 ? resources.length.toLocaleString() : '—', label:'total resources' },
                { value: byType('Podcast') || '—', label:'podcasts' },
                { value: byType('YouTube') || '—', label:'YouTube channels' },
                { value: byType('Book') || '—', label:'books' },
                { value: resources.length > 0 ? (resources.length - byType('Podcast') - byType('YouTube') - byType('Book')).toLocaleString() : '—', label:'courses, coaching & more' },
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
              Every resource on The Dental Commute receives a composite score out of 100, calculated across five weighted dimensions. Three come from measurable data: how recent the content is, audience size, and engagement from members of this site. The other two, Expert and Clinical Depth, come from an AI reviewer that reads the resource's recent content, looks up its creator's credentials, and applies a fixed rubric.
            </p>
            <p style={{ fontSize:15, color:'#555', lineHeight:1.75, margin:'0 0 24px' }}>
              <strong style={{ color:'#333' }}>The score sets the order of our rankings, but it isn't a verdict on quality.</strong> A podcast with a score of 72 is not objectively better than one with a score of 68. They may simply serve different audiences, specialties, or learning styles. The score is intended to give visitors a starting point, not to declare a winner.
            </p>

            {[
              { label:'Expert Score',     weight:'25%', desc:"An AI reviewer's assessment of the creator's authority, such as credentials, academic roles, and reputation among dental professionals." },
              { label:'Community Score',  weight:'25%', desc:'How members of this site engage with the resource: votes, comments, bookmarks, and pins. With little activity, this stays close to a neutral 50.' },
              { label:'Popularity Score', weight:'20%', desc:'Audience size compared with resources of the same type: subscribers for YouTube channels, number of ratings for books, and back-catalog size for podcasts, an imperfect stand-in for reach.' },
              { label:'Recency Score',    weight:'15%', desc:'How recent the content is: new episodes and videos, or publication year for books. Fresh, consistent content scores higher than dormant archives.' },
              { label:'Clinical Depth',   weight:'15%', desc:"An AI reviewer's assessment of how evidence-based and clinically actionable the content is for practicing dentists." },
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
              Data scores are recalculated weekly, and AI reviews rotate through the directory. A Community score moves further from 50 as more members engage. AI reviews can make mistakes, so if a score looks wrong, please tell us.
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
          <div id="contact" style={card}>
            <SectionLabel>Get in touch</SectionLabel>
            <p style={{ fontSize:14, color:'#777', lineHeight:1.65, margin:'0 0 20px' }}>
              Questions, feedback, or partnership inquiries? Reach out directly.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              <div style={{ fontSize:14, color:'#555' }}>
                📬 Suggestions, feedback & complaints →{' '}
                <a href={`mailto:${CONTACT_EMAIL}`}
                  style={{ color:GREEN, fontWeight:600, textDecoration:'none' }}>
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>

        </div>

        <Footer maxWidth={720} />

      </div>
    </>
  );
}
