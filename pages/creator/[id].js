import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SiteNav from '../../components/SiteNav';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Factual corrections that touch the shared Airtable record — these go through
// review. The logo is NOT here: an owner's logo publishes instantly via
// resource_owner_content.logo_url (below), where it also outranks the listing's
// Image URL in the icon ladder.
const EDITABLE_FIELDS = [
  { key: 'Name', label: 'Name' },
  { key: 'URL', label: 'URL' },
  { key: 'Description', label: 'Description', multiline: true },
  { key: 'Host or Author', label: 'Host / Author' },
  { key: 'RSS Feed URL', label: 'RSS feed URL' },
];

function inp(extra = {}) {
  return { width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box', background: '#fff', ...extra };
}

function ScoreRow({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: value != null ? GREEN : '#ddd' }}>{value ?? '—'}</span>
      </div>
      <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2 }}>
        <div style={{ height: 3, width: value ? `${Math.min(value, 100)}%` : '0%', background: GREEN, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export default function CreatorEditor() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();

  const [claimStatus, setClaimStatus] = useState(undefined); // undefined = checking
  const [resource, setResource] = useState(null);
  const [fields, setFields] = useState({});
  const [pendingProposal, setPendingProposal] = useState(null);
  const [savingProposal, setSavingProposal] = useState(false);
  const [proposalSaved, setProposalSaved] = useState(false);

  const [ownerContent, setOwnerContent] = useState({ bio: '', vision: '', logo_url: '', featured_episode_ids: [] });
  const [episodes, setEpisodes] = useState([]);
  const [savingContent, setSavingContent] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  // Verify this user has an approved claim on this resource.
  useEffect(() => {
    if (!user || !id) return;
    supabase.from('resource_claims').select('status')
      .eq('user_id', user.id).eq('resource_id', id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setClaimStatus(data?.status || 'none'));
  }, [user, id]);

  // Load resource data + any pending edit proposal + owner content + episodes.
  useEffect(() => {
    if (claimStatus !== 'approved' || !id) return;
    fetch(`/api/creator/resource?id=${id}`).then(r => r.json()).then(d => {
      if (d.error) return;
      setResource(d);
      setFields({
        Name: d.Name, URL: d.URL, Description: d.Description,
        'Host or Author': d['Host or Author'], 'RSS Feed URL': d['RSS Feed URL'],
      });
    });

    supabase.from('resource_edit_proposals').select('id, changes, status, created_at')
      .eq('resource_id', id).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setPendingProposal(data || null));

    supabase.from('resource_owner_content').select('bio, vision, logo_url, featured_episode_ids')
      .eq('resource_id', id).maybeSingle()
      .then(({ data }) => { if (data) setOwnerContent({ bio: data.bio || '', vision: data.vision || '', logo_url: data.logo_url || '', featured_episode_ids: data.featured_episode_ids || [] }); });
  }, [claimStatus, id]);

  // Episode picker — only for podcasts.
  useEffect(() => {
    if (claimStatus !== 'approved' || !id || resource?.Type !== 'Podcast') return;
    supabase.from('episodes').select('id, title, image, published_at')
      .eq('show_resource_id', id).order('published_at', { ascending: false }).limit(30)
      .then(({ data }) => setEpisodes(data || []));
  }, [claimStatus, id, resource?.Type]);

  function updateField(key, val) { setFields(prev => ({ ...prev, [key]: val })); }

  async function submitProposal() {
    if (!resource) return;
    const changes = {};
    EDITABLE_FIELDS.forEach(({ key }) => {
      const oldVal = resource[key] || '';
      const newVal = (fields[key] || '').trim();
      if (newVal !== oldVal) changes[key] = { old: oldVal, new: newVal };
    });
    if (Object.keys(changes).length === 0) return;
    setSavingProposal(true);
    const { data, error } = await supabase.from('resource_edit_proposals')
      .insert({ user_id: user.id, resource_id: id, changes }).select().single();
    setSavingProposal(false);
    if (!error) { setPendingProposal(data); setProposalSaved(true); setTimeout(() => setProposalSaved(false), 3000); }
  }

  async function saveOwnerContent() {
    setSavingContent(true);
    const { error } = await supabase.from('resource_owner_content')
      .upsert({ resource_id: id, user_id: user.id, ...ownerContent, updated_at: new Date().toISOString() }, { onConflict: 'resource_id' });
    setSavingContent(false);
    if (!error) { setContentSaved(true); setTimeout(() => setContentSaved(false), 3000); }
  }

  function toggleEpisode(epId) {
    setOwnerContent(prev => {
      const has = prev.featured_episode_ids.includes(epId);
      const next = has ? prev.featured_episode_ids.filter(x => x !== epId) : [...prev.featured_episode_ids, epId];
      return { ...prev, featured_episode_ids: next.slice(0, 6) }; // cap at 6 featured
    });
  }

  if (authLoading || !user || claimStatus === undefined) return null;

  if (claimStatus !== 'approved') {
    return (
      <div style={{ background: '#f5f2eb', minHeight: '100vh', fontFamily: FONT }}>
        <SiteNav />
        <div style={{ maxWidth: 560, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 10 }}>
            {claimStatus === 'pending' ? 'Your claim is still pending review.' : 'You haven’t claimed this resource.'}
          </div>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
            {claimStatus === 'pending'
              ? 'Andrei reviews every claim personally — check back soon, or watch your email.'
              : 'Find it on the site and click "Claim this page" to get started.'}
          </p>
          <Link href={`/resource/${id}`} style={{ fontSize: 13, color: GREEN, fontWeight: 600, textDecoration: 'none' }}>← Back to the resource page</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Edit {resource?.Name || 'your resource'} — The Dental Commute</title><meta name="robots" content="noindex" /></Head>
      <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT }}>
        <SiteNav />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 100px' }}>
          <Link href={`/resource/${id}`} style={{ fontSize: 13, color: GREEN, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>← View public page</Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: '0 0 6px', fontFamily: FONT_DISPLAY }}>{resource?.Name}</h1>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>You&rsquo;re editing this as its claimed owner.</div>

          {/* ── Scoring transparency ── */}
          {resource && (
            <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 26px', marginBottom: 28 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4, fontFamily: FONT_DISPLAY }}>How your score works</div>
              <p style={{ fontSize: 12.5, color: '#888', lineHeight: 1.6, marginBottom: 18 }}>
                Your score is never affected by claiming or editing this listing — it&rsquo;s computed automatically from
                real, measurable signals, on the same terms as every other resource. Here&rsquo;s exactly how, and where
                you currently stand.
              </p>
              <div style={{ background: '#f7f7f5', borderRadius: 8, padding: '14px 16px', marginBottom: 18, fontSize: 12.5, color: '#555', lineHeight: 1.65 }}>
                <div style={{ marginBottom: 7 }}><strong style={{ color: GREEN }}>Recency (15%)</strong> — how fresh and active you are. Podcasts: days since your last episode + episodes in the last 90 days. YouTube: recent upload dates. Books: publication year.</div>
                <div style={{ marginBottom: 7 }}><strong style={{ color: GREEN }}>Popularity (20%)</strong> — audience size, compared only to resources of your same type (a podcast is never compared to a YouTube channel). YouTube: subscribers. Podcasts: back-catalog size. Books: ratings count.</div>
                <div style={{ marginBottom: 7 }}><strong style={{ color: GREEN }}>Community (25%)</strong> — engagement on this site: votes, comments, bookmarks, and pins. This grows as more dentists discover and engage with you.</div>
                <div style={{ marginBottom: 0 }}><strong style={{ color: GREEN }}>Expert (25%) &amp; Clinical Depth (15%)</strong> — judged by reading your actual recent content and researching your credentials, against a fixed rubric. The reasoning behind these two scores is below.</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginBottom: resource.scoreRationale ? 16 : 0 }}>
                <ScoreRow label="Expert" value={resource.scores.expert} />
                <ScoreRow label="Community" value={resource.scores.community} />
                <ScoreRow label="Popularity" value={resource.scores.popularity} />
                <ScoreRow label="Recency" value={resource.scores.recency} />
                <ScoreRow label="Clinical Depth" value={resource.scores.clinicalDepth} />
              </div>
              {resource.scoreRationale && (
                <div style={{ fontSize: 12.5, color: '#666', fontStyle: 'italic', borderTop: `1px solid ${BORDER}`, paddingTop: 12, lineHeight: 1.5 }}>
                  &ldquo;{resource.scoreRationale}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* ── Creator bio / vision / featured episodes (auto-publish) ── */}
          <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 26px', marginBottom: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4, fontFamily: FONT_DISPLAY }}>From the creator</div>
            <p style={{ fontSize: 12.5, color: '#888', lineHeight: 1.6, marginBottom: 16 }}>
              These publish immediately — shown clearly as your own words, separate from our editorial scoring.
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Logo / cover image</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              {ownerContent.logo_url
                ? <img src={ownerContent.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: `1px solid ${BORDER}`, flexShrink: 0, background: '#fafafa' }} />
                : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f0ede8', flexShrink: 0 }} />}
              <input value={ownerContent.logo_url} onChange={e => setOwnerContent(p => ({ ...p, logo_url: e.target.value.trim() }))}
                placeholder="https://…/your-logo.jpg" style={inp({ flex: 1 })} />
            </div>
            <div style={{ fontSize: 11.5, color: '#aaa', marginTop: -10, marginBottom: 16, lineHeight: 1.5 }}>
              Paste a direct image URL — it replaces the icon on your page instantly and takes priority over everything else.
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Short bio</label>
            <textarea value={ownerContent.bio} onChange={e => setOwnerContent(p => ({ ...p, bio: e.target.value.slice(0, 400) }))}
              placeholder="A sentence or two about you or the show…" style={{ ...inp(), minHeight: 70, resize: 'vertical', marginBottom: 16 }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Your vision for dentistry</label>
            <textarea value={ownerContent.vision} onChange={e => setOwnerContent(p => ({ ...p, vision: e.target.value.slice(0, 400) }))}
              placeholder="What are you trying to change or improve in the field?" style={{ ...inp(), minHeight: 70, resize: 'vertical', marginBottom: 20 }} />

            {resource?.Type === 'Podcast' && (
              <>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                  Featured episodes <span style={{ color: '#bbb', fontWeight: 400 }}>(up to 6)</span>
                </label>
                <div style={{ display: 'grid', gap: 6, marginBottom: 20, maxHeight: 300, overflowY: 'auto' }}>
                  {episodes.length === 0 && <div style={{ fontSize: 12, color: '#bbb' }}>No archived episodes yet.</div>}
                  {episodes.map(ep => {
                    const checked = ownerContent.featured_episode_ids.includes(ep.id);
                    return (
                      <label key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, background: checked ? '#E8F5F0' : '#fff', border: `1px solid ${checked ? GREEN : BORDER}`, cursor: 'pointer', fontSize: 12.5 }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleEpisode(ep.id)} disabled={!checked && ownerContent.featured_episode_ids.length >= 6} />
                        <span style={{ flex: 1, color: '#333' }}>{ep.title}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            <button onClick={saveOwnerContent} disabled={savingContent} style={{ padding: '10px 20px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: savingContent ? 'default' : 'pointer', fontFamily: FONT, opacity: savingContent ? 0.7 : 1 }}>
              {savingContent ? 'Saving…' : contentSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>

          {/* ── Factual corrections (review queue) ── */}
          <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 26px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4, fontFamily: FONT_DISPLAY }}>Correct the listing</div>
            <p style={{ fontSize: 12.5, color: '#888', lineHeight: 1.6, marginBottom: 16 }}>
              These go through a quick review before they go live, to keep the directory accurate.
            </p>

            {pendingProposal && (
              <div style={{ fontSize: 12.5, color: '#8a6d3b', background: '#fcf6e6', border: '1px solid #f2e4bf', borderRadius: 6, padding: '10px 12px', marginBottom: 16, lineHeight: 1.5 }}>
                ⏳ You have changes awaiting review, submitted {new Date(pendingProposal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
              </div>
            )}

            {EDITABLE_FIELDS.map(({ key, label, multiline }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{label}</label>
                {multiline
                  ? <textarea value={fields[key] || ''} onChange={e => updateField(key, e.target.value)} style={{ ...inp(), minHeight: 80, resize: 'vertical' }} />
                  : <input value={fields[key] || ''} onChange={e => updateField(key, e.target.value)} style={inp()} />}
              </div>
            ))}

            <button onClick={submitProposal} disabled={savingProposal} style={{ padding: '10px 20px', background: '#fff', color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: savingProposal ? 'default' : 'pointer', fontFamily: FONT, opacity: savingProposal ? 0.7 : 1 }}>
              {savingProposal ? 'Submitting…' : proposalSaved ? '✓ Submitted for review' : 'Submit for review'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
