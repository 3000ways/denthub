import Link from 'next/link';

const BORDER = '#e8e8e8';
const FONT = "'Inter', system-ui, -apple-system, sans-serif";

const linkStyle = { fontSize: 13, color: '#777', textDecoration: 'none', fontWeight: 500 };

// Site footer with the standing nav links (About / Privacy / Terms) + copyright.
// These links live here so they're reachable on every page for everyone —
// including signed-out visitors on mobile, where the top nav hides "About".
export default function Footer({ maxWidth = 1140 }) {
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 40 }}>
      <div style={{
        maxWidth, margin: '0 auto', padding: '22px 20px', fontFamily: FONT,
        display: 'flex', flexWrap: 'wrap', gap: '12px 22px', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'center' }}>
          <Link href="/about" style={linkStyle}>About</Link>
          <Link href="/privacy" style={linkStyle}>Privacy</Link>
          <Link href="/terms" style={linkStyle}>Terms</Link>
        </div>
        <div style={{ fontSize: 12, color: '#bbb' }}>© {new Date().getFullYear()} The Dental Commute. All rights reserved.</div>
      </div>
    </div>
  );
}
