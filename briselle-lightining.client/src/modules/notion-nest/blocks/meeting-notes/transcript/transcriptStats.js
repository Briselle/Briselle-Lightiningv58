/* ============================================================
   NotionNest — meeting-notes/transcript/transcriptStats.js
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T20
   Purpose: Live transcript statistics. Pure functions only — no React,
            no DOM — so the numbers are testable and reusable.

   Sources combined:
     - normalized transcript lines (live speech + audio-file transcription)
     - audio file durations
     - live elapsed recording time
   ============================================================ */
import { getNativeLangDisplay, LANGUAGE_CODE_MAP } from '../constants';

/** Words in a string, tolerant of punctuation and multiple spaces. */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const m = text.trim().match(/[\p{L}\p{N}'’-]+/gu);
  return m ? m.length : 0;
}

/** Seconds -> "H:MM:SS" / "M:SS". */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * Total duration = live elapsed + every audio file's duration.
 * Audio durations are seconds; missing values contribute nothing rather
 * than NaN-poisoning the total.
 */
export function totalDurationSeconds(liveSeconds, audioFiles) {
  const live = Number(liveSeconds) || 0;
  const files = (audioFiles || []).reduce((sum, f) => sum + (Number(f?.duration) || 0), 0);
  return live + files;
}

/**
 * Average recognition confidence across lines that carry one.
 * Returns null when nothing reported confidence — the UI shows "—"
 * rather than inventing a number.
 */
export function averageConfidence(lines) {
  const vals = (lines || [])
    .map((l) => Number(l?.confidence))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Language label in its own script, e.g. "Tamil" -> "தமிழ்". */
export function nativeLanguageLabel(language) {
  if (!language) return null;
  return getNativeLangDisplay(language) || language;
}

/**
 * Compute every statistic in one pass.
 *
 * @param {object} input
 *   lines        normalized transcript lines
 *   audioFiles   block audio files
 *   liveSeconds  elapsed recording timer
 *   language     selected/detected language label
 * @returns {{key,label,value,title}[]} ready-to-render tags
 */
export function computeTranscriptStats({ lines = [], audioFiles = [], liveSeconds = 0, language = null } = {}) {
  const texts = lines.map((l) => l?.content || '');
  const words = texts.reduce((sum, t) => sum + countWords(t), 0);
  const chars = texts.reduce((sum, t) => sum + t.length, 0);
  const lineCount = lines.length;

  const participants = new Set(
    lines.map((l) => (l?.userName || '').trim()).filter((n) => n && n.toLowerCase() !== 'unknown')
  ).size;

  const avgWordsPerLine = lineCount ? words / lineCount : 0;
  const seconds = totalDurationSeconds(liveSeconds, audioFiles);
  const confidence = averageConfidence(lines);
  // words per minute over the captured duration
  const wpm = seconds > 0 ? (words / (seconds / 60)) : 0;
  const native = nativeLanguageLabel(language);

  return [
    { key: 'words', label: 'Words', value: words.toLocaleString(), title: 'Total words transcribed' },
    { key: 'chars', label: 'Chars', value: chars.toLocaleString(), title: 'Total characters' },
    { key: 'lines', label: 'Lines', value: lineCount.toLocaleString(), title: 'Transcript lines' },
    { key: 'participants', label: 'Participants', value: participants || '—', title: 'Distinct speakers identified' },
    { key: 'avg', label: 'Avg W/Ln', value: avgWordsPerLine ? avgWordsPerLine.toFixed(1) : '0', title: 'Average words per line' },
    { key: 'wpm', label: 'Pace', value: wpm ? `${Math.round(wpm)} wpm` : '—', title: 'Speaking pace, words per minute' },
    {
      key: 'confidence',
      label: 'Confidence',
      value: confidence === null ? '—' : `${Math.round(confidence * 100)}%`,
      title: confidence === null
        ? 'No recognition confidence reported for this transcript'
        : 'Average speech-recognition confidence',
    },
    { key: 'duration', label: 'Duration', value: formatDuration(seconds), title: 'Live recording plus audio file durations' },
    {
      key: 'language',
      label: 'Language',
      value: native || '—',
      lang: language ? (LANGUAGE_CODE_MAP[language] || undefined) : undefined,
      title: language ? `Transcription language: ${language}` : 'Language not set',
    },
  ];
}

/** True when there is anything worth showing statistics for. */
export function hasTranscriptContent(lines) {
  return Array.isArray(lines) && lines.some((l) => (l?.content || '').trim().length > 0);
}
