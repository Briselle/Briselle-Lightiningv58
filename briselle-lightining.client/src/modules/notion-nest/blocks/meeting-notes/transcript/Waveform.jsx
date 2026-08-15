/* ============================================================
   NotionNest — meeting-notes/transcript/Waveform.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: (new file — extracted from
   transcript/RecordingPill.jsx during BRIS-NN-MNB-T13)

   Task: BRIS-NN-MNB-T08/T13
   Purpose: The single live-audio waveform. Rendered both in the tab row
            and in the floating recorder, so the bar maths lives here
            once rather than being duplicated per call site.

   Contract:
     bar HEIGHT <- level (0..1), the live mic input level
     bar COUNT  <- sliderLevel (0..100), the mic volume adjuster
   ============================================================ */
import { useMemo } from 'react';

/** Map the mic slider (0..100) onto a bar count within [min..max]. */
export function barCountFor(sliderLevel, min = 10, max = 28) {
  const pct = Math.max(0, Math.min(100, Number(sliderLevel) || 0));
  return Math.round(min + (pct / 100) * (max - min));
}

/**
 * Deterministic bar profile: centre bars taller than the edges, with a
 * stable per-index wobble. Keyed on index rather than random so bars
 * differ from each other without jittering frame to frame.
 */
export function barHeights(count, level, maxPx = 26, basePx = 3) {
  const lvl = Math.max(0, Math.min(1, Number(level) || 0));
  const out = [];
  const half = (count - 1) / 2 || 1;
  for (let i = 0; i < count; i++) {
    const centre = 1 - Math.abs(i - half) / half;
    const profile = 0.35 + 0.65 * centre;
    const wobble = 0.75 + 0.25 * Math.abs(Math.sin(i * 12.9898));
    out.push(Math.max(basePx, Math.round(basePx + lvl * maxPx * profile * wobble)));
  }
  return out;
}

/**
 * @param {number} level       0..1 live mic level
 * @param {number} sliderLevel 0..100 mic volume adjuster
 * @param {'pill'|'inline'} size
 */
export function Waveform({ level, sliderLevel, size = 'pill' }) {
  const inline = size === 'inline';
  const count = barCountFor(sliderLevel, inline ? 12 : 10, inline ? 24 : 28);
  const heights = useMemo(
    () => barHeights(count, level, inline ? 14 : 26, inline ? 2 : 3),
    [count, level, inline]
  );

  return (
    <div className={`nnr-rec-wave${inline ? ' inline' : ''}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} className="nnr-rec-wave-bar" style={{ height: `${h}px` }} />
      ))}
    </div>
  );
}

export default Waveform;
