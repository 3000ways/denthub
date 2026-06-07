// env: 1780828923
import { useState, useEffect } from 'react';

const CAT_CONFIG = {
  Podcasts:    { emoji: '🎙️', bg: '#E1F5EE' },
  Books:       { emoji: '📚', bg: '#E6F1FB' },
  YouTube:     { emoji: '▶️', bg: '#FCEBEB' },
  'CE Courses':{ emoji: '🎓', bg: '#FAEEDA' },
  Communities: { emoji: '👥', bg: '#FBEAF0' },
  Residencies: { emoji: '🏥', bg: '#EAF3DE' },
  Journals:    { emoji: '📰', bg: '#EEEDFE' },
  Tools:       { emoji: '🔧', bg: '#F1EFE8' },
};

const HERO_COLORS = {
  Podcasts:    ['#0F6E56','#1D9E75'],
  Books:       ['#185FA5','#378ADD'],
  YouTube:     ['#A32D2D','#E24B4A'],
  'CE Courses':['#854F0B','#BA7517'],
  Communities: ['#993556','#D4537E'],
  Residencies: ['#3B6D11','#639922'],
  Journals:    ['#534AB7','#7F77DD'],
  Tools:       ['#5F5E5A','#888780'],
};

function ScoreBadge({ score }) {
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:500,
      padding:'2px 7px',borderRadius:20,background:'#0F6E56',color:'#fff'
    }}>
      ★ {score}
    </span>
  );
}

