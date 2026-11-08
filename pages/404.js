import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';

// Shown for any address that doesn't exist, including a removed resource or
// episode. Keeps the normal header and footer so nobody hits a dead end.
export default function NotFound() {
  return (
    <>
      <Head>
        <title>Page not found — The Dental Commute</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ background: '#f5f2eb', minHeight: '100vh', fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column' }}>
        <SiteNav />
        <main style={{ flex: 1, maxWidth: 560, width: '100%', margin: '0 auto', padding: '96px 20px', boxSizing: 'border-box', textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN, fontWeight: 600, marginBottom: 12 }}>
            404
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, lineHeight: 1.15, color: '#111', margin: '0 0 12px' }}>
            Wrong exit.
          </h1>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.5, margin: '0 0 28px' }}>
            We couldn&rsquo;t find that page. It may have moved, or the link may be out of date.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: GREEN, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 6 }}>
            Back to home
          </Link>
        </main>
        <Footer />
      </div>
    </>
  );
}
