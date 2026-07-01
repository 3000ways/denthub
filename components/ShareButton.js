import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const SITE = 'https://thedentalcommute.com';

// Share icon (outline "share nodes").
function ShareIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  );
}

// Minimal monochrome glyphs for the desktop popover rows.
function RowIcon({ kind }) {
  const p = { width: 17, height: 17, viewBox: '0 0 24 24', style: { flexShrink: 0 } };
  if (kind === 'x') return <svg {...p} fill="#555"><path d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.6l-5.2-6.8L5.8 22H2.5l7.7-8.8L2 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.1 3.9H5.2L17.7 20z"/></svg>;
  if (kind === 'linkedin') return <svg {...p} fill="#555"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.2.8 24 1.77 24h20.45c.98 0 1.78-.8 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z"/></svg>;
  if (kind === 'facebook') return <svg {...p} fill="#555"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>;
  if (kind === 'email') return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
  if (kind === 'copy') return <svg {...p} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>;
  return null;
}

// Share control used on cards, the resource page, and the player bar.
// On touch devices with a native share sheet it invokes navigator.share
// (texts, WhatsApp, X, etc.). Otherwise it opens a small popover with explicit
// X / LinkedIn / Facebook / Email buttons + copy-link. Every share points at
// the resource's own page so the link carries Open Graph name + logo.
//   variant="icon"    → bare icon button (cards, player)
//   variant="labeled" → icon + "Share" pill (resource page hero)
//   context           → optional episode/extra text folded into the share copy
export function ShareButton({ resourceId, episodeId, episodeTitle, name, type, context, variant = 'icon', size = 15 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef(null);

  // Share the specific episode when we have one; otherwise the resource page.
  const url = episodeId ? `${SITE}/episode/${episodeId}` : `${SITE}/resource/${resourceId}`;
  const shareTitle = episodeId
    ? `${episodeTitle} — The Dental Commute`
    : `${name} — The Dental Commute`;
  const shareText = episodeId
    ? `${episodeTitle}${name ? ` — ${name}` : ''} · The Dental Commute`
    : context
      ? `${context} (${name}) — found on The Dental Commute`
      : `${name} — ${type ? `a ${type} ` : ''}ranked on The Dental Commute`;

  const canNative = typeof navigator !== 'undefined' && !!navigator.share && (navigator.maxTouchPoints || 0) > 0;

  // Close the popover on any outside click, scroll, or resize (fixed coords
  // would otherwise go stale).
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (canNative) {
      try { await navigator.share({ title: shareTitle, text: shareText, url }); } catch {}
      return;
    }
    if (open) { setOpen(false); return; }
    const r = btnRef.current.getBoundingClientRect();
    const W = 210;
    const left = Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8));
    const below = window.innerHeight - r.bottom;
    // Drop up when there isn't room below (e.g. the player bar at screen bottom).
    const dropUp = below < 250;
    setPos({ left, top: dropUp ? undefined : r.bottom + 6, bottom: dropUp ? window.innerHeight - r.top + 6 : undefined, width: W });
    setOpen(true);
  }

  function openShare(href) {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=520');
    setOpen(false);
  }

  async function copyLink(e) {
    e.preventDefault(); e.stopPropagation();
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => { setCopied(false); setOpen(false); }, 1100); }
    catch { setOpen(false); }
  }

  const rows = [
    { kind: 'x', label: 'Share on X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}` },
    { kind: 'linkedin', label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { kind: 'facebook', label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { kind: 'email', label: 'Email a colleague', href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + url)}` },
  ];

  const trigger = variant === 'labeled' ? (
    <button ref={btnRef} onClick={handleClick} title="Share this resource"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px',
        borderRadius: 6, border: `1px solid ${BORDER}`, background: '#fff', color: '#555',
        cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT, transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = GREEN}
      onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
      <ShareIcon size={16} color="#555" />
      Share
    </button>
  ) : (
    <button ref={btnRef} onClick={handleClick} title="Share this resource" aria-label="Share this resource"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 30, borderRadius: 6, border: `1px solid ${BORDER}`,
        background: '#fff', color: '#888', cursor: 'pointer', flexShrink: 0, padding: 0,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.color = GREEN; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = '#888'; }}>
      <ShareIcon size={size} color="currentColor" />
    </button>
  );

  const popover = open && pos && typeof document !== 'undefined' ? createPortal(
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width,
        background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
        boxShadow: '0 8px 30px rgba(0,0,0,0.14)', padding: 6, zIndex: 10000, fontFamily: FONT,
      }}>
      {rows.map(row => (
        <button key={row.kind} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openShare(row.href); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 10px',
            border: 'none', background: 'none', borderRadius: 7, cursor: 'pointer',
            fontSize: 13, color: '#333', fontFamily: FONT, textAlign: 'left',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f2eb'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <RowIcon kind={row.kind} />{row.label}
        </button>
      ))}
      <button onClick={copyLink}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 10px',
          border: 'none', background: copied ? '#E8F5F0' : 'none', borderRadius: 7, cursor: 'pointer',
          fontSize: 13, color: GREEN, fontWeight: 600, fontFamily: FONT, textAlign: 'left', marginTop: 2,
          borderTop: `1px solid ${BORDER}`,
        }}
        onMouseEnter={e => { if (!copied) e.currentTarget.style.background = '#f5f2eb'; }}
        onMouseLeave={e => { if (!copied) e.currentTarget.style.background = 'none'; }}>
        <RowIcon kind="copy" />{copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>,
    document.body
  ) : null;

  return <>{trigger}{popover}</>;
}
