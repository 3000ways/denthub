import { useState, useEffect, useCallback, useRef } from 'react';
import { AUDIENCES, BLOCK_META, blockAvailableFor, isRenamable, DISCOVER_DEFAULT_COUNTS, DISCOVER_KINDS, PERSONAL_DEFAULT_COUNTS, PERSONAL_KINDS } from '../../lib/home-layout';

const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const FONT = "'Inter', system-ui, -apple-system, sans-serif";

// Tabs are organized into labeled groups (rendered as sections in the top bar).
// To add a tab, drop it into the right group below — the nav and the content
// area are both driven off this one structure, so nothing else needs updating.
// `Component` references are function declarations defined later in this file
// (hoisted, so referencing them up here is fine).

const RESOURCE_TYPES = ['Podcast', 'YouTube Channel', 'Website', 'Book', 'Course', 'Software', 'Community', 'Other'];

const CATEGORIES = [
  'General Dentistry Podcasts','Endodontic Podcasts','Orthodontic Podcasts','Periodontic Podcasts',
  'Oral Surgery Podcasts','Pediatric Dentistry Podcasts','Prosthodontic Podcasts',
  'Dental Student Podcasts','Practice Management Podcasts','Dental Technology Podcasts',
  'General Dentistry YouTube','Endodontic YouTube','Orthodontic YouTube','Periodontic YouTube',
  'Oral Surgery YouTube','Dental Student YouTube',
  'Continuing Education Websites','Dental Books','Dental Communities',
  'Dental Forums','Dental Coaching','Mastermind Groups','Dental Software','Dental AI Tools',
  'Other',
];

const inp = (extra = {}) => ({
  width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 6,
  fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
  background: '#fff', ...extra,
});

function SourceBadge({ source }) {
  const isAI = source === 'AI Agent';
  const isUser = source === 'User Submission';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: isAI ? '#d1fae5' : isUser ? '#dbeafe' : '#f3f4f6',
      color: isAI ? '#065f46' : isUser ? '#1e40af' : '#6b7280',
      whiteSpace: 'nowrap',
    }}>
      {isAI ? '🤖 AI Agent' : isUser ? '👤 User' : '✏️ Manual'}
    </span>
  );
}

