import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useVotes } from '../lib/votes-context';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e5e7eb';

// Tap-to-start prompts for the empty state — they pre-fill the comment box with a
// natural lead-in so nobody faces a blank field.
const PROMPTS = [
  { chip: "Who's this best for?", starter: 'Best for ' },
  { chip: 'What did you learn?',  starter: 'My takeaway: ' },
  { chip: 'Would you recommend it?', starter: "I'd recommend this if " },
];

export function CommunitySection({ resourceId, kind = 'save', onSignInRequired }) {
  const { user } = useAuth();
  // "Helpful" votes are shared via the votes context so the count/state stay in
  // sync with the same 👍 on resource cards and the player bar.
  const { hasVoted, getCount, primeCount, toggleVote } = useVotes();
  const voteCount = getCount(resourceId) || 0;
  const voted = hasVoted(resourceId);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingVote, setLoadingVote] = useState(false);
  const [stats, setStats] = useState(null); // { bookmarks, pins, popularWith }
  const inputRef = useRef(null);

  const followVerb = kind === 'follow' ? 'Followed' : 'Saved';

  useEffect(() => {
    if (!resourceId) return;
    primeCount(resourceId);
    loadComments();
    fetch(`/api/community-stats?resourceId=${encodeURIComponent(resourceId)}`)
      .then(r => r.json())
      .then(d => { if (d && !d.error) setStats(d); })
      .catch(() => {});
  }, [resourceId, user]);

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name, role, specialty, npi_verified, province_state), comment_upvotes(user_id)')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });
    setComments(data || []);
  }

  async function handleVote() {
    if (!user) { onSignInRequired(); return; }
    setLoadingVote(true);
    await toggleVote(resourceId);
    setLoadingVote(false);
  }

  async function submitComment() {
    if (!user) { onSignInRequired(); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    await supabase.from('comments').insert({ resource_id: resourceId, user_id: user.id, text: commentText.trim() });
    setCommentText('');
    await loadComments();
    setSubmitting(false);
  }

  async function toggleCommentUpvote(commentId, alreadyUpvoted) {
    if (!user) { onSignInRequired(); return; }
    if (alreadyUpvoted) {
      await supabase.from('comment_upvotes').delete().eq('comment_id', commentId).eq('user_id', user.id);
    } else {
      await supabase.from('comment_upvotes').insert({ comment_id: commentId, user_id: user.id });
    }
    loadComments();
  }

  function usePrompt(starter) {
    if (!user) { onSignInRequired(); return; }
    setCommentText(starter);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const displayName = (p) => {
    if (!p || !p.full_name) return 'Dental Professional';
    const parts = p.full_name.split(' ');
    return parts[0] + (parts[1] ? ` ${parts[1][0]}.` : '');
  };

  const bookmarks = stats?.bookmarks || 0;
  const pins = stats?.pins || 0;
  const popularWith = stats?.popularWith || [];
  const showStrip = bookmarks > 0 || pins > 0;
  const hasComments = comments.length > 0;

  const chipStyle = {
    fontSize: 12.5, color: '#444', background: '#fff', border: `1px solid ${BORDER}`,
    padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: FONT,
  };

  const inviteBlock = (
    <div style={{ textAlign: 'center', padding: '4px 0 6px' }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>💬</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY, marginBottom: 5 }}>
        No takes yet — be the first.
      </div>
      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5, maxWidth: 380, margin: '0 auto 16px' }}>
        Is this worth a dental professional&rsquo;s time? A quick thought helps the next person decide.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {PROMPTS.map(p => (
          <button key={p.chip} onClick={() => usePrompt(p.starter)} style={chipStyle}>{p.chip}</button>
        ))}
      </div>
    </div>
  );

  const commentInput = user && (
    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
      <input
        ref={inputRef}
        value={commentText}
        onChange={e => setCommentText(e.target.value.slice(0, 280))}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submitComment(); }}
        placeholder="Share your experience with this resource…"
        style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, fontFamily: FONT, outline: 'none', color: '#111' }}
      />
      <button onClick={submitComment} disabled={!commentText.trim() || submitting} style={{
        padding: '9px 16px', borderRadius: 8, border: 'none',
        background: commentText.trim() ? GREEN : '#e5e7eb', color: commentText.trim() ? '#fff' : '#aaa',
        fontSize: 13, fontWeight: 600, cursor: commentText.trim() ? 'pointer' : 'default', fontFamily: FONT, whiteSpace: 'nowrap',
      }}>
        {submitting ? '…' : 'Post'}
      </button>
    </div>
  );

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 16, paddingTop: 16 }}>
      {/* ── Social proof: helpful count + the Mark-as-helpful control ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: (showStrip || popularWith.length) ? 12 : 4 }}>
        {voteCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>{voteCount}</span>
            <span style={{ fontSize: 13, color: '#666' }}>
              {voteCount === 1 ? 'dental professional' : 'dental professionals'} found this helpful
            </span>
          </div>
        )}
        <button onClick={handleVote} disabled={loadingVote} style={{
          marginLeft: voteCount > 0 ? 'auto' : 0,
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20,
          border: `1px solid ${voted ? GREEN : BORDER}`, background: voted ? '#E8F5F0' : '#fff', color: voted ? GREEN : '#555',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT, transition: 'all 0.15s',
        }}>
          <span style={{ fontSize: 15 }}>👍</span>{voted ? 'Helpful' : 'Mark as helpful'}
        </button>
      </div>

      {/* ── Engagement strip (only the non-zero parts) ── */}
      {showStrip && (
        <div style={{ fontSize: 12.5, color: '#888', marginBottom: popularWith.length ? 12 : 4 }}>
          {[bookmarks > 0 && `${followVerb} by ${bookmarks}`, pins > 0 && `Pinned by ${pins}`].filter(Boolean).join('  ·  ')}
        </div>
      )}

      {/* ── Popular with (specialty mix of the people engaging) ── */}
      {popularWith.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa' }}>Popular with</span>
          {popularWith.map(s => (
            <span key={s} style={{ fontSize: 12, color: GREEN, background: '#E8F5F0', padding: '3px 11px', borderRadius: 20 }}>{s}</span>
          ))}
        </div>
      )}

      <div style={{ height: 1, background: '#f0efe9', margin: '16px 0 0' }} />

      {/* ── Discussion: comments, or an inviting empty state ── */}
      {hasComments ? (
        <>
          {commentInput}
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {comments.map(c => {
              const p = c.profiles;
              const upvoteCount = c.comment_upvotes?.length || 0;
              const userUpvoted = c.comment_upvotes?.some(u => u.user_id === user?.id);
              return (
                <div key={c.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{displayName(p)}</span>
                      {p?.npi_verified && <span style={{ fontSize: 10, background: GREEN, color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>✓ Verified</span>}
                      {(p?.specialty || p?.role) && (
                        <span style={{ fontSize: 11, color: '#888' }}>
                          {p.specialty || p.role}{p?.province_state ? ` · ${p.province_state}` : ''}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5, marginBottom: 8 }}>{c.text}</div>
                  <button onClick={() => toggleCommentUpvote(c.id, userUpvoted)} style={{
                    fontSize: 11, color: userUpvoted ? GREEN : '#aaa', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: FONT, padding: 0, fontWeight: userUpvoted ? 600 : 400,
                  }}>
                    ▲ {upvoteCount > 0 ? upvoteCount : ''} Helpful
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 16 }}>
          {inviteBlock}
          {commentInput}
        </div>
      )}
    </div>
  );
}
