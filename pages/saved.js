import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { useBookmarks } from '../lib/bookmarks-context';
import { useEpisodeBookmarks } from '../lib/episode-bookmarks-context';
import { supabase } from '../lib/supabase';
import { BookmarkButton } from '../components/BookmarkButton';
import { EpisodeCard } from '../components/EpisodeCard';
import { mapEpisodeRow } from '../lib/resource-episodes';
import { SignInModal } from '../components/AuthModal';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const GREEN_LIGHT = '#E8F5F0';
const BORDER = '#e8e8e8';

// Group headings by resource Type, in the order they should appear on the page.
const TYPE_LABELS = {
  Podcast: 'Saved Podcasts',
  YouTube: 'Saved YouTube',
  Book: 'Saved Books',
  Course: 'Saved CE Courses',
  Coaching: 'Saved Coaching',
  Community: 'Saved Communities',
  Software: 'Saved Software',
  Mastermind: 'Saved Masterminds',
  Website: 'Saved Websites',
};
const TYPE_ORDER = Object.keys(TYPE_LABELS);
const labelForType = (t) => TYPE_LABELS[t] || `Saved ${t || 'Other'}`;

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
  const { episodeBookmarkIds, loaded: epBookmarksLoaded } = useEpisodeBookmarks();
  const [showSignIn, setShowSignIn] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [episodeDetails, setEpisodeDetails] = useState([]);

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

  // Fetch details for the user's saved episodes (newest first). We keep the full
  // fetched list and render only those still in the live bookmark set, so
  // removing one updates instantly without a refetch.
  useEffect(() => {
    if (!user) { setEpisodeDetails([]); return; }
    supabase
      .from('episode_bookmarks')
      .select('created_at, episodes ( id, title, show_name, show_resource_id, image, audio_url, duration_seconds, published_at )')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEpisodeDetails((data || []).filter(r => r.episodes).map(r => ({ ...r.episodes, savedAt: r.created_at })));
      });
  }, [user, episodeBookmarkIds.size]);

  if (authLoading || !user) return null;

  const saved = resources.filter(r => bookmarkIds.has(r.id));
  const savedEpisodes = episodeDetails.filter(ep => episodeBookmarkIds.has(ep.id));
  const ready = bookmarksLoaded && !loadingResources;

  return (
    <>
      <Head>
        <title>Saved — The Dental Commute</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT_BODY }}>
        <SiteNav />

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 28px 100px' }}>

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

          {/* Saved Episodes — individually bookmarked episodes */}
          {epBookmarksLoaded && savedEpisodes.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0, fontFamily: FONT_DISPLAY, letterSpacing: -0.4 }}>
                  Saved Episodes
                </h2>
                <span style={{ fontSize: 12, color: '#bbb', fontWeight: 500 }}>{savedEpisodes.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedEpisodes.map(ep => (
                  <EpisodeCard key={ep.id} ep={mapEpisodeRow(ep)} isNew={false} onSignInRequired={() => setShowSignIn(true)} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {ready && saved.length === 0 && savedEpisodes.length === 0 && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: '#bbb', marginBottom: 16 }}>You haven&rsquo;t saved anything yet.</div>
              <Link href="/" style={{ fontSize: 13, color: GREEN, fontWeight: 500, textDecoration: 'none', border: `1px solid ${GREEN}`, padding: '8px 18px', borderRadius: 4 }}>
                Browse resources →
              </Link>
            </div>
          )}

          {/* Saved list — grouped by resource type */}
          {ready && saved.length > 0 && (() => {
            const renderRow = (r) => {
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
            };

            // Bucket saved resources by Type, then order groups: known types first
            // (per TYPE_ORDER), any unknown types after, alphabetically.
            const groups = {};
            saved.forEach(r => { const t = r.fields.Type || 'Other'; (groups[t] = groups[t] || []).push(r); });
            const orderedTypes = [
              ...TYPE_ORDER.filter(t => groups[t]),
              ...Object.keys(groups).filter(t => !TYPE_ORDER.includes(t)).sort(),
            ];

            return orderedTypes.map(type => (
              <div key={type} style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0, fontFamily: FONT_DISPLAY, letterSpacing: -0.4 }}>
                    {labelForType(type)}
                  </h2>
                  <span style={{ fontSize: 12, color: '#bbb', fontWeight: 500 }}>{groups[type].length}</span>
                </div>
                <div style={{ borderTop: `1px solid ${BORDER}` }}>
                  {groups[type].map(renderRow)}
                </div>
              </div>
            ));
          })()}

          {/* Back link */}
          <div style={{ marginTop: 48, paddingTop: 28, borderTop: `1px solid ${BORDER}` }}>
            <Link href="/" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>← Back to directory</Link>
          </div>
        </div>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      <Footer />
    </>
  );
}
