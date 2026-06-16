import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { useBookmarks } from '../lib/bookmarks-context';
import { BookmarkButton } from '../components/BookmarkButton';
import { BookmarkFeed } from '../components/BookmarkFeed';
import { SignInModal } from '../components/AuthModal';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const GREEN_LIGHT = '#E8F5F0';
const BORDER = '#e8e8e8';

function getDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return null; } }

function Logo({ url, name, imageUrl, size = 40 }) {
  const [err, setErr] = useState(false);
  const domain = url ? getDomain(url) : null;
  const src = imageUrl || (domain ? `/api/airtable?logo=${domain}` : null);
  if (!src || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: 6, background: GREEN_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600, color: GREEN, flexShrink: 0, fontFamily: FONT_BODY }}>
        {(name || '?')[0].toUpperCase()}
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 6, border: `0.5px solid ${BORDER}`, objectFit: 'contain', background: '#fafafa', flexShrink: 0 }} />;
}

export default function SavedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { bookmarkIds, count, loaded: bookmarksLoaded } = useBookmarks();
  const [showSignIn, setShowSignIn] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Login-required: bounce signed-out visitors home.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  // Fetch all resources once so we can show details for bookmarked IDs.
  useEffect(() => {
    fetch('/api/airtable?table=Resources')
      .then(r => r.json())
      .then(res => setResources(res.records || []))
      .catch(() => setResources([]))
      .finally(() => setLoadingResources(false));
  }, []);

  if (authLoading || !user) return null;

  const saved = resources.filter(r => bookmarkIds.has(r.id));
  const ready = bookmarksLoaded && !loadingResources;

  return (
    <>
      <Head>
        <title>Saved — The Dental Commute</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT_BODY }}>
        <div style={{ height: 3, background: GREEN }} />

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 28px 100px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 18px', borderBottom: `1px solid ${BORDER}`, marginBottom: 48 }}>
            <Link href="/">
              <img src="/logo.png" alt="The Dental Commute" style={{ height: 44, width: 'auto', display: 'block' }} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Link href="/about" style={{ fontSize: 13, color: '#111', textDecoration: 'none', fontWeight: 500 }}>About</Link>
              <Link href="/profile" style={{ fontSize: 13, color: '#555', textDecoration: 'none', fontWeight: 500 }}>Profile</Link>
            </div>
          </div>

          {/* Page title */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 14, fontWeight: 500 }}>Your Library</div>
            <h1 style={{ fontSize: 34, fontWeight: 700, color: '#111', lineHeight: 1.1, margin: '0 0 8px', letterSpacing: -1, fontFamily: FONT_DISPLAY }}>
              Saved Resources
            </h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              {ready ? `${count} ${count === 1 ? 'resource' : 'resources'} bookmarked` : 'Loading…'}
            </p>
          </div>

          {/* New episodes from followed shows */}
          <BookmarkFeed isMobile={isMobile} limit={isMobile ? 4 : 8} />

          {/* Empty state */}
          {ready && saved.length === 0 && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: '#bbb', marginBottom: 16 }}>You haven&rsquo;t saved anything yet.</div>
              <Link href="/" style={{ fontSize: 13, color: GREEN, fontWeight: 500, textDecoration: 'none', border: `1px solid ${GREEN}`, padding: '8px 18px', borderRadius: 4 }}>
                Browse resources →
              </Link>
            </div>
          )}

          {/* Saved list */}
          {ready && saved.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              {saved.map(r => {
                const f = r.fields;
                const score = ((s) => s % 1 === 0 ? s.toString() : s.toFixed(1))(f['Final Score'] || 0);
                return (
                  <div key={r.id}
                    onClick={() => router.push(`/resource/${r.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: `0.5px solid ${BORDER}`, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Logo url={f.URL} name={f.Name} imageUrl={f['Image URL']} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.Name}</div>
                      <div style={{ fontSize: 11, color: '#bbb' }}>
                        <span style={{ color: GREEN, fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.Type}</span>
                        {f['Host or Author'] ? <span> · {f['Host or Author']}</span> : ''}
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: GREEN, background: GREEN_LIGHT, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>
                      <span style={{ fontSize: 9 }}>★</span> {score}
                    </span>
                    <BookmarkButton resourceId={r.id} onSignInRequired={() => setShowSignIn(true)} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Back link */}
          <div style={{ marginTop: 48, paddingTop: 28, borderTop: `1px solid ${BORDER}` }}>
            <Link href="/" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>← Back to directory</Link>
          </div>
        </div>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </>
  );
}
