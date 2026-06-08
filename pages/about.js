import Link from 'next/link';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

export default function About() {
  return (
    <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>
      <div style={{ height:3, background:GREEN }} />

      <div style={{ maxWidth:720, margin:'0 auto', padding:'0 28px 100px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 0 18px', borderBottom:`1px solid ${BORDER}`, marginBottom:60 }}>
          <Link href="/" style={{ fontSize:17, fontWeight:700, color:'#111', letterSpacing:-0.5, fontFamily:FONT_BODY, textDecoration:'none' }}>
            Dent<span style={{ color:GREEN }}>Hub</span>
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <Link href="/about" style={{ fontSize:13, color:'#111', textDecoration:'none', fontWeight:500, fontFamily:FONT_BODY }}>About</Link>
            <button style={{ fontSize:12, padding:'6px 16px', borderRadius:3, background:GREEN, color:'#fff', border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500, letterSpacing:0.2 }}>
              Submit a resource
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth:560 }}>
          <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:14, fontWeight:500 }}>About DentHub</div>
          <h1 style={{ fontSize:38, fontWeight:700, color:'#111', lineHeight:1.1, margin:'0 0 28px', letterSpacing:-1.2, fontFamily:FONT_DISPLAY }}>
            Built by a dentist,<br/>for dentists
          </h1>

          <p style={{ fontSize:15, color:'#555', lineHeight:1.75, marginBottom:20 }}>
            DentHub is a curated index of the best learning resources in dentistry — podcasts, books, CE courses, YouTube channels, software, and more — scored and ranked by dental professionals.
          </p>

          {/* Stats bar */}
          <div style={{ display:'flex', gap:28, padding:'20px 0', borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}`, marginBottom:32 }}>
            {[
              { value:'300+', label:'resources indexed' },
              { value:'49', label:'categories' },
              { value:'8', label:'themes' },
              { value:'9+', label:'specialties covered' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ fontSize:22, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, lineHeight:1 }}>{value}</div>
                <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize:15, color:'#555', lineHeight:1.75, marginBottom:40 }}>
            Every resource is scored using a weighted formula that combines expert opinion, community feedback, popularity, recency, and clinical depth. The goal is a trusted, living directory that gets better as more dentists contribute.
          </p>

          <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:32, marginBottom:32 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:16 }}>The scoring formula</div>
            {[
              { label:'Expert Score', weight:'25%' },
              { label:'Community Score', weight:'25%' },
              { label:'Popularity Score', weight:'20%' },
              { label:'Recency Score', weight:'15%' },
              { label:'Clinical Depth', weight:'15%' },
            ].map(({ label, weight }) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`0.5px solid ${BORDER}` }}>
                <span style={{ fontSize:13, color:'#555' }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:600, color:GREEN }}>{weight}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:32, marginBottom:32 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Know a great resource?</div>
            <p style={{ fontSize:14, color:'#777', lineHeight:1.65, marginBottom:20 }}>
              DentHub is only as good as its community. If there's a podcast, book, course, or tool you think belongs here, submit it and we'll review it.
            </p>
            <button style={{ fontSize:13, padding:'10px 22px', borderRadius:4, background:GREEN, color:'#fff', border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500 }}>
              Submit a resource
            </button>
          </div>

          <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:32 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Get in touch</div>
            <p style={{ fontSize:14, color:'#777', lineHeight:1.65, marginBottom:16 }}>
              Questions, feedback, or partnership inquiries — reach out directly.
            </p>
            <a href="mailto:hello@denthub.co" style={{ fontSize:14, color:GREEN, fontWeight:500, textDecoration:'none', fontFamily:FONT_BODY }}>hello@denthub.co</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${BORDER}`, marginTop:60 }}>
        <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:12, color:'#bbb' }}>© {new Date().getFullYear()} DentHub. All rights reserved.</div>
          <a href="mailto:hello@denthub.co" style={{ fontSize:12, color:'#bbb', textDecoration:'none', fontFamily:FONT_BODY }}>hello@denthub.co</a>
        </div>
      </div>
    </div>
  );
}
