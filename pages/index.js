import { useState, useEffect } from 'react';

const THEMES = [
  { name: 'Learning & Education',  emoji: '📚', color: '#185FA5', bg: '#E6F1FB' },
  { name: 'Technology & Software', emoji: '💻', color: '#3B6D11', bg: '#EAF3DE' },
  { name: 'Coaching & Mentorship', emoji: '🎯', color: '#6B3FA0', bg: '#EEE8FB' },
  { name: 'Community & Network',   emoji: '👥', color: '#993556', bg: '#FBEAF0' },
  { name: 'Specialty Resources',   emoji: '🏥', color: '#0F6E56', bg: '#E1F5EE' },
  { name: 'Training & Career',     emoji: '🎓', color: '#854F0B', bg: '#FAEEDA' },
  { name: 'Practice & Business',   emoji: '💼', color: '#185FA5', bg: '#E3EEF9' },
  { name: 'Wellbeing & Lifestyle', emoji: '❤️', color: '#A32D2D', bg: '#FCEBEB' },
  { name: 'News & Media',          emoji: '📰', color: '#5F5E5A', bg: '#F1EFE8' },
];

const TYPE_EMOJI = {
  'Podcast':    '🎙️',
  'Book':       '📚',
  'YouTube':    '▶️',
  'CE Website': '🎓',
  'Software':   '💻',
  'Community':  '👥',
  'Journal':    '📰',
  'Conference': '🏛️',
  'Course':     '🖥️',
  'Newsletter': '📬',
};

function getEmoji(type) { return TYPE_EMOJI[type] || '📌'; }

function ScoreBadge({ score }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:20, background:'#0F6E56', color:'#fff' }}>
      ★ {score}
    </span>
  );
}

