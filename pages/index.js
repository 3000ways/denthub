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
    return (
      <img src={imageUrl} alt={name} onError={() => setErr(true)}
        style={{ width:sz*0.72, height:sz, borderRadius:4, objectFit:'cover', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }} />
    );
  }

  if (!domain) return fallback;

  return (
    <img src={`/api/airtable?logo=${domain}`} alt={name} onError={() => setErr(true)}
      style={{ width:sz, height:sz, borderRadius:radius, border:`0.5px solid ${BORDER}`, objectFit:'contain', background:'#fafafa', flexShrink:0 }} />
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
          <div style={{ fontSize:11, fontWeight:600, color:'#111', marginBottom:10, paddingBottom:8, borderBottom:`0.5px solid #f0f0f0`, letterSpacing:0.3, textTransform:'uppercase' }}>Score breakdown</div>
          {breakdown.map(b => (
            <div key={b.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div><span style={{ fontSize:11, color:'#555' }}>{b.label}</span><span style={{ fontSize:10, color:'#bbb', marginLeft:4 }}>{b.weight}</span></div>
              <span style={{ fontSize:11, fontWeight:500, color: b.value != null ? GREEN : '#ccc' }}>{b.value ?? '—'}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, paddingTop:8, borderTop:`0.5px solid #f0f0f0` }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#111' }}>Final</span>
            <span style={{ fontSize:11, fontWeight:700, color:GREEN }}>{score}</span>
          </div>
          <div style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%) rotate(45deg)', width:8, height:8, background:'#fff', border:`0.5px solid ${BORDER}`, borderTop:'none', borderLeft:'none' }} />
        </div>
      )}
    </span>
  );
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [resources, setResources]   = useState([]);
  const [activeTheme, setActiveTheme] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/airtable?table=Categories').then(r => r.json()),
      fetch('/api/airtable?table=Resources').then(r => r.json()),
    ]).then(([cat, res]) => {
      setCategories(cat.records || []);
      setResources(res.records || []);
    }).finally(() => setLoading(false));
  }, []);

  function selectTheme(t) { setActiveTheme(t); setActiveCategory(null); }
  function selectCategory(name) { setActiveCategory(prev => prev === name ? null : name); }

  const filtered = resources.filter(r => {
    const f = r.fields;
    const themeTypes = activeTheme ? THEME_TYPES[activeTheme] : null;
    const matchTheme = !themeTypes || themeTypes.some(t => (f.Type||'').includes(t));
    const catType = activeCategory ? CAT_TYPE_MAP[activeCategory] : null;
    const matchCat = !catType || (f.Type||'') === catType;
    const matchSearch = !search ||
      (f.Name||'').toLowerCase().includes(search.toLowerCase()) ||
      (f.Description||'').toLowerCase().includes(search.toLowerCase()) ||
      (f.Type||'').toLowerCase().includes(search.toLowerCase());
    return matchTheme && matchCat && matchSearch;
  });

  const themeCats = activeTheme ? categories.filter(c => c.fields['Theme'] === activeTheme).sort((a,b) => (a.fields['Display Order']||0)-(b.fields['Display Order']||0)) : [];
  const themeCounts = {};
  THEMES.forEach(t => { themeCounts[t] = categories.filter(c => c.fields['Theme'] === t).length; });
  const top2 = filtered.slice(0,2);
  const ranked = filtered.slice(0,50);

  return (
    <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>

      {/* Green accent bar at top */}
      <div style={{ height:3, background:GREEN }} />

      <div style={{ maxWidth:720, margin:'0 auto', padding:'0 28px 100px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 0 18px', borderBottom:`1px solid ${BORDER}`, marginBottom:40 }}>
          <div style={{ fontSize:17, fontWeight:700, color:'#111', letterSpacing:-0.5, fontFamily:FONT_BODY }}>
            Dent<span style={{ color:GREEN }}>Hub</span>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            {['Learning','Technology','Coaching','Specialty'].map(t => {
              const full = THEMES.find(th => th.startsWith(t));
              const isActive = activeTheme && activeTheme.startsWith(t);
              return (
                <a key={t} href="#" onClick={e => { e.preventDefault(); selectTheme(isActive ? null : full); }}
                  style={{ fontSize:13, color: isActive ? '#111':'#999', textDecoration:'none', fontWeight: isActive ? 500:400, transition:'color 0.15s', fontFamily:FONT_BODY }}>
                  {t}
                </a>
              );
            })}
          </div>
          <button
            style={{ fontSize:12, padding:'6px 16px', borderRadius:3, background:GREEN, color:'#fff', border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, letterSpacing:0.2 }}>
            Submit a resource
          </button>
        </div>

        {/* Hero */}
        {!activeTheme && (
          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:14, fontWeight:500 }}>The dentistry resource index</div>
            <h1 style={{ fontSize:42, fontWeight:700, color:'#111', lineHeight:1.1, margin:'0 0 16px', letterSpacing:-1.5, fontFamily:FONT_DISPLAY }}>
              Everything dentistry,<br/>ranked and curated
            </h1>
            <p style={{ fontSize:15, color:'#777', lineHeight:1.65, maxWidth:500, margin:'0 0 0', fontWeight:400 }}>
              The profession's best podcasts, books, CE, coaching, software, and communities — scored by dentists, for dentists.
            </p>
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

        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:10, border:`1px solid ${BORDER}`, borderRadius:6, padding:'10px 16px', marginBottom:36, background:'#fafafa' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
            style={{ border:'none', background:'transparent', fontSize:14, color:'#111', outline:'none', flex:1, fontFamily:FONT_BODY }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', color:'#bbb', fontSize:16, padding:0, lineHeight:1 }}>×</button>
          )}
        </div>

        {/* Theme nav tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${BORDER}`, marginBottom:36, overflowX:'auto', scrollbarWidth:'none' }}>
          {[{label:'All resources', key:null}, ...THEMES.map(t => ({label:THEME_SHORT[t], key:t}))].map(({label, key}) => {
            const isActive = activeTheme === key;
            return (
              <button key={label} onClick={() => selectTheme(key)}
                style={{ fontSize:13, padding:'0 0 13px', marginRight:28, background:'none', border:'none', borderBottom: isActive ? `2px solid ${GREEN}`:'2px solid transparent', color: isActive ? '#111':'#999', fontWeight: isActive ? 600:400, cursor:'pointer', fontFamily:FONT_BODY, whiteSpace:'nowrap', transition:'color 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div style={{ padding:'80px 0', textAlign:'center', color:'#ccc', fontSize:14, fontFamily:FONT_BODY }}>Loading…</div>
        )}

        {!loading && (<>

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
                      style={{ padding:'14px 16px', background: isActive ? GREEN_LIGHT : '#fff', cursor:'pointer', borderLeft: isActive ? `3px solid ${GREEN}` : '3px solid transparent', transition:'background 0.12s' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background='#f7fdfb'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background='#fff'; }}
                    >
                      <div style={{ fontSize:13, fontWeight:500, color: isActive ? GREEN :'#111', marginBottom:2, lineHeight:1.3 }}>{catName}</div>
                      {cat.fields['Description'] && <div style={{ fontSize:11, color:'#bbb', lineHeight:1.4 }}>{cat.fields['Description'].slice(0,60)}…</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured top 2 */}
          {top2.length > 0 && (
            <div style={{ marginBottom:44 }}>
              <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', marginBottom:18, fontWeight:600 }}>
                {activeCategory ? `Top ${activeCategory}` : activeTheme ? `Top ${THEME_SHORT[activeTheme]} picks` : 'Editor\'s top picks'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
                {top2.map((r, i) => (
                  <div key={r.id}
                    style={{ paddingRight: i===0 ? 32:0, paddingLeft: i===1 ? 32:0, borderLeft: i===1 ? `1px solid ${BORDER}`:undefined, cursor:'pointer' }}
                    onClick={() => r.fields.URL && window.open(r.fields.URL,'_blank')}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity='1'}
                  >
                    <Logo url={r.fields.URL} name={r.fields.Name} size={44} imageUrl={r.fields['Image URL']} />
                    <div style={{ fontSize:10, color:'#bbb', marginTop:14, marginBottom:5, letterSpacing:0.3 }}>#{i+1} overall</div>
                    <div style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:GREEN, fontWeight:600, marginBottom:6 }}>{r.fields.Type}</div>
                    <div style={{ fontSize:19, fontWeight:700, color:'#111', lineHeight:1.2, marginBottom:5, fontFamily:FONT_DISPLAY }}>{r.fields.Name}</div>
                    <div style={{ fontSize:12, color:'#aaa', marginBottom:10, fontWeight:400 }}>{r.fields['Host or Author']}</div>
                    <div style={{ fontSize:13, color:'#666', lineHeight:1.6 }}>{(r.fields.Description||'').slice(0,150)}{(r.fields.Description||'').length>150?'…':''}</div>
                    <div style={{ marginTop:12 }}><ScoreBadge score={(r.fields['Final Score']||0).toFixed(1)} fields={r.fields} /></div>
                  </div>
                ))}
                {top2.length===1 && <div />}
              </div>
            </div>
          )}

          {/* Divider between featured and ranked */}
          {top2.length > 0 && ranked.length > 0 && (
            <div style={{ height:1, background:BORDER, marginBottom:36 }} />
          )}

          {/* Ranked list */}
          {ranked.length > 0 && (
            <div style={{ marginBottom:44 }}>
              <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', marginBottom:4, fontWeight:600 }}>
                {activeCategory ? `${activeCategory} — ranked` : 'Full rankings'}
              </div>
              <div>
                {ranked.map((r, i) => (
                  <div key={r.id}
                    onClick={() => r.fields.URL && window.open(r.fields.URL,'_blank')}
                    style={{ display:'flex', alignItems:'center', gap:16, padding:'13px 0', borderBottom:`0.5px solid ${BORDER}`, cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#f9f9f9'; e.currentTarget.style.paddingLeft='6px'; e.currentTarget.style.paddingRight='6px'; e.currentTarget.style.marginLeft='-6px'; e.currentTarget.style.marginRight='-6px'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.paddingLeft='0'; e.currentTarget.style.paddingRight='0'; e.currentTarget.style.marginLeft='0'; e.currentTarget.style.marginRight='0'; }}
                  >
                    <div style={{ fontSize:11, color:'#ccc', minWidth:22, textAlign:'right', flexShrink:0, fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{i+1}</div>
                    <Logo url={r.fields.URL} name={r.fields.Name} size={40} imageUrl={r.fields['Image URL']} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:2 }}>{r.fields.Name}</div>
                      <div style={{ fontSize:11, color:'#bbb' }}>
                        <span style={{ color:GREEN, fontWeight:500, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{r.fields.Type}</span>
                        {r.fields['Host or Author'] ? <span style={{ color:'#ccc' }}> · {r.fields['Host or Author']}</span> : ''}
                      </div>
                    </div>
                    <div style={{ flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      <ScoreBadge score={(r.fields['Final Score']||0).toFixed(1)} fields={r.fields} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ranked.length===0 && (
            <div style={{ padding:'60px 0', textAlign:'center', color:'#ccc', fontSize:14, fontFamily:FONT_BODY }}>No resources yet in this category.</div>
          )}

          {/* Browse by theme (home only) */}
          {!activeTheme && (
            <div>
              <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', marginBottom:20, fontWeight:600 }}>Browse by theme</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:BORDER }}>
                {THEMES.map(t => (
                  <div key={t} onClick={() => selectTheme(t)}
                    style={{ padding:'20px 18px', background:'#fff', cursor:'pointer', transition:'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#f7fdfb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
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
