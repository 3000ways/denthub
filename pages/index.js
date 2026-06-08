import { useState, useEffect } from 'react';

const THEMES = [
  'Learning & Education',
  'Technology & Software',
  'Coaching & Mentorship',
  'Community & Network',
  'Specialty Resources',
  'Training & Career',
  'Practice & Business',
  'Wellbeing & Lifestyle',
  'News & Media',
];

const THEME_SHORT = {
  'Learning & Education':  'Learning',
  'Technology & Software': 'Technology',
  'Coaching & Mentorship': 'Coaching',
  'Community & Network':   'Community',
  'Specialty Resources':   'Specialty',
  'Training & Career':     'Career',
  'Practice & Business':   'Business',
  'Wellbeing & Lifestyle': 'Wellbeing',
  'News & Media':          'News',
};

const THEME_TYPES = {
  'Learning & Education':  ['Podcast', 'Book', 'CE Website', 'YouTube', 'Journal', 'Newsletter', 'Course', 'Conference'],
  'Technology & Software': ['Software'],
  'Coaching & Mentorship': ['Coaching', 'Mastermind', 'Mentorship'],
  'Community & Network':   ['Community', 'Forum', 'Association'],
  'Specialty Resources':   ['Podcast', 'Book', 'CE Website', 'Software', 'Journal', 'Course'],
  'Training & Career':     ['Residency', 'Job Board', 'Course'],
  'Practice & Business':   ['Consulting', 'Agency', 'Advisor', 'Platform'],
  'Wellbeing & Lifestyle': ['Podcast', 'Book', 'Course'],
  'News & Media':          ['Newsletter', 'News', 'Instagram', 'YouTube'],
};

const CAT_TYPE_MAP = {
  'Podcasts':                     'Podcast',
  'Books':                        'Book',
  'YouTube Channels':             'YouTube',
  'CE Websites':                  'CE Website',
  'Dental Journals':              'Journal',
  'Online Courses':               'Course',
  'Dental Conferences':           'Conference',
  'Practice Management Software': 'Software',
  'Imaging & CBCT Systems':       'Software',
  'AI Diagnostic Tools':          'Software',
  'Intraoral Scanners':           'Software',
  'CAD/CAM Systems':              'Software',
  'Patient Communications':       'Software',
  'Billing & RCM Software':       'Software',
  'Digital Treatment Planning':   'Software',
};

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return null; }
}

function Logo({ url, name, size, type }) {
  const [err, setErr] = useState(false);
  const sz = size || 32;
  const radius = sz <= 32 ? 6 : 8;
  const initial = (name || '?')[0].toUpperCase();
  const isBook = type === 'Book';
  const domain = url ? getDomain(url) : null;

  const fallback = (
    <div style={{ width:sz, height:sz, borderRadius:radius, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:sz*0.4, fontWeight:500, color:'#085041', flexShrink:0 }}>
      {initial}
    </div>
  );

  if (err) return fallback;

  if (isBook) {
    return (
      <img
        src={`/api/airtable?cover=${encodeURIComponent(name)}`}
        alt={name}
        onError={() => setErr(true)}
        style={{ width:sz*0.72, height:sz, borderRadius:3, objectFit:'cover', flexShrink:0, boxShadow:'2px 2px 6px rgba(0,0,0,0.18)' }}
      />
    );
  }

  if (!domain) return fallback;

  return (
    <img
      src={`/api/airtable?logo=${domain}`}
      alt={name}
      onError={() => setErr(true)}
      style={{ width:sz, height:sz, borderRadius:radius, border:'0.5px solid #e8e8e8', objectFit:'contain', background:'#fafafa', flexShrink:0 }}
    />
  );
}

