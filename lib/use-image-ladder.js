import { useCallback, useState } from 'react';

// True for an <img> that has finished and has nothing to show: it failed, or the
// server sent a 1x1 placeholder (Amazon and Open Library do this for missing
// covers, with a normal "200 OK"). SVGs are skipped because some browsers report
// a width of 0 for a perfectly good SVG logo.
export function isBlankImage(img) {
  if (!img.complete) return false;
  if (/\.svg([?#]|$)/i.test(img.getAttribute('src') || '')) return false;
  return img.naturalWidth <= 1 && img.naturalHeight <= 1;
}

// Shows the first image in `candidates` that hasn't failed. Spread `imgProps`
// onto the <img>; when `src` is null, render the letter tile / placeholder.
export function useImageLadder(candidates) {
  const [failed, setFailed] = useState([]);

  const markFailed = useCallback((url) => {
    if (url) setFailed(prev => (prev.includes(url) ? prev : [...prev, url]));
  }, []);

  // A server-rendered image can fail before React attaches onError, so the error
  // is never reported. Check once when the element first appears.
  const ref = useCallback((node) => {
    if (node && isBlankImage(node)) markFailed(node.getAttribute('src'));
  }, [markFailed]);

  const onError = useCallback((e) => markFailed(e.currentTarget.getAttribute('src')), [markFailed]);
  const onLoad = useCallback((e) => {
    if (isBlankImage(e.currentTarget)) markFailed(e.currentTarget.getAttribute('src'));
  }, [markFailed]);

  const src = (candidates || []).find(url => url && !failed.includes(url)) || null;
  return { src, imgProps: { src, ref, onError, onLoad } };
}