// ══════════════════════════════════════════
//  TAB 1 — Add Resource
// ══════════════════════════════════════════
function AddResource() {
  const [url, setUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [form, setForm] = useState({ Name: '', URL: '', Description: '', Type: 'Website', Category: '', 'Expert Score': '', 'Community Score': '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function detect() {
    if (!url.trim()) return;
    setDetecting(true); setError('');
    try {
      const r = await fetch('/api/admin/detect-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setForm(f => ({ ...f, URL: d.url, Name: d.name || f.Name, Description: d.description || f.Description, Type: d.type }));
    } catch (e) { setError('Detection failed'); }
    finally { setDetecting(false); }
  }

  async function save() {
    if (!form.Name || !form.URL) { setError('Name and URL are required'); return; }
    setSaving(true); setError('');
    try {
      const r = await fetch('/api/admin/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, Source: 'Manual' }) });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setSaved(true);
      setUrl(''); setForm({ Name: '', URL: '', Description: '', Type: 'Website', Category: '', 'Expert Score': '', 'Community Score': '' });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError('Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6 }}>Add a Resource</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Paste a URL and we'll auto-detect the type and pre-fill the form.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && detect()} placeholder="https://..." style={{ ...inp(), flex: 1, minWidth: 200 }} />
        <button onClick={detect} disabled={detecting || !url.trim()} style={{ padding: '9px 18px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: FONT, opacity: detecting ? 0.6 : 1, whiteSpace: 'nowrap' }}>
          {detecting ? 'Detecting…' : 'Auto-detect'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
          Name *
          <input value={form.Name} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="Resource name" />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
          URL *
          <input value={form.URL} onChange={e => setForm(f => ({ ...f, URL: e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="https://..." />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
          Description
          <textarea value={form.Description} onChange={e => setForm(f => ({ ...f, Description: e.target.value }))} rows={3} style={{ ...inp(), marginTop: 4, resize: 'vertical' }} placeholder="Brief description…" />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
          Type
          <select value={form.Type} onChange={e => setForm(f => ({ ...f, Type: e.target.value }))} style={{ ...inp(), marginTop: 4 }}>
            {RESOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
          Category
          <select value={form.Category} onChange={e => setForm(f => ({ ...f, Category: e.target.value }))} style={{ ...inp(), marginTop: 4 }}>
            <option value="">— select —</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
            Expert Score (0–10)
            <input type="number" min="0" max="10" step="0.1" value={form['Expert Score']} onChange={e => setForm(f => ({ ...f, 'Expert Score': e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="8.5" />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
            Community Score (0–10)
            <input type="number" min="0" max="10" step="0.1" value={form['Community Score']} onChange={e => setForm(f => ({ ...f, 'Community Score': e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="7.0" />
          </label>
        </div>
      </div>

      {error && <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>{error}</div>}
      {saved && <div style={{ marginTop: 12, padding: '8px 12px', background: '#d1fae5', color: '#065f46', borderRadius: 6, fontSize: 13 }}>✓ Resource saved to Airtable</div>}

      <button onClick={save} disabled={saving} style={{ marginTop: 20, width: '100%', padding: '13px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Save Resource'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB 2 — Review Queue
// ══════════════════════════════════════════
const VALID_SPECIALTIES = ['General Dentistry','Endodontics','Orthodontics','Periodontics','Oral Surgery','Prosthodontics','Pediatric Dentistry','Oral Radiology','Dental Anesthesiology','Pain'];
const VALID_TOPICS      = ['Clinical','Technology','Leadership','Marketing','Finance & Investment','Practice Growth','Team & HR','Wellness'];
const VALID_TYPES_RQ    = ['Podcast','YouTube','Book','Course','Software','Community','Coaching','Mastermind','Other'];

function TagToggle({ label, active, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${active ? GREEN : BORDER}`,
      background: active ? GREEN : '#fff', color: active ? '#fff' : '#555',
      cursor: 'pointer', fontFamily: FONT, fontWeight: active ? 600 : 400, transition: 'all 0.1s',
    }}>{label}</button>
  );
}

function QueueCardLogo({ imageUrl, siteUrl, name }) {
  const faviconUrl = (() => { try { return `/api/airtable?logo=${new URL(siteUrl).hostname}`; } catch { return null; } })();
  const [src, setSrc] = useState(imageUrl || faviconUrl);
  if (!src) return null;
  return (
    <img src={src} alt={name}
      onError={() => setSrc(prev => prev !== faviconUrl ? faviconUrl : null)}
      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: `1px solid ${BORDER}`, background: '#fafafa', flexShrink: 0 }} />
  );
}

const TYPE_MAP = {
  'YouTube Channel': 'YouTube', 'CE Website': 'Course', 'CE Platform': 'Course',
  'Website': 'Other', 'Consulting': 'Coaching', 'Consulting Firm': 'Coaching',
  'Mentor': 'Coaching', 'Mentorship': 'Coaching', 'Mastermind Group': 'Mastermind',
};
function normalizeType(raw) {
  const t = raw || 'Other';
  if (VALID_TYPES_RQ.includes(t)) return t;
  return TYPE_MAP[t] || 'Other';
}

function QueueCard({ item, onRemove }) {
  const f = item.fields;
  const [editing, setEditing] = useState(false);
  const [acting, setActing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    Name:               f.Name || '',
    URL:                f.URL || '',
    Description:        f.Description || '',
    Type:               normalizeType(f.Type),
    'Host or Author':   f['Host or Author'] || '',
    Specialty:          Array.isArray(f.Specialty) ? [...f.Specialty] : [],
    Topic:              Array.isArray(f.Topic) ? [...f.Topic] : [],
    'Expert Score':     f['Expert Score'] ?? '',
    'Community Score':  f['Community Score'] ?? '',
    'Popularity Score': f['Popularity Score'] ?? '',
    'Recency Score':    f['Recency Score'] ?? '',
    'Clinical Depth Score': f['Clinical Depth Score'] ?? '',
    'RSS Feed URL':     f['RSS Feed URL'] || '',
    'Image URL':        f['Image URL'] || '',
  });

  function toggleTag(field, val) {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }

  async function saveEdits() {
    setSaving(true); setSaveError('');
    try {
      const fields = {
        Name: form.Name,
        URL: form.URL,
        Description: form.Description,
        Type: form.Type,
        'Host or Author': form['Host or Author'],
        'RSS Feed URL': form['RSS Feed URL'],
        'Image URL': form['Image URL'],
        Specialty: form.Specialty,
        Topic: form.Topic,
        ...(form['Expert Score'] !== '' ? { 'Expert Score': Number(form['Expert Score']) } : {}),
        ...(form['Community Score'] !== '' ? { 'Community Score': Number(form['Community Score']) } : {}),
        ...(form['Popularity Score'] !== '' ? { 'Popularity Score': Number(form['Popularity Score']) } : {}),
        ...(form['Recency Score'] !== '' ? { 'Recency Score': Number(form['Recency Score']) } : {}),
        ...(form['Clinical Depth Score'] !== '' ? { 'Clinical Depth Score': Number(form['Clinical Depth Score']) } : {}),
      };
      const r = await fetch('/api/admin/resources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, fields }),
      });
      if (!r.ok) throw new Error(await r.text());
      setEditing(false);
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function act(action) {
    setActing(action);
    await fetch('/api/admin/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, action }) });
    onRemove(item.id);
  }

  const scores = [
    { key: 'Expert Score',          label: 'Expert' },
    { key: 'Community Score',       label: 'Community' },
    { key: 'Popularity Score',      label: 'Popularity' },
    { key: 'Recency Score',         label: 'Recency' },
    { key: 'Clinical Depth Score',  label: 'Clinical' },
  ];

  return (
    <div style={{ border: `1px solid ${editing ? GREEN : BORDER}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 14px' }}>

        {editing ? (
          /* ── EDIT MODE ── */
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Editing</div>
              <button onClick={() => { setEditing(false); setSaveError(''); }} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>✕ Cancel</button>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              Name
              <input value={form.Name} onChange={e => setForm(p => ({ ...p, Name: e.target.value }))} style={{ ...inp(), marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              URL
              <input value={form.URL} onChange={e => setForm(p => ({ ...p, URL: e.target.value }))} style={{ ...inp(), marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              Host / Author
              <input value={form['Host or Author']} onChange={e => setForm(p => ({ ...p, 'Host or Author': e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="Name of host, author, or creator" />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              RSS Feed URL
              <input value={form['RSS Feed URL']} onChange={e => setForm(p => ({ ...p, 'RSS Feed URL': e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="https://feeds.example.com/podcast" />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              Image URL
              <input value={form['Image URL']} onChange={e => setForm(p => ({ ...p, 'Image URL': e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="https://example.com/cover.jpg" />
              {form['Image URL'] && <img src={form['Image URL']} alt="" onError={e => e.target.style.display='none'} style={{ marginTop: 8, width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: `1px solid ${BORDER}` }} />}
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              Description
              <textarea value={form.Description} onChange={e => setForm(p => ({ ...p, Description: e.target.value }))} rows={4} style={{ ...inp(), marginTop: 4, resize: 'vertical' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              Type
              <select value={form.Type} onChange={e => setForm(p => ({ ...p, Type: e.target.value }))} style={{ ...inp(), marginTop: 4 }}>
                {VALID_TYPES_RQ.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Specialty</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VALID_SPECIALTIES.map(s => (
                  <TagToggle key={s} label={s} active={form.Specialty.includes(s)} onToggle={() => toggleTag('Specialty', s)} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Topic</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VALID_TOPICS.map(t => (
                  <TagToggle key={t} label={t} active={form.Topic.includes(t)} onToggle={() => toggleTag('Topic', t)} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Scores (0–100)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {scores.map(({ key, label }) => (
                  <label key={key} style={{ fontSize: 12, color: '#666' }}>
                    {label}
                    <input type="number" min="0" max="100" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={{ ...inp({ fontSize: 13, marginTop: 3, padding: '7px 10px' }) }} placeholder="—" />
                  </label>
                ))}
              </div>
            </div>

            {saveError && <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 12 }}>{saveError}</div>}
            <button onClick={saveEdits} disabled={saving} style={{ width: '100%', padding: '12px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: FONT, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : '✓ Save changes'}
            </button>
          </div>
        ) : (
          /* ── VIEW MODE ── */
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <QueueCardLogo imageUrl={form['Image URL']} siteUrl={form.URL} name={form.Name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 5 }}>{form.Name || '(untitled)'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <SourceBadge source={f.Source} />
                  {form.Type && <span style={{ fontSize: 11, color: '#fff', background: '#6b7280', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{form.Type}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {f['Final Score'] != null && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: GREEN, padding: '3px 10px', borderRadius: 20 }}>★ {Number(f['Final Score']).toFixed(1)}</span>
                )}
                <button onClick={() => setEditing(true)} style={{ fontSize: 12, padding: '5px 12px', background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontFamily: FONT }}>Edit</button>
              </div>
            </div>

            {/* Author */}
            {form['Host or Author'] && (
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
                <span style={{ color: '#999', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>By </span>
                {form['Host or Author']}
              </div>
            )}

            {/* URL */}
            <a href={form.URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: GREEN, marginBottom: form['RSS Feed URL'] ? 4 : 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textDecoration: 'none' }}>{form.URL}</a>

            {/* RSS Feed URL */}
            {form['RSS Feed URL'] && (
              <div style={{ fontSize: 11, color: '#888', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RSS </span>
                <a href={form['RSS Feed URL']} target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'none' }}>{form['RSS Feed URL']}</a>
              </div>
            )}

            {/* Description */}
            {form.Description && <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 10 }}>{form.Description}</div>}

            {/* Specialty tags */}
            {form.Specialty?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Specialty</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {form.Specialty.map(s => <span key={s} style={{ fontSize: 11, background: '#e8f5f0', color: GREEN, padding: '3px 9px', borderRadius: 20, fontWeight: 600 }}>{s}</span>)}
                </div>
              </div>
            )}

            {/* Topic tags */}
            {form.Topic?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Topic</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {form.Topic.map(t => <span key={t} style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '3px 9px', borderRadius: 20, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
            )}

            {/* Scores */}
            {scores.some(({ key }) => form[key] !== '') && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {scores.filter(({ key }) => form[key] !== '' && form[key] != null).map(({ key, label }) => (
                  <span key={key} style={{ fontSize: 11, color: '#333', background: '#f0f0f0', padding: '3px 9px', borderRadius: 20, fontWeight: 500 }}>
                    {label} <strong>{Number(form[key]).toFixed(0)}</strong>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {!editing && (
        <div style={{ display: 'flex', borderTop: `1px solid ${BORDER}` }}>
          <button onClick={() => act('approve')} disabled={!!acting}
            style={{ flex: 1, padding: '13px', background: acting === 'approve' ? '#a7f3d0' : '#f0fdf4', color: '#065f46', border: 'none', borderRight: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: FONT }}>
            {acting === 'approve' ? '…' : '✓ Approve'}
          </button>
          <button onClick={() => act('reject')} disabled={!!acting}
            style={{ flex: 1, padding: '13px', background: acting === 'reject' ? '#fecaca' : '#fff5f5', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: FONT }}>
            {acting === 'reject' ? '…' : '✕ Reject'}
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/submissions');
      setItems(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function approveAll() {
    if (!items.length) return;
    setApproving(true);
    try {
      await fetch('/api/admin/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approveAll: true }) });
      setItems([]);
    } finally { setApproving(false); }
  }

  if (loading) return <div style={{ color: '#888', fontSize: 14 }}>Loading…</div>;
  if (!items.length) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#555' }}>Queue is empty</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>No pending submissions right now.</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>Review Queue</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888' }}>{items.length} pending</span>
          <button onClick={approveAll} disabled={approving} style={{
            padding: '7px 16px', background: approving ? '#a7f3d0' : '#059669', color: '#fff',
            border: 'none', borderRadius: 7, cursor: approving ? 'default' : 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: FONT,
          }}>
            {approving ? '…Publishing all' : `✓ Publish all (${items.length})`}
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map(item => (
          <QueueCard key={item.id} item={item} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB 3 — All Resources
// ══════════════════════════════════════════
const SORT_COLS = [
  { key: 'added',     label: 'Recently Added', fn: (a, b) => b.createdTime?.localeCompare(a.createdTime) },
  { key: 'name',      label: 'Name A–Z',       fn: (a, b) => (a.fields.Name || '').localeCompare(b.fields.Name || '') },
  { key: 'score',     label: 'Highest Score',  fn: (a, b) => (b.fields['Final Score'] || 0) - (a.fields['Final Score'] || 0) },
  { key: 'type',      label: 'Type',           fn: (a, b) => (a.fields.Type || '').localeCompare(b.fields.Type || '') },
  { key: 'status',    label: 'Status',         fn: (a, b) => (a.fields.Status || '').localeCompare(b.fields.Status || '') },
];

const VALID_STATUSES = ['Published', 'Draft', 'Archived'];

function ResourceCard({ item, onDelete }) {
  const f = item.fields;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    Name:               f.Name || '',
    URL:                f.URL || '',
    Description:        f.Description || '',
    Type:               normalizeType(f.Type),
    'Host or Author':   f['Host or Author'] || '',
    Specialty:          Array.isArray(f.Specialty) ? [...f.Specialty] : [],
    Topic:              Array.isArray(f.Topic) ? [...f.Topic] : [],
    'Expert Score':     f['Expert Score'] ?? '',
    'Community Score':  f['Community Score'] ?? '',
    'Popularity Score': f['Popularity Score'] ?? '',
    'Recency Score':    f['Recency Score'] ?? '',
    'Clinical Depth Score': f['Clinical Depth Score'] ?? '',
    'RSS Feed URL':     f['RSS Feed URL'] || '',
    'Image URL':        f['Image URL'] || '',
    Status:             f.Status || 'Published',
  });

  function toggleTag(field, val) {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }

  async function saveEdits() {
    setSaving(true); setSaveError('');
    try {
      const fields = {
        Name: form.Name, URL: form.URL, Description: form.Description,
        Type: form.Type, 'Host or Author': form['Host or Author'],
        'RSS Feed URL': form['RSS Feed URL'], 'Image URL': form['Image URL'],
        Specialty: form.Specialty, Topic: form.Topic, Status: form.Status,
        ...(form['Expert Score'] !== '' ? { 'Expert Score': Number(form['Expert Score']) } : {}),
        ...(form['Community Score'] !== '' ? { 'Community Score': Number(form['Community Score']) } : {}),
        ...(form['Popularity Score'] !== '' ? { 'Popularity Score': Number(form['Popularity Score']) } : {}),
        ...(form['Recency Score'] !== '' ? { 'Recency Score': Number(form['Recency Score']) } : {}),
        ...(form['Clinical Depth Score'] !== '' ? { 'Clinical Depth Score': Number(form['Clinical Depth Score']) } : {}),
      };
      const r = await fetch('/api/admin/resources', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, fields }),
      });
      if (!r.ok) throw new Error(await r.text());
      setEditing(false);
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${form.Name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/resources?id=${item.id}`, { method: 'DELETE' });
    onDelete(item.id);
  }

  const scores = [
    { key: 'Expert Score', label: 'Expert' }, { key: 'Community Score', label: 'Community' },
    { key: 'Popularity Score', label: 'Popularity' }, { key: 'Recency Score', label: 'Recency' },
    { key: 'Clinical Depth Score', label: 'Clinical' },
  ];

  return (
    <div style={{ border: `1px solid ${editing ? GREEN : BORDER}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 14px' }}>
        {editing ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Editing</div>
              <button onClick={() => { setEditing(false); setSaveError(''); }} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>✕ Cancel</button>
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Name<input value={form.Name} onChange={e => setForm(p => ({ ...p, Name: e.target.value }))} style={{ ...inp(), marginTop: 4 }} /></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>URL<input value={form.URL} onChange={e => setForm(p => ({ ...p, URL: e.target.value }))} style={{ ...inp(), marginTop: 4 }} /></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Host / Author<input value={form['Host or Author']} onChange={e => setForm(p => ({ ...p, 'Host or Author': e.target.value }))} style={{ ...inp(), marginTop: 4 }} /></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>RSS Feed URL<input value={form['RSS Feed URL']} onChange={e => setForm(p => ({ ...p, 'RSS Feed URL': e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="https://feeds.example.com/podcast" /></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
              Image URL
              <input value={form['Image URL']} onChange={e => setForm(p => ({ ...p, 'Image URL': e.target.value }))} style={{ ...inp(), marginTop: 4 }} placeholder="https://example.com/cover.jpg" />
              {form['Image URL'] && <img src={form['Image URL']} alt="" onError={e => e.target.style.display='none'} style={{ marginTop: 8, width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: `1px solid ${BORDER}` }} />}
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Description<textarea value={form.Description} onChange={e => setForm(p => ({ ...p, Description: e.target.value }))} rows={4} style={{ ...inp(), marginTop: 4, resize: 'vertical' }} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                Type
                <select value={form.Type} onChange={e => setForm(p => ({ ...p, Type: e.target.value }))} style={{ ...inp(), marginTop: 4 }}>
                  {VALID_TYPES_RQ.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                Status
                <select value={form.Status} onChange={e => setForm(p => ({ ...p, Status: e.target.value }))} style={{ ...inp(), marginTop: 4 }}>
                  {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Specialty</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VALID_SPECIALTIES.map(s => <TagToggle key={s} label={s} active={form.Specialty.includes(s)} onToggle={() => toggleTag('Specialty', s)} />)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Topic</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VALID_TOPICS.map(t => <TagToggle key={t} label={t} active={form.Topic.includes(t)} onToggle={() => toggleTag('Topic', t)} />)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Scores (0–100)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {scores.map(({ key, label }) => (
                  <label key={key} style={{ fontSize: 12, color: '#666' }}>
                    {label}
                    <input type="number" min="0" max="100" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={{ ...inp({ fontSize: 13, marginTop: 3, padding: '7px 10px' }) }} placeholder="—" />
                  </label>
                ))}
              </div>
            </div>
            {saveError && <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 12 }}>{saveError}</div>}
            <button onClick={saveEdits} disabled={saving} style={{ width: '100%', padding: '12px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: FONT, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : '✓ Save changes'}
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', padding: '10px', background: '#fef2f2', color: '#dc2626', border: `1px solid #fecaca`, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
              {deleting ? 'Deleting…' : '✕ Delete this resource'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <QueueCardLogo imageUrl={form['Image URL']} siteUrl={form.URL} name={form.Name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 5 }}>{form.Name || '(untitled)'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <SourceBadge source={f.Source} />
                  {form.Type && <span style={{ fontSize: 11, color: '#fff', background: '#6b7280', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{form.Type}</span>}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: form.Status === 'Published' ? '#d1fae5' : '#fef3c7', color: form.Status === 'Published' ? '#065f46' : '#92400e' }}>{form.Status || 'Draft'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {f['Final Score'] != null && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: GREEN, padding: '3px 10px', borderRadius: 20 }}>★ {Number(f['Final Score']).toFixed(1)}</span>
                )}
                <button onClick={() => setEditing(true)} style={{ fontSize: 12, padding: '5px 12px', background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontFamily: FONT }}>Edit</button>
              </div>
            </div>
            {form['Host or Author'] && (
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
                <span style={{ color: '#999', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>By </span>{form['Host or Author']}
              </div>
            )}
            <a href={form.URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: GREEN, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textDecoration: 'none' }}>{form.URL}</a>
            {form.Description && <div style={{ fontSize: 13, color: '#444', lineHeight: 1.55, marginBottom: 10 }}>{form.Description}</div>}
            {form.Specialty?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Specialty</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {form.Specialty.map(s => <span key={s} style={{ fontSize: 11, background: '#e8f5f0', color: GREEN, padding: '3px 9px', borderRadius: 20, fontWeight: 600 }}>{s}</span>)}
                </div>
              </div>
            )}
            {form.Topic?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Topic</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {form.Topic.map(t => <span key={t} style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '3px 9px', borderRadius: 20, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
            )}
            {scores.some(({ key }) => form[key] !== '' && form[key] != null) && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {scores.filter(({ key }) => form[key] !== '' && form[key] != null).map(({ key, label }) => (
                  <span key={key} style={{ fontSize: 11, color: '#333', background: '#f0f0f0', padding: '3px 9px', borderRadius: 20, fontWeight: 500 }}>
                    {label} <strong>{Number(form[key]).toFixed(0)}</strong>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AllResources() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('added');
  const [sortAsc, setSortAsc] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/resources');
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const sortFn = SORT_COLS.find(c => c.key === sortKey)?.fn || SORT_COLS[0].fn;
  const filtered = items
    .filter(i => {
      const q = search.toLowerCase();
      return !q || (i.fields.Name || '').toLowerCase().includes(q) || (i.fields.Type || '').toLowerCase().includes(q) || (i.fields.Source || '').toLowerCase().includes(q);
    })
    .sort((a, b) => sortAsc ? sortFn(b, a) : sortFn(a, b));

  if (loading) return <div style={{ color: '#888', fontSize: 14 }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>All Resources</h2>
        <span style={{ fontSize: 13, color: '#888' }}>{items.length} total</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, type…" style={{ ...inp(), flex: 1, minWidth: 160 }} />
        <select value={sortKey} onChange={e => setSortKey(e.target.value)} style={{ ...inp({ width: 'auto', flex: '0 0 auto', fontSize: 12 }) }}>
          {SORT_COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map(item => (
          <ResourceCard key={item.id} item={item} onDelete={id => setItems(prev => prev.filter(i => i.id !== id))} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB 4 — Run Research
// ══════════════════════════════════════════
function timeAgo(iso) {
  if (!iso) return null;
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  const m = s / 60; if (m < 60) return `${Math.round(m)} min ago`;
  const h = m / 60; if (h < 24) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'} ago`;
  const d = h / 24; if (d < 30) return `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'} ago`;
  return `${Math.round(d / 30)} month${Math.round(d / 30) === 1 ? '' : 's'} ago`;
}

const FLAG_STYLE = {
  never: { bg: '#fee2e2', color: '#991b1b', label: 'Never' },
  thin:  { bg: '#fef3c7', color: '#92400e', label: 'Thin' },
  stale: { bg: '#fef3c7', color: '#92400e', label: 'Stale' },
  good:  { bg: '#d1fae5', color: '#065f46', label: 'Good' },
};

function RunResearch() {
  const [planMap, setPlanMap] = useState({});      // group → [labels]
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: '', completed: 0, total: 0 });
  const [counters, setCounters] = useState({ added: 0, duplicates: 0, dead_links: 0, directories: 0 });
  const [feed, setFeed] = useState([]);

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/research-status');
      const d = await r.json();
      if (!d.error) setStatus(d);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/research');
        const d = await r.json();
        if (d.groups) {
          const map = {};
          d.groups.forEach(g => { map[g.group] = g.subcategories; });
          setPlanMap(map);
          setGroups(d.groups.map(g => g.group));
          setGroup(g => g || d.groups[0]?.group || '');
        }
      } catch { /* non-fatal */ }
    })();
    loadStatus();
  }, [loadStatus]);

  async function run() {
    if (!group) return;
    const labels = planMap[group] || [];
    const total = labels.length;
    if (!total) return;
    setRunning(true); setError(''); setNoKey(false); setFeed([]);
    setCounters({ added: 0, duplicates: 0, dead_links: 0, directories: 0 });
    setProgress({ current: labels[0], completed: 0, total });
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      for (let index = 0; index < total; index++) {
        setProgress({ current: labels[index], completed: index, total });
        let d;
        try {
          const r = await fetch('/api/admin/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group, index, batchId }) });
          d = await r.json();
        } catch (e) {
          setFeed(f => [{ kind: 'error', name: labels[index], detail: 'network error — skipped' }, ...f]);
          continue;
        }
        if (d.status === 'no_ai_key') { setNoKey(true); break; }
        if (d.error) {
          setFeed(f => [{ kind: 'error', name: labels[index], detail: d.error }, ...f]);
          continue;
        }
        setCounters(c => ({
          added: c.added + (d.added || 0),
          duplicates: c.duplicates + (d.counts?.duplicates || 0),
          dead_links: c.dead_links + (d.counts?.dead_links || 0),
          directories: c.directories + (d.counts?.directories || 0),
        }));
        setFeed(f => [
          ...(d.found || []).map(x => ({ kind: 'added', name: x.Name, detail: x.hasRss ? 'queued · RSS captured' : 'queued' })),
          ...(d.skipped || []).slice(0, 3).map(s => ({ kind: 'skip', name: s.name, detail: s.reason })),
          ...f,
        ].slice(0, 60));
        setProgress({ current: labels[index], completed: index + 1, total });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
      setProgress(p => ({ ...p, current: '' }));
      loadStatus();
    }
  }

  const pct = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const lb = status?.lastBatch;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>AI Research Agent</h2>
        <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 500 }}>Check Perplexity credits ↗</a>
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Pick a resource type; the agent cycles through its subcategories, finds new resources, and drops them in the Review Queue as <strong>🤖 AI Agent / Pending</strong>. Scores and tags are handled by the scoring and episode-tagging agents after you approve.</p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', flex: '1 1 200px' }}>
          Research
          <select value={group} onChange={e => setGroup(e.target.value)} disabled={running} style={{ ...inp(), marginTop: 4 }}>
            {groups.map(g => <option key={g} value={g}>{g} — {(planMap[g] || []).length} subcategories</option>)}
          </select>
        </label>
        <button onClick={run} disabled={running || !group} style={{ padding: '11px 20px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: running ? 'default' : 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: running ? 0.6 : 1, whiteSpace: 'nowrap' }}>
          {running ? '🤖 Researching…' : '▶ Run research'}
        </button>
      </div>

      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>{error}</div>}
      {noKey && <div style={{ marginBottom: 12, padding: '16px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}><strong>No AI key configured.</strong> Add PERPLEXITY_API_KEY to Vercel environment variables to enable AI research.</div>}

      {/* Live run panel */}
      {(running || feed.length > 0) && (
        <div style={{ border: `1px solid ${running ? GREEN : BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, fontWeight: 600, color: '#111' }}>
            {running
              ? <><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: GREEN }} />Searching {progress.current}<span style={{ color: '#aaa', fontWeight: 400 }}>· {Math.min(progress.completed + 1, progress.total)} of {progress.total}</span></>
              : <>Last search complete<span style={{ color: '#aaa', fontWeight: 400 }}>· {progress.total} subcategories</span></>}
          </div>
          <div style={{ height: 6, background: '#f1f1f1', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: GREEN, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: feed.length ? 14 : 0 }}>
            {[
              { k: 'added', label: 'Added', color: '#065f46', bg: '#d1fae5' },
              { k: 'duplicates', label: 'Duplicates', color: '#555', bg: '#f6f6f6' },
              { k: 'dead_links', label: 'Dead links', color: '#555', bg: '#f6f6f6' },
              { k: 'directories', label: 'Directories', color: '#555', bg: '#f6f6f6' },
            ].map(c => (
              <div key={c.k} style={{ background: c.bg, borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 11, color: c.color }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{counters[c.k]}</div>
              </div>
            ))}
          </div>
          {feed.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {feed.map((f, i) => (
                <div key={i} style={{ fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'baseline', color: f.kind === 'added' ? '#111' : '#999' }}>
                  <span style={{ color: f.kind === 'added' ? '#059669' : f.kind === 'error' ? '#dc2626' : '#ccc', flexShrink: 0 }}>{f.kind === 'added' ? '✓' : '✕'}</span>
                  <span style={{ fontWeight: f.kind === 'added' ? 600 : 400 }}>{f.name}</span>
                  <span style={{ color: '#bbb' }}>{f.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last-run summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
        <div style={{ background: '#f7f7f5', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: '#888' }}>Last run</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111', marginTop: 2 }}>{status?.lastRun ? timeAgo(status.lastRun.ran_at) : '—'}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{lb ? `${lb.group} · ${lb.subcategories} subcategories` : 'no runs yet'}</div>
        </div>
        <div style={{ background: '#f7f7f5', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: '#888' }}>Found last run</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111', marginTop: 2 }}>{lb ? `${lb.added} queued` : '—'}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{lb ? `${lb.duplicates} dupes · ${lb.dead_links} dead links` : ''}</div>
        </div>
        <div style={{ background: status?.pendingTotal ? '#fef3c7' : '#f7f7f5', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: status?.pendingTotal ? '#92400e' : '#888' }}>Waiting on you</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: status?.pendingTotal ? '#92400e' : '#111', marginTop: 2 }}>{status ? `${status.pendingTotal} to review` : '—'}</div>
          <div style={{ fontSize: 11, color: status?.pendingTotal ? '#b45309' : '#aaa', marginTop: 2 }}>in the Review Queue</div>
        </div>
      </div>

      {/* Coverage — where to research next */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 2 }}>Where to research next</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Thinnest and stalest niches first. Counts are live resources by type and specialty.</div>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr .7fr .8fr 1.1fr', gap: 8, padding: '8px 14px', background: '#f7f7f5', fontSize: 11, color: '#888', fontWeight: 600 }}>
          <span>Subcategory</span><span>Live</span><span>Pending</span><span>Last researched</span>
        </div>
        {(status?.coverage || []).map((c, i) => {
          const fs = FLAG_STYLE[c.flag] || FLAG_STYLE.good;
          return (
            <div key={c.label} style={{ display: 'grid', gridTemplateColumns: '2.2fr .7fr .8fr 1.1fr', gap: 8, padding: '9px 14px', borderTop: `1px solid ${BORDER}`, fontSize: 12.5, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, background: fs.bg, color: fs.color, padding: '2px 7px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>{fs.label}</span>
                <span style={{ color: '#333' }}>{c.label}</span>
              </span>
              <span style={{ color: '#333' }}>{c.live}</span>
              <span style={{ color: c.pending ? '#b45309' : '#ccc' }}>{c.pending || 0}</span>
              <span style={{ color: '#999' }}>{c.lastResearched ? timeAgo(c.lastResearched) : '—'}</span>
            </div>
          );
        })}
        {!status && <div style={{ padding: '14px', fontSize: 12, color: '#aaa' }}>Loading coverage…</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB 10 — Scoring (automated ranking engine)
// ══════════════════════════════════════════
function ScoringTab() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [judging, setJudging] = useState(false);
  const [judgeResult, setJudgeResult] = useState(null);

  async function loadStatus() {
    try { const r = await fetch('/api/admin/scoring-status'); const d = await r.json(); if (!d.error) setStatus(d); } catch { /* ignore */ }
  }
  useEffect(() => { loadStatus(); }, []);

  function ago(iso) {
    if (!iso) return 'never';
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  async function run(preview) {
    setBusy(true); setError(''); setResult(null);
    try {
      const r = await fetch(`/api/cron/recompute-scores${preview ? '?preview=1' : ''}`);
      const d = await r.json();
      if (d.error) setError(d.error); else { setResult({ ...d, previewed: preview }); if (!preview) loadStatus(); }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function runJudge() {
    setJudging(true); setError(''); setJudgeResult(null);
    try {
      const r = await fetch('/api/cron/judge-scores');
      const d = await r.json();
      if (d.error) setError(d.error); else { setJudgeResult(d); loadStatus(); }
    } catch (e) { setError(e.message); }
    finally { setJudging(false); }
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Score Resources</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 1.6 }}>
        Every ranking score is computed from <strong>real, measurable signals</strong> instead of being guessed — then
        written back to Airtable, where the <strong>Final Score</strong> formula recombines them
        (Expert&nbsp;25% + Community&nbsp;25% + Popularity&nbsp;20% + Recency&nbsp;15% + Clinical&nbsp;Depth&nbsp;15%).
        It runs on its own <strong>weekly</strong>; the buttons below run it now.
      </p>

      <div style={{ background: '#f7f7f5', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 12.5, color: '#555', lineHeight: 1.65 }}>
        <div style={{ fontWeight: 700, color: '#333', marginBottom: 8 }}>How each score is computed</div>
        <div style={{ marginBottom: 7 }}><strong style={{ color: GREEN }}>Recency</strong> — how fresh and active the resource is. Podcasts: days since the last episode + how many episodes in the last 90 days (from our archive). YouTube: recent upload dates. Books: publication year (gentle decay — a classic doesn&rsquo;t go stale like a dormant podcast).</div>
        <div style={{ marginBottom: 7 }}><strong style={{ color: GREEN }}>Popularity</strong> — audience size. YouTube: subscriber count. Podcasts: back-catalog size as a reach proxy (no public listener count exists, so this is the weakest signal and is heavily damped). Books: ratings count.</div>
        <div style={{ marginBottom: 7 }}><strong style={{ color: GREEN }}>Community</strong> — engagement on <em>this</em> site: votes, comments, bookmarks, and pins. Near-neutral until dentists start engaging, then it sharpens on its own.</div>
        <div style={{ marginBottom: 10 }}><strong style={{ color: GREEN }}>Expert &amp; Clinical Depth</strong> — an AI judge reads the resource&rsquo;s actual recent content (episode/video titles) and web-searches the host&rsquo;s credentials, scores both against a fixed rubric, and must cite its evidence (saved to the <em>Score Rationale</em> field). It runs a rotating batch daily so the whole catalogue gets judged and refreshed over time.</div>
        <div style={{ paddingTop: 8, borderTop: `1px solid ${BORDER}`, color: '#777' }}>
          <strong>Two fairness rules:</strong> each resource is ranked by <em>percentile against its own type</em> (a podcast vs. podcasts, a channel vs. channels — never on the same absolute axis), and thin data is pulled toward a neutral 50 (<em>Bayesian shrinkage</em>) so a brand-new resource with a handful of data points can&rsquo;t rocket to the top. Types we can&rsquo;t measure (coaching, software, communities…) get a neutral 50 for Recency &amp; Popularity rather than a fabricated number.
        </div>
      </div>

      {/* Last-run status — check weekly whether the system ran */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 4 }}>Data scores · last run</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: status?.dataRun ? '#111' : '#bbb' }}>{status ? ago(status.dataRun?.ran_at) : '…'}</div>
          {status?.dataRun?.summary && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>wrote {status.dataRun.summary.written} · {status.dataRun.summary.recencyScored} rec · {status.dataRun.summary.popularityScored} pop</div>}
        </div>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 4 }}>AI judge · last run</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: status?.judgeRun ? '#111' : '#bbb' }}>{status ? ago(status.judgeRun?.ran_at) : '…'}</div>
          {status?.judgeRun?.summary && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>judged {status.judgeRun.summary.judged} · {status.judgeRun.summary.neverJudgedRemaining} left to reach</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button onClick={() => run(true)} disabled={busy} style={{ flex: 1, padding: '12px', background: '#fff', color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 6, cursor: busy ? 'default' : 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : 'Preview (no write)'}
        </button>
        <button onClick={() => run(false)} disabled={busy} style={{ flex: 1, padding: '12px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'default' : 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Recomputing…' : '↻ Recompute data scores'}
        </button>
      </div>

      <button onClick={runJudge} disabled={judging} style={{ width: '100%', padding: '12px', background: '#fff', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 6, cursor: judging ? 'default' : 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: judging ? 0.6 : 1, marginBottom: 20 }}>
        {judging ? '🤖 Judging… (~30s)' : '🤖 Run AI judge (next batch)'}
      </button>

      {judgeResult && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ padding: '12px 16px', background: '#f3e8ff', borderRadius: 8, fontSize: 13, color: '#6b21a8', marginBottom: 12 }}>
            ✓ Judged {judgeResult.judged} of {judgeResult.attempted} · {judgeResult.neverJudgedRemaining} still never-judged (of {judgeResult.totalPublished} published)
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {(judgeResult.sample || []).map((s, i) => (
              <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '9px 12px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#111', fontWeight: 500 }}>{s.name} <span style={{ color: '#bbb', fontSize: 11 }}>{s.type}</span></span>
                  <span style={{ color: '#7c3aed', fontSize: 12 }}>expert {s.expert} · clinical {s.clinical}</span>
                </div>
                {s.rationale && <div style={{ fontSize: 11.5, color: '#888', marginTop: 3, lineHeight: 1.4 }}>{s.rationale}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>{error}</div>}

      {result && (
        <div>
          <div style={{ padding: '12px 16px', background: '#d1fae5', borderRadius: 8, fontSize: 13, color: '#065f46', marginBottom: 16 }}>
            {result.previewed ? 'Previewed' : `✓ Wrote ${result.written} updates`} · {result.resources} resources ·
            {' '}{result.recencyScored} recency · {result.popularityScored} popularity · {result.communityScored} community
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Top by popularity (sample):</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {(result.sample || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                <span style={{ color: '#111' }}>{s.name} <span style={{ color: '#bbb', fontSize: 11 }}>{s.type}</span></span>
                <span style={{ color: '#666', fontSize: 12 }}>pop {s.popularity} · rec {s.recency} · com {s.community}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB 11 — Claims (Claim Your Profile review queue)
// ══════════════════════════════════════════
function ClaimsTab() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null); // claim id currently being approved/rejected
  const [mailtoFor, setMailtoFor] = useState(null); // { claimId, href, label }
  const [showInvite, setShowInvite] = useState(false);
  const [resources, setResources] = useState([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePicked, setInvitePicked] = useState(null);

  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [actingProposal, setActingProposal] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/claims');
      const d = await r.json();
      setClaims(Array.isArray(d.claims) ? d.claims : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function loadProposals() {
    setProposalsLoading(true);
    try {
      const r = await fetch('/api/admin/edit-proposals');
      const d = await r.json();
      setProposals(Array.isArray(d.proposals) ? d.proposals : []);
    } finally { setProposalsLoading(false); }
  }
  useEffect(() => { loadProposals(); }, []);

  async function actProposal(proposalId, action) {
    setActingProposal(proposalId);
    try {
      const r = await fetch('/api/admin/edit-proposals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, action }),
      });
      const d = await r.json();
      if (d.error) { alert(d.error); return; }
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: d.proposal.status } : p));
    } finally { setActingProposal(null); }
  }

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const resolvedProposals = proposals.filter(p => p.status !== 'pending');

  // Lazily load the resource list only when the invite panel is opened.
  useEffect(() => {
    if (!showInvite || resources.length) return;
    fetch('/api/admin/resources').then(r => r.json()).then(d => setResources(Array.isArray(d) ? d : []));
  }, [showInvite]);

  async function act(claimId, action) {
    setActing(claimId);
    try {
      const r = await fetch('/api/admin/claims', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      });
      const d = await r.json();
      if (d.error) { alert(d.error); return; }
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: d.claim.status } : c));
      setMailtoFor({ claimId, href: d.mailto, label: action === 'approve' ? 'Email the owner: welcome' : 'Email the owner: more info needed' });
    } finally { setActing(null); }
  }

  const pending = claims.filter(c => c.status === 'pending');
  const resolved = claims.filter(c => c.status !== 'pending');
  const inviteMatches = resources.filter(r => {
    const q = inviteSearch.toLowerCase();
    return q.length > 1 && (r.fields.Name || '').toLowerCase().includes(q);
  }).slice(0, 8);

  function inviteMailto() {
    if (!invitePicked || !inviteEmail.trim()) return null;
    const site = 'https://thedentalcommute.com';
    const name = invitePicked.fields.Name;
    return `mailto:${encodeURIComponent(inviteEmail.trim())}?subject=${encodeURIComponent(`Claim your listing for "${name}" on The Dental Commute`)}&body=${encodeURIComponent(
      `Hi,\n\nI'm Andrei, founder of The Dental Commute — a ranked directory of dental podcasts, books, and resources. "${name}" is listed on the site, and I wanted to invite you to claim the page:\n\n${site}/resource/${invitePicked.id}\n\nClaiming lets you correct details, add your links and logo, feature your favorite episodes, and add a short creator bio — and you can see exactly how your score is calculated. Just sign in with Google on the page and click "Claim this page."\n\nLet me know if you have any questions!\n\nAndrei`
    )}`;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>Claim Your Profile</h2>
        <button onClick={() => setShowInvite(s => !s)} style={{ fontSize: 12, color: GREEN, background: 'none', border: `1px solid ${GREEN}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>
          {showInvite ? 'Close' : '+ Invite an owner'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.6 }}>
        Podcast owners can claim their listing to correct details, add a bio, and feature episodes. Every claim is
        reviewed manually here — nothing publishes until you approve it. Approving or rejecting drafts an email for
        you to review and send yourself.
      </p>

      {showInvite && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 24, background: '#f7f7f5' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Invite an owner to claim a resource</div>
          <input value={inviteSearch} onChange={e => { setInviteSearch(e.target.value); setInvitePicked(null); }}
            placeholder="Search resources by name…" style={{ ...inp(), marginBottom: 6 }} />
          {inviteSearch.length > 1 && !invitePicked && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, marginBottom: 8, maxHeight: 160, overflowY: 'auto', background: '#fff' }}>
              {inviteMatches.length === 0 && <div style={{ padding: 10, fontSize: 12, color: '#bbb' }}>No matches</div>}
              {inviteMatches.map(r => (
                <div key={r.id} onClick={() => { setInvitePicked(r); setInviteSearch(r.fields.Name); }}
                  style={{ padding: '8px 10px', fontSize: 13, cursor: 'pointer', borderBottom: `1px solid ${BORDER}` }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  {r.fields.Name} <span style={{ color: '#bbb', fontSize: 11 }}>{r.fields.Type}</span>
                </div>
              ))}
            </div>
          )}
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="owner@example.com"
            style={{ ...inp(), marginBottom: 10 }} />
          <a href={inviteMailto() || undefined}
            onClick={e => { if (!inviteMailto()) e.preventDefault(); }}
            style={{
              display: 'inline-block', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 6,
              background: inviteMailto() ? GREEN : '#ddd', color: '#fff', textDecoration: 'none', fontFamily: FONT,
              cursor: inviteMailto() ? 'pointer' : 'default',
            }}>
            Draft invite email ✉
          </a>
        </div>
      )}

      {mailtoFor && (
        <div style={{ padding: '12px 16px', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 8, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#075985' }}>Ready to notify the owner.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={mailtoFor.href} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#0284c7', padding: '6px 12px', borderRadius: 6, textDecoration: 'none' }}>{mailtoFor.label} ✉</a>
            <button onClick={() => setMailtoFor(null)} style={{ fontSize: 12, color: '#075985', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: '#888', fontSize: 14 }}>Loading…</div> : (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>
            Pending ({pending.length})
          </div>
          {pending.length === 0 && <div style={{ fontSize: 13, color: '#bbb', marginBottom: 24 }}>No pending claims.</div>}
          <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
            {pending.map(c => (
              <div key={c.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <a href={`/resource/${c.resource_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: GREEN, textDecoration: 'none' }}>{c.resourceName} ↗</a>
                  <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div style={{ fontSize: 13, color: '#333', marginBottom: 2 }}>
                  <strong>{c.claimant_name || 'Unnamed'}</strong>{c.claimant_role ? ` · ${c.claimant_role}` : ''}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: c.message ? 8 : 12 }}>{c.contact_email}</div>
                {c.message && <div style={{ fontSize: 12, color: '#666', background: '#f7f7f5', borderRadius: 6, padding: '8px 10px', marginBottom: 12, lineHeight: 1.5 }}>{c.message}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => act(c.id, 'approve')} disabled={acting === c.id} style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '8px', borderRadius: 6, border: 'none', background: GREEN, color: '#fff', cursor: 'pointer', fontFamily: FONT }}>
                    {acting === c.id ? '…' : '✓ Approve'}
                  </button>
                  <button onClick={() => act(c.id, 'reject')} disabled={acting === c.id} style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '8px', borderRadius: 6, border: `1px solid ${BORDER}`, background: '#fff', color: '#c0392b', cursor: 'pointer', fontFamily: FONT }}>
                    {acting === c.id ? '…' : '✕ Needs info'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {resolved.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Resolved</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {resolved.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 12.5 }}>
                    <span style={{ color: '#555' }}>{c.resourceName} <span style={{ color: '#bbb' }}>· {c.claimant_name || c.contact_email}</span></span>
                    <span style={{ color: c.status === 'approved' ? GREEN : '#c0392b', fontWeight: 600 }}>{c.status === 'approved' ? '✓ Approved' : '⚠ Needs info'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Listing corrections (factual edits owners have proposed) ── */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Listing Corrections</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Factual edits claimed owners have proposed (Name, URL, Description, logo, host, RSS). Approving applies them to Airtable immediately.</p>

        {proposalsLoading ? <div style={{ color: '#888', fontSize: 14 }}>Loading…</div> : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>
              Pending ({pendingProposals.length})
            </div>
            {pendingProposals.length === 0 && <div style={{ fontSize: 13, color: '#bbb', marginBottom: 24 }}>No pending corrections.</div>}
            <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
              {pendingProposals.map(p => (
                <div key={p.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <a href={`/resource/${p.resource_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: GREEN, textDecoration: 'none' }}>{p.resourceName} ↗</a>
                    <span style={{ fontSize: 11, color: '#bbb' }}>{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                    {Object.entries(p.changes || {}).map(([field, diff]) => (
                      <div key={field} style={{ fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600, color: '#555', marginBottom: 2 }}>{field}</div>
                        <div style={{ color: '#c0392b', textDecoration: 'line-through', opacity: 0.7 }}>{diff.old || '(empty)'}</div>
                        <div style={{ color: GREEN }}>{diff.new || '(empty)'}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => actProposal(p.id, 'approve')} disabled={actingProposal === p.id} style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '8px', borderRadius: 6, border: 'none', background: GREEN, color: '#fff', cursor: 'pointer', fontFamily: FONT }}>
                      {actingProposal === p.id ? '…' : '✓ Apply to Airtable'}
                    </button>
                    <button onClick={() => actProposal(p.id, 'reject')} disabled={actingProposal === p.id} style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '8px', borderRadius: 6, border: `1px solid ${BORDER}`, background: '#fff', color: '#c0392b', cursor: 'pointer', fontFamily: FONT }}>
                      {actingProposal === p.id ? '…' : '✕ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {resolvedProposals.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Resolved</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {resolvedProposals.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 12.5 }}>
                      <span style={{ color: '#555' }}>{p.resourceName} <span style={{ color: '#bbb' }}>· {Object.keys(p.changes || {}).join(', ')}</span></span>
                      <span style={{ color: p.status === 'approved' ? GREEN : '#c0392b', fontWeight: 600 }}>{p.status === 'approved' ? '✓ Applied' : '✕ Rejected'}</span>
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

// ══════════════════════════════════════════
//  TAB 6 — Deduplication
// ══════════════════════════════════════════
function Deduplication() {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [scannedAt, setScannedAt] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [busy, setBusy] = useState({});

  useEffect(() => {
    try {
      const cached = localStorage.getItem('tdc_dedupes');
      if (cached) {
        const { groups, total, scannedAt, dismissed: dis } = JSON.parse(cached);
        setGroups(groups);
        setTotalScanned(total);
        setScannedAt(scannedAt);
        if (dis) setDismissed(new Set(dis));
      }
    } catch {}
  }, []);

  const groupKey = g => g.records.map(r => r.id).sort().join('|');

  function saveCache(groups, total, scannedAt, dismissed) {
    try {
      localStorage.setItem('tdc_dedupes', JSON.stringify({ groups, total, scannedAt, dismissed: [...dismissed] }));
    } catch {}
  }

  const visibleGroups = groups ? groups.filter(g => !dismissed.has(groupKey(g))) : [];

  async function scan() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/dedupes');
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      const now = new Date().toISOString();
      setGroups(d.groups);
      setTotalScanned(d.total);
      setScannedAt(now);
      // keep existing dismissals — they stay dismissed across rescans
      saveCache(d.groups, d.total, now, dismissed);
    } catch (e) {
      alert('Scan failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function archiveRecord(id, groupIdx) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      const r = await fetch('/api/admin/resources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fields: { Status: 'Archived' } }),
      });
      if (!r.ok) throw new Error('Failed');
      setGroups(gs => {
        const updated = gs.map((g, i) => i !== groupIdx ? g : {
          ...g,
          records: g.records.map(rec => rec.id !== id ? rec : { ...rec, fields: { ...rec.fields, Status: 'Archived' } }),
        });
        saveCache(updated, totalScanned, scannedAt, dismissed);
        return updated;
      });
    } catch (e) {
      alert('Archive failed: ' + e.message);
    } finally {
      setBusy(b => { const n = { ...b }; delete n[id]; return n; });
    }
  }

  async function deleteRecord(id, groupIdx) {
    if (!confirm('Permanently delete this record from Airtable?')) return;
    setBusy(b => ({ ...b, [id]: true }));
    try {
      const r = await fetch(`/api/admin/resources?id=${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed');
      setGroups(gs => {
        const updated = gs.map((g, i) => i !== groupIdx ? g : {
          ...g,
          records: g.records.filter(rec => rec.id !== id),
        }).filter(g => g.records.length >= 2);
        saveCache(updated, totalScanned, scannedAt, dismissed);
        return updated;
      });
    } catch (e) {
      alert('Delete failed: ' + e.message);
    } finally {
      setBusy(b => { const n = { ...b }; delete n[id]; return n; });
    }
  }

  const statusColor = s => s === 'Published' ? { bg: '#d1fae5', fg: '#065f46' } : s === 'Archived' ? { bg: '#f3f4f6', fg: '#6b7280' } : { bg: '#fef9c3', fg: '#92400e' };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6 }}>Deduplicate</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        Scan all resources for duplicate entries — matched by URL or name. Archive or delete the copy, or dismiss false positives.
      </p>

      <button onClick={scan} disabled={loading} style={{ padding: '10px 20px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: FONT, opacity: loading ? 0.7 : 1, marginBottom: 12 }}>
        {loading ? 'Scanning…' : groups === null ? 'Scan for Duplicates' : 'Rescan'}
      </button>

      {groups !== null && (
        <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
          <div>
            Scanned <strong>{totalScanned}</strong> resources —{' '}
            {visibleGroups.length === 0
              ? <span style={{ color: '#065f46', fontWeight: 600 }}>no duplicates found</span>
              : <span style={{ color: '#b45309', fontWeight: 600 }}>{visibleGroups.length} duplicate group{visibleGroups.length !== 1 ? 's' : ''} found</span>}
            {dismissed.size > 0 && (
              <span style={{ color: '#aaa' }}>
                {' '}({dismissed.size} dismissed —{' '}
                <button onClick={() => { const empty = new Set(); setDismissed(empty); saveCache(groups, totalScanned, scannedAt, empty); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}>show all</button>
                )
              </span>
            )}
          </div>
          {scannedAt && <div style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>Last scanned {new Date(scannedAt).toLocaleString()}</div>}
        </div>
      )}

      {visibleGroups.map((group) => {
        const gKey = groupKey(group);
        const groupIdx = groups.indexOf(group);
        return (
          <div key={gKey} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ background: '#fafafa', borderBottom: `1px solid ${BORDER}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                <span style={{ background: group.reason === 'Same URL' ? '#dbeafe' : '#fef9c3', color: group.reason === 'Same URL' ? '#1e40af' : '#92400e', padding: '2px 8px', borderRadius: 20, marginRight: 8 }}>
                  {group.reason}
                </span>
                <span style={{ color: '#999', fontWeight: 400, fontFamily: 'monospace', fontSize: 11 }}>{group.matchValue}</span>
              </div>
              <button
                onClick={() => setDismissed(d => {
                  const next = new Set([...d, gKey]);
                  saveCache(groups, totalScanned, scannedAt, next);
                  return next;
                })}
                style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Dismiss
              </button>
            </div>

            {group.records.map(rec => {
              const f = rec.fields;
              const sc = statusColor(f['Status']);
              const isBusy = busy[rec.id];
              return (
                <div key={rec.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f['Name'] || '(no name)'}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <a href={f['URL']} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{f['URL']}</a>
                    </div>
                    {f['Description'] && (
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 8, lineHeight: 1.5 }}>
                        {f['Description']}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {f['Type'] && <span style={{ fontSize: 11, color: '#555', background: '#f3f4f6', padding: '2px 7px', borderRadius: 20 }}>{f['Type']}</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: sc.bg, color: sc.fg }}>{f['Status'] || 'No status'}</span>
                      {f['Final Score'] != null && <span style={{ fontSize: 11, color: '#888' }}>Score: {Number(f['Final Score']).toFixed(1)}</span>}
                      {f['Host or Author'] && <span style={{ fontSize: 11, color: '#888' }}>by {f['Host or Author']}</span>}
                      {f['Source'] && <SourceBadge source={f['Source']} />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => archiveRecord(rec.id, groupIdx)}
                      disabled={isBusy || f['Status'] === 'Archived'}
                      style={{ padding: '5px 12px', fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 5, cursor: 'pointer', background: '#fff', color: '#555', fontFamily: FONT, opacity: (isBusy || f['Status'] === 'Archived') ? 0.5 : 1 }}
                    >
                      {isBusy ? '…' : f['Status'] === 'Archived' ? 'Archived' : 'Archive'}
                    </button>
                    <button
                      onClick={() => deleteRecord(rec.id, groupIdx)}
                      disabled={isBusy}
                      style={{ padding: '5px 12px', fontSize: 12, border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer', background: '#fff', color: '#dc2626', fontFamily: FONT, opacity: isBusy ? 0.5 : 1 }}
                    >
                      {isBusy ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB — Episode Archive
// ══════════════════════════════════════════
function EpisodeArchive() {
  const [coverage, setCoverage] = useState(null); // null = not loaded yet
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [lastRun, setLastRun] = useState(null);
  const [stats, setStats] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);

  async function loadCoverage() {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/cron/harvest-episodes');
      const d = await r.json();
      if (d.error) { setError(d.error); setCoverage([]); }
      else { setCoverage(d.coverage || []); setStats(d.stats || null); }
    } catch (e) { setError('Could not load coverage'); setCoverage([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadCoverage(); }, []);

  async function runHarvest() {
    setRunning(true); setError(''); setLastRun(null);
    try {
      const r = await fetch('/api/cron/harvest-episodes?run=1', { method: 'POST' });
      const text = await r.text();
      let d = null;
      try { d = JSON.parse(text); } catch { /* non-JSON = a platform timeout page */ }
      if (!r.ok || !d) {
        // A heavy run was cut off by the time limit. Progress is saved per show
        // as it goes, so just continue.
        setError('That run took too long and was cut off — the shows it finished are saved. Click “Refresh now” again to continue.');
        await loadCoverage();
        return;
      }
      if (d.error) { setError(d.error); return; }
      setLastRun(d);
      await loadCoverage();
    } catch (e) { setError(e.message || 'Harvest failed'); }
    finally { setRunning(false); }
  }

  async function runFixFeeds() {
    setFixing(true); setError(''); setFixResult(null);
    try {
      const r = await fetch('/api/admin/fix-feeds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 6 }) });
      const text = await r.text();
      let d = null;
      try { d = JSON.parse(text); } catch { /* non-JSON = a platform timeout page */ }
      if (!r.ok || !d) {
        setError('That batch took too long and was cut off — any feeds it fixed are saved. Click “Fix broken feeds” again to continue.');
        await loadCoverage();
        return;
      }
      if (d.status === 'no_ai_key') { setError(d.message); return; }
      if (d.error) { setError(d.error); return; }
      setFixResult(d);
      await loadCoverage();
    } catch (e) { setError(e.message || 'Fix failed'); }
    finally { setFixing(false); }
  }

  const rows = coverage || [];
  const totalEpisodes = rows.reduce((sum, s) => sum + (s.episode_count || 0), 0);
  const fmt = iso => iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'never';

  // Seeding progress: how many real (non-duplicate) shows have been harvested at
  // least once, so you know how many more "Refresh now" clicks are left.
  const canonicalRows = rows.filter(s => s.last_status !== 'duplicate');
  const totalCanon = canonicalRows.length;
  const harvestedCount = canonicalRows.filter(s => s.last_harvested_at).length;
  const remainingCount = totalCanon - harvestedCount;
  const pct = totalCanon ? Math.round((harvestedCount / totalCanon) * 100) : 0;
  const perRun = (lastRun && lastRun.processed) || 50; // estimate from the last run
  const clicksLeft = Math.max(1, Math.ceil(remainingCount / perRun));
  const brokenShowsCount = canonicalRows.filter(s => (s.episode_count || 0) === 0 && s.last_status !== 'pending').length;
  const pendingFixCount = canonicalRows.filter(s => (s.episode_count || 0) === 0 && s.last_status === 'pending').length;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6 }}>Harvest Episodes</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.6 }}>
        Every podcast's episodes are harvested from its RSS feed and stored for instant search.
        This runs <strong>automatically every night</strong> — use <strong>Refresh now</strong> only to seed
        the archive for the first time or pull in a newly-added show right away. Rows with <strong>0 episodes</strong>
        {' '}or an error are worth a look (their feed may be truncated or unreachable).
      </p>

      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#555' }}>
            Shows tracked: <strong style={{ color: '#111' }}>{rows.length}</strong>
            {' · '}Episodes stored: <strong style={{ color: '#111' }}>{totalEpisodes.toLocaleString()}</strong>
          </div>
          <button onClick={runHarvest} disabled={running} style={{ padding: '10px 18px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: FONT, opacity: running ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {running ? 'Refreshing… (up to a minute)' : '↻ Refresh now'}
          </button>
        </div>

        {totalCanon > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, color: '#555', marginBottom: 6 }}>
              <span>{harvestedCount} of {totalCanon} shows harvested</span>
              <span style={{ fontWeight: 600, color: remainingCount === 0 ? GREEN : '#555' }}>
                {remainingCount === 0
                  ? '✓ Complete'
                  : `${remainingCount} to go · ~${clicksLeft} more ${clicksLeft === 1 ? 'click' : 'clicks'}`}
              </span>
            </div>
            <div style={{ height: 8, background: '#eee', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: GREEN, transition: 'width 0.3s' }} />
            </div>
            {remainingCount === 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#065f46', background: '#d1fae5', padding: '8px 12px', borderRadius: 6 }}>
                ✓ Every show has been harvested. The nightly auto-refresh keeps it current from here — you don't need to keep pressing Refresh.
              </div>
            )}
          </div>
        )}
      </div>

      {stats && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Automatic updates
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
            Last refresh activity: <strong style={{ color: '#555' }}>{stats.lastHarvestAt ? fmt(stats.lastHarvestAt) : 'never'}</strong>
            {' '}· runs automatically every night
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
            {[
              { label: 'New episodes · 24h', value: stats.added24h, green: stats.added24h > 0 },
              { label: 'New episodes · 7 days', value: stats.added7d, green: stats.added7d > 0 },
              { label: 'Shows refreshed · 24h', value: stats.showsRefreshed24h },
              { label: 'Feeds erroring', value: stats.errors, red: stats.errors > 0 },
            ].map(m => (
              <div key={m.label} style={{ background: '#fafafa', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.red ? '#dc2626' : m.green ? GREEN : '#111' }}>
                  {(m.value || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(brokenShowsCount > 0 || pendingFixCount > 0) && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#555', maxWidth: 460 }}>
              <strong style={{ color: brokenShowsCount ? '#dc2626' : GREEN }}>{brokenShowsCount}</strong> show{brokenShowsCount === 1 ? '' : 's'} still need a feed (dead or mislinked).
              {' '}<strong>Fix broken feeds</strong> uses AI to find each show's real RSS feed, verifies it actually has episodes, and updates Airtable — a few at a time.
              {pendingFixCount > 0 && (
                <div style={{ marginTop: 6, color: GREEN, fontWeight: 600 }}>
                  ↻ {pendingFixCount} feed{pendingFixCount === 1 ? '' : 's'} fixed and waiting — click <strong>Refresh now</strong> above to pull their episodes in.
                </div>
              )}
            </div>
            <button onClick={runFixFeeds} disabled={fixing || brokenShowsCount === 0} style={{ padding: '10px 18px', background: '#b45309', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: FONT, opacity: (fixing || brokenShowsCount === 0) ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              {fixing ? '🔧 Fixing… (~30s)' : '🔧 Fix broken feeds'}
            </button>
          </div>

          {fixResult && (
            <div style={{ marginTop: 14, fontSize: 13 }}>
              {fixResult.fixed?.length > 0 && (
                <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                  ✓ Fixed {fixResult.fixed.length} feed{fixResult.fixed.length === 1 ? '' : 's'} — click <strong>Refresh now</strong> above to pull their episodes in.
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    {fixResult.fixed.map((f, i) => <div key={i} style={{ color: '#047857' }}>• {f.show}</div>)}
                  </div>
                </div>
              )}
              {fixResult.failed?.length > 0 && (
                <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '10px 12px' }}>
                  Couldn't auto-fix {fixResult.failed.length} (no working feed found — these may be defunct or need a manual URL):
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    {fixResult.failed.map((f, i) => <div key={i}>• {f.show} <span style={{ color: '#b45309' }}>({f.reason})</span></div>)}
                  </div>
                </div>
              )}
              {fixResult.remaining > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                  {fixResult.remaining} still to check — press <strong>Fix broken feeds</strong> again for the next batch.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>{error}</div>}
      {lastRun && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#d1fae5', color: '#065f46', borderRadius: 6, fontSize: 13 }}>
          ✓ Harvested {lastRun.processed} of {lastRun.canonicalShows || lastRun.totalShows} show{(lastRun.canonicalShows || lastRun.totalShows) === 1 ? '' : 's'} this run
          {' '}({Math.round((lastRun.elapsedMs || 0) / 1000)}s). Shows are processed least-recently-refreshed first, so
          {' '}repeat <strong>Refresh now</strong> until every show shows a recent time below.
          {(lastRun.duplicatesMarked > 0 || lastRun.dupEpisodesDeleted > 0 || lastRun.orphanEpisodesDeleted > 0) && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#047857' }}>
              🧹 Cleanup: merged {lastRun.duplicatesMarked || 0} duplicate show{lastRun.duplicatesMarked === 1 ? '' : 's'}
              {' '}and removed {((lastRun.dupEpisodesDeleted || 0) + (lastRun.orphanEpisodesDeleted || 0)).toLocaleString()} duplicate/stale episodes.
            </div>
          )}
        </div>
      )}

      {loading && coverage === null ? (
        <div style={{ color: '#888', fontSize: 14 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
          No shows tracked yet. Click <strong>Refresh now</strong> to run the first harvest.
        </div>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          {rows.map((s, i) => {
            const isDup = s.last_status === 'duplicate';
            const isPending = s.last_status === 'pending'; // fixed, awaiting next harvest
            const problem = !isDup && !isPending && ((s.episode_count || 0) === 0 || s.last_status === 'error');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: problem ? '#fff8f8' : isDup ? '#fafafa' : '#fff', borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, opacity: isDup ? 0.7 : 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.show_name || '(unnamed show)'}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Last refreshed: {fmt(s.last_harvested_at)}</div>
                  {isPending ? (
                    <div style={{ fontSize: 11, color: GREEN, marginTop: 3 }}>↻ Feed fixed — Refresh to load episodes</div>
                  ) : s.last_error && (
                    <div style={{ fontSize: 11, color: isDup ? '#999' : '#dc2626', marginTop: 3 }}>{isDup ? '↪' : '⚠'} {s.last_error}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: problem ? '#dc2626' : GREEN }}>{(s.episode_count || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>episodes</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB — Featured Content
// ══════════════════════════════════════════
const FEATURED_SECTIONS = ['Books', 'Podcasts', 'YouTube', 'CE Courses', 'Coaching', 'Communities'];

function FeaturedContent() {
  const [section, setSection] = useState('Books');
  const [featured, setFeatured] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [msg, setMsg] = useState('');

  async function loadFeatured(sec) {
    setLoading(true); setFeatured([]);
    try {
      const r = await fetch(`/api/admin/featured?section=${encodeURIComponent(sec)}`);
      const d = await r.json();
      setFeatured(d.records || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadFeatured(section); }, [section]);

  useEffect(() => {
    if (allResources.length > 0) return;
    setLoadingAll(true);
    fetch('/api/admin/resources')
      .then(r => r.json())
      .then(d => setAllResources(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingAll(false));
  }, []);

  const featuredIds = new Set(featured.map(r => r.id));
  const searchResults = search.trim().length > 1
    ? allResources.filter(r => !featuredIds.has(r.id) && (r.fields?.Name || '').toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  async function doSearch() {}  // handled above via filter

  async function addFeatured(record) {
    setMsg('');
    const r = await fetch('/api/admin/featured', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: record.id, section }),
    });
    if (r.ok) { setMsg(`Added "${record.fields.Name}"`); setSearch(''); setSearchResults([]); loadFeatured(section); }
    else setMsg('Error adding resource');
  }

  async function removeFeatured(record) {
    setMsg('');
    const r = await fetch('/api/admin/featured', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: record.id, section: null }),
    });
    if (r.ok) { setMsg(`Removed "${record.fields.Name}"`); loadFeatured(section); }
    else setMsg('Error removing resource');
  }

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, color:'#111', marginBottom:6 }}>Featured Content</h2>
      <p style={{ fontSize:13, color:'#777', marginBottom:20 }}>
        Pick which resources appear in the Featured sections on the homepage. Each resource can only be featured in one section at a time.
      </p>

      {/* Section tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:24 }}>
        {FEATURED_SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT,
              background: section === s ? GREEN : '#f0ede8', color: section === s ? '#fff' : '#555',
              border: section === s ? `1px solid ${GREEN}` : `1px solid ${BORDER}` }}>
            {s}
          </button>
        ))}
      </div>

      {/* Currently featured */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#999', marginBottom:10 }}>
          Currently featured in {section} ({featured.length})
        </div>
        {loading && <div style={{ fontSize:13, color:'#aaa' }}>Loading…</div>}
        {!loading && featured.length === 0 && <div style={{ fontSize:13, color:'#aaa' }}>None yet — search below to add some.</div>}
        {featured.map(r => (
          <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:6, marginBottom:6 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>{r.fields.Name || r.fields.fldtPkYPgBaGj7aGZ}</div>
              <div style={{ fontSize:11, color:'#aaa' }}>{r.fields.Author || r.fields.fldr1Dibd8NGArVbo} · Score: {Math.round(r.fields['Final Score'] || r.fields.fld0FNO3uxt3K0pCX || 0)}</div>
            </div>
            <button onClick={() => removeFeatured(r)}
              style={{ fontSize:12, padding:'5px 12px', borderRadius:4, background:'#fff5f5', color:'#c0392b', border:'1px solid #fcc', cursor:'pointer', fontFamily:FONT, fontWeight:600, flexShrink:0 }}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Search to add */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#999', marginBottom:10 }}>Add a resource</div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Search resources to feature in ${section}…`}
          style={{ ...inp(), marginBottom:6 }} />
        {loadingAll && <div style={{ fontSize:12, color:'#aaa', padding:'6px 0' }}>Loading resources…</div>}
        {searchResults.map(r => (
          <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#fafaf8', border:`1px solid ${BORDER}`, borderRadius:6, marginBottom:4 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>{r.fields.Name}</div>
              <div style={{ fontSize:11, color:'#aaa' }}>{r.fields.Type} · {r.fields.Author || ''}</div>
            </div>
            <button onClick={() => addFeatured(r)}
              style={{ fontSize:12, padding:'5px 12px', borderRadius:4, background:'#E8F5F0', color:GREEN, border:`1px solid ${GREEN}`, cursor:'pointer', fontFamily:FONT, fontWeight:600, flexShrink:0 }}>
              + Feature
            </button>
          </div>
        ))}
      </div>

      {msg && <div style={{ fontSize:13, color:GREEN, fontWeight:600, padding:'8px 0' }}>{msg}</div>}
    </div>
  );
}

//  TAB 7 — Settings
// ══════════════════════════════════════════
function Settings() {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function changePassword(e) {
    e.preventDefault();
    if (newPass !== confirm) { setMessage({ type: 'error', text: 'New passwords do not match' }); return; }
    if (newPass.length < 8) { setMessage({ type: 'error', text: 'Password must be at least 8 characters' }); return; }
    setSaving(true); setMessage(null);
    try {
      const r = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      const d = await r.json();
      if (!r.ok) { setMessage({ type: 'error', text: d.error }); return; }
      setMessage({ type: 'success', text: d.message });
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (e) {
      setMessage({ type: 'error', text: 'Request failed' });
    } finally { setSaving(false); }
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6 }}>Settings</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>Manage your admin panel credentials.</p>

      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 20 }}>Change Password</div>
        <form onSubmit={changePassword} style={{ display: 'grid', gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
            Current password
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} style={{ ...inp(), marginTop: 4 }} autoComplete="current-password" />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
            New password
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ ...inp(), marginTop: 4 }} autoComplete="new-password" />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
            Confirm new password
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ ...inp(), marginTop: 4 }} autoComplete="new-password" />
          </label>

          {message && (
            <div style={{ padding: '10px 14px', borderRadius: 6, fontSize: 13, background: message.type === 'success' ? '#d1fae5' : '#fef2f2', color: message.type === 'success' ? '#065f46' : '#dc2626' }}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={saving || !current || !newPass || !confirm} style={{ width: '100%', padding: '12px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: FONT, opacity: saving ? 0.6 : 1, marginTop: 4 }}>
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 16, padding: '14px 16px', background: '#f9fafb', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
        After changing your password, a redeploy is triggered automatically. The new password will be active in ~1 minute.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB 7 — Users
// ══════════════════════════════════════════
function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('joined');
  const [sortDir, setSortDir] = useState('desc');
  const [episodes, setEpisodes] = useState(null); // site-wide episode count (public /api/stats)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setUsers(d.users || []);
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));

    // Episode count is public and cached; nice to show alongside user metrics.
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setEpisodes(typeof d.episodes === 'number' ? d.episodes : null))
      .catch(() => {});
  }, []);

  function fmt(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeSince(iso) {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  function initials(name, email) {
    if (name) {
      const parts = name.trim().split(' ');
      return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
    }
    return (email || '?')[0].toUpperCase();
  }

  const lc = search.toLowerCase();
  const filtered = users
    .filter(u => !lc || (u.email || '').toLowerCase().includes(lc) || (u.full_name || '').toLowerCase().includes(lc) || (u.specialty || '').toLowerCase().includes(lc))
    .sort((a, b) => {
      let av, bv;
      if (sortBy === 'joined') { av = a.created_at; bv = b.created_at; }
      else if (sortBy === 'lastSeen') { av = a.last_sign_in_at || ''; bv = b.last_sign_in_at || ''; }
      else if (sortBy === 'name') { av = (a.full_name || a.email || '').toLowerCase(); bv = (b.full_name || b.email || '').toLowerCase(); }
      else if (sortBy === 'bookmarks') { av = a.bookmark_count; bv = b.bookmark_count; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const SortBtn = ({ col, label }) => (
    <button onClick={() => toggleSort(col)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: sortBy === col ? '#111' : '#888', fontFamily: FONT, padding: 0, display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
      {label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </button>
  );

  // ── Usage dashboard metrics (computed from the full user list, not the search filter) ──
  const DAY = 86400000;
  const now = Date.now();
  const withinDays = (iso, n) => iso && (now - new Date(iso).getTime()) <= n * DAY;

  const totalUsers = users.length;
  const new7d = users.filter(u => withinDays(u.created_at, 7)).length;
  const new30d = users.filter(u => withinDays(u.created_at, 30)).length;
  const active7d = users.filter(u => withinDays(u.last_sign_in_at, 7)).length;
  const active30d = users.filter(u => withinDays(u.last_sign_in_at, 30)).length;
  const totalSaves = users.reduce((s, u) => s + (u.bookmark_count || 0), 0);
  const savers = users.filter(u => (u.bookmark_count || 0) > 0).length;

  // New sign-ups per week for the last 8 weeks (bucket 0 = oldest, 7 = this week).
  const WEEKS = 8;
  const weekly = Array(WEEKS).fill(0);
  users.forEach(u => {
    if (!u.created_at) return;
    const weeksAgo = Math.floor((now - new Date(u.created_at).getTime()) / (7 * DAY));
    if (weeksAgo >= 0 && weeksAgo < WEEKS) weekly[WEEKS - 1 - weeksAgo]++;
  });
  const weeklyMax = Math.max(1, ...weekly);

  // Top specialties among users who set one.
  const specCounts = {};
  users.forEach(u => { if (u.specialty) specCounts[u.specialty] = (specCounts[u.specialty] || 0) + 1; });
  const topSpecialties = Object.entries(specCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 14 }}>Loading users…</div>;

  if (error) return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '16px 20px', color: '#dc2626', fontSize: 13 }}>
      <strong>Error:</strong> {error}
      {error.includes('SUPABASE_SERVICE_ROLE_KEY') && (
        <div style={{ marginTop: 10, color: '#7f1d1d', lineHeight: 1.6 }}>
          To fix this: go to <strong>Vercel → your project → Settings → Environment Variables</strong> and add <code>SUPABASE_SERVICE_ROLE_KEY</code>. You can find this key in <strong>Supabase → Project Settings → API → service_role secret</strong>. Then redeploy.
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* ── Usage dashboard ─────────────────────────────────────── */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>Usage Dashboard</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>A snapshot of your own account &amp; engagement data. For visitor traffic and search rankings, see the Google links below.</p>

      {/* Headline stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Total users', value: totalUsers },
          { label: 'New · 7 days', value: new7d, green: new7d > 0 },
          { label: 'New · 30 days', value: new30d, green: new30d > 0 },
          { label: 'Active · 7 days', value: active7d, sub: 'signed in' },
          { label: 'Active · 30 days', value: active30d, sub: 'signed in' },
          { label: 'Total saves', value: totalSaves },
          { label: 'Users w/ a save', value: savers },
          { label: 'Episodes indexed', value: episodes, sub: episodes == null ? 'loading…' : undefined },
        ].map(m => (
          <div key={m.label} style={{ background: '#fafafa', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.green ? GREEN : '#111' }}>
              {m.value == null ? '—' : (m.value).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{m.label}</div>
            {m.sub && <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Sign-ups over time + top specialties */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 14 }}>
        {/* Weekly sign-ups bar chart */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>New sign-ups · last 8 weeks</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
            {weekly.map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>{n || ''}</div>
                <div title={`${n} new`} style={{ width: '100%', height: `${(n / weeklyMax) * 64}px`, minHeight: n > 0 ? 3 : 0, background: i === weekly.length - 1 ? GREEN : '#cfe3dc', borderRadius: '3px 3px 0 0' }} />
                <div style={{ fontSize: 9, color: '#bbb' }}>{i === weekly.length - 1 ? 'now' : `-${weekly.length - 1 - i}w`}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top specialties */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Top specialties</div>
          {topSpecialties.length === 0 ? (
            <div style={{ fontSize: 12, color: '#bbb', paddingTop: 8 }}>No specialties set yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topSpecialties.map(([spec, n]) => (
                <div key={spec} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#555', width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec}</div>
                  <div style={{ flex: 1, background: '#f1f1f1', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(n / topSpecialties[0][1]) * 100}%`, height: '100%', background: GREEN }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#111', fontWeight: 600, width: 24, textAlign: 'right' }}>{n}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Link out to Google properties for full traffic/search analytics */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Full analytics on Google</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Visitor traffic, pageviews, and search rankings live in your Google dashboards.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Google Analytics ↗', href: 'https://analytics.google.com/analytics/web/?authuser=0#/a29630818p542284629/reports/intelligenthome', desc: 'Traffic & pageviews' },
            { label: 'Search Console ↗', href: 'https://search.google.com/search-console', desc: 'Search rankings & queries' },
          ].map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 180px', textDecoration: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', background: '#fafafa', display: 'block' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{l.label}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{l.desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Registered users table ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>Registered Users</h2>
        <span style={{ fontSize: 13, color: '#888' }}>{users.length} total</span>
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Everyone who has signed in with Google.</p>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, email, or specialty…"
        style={{ ...inp(), marginBottom: 16 }}
      />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 13 }}>No users match your search.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 60px', gap: 8, padding: '10px 14px', background: '#f9fafb', borderBottom: `1px solid ${BORDER}`, alignItems: 'center' }}>
            <SortBtn col="name" label="Name / Email" />
            <SortBtn col="joined" label="Joined" />
            <SortBtn col="lastSeen" label="Last seen" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>Specialty</span>
            <SortBtn col="bookmarks" label="Saves" />
          </div>

          {/* Rows */}
          {filtered.map((u, i) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 60px', gap: 8, padding: '12px 14px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none', alignItems: 'center' }}>
              {/* Name + email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    : initials(u.full_name, u.email)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.full_name || <span style={{ color: '#aaa', fontWeight: 400 }}>No name set</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
              </div>

              {/* Joined */}
              <div style={{ fontSize: 12, color: '#555' }}>{fmt(u.created_at)}</div>

              {/* Last seen */}
              <div style={{ fontSize: 12, color: '#555' }}>{timeSince(u.last_sign_in_at)}</div>

              {/* Specialty */}
              <div style={{ fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.specialty || <span style={{ color: '#ccc' }}>—</span>}
              </div>

              {/* Bookmarks */}
              <div style={{ fontSize: 12, color: u.bookmark_count > 0 ? '#111' : '#ccc', fontWeight: u.bookmark_count > 0 ? 600 : 400, textAlign: 'center' }}>
                {u.bookmark_count > 0 ? `♥ ${u.bookmark_count}` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  LOGIN SCREEN
// ══════════════════════════════════════════
function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const r = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (r.ok) { onLogin(); } else { setError('Incorrect password'); setPassword(''); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: '20px' }}>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '40px 28px', width: '100%', maxWidth: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', marginBottom: 8 }}>Admin Portal</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>The Dental Commute</div>
        </div>
        <form onSubmit={submit}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" autoFocus style={{ ...inp(), marginBottom: 12 }} />
          {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{error}</div>}
          <button type="submit" disabled={loading || !password} style={{ width: '100%', padding: '10px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB — Episode Tagging (AI tagging visibility + backfill)
// ══════════════════════════════════════════
function EpisodeTaggingTab() {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const stopRef = useRef(false);

  async function loadStatus() {
    try {
      const r = await fetch('/api/admin/tagging-status', { cache: 'no-store' });
      const d = await r.json();
      if (!d.error) setStatus(d);
    } finally { setLoadingStatus(false); }
  }
  useEffect(() => { loadStatus(); }, []);

  function ago(iso) {
    if (!iso) return 'never';
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  // Self-looping: one click starts it, each batch fetch chains straight into
  // the next (no cron cadence involved), until nothing's left to claim or the
  // admin hits Stop. Progress is saved to the database after every batch, so
  // stopping (or closing the tab) never loses ground.
  async function runBackfill() {
    setRunning(true); setError(''); stopRef.current = false;
    try {
      while (!stopRef.current) {
        const r = await fetch('/api/admin/tag-episodes-batch?claimSize=300', { method: 'POST', cache: 'no-store' });
        const d = await r.json();
        if (d.error) { setError(d.error); break; }
        if (d.status === 'no_ai_key') { setError('PERPLEXITY_API_KEY is not configured in Vercel — tagging can\'t run yet.'); break; }
        if (d.status === 'no_taxonomy') { setError('No active quiz options found to tag against.'); break; }
        await loadStatus();
        if (!d.attempted || d.remaining === 0) break; // nothing left to claim
      }
    } catch (e) { setError(e.message); }
    finally { setRunning(false); }
  }

  const pct = status && status.total > 0 ? Math.round((status.tagged / status.total) * 100) : 0;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Tag Episodes</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 1.6 }}>
        An AI reads each episode&rsquo;s title and description and checks it against the quiz&rsquo;s own answer options (career stage, clinical interest, what someone&rsquo;s working on), so the homepage can recommend the right <em>episodes</em> to the right person — not just resources tagged for a whole show.
      </p>

      <div style={{ background: '#f7f7f5', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 12.5, color: '#555', lineHeight: 1.65 }}>
        <div style={{ fontWeight: 700, color: '#333', marginBottom: 8 }}>How it works</div>
        <div>Each batch is claimed atomically (two overlapping runs can never tag the same episode twice), sent to the AI in chunks of ~20 episodes per call, then saved. New episodes get tagged automatically inside the daily harvest job — this backfill is only for catching the existing archive up fast, run it until &ldquo;Remaining&rdquo; hits 0.</div>
      </div>

      {loadingStatus ? (
        <div style={{ color: '#aaa', fontSize: 13 }}>Loading…</div>
      ) : status && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
              <span>{status.tagged.toLocaleString()} / {status.total.toLocaleString()} tagged</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: GREEN, transition: 'width 0.3s' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 4 }}>Last run</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: status.lastRun ? '#111' : '#bbb' }}>{ago(status.lastRun?.ran_at)}</div>
              {status.lastRun && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{status.lastRun.trigger} · tagged {status.lastRun.tagged_count}</div>}
            </div>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 4 }}>Remaining</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{status.remaining.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {!running ? (
              <button onClick={runBackfill} disabled={status.remaining === 0} style={{ flex: 1, padding: '12px', background: status.remaining === 0 ? '#e5e7eb' : GREEN, color: status.remaining === 0 ? '#999' : '#fff', border: 'none', borderRadius: 6, cursor: status.remaining === 0 ? 'default' : 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT }}>
                {status.remaining === 0 ? '✓ Fully tagged' : '▶ Start backfill'}
              </button>
            ) : (
              <button onClick={() => { stopRef.current = true; }} style={{ flex: 1, padding: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT }}>
                ■ Stop (progress is saved)
              </button>
            )}
          </div>

          {error && <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>{error}</div>}

          {status.recentSample?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Recently tagged (sample)</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {status.recentSample.map((s, i) => (
                  <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '9px 12px', fontSize: 12.5 }}>
                    <div style={{ color: '#111', fontWeight: 500, marginBottom: 3 }}>{s.title} <span style={{ color: '#bbb', fontSize: 11 }}>{s.show_name}</span></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(s.quiz_tags || []).length ? s.quiz_tags.map(t => (
                        <span key={t} style={{ fontSize: 10, background: '#e8f5f0', color: GREEN, padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{t}</span>
                      )) : <span style={{ fontSize: 11, color: '#bbb' }}>(no tags matched)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB — Quiz Questions (admin-editable quiz_options)
// ══════════════════════════════════════════
const QUESTION_GROUPS = [
  { key: 'career_stage', label: 'Q1 — What describes you?' },
  { key: 'interest', label: "Q2 — Your interest" },
  { key: 'working_on', label: "Q2 — What you're working on" },
];

function QuizOptionsTab() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState({});
  const [saving, setSaving] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/quiz-options');
      const d = await r.json();
      setOptions(Array.isArray(d.options) ? d.options : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function addOption(question_key) {
    const label = (newLabel[question_key] || '').trim();
    if (!label) return;
    setSaving(question_key);
    try {
      const r = await fetch('/api/admin/quiz-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_key, label }) });
      const d = await r.json();
      if (d.error) { alert(d.error); return; }
      setOptions(prev => [...prev, d.option]);
      setNewLabel(prev => ({ ...prev, [question_key]: '' }));
    } finally { setSaving(null); }
  }

  async function toggleActive(opt) {
    setSaving(opt.id);
    try {
      const r = await fetch('/api/admin/quiz-options', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: opt.id, active: !opt.active }) });
      const d = await r.json();
      if (d.error) { alert(d.error); return; }
      setOptions(prev => prev.map(o => o.id === opt.id ? d.option : o));
    } finally { setSaving(null); }
  }

  if (loading) return <div style={{ color: '#888', fontSize: 14 }}>Loading…</div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Quiz Questions</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
        Add or retire the onboarding quiz&rsquo;s answer options. Changes take effect immediately for the quiz and profile settings. Retiring an option (rather than deleting) keeps it safe for anyone who already picked it — it just won&rsquo;t be offered to new answers. The AI episode tagger reads this same list, so a newly added option needs a tagging pass (Episode Tagging tab) before matching episodes show up for it.
      </p>

      {QUESTION_GROUPS.map(group => {
        const groupOptions = options.filter(o => o.question_key === group.key).sort((a, b) => a.sort_order - b.sort_order);
        return (
          <div key={group.key} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 10 }}>{group.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {groupOptions.map(o => (
                <button key={o.id} onClick={() => toggleActive(o)} disabled={saving === o.id}
                  title={o.active ? 'Click to retire' : 'Click to reactivate'}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: `1px solid ${o.active ? GREEN : BORDER}`,
                    background: o.active ? '#e8f5f0' : '#f3f4f6', color: o.active ? GREEN : '#999',
                    cursor: 'pointer', fontFamily: FONT, fontWeight: 500, textDecoration: o.active ? 'none' : 'line-through', opacity: saving === o.id ? 0.5 : 1 }}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newLabel[group.key] || ''} onChange={e => setNewLabel(prev => ({ ...prev, [group.key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addOption(group.key)}
                placeholder="Add a new option…" style={{ ...inp(), flex: 1 }} />
              <button onClick={() => addOption(group.key)} disabled={saving === group.key || !newLabel[group.key]?.trim()}
                style={{ padding: '9px 16px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: FONT, opacity: saving === group.key ? 0.6 : 1 }}>
                + Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
//  HOME LAYOUT COMPOSER
// ══════════════════════════════════════════
// Compose the home page per audience: reorder blocks, toggle them on/off, add or
// remove them, then Publish. The live home renders the *published* layout; the
// draft is your private scratch copy until you hit Publish.

const AUDIENCE_LABELS = { logged_out: 'Signed-out visitors', logged_in: 'Signed-in dentists' };

const TYPE_CHIP = {
  carousel: { bg: '#eef2ff', fg: '#4f46e5' },
  list:     { bg: '#ecfdf5', fg: '#059669' },
  grid:     { bg: '#fef3c7', fg: '#b45309' },
  chrome:   { bg: '#f3f4f6', fg: '#6b7280' },
};

function HomeLayoutTab() {
  const [store, setStore] = useState(null);   // server truth: { aud: {draft:[], published:[]|null} }
  const [draft, setDraft] = useState(null);   // working copies: { aud: [blocks] }
  const [aud, setAud] = useState('logged_out');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [quizOpts, setQuizOpts] = useState(null); // Discover's eligible tags, grouped by kind
  const [expanded, setExpanded] = useState({});   // which block rows are expanded (e.g. Discover)

  async function load() {
    setLoading(true);
    try {
      const [r, qr] = await Promise.all([
        fetch('/api/admin/home-layout'),
        fetch('/api/admin/quiz-options'),
      ]);
      const d = await r.json();
      if (d.error) { setMsg(d.error); return; }
      setStore(d);
      setDraft({ logged_out: clone(d.logged_out.draft), logged_in: clone(d.logged_in.draft) });
      // Group the active quiz options into Discover's three kinds.
      const qd = await qr.json();
      const grouped = { goal: [], interest: [], career: [] };
      (qd.options || []).filter(o => o.active).forEach(o => {
        const kind = DISCOVER_KINDS.find(k => k.quizKey === o.question_key);
        if (kind) grouped[kind.kind].push(o.label);
      });
      setQuizOpts(grouped);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const clone = obj => JSON.parse(JSON.stringify(obj || []));
  const rows = (draft && draft[aud]) || [];
  const dirty = store && draft ? JSON.stringify(draft[aud]) !== JSON.stringify(store[aud].draft) : false;
  const published = store && store[aud].published;

  function setRows(next) { setDraft(prev => ({ ...prev, [aud]: next })); setMsg(''); }
  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  }
  function toggle(i) { setRows(rows.map((b, k) => k === i ? { ...b, on: !b.on } : b)); }
  function remove(i) { setRows(rows.filter((_, k) => k !== i)); }
  function add(key) { setRows([...rows, { key, on: true, settings: {} }]); }
  function setHeading(i, value) {
    setRows(rows.map((b, k) => {
      if (k !== i) return b;
      const settings = { ...(b.settings || {}) };
      if (value.trim()) settings.heading = value; else delete settings.heading;
      return { ...b, settings };
    }));
  }
  // Discover: toggle whether a single tag (row) appears; and set how many rows
  // of a kind to show. Both live in the block's settings.
  function toggleDiscoverTag(i, tag) {
    setRows(rows.map((b, k) => {
      if (k !== i) return b;
      const cur = new Set((b.settings && b.settings.hidden) || []);
      if (cur.has(tag)) cur.delete(tag); else cur.add(tag);
      const settings = { ...(b.settings || {}) };
      if (cur.size) settings.hidden = [...cur]; else delete settings.hidden;
      return { ...b, settings };
    }));
  }
  function setKindCount(i, kind, value) {
    const n = Math.max(0, Math.min(12, parseInt(value, 10) || 0));
    setRows(rows.map((b, k) => {
      if (k !== i) return b;
      const settings = { ...(b.settings || {}) };
      settings.counts = { ...(settings.counts || {}), [kind]: n };
      return { ...b, settings };
    }));
  }

  const available = Object.keys(BLOCK_META).filter(k => blockAvailableFor(k, aud) && !rows.some(b => b.key === k));

  async function saveDraft() {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/home-layout', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: aud, blocks: rows }),
      });
      const d = await r.json();
      if (d.error) { setMsg(d.error); return; }
      setStore(prev => ({ ...prev, [aud]: { ...prev[aud], draft: clone(d.blocks) } }));
      setDraft(prev => ({ ...prev, [aud]: clone(d.blocks) }));
      setMsg('Draft saved.');
    } finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true); setMsg('');
    try {
      // Save the current draft first so we publish exactly what's on screen.
      await fetch('/api/admin/home-layout', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: aud, blocks: rows }),
      });
      const r = await fetch('/api/admin/home-layout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: aud }),
      });
      const d = await r.json();
      if (d.error) { setMsg(d.error); return; }
      setStore(prev => ({ ...prev, [aud]: { draft: clone(d.blocks), published: clone(d.blocks) } }));
      setDraft(prev => ({ ...prev, [aud]: clone(d.blocks) }));
      setMsg('Published — now live on the home page.');
    } finally { setBusy(false); }
  }

  function discard() {
    setDraft(prev => ({ ...prev, [aud]: clone(store[aud].draft) }));
    setMsg('');
  }

  // Preview shows the *saved* draft, so persist the current on-screen state first
  // (otherwise unsaved edits wouldn't appear). Open the tab synchronously to dodge
  // popup blockers, then point it at the preview once the save completes.
  async function openDraftPreview() {
    const w = window.open('about:blank', '_blank');
    try {
      await fetch('/api/admin/home-layout', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: aud, blocks: rows }),
      });
      setStore(prev => ({ ...prev, [aud]: { ...prev[aud], draft: clone(rows) } }));
    } catch { /* preview will just show the last-saved draft */ }
    const url = `/?as=${aud}&preview=draft`;
    if (w) w.location = url; else window.location.href = url;
  }

  if (loading) return <div style={{ color: '#888', fontSize: 14 }}>Loading…</div>;
  if (!store || !draft) return <div style={{ color: '#c00', fontSize: 14 }}>{msg || 'Could not load the layout.'}</div>;

  const onCount = rows.filter(b => b.on).length;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Home Layout</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 18, lineHeight: 1.6 }}>
        Arrange the home page for each audience — reorder with the arrows, switch rows on or off, add or remove sections, and rename what visitors see via the &ldquo;Shows as&rdquo; box (blank = the built-in title). The <strong>Discover</strong> and <strong>Your carousels</strong> sections each hold many rows: use their &ldquo;rows&rdquo; link to trim which show and cap how many appear. Changes stay in your private <strong>draft</strong> until you hit <strong>Publish</strong>. Signed-out and signed-in homes are edited independently.
      </p>

      {/* Audience switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {AUDIENCES.map(a => (
          <button key={a} onClick={() => { setAud(a); setMsg(''); }}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${aud === a ? GREEN : BORDER}`,
              background: aud === a ? '#e8f5f0' : '#fff', color: aud === a ? GREEN : '#555',
              fontWeight: aud === a ? 700 : 500, fontSize: 13, fontFamily: FONT, cursor: 'pointer' }}>
            {AUDIENCE_LABELS[a]}
          </button>
        ))}
      </div>

      {/* Status line */}
      <div style={{ fontSize: 12, color: '#888', marginBottom: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>{onCount} of {rows.length} section{rows.length === 1 ? '' : 's'} on</span>
        <span>·</span>
        <span>{published ? `${published.filter(b => b.on).length} live` : 'Never published — home uses the built-in default'}</span>
        {dirty && <span style={{ color: '#b45309', fontWeight: 600 }}>· Unsaved changes</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 12, alignItems: 'center' }}>
          <button onClick={openDraftPreview} title="Saves your draft, then opens the home as this audience would see your unpublished changes"
            style={{ color: GREEN, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: FONT }}>
            Preview draft ↗
          </button>
          <a href={`/?as=${aud}`} target="_blank" rel="noreferrer" title="See what's live right now for this audience" style={{ color: '#aaa', textDecoration: 'none', fontWeight: 500 }}>
            View live ↗
          </a>
        </span>
      </div>

      {/* Block list */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        {rows.length === 0 && <div style={{ padding: 20, fontSize: 13, color: '#aaa', textAlign: 'center' }}>No sections. Add one below.</div>}
        {rows.map((b, i) => {
          const meta = BLOCK_META[b.key] || { name: b.key, type: 'chrome' };
          const chip = TYPE_CHIP[meta.type] || TYPE_CHIP.chrome;
          const isDiscover = b.key === 'discover';
          const isPersonal = b.key === 'personal';
          const isExpandable = isDiscover || isPersonal;
          const open = !!expanded[b.key];
          return (
            <div key={b.key} style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, background: b.on ? '#fff' : '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', opacity: b.on ? 1 : 0.6 }}>
                {/* Reorder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                    style={arrowBtn(i === 0)}>▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} title="Move down"
                    style={arrowBtn(i === rows.length - 1)}>▼</button>
                </div>
                {/* Name + type + (for titled blocks) an editable visitor heading */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111', textDecoration: b.on ? 'none' : 'line-through' }}>{meta.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: chip.fg, background: chip.bg, padding: '1px 6px', borderRadius: 4 }}>{meta.type}</span>
                  {isRenamable(b.key) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                      <span style={{ fontSize: 10, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Shows as</span>
                      <input value={(b.settings && b.settings.heading) || ''} onChange={e => setHeading(i, e.target.value)}
                        placeholder={meta.heading} title="The heading visitors see above this section. Leave blank to use the default."
                        style={{ flex: 1, maxWidth: 240, fontSize: 12, padding: '4px 8px', border: `1px solid ${BORDER}`, borderRadius: 5, fontFamily: FONT, color: '#333', background: '#fff' }} />
                    </div>
                  )}
                  {isExpandable && (
                    <button onClick={() => setExpanded(prev => ({ ...prev, [b.key]: !prev[b.key] }))}
                      style={{ marginTop: 7, fontSize: 11.5, fontWeight: 600, color: GREEN, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT }}>
                      {open ? '▾ Hide row settings' : (isDiscover ? '▸ Choose which rows show' : '▸ Set how many rows show')}
                    </button>
                  )}
                </div>
                {/* On/off */}
                <button onClick={() => toggle(i)} title={b.on ? 'Turn off' : 'Turn on'}
                  style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: FONT,
                    border: `1px solid ${b.on ? GREEN : BORDER}`, background: b.on ? '#e8f5f0' : '#fff', color: b.on ? GREEN : '#999' }}>
                  {b.on ? 'On' : 'Off'}
                </button>
                {/* Remove */}
                <button onClick={() => remove(i)} title="Remove section"
                  style={{ fontSize: 16, lineHeight: 1, padding: '4px 8px', border: 'none', background: 'none', color: '#c9c9c9', cursor: 'pointer' }}>×</button>
              </div>
              {isDiscover && open && <DiscoverRowEditor block={b} index={i} quizOpts={quizOpts} onToggleTag={toggleDiscoverTag} onSetCount={setKindCount} />}
              {isPersonal && open && <PersonalRowEditor block={b} index={i} onSetCount={setKindCount} />}
            </div>
          );
        })}
      </div>

      {/* Add block — always visible so the affordance is discoverable, even when
          every built-in section is already in the list. */}
      <div style={{ marginBottom: 22 }}>
        <select onChange={e => { if (e.target.value) { add(e.target.value); e.target.value = ''; } }} defaultValue=""
          disabled={available.length === 0}
          style={{ ...inp(), width: '100%', opacity: available.length === 0 ? 0.55 : 1 }}>
          <option value="" disabled>+ Add a section…</option>
          {available.map(k => <option key={k} value={k}>{BLOCK_META[k].name}</option>)}
        </select>
        <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 6, lineHeight: 1.5 }}>
          {available.length === 0
            ? 'Every built-in section is already in this layout. Remove one (×) to free it up to re-add, or turn a section Off to hide it without removing it.'
            : 'These are the built-in sections not currently in this layout. A brand-new kind of section is a quick code change — just ask.'}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
        <button onClick={publish} disabled={busy}
          style={{ padding: '10px 20px', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: FONT, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Working…' : 'Publish'}
        </button>
        <button onClick={saveDraft} disabled={busy || !dirty}
          style={{ padding: '10px 18px', background: '#fff', color: '#555', border: `1px solid ${BORDER}`, borderRadius: 8, cursor: dirty ? 'pointer' : 'default', fontWeight: 600, fontSize: 13, fontFamily: FONT, opacity: (busy || !dirty) ? 0.5 : 1 }}>
          Save draft
        </button>
        {dirty && (
          <button onClick={discard} disabled={busy}
            style={{ padding: '10px 14px', background: 'none', color: '#999', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>
            Discard changes
          </button>
        )}
        {msg && <span style={{ fontSize: 13, color: msg.includes('Publish') ? GREEN : '#888', marginLeft: 'auto' }}>{msg}</span>}
      </div>
    </div>
  );
}

function arrowBtn(disabled) {
  return { fontSize: 9, lineHeight: 1, width: 22, height: 15, padding: 0, borderRadius: 4,
    border: `1px solid ${BORDER}`, background: '#fff', color: disabled ? '#ddd' : '#888',
    cursor: disabled ? 'default' : 'pointer', fontFamily: FONT };
}

// Expanded editor for the Discover container: for each of its three kinds, a
// "rows to show" count and a checklist of the eligible tags. Unchecking a tag
// hides that row; the count caps how many of the checked rows appear (they
// rotate daily within your picks). Mirrors what visitors actually see.
function DiscoverRowEditor({ block, index, quizOpts, onToggleTag, onSetCount }) {
  const hidden = new Set((block.settings && block.settings.hidden) || []);
  const counts = (block.settings && block.settings.counts) || {};
  if (!quizOpts) return <div style={{ padding: '10px 14px 16px 44px', fontSize: 12, color: '#aaa' }}>Loading rows…</div>;

  return (
    <div style={{ padding: '4px 14px 16px 44px', background: '#fbfbfa', borderTop: `1px dashed ${BORDER}` }}>
      <div style={{ fontSize: 11.5, color: '#999', margin: '10px 0 14px', lineHeight: 1.5 }}>
        Discover shows a stack of episode rows, one per topic. Uncheck any you don&rsquo;t want, and set how many rows of each kind appear (rows rotate daily within your picks). A topic with too few episodes won&rsquo;t show even if checked.
      </div>
      {DISCOVER_KINDS.map(({ kind, label }) => {
        const tags = (quizOpts[kind] || []);
        const count = counts[kind] !== undefined ? counts[kind] : DISCOVER_DEFAULT_COUNTS[kind];
        return (
          <div key={kind} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto', fontSize: 11, color: '#999' }}>
                show
                <input type="number" min={0} max={12} value={count} onChange={e => onSetCount(index, kind, e.target.value)}
                  style={{ width: 46, fontSize: 12, padding: '3px 6px', border: `1px solid ${BORDER}`, borderRadius: 5, fontFamily: FONT, textAlign: 'center' }} />
                rows
              </span>
            </div>
            {tags.length === 0
              ? <div style={{ fontSize: 12, color: '#bbb' }}>No options yet — add some in the Quiz Questions tab.</div>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map(tag => {
                    const shown = !hidden.has(tag);
                    return (
                      <button key={tag} onClick={() => onToggleTag(index, tag)}
                        title={shown ? 'Showing — click to hide this row' : 'Hidden — click to show this row'}
                        style={{ fontSize: 12, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', fontFamily: FONT, fontWeight: 500,
                          border: `1px solid ${shown ? GREEN : BORDER}`, background: shown ? '#e8f5f0' : '#f3f4f6',
                          color: shown ? GREEN : '#aaa', textDecoration: shown ? 'none' : 'line-through' }}>
                        {shown ? '✓ ' : ''}{tag}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        );
      })}
    </div>
  );
}

// Expanded editor for "Your carousels" (the personal block). Its rows come from
// each signed-in dentist's OWN profile answers, so there are no specific topics
// to check — only how many rows of each kind to show (0 hides that kind for
// everyone). This is the switch to turn off, e.g., the career-stage row globally.
function PersonalRowEditor({ block, index, onSetCount }) {
  const counts = (block.settings && block.settings.counts) || {};
  return (
    <div style={{ padding: '4px 14px 16px 44px', background: '#fbfbfa', borderTop: `1px dashed ${BORDER}` }}>
      <div style={{ fontSize: 11.5, color: '#999', margin: '10px 0 14px', lineHeight: 1.5 }}>
        These rows are personalized from each signed-in dentist&rsquo;s own profile answers, so you can&rsquo;t pick specific topics here — only how many rows of each kind to show. Set a kind to <strong>0</strong> to hide it for everyone.
      </div>
      {PERSONAL_KINDS.map(({ kind, label, eyebrow }) => {
        const count = counts[kind] !== undefined ? counts[kind] : PERSONAL_DEFAULT_COUNTS[kind];
        return (
          <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: count === 0 ? '#bbb' : '#111', textDecoration: count === 0 ? 'line-through' : 'none' }}>{label}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Shows as &ldquo;{eyebrow}…&rdquo;</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto', fontSize: 11, color: '#999' }}>
              show
              <input type="number" min={0} max={12} value={count} onChange={e => onSetCount(index, kind, e.target.value)}
                style={{ width: 46, fontSize: 12, padding: '3px 6px', border: `1px solid ${BORDER}`, borderRadius: 5, fontFamily: FONT, textAlign: 'center' }} />
              rows
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB GROUPS
// ══════════════════════════════════════════
// Each group becomes a labeled section in the top bar. Add new tabs by dropping
// them into the appropriate group — the nav and the content area both render
// from this single source of truth.
const TAB_GROUPS = [
  {
    group: 'Resources',
    tabs: [
      { label: 'Add Resource',  Component: AddResource },
      { label: 'Review Queue',  Component: ReviewQueue },
      { label: 'All Resources', Component: AllResources },
      { label: 'Claims',        Component: ClaimsTab },
    ],
  },
  {
    group: 'AI Agents',
    tabs: [
      { label: 'Run Research',     Component: RunResearch },
      { label: 'Deduplicate',      Component: Deduplication },
      { label: 'Score Resources',  Component: ScoringTab },
      { label: 'Harvest Episodes', Component: EpisodeArchive },
      { label: 'Tag Episodes',     Component: EpisodeTaggingTab },
    ],
  },
  {
    group: 'Site Content',
    tabs: [
      { label: 'Home Layout',      Component: HomeLayoutTab },
      { label: 'Featured Content', Component: FeaturedContent },
      { label: 'Quiz Questions',   Component: QuizOptionsTab },
    ],
  },
  {
    group: 'System',
    tabs: [
      { label: 'Users',    Component: Users },
      { label: 'Settings', Component: Settings },
    ],
  },
];

// Flattened list, in visual order, so we can address tabs by a single index.
const FLAT_TABS = TAB_GROUPS.flatMap(g => g.tabs);

// ══════════════════════════════════════════
//  MAIN ADMIN PAGE
// ══════════════════════════════════════════
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState(0);
  const ActiveTab = (FLAT_TABS[tab] || FLAT_TABS[0]).Component;

  useEffect(() => {
    fetch('/api/admin/resources', { method: 'GET' })
      .then(r => { if (r.ok || r.status !== 401) setAuthed(true); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthed(false);
  }

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f2eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: '#aaa' }}>Loading…</div>;
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2eb', fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '0 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        {/* Row 1: title + logout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>⚙ Admin</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" target="_blank" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Site</a>
            <button onClick={logout} style={{ fontSize: 12, padding: '5px 12px', border: `1px solid ${BORDER}`, borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#555', fontFamily: FONT }}>Log out</button>
          </div>
        </div>
        {/* Row 2: tabs, organized into labeled groups (scrollable) */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TAB_GROUPS.map((g, gi) => {
            // Running offset so each tab keeps a stable index into FLAT_TABS.
            const base = TAB_GROUPS.slice(0, gi).reduce((n, x) => n + x.tabs.length, 0);
            return (
              <div key={g.group} style={{
                display: 'flex', flexDirection: 'column', flexShrink: 0,
                paddingLeft: gi === 0 ? 0 : 14, marginLeft: gi === 0 ? 0 : 14,
                borderLeft: gi === 0 ? 'none' : `1px solid ${BORDER}`,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '6px 4px 2px' }}>
                  {g.group}
                </div>
                <div style={{ display: 'flex' }}>
                  {g.tabs.map((t, ti) => {
                    const i = base + ti;
                    return (
                      <button key={t.label} onClick={() => setTab(i)} style={{ padding: '6px 12px 10px', background: 'none', border: 'none', borderBottom: tab === i ? `2px solid ${GREEN}` : '2px solid transparent', color: tab === i ? '#111' : '#aaa', fontWeight: tab === i ? 600 : 400, cursor: 'pointer', fontSize: 13, fontFamily: FONT, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px 60px' }}>
        <ActiveTab />
      </div>
    </div>
  );
}
