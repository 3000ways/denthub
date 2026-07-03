import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
    return data;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const base = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '/';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: base },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function updateProfile(fields) {
    // Only send keys that are real columns on the row. `profile` was loaded via
    // select('*'), so its keys ARE the table's columns — filtering to them stops
    // a stray form field (one that isn't a column) from making Postgres reject
    // the ENTIRE update. That used to fail silently: the save was lost while the
    // UI still flashed "Saved ✓".
    const payload = profile
      ? Object.fromEntries(Object.entries(fields).filter(([k]) => k in profile))
      : fields;
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', user.id).select().single();
    if (error) {
      console.error('[updateProfile] failed:', error.message);
      return null; // keep the current profile rather than wiping it
    }
    if (data) setProfile(data);
    return data;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
