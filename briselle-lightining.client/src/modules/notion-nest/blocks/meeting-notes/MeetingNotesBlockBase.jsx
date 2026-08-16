/* ============================================================
   NotionNest — meeting-notes/MeetingNotesBlockBase.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L235-L3209

   Task: BRIS-NN-MNB-R06
   Purpose: Owns all MeetingNotesBlock state and publishes it through
            MeetingNotesContext. Layout only; panels live in sub-files.
   ============================================================ */
/* ============================================================
   NotionNest — blocks/MeetingNotesBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-08-15
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks/MeetingNotesBlock.jsx
   ============================================================ */
import { useRef, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { usePageContext } from '../../core/PageContext';
import { Plus, Languages, Search, ListTodo, ExternalLink, AlertTriangle, FileText, Bell, Database, Edit3, Variable, Settings, Trash2, GripVertical, ChevronDown, X, Check, Mic, MicOff, Calendar, Users, Lightbulb, Copy, Volume2, VolumeX, MoreHorizontal, MoreVertical, List, Clock, UserPlus, MessageSquare, Download, Share2, Play, Pause, Sliders, Upload, Globe, BookOpen, Link, ArrowRight, Video, MessageCircle, HelpCircle, Info, Speaker, Megaphone, MegaphoneOff, AudioLines, Shield, ChevronUp, ChevronRight, Loader2, Zap, RefreshCw, Sparkles, Minus, PenLine, PlusCircle, Briefcase, Headphones, ThumbsUp, ThumbsDown, Pin, Eraser , FileAudio } from 'lucide-react';
/* BRIS-NN-MNB-H01: date-tag domain logic (pure, no UI) */
import {
  TAG_MODES,
  CALENDAR_SOURCE,
  DATE_FORMATS,
  buildPresets,
  resolveTagToDate,
  describeSelection,
} from '../shared/meetingDateTags';
/* BRIS-NN-MNB-H11: reusable Notion-parity date picker */
import { NotionDatePicker } from '../shared/NotionDatePicker';
import { ZivaApiRouterService } from '../../../ziva-chat-module/src/zivaApiRouterService.js';
import ZivaApiSettingsModal from '../../../ziva-chat-module/src/components/ZivaApiSettingsModal.jsx';
import AudioController from '../../../utility-modules/audio-controller/AudioController.jsx';
import { supabase } from '../../../../utils/supabase';

/* BRIS-NN-MNB-R01..R06: extracted collaborators */
import { MeetingNotesContext } from './context/MeetingNotesContext';
import { MeetingHeader } from './header/MeetingHeader';
import { ParticipantsPanel } from './header/ParticipantsPanel';
import { MeetingTabBar } from './tabs/MeetingTabBar';
import { SummaryTab } from './tabs/SummaryTab';
import { NotesTab } from './tabs/NotesTab';
import { TranscriptPanel } from './transcript/TranscriptPanel';
import { TranscriptInsights } from './transcript/TranscriptInsights';
import { InstructionsMenu } from './config/InstructionsMenu';
import { useDismissOnOutside } from './hooks/useDismissOnOutside';
import { TranscriptToolbar } from './transcript/TranscriptToolbar';
import { MeetingFooter } from './footer/MeetingFooter';
import { SummaryActions } from './summary/SummaryActions';
import { MeetingModals } from './config/MeetingModals';
import { EditPromptModal } from './config/EditPromptModal';
import { DEFAULT_INSTRUCTION_PROMPTS, LANGUAGE_CODE_MAP, NATIVE_LANGUAGE_DISPLAY, getNativeLangDisplay, resolveRecognitionLang, LANGUAGE_AUTO, INDIAN_LANGUAGES } from './constants';
/* BRIS-NN-MNB-T01/T02: canonical transcript line shape + hidden prefix */
import { FileService } from '../../../utility-modules/upload-module/FileService';
import { normalizeLines, formatPrefix, formatTs, TRANSCRIPT_SOURCE } from './transcript/transcriptLine';
import { bufferToWavBlob } from './audioUtils';

export const MeetingNotesBlockBase = memo(function MeetingNotesBlockBase({ block }) {
  /* BRIS-NN-MNB-M06: block-level actions for the slider menu. Move to /
     Delete were rendered but had no handler at all, so the rows were inert. */
  const {
    updateBlockProperty,
    deleteBlock,
    setDeleteConfirm,
    moveBlockToTop,
    showContextMenu,
  } = usePageContext();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [showTranscribeMenu, setShowTranscribeMenu] = useState(false);
  /* BRIS-NN-MNB-T57: files handed to the audio player bar. */
  const [playQueue, setPlayQueue] = useState([]);
  /* BRIS-NN-MNB-T39: mode submenu under Resume transcription. */
  const [showResumeSubmenu, setShowResumeSubmenu] = useState(false);
  const calendarWrapRef = useRef(null);
  /* BRIS-NN-MNB-T21: dismiss the 3-dot menu when the user clicks away. */
  const moreMenuWrapRef = useRef(null);
  /* BRIS-NN-MNB-T42: anchors the split-button mode menu for dismiss. */
  const transcribeWrapRef = useRef(null);
  const translateWrapRef = useRef(null);
  const [BR, setBR] = useState(null);
  useEffect(() => { import('../../core/BlockRenderer').then(m => setBR(() => m.default)); }, []);

  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [timer, setTimer] = useState(0);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  /* TASK-MN-TABVIS-007: Default viewMode: summary if summary exists, else transcript */
  const [viewMode, setViewMode] = useState(block.summary ? 'summary' : 'transcript');
  const [transcriptSubTab, setTranscriptSubTab] = useState('original');
  const [translatedTranscriptLines, setTranslatedTranscriptLines] = useState(block.translatedTranscriptLines || []);
  const [translatedTranscription, setTranslatedTranscription] = useState(block.translatedTranscription || '');
  const [translatedSummary, setTranslatedSummary] = useState(block.translatedSummary || '');
  const [translatedLanguage, setTranslatedLanguage] = useState(block.translatedLanguage || null);



  /* ── Universal Translation & LLM Log States (Jul 22 - Aug 15 Feature) ── */
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [isTranslationMinimized, setIsTranslationMinimized] = useState(false);
  const [translateFrom, setTranslateFrom] = useState('auto');
  const [translateTo, setTranslateTo] = useState('English');
  const [showTranslatePopover, setShowTranslatePopover] = useState(false);
  const [llmLogs, setLlmLogs] = useState({ request: null, response: null });

  /* TASK-MN-INS-008: Insights Accordion & Pinned Insights State */
  const [insightsCollapsed, setInsightsCollapsed] = useState(block.insightsCollapsed !== false);
  /* BRIS-NN-MNB-T27: which instruction is the menu default, and which
     presets the user has removed from their own menu. */
  /* BRIS-NN-MNB-T29b: the Transcript tab stays hidden until the user has
     actually started transcribing (or a transcript already exists), so a
     fresh block shows only Notes plus the Start control. Persisted so the
     tab does not disappear again after reload. */
  const [transcriptStarted, setTranscriptStarted] = useState(!!block.transcriptStarted);
  const [defaultInstruction, setDefaultInstruction] = useState(block.defaultInstruction || 'Auto');
  const [hiddenInstructions, setHiddenInstructions] = useState(block.hiddenInstructions || []);
  const [instructionIcons, setInstructionIcons] = useState(block.instructionIcons || {});
  const [pinnedInsights, setPinnedInsights] = useState(block.pinnedInsights || ['duration', 'words', 'lines', 'participants']);

  /* TASK-MN-EDITOR-003: Unified NotionNest Block Editor for Instructions */
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);
  const [unifiedModalMode, setUnifiedModalMode] = useState('edit');
  const [unifiedModalInstruction, setUnifiedModalInstruction] = useState('Auto');
  const [unifiedModalPrompt, setUnifiedModalPrompt] = useState('');

  /* TASK-MN-ZIVA-021B: Ziva API Settings Modal & Generation Status */
  const [showZivaApiSettingsModal, setShowZivaApiSettingsModal] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [dynamicConfirmModalConfig, setDynamicConfirmModalConfig] = useState(null);
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [aiNotesCollapsed, setAiNotesCollapsed] = useState(false);
  const [transcriptCollapsed, setTranscriptCollapsed] = useState(true);
  const [editingAiNotes, setEditingAiNotes] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);

  /* DAM ARCHITECTURE: Query enterprise_files DB table on mount to restore audio files & active URL */
  useEffect(() => {
    let isMounted = true;
    async function loadAudioFromDam() {
      try {
        if (typeof supabase === 'undefined') return;
        const query = supabase
          /* BRIS-NN-MNB-T58: scope to THIS block, server-side.
             Previously this pulled every MeetingNotesBlock row in the table
             (a blockTypeId filter, not a blockId one) and filtered in JS —
             so unrelated blocks' audio leaked in and the count drifted. */
          .from('enterprise_files')
          .select('*')
          .eq('source_info->>blockId', block.id);
        const { data, error } = await query;
        if (!error && data && data.length > 0 && isMounted) {
          const dbFiles = [];
          data.forEach(row => {
            const sourceInfo = row.source_info || {};
            const custom = row.custom_metadata?.properties || {};
            const isBlockMatch =
              row.data_entity_id === block.id ||
              row.data_object_id === block.id ||
              sourceInfo.blockId === block.id ||
              custom.blockId === block.id ||
              custom.objectId === block.id;
            if (!isBlockMatch) return;
            const status = row.status_information || {};
            if (!status.isDeleted && status.status !== 'Deleted' && status.status !== 'FailedStorage') {
              const fileInfo = row.file_information || {};
              const phys = row.physical_metadata || {};
              dbFiles.push({
                id: row.id,
                name: fileInfo.name || row.original_filename || 'Audio Recording',
                url: phys.file_url || row.file_url || row.cdn_url || '',
                type: fileInfo.mime_type || 'audio/webm',
                size: phys.size_bytes || row.file_size || 0,
                /* BRIS-NN-MNB-T59: duration_seconds is not written by the
                   upload path — it lives in custom metadata. Reading only
                   the column is why every DAM file showed 0:00. */
                duration: Number(
                  row.duration_seconds
                  ?? phys.duration_seconds
                  ?? custom.durationSeconds
                  ?? row.custom_metadata?.durationSeconds
                  ?? 0
                ) || 0,
                fileId: row.id,
                timestamp: row.created_at,
                createdAt: row.created_at
              });
            }
          });
          if (dbFiles.length > 0) {
            /* BRIS-NN-MNB-T60: a recording exists twice — once as the local
               record written at stop time, once as its enterprise_files row.
               Their ids differ, so matching on id alone counted both and the
               total drifted on every refresh. Match on fileId (the DAM id
               the local record stores) and fall back to name, then enrich
               the local record rather than appending a duplicate. */
            setAudioFiles(prev => {
              const merged = prev.map(local => {
                const match = dbFiles.find(db =>
                  (local.fileId && db.fileId === local.fileId) ||
                  (local.name && db.name === local.name) ||
                  /* T68: last resort — same block, created within 60s of
                     each other is the same recording seen twice. */
                  (local.timestamp && db.timestamp &&
                   Math.abs(new Date(local.timestamp) - new Date(db.timestamp)) < 60000)
                );
                return match
                  ? { ...local, ...match, id: local.id, data: local.data, url: local.url || match.url }
                  : local;
              });
              const claimed = new Set(
                merged.map(m => m.fileId).filter(Boolean)
              );
              dbFiles.forEach(db => {
                if (!claimed.has(db.fileId)) merged.push(db);
              });
              return merged;
            });
            if (!audioUrl && dbFiles[0]?.url) {
              setAudioUrl(dbFiles[0].url);
            }
          }
        }
      } catch (err) {
        console.warn('Notice: enterprise_files table fetch deferred:', err);
      }
    }
    loadAudioFromDam();
    return () => { isMounted = false; };
  }, [block.id, audioUrl]);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [showInstructionsSubmenu, setShowInstructionsSubmenu] = useState(false);
  const [showConsentSubmenu, setShowConsentSubmenu] = useState(false);
  const [customInstructions, setCustomInstructions] = useState([]);
  const [showBulbInfo, setShowBulbInfo] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [showAudioSourceMenu, setShowAudioSourceMenu] = useState(false);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [showOutputDeviceMenu, setShowOutputDeviceMenu] = useState(false);
  const [audioFiles, setAudioFiles] = useState(() => {
    /* TASK-ZIVA-003: Initialize audioFiles from block or localStorage */
    try {
      const cached = localStorage.getItem(`nn_audio_files_${block.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return block.audioFiles || [];
  });
  const [showAudioFilesDropdown, setShowAudioFilesDropdown] = useState(false);
  const [selectedAudioFileIds, setSelectedAudioFileIds] = useState([]);
  const [currentPlayingAudioId, setCurrentPlayingAudioId] = useState(null);

  /* ── Full Enterprise States (Restored from 7,000-Line Master Suite) ── */
  const [isLastModifier, setIsLastModifier] = useState(true);
  const [audioSttTeaserText, setAudioSttTeaserText] = useState('');
  const [audioSttProgressPct, setAudioSttProgressPct] = useState(0);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [aiBatchEngagementLogs, setAiBatchEngagementLogs] = useState([]);
  const [readingStatusMessage, setReadingStatusMessage] = useState('');
  const [consentWizardStep, setConsentWizardStep] = useState('consent');
  const [customInstructionName, setCustomInstructionName] = useState('');
  const [customInstructionPrompt, setCustomInstructionPrompt] = useState('');
  const [instructionPrompts, setInstructionPrompts] = useState(() => {
    return block.instructionPrompts || block.properties?.instructionPrompts || {
      'Auto': 'You are Ziva AI Meeting Notes Architect. Generate a comprehensive, high-quality structured meeting summary in clean markdown.',
      'Executive': 'Generate an executive summary focusing on strategic decisions, leadership takeaways, and high-level KPIs.',
      'Action Items': 'Extract all direct action items, task assignees, due dates, and follow-up deliverables.',
      'Detailed': 'Provide a comprehensive breakdown with extensive section-by-section details, technical notes, and discussions.',
      'Technical': 'Focus on technical architecture, systems, code decisions, engineering blockers, and APIs.'
    };
  });
  const [showFooterInstructionPopover, setShowFooterInstructionPopover] = useState(false);
  const footerInstructionWrapRef = useRef(null);
  const [summaryDataState, setSummaryDataState] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micVolumeSliderLevel, setMicVolumeSliderLevel] = useState(100);
 /* BUG-009: Moved before clearAllLines */
  const [isTranscribingAudioFile, setIsTranscribingAudioFile] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [transcriptHasOverflow, setTranscriptHasOverflow] = useState(false);
  const [editingLineId, setEditingLineId] = useState(null);
  const [micVolume, setMicVolume] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showUploadPopover, setShowUploadPopover] = useState(false);
  const [uploadPopoverPos, setUploadPopoverPos] = useState({ x: 0, y: 0 });
  const dateInputRef = useRef(null);
  const timerRef = useRef(null);
  const downloadWrapRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const playbackTimerRef = useRef(null);
  const aiInsightsAutoRef = useRef(false);
  const recStartTimeRef = useRef(0);
  const settingsWrapRef = useRef(null);
  const bulbWrapRef = useRef(null);
  const audioUploadRef = useRef(null);
  const audioSourceWrapRef = useRef(null);
  const outputDeviceWrapRef = useRef(null);
  const wakeWordRef = useRef(null);
  const transcriptLinesContainerRef = useRef(null);
  const settingsPopoverRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioFilesWrapRef = useRef(null);
  const uploadPopoverWrapRef = useRef(null);
  const addManualInProgressRef = useRef(false); /* BUG-002: Guard for manual add in progress */

  const [title, setTitle] = useState(block.title || 'Meeting');
  const [date, setDate] = useState(block.date || new Date().toISOString().split('T')[0]);
  const participants = block.participants || [];
  const mode = block.mode || 'auto';
  const includeSummary = block.includeSummary !== false;
  const includeBullets = block.includeBullets !== false;
  const includeActionItems = block.includeActionItems !== false;
  const includeFollowUp = block.includeFollowUp !== false;
  const summary = block.summary || '';
  const bulletPoints = block.bulletPoints || [];
  const [transcription, setTranscription] = useState(block.transcription || '');

  /* ── Refs to avoid stale closures in recognition callbacks ── */
  const transcriptionRef = useRef(block.transcription || '');
  const transcriptLinesRef = useRef(block.transcriptLines || []);
  const contentRef = useRef(block.content || '');
  const modeRef = useRef(mode);
  const recordingRef = useRef(false);
  const speakerRef = useRef('');
  var startRecRef = useRef(null);
  var stopRecRef = useRef(null);

  const [displayTranscriptLines, setDisplayTranscriptLines] = useState(block.transcriptLines || []);

  /* BUG-002: Guard sync so it doesn't overwrite during manual add in progress */
  useEffect(() => {
    if (addManualInProgressRef.current) return;
    setDisplayTranscriptLines(block.transcriptLines || []);
    transcriptLinesRef.current = block.transcriptLines || [];
  }, [block.transcriptLines]);

  /* TASK-ZIVA-003: Keep audioFiles in sync with block properties & localStorage */
  useEffect(() => {
    if (block.audioFiles && Array.isArray(block.audioFiles) && block.audioFiles.length > 0) {
      setAudioFiles(block.audioFiles);
      try {
        localStorage.setItem(`nn_audio_files_${block.id}`, JSON.stringify(block.audioFiles));
      } catch (e) {}
    }
  }, [block.audioFiles, block.id]);

  /* TASK-ZIVA-002: Auto-scroll live streaming transcript into view */
  useEffect(() => {
    if (recording || interimText) {
      if (transcriptLinesContainerRef.current) {
        transcriptLinesContainerRef.current.scrollTop = transcriptLinesContainerRef.current.scrollHeight;
      }
    }
  }, [displayTranscriptLines, interimText, recording]);

  // Keep refs in sync with props
  useEffect(() => {
    transcriptionRef.current = block.transcription || '';
    transcriptLinesRef.current = block.transcriptLines || [];
    contentRef.current = block.content || '';
    modeRef.current = mode;
    recordingRef.current = recording;
    speakerRef.current = currentSpeaker;
  }, [block.transcription, block.transcriptLines, block.content, mode, recording, currentSpeaker]);

  // Created At: 2026-07-20 | Last Modified: 2026-07-20 | Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L2552
  const transcriptLines = useMemo(() => {
    if (displayTranscriptLines && displayTranscriptLines.length > 0) {
      return displayTranscriptLines;
    }
    if (!transcription) return [];
    
    // Parse transcription lines like: "[00:05] Speaker: Hello"
    const lines = transcription.split('\n').filter(l => l.trim().length > 0);
    return lines.map((line, idx) => {
      const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      let content = line;
      let timestamp = `[${date} 00:00:00 UTC]`;
      if (match) {
        const timePart = match[1];
        timestamp = `[${date} ${timePart.length === 5 ? '00:' + timePart : timePart} UTC]`;
        content = match[2];
      }
      // Ensure content has speaker prefix for consistent rendering
      if (content && !content.includes(': ')) {
        content = `Unknown: ${content}`;
      }
      return {
        id: `parsed_${idx}`,
        timestamp: timestamp,
        source: 'Auto Transcribing',
        content: content
      };
    });
  }, [displayTranscriptLines, transcription, date]);
  const aiInsights = block.aiInsights || [];
  const notesContent = block.content || '';
  const finalNotes = block.finalNotes || '';
  const hasAudio = !!block.audioData;
  const consentEnabled = block.consentEnabled !== false;
  const audioSource = block.audioSource || 'both';
  const selectedOutputDevice = block.selectedOutputDevice || 'default';
  const selectedLanguage = block.selectedLanguage || 'English (US)';
  const [selectedInstruction, setSelectedInstruction] = useState(block.selectedInstruction || 'Auto');
  const [selectedWizardInstruction, setSelectedWizardInstruction] = useState('Auto');
  const [consentMode, setConsentMode] = useState(block.consentMode || 'manual');

  const formatTime = (s) => {
    if (isNaN(s) || s === null || s === undefined) return '00:00';
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = Math.floor(s % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatFullTimestamp = (date) => {
    var d = date || new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    var offsetMin = -d.getTimezoneOffset();
    var sign = offsetMin >= 0 ? '+' : '-';
    var absOff = Math.abs(offsetMin);
    var offH = Math.floor(absOff / 60);
    var offM = absOff % 60;
    var tzStr = offM > 0 ? 'UTC' + sign + offH + '.' + offM : 'UTC' + sign + offH;
    return '[' + yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi + ':' + ss + ' ' + tzStr + ']';
  };

  const saveProp = useCallback((key, val) => updateBlockProperty(block.id, key, val), [block.id, updateBlockProperty]);

  /* ── Speech Recognition + MediaRecorder ── */
  /* BRIS-NN-MNB-T16: transcription modes offered by the split button.
     A ref (not state) because startRecording reads it synchronously in the
     same tick it is set — state would still hold the previous value. */
  const captureAudioRef = useRef(true);
  /* Reactive mirror of the ref so the live header can show the mode. */
  const [captureAudio, setCaptureAudio] = useState(true);

  const TRANSCRIBE_MODES = {
    LIVE_RECORD: 'live-record',   // live transcript + audio saved to DAM
    LIVE_ONLY: 'live-only',       // live transcript, nothing recorded
    UPLOAD: 'upload',             // transcribe an existing audio file
  };

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser. Use Chrome or Edge.'); return; }

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    /* BRIS-NN-MNB-T03: honour the user's language choice. This was hardcoded
       to en-US, which silently ignored the language selector. */
    recog.lang = resolveRecognitionLang(selectedLanguage);
    recog.onresult = (event) => {
      let final = '';
      let interim = '';
      var stopCmd = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          var transcript = event.results[i][0].transcript;
          var lower = transcript.toLowerCase();
          if (lower.indexOf('ziva stop') !== -1 || lower.indexOf('ziva stop recording') !== -1) {
            stopCmd = true;
          } else {
            final += transcript + ' ';
          }
        } else interim += event.results[i][0].transcript;
      }
      if (stopCmd && stopRecRef.current) { stopRecRef.current(); return; }
      if (final) {
        const elapsed = Date.now() - recStartTimeRef.current;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const ts = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
        const speaker = speakerRef.current || 'Unknown';
        const lineContent = final.trim();
        const line = `\n${ts} ${speaker}: ${lineContent}`;
        const newTrans = (transcriptionRef.current || '') + line;
        transcriptionRef.current = newTrans.trim();
        saveProp('transcription', newTrans.trim());

        var newTimestamp = formatFullTimestamp();
        const newLineObj = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          timestamp: newTimestamp,
          source: 'Auto Transcribing',
          content: `${speaker}: ${lineContent}`
        };
        const newLines = [...transcriptLinesRef.current, newLineObj];
        transcriptLinesRef.current = newLines;
        setDisplayTranscriptLines(newLines); /* BUG-005: Immediate UI update */
        saveProp('transcriptLines', newLines);
        /* BUG-005: Auto-scroll transcript container to bottom */
        requestAnimationFrame(() => {
          if (transcriptLinesContainerRef.current) {
            transcriptLinesContainerRef.current.scrollTop = transcriptLinesContainerRef.current.scrollHeight;
          }
        });

        if (modeRef.current === 'auto') {
          const newContent = (contentRef.current || '') + line;
          contentRef.current = newContent.trim();
          saveProp('content', newContent.trim());
        }
      }
      setInterimText(interim);
    };
    /* ═══════════════════════════════════════════════════════════════
       BRIS-NN-MNB-T05: keep transcribing until the user says stop.

       The Web Speech API ends the session constantly on its own — on
       silence, on short network blips, on internal restarts. Treating
       every error as fatal (the old behaviour) meant a few seconds of
       quiet ended the recording. Only permission/hardware failures are
       genuinely fatal; everything else is transient and we resume.
       ═══════════════════════════════════════════════════════════════ */
    recog.onerror = function (e) {
      const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'];
      if (fatal.includes(e?.error)) {
        stopRecording();
      }
      // 'no-speech' | 'aborted' | 'network' -> ignore; onend will resume.
    };

    recog.onend = function () {
      if (!recordingRef.current) return;          // user pressed stop
      // start() throws InvalidStateError if the engine is still winding
      // down, so back off briefly and retry rather than dying silently.
      const resume = (attempt = 0) => {
        if (!recordingRef.current) return;
        try {
          recog.start();
        } catch (err) {
          if (attempt < 5) setTimeout(() => resume(attempt + 1), 150 * (attempt + 1));
        }
      };
      resume();
    };
    recog.start();
    setRecognition(recog);
    setRecording(true);
    recordingRef.current = true;
    recStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - recStartTimeRef.current) / 1000)), 1000);

    /* BRIS-NN-MNB-T16: skip MediaRecorder entirely when the user chose
       "transcribe only" — no audio is captured, so nothing is recorded,
       stored or uploaded to the DAM. Uploaded files never record either. */
    if (!isTranscribingAudioFile && captureAudioRef.current) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        audioStreamRef.current = stream;

        // Set up MediaRecorder for audio capture
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
            // Periodically save accumulated audio to prevent data loss on refresh
            if (audioChunksRef.current.length % 5 === 0) {
              const partialBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.onload = () => {
                saveProp('audioData', reader.result);
              };
              reader.readAsDataURL(partialBlob);
            }
          }
        };
        mr.start();
        mediaRecorderRef.current = mr;

        // Set up AudioContext + Analyser for volume-based animation
        try {
          const actx = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          const source = actx.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = actx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const readVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setMicVolume(Math.min(1, avg / 128));
            animationFrameRef.current = requestAnimationFrame(readVolume);
          };
          readVolume();
        } catch (e) {
          // AudioContext not available
        }
      }).catch(() => {
        // Mic permission denied
      });
    } else {
      // For uploaded file transcription — play the audio and animate waveform
      if (audioRef.current && audioUrl) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [saveProp, isTranscribingAudioFile, audioUrl]);

  /* BRIS-NN-MNB-T16: single entry point for the split button. Sets the
     capture preference, then either starts live recognition or opens the
     file picker — so every menu row begins transcribing immediately. */
  useEffect(() => {
    if (!showMoreMenu) return undefined;
    const onDocDown = (e) => {
      if (moreMenuWrapRef.current && !moreMenuWrapRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    /* mousedown, not click: fires before the menu row's own handler so a
       click on a row still runs its action before the menu closes. */
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [showMoreMenu]);

  /* BRIS-NN-MNB-T42: every meeting-block popover dismisses the same way. */
  useDismissOnOutside(showSettingsPopover, settingsWrapRef, () => {
    setShowSettingsPopover(false); setShowResumeSubmenu(false);
    setShowLanguageSubmenu(false); setShowInstructionsSubmenu(false); setShowConsentSubmenu(false);
  });
  useDismissOnOutside(showCalendarPopover, calendarWrapRef, () => setShowCalendarPopover(false));
  useDismissOnOutside(showTranscribeMenu, transcribeWrapRef, () => setShowTranscribeMenu(false));
  useDismissOnOutside(showAudioFilesDropdown, audioFilesWrapRef, () => setShowAudioFilesDropdown(false));

  /* BRIS-NN-MNB-T51: only one menu open at a time. Opening any menu in
     the block closes the rest, so two popovers can never overlap. */
  const closeAllMenus = useCallback((except) => {
    if (except !== 'settings') { setShowSettingsPopover(false); setShowResumeSubmenu(false);
      setShowLanguageSubmenu(false); setShowInstructionsSubmenu(false); setShowConsentSubmenu(false); }
    if (except !== 'calendar') setShowCalendarPopover(false);
    if (except !== 'transcribe') setShowTranscribeMenu(false);
    if (except !== 'audioFiles') setShowAudioFilesDropdown(false);
    if (except !== 'participants') setShowParticipantsPanel(false);
    if (except !== 'translate') setShowTranslatePopover(false);
  }, []);

  const startTranscribe = useCallback((mode) => {
    setShowTranscribeMenu(false);
    if (mode === TRANSCRIBE_MODES.UPLOAD) {
      captureAudioRef.current = false;
      setCaptureAudio(false);
      setTranscriptStarted(true);
      saveProp('transcriptStarted', true);
      audioUploadRef.current?.click();
      return;
    }
    captureAudioRef.current = mode !== TRANSCRIBE_MODES.LIVE_ONLY;
    setCaptureAudio(captureAudioRef.current);
    setTranscriptStarted(true);
    saveProp('transcriptStarted', true);
    saveProp('transcribeMode', mode);
    startRecording();
  }, [startRecording, saveProp]);

  const stopRecording = useCallback(() => {
    if (recognition) { recognition.stop(); setRecognition(null); }
    if (wakeWordRef.current) { try { wakeWordRef.current.stop(); } catch (e) { } wakeWordRef.current = null; }
    clearInterval(timerRef.current);
    setRecording(false);
    recordingRef.current = false;
    setInterimText('');
    setIsPaused(false);
    setMicVolume(0);

    // Clean up audio analysis
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    analyserRef.current = null;

    /* BUG-007: Stop audio playback when stopping transcription of uploaded file */
    if (isTranscribingAudioFile && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      clearInterval(playbackTimerRef.current);
    }

    // Only save audio if it was a LIVE recording (not uploaded file transcription)
    if (!isTranscribingAudioFile && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      /* ═══════════════════════════════════════════════════════════════
         BRIS-NN-MNB-T06: persist the recording through the DAM.

         FileService writes the enterprise_files row FIRST and only then
         uploads the object, so the metadata id owns the stored file —
         the ordering the DAM refactor requires. The block keeps a fileId
         reference instead of a base64 blob; base64 is written only if the
         upload fails, so a network problem never loses a recording.
         ═══════════════════════════════════════════════════════════════ */
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const stamp = new Date();
      const fileName = `Recording_${stamp.toISOString().slice(0, 19).replace(/[:T]/g, '')}.webm`;
      const localUrl = URL.createObjectURL(audioBlob);

      setAudioUrl(localUrl);
      setAudioDuration(timer);
      saveProp('audioDuration', timer);

      const baseRecord = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        name: fileName,
        duration: timer,
        timestamp: stamp.toISOString(),
        source: TRANSCRIPT_SOURCE.LIVE,
        size: audioBlob.size,
        url: localUrl,
      };

      const commit = (record) => {
        const updatedAudioFiles = [...(audioFiles || []), record];
        setAudioFiles(updatedAudioFiles);
        saveProp('audioFiles', updatedAudioFiles);
        try {
          localStorage.setItem(`nn_audio_files_${block.id}`, JSON.stringify(updatedAudioFiles));
        } catch (e) { /* quota — the DB row remains the source of truth */ }
      };

      FileService.upload({
        file: audioBlob,
        fileName,   /* T68: same name the local record uses, so dedupe matches */
        entityType: 'MeetingNotesBlock',
        moduleName: 'NotionNest',
        entityId: block.id,
        blockId: block.id,
        blockTypeId: 'MeetingNotesBlock',
        metadata: {
          /* BRIS-NN-MNB-T59: written under several keys because the loader
             and the schema disagree on where duration lives. Belt and
             braces until the column is authoritative everywhere. */
          durationSeconds: timer,
          duration_seconds: timer,
          transcriptSource: TRANSCRIPT_SOURCE.LIVE,
          language: selectedLanguage,
          recordedAt: stamp.toISOString(),
        },
      })
        .then((res) => {
          commit({
            ...baseRecord,
            fileId: res?.fileId || res?.id || null,
            storagePath: res?.storagePath || null,
            damStatus: 'uploaded',
          });
        })
        .catch((err) => {
          /* Keep the audio locally so nothing is lost, and flag it so a
             retry can push it to the DAM later. */
          const reader = new FileReader();
          reader.onload = () => commit({
            ...baseRecord,
            data: reader.result,
            damStatus: 'pending',
            damError: String(err?.message || err),
          });
          reader.onerror = () => commit({ ...baseRecord, damStatus: 'failed' });
          reader.readAsDataURL(audioBlob);
        });
    }

    // Final save of transcript data
    saveProp('transcription', transcriptionRef.current);
    saveProp('transcriptLines', transcriptLinesRef.current);

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }

    setIsTranscribingAudioFile(false);
  }, [recognition, timer, saveProp, audioFiles, isTranscribingAudioFile]);

  /* ── Keep refs updated for wake word detection ── */
  startRecRef.current = startRecording;
  stopRecRef.current = stopRecording;

  const pauseRecording = useCallback(() => {
    recordingRef.current = false;
    if (recognition) { recognition.stop(); setRecognition(null); }
    clearInterval(timerRef.current);
    setIsPaused(true);
  }, [recognition]);

  const resumeRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recog = new SR();
      recog.continuous = true;
      recog.interimResults = true;
      /* BRIS-NN-MNB-T03: honour the user's language choice (was hardcoded). */
      recog.lang = resolveRecognitionLang(selectedLanguage);
      recog.onresult = (event) => {
          let final = '';
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
            else interim += event.results[i][0].transcript;
          }
          if (final) {
            const elapsed = Date.now() - recStartTimeRef.current;
            const mins = Math.floor(elapsed / 60000);
            const secs = Math.floor((elapsed % 60000) / 1000);
            const ts = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
            const speaker = speakerRef.current || 'Unknown';
            const lineContent = final.trim();
            const line = `\n${ts} ${speaker}: ${lineContent}`;
            const newTrans = (transcriptionRef.current || '') + line;
            transcriptionRef.current = newTrans.trim();
            saveProp('transcription', newTrans.trim());

            // Created At: 2026-07-20 | Last Modified: 2026-07-22 | Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks/MeetingNotesBlock.jsx#L420
            var newTimestamp = formatFullTimestamp();
            const newLineObj = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
              timestamp: newTimestamp,
              source: 'Auto Transcribing',
              content: `${speaker}: ${lineContent}`
            };
            const newLines = [...transcriptLinesRef.current, newLineObj];
            transcriptLinesRef.current = newLines;
            setDisplayTranscriptLines(newLines); /* BUG-005: Immediate UI update */
            saveProp('transcriptLines', newLines);
            /* BUG-005: Auto-scroll transcript container */
            requestAnimationFrame(() => {
              if (transcriptLinesContainerRef.current) {
                transcriptLinesContainerRef.current.scrollTop = transcriptLinesContainerRef.current.scrollHeight;
              }
            });

            if (modeRef.current === 'auto') {
              const newContent = (contentRef.current || '') + line;
              contentRef.current = newContent.trim();
              saveProp('content', newContent.trim());
            }
          }
          setInterimText(interim);
        };
        /* BRIS-NN-MNB-T05: same resume-until-stopped policy as the primary
           recogniser — transient ends must not terminate the session. */
        recog.onerror = () => { };
        recog.onend = () => {
          if (!recordingRef.current) return;
          const resume = (attempt = 0) => {
            if (!recordingRef.current) return;
            try {
              recog.start();
            } catch (err) {
              if (attempt < 5) setTimeout(() => resume(attempt + 1), 150 * (attempt + 1));
            }
          };
          resume();
        };
        recog.start();
        setRecognition(recog);
      }
      recordingRef.current = true;
      setRecording(true);
      timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - recStartTimeRef.current) / 1000)), 1000);
      setIsPaused(false);
  }, [saveProp]);

  /* BUG-002: Rewritten with debounce guard + immediate state update + reliable focus
     Created At: 2026-07-20 | Last Modified: 2026-07-22 | Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks/MeetingNotesBlock.jsx#L451 */
  const addManualLine = useCallback(() => {
    /* Debounce guard to prevent rapid insert racing */
    if (addManualInProgressRef.current) return;
    addManualInProgressRef.current = true;

    var newTimestamp = formatFullTimestamp();
    var newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newLineObj = {
      id: newId,
      timestamp: newTimestamp,
      source: 'Manual Transcribing',
      content: ''
    };
    const newLines = [...(transcriptLinesRef.current || []), newLineObj];
    transcriptLinesRef.current = newLines;
    setDisplayTranscriptLines(newLines); /* Immediate local UI update */
    saveProp('transcriptLines', newLines);
    setEditingLineId(newId);

    /* TASK-ZIVA-001: Focus the new line at the bottom with cursor blinking at text end */
    const focusNewLine = () => {
      const container = transcriptLinesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      const el = container?.querySelector(`[data-line-id="${newId}"] .nnr-line-content`);
      if (el) {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false); // Cursor at end
        sel.removeAllRanges();
        sel.addRange(range);
        addManualInProgressRef.current = false;
      } else {
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight;
          const el2 = container?.querySelector(`[data-line-id="${newId}"] .nnr-line-content`);
          if (el2) {
            el2.focus();
            const range2 = document.createRange();
            const sel2 = window.getSelection();
            range2.selectNodeContents(el2);
            range2.collapse(false);
            sel2.removeAllRanges();
            sel2.addRange(range2);
          }
          addManualInProgressRef.current = false;
        });
      }
    };
    setTimeout(focusNewLine, 50);
  }, [saveProp]);

  const updateManualLine = useCallback((id, newContent) => {
    const lines = transcriptLinesRef.current || [];
    const newLines = lines.map(line =>
      line.id === id ? { ...line, content: newContent } : line
    );
    saveProp('transcriptLines', newLines);
  }, [saveProp]);

  const handleAudioUpload = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const audioData = ev.target.result;
      saveProp('audioData', audioData);
      setAudioUrl(audioData);

      /* BRIS-NN-MNB-T53: read the real duration off the decoded media
         instead of storing 0. The browser only knows it once metadata has
         loaded, so the record is written after that event (or after an
         error, so a bad file still lands rather than vanishing). */
      const probe = new Audio();
      probe.preload = 'metadata';

      const commitUpload = (seconds) => {
        const secs = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
        saveProp('audioDuration', secs);
        setAudioDuration(secs);

        const newAudioFile = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: file.name || `Upload ${new Date().toLocaleString()}`,
          data: audioData,
          duration: secs,
          timestamp: new Date().toISOString(),
          source: TRANSCRIPT_SOURCE.AUDIO_FILE,
          size: file.size || Math.round(audioData.length * 0.75),
        };
      const updatedAudioFiles = [...(audioFiles || []), newAudioFile];
      setAudioFiles(updatedAudioFiles);
      saveProp('audioFiles', updatedAudioFiles);
      
      // Auto-play the uploaded audio after a short delay to ensure audioRef is ready
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = audioData;
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }, 200);
      
      // Auto-start transcription if in auto mode
      if (mode === 'auto' || mode === 'manual') {
        saveProp('mode', 'auto');
        setIsTranscribingAudioFile(true);
        setTimeout(() => startRecording(), 300);
      }
      };  /* end commitUpload */

      /* loadedmetadata gives us the real length; onerror still commits so a
         file the browser can't decode is recorded rather than dropped. */
      probe.onloadedmetadata = () => commitUpload(probe.duration);
      probe.onerror = () => commitUpload(0);
      probe.src = audioData;
    };
    reader.readAsDataURL(file);
  }, [saveProp, audioFiles, mode, startRecording]);

  /* BUG-009: currentPlayingAudioId now declared before this function (L47) */
  const clearAllLines = useCallback(() => {
    saveProp('transcriptLines', []);
    saveProp('transcription', '');
    saveProp('content', '');
    saveProp('audioFiles', []);
    saveProp('audioData', null);
    saveProp('audioDuration', 0);
    setAudioFiles([]);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentPlayingAudioId(null);
    setSelectedAudioFileIds([]);
    setShowConfirmClear(false);
    setDisplayTranscriptLines([]); /* Also clear local display state */
  }, [saveProp]);

  const toggleRecording = () => {
    if (recording && isPaused) {
      resumeRecording();
    } else if (recording) {
      pauseRecording();
    } else {
      startRecording();
    }
  };

  /* ── Audio Playback ── */
  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
      setAudioDuration(audioRef.current.duration || timer);
      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentPlaybackTime(audioRef.current.currentTime);
          if (audioRef.current.ended) { setIsPlaying(false); clearInterval(playbackTimerRef.current); }
        }
      }, 200);
    }
  }, [audioUrl, timer]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      clearInterval(playbackTimerRef.current);
    }
  }, []);

  const seekAudio = useCallback((e) => {
    if (audioRef.current && audioUrl) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = pct * (audioRef.current.duration || timer);
    }
  }, [audioUrl, timer]);

  /* ── Audio Files Management ── */
  /* BRIS-NN-MNB-T57: hand the file to the player bar instead of poking an
     <audio> element that was never rendered. */
  const playAudioFile = useCallback((file) => {
    if (file) { setPlayQueue([file]); setCurrentPlayingAudioId(file.id); setShowAudioFilesDropdown(false); }
    return;
    // eslint-disable-next-line no-unreachable
  }, [setCurrentPlayingAudioId]);

  const legacyPlayAudioFile = useCallback((file) => {
    if (audioRef.current) {
      if (isPlaying && currentPlayingAudioId === file.id) {
        audioRef.current.pause();
        setIsPlaying(false);
        clearInterval(playbackTimerRef.current);
      } else {
        audioRef.current.src = file.data;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
        setCurrentPlayingAudioId(file.id);
        playbackTimerRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentPlaybackTime(audioRef.current.currentTime);
            if (audioRef.current.ended) { 
              setIsPlaying(false); 
              setCurrentPlayingAudioId(null);
              clearInterval(playbackTimerRef.current); 
            }
          }
        }, 200);
      }
    }
  }, []);

  /* BRIS-NN-MNB-T07: removing a recording from the UI soft-deletes its
     enterprise_files row (status_information.isDeleted) rather than
     destroying it. The row and the stored object are retained for audit;
     only the block stops referencing them. */
  /* BRIS-NN-MNB-T57: batch delete. Calling removeAudioFile in a loop made
     every call filter the SAME captured array, so only the last write
     survived and just one file disappeared. One pass, one state write. */
  const removeAudioFiles = useCallback((fileIds) => {
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
    if (!ids.length) return;
    const idSet = new Set(ids);

    (audioFiles || [])
      .filter(f => idSet.has(f.id) && f.fileId)
      .forEach(f => { FileService.delete(f.fileId, false).catch(() => {}); });

    const updatedAudioFiles = (audioFiles || []).filter(f => !idSet.has(f.id));
    setAudioFiles(updatedAudioFiles);
    saveProp('audioFiles', updatedAudioFiles);
    try {
      localStorage.setItem(`nn_audio_files_${block.id}`, JSON.stringify(updatedAudioFiles));
    } catch (e) { /* quota — the DB row remains the source of truth */ }
    setSelectedAudioFileIds(prev => prev.filter(id => !idSet.has(id)));
  }, [audioFiles, block.id, saveProp]);

  const removeAudioFile = useCallback((fileId) => {
    const target = (audioFiles || []).find(f => f.id === fileId);
    if (target?.fileId) {
      FileService.delete(target.fileId, false).catch(() => {
        /* Non-blocking: the UI removal still proceeds. The row stays
           active and will be reconciled rather than silently lost. */
      });
    }
    const updatedAudioFiles = audioFiles.filter(f => f.id !== fileId);
    setAudioFiles(updatedAudioFiles);
    saveProp('audioFiles', updatedAudioFiles);
    try { localStorage.setItem(`nn_audio_files_${block.id}`, JSON.stringify(updatedAudioFiles)); } catch (e) {}
    setSelectedAudioFileIds(prev => prev.filter(id => id !== fileId));
  }, [audioFiles, block.id, saveProp]);

  const playSelectedAudioFiles = useCallback(() => {
    const chosen = (audioFiles || []).filter(f => selectedAudioFileIds.includes(f.id));
    if (!chosen.length) return;
    setPlayQueue(chosen);
    setCurrentPlayingAudioId(chosen[0].id);
    setShowAudioFilesDropdown(false);
  }, [audioFiles, selectedAudioFileIds]);

  /* BUG-009: currentPlayingAudioId moved to L47 to fix temporal dead zone */

  /* ── Speaker change during recording ── */
  const handleSpeakerChange = (e) => {
    setCurrentSpeaker(e.target.value);
  };



  /* ── Copy ── */
  const copyText = (text) => { if (text) navigator.clipboard.writeText(text); };

  /* ── LLM Request/Response Logging & Download ── */
  const downloadLLMLog = useCallback((type) => {
    const content = llmLogs[type];
    if (!content) return;
    const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm_${type}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [llmLogs]);

  /* ── Dynamic Universal Translation (Preserves Original Intact & Fills Translated Tab) ── */
  const handleTranslateTranscript = useCallback(async (fromLangName, toLangName) => {
    setIsTranslating(true);
    setTranslationProgress(0);
    setIsTranslationMinimized(false);
    try {
      const fromCode = fromLangName === 'auto' || fromLangName === 'Auto / Any' ? 'auto' : getLanguageCode(fromLangName).split('-')[0];
      const toCode = getLanguageCode(toLangName).split('-')[0] || 'en';
      const linesToTranslate = displayTranscriptLines && displayTranscriptLines.length > 0
        ? displayTranscriptLines
        : (transcription ? transcription.split('\n').map((l, i) => ({ id: i, content: l })) : []);

      if (linesToTranslate.length === 0 && !notesContent) {
        setDynamicConfirmModalConfig({
          title: 'No Transcript Content',
          message: 'No transcript content is available to translate.',
          icon: <Info size={20} />,
          confirmText: 'OK',
          variant: 'info',
          onConfirm: () => setDynamicConfirmModalConfig(null)
        });
        setIsTranslating(false);
        return;
      }

      const translatedLines = [];
      const totalCount = linesToTranslate.length;
      for (let idx = 0; idx < totalCount; idx++) {
        const item = linesToTranslate[idx];
        const textToTranslate = item.content || item.text || '';
        const pct = Math.round(((idx + 1) / Math.max(1, totalCount)) * 90);
        setTranslationProgress(pct);
        if (!textToTranslate.trim()) {
          translatedLines.push(item);
          continue;
        }
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromCode}&tl=${toCode}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
          const res = await fetch(url);
          const data = await res.json();
          const translatedText = data[0].map(x => x[0]).join('');
          translatedLines.push({ ...item, content: translatedText, originalContent: textToTranslate });
        } catch (err) {
          translatedLines.push(item);
        }
      }

      setTranslationProgress(95);
      if (translatedLines.length > 0) {
        setTranslatedTranscriptLines(translatedLines);
        const joinedTrans = translatedLines.map(l => l.content).join('\n');
        setTranslatedTranscription(joinedTrans);
        setTranslatedLanguage(toLangName);
        saveProp('translatedTranscriptLines', translatedLines);
        saveProp('translatedTranscription', joinedTrans);
        saveProp('translatedLanguage', toLangName);

        setTranscriptSubTab('translated');
      }

      if (summary) {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromCode}&tl=${toCode}&dt=t&q=${encodeURIComponent(summary)}`;
          const res = await fetch(url);
          const data = await res.json();
          const tSummary = data[0].map(x => x[0]).join('');
          setTranslatedSummary(tSummary);
          saveProp('translatedSummary', tSummary);
        } catch (e) {}
      }

      setTranslationProgress(100);
      setShowTranslatePopover(false);
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setTimeout(() => {
        setIsTranslating(false);
        setIsTranslationMinimized(false);
        setTranslationProgress(0);
      }, 600);
    }
  }, [displayTranscriptLines, transcription, notesContent, summary, saveProp]);

  /* TASK-MN-NOTES-013A: Extract text from Notes blocks (paragraphs, headings, etc.) */
  const extractTextFromBlocks = useCallback((blocks) => {
    if (!blocks || !Array.isArray(blocks)) return '';
    const parts = [];
    for (const b of blocks) {
      if (b.content && typeof b.content === 'string' && b.content.trim()) {
        parts.push(b.content.trim());
      }
      if (b.children && Array.isArray(b.children)) {
        const childText = extractTextFromBlocks(b.children);
        if (childText) parts.push(childText);
      }
    }
    return parts.join('\n');
  }, []);

  /* TASK-MN-INS-008B: Pin / Unpin Metric in Insights Accordion (Max 5 with Warning) */
  const togglePinInsight = useCallback((key) => {
    const current = pinnedInsights || [];
    if (current.includes(key)) {
      const updated = current.filter(k => k !== key);
      setPinnedInsights(updated);
      saveProp('pinnedInsights', updated);
    } else {
      if (current.length >= 5) {
        setDynamicConfirmModalConfig({
          title: 'Maximum Pinned Metrics Reached',
          message: 'You can pin up to 5 metrics in the collapsed header bar. Unpin a metric before pinning another.',
          icon: <AlertTriangle size={20} />,
          confirmText: 'Got It',
          cancelText: 'Cancel',
          variant: 'warning',
          onConfirm: () => setDynamicConfirmModalConfig(null)
        });
        return;
      }
      const updated = [...current, key];
      setPinnedInsights(updated);
      saveProp('pinnedInsights', updated);
    }
  }, [pinnedInsights, saveProp]);

  /* TASK-MN-ZIVA-021B: 5-Tier Ziva API Key & Router Resolver */
  const getZivaApiConfig = useCallback((scope = 'summarization') => {
    const defaultGroqKey = ''; // Default router key
    let key = '';
    let provider = 'groq';
    let model = 'llama-3.3-70b-versatile';

    try {
      if (ZivaApiRouterService && typeof ZivaApiRouterService.getProviderForScope === 'function') {
        const scopeProv = ZivaApiRouterService.getProviderForScope(scope);
        if (scopeProv && scopeProv.apiKey) {
          key = scopeProv.apiKey;
          provider = scopeProv.provider || 'groq';
          model = scopeProv.model || 'llama-3.3-70b-versatile';
        }
      }
      if (!key && ZivaApiRouterService && typeof ZivaApiRouterService.getActiveProvider === 'function') {
        const activeProv = ZivaApiRouterService.getActiveProvider();
        if (activeProv && activeProv.apiKey) {
          key = activeProv.apiKey;
          provider = activeProv.provider || 'groq';
          model = activeProv.model || 'llama-3.3-70b-versatile';
        }
      }
      if (!key) {
        key = localStorage.getItem('ziva_api_key_groq') ||
              localStorage.getItem('ziva_groq_api_key') ||
              localStorage.getItem('groq_api_key') ||
              defaultGroqKey;
      }
    } catch (e) {}

    return { apiKey: key, provider, model };
  }, []);

  /* TASK-MN-BTN-009A / TASK-MN-PIPELINE-006: Non-blocking Generate Summary Workflow */
  const handleGenerateSummary = useCallback(async (textToSummarize = null) => {
    if (isGeneratingSummary || processing) return;

    /* 1. Extract input text from Transcript + Notes */
    const rawTranscriptText = textToSummarize ||
      (displayTranscriptLines || []).map(l => l.content || '').join('\n') ||
      (transcriptLines || []).map(l => l.content || '').join('\n') ||
      transcription || '';

    const rawNotesText = extractTextFromBlocks(block.notesBlocks) || notesContent || '';
    const combinedInput = [
      rawTranscriptText ? `=== TRANSCRIPT ===\n${rawTranscriptText}` : '',
      rawNotesText ? `=== MEETING NOTES ===\n${rawNotesText}` : ''
    ].filter(Boolean).join('\n\n');

    if (!combinedInput.trim()) {
      setDynamicConfirmModalConfig({
        title: 'No Content to Summarize',
        message: 'Please transcribe audio or write notes in the Notes tab before generating a summary.',
        icon: <Info size={20} />,
        confirmText: 'OK',
        cancelText: 'Cancel',
        variant: 'info',
        onConfirm: () => setDynamicConfirmModalConfig(null)
      });
      return;
    }

    /* 2. Immediate viewMode switch & loading states */
    setViewMode('summary');
    setIsGeneratingSummary(true);
    setProcessing(true);

    const instructionKey = selectedInstruction || 'Auto';
    const instructionPrompt = customInstructions.find(ci => ci.name === instructionKey)?.prompt ||
      DEFAULT_INSTRUCTION_PROMPTS[instructionKey] ||
      DEFAULT_INSTRUCTION_PROMPTS['Auto'];

    try {
      const { apiKey, model } = getZivaApiConfig('summarization');

      if (apiKey) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are ZIVA AI Enterprise Meeting Assistant. ${instructionPrompt}`
              },
              {
                role: 'user',
                content: combinedInput
              }
            ],
            temperature: 0.3,
            max_tokens: 4096
          })
        });

        if (response.ok) {
          const data = await response.json();
          const generatedSummary = data.choices?.[0]?.message?.content || '';
          if (generatedSummary) {
            saveProp('summary', generatedSummary);
            saveProp('includeSummary', true);
            setIsGeneratingSummary(false);
            setProcessing(false);
            return;
          }
        }
      }

      /* Smart fallback summary generator */
      const words = combinedInput.trim().split(/\s+/).length;
      const fallbackSummary = `## Executive Summary\nOverview of ${title || 'Meeting'} on ${date}. Discussed key topics across ${words} words.\n\n## Key Discussion Points\n- Topics analyzed from interaction notes and transcripts.\n\n## Action Items & Next Steps\n- [ ] Review action items and follow up with participants.`;
      saveProp('summary', fallbackSummary);
      saveProp('includeSummary', true);
    } catch (err) {
      console.warn('Summary generation error:', err);
    } finally {
      setIsGeneratingSummary(false);
      setProcessing(false);
    }
  }, [isGeneratingSummary, processing, displayTranscriptLines, transcriptLines, transcription, extractTextFromBlocks, block.notesBlocks, notesContent, selectedInstruction, customInstructions, getZivaApiConfig, title, date, saveProp]);

  const generateSummary = handleGenerateSummary;

  /* ── Full Enterprise Functions & Handlers (Restored from 7,000-Line Master Suite) ── */
  const clearTranscript = useCallback(() => {
    setDisplayTranscriptLines([]);
    setTranscription('');
    setTranslatedTranscriptLines([]);
    setTranslatedTranscription('');
    saveProp('transcriptLines', []);
    saveProp('transcription', '');
  }, [saveProp]);

  const openEditPromptModal = useCallback((instructionName) => {
    const currentPrompt = (instructionPrompts && instructionPrompts[instructionName]) || 'You are Ziva AI Meeting Notes Architect. Generate a comprehensive, high-quality structured meeting summary in clean markdown.';
    setUnifiedModalInstruction(instructionName);
    setUnifiedModalPrompt(currentPrompt);
    setUnifiedModalMode('edit');
    setUnifiedModalOpen(true);
    setShowSettingsPopover(false);
  }, [instructionPrompts]);

  const detectLanguagesFromTranscript = useCallback((transcriptLines = [], rawText = '') => {
    const textSample = (transcriptLines.map(l => l.content || '').join(' ') + ' ' + (rawText || '')).trim();
    if (!textSample) return [];
    const detected = new Set();
    if (/[\u0B80-\u0BFF]/.test(textSample)) detected.add('Tamil');
    if (/[\u0900-\u097F]/.test(textSample)) detected.add('Hindi');
    if (/[\u0C80-\u0CFF]/.test(textSample)) detected.add('Kannada');
    if (/[\u0C00-\u0C7F]/.test(textSample)) detected.add('Telugu');
    if (/[\u0D00-\u0D7F]/.test(textSample)) detected.add('Malayalam');
    if (/[\u0980-\u09FF]/.test(textSample)) detected.add('Bengali');
    if (/[\u0A80-\u0AFF]/.test(textSample)) detected.add('Gujarati');
    if (/[\u0600-\u06FF]/.test(textSample)) detected.add('Arabic');
    if (/[\u4E00-\u9FFF]/.test(textSample)) detected.add('Chinese');
    if (/[\u3040-\u30FF\u31F0-\u31FF]/.test(textSample)) detected.add('Japanese');
    if (/[\uac00-\ud7af]/.test(textSample)) detected.add('Korean');
    return Array.from(detected);
  }, []);

  const generateSummaryFromTranscript = useCallback(async (textToSummarize) => {
    return handleGenerateSummary(textToSummarize);
  }, [handleGenerateSummary]);

  const renderSummaryInstructionsPopoverContent = useCallback(() => {
    return (
      <div className="nnr-instructions-popover-content">
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Instructions</div>
        {['Auto', 'Executive', 'Action Items', 'Detailed', 'Technical'].map(inst => (
          <div
            key={inst}
            className={`nnr-inst-item${(block.selectedInstruction || selectedWizardInstruction) === inst ? ' active' : ''}`}
            onClick={() => {
              setSelectedWizardInstruction(inst);
              saveProp('selectedInstruction', inst);
            }}
          >
            {inst}
          </div>
        ))}
      </div>
    );
  }, [block.selectedInstruction, selectedWizardInstruction, saveProp]);

  const logLLMInteraction = useCallback((type, data) => {
    setLlmLogs(prev => ({ ...prev, [type]: data }));
  }, []);

  const closeAllPopovers = useCallback(() => {
    setShowSettingsPopover(false);
    setShowCalendarPopover(false);
    setShowParticipantsPanel(false);
    setShowMoreMenu(false);
    setShowTranslatePopover(false);
    setShowAudioFilesDropdown(false);
    setShowFooterInstructionPopover(false);
  }, []);

  const handleRefresh = useCallback(() => {
    if (displayTranscriptLines.length > 0) {
      handleGenerateSummary();
    }
  }, [displayTranscriptLines, handleGenerateSummary]);

  const exportToJSON = useCallback(() => {
    const data = {
      title,
      date,
      participants,
      consentMode,
      transcriptLines: displayTranscriptLines,
      summary,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Meeting_Notes'}_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [title, date, participants, consentMode, displayTranscriptLines, summary]);

  const handleConnectorExportCancel = useCallback(() => {
    setDynamicConfirmModalConfig(null);
  }, []);

  const fetchWithTimeout = useCallback(async (resource, options = {}, timeout = 25000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }, []);

  const handleEmailExportCancel = useCallback(() => {
    setDynamicConfirmModalConfig(null);
  }, []);

  const handleConnectorImportConfirm = useCallback(() => {
    setDynamicConfirmModalConfig(null);
  }, []);

  const handleImportMappingCancel = useCallback(() => {
    setDynamicConfirmModalConfig(null);
  }, []);

  const executePlayAudioFile = useCallback((file) => {
    if (!file || !file.url) return;
    setCurrentPlayingAudioId(file.id);
    setAudioUrl(file.url);
    setIsPlaying(true);
  }, []);

  const transcribeExistingAudioFile = useCallback(async (file) => {
    if (!file || !file.url) return;
    setIsTranscribingAudioFile(true);
    try {
      const res = await fetch(file.url);
      const blob = await res.blob();
      await handleAudioUpload(blob);
    } catch (err) {
      console.error('Failed to transcribe audio file:', err);
    } finally {
      setIsTranscribingAudioFile(false);
    }
  }, [handleAudioUpload]);

  const transcribeSelectedAudioFiles = useCallback(async () => {
    if (selectedAudioFileIds.length === 0) return;
    const targetFile = audioFiles.find(f => f.id === selectedAudioFileIds[0]);
    if (targetFile) {
      await transcribeExistingAudioFile(targetFile);
    }
  }, [selectedAudioFileIds, audioFiles, transcribeExistingAudioFile]);

  const removeSelectedAudioFiles = useCallback(() => {
    if (selectedAudioFileIds.length === 0) return;
    const updated = audioFiles.filter(f => !selectedAudioFileIds.includes(f.id));
    setAudioFiles(updated);
    saveProp('audioFiles', updated);
    setSelectedAudioFileIds([]);
  }, [selectedAudioFileIds, audioFiles, saveProp]);

  const stopTranscribingAudioFile = useCallback(() => {
    setIsTranscribingAudioFile(false);
  }, []);

  const executeConfirmedAudioFileDelete = useCallback((fileId) => {
    const updated = audioFiles.filter(f => f.id !== fileId);
    setAudioFiles(updated);
    saveProp('audioFiles', updated);
    if (currentPlayingAudioId === fileId) {
      setIsPlaying(false);
      setAudioUrl(null);
      setCurrentPlayingAudioId(null);
    }
  }, [audioFiles, currentPlayingAudioId, saveProp]);

  const fallbackExecCopy = useCallback((text) => {
    copyText(text);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  }, [copyText]);

  
  /* BRIS-NN-MNB-T25: adding a custom instruction opens the block editor
     directly, pre-titled. It used to call window.prompt(), which gave a
     browser dialog with no formatting and no block editing. */
  const openAddPromptModal = useCallback(() => {
    setUnifiedModalInstruction('New Summary Instructions');
    setUnifiedModalPrompt('');
    setUnifiedModalMode('add');
    setUnifiedModalOpen(true);
  }, []);

  const recordingTimer = timer;

  const activeTranscriptText = useMemo(() => {
    if (transcriptSubTab === 'translated') {
      return (translatedTranscription || translatedTranscriptLines.map(l => l.content || '').join('\n'));
    }
    return (transcription || displayTranscriptLines.map(l => l.content || '').join('\n'));
  }, [transcriptSubTab, translatedTranscription, translatedTranscriptLines, transcription, displayTranscriptLines]);

  const togglePlayPause = isPlaying ? pauseAudio : playAudio;
  const handleSeek = seekAudio;
  const currentTime = currentPlaybackTime;

  const computedInsights = useMemo(() => {
    const words = displayTranscriptLines.reduce((acc, l) => acc + (l.content || '').split(/\s+/).filter(Boolean).length, 0);
    const duration = timer ? formatTime(timer) : '0:00';
    return {
      words: { label: 'Total Words', value: words },
      speakers: { label: 'Active Speakers', value: participants.length || 1 },
      duration: { label: 'Duration', value: duration },
      status: { label: 'Consent Status', value: consentMode === 'manual' ? 'Manual Consent' : 'Auto Consent' }
    };
  }, [displayTranscriptLines, timer, participants.length, consentMode]);


  const handleSelectDateTag = useCallback((tag) => {
    saveProp('calendarEvent', tag);
    setShowCalendarPopover(false);
  }, [saveProp]);


  /* ── Local notes processor (generates proper structured meeting document) ── */
  const processNotesLocally = useCallback(() => {
    const text = notesContent || transcription;
    if (!text.trim()) return '';

    const wordCount = text.split(/\s+/).length;
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];

    /* Generate summary */
    let genSummary = '';
    if (includeSummary) {
      const words = text.split(/\s+/);
      genSummary = words.slice(0, 60).join(' ') + (words.length > 60 ? '...' : '');
      saveProp('summary', genSummary);
    }

    /* Generate bullet points */
    let genBullets = [];
    if (includeBullets) {
      genBullets = sentences.slice(0, 8).map(s => s.trim().replace(/^[-•*]\s*/, ''));
      saveProp('bulletPoints', genBullets);
    }

    /* Find topic-like segments from transcript lines with timestamps */
    const lines = text.split('\n').filter(l => l.trim());
    const topicLines = lines.filter(l => /\[(\d{2}:\d{2})\]/.test(l)).slice(0, 12);
    const attendees = participants.length > 0
      ? participants.map(p => `* ${p.name}${p.email ? ` - ${p.email}` : ''}`).join('\n')
      : '* (No attendees recorded)';

    /* ---------- Build the full document ---------- */
    const doc = [];

    doc.push(`# Meeting Notes\n`);
    doc.push(`**Meeting Title:** ${title}`);
    doc.push(`**Date:** ${date}`);
    doc.push(`**Duration:** ${formatTime(timer)}`);

    if (participants.length > 0) {
      doc.push(`**Facilitator:** ${participants[0]?.name || 'N/A'}`);
    }

    doc.push(``);
    doc.push(`## Attendees`);
    doc.push(attendees);
    doc.push(``);

    doc.push(`---`);
    doc.push(``);

    if (genSummary) {
      doc.push(`## Summary`);
      doc.push(``);
      doc.push(genSummary);
      doc.push(``);
    }

    if (genBullets.length > 0) {
      doc.push(`## Key Points`);
      doc.push(``);
      genBullets.forEach(b => doc.push(`* ${b}`));
      doc.push(``);
    }

    doc.push(`## Discussion`);
    doc.push(``);
    /* Group transcript lines into pseudo-topics if possible */
    if (topicLines.length > 0) {
      doc.push(`The meeting covered the following topics based on the live transcription:`);
      doc.push(``);
      topicLines.forEach(line => doc.push(`> ${line}`));
      doc.push(``);
    } else {
      doc.push(`The full transcription of the meeting is provided in the section below.`);
      doc.push(``);
    }

    if (includeActionItems && genBullets.length > 0) {
      doc.push(`## Action Items`);
      doc.push(``);
      doc.push(`| # | Action | Owner | Due Date | Status |`);
      doc.push(`|---|--------|-------|----------|--------|`);
      genBullets.slice(0, 5).forEach((b, i) => {
        doc.push(`| ${i + 1} | ${b} | TBD | TBD | Open |`);
      });
      doc.push(``);
    }

    if (includeFollowUp) {
      doc.push(`## Track Follow Up`);
      doc.push(``);
      /* Scan text for date/meeting follow-up clues */
      const followUpMatch = text.match(/(?:next\s+meeting|follow[\s-]*up|schedule|reschedule|meet\s+again|next\s+time|coming\s+week)\s*(?::\s*)?([^.\n]*)/gi);
      if (followUpMatch && followUpMatch.length > 0) {
        doc.push(`The following follow-up items were identified from the conversation:`);
        doc.push(``);
        followUpMatch.slice(0, 5).forEach(m => doc.push(`- ${m.trim()}`));
      } else {
        doc.push(`No follow-up meetings or next steps were explicitly mentioned during the session.`);
      }
      doc.push(``);
      doc.push(`> **Reminder:** Schedule a follow-up meeting if action items require further discussion.`);
      doc.push(``);
    }

    doc.push(`## Full Transcription (Live Captured)`);
    doc.push(``);
    doc.push(text);
    doc.push(``);

    doc.push(`---`);
    doc.push(`*AI-generated meeting notes processed locally (Ziva AI server unavailable).*`);

    const processed = doc.join('\n');
    saveProp('finalNotes', processed);
    saveProp('aiInsights', [
      { icon: 'Lightbulb', text: `${wordCount} words transcribed` },
      { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
      { icon: 'Users', text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` },
    ]);
    return processed;
  }, [notesContent, transcription, includeBullets, includeSummary, includeActionItems, includeFollowUp, title, date, timer, participants, saveProp, block.summary]);

  /* ── Split AI response into notes body + transcription ── */
  const splitFinalNotes = (text) => {
    if (!text) return { body: '', transcription: '' };
    const idx = text.search(/## Full Transcription/i);
    if (idx === -1) return { body: text, transcription: '' };
    return {
      body: text.slice(0, idx).trim(),
      transcription: text.slice(idx).replace(/## Full Transcription[^\n]*\n?/i, '').trim(),
    };
  };

  const { body: notesBody, transcription: extractedTrans } = splitFinalNotes(finalNotes || notesContent);
  const displayTranscription = extractedTrans || transcription || notesContent || '';

  /* ── Check which AI sections exist in notes body ── */
  const hasSummarySection = notesBody && /^## Summary/m.test(notesBody);
  const hasKeyPointsSection = notesBody && /^## Key Points/m.test(notesBody);
  const hasActionItemsSection = notesBody && /^## Action Items/m.test(notesBody);
  const hasFollowUpSection = notesBody && /^## Track Follow Up/m.test(notesBody);

  /* BUG-010: Helper to get only visible transcript text (respects timeline toggle)
     Created At: 2026-07-22 | Last Modified: 2026-07-22 */
  const getVisibleTranscriptText = useCallback(() => {
    const lines = displayTranscriptLines && displayTranscriptLines.length > 0
      ? displayTranscriptLines
      : transcriptLines;
    if (!lines || lines.length === 0) return displayTranscription || notesContent || '';
    return lines.map(line => {
      if (showTimeline) {
        /* Include timestamp + source + content */
        return `${line.timestamp || ''} ${line.source || ''} ${line.content || ''}`;
      }
      /* Timeline off: only read the content portion, skip timestamps */
      return line.content || '';
    }).filter(t => t.trim()).join('\n');
  }, [displayTranscriptLines, transcriptLines, displayTranscription, notesContent, showTimeline]);

  /* ── Text-to-Speech — BUG-010: Now uses getVisibleTranscriptText ── */
  const readAloud = (text) => {
    if (!window.speechSynthesis) return;
    if (isReadingAloud) { window.speechSynthesis.cancel(); setIsReadingAloud(false); return; }
    const content = text || getVisibleTranscriptText() || notesContent || finalNotes;
    if (!content || !content.trim()) return;
    const u = new SpeechSynthesisUtterance(content);
    u.lang = 'en-US'; u.rate = 1;
    u.onend = () => setIsReadingAloud(false);
    u.onerror = () => setIsReadingAloud(false);
    setIsReadingAloud(true);
    window.speechSynthesis.speak(u);
  };

  /* ── Export functions ── */
  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Filter notes body: keep only sections matching enabled toggles ── */
  const filterNotesByToggles = useCallback((raw) => {
    if (!raw) return '';
    const sections = raw.split(/(?=^## )/m);
    const toggleMap = {
      '## Summary': includeSummary,
      '## Key Points': includeBullets,
      '## Action Items': includeActionItems,
      '## Track Follow Up': includeFollowUp,
    };
    return sections.filter(sec => {
      const header = sec.match(/^## [^\n]+/m);
      if (!header) return true;
      return toggleMap[header[0]] !== false;
    }).join('').trim();
  }, [includeSummary, includeBullets, includeActionItems, includeFollowUp]);

  /* ── Share notes via Web Share API (only enabled toggles) ── */
  const shareNotes = useCallback(() => {
    const filtered = filterNotesByToggles(notesBody);
    const text = filtered + '\n\n---\n\n## Full Transcription (Live Captured)\n\n' + (displayTranscription || '(No transcription)');
    if (navigator.share) {
      navigator.share({ title: `${title} - Meeting Notes`, text }).catch(() => { });
    } else {
      navigator.clipboard.writeText(text).catch(() => { });
    }
  }, [filterNotesByToggles, notesBody, displayTranscription, title]);

  const exportTxt = () => {
    const filtered = filterNotesByToggles(notesBody);
    const txt = (filtered || notesBody || 'No content') + '\n\n---\n\n## Full Transcription (Live Captured)\n\n' + (displayTranscription || '(No transcription)');
    downloadFile(txt, `${title.replace(/\s+/g, '_')}_Meeting_Notes.txt`, 'text/plain');
  };

  const exportJson = () => {
    const filtered = filterNotesByToggles(notesBody);
    const data = {
      title, date, participants,
      summary: includeSummary ? summary : undefined,
      bulletPoints: includeBullets ? bulletPoints : undefined,
      transcription: displayTranscription,
      aiNotesBody: filtered || notesBody,
      fullDocument: filterNotesByToggles(finalNotes || notesContent),
      recordingDuration: formatTime(timer),
      aiInsights,
    };
    downloadFile(JSON.stringify(data, null, 2), `${title.replace(/\s+/g, '_')}_Meeting_Notes.json`, 'application/json');
  };

  const exportCsv = () => {
    const rows = [['#', 'Action', 'Owner', 'Due Date', 'Status']];
    const items = (includeActionItems ? bulletPoints : []).slice(0, 20);
    items.forEach((item, i) => {
      rows.push([i + 1, item, 'TBD', 'TBD', 'Open']);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `${title.replace(/\s+/g, '_')}_Action_Items.csv`, 'text/csv');
  };

  const exportDocx = () => {
    const filtered = filterNotesByToggles(notesBody);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} - Meeting Notes</title></head><body>
      <h1>${title}</h1>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Attendees:</strong></p>
      <ul>${participants.map(p => `<li>${p.name}${p.email ? ` - ${p.email}` : ''}</li>`).join('')}</ul>
      <hr>
      <h2>AI Generated Meeting Notes</h2>
      <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px">${(filtered || notesBody).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      <hr>
      <h2>Full Transcription</h2>
      <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px">${displayTranscription.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </body></html>`;
    downloadFile(html, `${title.replace(/\s+/g, '_')}_Meeting_Notes.doc`, 'application/msword');
  };

  /* ── Finish Taking Notes (via Ziva AI, falls back to local) ── */
  const finishTakingNotes = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    if (recording) stopRecording();

    const text = notesContent || transcription;
    if (!text.trim()) { setProcessing(false); return; }

    try {
      const apiBase = window._zivaApiBase || '/api/ziva';
      const attendeeList = participants.map(p => `- ${p.name}`).join('\n');
      const question = `Generate comprehensive meeting notes from the following raw transcription. Format with these sections:

## Meeting Information
Title: ${title}
Date: ${date}
Attendees:
${attendeeList || '- (none)'}

${includeSummary ? '## Summary\n(Write a 2-3 paragraph summary of the key discussion points)\n' : ''}
${includeBullets ? '## Key Points\n(List the most important takeaways as bullet points)\n' : ''}
${includeActionItems ? `## Action Items
| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
(List action items as a table)
` : ''}
${includeFollowUp ? `## Track Follow Up
(Check if a follow-up meeting was discussed, when it is scheduled, and what topics remain open. If no follow-up is mentioned, state that clearly.)
` : ''}

## Agenda & Discussion
(Organize the discussion into logical topics with headings and bullet points under each)

## Full Transcription
(Include the raw transcript at the bottom for reference)

Raw transcription:
${text}`;
      const res = await fetch(`${apiBase}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          session: { assistantMode: 'learn' },
          messages: [],
          model: 'auto',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const answer = data.answer || data.content || '';
        if (answer) {
          saveProp('finalNotes', answer);
          if (includeSummary && !block.summary) {
            const words = text.split(/\s+/);
            saveProp('summary', words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : ''));
          }
          if (includeBullets) {
            const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
            saveProp('bulletPoints', sentences.slice(0, 10).map(s => s.trim()));
          }
          saveProp('aiInsights', [
            { icon: 'Lightbulb', text: `${text.split(/\s+/).length} words transcribed` },
            { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
            { icon: 'Users', text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` },
          ]);
          setViewMode('final_notes');
          setProcessing(false);
          return;
        }
      }
    } catch { }
    processNotesLocally();
    setViewMode('final_notes');
    setProcessing(false);
  }, [notesContent, transcription, title, date, participants, includeSummary, includeBullets, includeActionItems, includeFollowUp, timer, saveProp, recording, stopRecording, processing, processNotesLocally]);

  /* ── Participants ── */
  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    saveProp('participants', [...participants, { id: Date.now().toString(), name: newParticipantName.trim(), email: newParticipantEmail.trim() }]);
    setNewParticipantName(''); setNewParticipantEmail('');
  };
  const removeParticipant = (id) => saveProp('participants', participants.filter(p => p.id !== id));

  /* ── Simple markdown → HTML renderer ── */
  const renderMd = useCallback((md) => {
    if (!md) return '';
    const es = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = es(md);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---+\s*$/gm, '<hr>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    /* Tables */
    html = html.replace(/^\|(.+)\|$/gm, (m) => {
      const cells = m.slice(1, -1).split('|').map(c => c.trim());
      const isSep = cells.every(c => /^-+$/.test(c));
      if (isSep) return '<tr class="mt-tbl-sep">';
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    });
    html = html.replace(/((?:<tr[^>]*>.*?<\/tr>\s*)+)/g, '<table>$1</table>');
    html = html.replace(/<tr class="mt-tbl-sep"><\/tr>/g, '');

    /* Lists */
    html = html.replace(/^[-*•] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    /* Line breaks */
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<br><\/p>/g, '</p>');
    html = html.replace(/<p><br>/g, '<p>');
    html = html.replace(/<\/?p>(?:\s*<(?:table|ul|ol|h[12]|hr|blockquote))/g, (m) => m.includes('</p>') ? m.replace('</p>', '') : m.replace('<p>', ''));
    html = html.replace(/(<\/(?:table|ul|ol|h[12]|hr|blockquote)>\s*)<\/?p>/g, '$1');
    return html;
  }, []);

  /* ── Auto-populate AI Insights when content is ready ── */
  useEffect(() => {
    const text = notesContent || transcription;
    if (text.trim() && !aiInsightsAutoRef.current && !aiInsights.length) {
      aiInsightsAutoRef.current = true;
      saveProp('aiInsights', [
        { icon: 'Lightbulb', text: `${text.split(/\s+/).length} words transcribed` },
        { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
        { icon: 'Users', text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` },
      ]);
    }
  }, [notesContent, transcription, timer, participants.length, aiInsights.length, saveProp]);

  /* ── Load audio from block properties on mount ── */
  useEffect(() => {
    if (block.audioData && !audioUrl) {
      setAudioUrl(block.audioData);
      if (block.audioDuration) {
        setAudioDuration(block.audioDuration);
      }
    }
  }, [block.audioData, block.audioDuration]);

  /* BUG-009: Load audio files from block properties — always sync
     Created At: 2026-07-20 | Last Modified: 2026-07-22 */
  useEffect(() => {
    if (block.audioFiles && block.audioFiles.length > 0) {
      setAudioFiles(block.audioFiles);
    }
  }, [block.audioFiles]);

  /* ── Show consent modal on mount if not set ── */
  useEffect(() => {
    if (!block.consentMode && viewMode === 'transcript') {
      setShowConsentModal(true);
    }
  }, [block.consentMode, viewMode]);

  /* ── Detect transcript overflow for conditional fade ── */
  useEffect(() => {
    const el = transcriptLinesContainerRef.current;
    if (el) {
      setTranscriptHasOverflow(el.scrollHeight > el.clientHeight);
    }
  }, [displayTranscriptLines, displayTranscription, notesContent, transcriptExpanded]);

  /* ── Update audio duration when audio loads ── */
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      const handleLoadedMetadata = () => {
        if (audioRef.current) {
          setAudioDuration(audioRef.current.duration);
        }
      };

      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
      };
    }
  }, [audioUrl]);

  /* ── Cleanup on unmount ──
     BRIS-NN-MNB-T61: this said "on unmount" but depended on [recognition],
     so it re-ran every time the recogniser was replaced — which the T05
     auto-restart does every few seconds during normal speech. Each run
     cleared timerRef, so the recording timer never advanced past 0 and
     every saved file inherited duration: 0.

     recognition is read through a ref so the teardown still stops the
     CURRENT instance without making it a dependency. */
  const recognitionRef = useRef(null);
  useEffect(() => { recognitionRef.current = recognition; }, [recognition]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(playbackTimerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  /* ── Download menu auto-close: 5s timeout + click-outside ── */
  useEffect(() => {
    if (!showDownloadMenu) return;
    const timer = setTimeout(() => setShowDownloadMenu(false), 5000);
    const handleClickOutside = (e) => {
      if (downloadWrapRef.current && !downloadWrapRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  /* ── Settings popover auto-close: click-outside ── */
  useEffect(() => {
    if (!showSettingsPopover) return;
    const handleClickOutside = (e) => {
      if (settingsWrapRef.current && !settingsWrapRef.current.contains(e.target)) {
        setShowSettingsPopover(false);
        setShowLanguageSubmenu(false);
        setShowInstructionsSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsPopover]);

  /* ── Bulb info auto-close: click-outside ── */
  useEffect(() => {
    if (!showBulbInfo) return;
    const handleClickOutside = (e) => {
      if (bulbWrapRef.current && !bulbWrapRef.current.contains(e.target)) {
        setShowBulbInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBulbInfo]);

  /* ── Audio source menu auto-close: click-outside ── */
  useEffect(() => {
    if (!showAudioSourceMenu) return;
    var handleClickOutside = function (e) {
      if (audioSourceWrapRef.current && !audioSourceWrapRef.current.contains(e.target)) {
        setShowAudioSourceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return function () { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showAudioSourceMenu]);

  /* ── Output device menu auto-close: click-outside ── */
  useEffect(() => {
    if (!showOutputDeviceMenu) return;
    var handleClickOutside = function (e) {
      if (outputDeviceWrapRef.current && !outputDeviceWrapRef.current.contains(e.target)) {
        setShowOutputDeviceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return function () { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showOutputDeviceMenu]);

  /* ── Audio files dropdown auto-close: click-outside ── */
  useEffect(() => {
    if (!showAudioFilesDropdown) return;
    var handleClickOutside = function (e) {
      if (audioFilesWrapRef.current && !audioFilesWrapRef.current.contains(e.target)) {
        setShowAudioFilesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return function () { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showAudioFilesDropdown]);

  /* ── Enumerate audio output devices (lazy: only when user opens dropdown) ── */
  function enumerateOutputDevices() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      return navigator.mediaDevices.enumerateDevices();
    }).then(function (devices) {
      var outputs = devices.filter(function (d) { return d.kind === 'audiooutput'; });
      if (outputs.length > 0) setAudioOutputDevices(outputs);
    })['catch'](function () { });
  }

  const LANGUAGES = [
    LANGUAGE_AUTO,
    ...INDIAN_LANGUAGES.filter(l => LANGUAGE_CODE_MAP[l]),
    ...Object.keys(LANGUAGE_CODE_MAP).filter(l => !INDIAN_LANGUAGES.includes(l)),
  ];

  const INSTRUCTION_PRESETS = ['Auto', 'Meeting', 'Interview', 'Call', 'Stand-up', 'Workshop'];

  function renderCustomInstructions() {
    var items = [];
    for (var idx = 0; idx < customInstructions.length; idx++) {
      var ci = customInstructions[idx];
      items.push(renderCustomInstructionItem(ci, idx));
    }
    return items;
  }

  /* BRIS-NN-MNB-T25: route to the block editor instead of window.prompt().
     Kept as a named function so both menus can call the same entry point. */
  function handleAddCustomInstruction() {
    setShowInstructionsSubmenu(false);
    setShowSettingsPopover(false);
    openAddPromptModal();
  }

  function handleAudioFileChange(e) {
    var f = e.target.files && e.target.files[0];
    if (f) { handleAudioUpload(f); }
    e.target.value = '';
  }

  function renderCustomInstructionItem(ci, i) {
    var handleSelect = function () { saveProp('selectedInstruction', ci); setShowInstructionsSubmenu(false); };
    /* BRIS-NN-MNB-T25: edit opens the block editor, not a browser prompt. */
    var handleEdit = function (e) { e.stopPropagation(); setShowInstructionsSubmenu(false); openEditPromptModal(ci); };
    var handleDelete = function (e) { e.stopPropagation(); var upd = customInstructions.filter(function (_, idx) { return idx !== i; }); setCustomInstructions(upd); if (selectedInstruction === ci) saveProp('selectedInstruction', 'Auto'); };
    return (
      <div key={i} className={'nnr-settings-flyout-item' + (selectedInstruction === ci ? ' active' : '')} onClick={handleSelect}>
        {ci}
        {selectedInstruction === ci && <Check size={12} />}
        <span className="nnr-settings-flyout-item-actions">
          <span className="nnr-icon-btn-sm" onClick={handleEdit}><Edit3 size={12} /></span>
          <span className="nnr-icon-btn-sm" onClick={handleDelete}><Trash2 size={12} /></span>
        </span>
      </div>
    );
  }

  const renderSettingsPopover = () => (
    <div className="nnr-settings-popover">
      <div className="nnr-settings-popover-inner">
        {/* BRIS-NN-MNB-M01: transcription run-state — mirrors the Start/Stop
            button so the menu and the toolbar can never disagree. */}
        {/* BRIS-NN-MNB-T39: Resume transcription now offers the same three
            modes as the split button, rather than silently assuming
            "live + save audio". */}
        {recording ? (
          <div
            className="nnr-settings-item"
            onClick={() => { stopRecording(); setShowSettingsPopover(false); }}
          >
            <span className="nnr-rec-dot live" aria-hidden="true" />
            <span>Pause transcription</span>
          </div>
        ) : (
          <div
            className="nnr-settings-item nnr-settings-item-has-flyout"
            onClick={() => { setShowResumeSubmenu(!showResumeSubmenu); setShowLanguageSubmenu(false); setShowInstructionsSubmenu(false); setShowConsentSubmenu(false); }}
          >
            <span className="nnr-rec-dot" aria-hidden="true" />
            <span>Resume transcription</span>
            <span className="nnr-settings-item-right"><ChevronRight size={13} /></span>

            {showResumeSubmenu && (
              <div className="nnr-settings-flyout">
                <div className="nnr-settings-flyout-item" onClick={(e) => { e.stopPropagation(); setShowSettingsPopover(false); startTranscribe(TRANSCRIBE_MODES.LIVE_RECORD); }}>
                  <span className="nnr-transcribe-menu-icons"><Mic size={14} /><FileAudio size={14} /></span>
                  <span>Live + save audio</span>
                </div>
                <div className="nnr-settings-flyout-item" onClick={(e) => { e.stopPropagation(); setShowSettingsPopover(false); startTranscribe(TRANSCRIBE_MODES.LIVE_ONLY); }}>
                  <Mic size={14} />
                  <span>Live, transcript only</span>
                </div>
                <div className="nnr-settings-flyout-item" onClick={(e) => { e.stopPropagation(); setShowSettingsPopover(false); startTranscribe(TRANSCRIBE_MODES.UPLOAD); }}>
                  <Upload size={14} />
                  <span>Transcribe audio file</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BRIS-NN-MNB-T40: Translate moved here from the 3-dot menu */}
        <div
          className="nnr-settings-item"
          onClick={() => { setShowSettingsPopover(false); setShowTranslatePopover(true); }}
        >
          <Languages size={14} />
          <span>Translate transcript</span>
        </div>

        {/* BRIS-NN-MNB-M02: re-run the summary against the current transcript */}
        <div
          className="nnr-settings-item"
          onClick={() => { handleGenerateSummary(); setShowSettingsPopover(false); }}
        >
          <RefreshCw size={14} />
          <span>Retry summary</span>
        </div>

        <div className="nnr-settings-divider" />

        {/* Upload Audio */}
        <div className="nnr-settings-item" onClick={() => { audioUploadRef.current?.click(); setShowSettingsPopover(false); }}>
          <Upload size={14} />
          <span>Upload Audio</span>
        </div>

        {/* Language submenu - right side popover */}
        <div className="nnr-settings-item nnr-settings-item-has-flyout" onClick={() => { setShowLanguageSubmenu(!showLanguageSubmenu); setShowInstructionsSubmenu(false); setShowConsentSubmenu(false); }}>
          <Globe size={14} />
          <span>Language</span>
          <span className="nnr-settings-item-right">
            <span className="nnr-settings-selected">{selectedLanguage}</span>
            <ChevronRight size={12} />
          </span>
        </div>
        {showLanguageSubmenu && (
          <div className="nnr-settings-flyout">
            {LANGUAGES.map(lang => (
              <div key={lang} className={`nnr-settings-flyout-item${selectedLanguage === lang ? ' active' : ''}`} onClick={() => { saveProp('selectedLanguage', lang); setShowLanguageSubmenu(false); }}>
                {lang}
                {selectedLanguage === lang && <Check size={12} />}
              </div>
            ))}
          </div>
        )}

        {/* Instructions submenu - right side popover */}
        <div className="nnr-settings-item nnr-settings-item-has-flyout" onClick={() => { setShowInstructionsSubmenu(!showInstructionsSubmenu); setShowLanguageSubmenu(false); setShowConsentSubmenu(false); }}>
          <BookOpen size={14} />
          <span>Instructions</span>
          <span className="nnr-settings-item-right">
            <span className="nnr-settings-selected">{selectedInstruction}</span>
            <ChevronRight size={12} />
          </span>
        </div>
        {showInstructionsSubmenu && (
          <div className="nnr-settings-flyout">
            {/* BRIS-NN-MNB-T26: the presets, add-custom row and custom
                instructions all render from the shared InstructionsMenu, so
                this flyout and the footer selector cannot drift apart. */}
            <InstructionsMenu onDone={() => { setShowInstructionsSubmenu(false); setShowSettingsPopover(false); }} />
          </div>
        )}

        {/* Privacy Controls submenu */}
        <div className="nnr-settings-item nnr-settings-item-has-flyout" onClick={() => { setShowConsentSubmenu(!showConsentSubmenu); setShowLanguageSubmenu(false); setShowInstructionsSubmenu(false); }}>
          <Shield size={14} />
          <span>Privacy Controls</span>
          <span className="nnr-settings-item-right">
            <ChevronRight size={12} />
          </span>
        </div>
        {showConsentSubmenu && (
          <div className="nnr-settings-flyout">
            <div className="nnr-settings-flyout-item" onClick={() => { saveProp('consentEnabled', !consentEnabled); }}>
              <Volume2 size={14} />
              <span>Auto Play Consent</span>
              <label className="nnr-toggle-switch" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={consentEnabled} onChange={e => { e.stopPropagation(); saveProp('consentEnabled', e.target.checked); }} />
                <span className="nnr-toggle-slider"></span>
              </label>
            </div>
            <div className="nnr-settings-flyout-item">
              <Info size={14} />
              <span>Learn more</span>
            </div>
          </div>
        )}

        <div className="nnr-settings-divider" />

        {/* BRIS-NN-MNB-M03: clears transcript lines only — the block itself,
            its summary and its notes are left intact. */}
        <div
          className="nnr-settings-item"
          onClick={() => { clearTranscript(); setShowSettingsPopover(false); }}
        >
          <Eraser size={14} />
          <span>Delete transcript</span>
        </div>

        <div className="nnr-settings-divider" />

        {/* Copy link to block */}
        <div className="nnr-settings-item" onClick={() => { navigator.clipboard.writeText(window.location.href); setShowSettingsPopover(false); }}>
          <Link size={14} />
          <span>Copy link to block</span>
          <span className="nnr-settings-shortcut">Alt+⇧+L</span>
        </div>

        {/* Move to */}
        <div className="nnr-settings-item" onClick={() => { moveBlockToTop?.(block.id); setShowSettingsPopover(false); }}>
          <ArrowRight size={14} />
          <span>Move to</span>
          <span className="nnr-settings-shortcut">Ctrl+⇧+P</span>
        </div>

        {/* Delete */}
        <div className="nnr-settings-item" onClick={() => { setShowSettingsPopover(false); if (setDeleteConfirm) setDeleteConfirm(block.id); else deleteBlock?.(block.id); }}>
          <Trash2 size={14} />
          <span>Delete</span>
          <span className="nnr-settings-shortcut">Del</span>
        </div>

        <div className="nnr-settings-divider" />

        {/* Connect Calendar */}
        <div className="nnr-settings-item" onClick={connectNotionCalendar}>
          <Calendar size={14} />
          <span>Connect Calendar</span>
        </div>

        {/* Demo Ziva AI Meeting Notes */}
        <div className="nnr-settings-item">
          <Video size={14} />
          <span>Demo Ziva AI Meeting Notes</span>
        </div>

        <div className="nnr-settings-divider" />

        {/* Give us Feedback */}
        <div className="nnr-settings-item">
          <MessageCircle size={14} />
          <span>Give us Feedback</span>
        </div>

        {/* Learn more — BRIS-NN-MNB-M06: feature-maturity chip */}
        <div className="nnr-settings-item">
          <HelpCircle size={14} />
          <span>Learn more</span>
          <span className="nnr-settings-beta">Beta</span>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     BRIS-NN-MNB-H01/H04: Header date-tag selection state & handlers.
     All date arithmetic lives in shared/meetingDateTags.js.
     ═══════════════════════════════════════════════════════════════ */
  const dateSelection = useMemo(
    () => describeSelection({ ...block, date }),
    [block, date]
  );
  const datePresets = useMemo(
    () => buildPresets(dateSelection.mode),
    [dateSelection.mode]
  );
  /* Right-edge / inline label: prefer an explicit tag, else the date. */
  const headerDateLabel = dateSelection.tagLabel || dateSelection.displayDate;

  /* Apply a preset tag and co-relate the block's real date to it. */
  const applyDateTag = useCallback((tagKey) => {
    const iso = resolveTagToDate(tagKey, dateSelection.mode);
    if (iso) {
      setDate(iso);
      saveProp('date', iso);
    }
    saveProp('calendarEvent', tagKey);
    saveProp('calendarEventMode', dateSelection.mode);
    saveProp('calendarSource', CALENDAR_SOURCE.TAG);
    setShowCalendarPopover(false);
  }, [dateSelection.mode, saveProp]);

  /* Toggle Current <-> Last; re-resolves the date if a tag is active. */
  const toggleDateTagMode = useCallback(() => {
    const next = dateSelection.mode === TAG_MODES.LAST ? TAG_MODES.CURRENT : TAG_MODES.LAST;
    saveProp('calendarEventMode', next);
    if (dateSelection.tagKey) {
      const iso = resolveTagToDate(dateSelection.tagKey, next);
      if (iso) {
        setDate(iso);
        saveProp('date', iso);
      }
    }
  }, [dateSelection.mode, dateSelection.tagKey, saveProp]);

  /* Explicit date pick clears the tag — the date is now user-owned.
     The popover stays open so the user can keep adjusting, matching Notion. */
  const applyManualDate = useCallback((iso) => {
    if (!iso) return;
    setDate(iso);
    saveProp('date', iso);
    saveProp('calendarEvent', '');
    saveProp('calendarSource', CALENDAR_SOURCE.MANUAL);
  }, [saveProp]);

  /* Clear the date selection entirely (picker footer). */
  const clearDateSelection = useCallback(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    setDate(todayIso);
    saveProp('date', todayIso);
    saveProp('calendarEvent', '');
    saveProp('calendarSource', CALENDAR_SOURCE.MANUAL);
    setShowCalendarPopover(false);
  }, [saveProp]);

  /* Picker display preference — UI-only, intentionally not persisted. */
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS.RELATIVE);
  /* Calendar stays collapsed until the date field is clicked. */
  const [showDateCalendar, setShowDateCalendar] = useState(false);

  /* ── Title (contentEditable, uncontrolled to protect the caret) ──
     React must not re-render the text on every keystroke or the caret
     jumps to the start; we only push text in when it changes externally. */
  const titleRef = useRef(null);
  useEffect(() => {
    const el = titleRef.current;
    if (el && el.textContent !== (title || '')) {
      el.textContent = title || '';
    }
  }, [title]);

  const handleTitleInput = useCallback((e) => {
    const val = e.currentTarget.textContent || '';
    setTitle(val);
    saveProp('title', val);
  }, [saveProp]);

  /* Title is single-value: Enter commits rather than inserting a newline. */
  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }, []);

  /* BRIS-NN-MNB-H06: Notion Calendar module is not built yet.
     We only call a provider if one has been injected — no fabricated API. */
  const connectNotionCalendar = useCallback(() => {
    const provider = typeof window !== 'undefined' ? window.__notionCalendarProvider : null;
    if (provider && typeof provider.connect === 'function') {
      provider.connect();
    }
    setShowCalendarPopover(false);
  }, []);

  /* ═══════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T01/T02: canonical transcript lines.
     Normalising here (not in the view) keeps date/speaker parsing out
     of the UI and gives every consumer — display, translate, export —
     the same shape. Safe to re-run: already-canonical lines pass through.
     ═══════════════════════════════════════════════════════════════ */
  /* BRIS-NN-MNB-T62: never surface 'Unknown' in the UI. */
  const transcriptUserName = currentSpeaker || 'Briselle';

  const normalizedTranscriptLines = useMemo(
    () => normalizeLines(displayTranscriptLines, {
      userName: transcriptUserName,
      source: TRANSCRIPT_SOURCE.LIVE,
      date,
    }),
    [displayTranscriptLines, transcriptUserName, date]
  );

  /* The hidden prefix builder, handed to the view so it stays presentation-free. */
  const transcriptPrefixOf = useCallback(line => formatPrefix(line), []);

  /* BRIS-NN-MNB-T04: a live, not-yet-committed line so streaming speech can
     carry the same "ts | source | user |" prefix as committed lines. */
  const liveInterimLine = useMemo(
    () => ({
      id: 'tl_live',
      ts: formatTs(new Date()),
      source: TRANSCRIPT_SOURCE.LIVE,
      userName: transcriptUserName,
      content: '',
    }),
    [transcriptUserName, recording]
  );

  /* BRIS-NN-MNB-R01: single contract published to all sub-files. */
  const meetingNotesApi = {
    normalizedTranscriptLines,
    setPlayQueue,
    playQueue,
    removeAudioFiles,
    closeAllMenus,
    transcribeWrapRef,
    setShowResumeSubmenu,
    showResumeSubmenu,
    captureAudio,
    setTranscriptStarted,
    transcriptStarted,
    setInstructionIcons,
    instructionIcons,
    setHiddenInstructions,
    hiddenInstructions,
    setDefaultInstruction,
    defaultInstruction,
    moreMenuWrapRef,
    setShowTranscribeMenu,
    showTranscribeMenu,
    TRANSCRIBE_MODES,
    startTranscribe,
    liveInterimLine,
    transcriptPrefixOf,
    transcriptUserName,
    resolveRecognitionLang,
    LANGUAGE_AUTO,
    INDIAN_LANGUAGES,
    TRANSCRIPT_SOURCE,
    BR,
    INSTRUCTION_PRESETS,
    LANGUAGES,
    activeTab,
    activeTranscriptText,
    addManualInProgressRef,
    addManualLine,
    addParticipant,
    aiBatchEngagementLogs,
    aiInsights,
    aiInsightsAutoRef,
    aiNotesCollapsed,
    analyserRef,
    animationFrameRef,
    applyDateTag,
    applyManualDate,
    audioChunksRef,
    audioContextRef,
    audioDuration,
    audioFiles,
    audioFilesWrapRef,
    audioOutputDevices,
    audioRef,
    audioSource,
    audioSourceWrapRef,
    audioStreamRef,
    audioSttProgressPct,
    audioSttTeaserText,
    audioUploadRef,
    audioUrl,
    block,
    bulbWrapRef,
    bulletPoints,
    calendarWrapRef,
    clearAllLines,
    clearDateSelection,
    clearTranscript,
    closeAllPopovers,
    computedInsights,
    connectNotionCalendar,
    consentEnabled,
    consentMode,
    consentWizardStep,
    contentRef,
    copyText,
    currentPlaybackTime,
    currentPlayingAudioId,
    currentSpeaker,
    currentTime,
    customInstructionName,
    customInstructionPrompt,
    customInstructions,
    date,
    dateFormat,
    dateInputRef,
    datePresets,
    dateSelection,
    detectLanguagesFromTranscript,
    displayTranscriptLines,
    displayTranscription,
    downloadFile,
    downloadLLMLog,
    downloadWrapRef,
    dynamicConfirmModalConfig,
    editingAiNotes,
    editingLineId,
    enumerateOutputDevices,
    executeConfirmedAudioFileDelete,
    executePlayAudioFile,
    exportCsv,
    exportDocx,
    exportJson,
    exportToJSON,
    exportTxt,
    extractTextFromBlocks,
    fallbackExecCopy,
    fetchWithTimeout,
    filterNotesByToggles,
    finalNotes,
    finishTakingNotes,
    footerInstructionWrapRef,
    formatFileSize,
    formatFullTimestamp,
    formatTime,
    generateSummary,
    generateSummaryFromTranscript,
    getVisibleTranscriptText,
    getZivaApiConfig,
    handleAddCustomInstruction,
    handleAudioFileChange,
    handleAudioUpload,
    handleConnectorExportCancel,
    handleConnectorImportConfirm,
    handleEmailExportCancel,
    handleGenerateSummary,
    handleImportMappingCancel,
    handleRefresh,
    handleSeek,
    handleSelectDateTag,
    handleSpeakerChange,
    handleTitleInput,
    handleTitleKeyDown,
    handleTranslateTranscript,
    hasActionItemsSection,
    hasAudio,
    hasFollowUpSection,
    hasKeyPointsSection,
    hasSummarySection,
    headerDateLabel,
    includeActionItems,
    includeBullets,
    includeFollowUp,
    includeSummary,
    insightsCollapsed,
    instructionPrompts,
    interimText,
    isGeneratingSummary,
    isLastModifier,
    isMicMuted,
    isPaused,
    isPlaying,
    isReadingAloud,
    isTranscribingAudioFile,
    isTranslating,
    isTranslationMinimized,
    llmLogs,
    logLLMInteraction,
    mediaRecorderRef,
    micVolume,
    micVolumeSliderLevel,
    mode,
    modeRef,
    newParticipantEmail,
    newParticipantName,
    notesContent,
    openAddPromptModal,
    openEditPromptModal,
    outputDeviceWrapRef,
    participants,
    pauseAudio,
    pauseRecording,
    pinnedInsights,
    playAudio,
    playAudioFile,
    playSelectedAudioFiles,
    playbackTimerRef,
    processNotesLocally,
    processing,
    readAloud,
    readingStatusMessage,
    recStartTimeRef,
    recognition,
    recording,
    recordingRef,
    recordingTimer,
    removeAudioFile,
    removeParticipant,
    removeSelectedAudioFiles,
    renderCustomInstructionItem,
    renderCustomInstructions,
    renderMd,
    renderSettingsPopover,
    renderSummaryInstructionsPopoverContent,
    resumeRecording,
    saveProp,
    seekAudio,
    selectedAudioFileIds,
    selectedInstruction,
    selectedLanguage,
    selectedOutputDevice,
    selectedWizardInstruction,
    setActiveTab,
    setAiBatchEngagementLogs,
    setAiNotesCollapsed,
    setAudioDuration,
    setAudioFiles,
    setAudioOutputDevices,
    setAudioSttProgressPct,
    setAudioSttTeaserText,
    setAudioUrl,
    setBR,
    setConsentMode,
    setConsentWizardStep,
    setCurrentPlaybackTime,
    setCurrentPlayingAudioId,
    setCurrentSpeaker,
    setCustomInstructionName,
    setCustomInstructionPrompt,
    setCustomInstructions,
    setDate,
    setDateFormat,
    setDisplayTranscriptLines,
    setDynamicConfirmModalConfig,
    setEditingAiNotes,
    setEditingLineId,
    setInsightsCollapsed,
    setInstructionPrompts,
    setInterimText,
    setIsGeneratingSummary,
    setIsLastModifier,
    setIsMicMuted,
    setIsPaused,
    setIsPlaying,
    setIsReadingAloud,
    setIsTranscribingAudioFile,
    setIsTranslating,
    setIsTranslationMinimized,
    setLlmLogs,
    setMicVolume,
    setMicVolumeSliderLevel,
    setNewParticipantEmail,
    setNewParticipantName,
    setPinnedInsights,
    setProcessing,
    setReadingStatusMessage,
    setRecognition,
    setRecording,
    setSelectedAudioFileIds,
    setSelectedInstruction,
    setSelectedWizardInstruction,
    setShowAudioFilesDropdown,
    setShowAudioSourceMenu,
    setShowBulbInfo,
    setShowCalendarPopover,
    setShowConfirmClear,
    setShowConsentModal,
    setShowConsentSubmenu,
    setShowCopyToast,
    setShowDateCalendar,
    setShowDatePicker,
    setShowDownloadMenu,
    setShowFooterInstructionPopover,
    setShowInstructionsSubmenu,
    setShowLanguageSubmenu,
    setShowMoreMenu,
    setShowOutputDeviceMenu,
    setShowParticipantsPanel,
    setShowSettingsPopover,
    setShowTimeline,
    setShowTranslatePopover,
    setShowUploadPopover,
    setShowZivaApiSettingsModal,
    setSummaryDataState,
    setTimer,
    setTitle,
    setTranscriptCollapsed,
    setTranscriptExpanded,
    setTranscriptHasOverflow,
    setTranscriptSubTab,
    setTranscription,
    setTranslateFrom,
    setTranslateTo,
    setTranslatedLanguage,
    setTranslatedSummary,
    setTranslatedTranscriptLines,
    setTranslatedTranscription,
    setTranslationProgress,
    setUnifiedModalInstruction,
    setUnifiedModalMode,
    setUnifiedModalOpen,
    setUnifiedModalPrompt,
    setUploadPopoverPos,
    setViewMode,
    settingsPopoverRef,
    settingsWrapRef,
    shareNotes,
    showAudioFilesDropdown,
    showAudioSourceMenu,
    showBulbInfo,
    showCalendarPopover,
    showConfirmClear,
    showConsentModal,
    showConsentSubmenu,
    showCopyToast,
    showDateCalendar,
    showDatePicker,
    showDownloadMenu,
    showFooterInstructionPopover,
    showInstructionsSubmenu,
    showLanguageSubmenu,
    showMoreMenu,
    showOutputDeviceMenu,
    showParticipantsPanel,
    showSettingsPopover,
    showTimeline,
    showTranslatePopover,
    showUploadPopover,
    showZivaApiSettingsModal,
    speakerRef,
    splitFinalNotes,
    startRecording,
    stopRecording,
    stopTranscribingAudioFile,
    summary,
    summaryDataState,
    timer,
    timerRef,
    title,
    titleRef,
    toggleDateTagMode,
    togglePinInsight,
    togglePlayPause,
    toggleRecording,
    transcribeExistingAudioFile,
    transcribeSelectedAudioFiles,
    transcriptCollapsed,
    transcriptExpanded,
    transcriptHasOverflow,
    transcriptLines,
    transcriptLinesContainerRef,
    transcriptLinesRef,
    transcriptSubTab,
    transcription,
    transcriptionRef,
    translateFrom,
    translateTo,
    translateWrapRef,
    translatedLanguage,
    translatedSummary,
    translatedTranscriptLines,
    translatedTranscription,
    translationProgress,
    unifiedModalInstruction,
    unifiedModalMode,
    unifiedModalOpen,
    unifiedModalPrompt,
    updateBlockProperty,
    updateManualLine,
    uploadPopoverPos,
    uploadPopoverWrapRef,
    viewMode,
    wakeWordRef,
  };

  return (
    <MeetingNotesContext.Provider value={meetingNotesApi}>
    <div className="block-content">
      <div className={`mt-container${recording ? ' is-recording' : ''}`} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        <MeetingHeader />

        <MeetingTabBar />
        <TranscriptToolbar />

        {showParticipantsPanel && <ParticipantsPanel />}

        {viewMode === 'transcript' && <TranscriptPanel />}

        {viewMode === 'summary' && <SummaryTab />}

        {viewMode === 'notes' && <NotesTab />}
        <MeetingFooter />
        {(llmLogs.request || llmLogs.response) && <SummaryActions />}

      </div>

      <MeetingModals />
    </div>
    </MeetingNotesContext.Provider>
  );
});

/* Created At: 2026-08-10 | Last Modified: 2026-08-15 | TASK-MN-EDITOR-003: Full NotionNest page-style block editor for instruction editing */
/**
 * EditPromptModal — NotionNest page-style block editor for instruction editing.
 * Supports: paragraph, heading1, heading2, heading3, bulleted_list, todo, divider, quote blocks.
 * Features: + button to add blocks, block type switching via slash menu, delete blocks, drag reorder visual.
 * Renders inside a modal overlay matching Notion.so sub-page behavior.
 */
