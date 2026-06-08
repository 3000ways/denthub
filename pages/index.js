import { useState, useEffect } from 'react';

const THEMES = ['Learning & Education','Technology & Software','Coaching & Mentorship','Community & Network','Specialty Resources','Training & Career','Practice & Business','Wellbeing & Lifestyle','News & Media'];
const THEME_SHORT = {'Learning & Education':'Learning','Technology & Software':'Technology','Coaching & Mentorship':'Coaching','Community & Network':'Community','Specialty Resources':'Specialty','Training & Career':'Career','Practice & Business':'Business','Wellbeing & Lifestyle':'Wellbeing','News & Media':'News'};
const THEME_TYPES = {'Learning & Education':['Podcast','Book','CE Website','YouTube','Journal','Newsletter','Course','Conference'],'Technology & Software':['Software'],'Coaching & Mentorship':['Coaching','Mastermind','Mentorship'],'Community & Network':['Community','Forum','Association'],'Specialty Resources':['Podcast','Book','CE Website','Software','Journal','Course'],'Training & Career':['Residency','Job Board','Course'],'Practice & Business':['Consulting','Agency','Advisor','Platform'],'Wellbeing & Lifestyle':['Podcast','Book','Course'],'News & Media':['Newsletter','News','Instagram','YouTube']};
const CAT_TYPE_MAP = {'Podcasts':'Podcast','Books':'Book','YouTube Channels':'YouTube','CE Websites':'CE Website','Dental Journals':'Journal','Online Courses':'Course','Dental Conferences':'Conference','Practice Management Software':'Software','Imaging & CBCT Systems':'Software','AI Diagnostic Tools':'Software','Intraoral Scanners':'Software','CAD/CAM Systems':'Software','Patient Communications':'Software','Billing & RCM Software':'Software','Digital Treatment Planning':'Software'};

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
  const [categories, setCategories] = useState([]);
  const [resources, setResources]   = useState([]);
  const [activeTheme, setActiveTheme] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [spotlight, setSpotlight] = useState({ podcasts: [], videos: [] });
  const [episodeMode, setEpisodeMode] = useState(false);
  const [episodeQuery, setEpisodeQuery] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeSearched, setEpisodeSearched] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/airtable?table=Categories').then(r => r.json()),
      fetch('/api/airtable?table=Resources').then(r => r.json()),
    ]).then(([cat, res]) => {
      setCategories(cat.records || []);
      setResources(res.records || []);
    }).finally(() => setLoading(false));

    // Fetch live RSS spotlight data independently
    fetch('/api/spotlight').then(r => r.json()).then(data => setSpotlight(data)).catch(() => {});
  }, []);

  function selectTheme(t) { setActiveTheme(t); setActiveCategory(null); setActiveType(null); }
  function selectCategory(name) { setActiveCategory(prev => prev === name ? null : name); }
  function selectType(t) { setActiveType(t); setExpandedId(null); }

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
    const themeTypes = activeTheme ? THEME_TYPES[activeTheme] : null;
    const matchTheme = !themeTypes || themeTypes.some(t => (f.Type||'').includes(t));
    const catType = activeCategory ? CAT_TYPE_MAP[activeCategory] : null;
    const matchCat = !catType || (f.Type||'') === catType;
    const matchType = !activeType || (f.Type||'') === activeType;
    const matchSearch = !search ||
      (f.Name||'').toLowerCase().includes(search.toLowerCase()) ||
      (f.Description||'').toLowerCase().includes(search.toLowerCase()) ||
      (f.Type||'').toLowerCase().includes(search.toLowerCase());
    return matchTheme && matchCat && matchType && matchSearch;
  });

  const FEATURED_TYPES = ['Podcast', 'Book', 'CE Website', 'YouTube', 'Software', 'Journal', 'Newsletter'];
  const typeGroups = FEATURED_TYPES.map(type => ({
    type,
    items: [...displayResources]
      .filter(r => (r.fields.Type||'') === type)
      .sort((a,b) => (b.fields['Final Score']||0) - (a.fields['Final Score']||0))
      .slice(0, 4),
  })).filter(g => g.items.length > 0);

  const themeCats = activeTheme ? categories.filter(c => c.fields['Theme'] === activeTheme).sort((a,b) => (a.fields['Display Order']||0)-(b.fields['Display Order']||0)) : [];
  const themeCounts = {};
  THEMES.forEach(t => { themeCounts[t] = categories.filter(c => c.fields['Theme'] === t).length; });

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
  const totalCategories = categories.length || 49;

  return (
    <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>

      <div style={{ height:3, background:GREEN }} />

      <div style={{ maxWidth:720, margin:'0 auto', padding:'0 28px 100px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 0 18px', borderBottom:`1px solid ${BORDER}`, marginBottom:40 }}>
          <div style={{ fontSize:17, fontWeight:700, color:'#111', letterSpacing:-0.5, fontFamily:FONT_BODY }}>
            Dent<span style={{ color:GREEN }}>Hub</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <a href="/about" style={{ fontSize:13, color:'#999', textDecoration:'none', fontFamily:FONT_BODY }}>About</a>
            <button style={{ fontSize:12, padding:'6px 16px', borderRadius:3, background:GREEN, color:'#fff', border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, letterSpacing:0.2 }}>
              Submit a resource
            </button>
          </div>
        </div>

        {/* Hero */}
        {!activeTheme && (
          <div style={{ marginBottom:36 }}>
            <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:14, fontWeight:500 }}>The dentistry resource index</div>
            <h1 style={{ fontSize:42, fontWeight:700, color:'#111', lineHeight:1.1, margin:'0 0 16px', letterSpacing:-1.5, fontFamily:FONT_DISPLAY }}>
              Everything dentistry,<br/>ranked and curated
            </h1>
            <p style={{ fontSize:15, color:'#777', lineHeight:1.65, maxWidth:500, margin:'0 0 20px', fontWeight:400 }}>
              The profession's best podcasts, books, CE, coaching, software, and communities — scored by dentists, for dentists.
            </p>

            {/* Stats bar */}
            <div style={{ display:'flex', gap:28, paddingTop:20, borderTop:`1px solid ${BORDER}` }}>
              {[
                { value: totalResources, label:'resources indexed' },
                { value: totalCategories, label:'categories' },
                { value: 8, label:'themes' },
                { value: '9+', label:'specialties covered' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div style={{ fontSize:22, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTheme && (
          <div style={{ paddingTop:4, marginBottom:28 }}>
            <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:10, fontWeight:500 }}>{activeTheme}</div>
            <h1 style={{ fontSize:28, fontWeight:700, color:'#111', lineHeight:1.1, margin:0, letterSpacing:-0.8, fontFamily:FONT_DISPLAY }}>
              {activeCategory ? activeCategory : `${themeCats.length} categories · ${filtered.length} resources`}
            </h1>
          </div>
        )}

        {/* Search mode toggle */}
        <div style={{ display:'flex', gap:0, marginBottom:12, border:`1px solid ${BORDER}`, borderRadius:6, overflow:'hidden', background:'#fff', width:'fit-content' }}>
          <button onClick={() => { setEpisodeMode(false); setEpisodes([]); setEpisodeSearched(false); }}
            style={{ fontSize:12, padding:'7px 16px', border:'none', background: !episodeMode ? GREEN : '#fff', color: !episodeMode ? '#fff' : '#999', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, transition:'all 0.15s' }}>
            Resources
          </button>
          <button onClick={() => { setEpisodeMode(true); setSearch(''); }}
            style={{ fontSize:12, padding:'7px 16px', border:'none', background: episodeMode ? GREEN : '#fff', color: episodeMode ? '#fff' : '#999', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
            <span>🎙</span> Episode Search
          </button>
        </div>

        {/* Resource search */}
        {!episodeMode && (
          <div style={{ display:'flex', alignItems:'center', gap:10, border:`1px solid ${BORDER}`, borderRadius:6, padding:'10px 16px', marginBottom:36, background:'#fff' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
              style={{ border:'none', background:'transparent', fontSize:14, color:'#111', outline:'none', flex:1, fontFamily:FONT_BODY }} />
            {search && <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', color:'#bbb', fontSize:16, padding:0, lineHeight:1 }}>×</button>}
          </div>
        )}

        {/* Episode search */}
        {episodeMode && (
          <div style={{ marginBottom:36 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', border:`1px solid ${BORDER}`, borderRadius:6, padding:'10px 16px', background:'#fff', marginBottom:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={episodeQuery}
                onChange={e => setEpisodeQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchEpisodes(episodeQuery)}
                placeholder="Search episodes… e.g. implant complications, cracked tooth, burnout"
                style={{ border:'none', background:'transparent', fontSize:14, color:'#111', outline:'none', flex:1, fontFamily:FONT_BODY }}
                autoFocus
              />
              {episodeQuery && <button onClick={() => { setEpisodeQuery(''); setEpisodes([]); setEpisodeSearched(false); }} style={{ border:'none', background:'none', cursor:'pointer', color:'#bbb', fontSize:16, padding:0, lineHeight:1 }}>×</button>}
              <button onClick={() => searchEpisodes(episodeQuery)}
                style={{ fontSize:12, padding:'5px 14px', borderRadius:4, background:GREEN, color:'#fff', border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, whiteSpace:'nowrap' }}>
                Search
              </button>
            </div>
            <div style={{ fontSize:11, color:'#bbb', paddingLeft:2 }}>Searches across millions of podcast episodes — not just the ones in DentHub</div>
          </div>
        )}

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

        {/* Theme tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${BORDER}`, marginBottom:40, overflowX:'auto', scrollbarWidth:'none' }}>
          {[{label:'All resources', key:null}, ...THEMES.map(t => ({label:THEME_SHORT[t], key:t}))].map(({label, key}) => {
            const isActive = activeTheme === key;
            return (
              <button key={label} onClick={() => selectTheme(key)}
                style={{ fontSize:13, padding:'0 0 13px', marginRight:28, background:'none', border:'none', borderBottom: isActive ? `2px solid ${GREEN}`:'2px solid transparent', color: isActive ? '#111':'#999', fontWeight: isActive ? 600:400, cursor:'pointer', fontFamily:FONT_BODY, whiteSpace:'nowrap' }}>
                {label}
              </button>
            );
          })}
        </div>

        {loading && <div style={{ padding:'80px 0', textAlign:'center', color:'#ccc', fontSize:14 }}>Loading…</div>}

        {!loading && (<>

          {/* HOME PAGE SECTIONS — only show when no filter active */}
          {!activeTheme && !search && (<>

            {/* Spotlight: Latest Episodes & Videos */}
            {(spotlight.podcasts.length > 0 || spotlight.videos.length > 0) && (
              <div style={{ marginBottom:52 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:20, paddingBottom:12, borderBottom:`2px solid #111` }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.3 }}>What&rsquo;s New</div>
                  <div style={{ fontSize:10, letterSpacing:'0.10em', textTransform:'uppercase', color:'#bbb', fontWeight:600 }}>Live from the feeds</div>
                </div>

                {/* Podcast episodes row */}
                {spotlight.podcasts.length > 0 && (
                  <div style={{ marginBottom:28 }}>
                    <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:GREEN, fontWeight:600, marginBottom:12 }}>Latest Podcast Episodes</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
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
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
                      {spotlight.videos.slice(0,3).map((vid, i) => (
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

          {/* Category grid */}
          {activeTheme && themeCats.length > 0 && (
            <div style={{ marginBottom:44 }}>
              <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', marginBottom:14, fontWeight:600 }}>Categories</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:BORDER }}>
                {themeCats.map(cat => {
                  const catName = cat.fields['Category Name'];
                  const isActive = activeCategory === catName;
                  return (
                    <div key={cat.id} onClick={() => selectCategory(catName)}
                      style={{ padding:'14px 16px', background: isActive ? GREEN_LIGHT : '#fff', cursor:'pointer', borderLeft: isActive ? `3px solid ${GREEN}` : '3px solid transparent' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background='#f7fdfb'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background='#fff'; }}
                    >
                      <div style={{ fontSize:13, fontWeight:500, color: isActive ? GREEN :'#111', marginBottom:2 }}>{catName}</div>
                      {cat.fields['Description'] && <div style={{ fontSize:11, color:'#bbb' }}>{cat.fields['Description'].slice(0,60)}…</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Home page: grouped by type */}
          {!activeTheme && !search && !activeType && typeGroups.map(({ type, items }) => (
            <div key={type} style={{ marginBottom:48 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingBottom:12, borderBottom:`2px solid #111` }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.3 }}>
                  Top {type}s
                </div>
                <span onClick={() => selectType(type)}
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
                  return (
                    <div key={r.id} style={{ borderBottom:`0.5px solid ${BORDER}` }}>
                      <div onClick={() => setExpandedId(isOpen ? null : r.id)}
                        style={{ display:'flex', alignItems:'center', gap:16, padding:'13px 0', cursor:'pointer', background: isOpen ? '#faf9f6' : 'transparent' }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background='#f9f9f9'; }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background='transparent'; }}
                      >
                        <div style={{ fontSize:11, color:'#ccc', minWidth:22, textAlign:'right', flexShrink:0, fontWeight:500 }}>{i+1}</div>
                        <Logo url={f.URL} name={f.Name} size={40} imageUrl={f['Image URL']} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:2 }}>{f.Name}</div>
                          <div style={{ fontSize:11, color:'#bbb' }}>
                            {f['Host or Author'] ? <span style={{ color:'#ccc' }}>{f['Host or Author']}</span> : ''}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                          <ScoreBadge score={((s) => s % 1 === 0 ? s.toString() : s.toFixed(1))(f['Final Score']||0)} fields={f} />
                          <span style={{ fontSize:16, color:'#ccc', lineHeight:1, transform: isOpen ? 'rotate(90deg)':'rotate(0)', transition:'transform 0.2s' }}>›</span>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding:'0 0 20px 38px', background:'#faf9f6' }}>
                          <div style={{ display:'flex', gap:32 }}>
                            <div style={{ flex:1 }}>
                              {f.Description && <p style={{ fontSize:13, color:'#555', lineHeight:1.65, margin:'0 0 16px' }}>{f.Description}</p>}
                              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                                {f.Type === 'Book' ? (() => {
                                  const q = encodeURIComponent(`${f.Name} ${f['Host or Author'] || ''}`);
                                  return [
                                    { label:'Amazon', url:`https://www.amazon.com/s?k=${q}&i=stripbooks` },
                                    { label:'Audible', url:`https://www.audible.com/search?keywords=${q}&node=18541642011` },
                                    { label:'Goodreads', url:`https://www.goodreads.com/search?utf8=%E2%9C%93&query=${q}` },
                                    { label:'Kindle', url:`https://www.amazon.com/s?k=${q}&i=digital-text&rh=n%3A154606011` },
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
                            <div style={{ width:180, flexShrink:0, paddingRight:16 }}>
                              <div style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#bbb', fontWeight:600, marginBottom:10 }}>Score breakdown</div>
                              {breakdown.map(b => (
                                <div key={b.label} style={{ marginBottom:8 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                                    <span style={{ fontSize:11, color:'#888' }}>{b.label}</span>
                                    <span style={{ fontSize:11, fontWeight:600, color: b.value != null ? GREEN : '#ddd' }}>{b.value ?? '—'}</span>
                                  </div>
                                  <div style={{ height:3, background:'#eee', borderRadius:2 }}>
                                    <div style={{ height:3, width: b.value ? `${Math.min((b.value > 10 ? b.value : b.value*10), 100)}%` : '0%', background:GREEN, borderRadius:2, transition:'width 0.4s' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Ranked list — shown when filtering by theme, category, type, or search */}
          {(activeTheme || search || activeType) && ranked.length > 0 && (
            <div style={{ marginBottom:44 }}>
              {activeType && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
                  <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', fontWeight:600 }}>
                    All {activeType}s — ranked
                  </div>
                  <span onClick={() => setActiveType(null)} style={{ fontSize:12, color:'#aaa', cursor:'pointer' }}>← Back</span>
                </div>
              )}
              {!activeType && <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', marginBottom:4, fontWeight:600 }}>
                {activeCategory ? `${activeCategory} — ranked` : 'Full rankings'}
              </div>}
              <div>
                {ranked.map((r, i) => {
                  const f = r.fields;
                  const isOpen = expandedId === r.id;
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
                        <div style={{ fontSize:11, color:'#ccc', minWidth:22, textAlign:'right', flexShrink:0, fontWeight:500 }}>{i+1}</div>
                        <Logo url={f.URL} name={f.Name} size={40} imageUrl={f['Image URL']} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:2 }}>{f.Name}</div>
                          <div style={{ fontSize:11, color:'#bbb' }}>
                            <span style={{ color:GREEN, fontWeight:500, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.Type}</span>
                            {f['Host or Author'] ? <span style={{ color:'#ccc' }}> · {f['Host or Author']}</span> : ''}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                          <ScoreBadge score={((s) => s % 1 === 0 ? s.toString() : s.toFixed(1))(f['Final Score']||0)} fields={f} />
                          <span style={{ fontSize:16, color:'#ccc', lineHeight:1, transform: isOpen ? 'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }}>›</span>
                        </div>
                      </div>

                      {/* Expanded panel */}
                      {isOpen && (
                        <div style={{ padding:'0 0 20px 38px', background:'#faf9f6' }}>
                          <div style={{ display:'flex', gap:32 }}>
                            {/* Left: description + link */}
                            <div style={{ flex:1 }}>
                              {f.Description && (
                                <p style={{ fontSize:13, color:'#555', lineHeight:1.65, margin:'0 0 16px' }}>{f.Description}</p>
                              )}
                              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                                {f.Type === 'Book' ? (() => {
                                  const q = encodeURIComponent(`${f.Name} ${f['Host or Author'] || ''}`);
                                  const bookLinks = [
                                    { label:'Amazon', url:`https://www.amazon.com/s?k=${q}&i=stripbooks` },
                                    { label:'Audible', url:`https://www.audible.com/search?keywords=${q}&node=18541642011` },
                                    { label:'Goodreads', url:`https://www.goodreads.com/search?utf8=%E2%9C%93&query=${q}` },
                                    { label:'Kindle', url:`https://www.amazon.com/s?k=${q}&i=digital-text&rh=n%3A154606011` },
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
                            <div style={{ width:180, flexShrink:0, paddingRight:16 }}>
                              <div style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#bbb', fontWeight:600, marginBottom:10 }}>Score breakdown</div>
                              {breakdown.map(b => (
                                <div key={b.label} style={{ marginBottom:8 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                                    <span style={{ fontSize:11, color:'#888' }}>{b.label}</span>
                                    <span style={{ fontSize:11, fontWeight:600, color: b.value != null ? GREEN : '#ddd' }}>{b.value ?? '—'}</span>
                                  </div>
                                  <div style={{ height:3, background:'#eee', borderRadius:2 }}>
                                    <div style={{ height:3, width: b.value ? `${Math.min((b.value > 10 ? b.value : b.value*10), 100)}%` : '0%', background:GREEN, borderRadius:2, transition:'width 0.4s' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(activeTheme || search || activeType) && ranked.length===0 && <div style={{ padding:'60px 0', textAlign:'center', color:'#ccc', fontSize:14 }}>No resources yet in this category.</div>}

          {/* Browse by theme (home only) */}
          {!activeTheme && (
            <div>
              <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', marginBottom:20, fontWeight:600 }}>Browse by theme</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:BORDER }}>
                {THEMES.map(t => (
                  <div key={t} onClick={() => selectTheme(t)}
                    style={{ padding:'20px 18px', background:'#fff', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f7fdfb'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}
                  >
                    <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:3, lineHeight:1.3 }}>{t}</div>
                    <div style={{ fontSize:11, color:'#bbb' }}>{themeCounts[t]} categories</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>)}
      </div>
    </div>
  );
}
