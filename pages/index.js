import { useState, useEffect } from 'react';

const THEME_CONFIG = {
  'Learning & Education':  { emoji: '📚', color: '#185FA5', bg: '#E6F1FB' },
  'Technology & Software': { emoji: '💻', color: '#3B6D11', bg: '#EAF3DE' },
  'Coaching & Mentorship': { emoji: '🎯', color: '#6B3FA0', bg: '#EEE8FB' },
  'Community & Network':   { emoji: '👥', color: '#993556', bg: '#FBEAF0' },
  'Specialty Resources':   { emoji: '🏥', color: '#0F6E56', bg: '#E1F5EE' },
  'Training & Career':     { emoji: '🎓', color: '#854F0B', bg: '#FAEEDA' },
  'Practice & Business':   { emoji: '💼', color: '#1B5FA5', bg: '#E3EEF9' },
  'Wellbeing & Lifestyle': { emoji: '❤️', color: '#A32D2D', bg: '#FCEBEB' },
  'News & Media':          { emoji: '📰', color: '#5F5E5A', bg: '#F1EFE8' },
  // fallback for old/unmapped themes
  'Software':              { emoji: '💻', color: '#3B6D11', bg: '#EAF3DE' },
  'Training & Residency':  { emoji: '🎓', color: '#854F0B', bg: '#FAEEDA' },
  'Specialty':             { emoji: '🏥', color: '#0F6E56', bg: '#E1F5EE' },
};

function getCfg(theme) {
  return THEME_CONFIG[theme] || { emoji: '📁', color: '#888', bg: '#f0f0f0' };
}