function ResourceCard({ r, rank }) {
  const score = (r.fields['Final Score'] || 0).toFixed(1);
  const rankColor = rank === 1 ? '#BA7517' : rank === 2 ? '#888780' : rank === 3 ? '#854F0B' : '#ccc';
  return (
    <div
      onClick={() => r.fields.URL && window.open(r.fields.URL, '_blank')}
      style={{ background:'#fff', border:'0.5px solid #e8e8e8', borderRadius:12, padding:'14px 16px', cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start' }}
      onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
      onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
    >
      {rank && <div style={{ fontSize:20, fontWeight:500, minWidth:28, color:rankColor, lineHeight:'1.4', flexShrink:0 }}>{rank}</div>}
      <div style={{ width:44, height:44, borderRadius:10, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
        {getEmoji(r.fields.Type)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:500, color:'#111' }}>{r.fields.Name}</span>
          <ScoreBadge score={score} />
        </div>
        {r.fields['Host or Author'] && (
          <div style={{ fontSize:12, color:'#999', marginBottom:4 }}>{r.fields['Host or Author']}</div>
        )}
        {r.fields.Description && (
          <div style={{ fontSize:13, color:'#555', lineHeight:1.5 }}>
            {r.fields.Description.slice(0, 120)}{r.fields.Description.length > 120 ? '…' : ''}
          </div>
        )}
        <div style={{ marginTop:6 }}>
          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#666' }}>{r.fields.Type}</span>
        </div>
      </div>
    </div>
  );
}

function HeroCard({ r }) {
  const score = (r.fields['Final Score'] || 0).toFixed(1);
  return (
    <div
      onClick={() => r.fields.URL && window.open(r.fields.URL, '_blank')}
      style={{ background:'#fff', border:'0.5px solid #e8e8e8', borderRadius:14, overflow:'hidden', cursor:'pointer', marginBottom:24 }}
      onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
      onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
    >
      <div style={{ height:200, background:'linear-gradient(135deg, #0F6E56, #1D9E75)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
        <div style={{ fontSize:56 }}>{getEmoji(r.fields.Type)}</div>
        <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.8)' }}>#1 ranked this week</div>
      </div>
      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>{r.fields.Type}</span>
          <ScoreBadge score={score} />
        </div>
        <div style={{ fontSize:18, fontWeight:500, color:'#111', marginBottom:6 }}>{r.fields.Name}</div>
        {r.fields['Host or Author'] && <div style={{ fontSize:13, color:'#888', marginBottom:8 }}>{r.fields['Host or Author']}</div>}
        {r.fields.Description && <div style={{ fontSize:14, color:'#555', lineHeight:1.6 }}>{r.fields.Description.slice(0, 200)}{r.fields.Description.length > 200 ? '…' : ''}</div>}
      </div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'32px 0 16px' }}>
      <span style={{ fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.1em', color:'#999', whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:'0.5px', background:'#e8e8e8' }} />
    </div>
  );
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [resources, setResources]   = useState([]);
  const [activeTheme, setActiveTheme] = useState(null);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/airtable?table=Categories').then(r => r.json()),
      fetch('/api/airtable?table=Resources').then(r => r.json()),
    ]).then(([catData, resData]) => {
      if (catData.error) throw new Error(catData.error);
      if (resData.error) throw new Error(resData.error);
      setCategories(catData.records || []);
      setResources(resData.records || []);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = resources.filter(r => {
    const matchSearch = !search ||
      (r.fields.Name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.fields.Description || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.fields.Type || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const activeThemeData = THEMES.find(t => t.name === activeTheme);

  const themeCategories = activeTheme
    ? categories.filter(c => c.fields['Theme'] === activeTheme).sort((a,b) => (a.fields['Display Order']||0) - (b.fields['Display Order']||0))
    : [];

  const hero     = filtered[0];
  const topTen   = filtered.slice(0, 10);
  const newItems = filtered.slice(0, 4);

  return (
    <div style={{ background:'#f8f9fa', minHeight:'100vh' }}>
    <div style={{ maxWidth:680, margin:'0 auto', padding:'0 20px 80px', fontFamily:'system-ui,-apple-system,sans-serif' }}>

      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, background:'#0F6E56', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🦷</div>
          <span style={{ fontSize:16, fontWeight:500, letterSpacing:-0.3 }}>Dent<span style={{ color:'#1D9E75' }}>Hub</span></span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ fontSize:11, fontWeight:500, padding:'5px 12px', borderRadius:20, border:'none', background:'#0F6E56', color:'#fff', cursor:'pointer' }}>Submit</button>
          <button style={{ fontSize:11, fontWeight:500, padding:'5px 12px', borderRadius:20, border:'0.5px solid #ddd', background:'#fff', color:'#333', cursor:'pointer' }}>Sign in</button>
        </div>
      </div>

      {/* Hero text */}
      <div style={{ padding:'28px 0 20px' }}>
        <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', color:'#1D9E75', marginBottom:8 }}>The dentistry resource index</div>
        <h1 style={{ fontSize:26, fontWeight:500, color:'#111', lineHeight:1.2, margin:'0 0 10px' }}>
          {activeTheme ? activeThemeData.emoji + ' ' + activeTheme : 'Everything dentistry,\nranked and curated'}
        </h1>
        <p style={{ fontSize:14, color:'#666', lineHeight:1.6, margin:0 }}>
          {activeTheme
            ? `Browsing ${themeCategories.length} categories · ${filtered.length} resources`
            : 'Podcasts, books, CE, coaching, software, communities — scored by the profession.'}
        </p>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#aaa', fontSize:16 }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search resources…"
          style={{ width:'100%', padding:'10px 14px 10px 38px', borderRadius:10, border:'0.5px solid #e0e0e0', background:'#fff', fontSize:14, outline:'none', boxSizing:'border-box' }} />
      </div>

      {/* Theme tab bar */}
      <div style={{ display:'flex', gap:0, overflowX:'auto', marginBottom:0, borderBottom:'0.5px solid #e8e8e8', paddingBottom:0, scrollbarWidth:'none' }}>
        <button
          onClick={() => setActiveTheme(null)}
          style={{ fontSize:12, fontWeight:500, padding:'8px 14px', background:'none', border:'none', borderBottom: !activeTheme ? '2px solid #0F6E56' : '2px solid transparent', color: !activeTheme ? '#0F6E56' : '#888', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'system-ui,-apple-system,sans-serif' }}
        >All</button>
        {THEMES.map(t => (
          <button key={t.name}
            onClick={() => setActiveTheme(activeTheme === t.name ? null : t.name)}
            style={{ fontSize:12, fontWeight:500, padding:'8px 14px', background:'none', border:'none', borderBottom: activeTheme === t.name ? `2px solid ${t.color}` : '2px solid transparent', color: activeTheme === t.name ? t.color : '#888', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'system-ui,-apple-system,sans-serif', display:'flex', alignItems:'center', gap:4 }}
          >
            <span style={{ fontSize:14 }}>{t.emoji}</span>
            {t.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* AI banner */}
      <div style={{ background:'#fff', border:'0.5px solid #9FE1CB', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, margin:'20px 0 0' }}>
        <div style={{ width:7, height:7, background:'#1D9E75', borderRadius:'50%', flexShrink:0 }} />
        <span style={{ fontSize:12, color:'#555' }}><strong style={{ color:'#111' }}>AI curator active</strong> — new resources discovered and reviewed weekly</span>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'#999' }}>⏳ Loading…</div>}
      {error && <div style={{ background:'#FCEBEB', borderRadius:10, padding:'14px', color:'#A32D2D', fontSize:13, marginTop:20 }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* If a theme is active — show its categories then filtered resources */}
          {activeTheme && (
            <>
              <Divider label={`${themeCategories.length} categories in ${activeTheme}`} />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8, marginBottom:8 }}>
                {themeCategories.map(cat => (
                  <div key={cat.id} style={{ background:'#fff', border:'0.5px solid #e8e8e8', borderRadius:10, padding:'10px 12px', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = activeThemeData.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e8e8e8'}
                  >
                    <div style={{ fontSize:20, marginBottom:5 }}>{activeThemeData.emoji}</div>
                    <div style={{ fontSize:11, fontWeight:500, color:'#111', lineHeight:1.3 }}>{cat.fields['Category Name']}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Hero card — #1 resource */}
          {hero && (
            <>
              <Divider label={activeTheme ? `Top ${activeTheme.split(' ')[0]} resources` : 'Top pick this week'} />
              <HeroCard r={hero} />
            </>
          )}

          {/* Top 10 */}
          {topTen.length > 1 && (
            <>
              <Divider label="Top 10 ranked" />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {topTen.map((r, i) => <ResourceCard key={r.id} r={r} rank={i + 1} />)}
              </div>
            </>
          )}

          {/* New this week */}
          {!activeTheme && newItems.length > 0 && (
            <>
              <Divider label="New this week" />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {newItems.map(r => <ResourceCard key={r.id + '_new'} r={r} rank={null} />)}
              </div>
            </>
          )}

          {/* Browse all themes (only on All view) */}
          {!activeTheme && (
            <>
              <Divider label="Browse by theme" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8 }}>
                {THEMES.map(t => {
                  const count = categories.filter(c => c.fields['Theme'] === t.name).length;
                  return (
                    <div key={t.name} onClick={() => setActiveTheme(t.name)}
                      style={{ background:'#fff', border:'0.5px solid #e8e8e8', borderRadius:12, padding:'14px 12px', cursor:'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.transform='translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.transform='none'; }}
                    >
                      <div style={{ fontSize:24, marginBottom:6 }}>{t.emoji}</div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#111', marginBottom:2, lineHeight:1.3 }}>{t.name}</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>{count} categories</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

    </div>
    </div>
  );
}
