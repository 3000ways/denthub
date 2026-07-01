import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

const VotesContext = createContext({});

// Shared "helpful" vote state, so the same 👍 shows the same live count/state
// everywhere it appears (resource cards, the player bar, the resource page).
// Mirrors the bookmarks context: the signed-in user's own votes load once into
// a Set; per-resource totals are cached and kept in sync across every button.
// Backed by the existing `votes` table (resource_id + user_id) that the
// resource-page Community section already writes to.
export function VotesProvider({ children }) {
  const { user } = useAuth();
  const [votedIds, setVotedIds] = useState(() => new Set()); // resources this user voted for
  const [counts, setCounts] = useState({});                  // { [resourceId]: total }

  // Load the user's own votes once on sign-in (one query, shared app-wide).
  const refresh = useCallback(async () => {
    if (!user) { setVotedIds(new Set()); return; }
    const { data } = await supabase
      .from('votes')
      .select('resource_id')
      .eq('user_id', user.id);
    setVotedIds(new Set((data || []).map(v => v.resource_id)));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const hasVoted = useCallback(rid => votedIds.has(rid), [votedIds]);
  const getCount = useCallback(rid => counts[rid], [counts]);

  // Fetch a resource's total the first time a button for it mounts. Cached so
  // multiple buttons for the same resource share one number.
  const primeCount = useCallback(async (rid) => {
    if (!rid || counts[rid] !== undefined) return;
    const { count } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', rid);
    setCounts(prev => (prev[rid] !== undefined ? prev : { ...prev, [rid]: count || 0 }));
  }, [counts]);

  // Optimistically flip the UI and the count, then persist. Returns new state.
  const toggleVote = useCallback(async (rid) => {
    if (!user) return false;
    const had = votedIds.has(rid);
    setVotedIds(prev => {
      const next = new Set(prev);
      if (had) next.delete(rid); else next.add(rid);
      return next;
    });
    setCounts(prev => ({ ...prev, [rid]: Math.max(0, (prev[rid] || 0) + (had ? -1 : 1)) }));
    try {
      if (had) {
        await supabase.from('votes').delete().eq('user_id', user.id).eq('resource_id', rid);
      } else {
        await supabase.from('votes').insert({ user_id: user.id, resource_id: rid });
      }
    } catch {
      // Roll back on failure
      setVotedIds(prev => {
        const next = new Set(prev);
        if (had) next.add(rid); else next.delete(rid);
        return next;
      });
      setCounts(prev => ({ ...prev, [rid]: Math.max(0, (prev[rid] || 0) + (had ? 1 : -1)) }));
      return had;
    }
    return !had;
  }, [user, votedIds]);

  return (
    <VotesContext.Provider value={{ hasVoted, getCount, primeCount, toggleVote }}>
      {children}
    </VotesContext.Provider>
  );
}

export const useVotes = () => useContext(VotesContext);