function ScoreBadge({ score, fields }) {
  const [show, setShow] = useState(false);
  const breakdown = [
    { label: 'Expert Score',     weight: '25%', value: fields?.['Expert Score'] },
    { label: 'Community Score',  weight: '25%', value: fields?.['Community Score'] },
    { label: 'Popularity Score', weight: '20%', value: fields?.['Popularity Score'] },
    { label: 'Recency Score',    weight: '15%', value: fields?.['Recency Score'] },
    { label: 'Clinical Depth',   weight: '15%', value: fields?.['Clinical Depth Score'] },
  ];
  const hasData = breakdown.some(b => b.value != null);

  return (
    <span style={{ position:'relative', display:'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ display:'inline-block', fontSize:11, fontWeight:500, color:'#085041', background:'#E1F5EE', padding:'2px 7px', borderRadius:3, userSelect:'none' }}>
        ★ {score}
      </span>
      {show && hasData && (
        <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', background:'#fff', border:'0.5px solid #e0e0e0', borderRadius:8, padding:'10px 14px', width:210, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', zIndex:999, pointerEvents:'none' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#111', marginBottom:8, paddingBottom:6, borderBottom:'0.5px solid #f0f0f0' }}>Score breakdown</div>
          {breakdown.map(b => (
            <div key={b.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <div>
                <span style={{ fontSize:11, color:'#555' }}>{b.label}</span>
                <span style={{ fontSize:10, color:'#bbb', marginLeft:4 }}>{b.weight}</span>
              </div>
              <span style={{ fontSize:11, fontWeight:500, color: b.value != null ? '#0F6E56' : '#bbb' }}>{b.value ?? '—'}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:7, paddingTop:7, borderTop:'0.5px solid #f0f0f0' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#111' }}>Final</span>
            <span style={{ fontSize:11, fontWeight:600, color:'#0F6E56' }}>{score}</span>
          </div>
          <div style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%) rotate(45deg)', width:8, height:8, background:'#fff', border:'0.5px solid #e0e0e0', borderTop:'none', borderLeft:'none' }} />
        </div>
      )}
    </span>
  );
}

const s = {
  page:       { background:'#fff', minHeight:'100vh' },
  inner:      { maxWidth:680, margin:'0 auto', padding:'0 24px 80px', fontFamily:'system-ui,-apple-system,sans-serif' },
  topbar:     { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 0 16px', borderBottom:'1px solid #e8e8e8', marginBottom:32 },
  navBtn:     { fontSize:12, padding:'5px 14px', borderRadius:4, background:'#0F6E56', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit' },
  eyebrow:    { fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888', marginBottom:10 },
  h1:         { fontSize:30, fontWeight:500, color:'#111', lineHeight:1.15, margin:'0 0 10px', letterSpacing:-0.5 },
  sub:        { fontSize:14, color:'#666', lineHeight:1.6, maxWidth:480, margin:'0 0 22px' },
  searchWrap: { display:'flex', alignItems:'center', gap:10, border:'0.5px solid #e0e0e0', borderRadius:4, padding:'9px 14px', marginBottom:32, background:'#fafafa' },
  themeNav:   { display:'flex', gap:0, borderBottom:'1px solid #e8e8e8', marginBottom:28, overflowX:'auto', scrollbarWidth:'none' },
  sectionLbl: { fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888', marginBottom:16, paddingBottom:10, borderBottom:'0.5px solid #e8e8e8' },
};

export default function Home() {
  const [categories, setCategories]         = useState([]);
  const [resources, setResources]           = useState([]);
  const [activeTheme, setActiveTheme]       = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch]                 = useState('');
  const [loading, setLoading]               = useState(true);

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
    const matchTheme = !themeTypes || themeTypes.some(t => (f.Type || '').includes(t));
    const catType    = activeCategory ? CAT_TYPE_MAP[activeCategory] : null;
    const matchCat   = !catType || (f.Type || '') === catType;
    const matchSearch = !search ||
      (f.Name || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.Description || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.Type || '').toLowerCase().includes(search.toLowerCase());
    return matchTheme && matchCat && matchSearch;
  });

  const themeCats = activeTheme
    ? categories.filter(c => c.fields['Theme'] === activeTheme).sort((a,b) => (a.fields['Display Order']||0)-(b.fields['Display Order']||0))
    : [];

  const themeCounts = {};
  THEMES.forEach(t => { themeCounts[t] = categories.filter(c => c.fields['Theme'] === t).length; });

  const top2   = filtered.slice(0, 2);
  const ranked = filtered.slice(0, 50);

  return (
    <div style={s.page}>
    <div style={s.inner}>

      <div style={s.topbar}>
        <div style={{ fontSize:15, fontWeight:500, color:'#111', letterSpacing:-0.3 }}>
          Dent<span style={{ color:'#0F6E56' }}>Hub</span>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {['Learning','Technology','Coaching','Specialty'].map(t => {
            const full = THEMES.find(th => th.startsWith(t));
            const isActive = activeTheme && activeTheme.startsWith(t);
            return (
              <a key={t} href="#" onClick={e => { e.preventDefault(); selectTheme(isActive ? null : full); }}
                style={{ fontSize:13, color: isActive ? '#111' : '#888', textDecoration:'none', fontWeight: isActive ? 500 : 400 }}>
                {t}
              </a>
            );
          })}
        </div>
        <button style={s.navBtn}>Submit</button>
      </div>

      {!activeTheme && (
        <>
          <div style={s.eyebrow}>The dentistry resource index</div>
          <h1 style={s.h1}>Everything dentistry,<br/>ranked and curated</h1>
          <p style={s.sub}>The profession's best podcasts, books, CE, coaching, software, and communities — scored by dentists, for dentists.</p>
        </>
      )}
      {activeTheme && (
        <div style={{ paddingTop:8, marginBottom:24 }}>
          <div style={s.eyebrow}>{activeTheme}</div>
          <h1 style={{ ...s.h1, fontSize:24 }}>
            {activeCategory ? activeCategory : `${themeCats.length} categories · ${filtered.length} resources`}
          </h1>
        </div>
      )}

      <div style={s.searchWrap}>
        <span style={{ color:'#aaa', fontSize:15 }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
          style={{ border:'none', background:'transparent', fontSize:13, color:'#111', outline:'none', flex:1 }} />
      </div>

      <div style={s.themeNav}>
        <button onClick={() => selectTheme(null)} style={{ fontSize:13, padding:'0 0 11px', marginRight:24, background:'none', border:'none', borderBottom: !activeTheme ? '2px solid #0F6E56' : '2px solid transparent', color: !activeTheme ? '#111' : '#888', fontWeight: !activeTheme ? 500 : 400, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
          All resources
        </button>
        {THEMES.map(t => (
          <button key={t} onClick={() => selectTheme(activeTheme === t ? null : t)} style={{ fontSize:13, padding:'0 0 11px', marginRight:24, background:'none', border:'none', borderBottom: activeTheme === t ? '2px solid #0F6E56' : '2px solid transparent', color: activeTheme === t ? '#111' : '#888', fontWeight: activeTheme === t ? 500 : 400, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            {THEME_SHORT[t]}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding:60, textAlign:'center', color:'#aaa', fontSize:14 }}>Loading…</div>}

      {!loading && (
        <>
          {activeTheme && themeCats.length > 0 && (
            <>
              <div style={s.sectionLbl}>Categories</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderTop:'0.5px solid #e8e8e8', borderLeft:'0.5px solid #e8e8e8', marginBottom:36 }}>
                {themeCats.map(cat => {
                  const catName = cat.fields['Category Name'];
                  const isActive = activeCategory === catName;
                  return (
                    <div key={cat.id} onClick={() => selectCategory(catName)}
                      style={{ padding:'14px 12px', borderRight:'0.5px solid #e8e8e8', borderBottom:'0.5px solid #e8e8e8', cursor:'pointer', background: isActive ? '#f0faf6' : 'transparent', borderLeft: isActive ? '3px solid #0F6E56' : '3px solid transparent' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f7fdfb'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ fontSize:13, fontWeight:500, color: isActive ? '#0F6E56' : '#111', marginBottom:2, lineHeight:1.3 }}>{catName}</div>
                      {cat.fields['Description'] && (
                        <div style={{ fontSize:11, color:'#aaa', lineHeight:1.4 }}>{cat.fields['Description'].slice(0,60)}…</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {top2.length > 0 && (
            <>
              <div style={s.sectionLbl}>
                {activeCategory ? `Top ${activeCategory}` : activeTheme ? `Top ${THEME_SHORT[activeTheme]} picks` : 'Top picks this week'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, marginBottom:36 }}>
                {top2.map((r, i) => (
                  <div key={r.id} style={{ borderLeft: i===1 ? '1px solid #e8e8e8' : 'none', paddingLeft: i===1 ? 32 : 0 }}>
                    <div onClick={() => r.fields.URL && window.open(r.fields.URL, '_blank')} style={{ cursor:'pointer' }}>
                      <Logo url={r.fields.URL} name={r.fields.Name} size={40} type={r.fields.Type} />
                      <div style={{ fontSize:11, color:'#aaa', marginTop:12, marginBottom:4 }}>#{i+1} overall</div>
                      <div style={{ fontSize:10, letterSpacing:'0.07em', textTransform:'uppercase', color:'#0F6E56', fontWeight:500, marginBottom:4 }}>{r.fields.Type}</div>
                      <div style={{ fontSize:17, fontWeight:500, color:'#111', lineHeight:1.25, marginBottom:4 }}>{r.fields.Name}</div>
                      <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>{r.fields['Host or Author']}</div>
                      <div style={{ fontSize:13, color:'#666', lineHeight:1.55 }}>{(r.fields.Description||'').slice(0,140)}{(r.fields.Description||'').length > 140 ? '…' : ''}</div>
                      <div style={{ marginTop:10 }}>
                        <ScoreBadge score={(r.fields['Final Score']||0).toFixed(1)} fields={r.fields} />
                      </div>
                    </div>
                  </div>
                ))}
                {top2.length === 1 && <div />}
              </div>
            </>
          )}

          {ranked.length > 0 && (
            <>
              <div style={s.sectionLbl}>
                {activeCategory ? `${activeCategory} — ranked` : 'Top 50 ranked'}
              </div>
              <div style={{ borderTop:'0.5px solid #e8e8e8', marginBottom:36 }}>
                {ranked.map((r, i) => (
                  <div key={r.id} onClick={() => r.fields.URL && window.open(r.fields.URL, '_blank')}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'0.5px solid #e8e8e8', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize:12, color:'#aaa', minWidth:18, textAlign:'right', flexShrink:0 }}>{i+1}</div>
                    <Logo url={r.fields.URL} name={r.fields.Name} size={40} type={r.fields.Type} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:1 }}>{r.fields.Name}</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>{r.fields.Type}{r.fields['Host or Author'] ? ' · ' + r.fields['Host or Author'] : ''}</div>
                    </div>
                    <div style={{ flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      <ScoreBadge score={(r.fields['Final Score']||0).toFixed(1)} fields={r.fields} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {ranked.length === 0 && (
            <div style={{ padding:'40px 0', textAlign:'center', color:'#aaa', fontSize:14 }}>No resources yet in this category.</div>
          )}

          {!activeTheme && (
            <>
              <div style={s.sectionLbl}>Browse by theme</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderTop:'0.5px solid #e8e8e8', borderLeft:'0.5px solid #e8e8e8' }}>
                {THEMES.map(t => (
                  <div key={t} onClick={() => selectTheme(t)}
                    style={{ padding:'16px 14px', borderRight:'0.5px solid #e8e8e8', borderBottom:'0.5px solid #e8e8e8', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize:13, fontWeight:500, color:'#111', marginBottom:3, lineHeight:1.3 }}>{t}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{themeCounts[t]} categories</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

    </div>
    </div>
  );
}
