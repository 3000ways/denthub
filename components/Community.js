import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';

const FONT = "'Inter', sans-serif";
const GREEN = '#2D6A4F';
const BORDER = '#e5e7eb';

export function CommunitySection({ resourceId, onSignInRequired }) {
  const { user, profile } = useAuth();
  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [loadingVote, setLoadingVote] = useState(false);

  useEffect(() => {
    if (!resourceId) return;
    loadVotes();
    loadComments();
  }, [resourceId, user]);

  async function loadVotes() {
    const { count } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('resource_id', resourceId);
    setVoteCount(count || 0);
    if (user) {
      const { data } = await supabase.from('votes').select('id').eq('resource_id', resourceId).eq('user_id', user.id).single();
      setHasVoted(!!data);
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name, role, specialty, npi_verified), comment_upvotes(user_id)')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });
    setComments(data || []);
  }

  async function toggleVote() {
    if (!user) { onSignInRequired(); return; }
    setLoadingVote(true);
    if (hasVoted) {
      await supabase.from('votes').delete().eq('resource_id', resourceId).eq('user_id', user.id);
      setHasVoted(false);
      setVoteCount(v => v - 1);
    } else {
      await supabase.from('votes').insert({ resource_id: resourceId, user_id: user.id });
      setHasVoted(true);
      setVoteCount(v => v + 1);
    }
    setLoadingVote(false);
  }

  async function submitComment() {
    if (!user) { onSignInRequired(); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    await supabase.from('comments').insert({ resource_id: resourceId, user_id: user.id, text: commentText.trim() });
    setCommentText('');
    await loadComments();
    setShowComments(true);
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

  const displayName = (p) => {
    if (!p) return 'Dental Professional';
    const name = p.full_name ? p.full_name.split(' ')[0] + (p.full_name.split(' ')[1] ? ` ${p.full_name.split(' ')[1][0]}.` : '') : 'Anonymous';
    return name;
  };

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 16, paddingTop: 14 }}>
      {/* Vote row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={toggleVote} disabled={loadingVote} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
          borderRadius: 20, border: `1px solid ${hasVoted ? GREEN : BORDER}`,
          background: hasVoted ? GREEN : '#fff', color: hasVoted ? '#fff' : '#555',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT,
          transition: 'all 0.15s',
        }}>
          <span style={{ fontSize: 15 }}>👍</span>
          {hasVoted ? 'Helpful' : 'Mark as helpful'}
        </button>
        {voteCount > 0 && (
          <span style={{ fontSize: 13, color: '#888' }}>
            {voteCount} {voteCount === 1 ? 'dental professional' : 'dental professionals'} found this helpful
          </span>
        )}
        {comments.length > 0 && (
          <button onClick={() => setShowComments(v => !v)} style={{
            marginLeft: 'auto', fontSize: 12, color: '#888', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: FONT,
          }}>
            {showComments ? 'Hide' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
          </button>
        )}
      </div>

      {/* Comment input */}
      {user && (
        <div style={{ display: 'flex', gap: 8, marginBottom: showComments || comments.length ? 12 : 0 }}>
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value.slice(0, 280))}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
            placeholder="Share your experience with this resource…"
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${BORDER}`,
              fontSize: 13, fontFamily: FONT, outline: 'none', color: '#111',
            }}
          />
          <button onClick={submitComment} disabled={!commentText.trim() || submitting} style={{
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: commentText.trim() ? GREEN : '#e5e7eb',
            color: commentText.trim() ? '#fff' : '#aaa',
            fontSize: 13, fontWeight: 600, cursor: commentText.trim() ? 'pointer' : 'default',
            fontFamily: FONT, whiteSpace: 'nowrap',
          }}>
            {submitting ? '…' : 'Post'}
          </button>
        </div>
      )}

      {!user && comments.length === 0 && (
        <button onClick={onSignInRequired} style={{
          fontSize: 13, color: '#888', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: FONT, padding: 0, marginBottom: 12,
        }}>
          + Add a comment
        </button>
      )}

      {/* Comments list */}
      {showComments && comments.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {comments.map(c => {
            const p = c.profiles;
            const upvoteCount = c.comment_upvotes?.length || 0;
            const userUpvoted = c.comment_upvotes?.some(u => u.user_id === user?.id);
            return (
              <div key={c.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{displayName(p)}</span>
                    {p?.npi_verified && <span style={{ fontSize: 10, background: GREEN, color: '#fff', padding: '1px 6px', borderRadius: 10, marginLeft: 6, fontWeight: 600 }}>✓ Verified</span>}
                    {p?.role && <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>{p.specialty || p.role}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5, marginBottom: 8 }}>{c.text}</div>
                <button onClick={() => toggleCommentUpvote(c.id, userUpvoted)} style={{
                  fontSize: 11, color: userUpvoted ? GREEN : '#aaa', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: FONT, padding: 0,
                  fontWeight: userUpvoted ? 600 : 400,
                }}>
                  ▲ {upvoteCount > 0 ? upvoteCount : ''} Helpful
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
