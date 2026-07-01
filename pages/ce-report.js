import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

const GREEN = '#0F6E56';
const FONT = "'Inter', system-ui, -apple-system, sans-serif";

function fmt(secs) {
  if (!secs || isNaN(secs)) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toHours(secs) {
  if (!secs) return 0;
  return secs / 3600;
}

export default function CEReport() {
  const { user, profile, loading: authLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const printedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    supabase
      .from('listening_progress')
      .select(`
        id, duration_seconds, completed_at, listened_at,
        episodes ( id, title, show_name, duration_seconds, published_at )
      `)
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: true })
      .then(({ data }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, [user, authLoading]);

  // Auto-open print dialog once data is loaded
  useEffect(() => {
    if (!loading && rows.length > 0 && !printedRef.current) {
      printedRef.current = true;
      setTimeout(() => window.print(), 600);
    }
  }, [loading, rows]);

  const totalSeconds = rows.reduce((sum, r) => {
    return sum + (r.duration_seconds || r.episodes?.duration_seconds || 0);
  }, 0);
  const totalHours = toHours(totalSeconds);

  const displayName = profile?.full_name || user?.email || '';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const earliestDate = rows.length > 0 ? fmtDate(rows[0].completed_at) : null;
  const latestDate = rows.length > 0 ? fmtDate(rows[rows.length - 1].completed_at) : null;

  if (authLoading || loading) {
    return (
      <div style={{ fontFamily: FONT, padding: '80px 40px', textAlign: 'center', color: '#aaa' }}>
        Generating report…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ fontFamily: FONT, padding: '80px 40px', textAlign: 'center' }}>
        <p>Please <Link href="/" style={{ color: GREEN }}>sign in</Link> to view your CE report.</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ fontFamily: FONT, padding: '80px 40px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>No completed episodes yet. Start listening and mark episodes as listened to generate a CE report.</p>
        <Link href="/my-listening" style={{ color: GREEN, fontSize: 14 }}>← Back to My Listening</Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>CE Report — The Dental Commute</title>
        <meta name="robots" content="noindex" />
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; }
            @page {
              margin: 18mm 18mm 20mm 18mm;
              size: letter portrait;
            }
          }
          @media screen {
            body { background: #f5f2eb; }
          }
        `}</style>
      </Head>

      {/* Screen-only controls */}
      <div className="no-print" style={{
        background: 'rgba(245,242,235,0.97)', borderBottom: '1px solid #e8e8e8',
        padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 16,
        fontFamily: FONT, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/my-listening" style={{ fontSize: 13, color: '#777', textDecoration: 'none' }}>← My Listening</Link>
        <button
          onClick={() => window.print()}
          style={{ marginLeft: 'auto', fontSize: 13, padding: '8px 22px', borderRadius: 4, background: GREEN, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>
          Save as PDF / Print
        </button>
      </div>

      {/* Report document */}
      <div style={{
        maxWidth: 760, margin: '0 auto', padding: '48px 48px 64px',
        background: '#fff', fontFamily: FONT,
        minHeight: '100vh',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, paddingBottom: 24, borderBottom: '2px solid #111' }}>
          <div>
            <img src="/logo.png" alt="The Dental Commute" style={{ height: 144, width: 'auto', display: 'block', marginBottom: 16 }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>
              Continuing Education Activity Log
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              thedentalcommute.com
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, color: '#555', lineHeight: 1.8 }}>
            <div><strong>Generated:</strong> {today}</div>
            {earliestDate && latestDate && earliestDate !== latestDate && (
              <div><strong>Period:</strong> {earliestDate} – {latestDate}</div>
            )}
            {earliestDate && earliestDate === latestDate && (
              <div><strong>Date:</strong> {earliestDate}</div>
            )}
          </div>
        </div>

        {/* Participant info */}
        <div style={{ marginBottom: 28, padding: '16px 20px', background: '#f9f9f9', borderRadius: 6, border: '1px solid #e8e8e8' }}>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Participant</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{displayName}</div>
            </div>
            {profile?.specialty && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Specialty</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{profile.specialty}</div>
              </div>
            )}
            {profile?.role && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Role</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{profile.role}</div>
              </div>
            )}
            {profile?.province_state && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Province / State</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{profile.province_state}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Total CE Hours</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{totalHours.toFixed(1)} hrs</div>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Episodes Completed</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{rows.length}</div>
            </div>
          </div>
        </div>

        {/* Episodes table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #111' }}>
              <th style={{ textAlign: 'left', padding: '8px 8px 8px 0', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', width: 28 }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px 8px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>Podcast / Show</th>
              <th style={{ textAlign: 'left', padding: '8px 8px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>Episode Title</th>
              <th style={{ textAlign: 'center', padding: '8px 8px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', whiteSpace: 'nowrap' }}>Date Completed</th>
              <th style={{ textAlign: 'right', padding: '8px 0 8px 8px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', whiteSpace: 'nowrap' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const ep = row.episodes;
              const dur = row.duration_seconds || ep?.duration_seconds;
              const isEven = i % 2 === 0;
              return (
                <tr key={row.id} style={{ background: isEven ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 8px 10px 0', color: '#bbb', verticalAlign: 'top' }}>{i + 1}</td>
                  <td style={{ padding: '10px 8px', color: '#555', verticalAlign: 'top', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ep?.show_name || '—'}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#111', fontWeight: 500, verticalAlign: 'top', lineHeight: 1.4 }}>
                    {ep?.title || '—'}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#555', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {fmtDateShort(row.completed_at)}
                  </td>
                  <td style={{ padding: '10px 0 10px 8px', color: '#555', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {fmt(dur)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #111' }}>
              <td colSpan={3} style={{ padding: '12px 8px 12px 0', fontSize: 12, fontWeight: 700, color: '#111' }}>
                Total
              </td>
              <td />
              <td style={{ padding: '12px 0 12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: GREEN }}>
                {fmt(totalSeconds)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer note */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #e8e8e8', fontSize: 11, color: '#aaa', lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            This report was automatically generated by The Dental Commute based on episode listening activity recorded in your account.
            Duration is based on podcast episode length. This document is self-certified and intended to support your personal CE record-keeping.
            Please verify the CE requirements of your state dental board before submitting any documentation.
          </p>
        </div>

      </div>
    </>
  );
}
