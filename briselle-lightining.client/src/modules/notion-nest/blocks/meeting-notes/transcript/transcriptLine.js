/* ============================================================
   NotionNest — meeting-notes/transcript/transcriptLine.js
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T01
   Purpose: Canonical transcript-line shape and its hidden prefix.
            Pure functions only — no React, no DOM.

   Line shape:
     { id, ts, source, userName, content }
       ts       "yyyy-mm-dd hh:mm"  (local time, minute precision)
       source   TRANSCRIPT_SOURCE value
       userName speaker/author display name
       content  the spoken text

   Rendered prefix (hidden until the timestamp button is toggled):
     "2026-08-15 14:32 | Live Transcript | Suresh | "
   ============================================================ */

/** Where a line came from. Replaces the older inconsistent
    'Auto Transcribing' / 'recording' strings. */
export const TRANSCRIPT_SOURCE = {
  LIVE: 'Live Transcript',
  AUDIO_FILE: 'Audio File Transcript',
};

/** Legacy values seen in already-saved blocks, mapped forward. */
const LEGACY_SOURCE = {
  'Auto Transcribing': TRANSCRIPT_SOURCE.LIVE,
  recording: TRANSCRIPT_SOURCE.LIVE,
  live: TRANSCRIPT_SOURCE.LIVE,
  upload: TRANSCRIPT_SOURCE.AUDIO_FILE,
  file: TRANSCRIPT_SOURCE.AUDIO_FILE,
};

const pad = n => String(n).padStart(2, '0');

/** Format a Date (or parsable value) as "yyyy-mm-dd hh:mm" in local time. */
export function formatTs(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return formatTs(new Date());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         ` ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Pull a "yyyy-mm-dd hh:mm" out of whatever a legacy line carried:
 * ISO strings, "[HH:MM]" markers, or bracketed UTC stamps.
 */
function coerceTs(raw, fallbackDate) {
  if (!raw) return formatTs(fallbackDate);
  if (typeof raw === 'string') {
    const direct = raw.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    if (direct) return `${direct[1]} ${direct[2]}`;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return formatTs(parsed);
  }
  return formatTs(fallbackDate);
}

/**
 * Normalise any historical line into the canonical shape.
 * Safe to run repeatedly — already-canonical lines pass through unchanged.
 *
 * @param {object|string} line
 * @param {object} [opts] { index, userName, source, date }
 */
export function normalizeLine(line, opts = {}) {
  const { index = 0, userName = '', source, date } = opts;

  if (typeof line === 'string') {
    return {
      id: `tl_${index}`,
      ts: formatTs(date),
      source: source || TRANSCRIPT_SOURCE.LIVE,
      userName: userName || 'Unknown',
      content: line,
    };
  }

  const raw = line || {};
  const rawSource = raw.source || source || TRANSCRIPT_SOURCE.LIVE;
  return {
    id: raw.id || `tl_${index}`,
    ts: raw.ts || coerceTs(raw.timestamp, date),
    source: LEGACY_SOURCE[rawSource] || rawSource,
    // older lines encoded the speaker as "Name: text"
    userName: raw.userName || raw.speaker || splitSpeaker(raw.content).name || userName || 'Unknown',
    content: splitSpeaker(raw.content).text || raw.content || raw.text || '',
  };
}

/** Split a legacy "Speaker: text" string. Returns {name, text}. */
function splitSpeaker(content) {
  if (typeof content !== 'string') return { name: '', text: '' };
  const m = content.match(/^([^:]{1,40}):\s(.*)$/s);
  if (!m) return { name: '', text: content };
  if (/^unknown$/i.test(m[1].trim())) return { name: '', text: m[2] };
  return { name: m[1].trim(), text: m[2] };
}

/** Normalise a whole list. */
export function normalizeLines(lines, opts = {}) {
  if (!Array.isArray(lines)) return [];
  return lines.map((l, i) => normalizeLine(l, { ...opts, index: i }));
}

/**
 * The hidden prefix shown when the timestamp button is toggled on.
 * Returns '' when the line has nothing meaningful to show.
 */
export function formatPrefix(line) {
  if (!line) return '';
  const parts = [line.ts, line.source, line.userName].filter(Boolean);
  return parts.length ? `${parts.join(' | ')} | ` : '';
}

/** Plain-text export, always including the prefix. */
export function toPlainText(lines) {
  return normalizeLines(lines)
    .map(l => `${formatPrefix(l)}${l.content}`)
    .join('\n');
}

/** Build a new line at "now". */
export function createLine({ content, source = TRANSCRIPT_SOURCE.LIVE, userName = 'Unknown', id }) {
  return {
    id: id || `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: formatTs(new Date()),
    source,
    userName,
    content: content || '',
  };
}
