import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

const EpisodeBookmarkContext = createContext({});

// Holds the set of episode IDs the signed-in user has bookmarked, loaded once
// and shared across the app so the player button and the Saved page stay in
// sync. Mirrors bookmarks-context, but keyed to `episodes.id` (a bigint) and
// backed by the private, own-row-only `episode_bookmarks` table.
export function EpisodeBookmarkProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setIds(new Set()); setLoaded(true); return; }
    const { data } = await supabase
      .from('episode_bookmarks')
      .select('episode_id')
      .eq('user_id', user.id);
    setIds(new Set((data || []).map(b => b.episode_id)));
    setLoaded(true);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isEpisodeBookmarked = useCallback(id => ids.has(id), [ids]);

  // Optimistically flips the UI, then persists. Returns the new state.
  const toggleEpisodeBookmark = useCallback(async (episodeId) => {
    if (!user || !episodeId) return false;
    const had = ids.has(episodeId);
    setIds(prev => {
      const next = new Set(prev);
      if (had) next.delete(episodeId); else next.add(episodeId);
      return next;
    });
    try {
      if (had) {
        await supabase.from('episode_bookmarks').delete().eq('user_id', user.id).eq('episode_id', episodeId);
      } else {
        await supabase.from('episode_bookmarks').insert({ user_id: user.id, episode_id: episodeId });
      }
    } catch {
      // Roll back on failure
      setIds(prev => {
        const next = new Set(prev);
        if (had) next.add(episodeId); else next.delete(episodeId);
        return next;
      });
      return had;
    }
    return !had;
  }, [user, ids]);

  return (
    <EpisodeBookmarkContext.Provider value={{ episodeBookmarkIds: ids, count: ids.size, loaded, isEpisodeBookmarked, toggleEpisodeBookmark, refresh }}>
      {children}
    </EpisodeBookmarkContext.Provider>
  );
}

export const useEpisodeBookmarks = () => useContext(EpisodeBookmarkContext);
