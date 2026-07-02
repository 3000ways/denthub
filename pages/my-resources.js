import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SiteNav from '../components/SiteNav';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Dashboard for signed-in resource owners: lists everything they've claimed
// (approved only) plus the status of any claim still pending review, and
// links to the editor for each.
export default function MyResources() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [claims, setClaims] = useState([]);
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('resource_claims')
      .select('id, resource_id, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const rows = data || [];
        setClaims(rows);
        const ids = [...new Set(rows.map(c => c.resource_id))];
        if (ids.length) {
          const details = await Promise.all(ids.map(id => fetch(`/api/creator/resource?id=${id}`).then(r => r.ok ? r.json() : null)));
          const map = {};
          details.forEach(d => { if (d) map[d.id] = d; });
          setResources(map);
        }
        setLoading(false);
      });
  }, [user]);

  if (authLoading || !user) return null;

  const approved = claims.filter(c => c.status === 'approved');
  const pending = claims.filter(c => c.status === 'pending');
  const rejected = claims.filter(c => c.status === 'rejected');

  return (
    <>
      <Head>
        <title>My Resources — The Dental Commute</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT_BODY }}>
        <SiteNav />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 28px 100px' }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 14, fontWeight: 500 }}>Creator Dashboard</div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111', lineHeight: 1.1, margin: '0 0 8px', letterSpacing: -1, fontFamily: FONT_DISPLAY }}>
              My Resources
            </h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              Resources you&rsquo;ve claimed on The Dental Commute. Don&rsquo;t see yours?{' '}
              <span style={{ color: '#aaa' }}>Find it on the site and click &ldquo;Claim this page.&rdquo;</span>
            </p>
          </div>

          {loading && <div style={{ color: '#888', fontSize: 14 }}>Loading…</div>}

          {!loading && claims.length === 0 && (
            <div style={{ padding: '50px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: '#bbb', marginBottom: 16 }}>You haven&rsquo;t claimed any resources yet.</div>
              <Link href="/" style={{ fontSize: 13, color: GREEN, fontWeight: 500, textDecoration: 'none', border: `1px solid ${GREEN}`, padding: '8px 18px', borderRadius: 4 }}>
                Browse resources →
              </Link>
            </div>
          )}

          {approved.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Claimed</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {approved.map(c => {
                  const r = resources[c.resource_id];
                  return (
                    <Link key={c.id} href={`/creator/${c.resource_id}`} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 18px',
                      textDecoration: 'none', color: 'inherit',
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{r?.Name || c.resource_id}</span>
                      <span style={{ fontSize: 13, color: GREEN, fontWeight: 600 }}>Edit →</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Pending review</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {pending.map(c => (
                  <div key={c.id} style={{ background: '#fcf6e6', border: '1px solid #f2e4bf', borderRadius: 8, padding: '14px 18px', fontSize: 14, color: '#8a6d3b' }}>
                    ⏳ {resources[c.resource_id]?.Name || c.resource_id} — awaiting review
                  </div>
                ))}
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Needs more info</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {rejected.map(c => (
                  <div key={c.id} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', fontSize: 14, color: '#991b1b' }}>
                    {resources[c.resource_id]?.Name || c.resource_id} — we followed up by email; re-submit from the resource page once resolved.
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
