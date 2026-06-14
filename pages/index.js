import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../lib/auth-context';
import { SignInModal, OnboardingModal } from '../components/AuthModal';
import { CommunitySection } from '../components/Community';

const CATEGORIES = [
  { label:'Podcasts',    types:['Podcast'] },
  { label:'YouTube',     types:['YouTube'] },
  { label:'Books',       types:['Book'] },
  { label:'CE Courses',  types:['CE Website','Course'] },
  { label:'Conferences', types:['Conference'] },
  { label:'Communities', types:['Community','Forum','Association'] },
  { label:'Coaching',    types:['Coaching','Mastermind','Mentorship'] },
];

const SPECIALTIES = [
  { label: 'General',       value: 'General Dentistry' },
  { label: 'Endodontics',   value: 'Endodontics' },
  { label: 'Orthodontics',  value: 'Orthodontics' },
  { label: 'Periodontics',  value: 'Periodontics' },
  { label: 'Oral Surgery',  value: 'Oral Surgery' },
  { label: 'Prosthodontics',value: 'Prosthodontics' },
  { label: 'Pediatric',     value: 'Pediatric Dentistry' },
  { label: 'Radiology',     value: 'Oral Radiology' },
  { label: 'Anesthesiology',value: 'Dental Anesthesiology' },
  { label: 'Pain',          value: 'Pain' },
];

const TOPICS = ['Clinical','Technology','Leadership','Marketing','Finance & Investment','Practice Growth','Team & HR','Wellness'];

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const GREEN_LIGHT = '#E8F5F0';
const BORDER = '#e8e8e8';

const DEMO_RESOURCES = [
  { id:'d1', fields:{ Name:'Dental Intel Podcast', Type:'Podcast', URL:'https://dentalintel.com', Description:'Practice analytics and growth strategies for modern dental practices. Hosted by industry leaders covering everything from patient experience to profitability.', 'Host or Author':'Brandon Shird', 'Final Score':94, 'Expert Score':92, 'Community Score':95, 'Popularity Score':93, 'Recency Score':90, 'Clinical Depth Score':96, createdAt:'2025-06-01' }},
  { id:'d2', fields:{ Name:'The Dental Economist', Type:'Book', URL:'https://amazon.com', Description:'A landmark text on practice valuation, associate agreements, and the financial architecture of a thriving dental career.', 'Host or Author':'William Van Dyk', 'Final Score':91, 'Expert Score':90, 'Community Score':92, 'Popularity Score':88, 'Recency Score':85, 'Clinical Depth Score':94, createdAt:'2025-06-03' }},
  { id:'d3', fields:{ Name:'Spear Education', Type:'CE Website', URL:'https://speareducation.com', Description:'World-class continuing education from leading clinicians. Covers occlusion, aesthetics, full-arch restoration, and practice management.', 'Host or Author':'Frank Spear', 'Final Score':93, 'Expert Score':95, 'Community Score':91, 'Popularity Score':94, 'Recency Score':89, 'Clinical Depth Score':97, createdAt:'2025-05-28' }},
  { id:'d4', fields:{ Name:'Dental Nachos', Type:'Podcast', URL:'https://dentalnachos.com', Description:'Real talk for real dentists. Candid conversations about the business of dentistry, burnout, and building a career on your terms.', 'Host or Author':'Ryan Vet', 'Final Score':88, 'Expert Score':87, 'Community Score':90, 'Popularity Score':89, 'Recency Score':92, 'Clinical Depth Score':83, createdAt:'2025-06-05' }},
  { id:'d5', fields:{ Name:'The Endo Files', Type:'Podcast', URL:'https://theendofiles.com', Description:'Dedicated to endodontics — clinical techniques, case discussions, and the latest research in root canal therapy.', 'Host or Author':'Jeremy Erickson', 'Final Score':89, 'Expert Score':91, 'Community Score':88, 'Popularity Score':85, 'Recency Score':87, 'Clinical Depth Score':95, createdAt:'2025-06-06' }},
  { id:'d6', fields:{ Name:'Dentrix Ascend', Type:'Software', URL:'https://dentrixascend.com', Description:'Cloud-based practice management software built for modern multi-location dental groups. Real-time dashboards and integrated billing.', 'Host or Author':'Henry Schein', 'Final Score':86, 'Expert Score':84, 'Community Score':85, 'Popularity Score':90, 'Recency Score':88, 'Clinical Depth Score':82, createdAt:'2025-05-30' }},
];

function getDomain(url) { try { return new URL(url).hostname.replace('www.',''); } catch { return null; } }

// Badge shown on non-dental resources recommended by the dental community
function CommunityPickBadge() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700, color:'#B7791F', background:'#FFFBEB', border:'1px solid #F6E05E', padding:'2px 7px', borderRadius:10, letterSpacing:'0.04em', textTransform:'uppercase', flexShrink:0 }}>
      ★ Community Pick
    </span>
  );
}

