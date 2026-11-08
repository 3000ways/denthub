// The visitor's "I'm a…" pick from the home-page hero, stored in the browser so
// it works signed-out and survives visits (same pattern as the AI-voice
// preference). A signed-in dentist whose profile already has a specialty gets
// that as the default until they tap something else. A custom event keeps every
// mounted reader in sync when the pick changes anywhere on the page.

import { useState, useEffect, useCallback } from 'react';
import { findPick, pickKeyForProfileSpecialty } from './specialties';

const KEY = 'tdc_specialty';
const EVT = 'tdc-specialty-pick';

export function getStoredPick() {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return findPick(v) ? v : null;
  } catch { return null; }
}

// [pickKey, setPickKey]. `profileSpecialty` (optional) seeds the default for a
// signed-in visitor who has never tapped the picker.
export function useSpecialtyPick(profileSpecialty) {
  const [pick, setPickState] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setPickState(getStoredPick());
    sync();
    setHydrated(true);
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, []);

  // Default from the profile only when nothing has ever been stored.
  useEffect(() => {
    if (!hydrated || getStoredPick()) return;
    const fromProfile = pickKeyForProfileSpecialty(profileSpecialty);
    if (fromProfile) setPickState(fromProfile);
  }, [hydrated, profileSpecialty]);

  const setPick = useCallback((next) => {
    const v = findPick(next) ? next : null;
    try {
      if (v) window.localStorage.setItem(KEY, v);
      else window.localStorage.removeItem(KEY);
    } catch {}
    window.dispatchEvent(new Event(EVT));
    setPickState(v);
  }, []);

  return [pick, setPick];
}
