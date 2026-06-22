import { useState, useEffect, useCallback } from 'react';

const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const FONT = "'Inter', system-ui, -apple-system, sans-serif";

const TABS = ['Add Resource', 'Review Queue', 'All Resources', 'Run Research', 'Auto-Tag', 'Deduplication', 'Users', 'Settings'];

const RESOURCE_TYPES = ['Podcast', 'YouTube Channel', 'Website', 'Book', 'Course', 'Software', 'Community', 'Conference', 'Other'];

const CATEGORIES = [
  'General Dentistry Podcasts','Endodontic Podcasts','Orthodontic Podcasts','Periodontic Podcasts',
  'Oral Surgery Podcasts','Pediatric Dentistry Podcasts','Prosthodontic Podcasts',
  'Dental Student Podcasts','Practice Management Podcasts','Dental Technology Podcasts',
  'General Dentistry YouTube','Endodontic YouTube','Orthodontic YouTube','Periodontic YouTube',
  'Oral Surgery YouTube','Dental Student YouTube',
  'Continuing Education Websites','Dental Books','Dental Conferences','Dental Communities',
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
const VALID_TYPES_RQ    = ['Podcast','YouTube','Book','Course','Software','Community','Conference','Coaching','Mastermind','Other'];

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
function RunResearch() {
  const [category, setCategory] = useState('');
  const [theme, setTheme] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptEdited, setPromptEdited] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const THEMES = ['Learning & Education', 'Technology & Software', 'Coaching & Mentorship', 'Community & Network', 'Specialty Resources', 'Training & Career', 'Practice & Business', 'Wellbeing & Lifestyle'];

  function buildDefaultPrompt(cat, th) {
    if (!cat) return '';
    return `You are a dental industry researcher. Search the web to find 10 high-quality, currently active resources in the category "${cat}"${th ? ` (theme: "${th}")` : ''} for dental professionals.

Use your web search to verify each resource is real and active. Search for things like "best ${cat} for dentists" to find genuine results.

Requirements:
- Only include resources confirmed via web search to exist and be currently active.
- Be specific to the category — a general dentistry podcast does not belong in "Orthodontic Podcasts".
- Prefer resources with real audiences: listed on Apple Podcasts/Spotify, active YouTube channels with subscribers, established websites.
- Include the direct homepage or podcast page URL, not a search result link.
- [Existing resources in your database will be excluded automatically]

For each resource, also score it on these 5 dimensions (0–100 scale):
- ExpertScore: reputation among dental experts and peers
- CommunityScore: community engagement and user sentiment
- PopularityScore: reach and audience size
- RecencyScore: how current and actively maintained it is
- ClinicalDepthScore: depth of clinical relevance and practical application

For each resource, also assign:
- Specialty: an array of dental specialties this resource targets (use only values from this list, must have at least one): ["General Dentistry","Endodontics","Orthodontics","Periodontics","Oral Surgery","Prosthodontics","Pediatric Dentistry","Oral Radiology","Dental Anesthesiology","Pain"]. If the resource is relevant to all dentists or is cross-specialty, include every specialty it applies to — do NOT leave this empty.
- Topic: an array of business/professional topics this resource covers (use only values from this list, can be multiple, must have at least one): ["Clinical","Technology","Leadership","Marketing","Finance & Investment","Practice Growth","Team & HR","Wellness"]

After searching, return ONLY a valid JSON array of objects, each with:
- Name (string)
- URL (string — verified homepage URL)
- Description (string — 1-2 sentences on what makes it valuable)
- Type (one of: Podcast, YouTube, Website, Book, Course, Software, Community, Conference, Other)
- ExpertScore (number 0–100)
- CommunityScore (number 0–100)
- PopularityScore (number 0–100)
- RecencyScore (number 0–100)
- ClinicalDepthScore (number 0–100)
- Specialty (array of strings from the list above, or empty array)
- Topic (array of strings from the list above, at least one)

Return ONLY the JSON array, no other text.`;
  }

  function handleCategoryChange(val) {
    setCategory(val);
    if (!promptEdited) setCustomPrompt(buildDefaultPrompt(val, theme));
  }

  function handleThemeChange(val) {
    setTheme(val);
    if (!promptEdited) setCustomPrompt(buildDefaultPrompt(category, val));
  }

  function handlePromptChange(val) {
    setCustomPrompt(val);
    setPromptEdited(true);
  }

  function resetPrompt() {
    setCustomPrompt(buildDefaultPrompt(category, theme));
    setPromptEdited(false);
  }

  async function run() {
    if (!category) { setError('Select a category'); return; }
    setRunning(true); setResult(null); setError('');
    try {
      const r = await fetch('/api/admin/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, theme, customPrompt: promptEdited ? customPrompt : undefined }) });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setResult(d);
    } catch (e) { setError(e.message); }
    finally { setRunning(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>AI Research Agent</h2>
        <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 500 }}>Check Perplexity credits ↗</a>
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Choose a category and let the AI find new resources. Results land in the Review Queue as <strong>🤖 AI Agent / Pending</strong> for your approval.</p>

      <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
          Category *
          <select value={category} onChange={e => handleCategoryChange(e.target.value)} style={{ ...inp(), marginTop: 4 }}>
            <option value="">— select a category —</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
          Theme (optional)
          <select value={theme} onChange={e => handleThemeChange(e.target.value)} style={{ ...inp(), marginTop: 4 }}>
            <option value="">— any —</option>
            {THEMES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {/* Collapsible prompt editor */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setShowPrompt(s => !s)} style={{ fontSize: 12, color: '#888', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: FONT, width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Edit prompt{promptEdited ? ' (modified)' : ''}</span>
          <span>{showPrompt ? '▲' : '▼'}</span>
        </button>
        {showPrompt && (
          <div style={{ marginTop: 8 }}>
            {promptEdited && (
              <button onClick={resetPrompt} style={{ fontSize: 11, padding: '4px 12px', border: `1px solid ${BORDER}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#555', fontFamily: FONT, marginBottom: 8 }}>
                ↺ Reset to default
              </button>
            )}
            <textarea
              value={customPrompt || (category ? buildDefaultPrompt(category, theme) : '')}
              onChange={e => handlePromptChange(e.target.value)}
              placeholder="Select a category above to generate the prompt…"
              style={{ ...inp(), fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, minHeight: 300, resize: 'vertical', color: category ? '#333' : '#bbb' }}
            />
          </div>
        )}
      </div>

      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>{error}</div>}

      <button onClick={run} disabled={running || !category} style={{ width: '100%', padding: '13px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: running ? 0.6 : 1 }}>
        {running ? '🤖 Researching… (takes ~30s)' : '🤖 Run AI Research'}
      </button>

      {result && (
        <div style={{ marginTop: 24 }}>
          {result.status === 'no_ai_key' ? (
            <div style={{ padding: '16px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
              <strong>No AI key configured.</strong> {result.message}
            </div>
          ) : (
            <div>
              <div style={{ padding: '12px 16px', background: '#d1fae5', borderRadius: 8, fontSize: 13, color: '#065f46', marginBottom: 16 }}>
                ✓ Found {result.added} resources — added to Review Queue as AI Agent / Pending.
                {result.skipped?.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: '#047857' }}>Skipped {result.skipped.length}: {result.skipped.map(s => `${s.name} (${s.reason})`).join(', ')}</div>}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(result.found || []).map((r, i) => (
                  <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '12px 16px', background: '#fff' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111', marginBottom: 2 }}>{r.Name}</div>
                    <a href={r.URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: GREEN, marginBottom: 4, display: 'block', textDecoration: 'none', wordBreak: 'break-all' }}>{r.URL}</a>
                    <div style={{ fontSize: 12, color: '#777' }}>{r.Description}</div>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{r.Type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  TAB 5 — Auto-Tag (AI-assisted Goals/Career tagging)
// ══════════════════════════════════════════
function AutoTag() {
  const [remaining, setRemaining] = useState(null);
  const [batchSize, setBatchSize] = useState(12);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [results, setResults] = useState([]); // most-recent batch first
  const [totalTagged, setTotalTagged] = useState(0);

  async function loadRemaining() {
    try {
      const r = await fetch('/api/admin/suggest-tags');
      const d = await r.json();
      if (typeof d.remaining === 'number') setRemaining(d.remaining);
    } catch { /* ignore */ }
  }

  useEffect(() => { loadRemaining(); }, []);

  async function runBatch() {
    setRunning(true); setError(''); setDone(false);
    try {
      const r = await fetch('/api/admin/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: batchSize }),
      });
      const d = await r.json();
      if (d.status === 'no_ai_key') { setError(d.message); return; }
      if (d.error) { setError(d.error); return; }
      setResults(prev => [...(d.results || []), ...prev]);
      setTotalTagged(t => t + (d.processed || 0));
      if (typeof d.remaining === 'number') setRemaining(d.remaining);
      if (d.done || d.processed === 0) setDone(true);
    } catch (e) { setError(e.message); }
    finally { setRunning(false); }
  }

  const Chips = ({ values, color, bg }) => (
    !values || values.length === 0
      ? <span style={{ fontSize: 11, color: '#bbb' }}>—</span>
      : <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
          {values.map(v => (
            <span key={v} style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 10 }}>{v}</span>
          ))}
        </span>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>AI Auto-Tagger</h2>
        <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 500 }}>Check Perplexity credits ↗</a>
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.6 }}>
        Reads each resource's description and suggests <strong>Goals / Outcomes</strong> and <strong>Career Stage</strong> tags
        (only from the fixed lists — no made-up tags). Suggestions are saved with <strong>Needs Tag Review</strong> turned on,
        so nothing is final until you check it. Review in Airtable by filtering on <em>Needs Tag Review = checked</em>, fix the
        chips, then uncheck the box.
      </p>

      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#555' }}>
            Untagged resources remaining:{' '}
            <strong style={{ color: '#111' }}>{remaining == null ? '…' : remaining}</strong>
            {totalTagged > 0 && <span style={{ color: '#999' }}> · tagged this session: {totalTagged}</span>}
          </div>
          <label style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
            Batch size
            <input type="number" min={1} max={25} value={batchSize}
              onChange={e => setBatchSize(Math.min(25, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              style={{ ...inp(), width: 64, padding: '6px 8px' }} />
          </label>
        </div>
      </div>

      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>{error}</div>}
      {done && remaining === 0 && <div style={{ marginBottom: 12, padding: '10px 14px', background: '#d1fae5', color: '#065f46', borderRadius: 6, fontSize: 13 }}>✓ All published resources have been tagged. Review them in Airtable.</div>}

      <button onClick={runBatch} disabled={running || remaining === 0} style={{ width: '100%', padding: '13px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: FONT, opacity: (running || remaining === 0) ? 0.6 : 1 }}>
        {running ? '🏷️ Tagging… (takes ~20–40s)' : `🏷️ Tag next ${batchSize}`}
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Tagged this session ({results.length})</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {results.map((r, i) => (
              <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '12px 16px', background: '#fff' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#111', marginBottom: 8 }}>{r.name}</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa', minWidth: 70 }}>Goals</span>
                    <Chips values={r.goals} color="#065f46" bg="#d1fae5" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa', minWidth: 70 }}>Career</span>
                    <Chips values={r.careerStages} color="#5b21b6" bg="#ede9fe" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6 }}>Deduplication</h2>
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

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setUsers(d.users || []);
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
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
//  MAIN ADMIN PAGE
// ══════════════════════════════════════════
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState(0);

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
        {/* Row 2: tabs (scrollable) */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: tab === i ? `2px solid ${GREEN}` : '2px solid transparent', color: tab === i ? '#111' : '#aaa', fontWeight: tab === i ? 600 : 400, cursor: 'pointer', fontSize: 13, fontFamily: FONT, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px 60px' }}>
        {tab === 0 && <AddResource />}
        {tab === 1 && <ReviewQueue />}
        {tab === 2 && <AllResources />}
        {tab === 3 && <RunResearch />}
        {tab === 4 && <AutoTag />}
        {tab === 5 && <Deduplication />}
        {tab === 6 && <Users />}
        {tab === 7 && <Settings />}
      </div>
    </div>
  );
}