// Highlights all search terms in a piece of text by wrapping matches in a yellow span.
function Highlight({ text, terms }) {
  if (!text) return null;
  if (!terms || terms.length === 0 || terms.every(t => !t)) return <>{text}</>;
  const pattern = new RegExp(`(${terms.filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part)
          ? <mark key={i} style={{ background:'#FFF3B0', color:'inherit', borderRadius:2, padding:'0 1px' }}>{part}</mark>
          : part
      )}
    </>
  );
}

function Logo({ url, name, size, imageUrl }) {
  const [err, setErr] = useState(false);
  const sz = size || 32;
  const initial = (name || '?')[0].toUpperCase();
  const domain = url ? getDomain(url) : null;
  const radius = sz <= 32 ? 6 : 8;

  const fallback = (
    <div style={{ width:sz, height:sz, borderRadius:radius, background:GREEN_LIGHT, display:'flex', alignItems:'center', justifyContent:'center', fontSize:sz*0.38, fontWeight:600, color:GREEN, flexShrink:0, fontFamily:FONT_BODY }}>
      {initial}
    </div>
  );

  if (err) return fallback;
  if (imageUrl) {
    return <img src={imageUrl} alt={name} onError={() => setErr(true)} style={{ width:sz*0.72, height:sz, borderRadius:4, objectFit:'cover', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }} />;
  }
  if (!domain) return fallback;
  return <img src={`/api/airtable?logo=${domain}`} alt={name} onError={() => setErr(true)} style={{ width:sz, height:sz, borderRadius:radius, border:`0.5px solid ${BORDER}`, objectFit:'contain', background:'#fafafa', flexShrink:0 }} />;
}

function VoteButtons({ resourceId }) {
  const [vote, setVote] = useState(null);
  const [counts, setCounts] = useState({ up: 0, down: 0 });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('denthub_votes') || '{}');
    const voteCounts = JSON.parse(localStorage.getItem('denthub_vote_counts') || '{}');
    if (stored[resourceId]) setVote(stored[resourceId]);
    if (voteCounts[resourceId]) setCounts(voteCounts[resourceId]);
  }, [resourceId]);

  function handleVote(dir) {
    const stored = JSON.parse(localStorage.getItem('denthub_votes') || '{}');
    const voteCounts = JSON.parse(localStorage.getItem('denthub_vote_counts') || '{}');
    const current = stored[resourceId];
    const currentCounts = voteCounts[resourceId] || { up: 0, down: 0 };
    let newVote = null;
    let newCounts = { ...currentCounts };

    if (current === dir) {
      // unvote
      newVote = null;
      newCounts[dir] = Math.max(0, newCounts[dir] - 1);
    } else {
      // switch or new vote
      if (current) newCounts[current] = Math.max(0, newCounts[current] - 1);
      newVote = dir;
      newCounts[dir] = newCounts[dir] + 1;
    }

    stored[resourceId] = newVote;
    voteCounts[resourceId] = newCounts;
    localStorage.setItem('denthub_votes', JSON.stringify(stored));
    localStorage.setItem('denthub_vote_counts', JSON.stringify(voteCounts));
    setVote(newVote);
    setCounts(newCounts);
  }

  const net = counts.up - counts.down;

  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:0, border:`1px solid ${BORDER}`, borderRadius:6, overflow:'hidden', fontFamily:FONT_BODY }}>
      <button onClick={() => handleVote('up')}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', border:'none', borderRight:`1px solid ${BORDER}`, background: vote === 'up' ? GREEN_LIGHT : '#fff', color: vote === 'up' ? GREEN : '#888', cursor:'pointer', fontSize:12, fontWeight: vote === 'up' ? 600 : 400, fontFamily:FONT_BODY, transition:'all 0.15s' }}>
        <span style={{ fontSize:14 }}>↑</span> {counts.up > 0 ? counts.up : ''}
      </button>
      <div style={{ padding:'6px 10px', fontSize:12, color:'#bbb', background:'#fafafa', minWidth:28, textAlign:'center' }}>
        {net > 0 ? `+${net}` : net === 0 ? '0' : net}
      </div>
      <button onClick={() => handleVote('down')}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', border:'none', borderLeft:`1px solid ${BORDER}`, background: vote === 'down' ? '#FFF0F0' : '#fff', color: vote === 'down' ? '#c0392b' : '#888', cursor:'pointer', fontSize:12, fontWeight: vote === 'down' ? 600 : 400, fontFamily:FONT_BODY, transition:'all 0.15s' }}>
        <span style={{ fontSize:14 }}>↓</span> {counts.down > 0 ? counts.down : ''}
      </button>
    </div>
  );
}

function ScoreBadge({ score, fields }) {
  const [show, setShow] = useState(false);
  const breakdown = [
    { label:'Expert Score', weight:'25%', value:fields?.['Expert Score'] },
    { label:'Community Score', weight:'25%', value:fields?.['Community Score'] },
    { label:'Popularity Score', weight:'20%', value:fields?.['Popularity Score'] },
    { label:'Recency Score', weight:'15%', value:fields?.['Recency Score'] },
    { label:'Clinical Depth', weight:'15%', value:fields?.['Clinical Depth Score'] },
  ];
  const hasData = breakdown.some(b => b.value != null);
  return (
    <span style={{ position:'relative', display:'inline-block' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:600, color:GREEN, background:GREEN_LIGHT, padding:'3px 8px', borderRadius:20, userSelect:'none', fontFamily:FONT_BODY, letterSpacing:0.2 }}>
        <span style={{ fontSize:9 }}>★</span> {score}
      </span>
      {show && hasData && (
        <div style={{ position:'absolute', bottom:'calc(100% + 10px)', left:'50%', transform:'translateX(-50%)', background:'#fff', border:`0.5px solid ${BORDER}`, borderRadius:10, padding:'12px 16px', width:220, boxShadow:'0 8px 32px rgba(0,0,0,0.10)', zIndex:999, pointerEvents:'none', fontFamily:FONT_BODY }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#111', marginBottom:10, paddingBottom:8, borderBottom:'0.5px solid #f0f0f0', letterSpacing:0.3, textTransform:'uppercase' }}>Score breakdown</div>
          {breakdown.map(b => (
            <div key={b.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div><span style={{ fontSize:11, color:'#555' }}>{b.label}</span><span style={{ fontSize:10, color:'#bbb', marginLeft:4 }}>{b.weight}</span></div>
              <span style={{ fontSize:11, fontWeight:500, color: b.value != null ? GREEN : '#ccc' }}>{b.value ?? '—'}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, paddingTop:8, borderTop:'0.5px solid #f0f0f0' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#111' }}>Final</span>
            <span style={{ fontSize:11, fontWeight:700, color:GREEN }}>{((s) => Number(s) % 1 === 0 ? Number(s).toString() : s)(score)}</span>
          </div>
          <div style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%) rotate(45deg)', width:8, height:8, background:'#fff', border:`0.5px solid ${BORDER}`, borderTop:'none', borderLeft:'none' }} />
        </div>
      )}
    </span>
  );
}

function TrendingCard({ r, rank }) {
  const f = r.fields;
  return (
    <div onClick={() => f.URL && window.open(f.URL,'_blank')}
      style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, padding:'18px 18px 16px', cursor:'pointer', minWidth:200, flex:'0 0 200px', transition:'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <Logo url={f.URL} name={f.Name} size={36} imageUrl={f['Image URL']} />
        <span style={{ fontSize:10, color:'#ccc', fontWeight:500 }}>#{rank}</span>
      </div>
      <div style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:GREEN, fontWeight:600, marginBottom:5 }}>{f.Type}</div>
      <div style={{ fontSize:14, fontWeight:600, color:'#111', lineHeight:1.25, marginBottom:8, fontFamily:FONT_DISPLAY }}>{f.Name}</div>
      <div style={{ fontSize:11, color:'#aaa', marginBottom:10 }}>{f['Host or Author']}</div>
      <ScoreBadge score={((s) => s % 1 === 0 ? s.toString() : s.toFixed(1))(f['Final Score']||0)} fields={f} />
    </div>
  );
}

function NewBadge() {
  return <span style={{ fontSize:9, fontWeight:700, color:'#fff', background:GREEN, padding:'2px 6px', borderRadius:10, letterSpacing:'0.06em', textTransform:'uppercase', marginLeft:8, verticalAlign:'middle' }}>New</span>;
}

function SpotlightCard({ item }) {
  const [imgErr, setImgErr] = useState(false);
  const isVideo = item.type === 'video';
  const accentColor = isVideo ? '#e52d27' : GREEN;

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      style={{ display:'block', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden', textDecoration:'none', color:'inherit', transition:'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}
    >
      {/* Cover image — square for podcasts, 16:9 for videos */}
      <div style={{ position:'relative', width:'100%', paddingBottom: isVideo ? '56.25%' : '100%', background:'#f0ede8', overflow:'hidden' }}>
        {item.image && !imgErr ? (
          <img
            src={item.image}
            alt={item.title}
            onError={() => setImgErr(true)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
          />
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#eceae4' }}>
            <span style={{ fontSize:28, color:'#ccc' }}>{isVideo ? '▶' : '🎙'}</span>
          </div>
        )}
        {/* Type badge */}
        <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:accentColor, padding:'3px 7px', borderRadius:3 }}>
          {isVideo ? 'Video' : 'Podcast'}
        </div>
      </div>

      {/* Text */}
      <div style={{ padding:'12px 14px 14px' }}>
        <div style={{ fontSize:10, color:accentColor, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>{item.show}</div>
        <div style={{ fontSize:13, fontWeight:600, color:'#111', lineHeight:1.3, marginBottom:6, fontFamily:FONT_DISPLAY,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ fontSize:11, color:'#999', lineHeight:1.55,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:8 }}>
            {item.description}
          </div>
        )}
        <div style={{ fontSize:10, color:'#ccc' }}>{item.date}</div>
      </div>
    </a>
  );
}

function EpisodeCard({ ep }) {
  const [imgErr, setImgErr] = useState(false);
  const mins = ep.duration;

  return (
    <a href={ep.audioUrl || ep.url || '#'} target="_blank" rel="noopener noreferrer"
      style={{ display:'flex', gap:14, padding:'16px 0', borderBottom:`1px solid ${BORDER}`, textDecoration:'none', color:'inherit', alignItems:'flex-start' }}
      onMouseEnter={e => { e.currentTarget.style.opacity='0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity='1'; }}
    >
      {/* Thumbnail */}
      <div style={{ width:64, height:64, borderRadius:6, overflow:'hidden', background:'#f0ede8', flexShrink:0 }}>
        {ep.image && !imgErr ? (
          <img src={ep.image} alt={ep.title} onError={() => setImgErr(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#ccc' }}>🎙</div>
        )}
      </div>

      {/* Text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, color:GREEN, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>{ep.podcast}</div>
        <div style={{ fontSize:14, fontWeight:600, color:'#111', lineHeight:1.3, marginBottom:5, fontFamily:FONT_DISPLAY,
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {ep.title}
        </div>
        {ep.description && (
          <div style={{ fontSize:12, color:'#999', lineHeight:1.5, marginBottom:6,
            overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {ep.description}
          </div>
        )}
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {ep.date && <span style={{ fontSize:11, color:'#bbb' }}>{ep.date}</span>}
          {mins && <span style={{ fontSize:11, color:'#bbb' }}>· {mins}</span>}
          <span style={{ fontSize:11, color:GREEN, fontWeight:500 }}>Listen →</span>
        </div>
      </div>
    </a>
  );
}

export default function Home() {
  const { user, profile } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [resources, setResources]   = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSpecialty, setActiveSpecialty] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [spotlight, setSpotlight] = useState({ podcasts: [], videos: [] });
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (user && profile && !profile.role) setShowOnboarding(true);
  }, [user, profile]);
  const [ytStats, setYtStats] = useState({});
  const [podStats, setPodStats] = useState({});
  const [bookStats, setBookStats] = useState({});
  const [episodeMode, setEpisodeMode] = useState(false);
  const [episodeQuery, setEpisodeQuery] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeSearched, setEpisodeSearched] = useState(false);

  const [submitOpen, setSubmitOpen] = useState(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('submit') === '1');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitState, setSubmitState] = useState('idle'); // idle | loading | success | error
  const [submitError, setSubmitError] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    if (document.querySelector('script[data-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.setAttribute('data-turnstile', '1');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!submitOpen) return;
    const container = document.getElementById('ts-widget');
    if (!container) return;
    function render() {
      if (window.turnstile && container && !container.hasChildNodes()) {
        window.turnstile.render(container, {
          sitekey: '0x4AAAAAADknPTUZKfiTfeQc',
          theme: 'light',
        });
      }
    }
    // Small delay to ensure modal DOM is painted
    const t = setTimeout(render, 100);
    return () => {
      clearTimeout(t);
      if (container) container.innerHTML = '';
    };
  }, [submitOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    const token = window.turnstile?.getResponse?.();
    if (!token) { setSubmitError('Please complete the human verification.'); return; }
    setSubmitState('loading');
    setSubmitError('');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: submitUrl, turnstileToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSubmitResult(data);
      setSubmitState('success');
    } catch (err) {
      setSubmitError(err.message);
      setSubmitState('error');
      window.turnstile?.reset?.();
    }
  }

  function openSubmitModal() {
    setSubmitUrl('');
    setSubmitState('idle');
    setSubmitError('');
    setSubmitResult(null);
    setSubmitOpen(true);
  }

  useEffect(() => {
    fetch('/api/airtable?table=Resources').then(r => r.json()).then(res => {
      setResources(res.records || []);
    }).finally(() => setLoading(false));

    // Fetch live RSS spotlight data independently
    fetch('/api/spotlight').then(r => r.json()).then(data => {
      const byDate = arr => [...(arr||[])].sort((a,b) => (b.sortDate||0) - (a.sortDate||0));
      setSpotlight({ ...data, podcasts: byDate(data.podcasts), videos: byDate(data.videos) });
    }).catch(() => {});
    // Fetch YouTube channel stats
    fetch('/api/youtube-stats').then(r => r.json()).then(data => setYtStats(data)).catch(() => {});
    fetch('/api/podcast-stats').then(r => r.json()).then(data => setPodStats(data)).catch(() => {});
    fetch('/api/book-stats').then(r => r.json()).then(data => setBookStats(data)).catch(() => {});
  }, []);

  function selectCategory(cat) { setActiveCategory(prev => prev === cat ? null : cat); setExpandedId(null); }
  function selectSpecialty(s) { setActiveSpecialty(prev => prev === s ? null : s); setExpandedId(null); }
  function selectTopic(t) { setActiveTopic(prev => prev === t ? null : t); setExpandedId(null); }

  async function searchEpisodes(q) {
    if (!q || q.trim().length < 2) return;
    setEpisodeLoading(true);
    setEpisodeSearched(true);
    setEpisodes([]);
    try {
      const res = await fetch(`/api/episodes-search?q=${encodeURIComponent(q)}&max=20`);
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch { setEpisodes([]); }
    finally { setEpisodeLoading(false); }
  }

  const displayResources = resources.length > 0 ? resources : DEMO_RESOURCES;
  const isDemo = resources.length === 0 && !loading;

  const filtered = displayResources.filter(r => {
    const f = r.fields;
    const catTypes = activeCategory ? CATEGORIES.find(c => c.label === activeCategory)?.types : null;
    const matchCat = !catTypes || catTypes.some(t => (f.Type||'') === t);
    const matchSpecialty = !activeSpecialty || (Array.isArray(f.Specialty) ? f.Specialty.some(s => (s.name||s) === activeSpecialty) : (f.Specialty||'') === activeSpecialty);
    const matchTopic = !activeTopic || (Array.isArray(f.Topic) ? f.Topic.includes(activeTopic) : (f.Topic||'') === activeTopic);
    const searchTerms = search.toLowerCase().trim().split(/\s+/);
    const searchHaystack = [f.Name, f.Description, f.Type, f['Host or Author']].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = !search || searchTerms.every(term => searchHaystack.includes(term));
    return matchCat && matchSpecialty && matchTopic && matchSearch;
  });

  const hlTerms = search ? search.toLowerCase().trim().split(/\s+/).filter(Boolean) : [];

  const typeGroups = CATEGORIES.map(cat => ({
    label: cat.label,
    types: cat.types,
    items: [...displayResources]
      .filter(r => cat.types.includes(r.fields.Type||''))
      .sort((a,b) => (b.fields['Final Score']||0) - (a.fields['Final Score']||0))
      .slice(0, 4),
  })).filter(g => g.items.length > 0);

  const anyFilterActive = !!(activeCategory || activeSpecialty || activeTopic || search);

  const sorted = [...displayResources].sort((a,b) => (b.fields['Final Score']||0)-(a.fields['Final Score']||0));
  const trending = sorted.slice(0,4);

  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
  const recentlyAdded = [...displayResources]
    .filter(r => r.fields.createdAt && new Date(r.fields.createdAt) > sevenDaysAgo)
    .sort((a,b) => new Date(b.fields.createdAt) - new Date(a.fields.createdAt))
    .slice(0,4);

  const top2 = filtered.slice(0,2);
  const ranked = filtered.slice(0,50);

  const totalResources = displayResources.length;
  const totalCategories = CATEGORIES.length;

  return (
    <>
    <Head>
      <title>The Dental Commute</title>
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/logo.png" />
    </Head>
    <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>

      <div style={{ height:3, background:GREEN }} />

      <div style={{ maxWidth:1140, margin:'0 auto', padding: isMobile ? '0 16px 60px' : '0 36px 100px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, padding:'12px 0', borderBottom:`1px solid ${BORDER}`, marginBottom:0 }}>
          <div style={{ overflow:'hidden', height:230, margin: isMobile ? '0 auto' : '0' }}>
            <img src="/logo.png" alt="The Dental Commute" style={{ height:281, width:'auto', display:'block' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20, flexShrink:0, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
            <a href="/about" style={{ fontSize:13, color:'#777', textDecoration:'none', fontFamily:FONT_BODY, fontWeight:500, letterSpacing:0.1 }}>About</a>
            {user ? (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:13, color:'#555', fontFamily:FONT_BODY }}>
                  {profile?.role ? `${profile.role}` : user.email?.split('@')[0]}
                  {profile?.npi_verified && <span style={{ fontSize:10, background:GREEN, color:'#fff', padding:'1px 6px', borderRadius:10, marginLeft:6, fontWeight:600 }}>✓ Verified</span>}
                </span>
              </div>
            ) : (
              <button onClick={() => setShowSignIn(true)} style={{ fontSize:12, padding:'8px 18px', borderRadius:4, background:'#fff', color:'#555', border:`1px solid ${BORDER}`, cursor:'pointer', fontFamily:FONT_BODY, fontWeight:600 }}>
                Sign in
              </button>
            )}
            <button onClick={openSubmitModal} style={{ fontSize:12, padding:'8px 20px', borderRadius:4, background:GREEN, color:'#fff', border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:600, letterSpacing:0.3, whiteSpace:'nowrap', boxShadow:'0 1px 4px rgba(15,110,86,0.25)' }}>
              Submit a resource
            </button>
          </div>
        </div>

        {/* Hero — only on homepage */}
        {!anyFilterActive && (
          <div style={{ marginBottom:44, paddingTop:36 }}>
            <div style={{ fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', color:'#aaa', marginBottom:16, fontWeight:600 }}>The dentistry resource index</div>
            <h1 style={{ fontSize: isMobile ? 30 : 48, fontWeight:700, color:'#111', lineHeight:1.08, margin:'0 0 20px', letterSpacing: isMobile ? -0.8 : -1.8, fontFamily:FONT_DISPLAY }}>
              Everything dentistry,<br/>ranked and curated
            </h1>
            <p style={{ fontSize:17, color:'#666', lineHeight:1.7, maxWidth:580, margin:'0 0 20px', fontWeight:400 }}>
              The dental professional's guide to learning on the go — the best podcasts, books, CE, coaching, and communities scored by dentists, for dentists.
            </p>
          </div>
        )}

        {/* Category tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${BORDER}`, marginBottom:16, overflowX:'auto', scrollbarWidth:'none' }}>
          {[{label:'All', key:null}, ...CATEGORIES.map(c => ({label:c.label, key:c.label}))].map(({label, key}) => {
            const isActive = activeCategory === key;
            return (
              <button key={label} onClick={() => selectCategory(key)}
                style={{ fontSize:13, padding:'0 0 14px', marginRight:30, background:'none', border:'none', borderBottom: isActive ? `3px solid ${GREEN}` : '3px solid transparent', color: isActive ? '#111' : '#aaa', fontWeight: isActive ? 700 : 400, cursor:'pointer', fontFamily:FONT_BODY, whiteSpace:'nowrap', letterSpacing: isActive ? -0.1 : 0, transition:'color 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Search bar + mode toggle */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
          {!episodeMode && (
            <div style={{ display:'flex', alignItems:'center', gap:10, border:`1px solid ${BORDER}`, borderRadius:8, padding:'13px 18px', background:'#fff', flex:1, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
                style={{ border:'none', background:'transparent', fontSize:14, color:'#111', outline:'none', flex:1, fontFamily:FONT_BODY }} />
              {search && <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', color:'#bbb', fontSize:16, padding:0, lineHeight:1 }}>×</button>}
            </div>
          )}
          {episodeMode && (
            <div style={{ display:'flex', gap:10, alignItems:'center', border:`1px solid ${BORDER}`, borderRadius:8, padding:'13px 18px', background:'#fff', flex:1, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={episodeQuery} onChange={e => setEpisodeQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchEpisodes(episodeQuery)}
                placeholder="Search episodes… e.g. implant complications, cracked tooth, burnout"
                style={{ border:'none', background:'transparent', fontSize:14, color:'#111', outline:'none', flex:1, fontFamily:FONT_BODY }}
                autoFocus />
              {episodeQuery && <button onClick={() => { setEpisodeQuery(''); setEpisodes([]); setEpisodeSearched(false); }} style={{ border:'none', background:'none', cursor:'pointer', color:'#bbb', fontSize:16, padding:0, lineHeight:1 }}>×</button>}
              <button onClick={() => searchEpisodes(episodeQuery)}
                style={{ fontSize:12, padding:'5px 14px', borderRadius:4, background:GREEN, color:'#fff', border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, whiteSpace:'nowrap' }}>
                Search
              </button>
            </div>
          )}
          {/* Mode toggle — right of search bar on desktop, full-width row on mobile */}
          <div style={{ display:'flex', gap:0, border:`1px solid ${BORDER}`, borderRadius:6, overflow:'hidden', background:'#fff', flexShrink:0, width:'100%', maxWidth:'fit-content' }}>
            <button onClick={() => { setEpisodeMode(false); setEpisodes([]); setEpisodeSearched(false); }}
              style={{ fontSize:12, padding:'10px 16px', border:'none', background: !episodeMode ? GREEN : '#fff', color: !episodeMode ? '#fff' : '#999', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, transition:'all 0.15s' }}>
              Resources
            </button>
            <button onClick={() => { setEpisodeMode(true); setSearch(''); }}
              style={{ fontSize:12, padding:'10px 16px', border:'none', borderLeft:`1px solid ${BORDER}`, background: episodeMode ? GREEN : '#fff', color: episodeMode ? '#fff' : '#999', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
              🎙 Episodes
            </button>
          </div>
        </div>

        {/* Specialty filter pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:'10px 0 8px', borderBottom:`1px solid ${BORDER}`, marginBottom:0 }}>
          {[{label:'All', key:null}, ...SPECIALTIES.map(s => ({label:s.label, key:s.value}))].map(({label, key}) => {
            const isActive = activeSpecialty === key;
            return (
              <button key={label} onClick={() => selectSpecialty(key)}
                style={{ fontSize:11, padding:'4px 12px', borderRadius:20, border:`1px solid ${isActive ? GREEN : BORDER}`, background: isActive ? GREEN : '#fff', color: isActive ? '#fff' : '#777', cursor:'pointer', fontFamily:FONT_BODY, fontWeight: isActive ? 600:400, whiteSpace:'nowrap', transition:'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Topic filter pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:'8px 0 20px', borderBottom:`1px solid ${BORDER}`, marginBottom:40 }}>
          {[{label:'All Topics', key:null}, ...TOPICS.map(t => ({label:t, key:t}))].map(({label, key}) => {
            const isActive = activeTopic === key;
            return (
              <button key={label} onClick={() => selectTopic(key)}
                style={{ fontSize:11, padding:'4px 12px', borderRadius:20, border:`1px solid ${isActive ? '#6B46C1' : BORDER}`, background: isActive ? '#6B46C1' : '#fff', color: isActive ? '#fff' : '#777', cursor:'pointer', fontFamily:FONT_BODY, fontWeight: isActive ? 600:400, whiteSpace:'nowrap', transition:'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Episode search results */}
        {episodeMode && (episodeLoading || episodeSearched) && (
          <div style={{ marginBottom:48 }}>
            {episodeLoading && (
              <div style={{ padding:'48px 0', textAlign:'center', color:'#bbb', fontSize:14 }}>Searching episodes…</div>
            )}
            {!episodeLoading && episodeSearched && episodes.length === 0 && (
              <div style={{ padding:'48px 0', textAlign:'center', color:'#bbb', fontSize:14 }}>No episodes found for "{episodeQuery}"</div>
            )}
            {!episodeLoading && episodes.length > 0 && (
              <>
                <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', fontWeight:600, marginBottom:4 }}>
                  {episodes.length} episodes found
                </div>
                <div style={{ fontSize:11, color:'#bbb', marginBottom:18 }}>
                  Results for <span style={{ color:'#111', fontWeight:500 }}>"{episodeQuery}"</span> across all podcasts
                </div>
                <div>
                  {episodes.map((ep, i) => (
                    <EpisodeCard key={ep.id || i} ep={ep} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {loading && <div style={{ padding:'80px 0', textAlign:'center', color:'#ccc', fontSize:14 }}>Loading…</div>}

        {!loading && (<>

          {/* HOME PAGE SECTIONS — only show when no filter active */}
          {!anyFilterActive && (<>

            {/* Spotlight: Latest Episodes & Videos */}
            {(spotlight.podcasts.length > 0 || spotlight.videos.length > 0) && (
              <div style={{ marginBottom:52, background:'rgba(255,255,255,0.55)', borderRadius:12, padding:'28px 28px 24px', border:`1px solid ${BORDER}`, boxShadow:'0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:24, paddingBottom:14, borderBottom:`2px solid #111` }}>
                  <div style={{ fontSize:17, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.4 }}>What&rsquo;s New</div>
                  <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', fontWeight:600 }}>Live from the feeds</div>
                </div>

                {/* Podcast episodes row */}
                {spotlight.podcasts.length > 0 && (
                  <div style={{ marginBottom:28 }}>
                    <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:GREEN, fontWeight:600, marginBottom:12 }}>Latest Podcast Episodes</div>
                    <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile ? 2 : 4}, 1fr)`, gap:12 }}>
                      {spotlight.podcasts.slice(0,4).map((ep, i) => (
                        <SpotlightCard key={i} item={ep} />
                      ))}
                    </div>
                  </div>
                )}

                {/* YouTube row */}
                {spotlight.videos.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#e52d27', fontWeight:600, marginBottom:12 }}>Latest Videos</div>
                    <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile ? 2 : 4}, 1fr)`, gap:12 }}>
                      {spotlight.videos.slice(0,4).map((vid, i) => (
                        <SpotlightCard key={i} item={vid} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* New this week */}
            {recentlyAdded.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', fontWeight:600, marginBottom:18 }}>New this week</div>
                <div style={{ borderTop:`1px solid ${BORDER}` }}>
                  {recentlyAdded.map(r => (
                    <div key={r.id}
                      onClick={() => r.fields.URL && window.open(r.fields.URL,'_blank')}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:`0.5px solid ${BORDER}`, cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background='#faf9f6'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <Logo url={r.fields.URL} name={r.fields.Name} size={36} imageUrl={r.fields['Image URL']} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:500, color:'#111', marginBottom:2 }}>
                          {r.fields.Name}
                          <NewBadge />
                        </div>
                        <div style={{ fontSize:11, color:'#bbb' }}>
                          <span style={{ color:GREEN, fontWeight:500, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{r.fields.Type}</span>
                          {r.fields['Host or Author'] ? <span> · {r.fields['Host or Author']}</span> : ''}
                        </div>
                      </div>
                      <div style={{ fontSize:12, color:'#ccc', whiteSpace:'nowrap' }}>{r.fields.createdAt}</div>
                      <div onClick={e => e.stopPropagation()}>
                        <ScoreBadge score={(r.fields['Final Score']||0).toFixed(1)} fields={r.fields} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider before full list */}
            <div style={{ height:1, background:BORDER, marginBottom:36 }} />

          </>)}


          {/* Home page: grouped by type */}
          {!anyFilterActive && typeGroups.map(({ label, items }) => (
            <div key={label} style={{ marginBottom:48 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingBottom:12, borderBottom:`2px solid #111` }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.3 }}>
                  Top {label}
                </div>
                <span onClick={() => selectCategory(label)}
                  style={{ fontSize:12, color:GREEN, cursor:'pointer', fontWeight:500 }}>
                  See all →
                </span>
              </div>
              <div>
                {items.map((r, i) => {
                  const f = r.fields;
                  const isOpen = expandedId === r.id;
                  const breakdown = [
                    { label:'Expert', value:f['Expert Score'] },
                    { label:'Community', value:f['Community Score'] },
                    { label:'Popularity', value:f['Popularity Score'] },
                    { label:'Recency', value:f['Recency Score'] },
                    { label:'Clinical Depth', value:f['Clinical Depth Score'] },
                  ];
                  const yt   = f.Type === 'YouTube' ? (ytStats[r.id]  || null) : null;
                  const pod  = f.Type === 'Podcast'  ? (podStats[r.id] || null) : null;
                  const book = f.Type === 'Book'     ? (bookStats[r.id]|| null) : null;
                  const logoImage = yt?.avatar || pod?.showArt || book?.cover || f['Image URL'];
                  return (
                    <div key={r.id} style={{ borderBottom:`0.5px solid ${BORDER}` }}>
                      <div onClick={() => setExpandedId(isOpen ? null : r.id)}
                        style={{ display:'flex', alignItems:'center', gap:16, padding:'13px 0', cursor:'pointer', background: isOpen ? '#faf9f6' : 'transparent' }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background='#f9f9f9'; }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background='transparent'; }}
                      >
                        <div style={{ fontSize:11, color: isMobile ? '#888' : '#ccc', minWidth: isMobile ? 14 : 22, textAlign:'right', flexShrink:0, fontWeight:500 }}>{i+1}</div>
                        <Logo url={f.URL} name={f.Name} size={40} imageUrl={logoImage} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, minWidth:0 }}>
                            <div style={{ fontSize: isMobile ? 15 : 14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}><Highlight text={f.Name} terms={hlTerms} /></div>
                            {f['Community Pick'] && <CommunityPickBadge />}
                          </div>
                          <div style={{ fontSize: isMobile ? 13 : 11, color: isMobile ? '#555' : '#bbb', display:'flex', gap:10, alignItems:'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                            {f['Host or Author'] && <span style={{ color: isMobile ? '#444' : '#ccc' }}><Highlight text={f['Host or Author']} terms={hlTerms} /></span>}
                            {yt?.subscribers && <span>· {yt.subscribers} subs</span>}
                            {yt?.videos && <span>· {yt.videos} videos</span>}
                          </div>
                          {!isMobile && yt?.latest && (
                            <div style={{ fontSize:11, color:'#aaa', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              <span style={{ color:'#e52d27', fontWeight:600, marginRight:4 }}>▶</span>
                              {yt.latest.title}
                              {yt.latest.date && <span style={{ color:'#ccc', marginLeft:6 }}>{yt.latest.date}</span>}
                            </div>
                          )}
                          {!isMobile && pod?.latest && (
                            <div style={{ fontSize:11, color:'#aaa', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              <span style={{ color:GREEN, fontWeight:600, marginRight:4 }}>🎙</span>
                              {pod.latest.title}
                              {pod.latest.date && <span style={{ color:'#ccc', marginLeft:6 }}>{pod.latest.date}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                          <ScoreBadge score={((s) => s % 1 === 0 ? s.toString() : s.toFixed(1))(f['Final Score']||0)} fields={f} />
                          <span style={{ fontSize:16, color:'#ccc', lineHeight:1, transform: isOpen ? 'rotate(90deg)':'rotate(0)', transition:'transform 0.2s' }}>›</span>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: isMobile ? '0 0 20px 0' : '0 0 20px 38px', background:'#faf9f6' }}>
                          {yt?.recentVideos?.length > 0 && (
                            <div style={{ marginBottom:16 }}>
                              <div style={{ fontSize:10, color:'#bbb', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Recent Videos</div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, paddingRight: isMobile ? 0 : 80 }}>
                                {yt.recentVideos.map((v, idx) => (
                                  <a key={idx} href={v.url} target="_blank" rel="noopener noreferrer"
                                    style={{ display:'block', borderRadius:7, overflow:'hidden', position:'relative', textDecoration:'none' }}>
                                    <img src={v.thumbnail} alt={v.title}
                                      style={{ width:'100%', display:'block', borderRadius:7, aspectRatio:'16/9', objectFit:'cover' }} />
                                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                      <div style={{ width:32, height:32, background:'rgba(0,0,0,0.65)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                        <span style={{ color:'#fff', fontSize:12, marginLeft:2 }}>▶</span>
                                      </div>
                                    </div>
                                    <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent, rgba(0,0,0,0.75))', padding:'18px 8px 6px', borderRadius:'0 0 7px 7px' }}>
                                      {idx === 0 && <div style={{ fontSize:9, color:GREEN, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:2 }}>New</div>}
                                      <div style={{ fontSize:10, color:'#fff', fontWeight:500, lineHeight:1.3,
                                        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{v.title}</div>
                                      {v.date && <div style={{ fontSize:9, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{v.date}</div>}
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {pod?.episodes?.length > 0 && (
                            <div style={{ marginBottom:16 }}>
                              <div style={{ fontSize:10, color:'#bbb', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Recent Episodes</div>
                              <div style={{ display:'flex', flexDirection:'column', gap:6, paddingRight: isMobile ? 0 : 80 }}>
                                {pod.episodes.map((ep, idx) => (
                                  <a key={idx} href={ep.audioUrl || '#'} target="_blank" rel="noopener noreferrer"
                                    style={{ display:'flex', gap:10, textDecoration:'none', color:'inherit', alignItems:'center', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:7, padding:'8px 10px', transition:'border-color 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor=GREEN}
                                    onMouseLeave={e => e.currentTarget.style.borderColor=BORDER}>
                                    {ep.image && (
                                      <img src={ep.image} alt={ep.title}
                                        style={{ width:42, height:42, borderRadius:5, objectFit:'cover', flexShrink:0 }} />
                                    )}
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ fontSize:12, fontWeight:600, color:'#111', lineHeight:1.3 }}>{ep.title}</div>
                                      {ep.description && (
                                        <div style={{ fontSize:11, color:'#777', marginTop:2, lineHeight:1.4,
                                          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{ep.description}</div>
                                      )}
                                      <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                                        {idx === 0 && <span style={{ color:GREEN, fontWeight:600, marginRight:6 }}>New</span>}
                                        {ep.date}
                                      </div>
                                    </div>
                                    <span style={{ fontSize:11, color:GREEN, fontWeight:500, flexShrink:0 }}>Listen →</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ display:'flex', gap:32, flexDirection: isMobile ? 'column' : 'row' }}>
                            <div style={{ flex:1 }}>
                              {book?.cover && (
                                <img src={book.cover} alt={f.Name}
                                  style={{ float:'right', width:80, borderRadius:4, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', marginLeft:16, marginBottom:8 }} />
                              )}
                              {(book?.description || f.Description) && (
                                <p style={{ fontSize:13, color:'#444', lineHeight:1.65, margin:'0 0 10px' }}>
                                  {book?.description || f.Description}
                                </p>
                              )}
                              {book && (book.pages || book.year || book.publisher) && (
                                <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
                                  {book.year      && <span style={{ fontSize:11, color:'#888' }}>📅 {book.year}</span>}
                                  {book.pages     && <span style={{ fontSize:11, color:'#888' }}>📄 {book.pages} pages</span>}
                                  {book.publisher && <span style={{ fontSize:11, color:'#888' }}>🏢 {book.publisher}</span>}
                                </div>
                              )}
                              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                                {f.Type === 'Book' ? (() => {
                                  const q = encodeURIComponent(`${f.Name} ${f['Host or Author'] || ''}`);
                                  return [
                                    { label:'Amazon', url:`https://www.amazon.com/s?k=${q}&i=stripbooks` },
                                    { label:'Goodreads', url:`https://www.goodreads.com/search?query=${q}` },
                                  ].map(link => (
                                    <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize:12, fontWeight:500, color:'#555', textDecoration:'none', border:`1px solid ${BORDER}`, padding:'5px 12px', borderRadius:4, fontFamily:FONT_BODY, background:'#fff' }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.color='#555'; }}>
                                      {link.label}
                                    </a>
                                  ));
                                })() : f.URL && (
                                  <a href={f.URL} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize:12, fontWeight:600, color:GREEN, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5, border:`1px solid ${GREEN}`, padding:'6px 14px', borderRadius:4, fontFamily:FONT_BODY }}>
                                    Visit resource →
                                  </a>
                                )}
                                <VoteButtons resourceId={r.id} />
                              </div>
                            </div>
                            <div style={{ width: isMobile ? '100%' : 180, flexShrink:0, paddingRight: isMobile ? 0 : 16 }}>
                              <div style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', fontWeight:600, marginBottom:10 }}>Score breakdown</div>
                              {breakdown.map(b => (
                                <div key={b.label} style={{ marginBottom:8 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                                    <span style={{ fontSize:11, color:'#666' }}>{b.label}</span>
                                    <span style={{ fontSize:11, fontWeight:600, color: b.value != null ? GREEN : '#ddd' }}>{b.value ?? '—'}</span>
                                  </div>
                                  <div style={{ height:3, background:'#ddd', borderRadius:2 }}>
                                    <div style={{ height:3, width: b.value ? `${Math.min((b.value > 10 ? b.value : b.value*10), 100)}%` : '0%', background:GREEN, borderRadius:2, transition:'width 0.4s' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <CommunitySection resourceId={r.id} onSignInRequired={() => setShowSignIn(true)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Ranked list — shown when any filter active */}
          {anyFilterActive && ranked.length > 0 && (
            <div style={{ marginBottom:44, background:'rgba(255,255,255,0.35)', borderRadius:12, padding:'28px 28px 24px', border:`1px solid ${BORDER}`, boxShadow:'0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', marginBottom:4, fontWeight:600 }}>
                {filtered.length} {activeCategory ? `${activeCategory}` : 'resources'}{activeSpecialty ? ` · ${activeSpecialty}` : ''}{activeTopic ? ` · ${activeTopic}` : ''} — ranked
              </div>
              <div>
                {ranked.map((r, i) => {
                  const f = r.fields;
                  const isOpen = expandedId === r.id;
                  const yt   = f.Type === 'YouTube' ? (ytStats[r.id]  || null) : null;
                  const pod  = f.Type === 'Podcast'  ? (podStats[r.id] || null) : null;
                  const book = f.Type === 'Book'     ? (bookStats[r.id]|| null) : null;
                  const logoImage2 = yt?.avatar || pod?.showArt || book?.cover || f['Image URL'];
                  const breakdown = [
                    { label:'Expert', value:f['Expert Score'], weight:25 },
                    { label:'Community', value:f['Community Score'], weight:25 },
                    { label:'Popularity', value:f['Popularity Score'], weight:20 },
                    { label:'Recency', value:f['Recency Score'], weight:15 },
                    { label:'Clinical Depth', value:f['Clinical Depth Score'], weight:15 },
                  ];
                  return (
                    <div key={r.id} style={{ borderBottom:`0.5px solid ${BORDER}` }}>
                      {/* Row */}
                      <div
                        onClick={() => setExpandedId(isOpen ? null : r.id)}
                        style={{ display:'flex', alignItems:'center', gap:16, padding:'13px 0', cursor:'pointer', background: isOpen ? '#faf9f6' : 'transparent' }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background='#f9f9f9'; }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background='transparent'; }}
                      >
                        <div style={{ fontSize:11, color: isMobile ? '#888' : '#ccc', minWidth: isMobile ? 14 : 22, textAlign:'right', flexShrink:0, fontWeight:500 }}>{i+1}</div>
                        <Logo url={f.URL} name={f.Name} size={40} imageUrl={logoImage2} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, minWidth:0 }}>
                            <div style={{ fontSize: isMobile ? 15 : 14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}><Highlight text={f.Name} terms={hlTerms} /></div>
                            {f['Community Pick'] && <CommunityPickBadge />}
                          </div>
                          <div style={{ fontSize: isMobile ? 13 : 11, color: isMobile ? '#666' : '#bbb', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ color:GREEN, fontWeight:500, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.Type}</span>
                            {f['Host or Author'] && <span style={{ color: isMobile ? '#777' : '#ccc' }}>· <Highlight text={f['Host or Author']} terms={hlTerms} /></span>}
                            {yt?.subscribers && <span>· {yt.subscribers} subs</span>}
                            {yt?.videos && <span>· {yt.videos} videos</span>}
                          </div>
                          {!isMobile && yt?.latest && (
                            <div style={{ fontSize:11, color:'#aaa', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              <span style={{ color:'#e52d27', fontWeight:600, marginRight:4 }}>▶</span>
                              {yt.latest.title}
                              {yt.latest.date && <span style={{ color:'#ccc', marginLeft:6 }}>{yt.latest.date}</span>}
                            </div>
                          )}
                          {!isMobile && pod?.latest && (
                            <div style={{ fontSize:11, color:'#aaa', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              <span style={{ color:GREEN, fontWeight:600, marginRight:4 }}>🎙</span>
                              {pod.latest.title}
                              {pod.latest.date && <span style={{ color:'#ccc', marginLeft:6 }}>{pod.latest.date}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                          <ScoreBadge score={((s) => s % 1 === 0 ? s.toString() : s.toFixed(1))(f['Final Score']||0)} fields={f} />
                          <span style={{ fontSize:16, color:'#ccc', lineHeight:1, transform: isOpen ? 'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }}>›</span>
                        </div>
                      </div>

                      {/* Expanded panel */}
                      {isOpen && (
                        <div style={{ padding: isMobile ? '0 0 20px 0' : '0 0 20px 38px', background:'#faf9f6' }}>
                          {yt?.latest?.thumbnail && (
                            <a href={yt.latest.url} target="_blank" rel="noopener noreferrer"
                              style={{ display:'block', marginBottom:16, borderRadius:6, overflow:'hidden', maxWidth:280, position:'relative', textDecoration:'none' }}>
                              <img src={yt.latest.thumbnail} alt={yt.latest.title} style={{ width:'100%', display:'block', borderRadius:6 }} />
                              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <div style={{ width:40, height:40, background:'rgba(0,0,0,0.7)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  <span style={{ color:'#fff', fontSize:14, marginLeft:3 }}>▶</span>
                                </div>
                              </div>
                              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent, rgba(0,0,0,0.7))', padding:'20px 10px 8px', borderRadius:'0 0 6px 6px' }}>
                                <div style={{ fontSize:11, color:'#fff', fontWeight:500, lineHeight:1.3 }}>{yt.latest.title}</div>
                              </div>
                            </a>
                          )}
                          {pod?.episodes?.length > 0 && (
                            <div style={{ marginBottom:16 }}>
                              <div style={{ fontSize:10, color:'#bbb', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Recent Episodes</div>
                              <div style={{ display:'flex', flexDirection:'column', gap:6, paddingRight: isMobile ? 0 : 80 }}>
                                {pod.episodes.map((ep, idx) => (
                                  <a key={idx} href={ep.audioUrl || '#'} target="_blank" rel="noopener noreferrer"
                                    style={{ display:'flex', gap:10, textDecoration:'none', color:'inherit', alignItems:'center', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:7, padding:'8px 10px', transition:'border-color 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor=GREEN}
                                    onMouseLeave={e => e.currentTarget.style.borderColor=BORDER}>
                                    {ep.image && (
                                      <img src={ep.image} alt={ep.title}
                                        style={{ width:42, height:42, borderRadius:5, objectFit:'cover', flexShrink:0 }} />
                                    )}
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ fontSize:12, fontWeight:600, color:'#111', lineHeight:1.3 }}>{ep.title}</div>
                                      {ep.description && (
                                        <div style={{ fontSize:11, color:'#777', marginTop:2, lineHeight:1.4,
                                          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{ep.description}</div>
                                      )}
                                      <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                                        {idx === 0 && <span style={{ color:GREEN, fontWeight:600, marginRight:6 }}>New</span>}
                                        {ep.date}
                                      </div>
                                    </div>
                                    <span style={{ fontSize:11, color:GREEN, fontWeight:500, flexShrink:0 }}>Listen →</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ display:'flex', gap:32, flexDirection: isMobile ? 'column' : 'row' }}>
                            {/* Left: description + link */}
                            <div style={{ flex:1 }}>
                              {book?.cover && (
                                <img src={book.cover} alt={f.Name}
                                  style={{ float:'right', width:80, borderRadius:4, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', marginLeft:16, marginBottom:8 }} />
                              )}
                              {(book?.description || f.Description) && (
                                <p style={{ fontSize:13, color:'#444', lineHeight:1.65, margin:'0 0 10px' }}>
                                  {book?.description || f.Description}
                                </p>
                              )}
                              {book && (book.pages || book.year || book.publisher) && (
                                <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
                                  {book.year      && <span style={{ fontSize:11, color:'#888' }}>📅 {book.year}</span>}
                                  {book.pages     && <span style={{ fontSize:11, color:'#888' }}>📄 {book.pages} pages</span>}
                                  {book.publisher && <span style={{ fontSize:11, color:'#888' }}>🏢 {book.publisher}</span>}
                                </div>
                              )}
                              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                                {f.Type === 'Book' ? (() => {
                                  const q = encodeURIComponent(`${f.Name} ${f['Host or Author'] || ''}`);
                                  const bookLinks = [
                                    { label:'Amazon', url:`https://www.amazon.com/s?k=${q}&i=stripbooks` },
                                    { label:'Goodreads', url:`https://www.goodreads.com/search?query=${q}` },
                                  ];
                                  return bookLinks.map(link => (
                                    <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize:12, fontWeight:500, color:'#555', textDecoration:'none', border:`1px solid ${BORDER}`, padding:'5px 12px', borderRadius:4, fontFamily:FONT_BODY, background:'#fff', transition:'all 0.15s' }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.color='#555'; }}>
                                      {link.label}
                                    </a>
                                  ));
                                })() : f.URL && (
                                  <a href={f.URL} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize:12, fontWeight:600, color:GREEN, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5, border:`1px solid ${GREEN}`, padding:'6px 14px', borderRadius:4, fontFamily:FONT_BODY }}>
                                    Visit resource →
                                  </a>
                                )}
                                <VoteButtons resourceId={r.id} />
                              </div>
                            </div>

                            {/* Right: score bars */}
                            <div style={{ width: isMobile ? '100%' : 180, flexShrink:0, paddingRight: isMobile ? 0 : 16 }}>
                              <div style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', fontWeight:600, marginBottom:10 }}>Score breakdown</div>
                              {breakdown.map(b => (
                                <div key={b.label} style={{ marginBottom:8 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                                    <span style={{ fontSize:11, color:'#666' }}>{b.label}</span>
                                    <span style={{ fontSize:11, fontWeight:600, color: b.value != null ? GREEN : '#ddd' }}>{b.value ?? '—'}</span>
                                  </div>
                                  <div style={{ height:3, background:'#ddd', borderRadius:2 }}>
                                    <div style={{ height:3, width: b.value ? `${Math.min((b.value > 10 ? b.value : b.value*10), 100)}%` : '0%', background:GREEN, borderRadius:2, transition:'width 0.4s' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <CommunitySection resourceId={r.id} onSignInRequired={() => setShowSignIn(true)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {anyFilterActive && ranked.length === 0 && (
            <div style={{ padding:'80px 0', textAlign:'center' }}>
              <div style={{ fontSize:15, color:'#bbb', marginBottom:12 }}>Nothing here yet.</div>
              <button onClick={openSubmitModal}
                style={{ fontSize:13, color:GREEN, fontWeight:500, textDecoration:'none', border:`1px solid ${GREEN}`, padding:'8px 18px', borderRadius:4, fontFamily:FONT_BODY, background:'transparent', cursor:'pointer' }}>
                Suggest one →
              </button>
            </div>
          )}

        </>)}
      </div>

      {/* Submission modal */}
      {submitOpen && (
        <div onClick={() => setSubmitOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:10, padding:36, maxWidth:480, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.18)', fontFamily:FONT_BODY }}>

            {submitState === 'success' ? (
              <div style={{ textAlign:'center', padding:'12px 0' }}>
                <div style={{ fontSize:36, marginBottom:16 }}>✓</div>
                <div style={{ fontSize:18, fontWeight:700, color:GREEN, marginBottom:8 }}>Thanks for the suggestion!</div>
                <div style={{ fontSize:14, color:'#666', marginBottom:6 }}>
                  We found <strong>{submitResult?.name}</strong> and added it to our review queue. If approved, it will appear on the site shortly.
                </div>
                <button onClick={() => setSubmitOpen(false)} style={{ marginTop:20, padding:'10px 28px', background:GREEN, color:'#fff', border:'none', borderRadius:5, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT_BODY }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:'#1a1a1a', marginBottom:4 }}>Suggest a resource</div>
                    <div style={{ fontSize:13, color:'#888' }}>Paste a URL and our AI will do the rest.</div>
                  </div>
                  <button onClick={() => setSubmitOpen(false)} style={{ background:'none', border:'none', fontSize:20, color:'#aaa', cursor:'pointer', padding:0, lineHeight:1 }}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#555', marginBottom:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>Resource URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={submitUrl}
                    onChange={e => setSubmitUrl(e.target.value)}
                    disabled={submitState === 'loading'}
                    style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', border:'1px solid #ddd', borderRadius:5, fontSize:14, fontFamily:FONT_BODY, marginBottom:16, outline:'none' }}
                  />

                  <div id="ts-widget" style={{ marginBottom:16 }} />

                  {submitError && (
                    <div style={{ fontSize:13, color:'#c0392b', marginBottom:12, padding:'8px 12px', background:'#fdf2f2', borderRadius:4 }}>
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitState === 'loading'}
                    style={{ width:'100%', padding:'11px', background: submitState === 'loading' ? '#aaa' : GREEN, color:'#fff', border:'none', borderRadius:5, fontSize:14, fontWeight:600, cursor: submitState === 'loading' ? 'not-allowed' : 'pointer', fontFamily:FONT_BODY, letterSpacing:0.2 }}>
                    {submitState === 'loading' ? 'Analyzing resource…' : 'Submit for review'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>

    {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </>
  );
}
