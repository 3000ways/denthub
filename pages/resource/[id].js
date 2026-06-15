import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { CommunitySection } from '../../components/Community';
import { useAuth } from '../../lib/auth-context';
import { SignInModal, OnboardingModal } from '../../components/AuthModal';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

export async function getServerSideProps({ params }) {
  try {
    const base = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';
    const pat = process.env.AIRTABLE_PAT;
    const r = await fetch(`https://api.airtable.com/v0/${base}/Resources/${params.id}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!r.ok) return { notFound: true };
    const record = await r.json();
    if (record.fields?.Status !== 'Published') return { notFound: true };
    return { props: { record } };
  } catch {
    return { notFound: true };
  }
}

function ScoreBar({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#666', fontFamily: FONT }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: value != null ? GREEN : '#ddd', fontFamily: FONT }}>{value ?? '—'}</span>
      </div>
      <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2 }}>
        <div style={{ height: 3, width: value ? `${Math.min(value, 100)}%` : '0%', background: GREEN, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function Logo({ url, name, imageUrl, size = 64 }) {
  const [err, setErr] = useState(false);
  const domain = (() => { try { return new URL(url).hostname; } catch { return null; } })();
  const favicon = domain ? `/api/airtable?logo=${domain}` : null;
  const src = imageUrl || favicon;
  if (!src || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: '#e8f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: GREEN, fontFamily: FONT, flexShrink: 0 }}>
        {name?.[0] || '?'}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 12, objectFit: 'contain', border: `1px solid ${BORDER}`, background: '#fafafa', flexShrink: 0 }} />
  );
}

export default function ResourcePage({ record }) {
  const f = record.fields;
  const { user } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const score = f['Final Score'] ? (f['Final Score'] % 1 === 0 ? f['Final Score'].toString() : f['Final Score'].toFixed(1)) : null;
  const breakdown = [
    { label: 'Expert Score', value: f['Expert Score'], weight: 25 },
    { label: 'Community Score', value: f['Community Score'], weight: 25 },
    { label: 'Popularity Score', value: f['Popularity Score'], weight: 20 },
    { label: 'Recency Score', value: f['Recency Score'], weight: 15 },
    { label: 'Clinical Depth', value: f['Clinical Depth Score'], weight: 15 },
  ];

  const title = `${f.Name} — The Dental Commute`;
  const description = f.Description ? f.Description.slice(0, 155) : `${f.Name} is a ${f.Type} resource ranked on The Dental Commute — the dental professional's resource directory.`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://thedentalcommute.com/resource/${record.id}`} />
        <meta property="og:image" content="https://thedentalcommute.com/og-image.jpg" />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://thedentalcommute.com/resource/${record.id}`} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Review",
          "name": f.Name,
          "description": description,
          "url": f.URL,
          "reviewRating": score ? {
            "@type": "Rating",
            "ratingValue": score,
            "bestRating": "100"
          } : undefined,
          "author": { "@type": "Organization", "name": "The Dental Commute" },
          "itemReviewed": {
            "@type": "Thing",
            "name": f.Name,
            "url": f.URL,
          }
        })}} />
      </Head>

      <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT }}>
        <div style={{ height: 3, background: GREEN }} />

        {/* Header */}
        <div style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(245,242,235,0.95)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/">
              <img src="/logo.png" alt="The Dental Commute" style={{ height: 48, width: 'auto' }} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {user ? (
                <span style={{ fontSize: 13, color: '#555' }}>{user.email}</span>
              ) : (
                <button onClick={() => setShowSignIn(true)} style={{ fontSize: 13, padding: '7px 18px', borderRadius: 4, background: GREEN, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Back link */}
          <Link href="/" style={{ fontSize: 13, color: GREEN, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
            ← Back to all resources
          </Link>

          {/* Hero */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <Logo url={f.URL} name={f.Name} imageUrl={f['Image URL']} size={72} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: '#e8f5f0', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.Type}</span>
                  {f.Specialty && <span style={{ fontSize: 11, color: '#888', background: '#f0f0f0', padding: '3px 10px', borderRadius: 20 }}>{f.Specialty}</span>}
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 4px', fontFamily: FONT_DISPLAY, letterSpacing: -0.5, lineHeight: 1.2 }}>{f.Name}</h1>
                {f['Host or Author'] && <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{f['Host or Author']}</div>}
                {score && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: GREEN, color: '#fff', padding: '5px 14px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
                    ★ {score}
                  </div>
                )}
              </div>
            </div>

            {f.Description && (
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: '24px 0 0' }}>{f.Description}</p>
            )}

            {/* CTA */}
            <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {f.URL && (
                <a href={f.URL} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: GREEN, textDecoration: 'none', padding: '10px 20px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Visit {f.Name} →
                </a>
              )}
              {f['RSS Feed URL'] && (
                <a href={f['RSS Feed URL']} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 500, color: '#555', background: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  RSS Feed
                </a>
              )}
            </div>
          </div>

          {/* Score breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 20 }}>Score Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
              {breakdown.map(b => <ScoreBar key={b.label} label={`${b.label} (${b.weight}%)`} value={b.value} />)}
            </div>
          </div>

          {/* Community */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>Community</div>
            <CommunitySection resourceId={record.id} onSignInRequired={() => setShowSignIn(true)} />
          </div>

        </div>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </>
  );
}