function ScoreBadge({ score }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#0F6E56', color:'#fff' }}>
      ★ {score}
    </span>
  );
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [resources, setResources]   = useState([]);
  const [activeTheme, setActiveTheme] = useState('All');
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

  // Unique themes in order of first appearance
  const themes = [...new Set(
    categories
      .sort((a, b) => (a.fields['Display Order'] || 0) - (b.fields['Display Order'] || 0))
      .map(c => c.fields['Theme'])
      .filter(Boolean)
  )];

  // Filter categories by active theme
  const visibleCats = categories
    .filter(c => activeTheme === 'All' || c.fields['Theme'] === activeTheme)
    .sort((a, b) => (a.fields['Display Order'] || 0) - (b.fields['Display Order'] || 0));

  // Filter resources by search
  const filteredResources = resources.filter(r => {
    if (!search) return true;
    return (r.fields.Name || '').toLowerCase().includes(search.toLowerCase()) ||
           (r.fields.Description || '').toLowerCase().includes(search.toLowerCase());
  });

  const featured  = filteredResources[0];
  const sideItems = filteredResources.slice(1, 4);
  const rankItems = filteredResources.slice(0, 10);

  return (
    <div style={{ background:'#f8f9fa', minHeight:'100vh' }}>
    <div style={{ maxWidth:900, margin:'0 auto', padding:'0 20px 60px', fontFamily:'system-ui,-apple-system,sans-serif' }}>

      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, background:'#0F6E56', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🦷</div>
          <span style={{ fontSize:17, fontWeight:500, letterSpacing:-0.3 }}>Dent<span style={{ color:'#1D9E75' }}>Hub</span></span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ fontSize:12, fontWeight:500, padding:'5px 14px', borderRadius:20, border:'none', background:'#0F6E56', color:'#fff', cursor:'pointer' }}>Submit a resource</button>
          <button style={{ fontSize:12, fontWeight:500, padding:'5px 14px', borderRadius:20, border:'1px solid #ddd', background:'#fff', color:'#333', cursor:'pointer' }}>Sign in</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding:'24px 0 16px' }}>
        <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', color:'#1D9E75', marginBottom:8 }}>The dentistry resource index</div>
        <h1 style={{ fontSize:28, fontWeight:500, color:'#111', lineHeight:1.25, margin:'0 0 8px' }}>Everything dentistry,<br />ranked and curated</h1>
        <p style={{ fontSize:15, color:'#666', maxWidth:460, lineHeight:1.6, margin:0 }}>
          Top podcasts, books, CE courses, coaching programs, software, communities, and more — scored by the profession.
        </p>
      </div>

      {/* Search */}
      <div style={{ margin:'20px 0 24px', position:'relative' }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:18, color:'#999' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search resources, categories, or topics…"
          style={{ width:'100%', padding:'11px 14px 11px 44px', borderRadius:12, border:'1px solid #e0e0e0', background:'#fff', fontSize:14, color:'#111', outline:'none', boxSizing:'border-box' }} />
      </div>

      {/* Theme tabs */}
      {!loading && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
          {['All', ...themes].map(theme => {
            const cfg = getCfg(theme);
            const active = activeTheme === theme;
            return (
              <button key={theme} onClick={() => setActiveTheme(theme)} style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:13, fontWeight:500, padding:'6px 14px', borderRadius:20, cursor:'pointer',
                border: active ? `1px solid ${cfg.color}` : '1px solid #e0e0e0',
                background: active ? cfg.color : '#fff',
                color: active ? '#fff' : '#444',
              }}>
                {theme !== 'All' && <span>{cfg.emoji}</span>}
                {theme === 'All' ? 'All' : theme}
              </button>
            );
          })}
        </div>
      )}

      {/* Category cards grouped */}
      {!loading && visibleCats.length > 0 && (
        <>
          <div style={{ fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'#999', marginBottom:12 }}>
            {activeTheme === 'All' ? 'Browse all categories' : activeTheme}
          </div>

          {/* If All, group by theme */}
          {activeTheme === 'All' ? (
            themes.map(theme => {
              const themeCats = categories
                .filter(c => c.fields['Theme'] === theme)
                .sort((a, b) => (a.fields['Display Order']||0) - (b.fields['Display Order']||0));
              const cfg = getCfg(theme);
              return (
                <div key={theme} style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{cfg.emoji}</div>
                    <span style={{ fontSize:14, fontWeight:500, color:'#111' }}>{theme}</span>
                    <span style={{ fontSize:12, color:'#999' }}>· {themeCats.length} categories</span>
                    <button onClick={() => setActiveTheme(theme)} style={{ marginLeft:'auto', fontSize:12, color:cfg.color, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                      View all →
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8 }}>
                    {themeCats.slice(0, 6).map(cat => (
                      <div key={cat.id}
                        style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, overflow:'hidden', cursor:'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.transform='translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.transform='none'; }}
                      >
                        <div style={{ height:56, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{cfg.emoji}</div>
                        <div style={{ padding:'7px 9px 9px', borderTop:'1px solid #f0f0f0' }}>
                          <div style={{ fontSize:11, fontWeight:500, color:'#111', lineHeight:1.3 }}>{cat.fields['Category Name']}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Single theme — show all its categories */
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8, marginBottom:24 }}>
              {visibleCats.map(cat => {
                const cfg = getCfg(cat.fields['Theme']);
                return (
                  <div key={cat.id}
                    style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, overflow:'hidden', cursor:'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.transform='none'; }}
                  >
                    <div style={{ height:60, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{cfg.emoji}</div>
                    <div style={{ padding:'8px 10px 10px', borderTop:'1px solid #f0f0f0' }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#111', lineHeight:1.3, marginBottom:3 }}>{cat.fields['Category Name']}</div>
                      {cat.fields['Description'] && (
                        <div style={{ fontSize:11, color:'#999', lineHeight:1.3 }}>{cat.fields['Description'].slice(0,60)}…</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* AI banner */}
      <div style={{ background:'#fff', border:'1px solid #9FE1CB', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:8, height:8, background:'#1D9E75', borderRadius:'50%', flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <strong style={{ fontSize:13, fontWeight:500, color:'#111', display:'block', marginBottom:1 }}>AI curator active — checking for new resources weekly</strong>
          <span style={{ fontSize:12, color:'#888' }}>New resources are automatically discovered and submitted for review</span>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'#999' }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Loading…</div>}
      {error && <div style={{ background:'#FCEBEB', border:'1px solid #F09595', borderRadius:12, padding:'16px 20px', color:'#A32D2D', fontSize:14 }}><strong>Error:</strong> {error}</div>}

      {!loading && !error && (
        <>
          {/* Featured + side */}
          {featured && (
            <>
              <div style={{ fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'#999', marginBottom:10 }}>Top ranked resources</div>
              <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:24 }}>
                <div onClick={() => featured.fields.URL && window.open(featured.fields.URL,'_blank')}
                  style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, overflow:'hidden', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
                >
                  <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6, background:'linear-gradient(135deg, #0F6E56, #1D9E75)' }}>
                    <div style={{ fontSize:48 }}>🏆</div>
                    <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.85)' }}>#1 Ranked Resource</div>
                  </div>
                  <div style={{ padding:'12px 14px' }}>
                    <span style={{ display:'inline-block', fontSize:10, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.07em', padding:'3px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', marginBottom:7 }}>{featured.fields.Type}</span>
                    <div style={{ fontSize:15, fontWeight:500, color:'#111', lineHeight:1.35, marginBottom:6 }}>{featured.fields.Name}</div>
                    <div style={{ fontSize:12, color:'#888', display:'flex', alignItems:'center', gap:8 }}>
                      <ScoreBadge score={(featured.fields['Final Score']||0).toFixed(1)} />
                      <span>{(featured.fields.Description||'').slice(0,60)}{(featured.fields.Description||'').length>60?'…':''}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {sideItems.map(r => (
                    <div key={r.id} onClick={() => r.fields.URL && window.open(r.fields.URL,'_blank')}
                      style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, overflow:'hidden', display:'flex', cursor:'pointer', minHeight:72 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
                    >
                      <div style={{ width:72, height:72, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:26 }}>⭐</div>
                      <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', justifyContent:'center', gap:3, borderLeft:'1px solid #f0f0f0' }}>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', color:'#1D9E75', fontWeight:500 }}>{r.fields.Type}</div>
                        <div style={{ fontSize:13, fontWeight:500, color:'#111', lineHeight:1.3 }}>{r.fields.Name}</div>
                        <ScoreBadge score={(r.fields['Final Score']||0).toFixed(1)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Ranked list */}
          <div style={{ fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'#999', marginBottom:10 }}>Top 10 resources</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {rankItems.map((r,i) => {
              const rankColor = i===0?'#BA7517':i===1?'#888780':i===2?'#854F0B':'#ccc';
              return (
                <div key={r.id} onClick={() => r.fields.URL && window.open(r.fields.URL,'_blank')}
                  style={{ display:'flex', alignItems:'center', gap:10, background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'9px 12px', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
                >
                  <div style={{ fontSize:18, fontWeight:500, minWidth:22, textAlign:'center', color:rankColor }}>{i+1}</div>
                  <div style={{ width:40, height:40, borderRadius:8, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':'📌'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.fields.Name}</div>
                    <div style={{ fontSize:11, color:'#999' }}>{r.fields.Type}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#0F6E56', flexShrink:0 }}>{(r.fields['Final Score']||0).toFixed(1)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
    </div>
  );
}
