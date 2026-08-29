/* ============================================================
   NotionNest — meeting-notes/transcript/TranscriptStatsBar.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (rewritten for BRIS-NN-MNB-T24)

   Task: BRIS-NN-MNB-T20 / T24
   Purpose: Collapsible transcript insights beneath the transcript
            toolbar. Pinned stats stay visible on the collapsed header;
            the rest appear when expanded. Max 5 pins.

   All arithmetic lives in transcriptStats.js; this file only renders.
   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { useMemo, useState, useCallback } from 'react';
import {
  Type, Hash, List, Users, Ruler, Gauge, BadgeCheck, Clock, Globe,
  ChevronDown, ChevronRight, Pin, PinOff, BarChart3,
} from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { computeTranscriptStats, hasTranscriptContent } from './transcriptStats';

const ICONS = {
  words: Type, chars: Hash, lines: List, participants: Users,
  avg: Ruler, wpm: Gauge, confidence: BadgeCheck, duration: Clock, language: Globe,
};

export const MAX_PINNED = 5;

export function TranscriptStatsBar() {
  const {
    normalizedTranscriptLines,
    audioFiles,
    recordingTimer,
    selectedLanguage,
    translatedLanguage,
    transcriptSubTab,
    pinnedInsights,
    setPinnedInsights,
    saveProp,
  } = useMeetingNotes();

  const [collapsed, setCollapsed] = useState(true);
  const [warning, setWarning] = useState('');

  const stats = useMemo(
    () => computeTranscriptStats({
      lines: normalizedTranscriptLines,
      audioFiles,
      liveSeconds: recordingTimer,
      language: transcriptSubTab === 'translated' && translatedLanguage
        ? translatedLanguage
        : selectedLanguage,
    }),
    [normalizedTranscriptLines, audioFiles, recordingTimer, selectedLanguage, translatedLanguage, transcriptSubTab]
  );

  /* Pins persist on the block. Default to a useful trio rather than an
     empty header, so the collapsed state still says something. */
  const pinned = Array.isArray(pinnedInsights) && pinnedInsights.length
    ? pinnedInsights
    : ['words', 'duration', 'participants'];

  const togglePin = useCallback((key) => {
    const isPinned = pinned.includes(key);
    if (!isPinned && pinned.length >= MAX_PINNED) {
      setWarning(`You can pin up to ${MAX_PINNED} insights. Unpin one first.`);
      setTimeout(() => setWarning(''), 2600);
      return;
    }
    const next = isPinned ? pinned.filter(k => k !== key) : [...pinned, key];
    setPinnedInsights?.(next);
    saveProp('pinnedInsights', next);
    setWarning('');
  }, [pinned, setPinnedInsights, saveProp]);

  if (!hasTranscriptContent(normalizedTranscriptLines)) return null;

  const byKey = Object.fromEntries(stats.map(s => [s.key, s]));
  const headerStats = pinned.map(k => byKey[k]).filter(Boolean);

  const Tag = ({ stat, showPin }) => {
    const Icon = ICONS[stat.key] || Hash;
    const isPinned = pinned.includes(stat.key);
    return (
      <span className={`nnr-stat-tag${isPinned ? ' pinned' : ''}`} role="listitem" title={stat.title}>
        <Icon size={13} className="nnr-stat-icon" />
        <span className="nnr-stat-label">{stat.label}</span>
        <span className="nnr-stat-value" lang={stat.lang}>{stat.value}</span>
        {showPin && (
          <button
            type="button"
            className="nnr-stat-pin"
            onClick={(e) => { e.stopPropagation(); togglePin(stat.key); }}
            aria-label={isPinned ? `Unpin ${stat.label}` : `Pin ${stat.label}`}
            title={isPinned ? 'Unpin' : 'Pin to header'}
          >
            {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
        )}
      </span>
    );
  };

  return (
    <div className={`nnr-insights${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="nnr-insights-header"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <BarChart3 size={14} className="nnr-insights-header-icon" />
        <span className="nnr-insights-title">Insights</span>

        {/* Pinned stats ride along on the collapsed header only — when the
            panel is open the full set is right below, so repeating them
            in the header is noise. */}
        {collapsed && (
          <span className="nnr-insights-header-tags" role="list">
            {headerStats.map(stat => <Tag key={stat.key} stat={stat} showPin={false} />)}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="nnr-insights-body">
          {warning && <div className="nnr-insights-warning" role="alert">{warning}</div>}
          <div className="nnr-stats-bar" role="list" aria-label="Transcript statistics">
            {stats.map(stat => <Tag key={stat.key} stat={stat} showPin />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default TranscriptStatsBar;
