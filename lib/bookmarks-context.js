import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

const BookmarkContext = createContext({});

// Holds the set of resource IDs the signed-in user has bookmarked, loaded once
// and shared across the whole app so individual cards don't each hit the DB.
export function BookmarkProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setIds(new Set()); setLoaded(true); return; }
    const { data } = await supabase
      .from('bookmarks')
      .select('resource_id')
      .eq('user_id', user.id);
    setIds(new Set((data || []).map(b => b.resource_id)));
    setLoaded(true);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isBookmarked = useCallback(rid => ids.has(rid), [ids]);

  // Optimistically flips the UI, then persists to Supabase. Returns the new state.
  const toggleBookmark = useCallback(async (rid) => {
    if (!user) return false;
    const had = ids.has(rid);
    setIds(prev => {
      const next = new Set(prev);
      if (had) next.delete(rid); else next.add(rid);
      return next;
    });
    try {
      if (had) {
        await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('resource_id', rid);
      } else {
        await supabase.from('bookmarks').insert({ user_id: user.id, resource_id: rid });
      }
    } catch {
      // Roll back on failure
      setIds(prev => {
        const next = new Set(prev);
        if (had) next.add(rid); else next.delete(rid);
        return next;
      });
      return had;
    }
    return !had;
  }, [user, ids]);

  return (
    <BookmarkContext.Provider value={{ bookmarkIds: ids, count: ids.size, loaded, isBookmarked, toggleBookmark, refresh }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export const useBookmarks = () => useContext(BookmarkContext);
