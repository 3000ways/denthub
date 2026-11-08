import { useEffect } from 'react';

// Calls onEscape when the Escape key is pressed, while `active` is true.
export function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, onEscape]);
}