export default function Home() {
  const [resources, setResources]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab]   = useState('All');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [resRes, catRes] = await Promise.all([
          fetch('/api/airtable?table=Resources'),
          fetch('/api/airtable?table=Categories'),
        ]);
        const resData = await resRes.json();
        const catData = await catRes.json();
        if (resData.error) throw new Error(resData.error);
        setResources(resData.records || []);
        setCategories(catData.records || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredResources = resources.filter(r => {
    const f = r.fields;
    const matchTab    = activeTab === 'All' || f.Category === activeTab;
    const matchSearch = !search ||
      (f.Name || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.Description || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const featured  = filteredResources[0];
  const sideItems = filteredResources.slice(1, 4);
  const rankItems = filteredResources.slice(0, 10);

  const catCounts = {};
  resources.forEach(r => {
    const c = r.fields.Category;
    if (c) catCounts[c] = (catCounts[c] || 0) + 1;
  });

  const displayCats = categories.length > 0
    ? categories.map(c => c.fields.Name).filter(Boolean)
    : Object.keys(CAT_CONFIG);

  const s = {
    page:    { maxWidth:900, margin:'0 auto', padding:'0 20px 60px', fontFamily:'system-ui,-apple-system,sans-serif', background:'#f8f9fa', minHeight:'100vh' },
    topbar:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 8px' },
    logoMark:{ width:30, height:30, background:'#0F6E56', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 },
    pill:    (primary) => ({ fontSize:12, fontWeight:500, padding:'5px 14px', borderRadius:20, cursor:'pointer', border: primary ? 'none' : '1px solid #ddd', background: primary ? '#0F6E56' : '#fff', color: primary ? '#fff' : '#333' }),
    sectionLabel: { fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'#999' },
    catGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:28 },
    catCard: { background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, overflow:'hidden', cursor:'pointer' },
    catThumb:(bg) => ({ height:70, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }),
    rankCard:{ display:'flex', alignItems:'center', gap:10, background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'9px 12px', cursor:'pointer' },
  };

  return (
    <div style={{ background:'#f8f9fa', minHeight:'100vh' }}>
    <div style={s.page}>

      {/* Topbar */}
      <div style={s.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={s.logoMark}>🦷</div>
          <span style={{ fontSize:17, fontWeight:500, letterSpacing:-0.3 }}>
            Dent<span style={{ color:'#1D9E75' }}>Hub</span>
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={s.pill(true)}>Submit a resource</button>
          <button style={s.pill(false)}>Sign in</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding:'24px 0 16px' }}>
        <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', color:'#1D9E75', marginBottom:8 }}>
          The dentistry resource index
        </div>
        <h1 style={{ fontSize:28, fontWeight:500, color:'#111', lineHeight:1.25, margin:'0 0 8px' }}>
          Everything dentistry,<br />ranked and curated
        </h1>
        <p style={{ fontSize:15, color:'#666', maxWidth:460, lineHeight:1.6, margin:0 }}>
          Top podcasts, books, CE courses, YouTube channels, communities, and more — scored by the profession.
        </p>
      </div>

      {/* Search */}
      <div style={{ margin:'20px 0 28px', position:'relative' }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:18, color:'#999' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search resources, topics, or categories…"
          style={{ width:'100%', padding:'11px 14px 11px 44px', borderRadius:12, border:'1px solid #e0e0e0', background:'#fff', fontSize:14, color:'#111', outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:28 }}>
        {['All', ...displayCats.slice(0,7)].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            fontSize:13, fontWeight:500, padding:'6px 16px', borderRadius:20, cursor:'pointer',
            border: activeTab===tab ? '1px solid #0F6E56' : '1px solid #e0e0e0',
            background: activeTab===tab ? '#0F6E56' : '#fff',
            color: activeTab===tab ? '#fff' : '#444',
          }}>{tab}</button>
        ))}
      </div>

      {/* Category cards */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={s.sectionLabel}>Browse by category</span>
      </div>
      <div style={s.catGrid}>
        {displayCats.slice(0,6).map(name => {
          const cfg = CAT_CONFIG[name] || { emoji:'📁', bg:'#f0f0f0' };
          return (
            <div key={name} onClick={() => setActiveTab(name)} style={s.catCard}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#1D9E75'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#e8e8e8'; e.currentTarget.style.transform='none'; }}
            >
              <div style={s.catThumb(cfg.bg)}>{cfg.emoji}</div>
              <div style={{ padding:'8px 10px 10px', borderTop:'1px solid #f0f0f0' }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#111', marginBottom:1 }}>{name}</div>
                <div style={{ fontSize:11, color:'#999' }}>{catCounts[name] || 0} resources</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI banner */}
      <div style={{ background:'#fff', border:'1px solid #9FE1CB', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <div style={{ width:8, height:8, background:'#1D9E75', borderRadius:'50%', flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <strong style={{ fontSize:13, fontWeight:500, color:'#111', display:'block', marginBottom:1 }}>AI curator active — checking for new resources weekly</strong>
          <span style={{ fontSize:12, color:'#888' }}>New resources are automatically discovered and submitted for review</span>
        </div>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div style={{ textAlign:'center', padding:60, color:'#999' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          Loading resources…
        </div>
      )}

      {error && (
        <div style={{ background:'#FCEBEB', border:'1px solid #F09595', borderRadius:12, padding:'16px 20px', marginBottom:28, color:'#A32D2D', fontSize:14 }}>
          <strong>Could not load resources:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Featured + side picks */}
          {featured && (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={s.sectionLabel}>Editor's picks</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:28 }}>
                {/* Main featured */}
                <div
                  onClick={() => featured.fields.URL && window.open(featured.fields.URL, '_blank')}
                  style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, overflow:'hidden', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
                >
                  <div style={{
                    height:160, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6,
                    background:`linear-gradient(135deg,${(HERO_COLORS[featured.fields.Category]||['#0F6E56','#1D9E75'])[0]},${(HERO_COLORS[featured.fields.Category]||['#0F6E56','#1D9E75'])[1]})`
                  }}>
                    <div style={{ fontSize:48 }}>{(CAT_CONFIG[featured.fields.Category]||{}).emoji||'📌'}</div>
                    <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.8)' }}>
                      {featured.fields.Category} · #1 ranked
                    </div>
                  </div>
                  <div style={{ padding:'12px 14px' }}>
                    <span style={{ display:'inline-block', fontSize:10, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.07em', padding:'3px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', marginBottom:7 }}>
                      {featured.fields.Category}
                    </span>
                    <div style={{ fontSize:15, fontWeight:500, color:'#111', lineHeight:1.35, marginBottom:6 }}>{featured.fields.Name}</div>
                    <div style={{ fontSize:12, color:'#888', display:'flex', alignItems:'center', gap:8 }}>
                      <ScoreBadge score={(featured.fields['Final Score']||0).toFixed(1)} />
                      <span>{(featured.fields.Description||'').slice(0,60)}{(featured.fields.Description||'').length>60?'…':''}</span>
                    </div>
                  </div>
                </div>

                {/* Side picks */}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {sideItems.map(r => {
                    const cfg = CAT_CONFIG[r.fields.Category]||{emoji:'📌',bg:'#f0f0f0'};
                    return (
                      <div key={r.id}
                        onClick={() => r.fields.URL && window.open(r.fields.URL,'_blank')}
                        style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, overflow:'hidden', display:'flex', cursor:'pointer', minHeight:72 }}
                        onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
                        onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
                      >
                        <div style={{ width:72, height:72, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:26 }}>
                          {cfg.emoji}
                        </div>
                        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', justifyContent:'center', gap:3, borderLeft:'1px solid #f0f0f0' }}>
                          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', color:'#1D9E75', fontWeight:500 }}>{r.fields.Category}</div>
                          <div style={{ fontSize:13, fontWeight:500, color:'#111', lineHeight:1.3 }}>{r.fields.Name}</div>
                          <ScoreBadge score={(r.fields['Final Score']||0).toFixed(1)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Ranked list */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={s.sectionLabel}>
              Top {activeTab==='All' ? 'resources' : activeTab}
            </span>
          </div>
          {rankItems.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:'#999', background:'#fff', borderRadius:12, border:'1px solid #e8e8e8' }}>
              No resources found. Try a different category or search term.
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {rankItems.map((r, i) => {
              const cfg = CAT_CONFIG[r.fields.Category]||{emoji:'📌',bg:'#f0f0f0'};
              const rankColor = i===0 ? '#BA7517' : i===1 ? '#888780' : i===2 ? '#854F0B' : '#ccc';
              return (
                <div key={r.id}
                  onClick={() => r.fields.URL && window.open(r.fields.URL,'_blank')}
                  style={s.rankCard}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#1D9E75'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#e8e8e8'}
                >
                  <div style={{ fontSize:18, fontWeight:500, minWidth:22, textAlign:'center', color:rankColor }}>{i+1}</div>
                  <div style={{ width:40, height:40, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                    {cfg.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.fields.Name}</div>
                    <div style={{ fontSize:11, color:'#999' }}>{r.fields.Category}</div>
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
