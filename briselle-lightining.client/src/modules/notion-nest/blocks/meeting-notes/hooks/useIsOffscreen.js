/* ============================================================
   NotionNest — meeting-notes/hooks/useIsOffscreen.js
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T73
   Purpose: Report whether an element has scrolled out of the viewport,
            so a floating fallback can take over only when the real
            control is no longer reachable.

   Used by BOTH the recording pill (T73) and the floating mini-player
   (T74). One observer implementation, two consumers — a second copy is
   exactly what this hook exists to prevent.
   ============================================================ */
import { useEffect, useState } from 'react';

/**
 * @param {object}  ref      ref on the element to watch
 * @param {boolean} active   false disables the observer entirely, so an
 *                           inactive feature costs nothing
 * @param {object}  options
 * @param {number}  options.minVisible  fraction of the element that must stay
 *                                      visible to count as on-screen.
 *                                      0 (default) = only fully gone counts.
 *                                      1 = any clipping counts as offscreen.
 * @param {string}  options.rootMargin  margin applied to the viewport box
 * @returns {boolean} true when the element is NOT (sufficiently) visible
 */
export function useIsOffscreen(ref, active = true, options = {}) {
  const { minVisible = 0, rootMargin = '0px' } = options;
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    /* Inactive, no node, or no IntersectionObserver (older embedded
       webviews): report on-screen. The floating fallback then never
       appears, which degrades to today's behaviour rather than to a
       permanently stuck overlay. */
    if (!active || !ref?.current || typeof IntersectionObserver === 'undefined') {
      setOffscreen(false);
      return undefined;
    }

    const node = ref.current;

    /* BRIS-NN-MNB-T89: `threshold` decides when the callback FIRES, not
       what isIntersecting reports — isIntersecting stays true while any
       sliver of the element is still in view. Watching it alone meant the
       fallback only appeared once the element had scrolled ENTIRELY past
       the edge, so on a slow scroll it arrived seconds after the control
       had stopped being usable. Comparing the ratio against minVisible is
       what makes "partially clipped" count. */
    const epsilon = 0.001;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const hidden = !entry.isIntersecting
          || entry.intersectionRatio < (minVisible - epsilon);
        setOffscreen(hidden);
      },
      /* Both crossings need a threshold entry or the callback never fires
         for the one we care about. */
      { threshold: minVisible > 0 ? [0, minVisible] : [0], rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, active, minVisible, rootMargin]);

  /* Never report offscreen while inactive — a stale true would leave the
     fallback pinned to the screen after the feature is switched off. */
  return active ? offscreen : false;
}

export default useIsOffscreen;
