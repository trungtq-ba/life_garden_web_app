import { useEffect, useState, type RefObject } from 'react';

export function useAmbientPause(ref: RefObject<Element>): boolean {
  const [hidden, setHidden] = useState(() => document.hidden);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) setOffscreen(!last.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  return hidden || offscreen;
}
