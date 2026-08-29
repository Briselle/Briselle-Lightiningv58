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
/* BRIS-AI-T159: gateway-backed AI. When the router returns a pipe with
   viaGateway, there is no API key in the browser to call the provider
   with — the credential is in Vault and only the ai-gateway Edge
   Function can read it. These are the two calls that replace the direct
   fetches below. */
import { executeAI, transcribeAudio } from '../../../../services/aiGatewayClient';
/* BRIS-NN-MNB-T70: the AudioController import that was here is gone —
   the Base never rendered it. The one playback surface is
   transcript/MeetingAudioPlayer.jsx. */
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
import { RecordingOverlays } from './transcript/RecordingOverlays';
import { MeetingFooter } from './footer/MeetingFooter';
import { SummaryActions } from './summary/SummaryActions';
import { MeetingModals } from './config/MeetingModals';
import { InstructionEditorModal } from './config/InstructionEditorModal';
import {
  loadPromptDocument, emptyPromptDocument, invalidatePromptCache, upsertInstruction,
  deleteInstruction, resetInstructionToDefault,
} from '../../services/aiPromptConfigService';
import { LANGUAGE_CODE_MAP, NATIVE_LANGUAGE_DISPLAY, getNativeLangDisplay, resolveRecognitionLang, LANGUAGE_AUTO, INDIAN_LANGUAGES } from './constants';
/* BRIS-NN-MNB-T01/T02: canonical transcript line shape + hidden prefix */
import { FileService } from '../../../utility-modules/upload-module/FileService';
import { normalizeLines, formatPrefix, formatTs, TRANSCRIPT_SOURCE } from './transcript/transcriptLine';
import { blocksToMarkdown } from './promptSerializer';
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
  /* BRIS-NN-MNB-T57: files handed to the audio player.
     BRIS-NN-MNB-T70: the player is now the shared Briselle Audio
     Controller, which is a CONTROLLED component — it plays what
     `isPlaying` says. So the queue, its cursor and its play state all
     live here rather than inside the player. */
  const [playQueue, setPlayQueue] = useState([]);
  const [playQueueIndex, setPlayQueueIndex] = useState(0);
  const [queuePlaying, setQueuePlaying] = useState(false);
  const [playerError, setPlayerError] = useState('');
  /* BRIS-NN-MNB-T77: a failed soft delete is reported in the audio-files
     list rather than swallowed. */
  const [audioFilesError, setAudioFilesError] = useState('');
  /* BRIS-NN-MNB-T39: mode submenu under Resume transcription. */
  const [showResumeSubmenu, setShowResumeSubmenu] = useState(false);
  const calendarWrapRef = useRef(null);
  /* BRIS-NN-MNB-T21: dismiss the 3-dot menu when the user clicks away. */
  const moreMenuWrapRef = useRef(null);
  /* BRIS-NN-MNB-T42: anchors the split-button mode menu for dismiss. */
  const transcribeWrapRef = useRef(null);
  /* BRIS-NN-MNB-T73: the live recording controls, so RecordingPill can
     observe whether they are still visible and only surface the floating
     pill once they are not. */
  const recControlsRef = useRef(null);
  /* BRIS-NN-MNB-T90: the block root, so "Go to meeting note" can bring
     the note back into view from wherever the user has scrolled to. */
  const meetingRootRef = useRef(null);
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
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  /* ──────────────────────────────────────────────────────────────────
     BRIS-NN-MNB-T82 — summary progress checklist.

     Each entry is a step the pipeline ACTUALLY performed:
       { id, label, status: 'active' | 'done' | 'failed', detail? }

     Nothing here is decorative. A step is only added when its work
     starts and only marked done when that work returns, so the list is
     a report rather than an animation — the section rows come from
     headings streamed back by the model, not from a fixed script.
     ────────────────────────────────────────────────────────────────── */
  const [summarySteps, setSummarySteps] = useState([]);

  const setSummaryStep = useCallback((id, label, status, detail) => {
    setSummarySteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      const entry = { id, label, status, ...(detail !== undefined ? { detail } : {}) };
      if (idx === -1) return [...prev, entry];
      const next = [...prev];
      next[idx] = { ...next[idx], ...entry };
      return next;
    });
  }, []);

  /* Any step still 'active' when the run ends did finish — the run only
     reaches here once every awaited call has returned. */
  const settleSummarySteps = useCallback(() => {
    setSummarySteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'done' } : s));
  }, []);

  const resetSummarySteps = useCallback(() => setSummarySteps([]), []);
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
        if (!error && Array.isArray(data) && isMounted) {
          const dbFiles = [];
          data.forEach(row => {
            const sourceInfo = row.source_info || {};
            const custom = row.custom_metadata?.properties || {};
            /* The query already scopes to this block server-side. This is a
               defensive second pass for rows written by an older path. */
            const isBlockMatch =
              sourceInfo.blockId === block.id ||
              custom.blockId === block.id ||
              custom.objectId === block.id;
            if (!isBlockMatch) return;

            /* enterprise_files is the source of truth: a soft-deleted or
               failed row is simply not a file, as far as this block is
               concerned. */
            const status = row.status_information || {};
            if (status.isDeleted || status.status === 'Deleted'
              || status.status === 'FailedStorage' || status.isActive === false) return;

            const fileInfo = row.file_information || {};
            const phys = row.physical_metadata || {};
            const audit = row.audit_information || {};

            /* ══════════════════════════════════════════════════════════════
               BRIS-NN-MNB-T77 — read the columns that actually exist.

               This mapping previously read row.id, row.original_filename,
               row.file_url, row.cdn_url, row.file_size and
               row.duration_seconds. NONE of those columns exist.
               enterprise_files has file_id as its primary key and keeps
               everything else inside the file_information /
               physical_metadata JSONB documents — see
               scripts/enterprise_files_v2_schema.sql line 13.

               Every one of those reads produced undefined, which is the
               single root cause of all four reported symptoms:

                 • Every file showed the 'Audio Recording' fallback,
                   because fileInfo.name does not exist — FileService
                   writes the name as displayName / originalFileName.
                 • id and fileId were undefined, so ticking one row ticked
                   every row (selectedAudioFileIds.includes(undefined) is
                   true for all of them) and React had no stable key.
                 • FileService.delete(undefined) bailed out before touching
                   the database, so "deleted" recordings returned on the
                   next refresh — and the .catch(() => {}) around it hid
                   that completely.
                 • FileService.getSignedUrl(undefined) returned '', so
                   playback had no source: the reported play error.
               ══════════════════════════════════════════════════════════════ */
            const damId = row.file_id;
            if (!damId) return;   /* unusable without its primary key */

            dbFiles.push({
              id: damId,
              fileId: damId,
              name: fileInfo.displayName || fileInfo.originalFileName || 'Recording',
              /* Deliberately empty. The bucket is private, so publicUrl is
                 not fetchable; the signed-URL pass (BRIS-NN-MNB-T75)
                 resolves a usable one, and getSignedUrl itself falls back
                 to publicUrl when the bucket is public. */
              url: '',
              type: fileInfo.mimeType || fileInfo.contentType || 'audio/webm',
              size: Number(phys.fileSize) || 0,
              /* BRIS-NN-MNB-T59/T77: duration lives in physical_metadata as
                 `duration`; the upload's own metadata copy is the fallback. */
              duration: Number(
                phys.duration
                ?? custom.durationSeconds
                ?? custom.duration_seconds
                ?? 0
              ) || 0,
              storagePath: fileInfo.storagePath || null,
              /* T142: keep the few fields getSignedUrlFromRow reads, so
                 signing does not re-fetch a row we just listed. The whole
                 row would bloat the block payload on every save. */
              damRow: {
                file_id: damId,
                file_information: {
                  storagePath: fileInfo.storagePath || null,
                  bucketName: fileInfo.bucketName || null,
                  publicUrl: fileInfo.publicUrl || null,
                },
                status_information: row.status_information || {},
              },
              damStatus: 'uploaded',
              timestamp: row.created_at || audit.createdOn || null,
              createdAt: row.created_at || audit.createdOn || null,
            });
          });

          /* ══════════════════════════════════════════════════════════════
             BRIS-NN-MNB-T77 — reconcile against the DB, do not merge into
             whatever the block/localStorage happens to hold.

             The old merge only ever ADDED rows. Because db.fileId was
             undefined it never matched a local record, so every refresh
             appended the same recordings again — the reported "I deleted
             my files and now there are 5".

             The DB is authoritative, so the rule is now:
               • every active DAM row is present;
               • a local record still holds playable bytes (data, or a blob
                 URL from this session) and has no DAM row yet — keep it,
                 it has not been uploaded;
               • a local record claims a fileId that the DB does not return
                 — it was soft-deleted elsewhere, so drop it;
               • a local record with no fileId, no data and no url is a
                 ghost from the broken mapping — drop it.

             GRACE WINDOW: a recording uploaded moments ago can be missing
             from a query that was already in flight. Records younger than
             UPLOAD_GRACE_MS are never pruned, so a fresh recording is
             never deleted by a stale read.
             ══════════════════════════════════════════════════════════════ */
          const UPLOAD_GRACE_MS = 120000;
          const damIds = new Set(dbFiles.map(f => f.fileId));
          const now = Date.now();

          /* Computed here and only RETURNED by the updater — writing to
             localStorage inside the updater would be I/O during the render
             phase, run twice under StrictMode. */
          let reconciled = null;
          setAudioFiles(prev => {
            const localOnly = (prev || []).filter(local => {
              if (!local) return false;
              if (local.fileId && damIds.has(local.fileId)) return false; /* DAM row wins */

              const age = local.timestamp ? now - new Date(local.timestamp).getTime() : Infinity;
              if (Number.isFinite(age) && age < UPLOAD_GRACE_MS) return true;

              if (local.fileId) return false;          /* soft-deleted in the DAM */
              return !!(local.data || local.url);      /* never uploaded — still ours */
            });

            reconciled = [...dbFiles, ...localOnly];
            return reconciled;
          });

          /* Keep the offline cache in step, or the pruned ghosts are simply
             reloaded from localStorage on the next mount and the deleted
             files reappear all over again. */
          if (reconciled) {
            try {
              localStorage.setItem(`nn_audio_files_${block.id}`, JSON.stringify(reconciled));
            } catch (e) { /* quota — the DB row remains the source of truth */ }
          }
        }
      } catch (err) {
        console.warn('Notice: enterprise_files table fetch deferred:', err);
      }
    }
    loadAudioFromDam();
    return () => { isMounted = false; };
    /* BRIS-NN-MNB-T77: audioUrl removed from the deps. It made this effect
       re-run every time a recording finished (stopRecording sets audioUrl),
       which raced the row it had just inserted and is how a just-saved
       recording could be pruned. Block identity is the only real input. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [showInstructionsSubmenu, setShowInstructionsSubmenu] = useState(false);
  const [showConsentSubmenu, setShowConsentSubmenu] = useState(false);
  /* BRIS-NN-MNB-T93: was useState([]) and never loaded from anywhere, so
     no custom instruction could ever appear and handleGenerateSummary's
     lookup against it was always undefined. Derived from the prompt
     document below (see promptDoc) — declared here only to keep the
     existing setter contract for legacy call sites. */
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

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-T146 — nothing is signed at mount any more.

     T75 signed every audio file on mount so play() could be reached
     without an await. T140 tried to cap that at one file per pass, which
     did not work: the effect depends on audioFiles and ENDS by calling
     setAudioFiles, so each resolution retriggered it and the whole list
     still resolved — one render and one request apart. That is the
     MeetingNotesBlockBase.jsx:479 → :484 loop repeating down the console
     stack, and the source of the 400s.

     Signing is now strictly on demand, in startPlayQueue, which has
     carried that fallback since T75. Mount cost: zero requests. The
     price is one round-trip before the first play of a file, once.

     signedUrlAttemptedRef survives as the on-demand guard so a file whose
     object is missing is not re-signed on every click.
     ══════════════════════════════════════════════════════════════════ */
  const signedUrlAttemptedRef = useRef(new Set());

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
  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T93/T94 — the prompt library.

     `promptDoc` is the platform_config document (config_type 8,
     'AIMeetingNotesPrompt', entity 1000000000). It is the SINGLE source
     for both the menu list and the prompt text, which is what stops the
     two drifting: the old code kept a hardcoded INSTRUCTION_PRESETS
     array here and the prompts in constants.js under different names, so
     four of the six menu entries resolved to nothing and silently fell
     back to Auto.

     A block-local `instructionPrompts` map used to live here as well,
     seeded with five names that appeared nowhere in the UI. It is gone —
     prompts are org-level now.
     ══════════════════════════════════════════════════════════════════ */
  const [promptDoc, setPromptDoc] = useState(null);
  const [promptDocLoading, setPromptDocLoading] = useState(true);

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-T144 — a failed mount read degrades THIS block, not the page.

     A rejected fetch here previously propagated as an unhandled
     "TypeError: Failed to fetch" and an error boundary took the whole view
     down to "Back to records". One dropped request should cost one menu,
     not the document.

     One retry, and only for a network-class rejection — a 4xx will not fix
     itself, and retrying it just doubles the load that caused the problem.
     ══════════════════════════════════════════════════════════════════ */
  const [promptLoadError, setPromptLoadError] = useState('');
  const [promptReloadKey, setPromptReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;

    const isNetworkish = (e) => {
      const m = String(e?.message || e || '').toLowerCase();
      return m.includes('failed to fetch') || m.includes('networkerror')
        || m.includes('load failed') || m.includes('timeout');
    };

    const attempt = (retriesLeft) => loadPromptDocument()
      .then((doc) => {
        if (!alive) return;
        setPromptDoc(doc);
        setPromptLoadError('');
        setPromptDocLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        if (retriesLeft > 0 && isNetworkish(e)) {
          setTimeout(() => { if (alive) attempt(retriesLeft - 1); }, 1200);
          return;
        }
        console.warn('[AIPrompts] load failed:', e);
        setPromptLoadError('Could not load the AI prompt library.');
        setPromptDocLoading(false);
      });

    attempt(1);
    return () => { alive = false; };
  }, [promptReloadKey]);

  const retryPromptLoad = useCallback(() => {
    setPromptDocLoading(true);
    setPromptLoadError('');
    invalidatePromptCache();
    setPromptReloadKey(k => k + 1);
  }, []);

  /* T102: an empty shape while loading, and if the seed row is absent it
     STAYS empty — the menu then says the library is missing rather than
     falling back to prompts compiled into the client. */
  const activePromptDoc = promptDoc || emptyPromptDocument();
  const promptLibraryMissing = !promptDocLoading && !!activePromptDoc.missing;

  /** name -> prompt text, for the summary call. */
  const instructionPrompts = useMemo(() => {
    const map = {};
    Object.keys(activePromptDoc.instructions).forEach(k => {
      map[k] = activePromptDoc.instructions[k].promptText || '';
    });
    return map;
  }, [activePromptDoc]);

  /* User-created instructions, as NAMES. InstructionsMenu and the slider
     flyout both treat these as strings; the only place that treated them
     as {name, prompt} objects was the summary lookup, which now reads
     instructionPrompts instead. One shape, one meaning. */
  const customInstructions = useMemo(
    () => activePromptDoc.order.filter(k => !activePromptDoc.instructions[k]?.isSystem),
    [activePromptDoc]
  );
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

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T90 — "Still there?" idle prompt.

     A recording left running on an empty room keeps the microphone open
     and keeps writing nothing. After SILENCE_NOTICE_MS with no
     transcription activity the block offers the two useful actions:
     open the note, or stop.

     Silence is measured from REAL activity — a committed line or an
     interim result — not from a timer started at record time, so a
     continuously-talking meeting never sees it.

     Dismissing hides it for the current silence only: the moment speech
     resumes the flag clears, so a second silence re-arms it.
     ══════════════════════════════════════════════════════════════════ */
  const SILENCE_NOTICE_MS = 15000;
  const lastSpeechAtRef = useRef(Date.now());
  const silenceDismissedRef = useRef(false);
  const [showSilenceNotice, setShowSilenceNotice] = useState(false);

  /* Speech resets the window. */
  useEffect(() => {
    lastSpeechAtRef.current = Date.now();
    silenceDismissedRef.current = false;
    setShowSilenceNotice(false);
  }, [interimText, displayTranscriptLines.length]);

  useEffect(() => {
    /* Paused is a deliberate silence — the user knows the state. */
    if (!recording || isPaused) {
      setShowSilenceNotice(false);
      return undefined;
    }

    /* ────────────────────────────────────────────────────────────────
       BRIS-NN-MNB-T91: the window restarts HERE, when recording starts
       or resumes.

       lastSpeechAtRef was seeded at component mount and only re-stamped
       by speech. A block that had been open for longer than
       SILENCE_NOTICE_MS before Record was pressed was therefore already
       "silent" by that measure, and the notice appeared on the first
       one-second tick instead of after fifteen seconds of quiet.

       The effect above cannot cover this: with no speech yet, neither
       interimText nor the line count changes when recording begins, so
       it never re-runs.
       ──────────────────────────────────────────────────────────────── */
    lastSpeechAtRef.current = Date.now();
    silenceDismissedRef.current = false;
    setShowSilenceNotice(false);

    const id = setInterval(() => {
      if (silenceDismissedRef.current) return;
      setShowSilenceNotice(Date.now() - lastSpeechAtRef.current >= SILENCE_NOTICE_MS);
    }, 1000);
    return () => clearInterval(id);
  }, [recording, isPaused]);

  const dismissSilenceNotice = useCallback(() => {
    silenceDismissedRef.current = true;
    setShowSilenceNotice(false);
  }, []);

  const goToMeetingNote = useCallback(() => {
    setViewMode('transcript');
    setShowSilenceNotice(false);
    meetingRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

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
  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T93 — one source of truth for the selected instruction.

     This was `useState(block.selectedInstruction || 'Auto')` with no sync
     effect, running alongside `block.selectedInstruction` written by
     saveProp. Two stores for one value, and nothing kept them in step:
     whichever a consumer happened to read decided what it displayed, so
     the slider menu and the footer could disagree.

     Derived now, so drift is not expressible. `setSelectedInstruction`
     stays as a saveProp wrapper — every existing call site keeps working
     and there is no second store for it to update.
     ══════════════════════════════════════════════════════════════════ */
  const selectedInstruction = block.selectedInstruction
    || block.defaultInstruction
    || 'Auto';
  const setSelectedInstruction = useCallback(
    (name) => saveProp('selectedInstruction', name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [block.id, updateBlockProperty]
  );
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

  /* BRIS-NN-MNB-T76: which Briselle Audio Controller layout this block
     shows. 'simple' is the default compact single line; 'full' is the
     two-line player with the brand badge and speaker selector. The user
     switches between them from the player itself and the choice persists
     per block — `audioPlayerVariant` is whitelisted in
     core/notionNestPageDefaults.ts, without which it would be silently
     stripped on every save. */
  /* BRIS-NN-MNB-T79: defaults to 'full'. The two-line controller IS the
     audio controller; 'simple' is the minimal one-line mode the user opts
     into with the toggle. Defaulting to 'simple' meant the full layout
     never rendered unless the toggle was clicked, which is why the T78
     repositioning looked like it had not been applied at all. */
  const playerVariant = block.audioPlayerVariant === 'simple' ? 'simple' : 'full';
  const setPlayerVariant = useCallback(
    (v) => saveProp('audioPlayerVariant', v === 'full' ? 'full' : 'simple'),
    [saveProp]
  );

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

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T132 — the recogniser was using a stale language.

     startRecording sets recog.lang from selectedLanguage, but its
     dependency array was [saveProp, isTranscribingAudioFile, audioUrl] —
     selectedLanguage was NOT in it. The callback therefore kept whatever
     the language was when it was last created, so choosing Tamil and then
     pressing Start still opened the session in the previous language and
     nothing was recognised.

     Read through a ref as well as fixing the deps: the language can be
     changed from a menu that is open at the moment Start is pressed, and
     the ref is always current regardless of when the callback was built. */
  const selectedLanguageRef = useRef(null);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser. Use Chrome or Edge.'); return; }

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    /* BRIS-NN-MNB-T03: honour the user's language choice. This was hardcoded
       to en-US, which silently ignored the language selector. */
    recog.lang = resolveRecognitionLang(selectedLanguageRef.current || selectedLanguage);
    /* T132: visible, so a wrong language is diagnosable rather than silent. */
    console.debug('[Transcribe] recognition language:', recog.lang,
      '(from', selectedLanguageRef.current || selectedLanguage, ')');
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
  }, [saveProp, isTranscribingAudioFile, audioUrl, selectedLanguage]);

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
    /* BRIS-NN-MNB-T81: every start mode reveals the Transcript panel.
       Starting from the Summary or Notes tab used to leave the user
       looking at a static page while lines were being captured out of
       sight. Set before the mode branch so the upload path gets it too. */
    setViewMode('transcript');
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

    /* BRIS-NN-MNB-T78: releasing the microphone tracks while MediaRecorder
       is still flushing can truncate — or empty — the final chunk. The
       release is therefore deferred until onstop has the data. */
    const releaseMicrophone = () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
    };

    // Only save audio if it was a LIVE recording (not uploaded file transcription)
    if (!isTranscribingAudioFile && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;

      /* ═══════════════════════════════════════════════════════════════
         BRIS-NN-MNB-T06: persist the recording through the DAM.

         FileService writes the enterprise_files row FIRST and only then
         uploads the object, so the metadata id owns the stored file —
         the ordering the DAM refactor requires. The block keeps a fileId
         reference instead of a base64 blob; base64 is written only if the
         upload fails, so a network problem never loses a recording.
         ═══════════════════════════════════════════════════════════════ */
      const persistRecording = (audioBlob) => {
        const stamp = new Date();
        /* BRIS-NN-MNB-T77: "Recording <timestamp>", local time, per the
           agreed naming rule. Every recording therefore has a unique,
           human-readable name — which matters because this string is what
           file_information.displayName stores and what the audio-files
           list shows. The stored object itself is named <fileId>.webm, so
           the spaces here never reach the storage path. */
        const pad = (n) => String(n).padStart(2, '0');
        const fileName = `Recording ${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`
          + ` ${pad(stamp.getHours())}-${pad(stamp.getMinutes())}-${pad(stamp.getSeconds())}.webm`;
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
          setAudioFiles(prev => {
            const next = [...(prev || []), record];
            try {
              localStorage.setItem(`nn_audio_files_${block.id}`, JSON.stringify(next));
            } catch (e) { /* quota — the DB row remains the source of truth */ }
            saveProp('audioFiles', next);
            return next;
          });
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
            /* BRIS-NN-MNB-T59: MediaRecorder webm carries no duration
               header, so the browser reports Infinity and physical
               metadata stores null. The recorded timer is the only
               reliable duration, which is why it is written here too. */
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
              fileId: res?.fileId || null,
              storagePath: res?.storagePath || null,
              damStatus: 'uploaded',
            });
            /* T82: the capture row only turns green once the DAM upload
               has genuinely returned. */
            setSummaryStep('capture', 'Saving audio recording', 'done');
          })
          .catch((err) => {
            /* Keep the audio locally so nothing is lost, and flag it so a
               retry can push it to the DAM later. */
            console.error('Recording upload failed:', err);
            setAudioFilesError('That recording could not be uploaded — it is kept on this device only.');
            setSummaryStep('capture', 'Saving audio recording', 'failed',
              'Kept on this device only.');
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
      };

      /* ───────────────────────────────────────────────────────────────
         BRIS-NN-MNB-T78 — build the blob in onstop, NOT after stop().

         MediaRecorder.stop() is asynchronous: it flushes the recording
         through a final `dataavailable` event and only then fires
         `onstop`. startRecording() calls mr.start() with no timeslice,
         so `dataavailable` fires EXACTLY ONCE — during that flush.

         This code used to call stop() and build the Blob on the very
         next line, while audioChunksRef was still empty. Every single
         recording was therefore uploaded as a ZERO-BYTE audio/webm file.
         A 0-byte object uploads cleanly, gets a valid signed URL and
         reports duration 0, so nothing failed anywhere in the DAM chain
         and the only visible symptom was the player refusing to play:
         "This audio could not be played" at 00:00 / 00:00.
         ─────────────────────────────────────────────────────────────── */
      let finalized = false;
      const finalize = () => {
        if (finalized) return;          /* onstop must not upload twice */
        finalized = true;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        releaseMicrophone();

        /* Never persist an empty recording: a 0-byte row and object can
           never play, and is exactly the state this task cleaned up. */
        if (!audioBlob.size) {
          console.error('Recording produced no audio data — nothing was saved.');
          setAudioFilesError('That recording captured no audio and was not saved.');
          return;
        }

        persistRecording(audioBlob);
      };

      recorder.onstop = finalize;
      recorder.stop();
    } else {
      /* No recorder ran (transcript-only, or an uploaded file), so there
         is no flush to wait for. */
      releaseMicrophone();
    }

    // Final save of transcript data
    saveProp('transcription', transcriptionRef.current);
    saveProp('transcriptLines', transcriptLinesRef.current);

    setIsTranscribingAudioFile(false);

    /* ══════════════════════════════════════════════════════════════════
       BRIS-NN-MNB-T82 — stopping ALWAYS produces a summary.

       The transcript text is read from transcriptLinesRef rather than
       from displayTranscriptLines: the state setters above have not
       flushed yet at this point, so the closure's copy would be one
       render behind and the final lines would be missing from the
       summary input. The ref is written synchronously as lines commit.
       ══════════════════════════════════════════════════════════════════ */
    const finalTranscript = (transcriptLinesRef.current || [])
      .map(l => (typeof l === 'string' ? l : l?.content || ''))
      .filter(Boolean)
      .join('\n') || transcriptionRef.current || '';

    /* Guarded on the transcript alone. extractTextFromBlocks is declared
       ~600 lines below this point; referencing it here would work only
       because stopRecording runs after render, and that is precisely the
       forward-reference pattern that has bitten this file before.
       handleGenerateSummary folds the notes in anyway. */
    if (finalTranscript.trim()) {
      resetSummarySteps();
      /* Only claim a capture step when audio was actually captured. */
      if (!isTranscribingAudioFile && captureAudioRef.current) {
        setSummaryStep('capture', 'Saving audio recording', 'active');
      }
      setSummaryStep('transcribe', 'Transcribing', 'done');
      generateSummaryRef.current?.(finalTranscript, { keepSteps: true });
    }
  }, [recognition, timer, saveProp, audioFiles, isTranscribingAudioFile, setSummaryStep, resetSummarySteps]);

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
    /* BRIS-NN-MNB-T81: resuming shows the transcript too. */
    setViewMode('transcript');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recog = new SR();
      recog.continuous = true;
      recog.interimResults = true;
      /* BRIS-NN-MNB-T03: honour the user's language choice (was hardcoded). */
      recog.lang = resolveRecognitionLang(selectedLanguageRef.current || selectedLanguage);
    /* T132: visible, so a wrong language is diagnosable rather than silent. */
    console.debug('[Transcribe] recognition language:', recog.lang,
      '(from', selectedLanguageRef.current || selectedLanguage, ')');
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

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T127 — server-side transcription of an uploaded file.

     What this replaces: uploading a file used to PLAY IT OUT LOUD and
     transcribe it through the microphone (`startRecording()` with
     isTranscribingAudioFile). That is why "Transcribe audio file" and
     "upload audio file" behaved identically and both badly — it was the
     live path wearing a different label, so it inherited every limit of
     the Web Speech API and needed the room to be silent.

     Now the file goes to the Ziva STT pipe (config_type 8, scope 'stt')
     and comes back as timed segments. Real transcription, no playback,
     no microphone.

     LANGUAGE (T128): Whisper detects the language itself when none is
     given, so "Auto" genuinely auto-detects here — unlike the live path,
     where the Web Speech API requires a fixed BCP-47 tag up front and
     cannot detect anything. Segment-level detection also means a
     recording that switches language partway is followed correctly.
     ══════════════════════════════════════════════════════════════════ */

  /** mm:ss for a segment offset, matching the live prefix format. */
  const offsetTs = useCallback((seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, []);

  /** Picker label -> ISO-639-1, or '' for Auto (let the model decide). */
  const sttLanguageCode = useCallback(() => {
    if (!selectedLanguage || selectedLanguage === LANGUAGE_AUTO) return '';
    const tag = LANGUAGE_CODE_MAP[selectedLanguage];
    /* Whisper wants the bare language, not a region: 'en-IN' -> 'en'. */
    return tag ? String(tag).split('-')[0] : '';
  }, [selectedLanguage]);

  /* getZivaApiConfig and transcriptUserName are declared several hundred
     lines BELOW this function. The body may reference them — it only runs
     on upload — but a dependency array may not: it is evaluated during
     render and would throw "cannot access before initialization". Same
     ref pattern as generateSummaryRef. */
  const sttRefs = useRef({});

  const transcribeAudioFile = useCallback(async (file) => {
    const sttPipe = sttRefs.current.getZivaApiConfig('stt');
    const { apiKey, baseUrl, model, providerName } = sttPipe;

    /* BRIS-AI-T159: a gateway pipe has no key or base URL in the
       browser by design, so it must not be judged unconfigured for
       lacking them. */
    if (!sttPipe.viaGateway && (!apiKey || !baseUrl)) {
      setAudioSttTeaserText(
        'No AI configuration is enabled for Speech to Text. Open Settings > AI Providers Config, '
        + 'add a provider with an API key and a model, and create a configuration tagged '
        + '"Speech to Text".'
      );
      return;
    }

    setIsTranscribingAudioFile(true);
    setAudioSttProgressPct(10);
    setAudioSttTeaserText(`Transcribing ${file.name || 'audio'} via ${providerName}…`);

    try {
      setAudioSttProgressPct(35);

      /* ══════════════════════════════════════════════════════════════
         BRIS-AI-T159 — one `data` from either path.

         Everything below this point (segment mapping, detected language,
         the summary hand-off) is shared. Giving the gateway its own copy
         of that logic is exactly how the two paths would drift apart —
         which is the bug the earlier "two audio transcription paths"
         round already had to fix once.
         ══════════════════════════════════════════════════════════════ */
      let data;
      const lang = sttLanguageCode();

      if (sttPipe.viaGateway) {
        const result = await transcribeAudio(
          sttPipe.configurationId || 'stt',
          file,
          { language: lang || 'auto', filename: file.name || 'recording.webm' }
        );
        if (!result.ok) {
          throw new Error(result.error?.message || 'Transcription failed at the AI gateway.');
        }
        /* The gateway passes the provider's verbose_json through as
           `raw`, so the segment timings survive the round trip. */
        data = (result.raw && typeof result.raw === 'object')
          ? result.raw
          : { text: result.text, language: result.language };
      } else {
        /* T147: no invented model name here either. */
        if (!model) {
          throw new Error(providerName + ' has no speech-to-text model configured. '
            + 'Set one in Settings > AI Providers Config.');
        }
        const form = new FormData();
        form.append('file', file, file.name || 'recording.webm');
        form.append('model', model);
        /* verbose_json is what carries segments and the detected language;
           plain json returns one undifferentiated string. */
        form.append('response_format', 'verbose_json');
        if (lang) form.append('language', lang);

        const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/audio/transcriptions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });

        if (!res.ok) {
          let reason = `${res.status} ${res.statusText}`;
          try { reason = (await res.json())?.error?.message || reason; } catch (e) { /* status is enough */ }
          throw new Error(`${providerName}: ${reason}`);
        }
        data = await res.json();
      }

      setAudioSttProgressPct(75);

      const segments = Array.isArray(data?.segments) ? data.segments : [];
      const lines = segments.length
        ? segments
            .map(seg => ({
              id: `tl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
              ts: offsetTs(seg.start),
              source: TRANSCRIPT_SOURCE.AUDIO_FILE,
              userName: sttRefs.current.transcriptUserName,
              content: String(seg.text || '').trim(),
            }))
            .filter(l => l.content)
        /* Some models answer with text only; keep it rather than lose it. */
        : (String(data?.text || '').trim()
            ? [{
                id: `tl_${Date.now().toString(36)}`,
                ts: offsetTs(0),
                source: TRANSCRIPT_SOURCE.AUDIO_FILE,
                userName: sttRefs.current.transcriptUserName,
                content: String(data.text).trim(),
              }]
            : []);

      if (!lines.length) throw new Error('No speech was detected in this file.');

      /* Appended, so transcribing a second file does not discard the first. */
      const merged = [...(transcriptLinesRef.current || []), ...lines];
      transcriptLinesRef.current = merged;
      setDisplayTranscriptLines(merged);
      saveProp('transcriptLines', merged);

      const joined = merged.map(l => l.content).join('\n');
      transcriptionRef.current = joined;
      setTranscription(joined);
      saveProp('transcription', joined);

      setTranscriptStarted(true);
      saveProp('transcriptStarted', true);
      setViewMode('transcript');

      setAudioSttProgressPct(100);
      setAudioSttTeaserText(
        data?.language
          ? `Transcribed ${lines.length} segments · detected ${data.language}`
          : `Transcribed ${lines.length} segments`
      );

      /* T127: the summary runs off the file transcript exactly as it does
         after a live recording. */
      generateSummaryRef.current?.(joined, { keepSteps: false });
    } catch (err) {
      console.error('Audio file transcription failed:', err);
      setAudioSttTeaserText(String(err?.message || err));
    } finally {
      setIsTranscribingAudioFile(false);
    }
  }, [sttLanguageCode, offsetTs, saveProp]);

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
      
      /* T127: no auto-play and no microphone. The file used to be played
         aloud so the live recogniser could hear it — that is what made
         this path unusable. It is sent to the STT provider instead. */
      transcribeAudioFile(file);
      };  /* end commitUpload */

      /* loadedmetadata gives us the real length; onerror still commits so a
         file the browser can't decode is recorded rather than dropped. */
      probe.onloadedmetadata = () => commitUpload(probe.duration);
      probe.onerror = () => commitUpload(0);
      probe.src = audioData;
    };
    reader.readAsDataURL(file);
  }, [saveProp, audioFiles, transcribeAudioFile]);

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
  /* BRIS-NN-MNB-T57: hand the file to the player instead of poking an
     <audio> element that was never rendered.
     BRIS-NN-MNB-T75: the queue holds IDS, not copies of the records.
     Copies went stale the moment the pre-resolve effect above patched a
     signed URL into audioFiles — the queue kept the url-less snapshot and
     the track stayed unplayable. Deriving the track from audioFiles on
     every render means it always sees the latest resolved URL. */
  const startPlayQueue = useCallback((files) => {
    const list = (files || []).filter(Boolean);
    if (!list.length) return;
    setPlayerError('');
    setPlayQueue(list.map(f => f.id));
    setPlayQueueIndex(0);
    setCurrentPlayingAudioId(list[0].id || null);
    setQueuePlaying(true);
    setShowAudioFilesDropdown(false);

    /* ══════════════════════════════════════════════════════════════
       T146: this is now the ONLY place a URL is signed. Only the files
       actually queued for playback are resolved, and only once —
       signedUrlAttemptedRef stops a file whose storage object is missing
       from being re-signed on every click, which is what filled the
       console with 400s.
       ══════════════════════════════════════════════════════════════ */
    const unresolved = list.filter(f =>
      f.fileId && !f.url && !f.data && !signedUrlAttemptedRef.current.has(f.fileId)
    );
    if (!unresolved.length) return;

    unresolved.forEach(async (f) => {
      signedUrlAttemptedRef.current.add(f.fileId);
      try {
        /* T142: sign from the row already listed — one call, not two. */
        const url = f.damRow
          ? await FileService.getSignedUrlFromRow(f.damRow)
          : await FileService.getSignedUrl(f.fileId);
        if (!url) throw new Error('The stored audio file could not be found.');
        setAudioFiles(prev => (prev || []).map(x =>
          x.id === f.id && !x.url ? { ...x, url } : x
        ));
      } catch (e) {
        setPlayerError('Could not load "' + (f.name || 'this recording') + '" - the stored file is missing.');
      }
    });
  }, []);

  const playAudioFile = useCallback((file) => {
    if (file) startPlayQueue([file]);
  }, [startPlayQueue]);

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
  /* BRIS-NN-MNB-T77: the soft delete is now AWAITED and its result checked.
     It used to be fire-and-forget behind `.catch(() => {})`, so when
     FileService.delete bailed out on an undefined fileId — which it always
     did, because the loader never read file_id — the row stayed Active
     while the UI removed it anyway. The file came back on the next
     refresh and nothing anywhere said why.

     The row is the source of truth, so the UI now only forgets a file once
     the database has actually marked it deleted. A failure keeps the file
     visible and reports it, rather than pretending. */
  const removeAudioFiles = useCallback(async (fileIds) => {
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
    if (!ids.length) return;
    const idSet = new Set(ids);

    const targets = (audioFiles || []).filter(f => idSet.has(f.id));
    if (!targets.length) return;

    setAudioFilesError('');

    const results = await Promise.all(targets.map(async (f) => {
      /* No fileId means it never reached the DAM (a pending or failed
         upload), so there is nothing to soft-delete — dropping it locally
         is the whole operation. */
      if (!f.fileId) return { id: f.id, ok: true };
      try {
        const ok = await FileService.delete(f.fileId, false);
        return { id: f.id, ok: ok !== false };
      } catch (e) {
        return { id: f.id, ok: false, error: e };
      }
    }));

    const deleted = new Set(results.filter(r => r.ok).map(r => r.id));
    const failed = results.filter(r => !r.ok);

    if (deleted.size) {
      const updatedAudioFiles = (audioFiles || []).filter(f => !deleted.has(f.id));
      setAudioFiles(updatedAudioFiles);
      saveProp('audioFiles', updatedAudioFiles);
      try {
        localStorage.setItem(`nn_audio_files_${block.id}`, JSON.stringify(updatedAudioFiles));
      } catch (e) { /* quota — the DB row remains the source of truth */ }
      setSelectedAudioFileIds(prev => prev.filter(id => !deleted.has(id)));
    }

    if (failed.length) {
      setAudioFilesError(
        failed.length === 1
          ? 'That recording could not be deleted — it is still on the server.'
          : `${failed.length} recordings could not be deleted — they are still on the server.`
      );
    }
  }, [audioFiles, block.id, saveProp]);

  /* Single delete is the batch path with one id — one implementation. */
  const removeAudioFile = useCallback(
    (fileId) => removeAudioFiles([fileId]),
    [removeAudioFiles]
  );

  const playSelectedAudioFiles = useCallback(() => {
    const chosen = (audioFiles || []).filter(f => selectedAudioFileIds.includes(f.id));
    startPlayQueue(chosen);
  }, [audioFiles, selectedAudioFileIds, startPlayQueue]);

  /* ──────────────────────────────────────────────────────────────────
     BRIS-NN-MNB-T70 — play-queue transport.

     The Briselle Audio Controller is a controlled component: it plays
     whatever `queuePlaying` says and reports back through these
     handlers. Keeping the queue here (rather than inside the player) is
     what lets the floating mini-player in T74 show the same track and
     the same transport state without a second copy of this logic.
     ────────────────────────────────────────────────────────────────── */
  const playQueueTracks = useMemo(
    () => (playQueue || [])
      .map(id => (audioFiles || []).find(f => f.id === id))
      .filter(Boolean),
    [playQueue, audioFiles]
  );

  const currentQueueTrack = playQueueTracks[playQueueIndex] || null;
  /* Both storage shapes: DAM records carry url, local ones carry base64. */
  const currentQueueSrc = currentQueueTrack
    ? (currentQueueTrack.url || currentQueueTrack.data || '')
    : '';

  const queueHasPrev = playQueueIndex > 0;
  const queueHasNext = playQueueIndex < playQueueTracks.length - 1;

  const queuePlay = useCallback(() => { setPlayerError(''); setQueuePlaying(true); }, []);
  const queuePause = useCallback(() => setQueuePlaying(false), []);

  const queueStop = useCallback(() => {
    setQueuePlaying(false);
    setPlayQueue([]);
    setPlayQueueIndex(0);
    setCurrentPlayingAudioId(null);
    setPlayerError('');
  }, []);

  /* The next index is computed from the current one rather than inside a
     setPlayQueueIndex updater: an updater runs during the render phase,
     so calling setCurrentPlayingAudioId from inside it would be a state
     update during render, and React would run it twice under StrictMode. */
  const queueStep = useCallback((delta) => {
    const next = Math.max(0, Math.min(playQueueTracks.length - 1, playQueueIndex + delta));
    if (next === playQueueIndex) return;
    setPlayQueueIndex(next);
    setCurrentPlayingAudioId(playQueueTracks[next]?.id || null);
    setPlayerError('');
    setQueuePlaying(true);
  }, [playQueueIndex, playQueueTracks]);

  const queuePrev = useCallback(() => queueStep(-1), [queueStep]);
  const queueNext = useCallback(() => queueStep(1), [queueStep]);

  /* End of a track: advance, or close the player on the last one. */
  const queueEnded = useCallback(() => {
    if (playQueueIndex < playQueueTracks.length - 1) queueNext();
    else queueStop();
  }, [playQueueIndex, playQueueTracks.length, queueNext, queueStop]);

  /* A failed play() must not leave the transport claiming it is playing. */
  const queueError = useCallback((message) => {
    setPlayerError(message || 'This audio could not be played');
    setQueuePlaying(false);
  }, []);

  /* BUG-009: currentPlayingAudioId moved to L47 to fix temporal dead zone */

  /* ── Speaker change during recording ── */
  const handleSpeakerChange = (e) => {
    setCurrentSpeaker(e.target.value);
  };



  /* ── Copy ── */
  const copyText = (text) => { if (text) navigator.clipboard.writeText(text); };

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T116 — copy the tab you are looking at, with formatting.

     The footer's copy button always sent the transcript, whichever tab
     was open, and always as plain text.

     Both flavours are written to the clipboard: text/html so a paste
     into Word, Notion or an email keeps the headings and bullets, and
     text/plain so a paste into a code editor or terminal is still
     sensible. Falls back to plain text where ClipboardItem is
     unavailable, rather than failing.
     ══════════════════════════════════════════════════════════════════ */
  const copyRich = useCallback(async (plain, html) => {
    if (!plain && !html) return false;
    try {
      if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain || ''], { type: 'text/plain' }),
        })]);
        return true;
      }
      await navigator.clipboard.writeText(plain || '');
      return true;
    } catch (e) {
      console.warn('Copy failed:', e);
      try { await navigator.clipboard.writeText(plain || ''); return true; } catch (e2) { return false; }
    }
  }, []);

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
  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T133 — translation through the Ziva pipeline.

     Two defects were here, and the first meant this code never ran:

       1. It called getLanguageCode(), which is DEFINED NOWHERE in the
          codebase. That threw ReferenceError on the first line inside the
          try, the outer catch swallowed it, and the function returned
          having done nothing. Translation has never worked. A fabricated
          API is exactly what the architecture rules forbid.

       2. It fetched translate.googleapis.com straight from the browser —
          an unofficial endpoint with no CORS headers, and a third-party
          service outside the configured provider pipeline. Even with (1)
          fixed, every request would have failed.

     Now it resolves the top-1 pipe for the 'translation' scope — the
     "Translation Engine" keyword configured in Ziva API settings — and
     reuses callZivaChat, so there is one HTTP implementation and one
     error path for every AI call in this block.

     ONE batched request, not one per line. The old loop fired N requests;
     a 40-line transcript meant 40 calls and the same per-minute ceiling
     that T100 exists to avoid.
     ══════════════════════════════════════════════════════════════════ */

  /** Picker label -> ISO-639-1. Replaces the non-existent getLanguageCode. */
  const langCodeOf = useCallback((label) => {
    if (!label || label === 'auto' || label === 'Auto / Any' || label === LANGUAGE_AUTO) return '';
    const tag = LANGUAGE_CODE_MAP[label];
    return tag ? String(tag).split('-')[0] : '';
  }, []);

  const handleTranslateTranscript = useCallback(async (fromLangName, toLangName) => {
    const toCode = langCodeOf(toLangName);
    if (!toCode) {
      setAudioSttTeaserText('Choose a target language to translate into.');
      return;
    }

    const linesToTranslate = (displayTranscriptLines && displayTranscriptLines.length > 0)
      ? displayTranscriptLines
      : (transcription
          ? transcription.split('\n').filter(Boolean).map((l, i) => ({ id: 'tlx' + i, content: l }))
          : []);

    if (!linesToTranslate.length) {
      setDynamicConfirmModalConfig({
        title: 'No Transcript Content',
        message: 'No transcript content is available to translate.',
        icon: <Info size={20} />,
        confirmText: 'OK',
        variant: 'info',
        onConfirm: () => setDynamicConfirmModalConfig(null),
      });
      return;
    }

    const pipe = sttRefs.current.getZivaApiConfig('translation');
    if (!pipe.apiKey || !pipe.baseUrl) {
      setAudioSttTeaserText(
        'No Ziva AI provider is enabled for Translation. Open Ziva API settings, '
        + 'add a provider with an API key, and tick "Translation Engine".'
      );
      return;
    }

    setIsTranslating(true);
    setIsTranslationMinimized(false);
    setTranslationProgress(10);
    setAudioSttTeaserText('Translating ' + linesToTranslate.length + ' lines to ' + toLangName + ' via ' + pipe.providerName + '...');

    try {
      /* Numbered in, numbered out, mapped by index — the model is told not
         to merge or drop lines, and a count mismatch is detected below
         rather than silently mis-aligning the transcript. */
      const numbered = linesToTranslate
        .map((l, i) => (i + 1) + '. ' + String(l.content || l.text || '').replace(/\n/g, ' '))
        .join('\n');

      const fromCode = langCodeOf(fromLangName);
      const system = 'You are a professional translator. Translate each numbered line into '
        + toLangName + (fromCode ? '' : ', detecting the source language yourself') + '. '
        + 'Return EXACTLY the same number of lines, each prefixed with its original number '
        + 'and a period, in the same order. Translate only - do not summarise, merge, split, '
        + 'explain or add commentary. Preserve names, numbers and technical terms. '
        + 'Write the translation in the target language own native script.';

      setTranslationProgress(40);

      /* T133: via sttRefs — callZivaChat is declared below this function,
         so naming it in the deps array below would be a TDZ crash. */
      const raw = await sttRefs.current.callZivaChat(pipe, { system, user: numbered, maxTokens: 4096 });

      setTranslationProgress(80);

      /* Parse "N. text" back into an index-keyed map. */
      const byIndex = new Map();
      String(raw || '').split('\n').forEach((line) => {
        const m = line.match(/^\s*(\d+)\s*[.)]\s*(.*)$/);
        if (m) byIndex.set(Number(m[1]) - 1, m[2].trim());
      });

      if (!byIndex.size) throw new Error(pipe.providerName + ' returned no usable translation.');

      const translatedLines = linesToTranslate.map((item, i) => {
        const t = byIndex.get(i);
        const original = String(item.content || item.text || '');
        /* A line the model skipped keeps its original text but is NOT
           labelled as translated — silently passing an untranslated line
           off as a translation is what made the old version look like it
           had worked. */
        return t ? { ...item, content: t, originalContent: original }
                 : { ...item, content: original };
      });

      const missing = linesToTranslate.length - byIndex.size;

      setTranslatedTranscriptLines(translatedLines);
      saveProp('translatedTranscriptLines', translatedLines);
      const joined = translatedLines.map(l => l.content).join('\n');
      setTranslatedTranscription(joined);
      saveProp('translatedTranscription', joined);
      setTranslatedLanguage(toLangName);
      saveProp('translatedLanguage', toLangName);

      /* Show the result — the Original / "in <native>" switch only appears
         once a translation exists. */
      setTranscriptSubTab('translated');
      setViewMode('transcript');

      setTranslationProgress(100);
      setShowTranslatePopover(false);
      setAudioSttTeaserText(
        missing > 0
          ? 'Translated ' + byIndex.size + ' of ' + linesToTranslate.length + ' lines to ' + toLangName + ' - ' + missing + ' could not be translated.'
          : 'Translated ' + byIndex.size + ' lines to ' + toLangName + '.'
      );
    } catch (err) {
      console.error('Translation failed:', err);
      setAudioSttTeaserText(String(err?.message || err));
    } finally {
      setTimeout(() => {
        setIsTranslating(false);
        setIsTranslationMinimized(false);
        setTranslationProgress(0);
      }, 600);
    }
  }, [displayTranscriptLines, transcription, saveProp, langCodeOf]);

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
  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T83 — resolve the Ziva pipe for a module scope.

     This function used to call ZivaApiRouterService.getProviderForScope()
     and .getActiveProvider(). NEITHER METHOD EXISTS on that service. Both
     calls sat behind `typeof … === 'function'` guards, so both were
     silently skipped, and the code fell through to reading localStorage
     keys 'ziva_api_key_groq' / 'ziva_groq_api_key' / 'groq_api_key' —
     none of which the router writes either (it uses 'briselle_groq_key',
     and normally the provider registry itself).

     The API key was therefore ALWAYS empty, which is why every summary
     fell through to the local template.

     It now goes through the real routing contract: query providers,
     filter to those enabled for this module, take pipe #1 of the
     resulting sequence. No guessing at storage keys, and no hardcoded
     provider URL — the pipe carries its own baseUrl and model.
     ══════════════════════════════════════════════════════════════════ */
  const getZivaApiConfig = useCallback((scope = 'summarization') => {
    try {
      const pipes = ZivaApiRouterService.getPipesForScope(scope);
      if (pipes && pipes.length) {
        const pipe = pipes[0];
        return {
          apiKey: pipe.apiKey,
          provider: pipe.providerId,
          providerName: pipe.providerName,
          model: pipe.model,
          baseUrl: pipe.baseUrl,
          pipeCount: pipes.length,
          /* BRIS-AI-T159: dropping these here was the whole bug risk in
             this migration — callers pass this object straight to
             callZivaChat as a pipe, so a gateway pipe that lost its
             configurationId would fall through to the direct fetch and
             send an empty Authorization header. */
          viaGateway: pipe.viaGateway === true,
          configurationId: pipe.configurationId || '',
        };
      }
    } catch (e) {
      console.error('[Ziva] Provider routing failed for scope', scope, e);
    }
    /* No pipe. Reported to the user by the caller — never papered over. */
    return { apiKey: '', provider: '', providerName: '', model: '', baseUrl: '', pipeCount: 0, viaGateway: false, configurationId: '' };
  }, []);

  /* TASK-MN-BTN-009A / TASK-MN-PIPELINE-006: Non-blocking Generate Summary Workflow */
  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T100 — staying inside the provider's token budget.

     Groq counts `max_tokens` (the RESERVED completion) toward the
     per-minute limit, not just the prompt. A 12k TPM tier with
     max_tokens 4096 therefore leaves ~8k for input — and a one-hour
     meeting transcript is comfortably 16k tokens on its own. The
     instruction prompt is ~155 tokens, under 1% of the request; the
     transcript is effectively all of it.

     So: try the whole thing in one call, and only if the provider
     refuses it on size do we split. Normal meetings keep costing one
     request; long ones are summarised in parts and then synthesised,
     which loses far less than truncating would.
     ══════════════════════════════════════════════════════════════════ */

  /** Rough token estimate. ~4 chars/token is the usual English ratio. */
  const estimateTokens = useCallback((text) => Math.ceil((text || '').length / 4), []);

  /** Does this failure mean "too big / too fast" rather than "broken"? */
  const isCapacityError = useCallback((message, status) => {
    const m = String(message || '').toLowerCase();
    return status === 413 || status === 429
      || m.includes('too large') || m.includes('tokens per minute')
      || m.includes('rate limit') || m.includes('context length')
      || m.includes('reduce your message');
  }, []);

  /** The provider often states its own ceiling — use it rather than guess. */
  const parseTokenLimit = useCallback((message) => {
    const m = String(message || '').match(/limit\s+(\d[\d,]*)/i);
    if (!m) return null;
    const n = Number(m[1].replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  /**
   * One chat request against a resolved pipe.
   * Streams when onDelta is supplied; returns the full text either way.
   * Throws Error with `.status` set so callers can classify the failure.
   */
  const callZivaChat = useCallback(async (pipe, { system, user, maxTokens = 2048, onDelta }) => {
    /* ══════════════════════════════════════════════════════════════
       BRIS-AI-T159 — gateway path.

       Taken whenever the pipe came from platform_config. The provider,
       model, base URL and credential are all resolved server-side, so
       nothing here needs (or has) them.

       The gateway does not stream. onDelta is still honoured, but it
       fires ONCE with the finished text instead of progressively — the
       summary appears in one step rather than typing itself out. That is
       a deliberate trade for keeping the key out of the browser, and
       calling onDelta once keeps every existing caller working rather
       than leaving the panel blank.
       ══════════════════════════════════════════════════════════════ */
    if (pipe?.viaGateway) {
      const configurationId = pipe.configurationId || 'summarization';
      const result = await executeAI({
        configurationId,
        input: { system, user: undefined, prompt: user, maxTokens, temperature: 0.3 },
      });

      if (!result.ok) {
        /* The gateway's messages are already written to be read by a
           person and are guaranteed free of credentials, so they are
           surfaced verbatim rather than replaced with a generic one. */
        const err = new Error(result.error?.message || 'The AI gateway returned no result.');
        err.code = result.error?.code;
        err.badModel = result.error?.code === 'model_not_found';
        throw err;
      }

      if (onDelta) onDelta(result.text || '');
      return result.text || '';
    }

    if (!pipe?.model) {
      throw new Error(
        (pipe?.providerName || 'The provider')
        + ' has no model configured. Set one in Ziva API settings.'
      );
    }
    const response = await fetch(`${pipe.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pipe.apiKey}` },
      body: JSON.stringify({
        /* BRIS-NN-T147: no hardcoded fallback. This used to substitute
           'llama-3.3-70b-versatile' whenever the pipe carried no model —
           and when that name is retired or not on the account, every call
           404s with "the model does not exist". Guessing a model name is
           how a configuration problem became a code problem. */
        model: pipe.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: !!onDelta,
      }),
    });

    if (!response.ok) {
      let reason = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        reason = body?.error?.message || reason;
      } catch (e) { /* non-JSON error body — the status is enough */ }
      /* BRIS-NN-T147: a 404 naming the model is a CONFIGURATION fault, not
         a transient one. Say which model, on which provider, and where to
         change it — the bare provider message left the user guessing. */
      const looksLikeBadModel = response.status === 404
        || /model .*(does not exist|not found)|decommissioned|deprecated/i.test(reason);
      const message = looksLikeBadModel
        ? `${pipe.providerName}: model "${pipe.model}" is not available on this account. `
          + 'Open Ziva API settings and choose a model this key can use.'
        : `${pipe.providerName}: ${reason}`;

      const err = new Error(message);
      err.status = response.status;
      err.providerMessage = reason;
      err.badModel = looksLikeBadModel;
      throw err;
    }

    if (!onDelta) {
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || '';
    }

    if (!response.body?.getReader) throw new Error('This browser cannot read a streamed response.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    /* eslint-disable no-constant-condition */
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content || '';
          if (delta) { full += delta; onDelta(full); }
        } catch (e) { /* a partial SSE frame — the next chunk completes it */ }
      }
    }
    /* eslint-enable no-constant-condition */

    return full;
  }, []);

  /** Split on line boundaries so a chunk never cuts mid-sentence. */
  const splitForBudget = useCallback((text, budgetChars) => {
    const lines = String(text).split('\n');
    const chunks = [];
    let current = '';
    lines.forEach((line) => {
      /* A single line longer than the budget is hard-split — rare, but it
         must not produce a chunk that can never be sent. */
      if (line.length > budgetChars) {
        if (current) { chunks.push(current); current = ''; }
        for (let i = 0; i < line.length; i += budgetChars) chunks.push(line.slice(i, i + budgetChars));
        return;
      }
      if ((current.length + line.length + 1) > budgetChars) { chunks.push(current); current = line; }
      else current = current ? `${current}\n${line}` : line;
    });
    if (current.trim()) chunks.push(current);
    return chunks.filter(c => c.trim());
  }, []);

  const handleGenerateSummary = useCallback(async (textToSummarize = null, options = {}) => {
    if (isGeneratingSummary || processing) return;

    /* BRIS-NN-MNB-T82: stopRecording has already recorded the capture and
       transcription steps, so a run started from there keeps them. */
    const { keepSteps = false } = options;
    if (!keepSteps) resetSummarySteps();

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

    /* Collating is already done by the time this renders, hence 'done'. */
    setSummaryStep('read', 'Reading transcript and notes', 'done');

    /* BRIS-NN-MNB-T93: resolved from the prompt document, which holds both
       presets and custom instructions. The old lookup searched
       customInstructions (permanently empty) and then a constants map whose
       keys did not match four of the six menu entries, so those four
       silently produced the Auto prompt. DEFAULT_INSTRUCTION_PROMPTS remains
       only as the last-resort fallback if the document failed to load. */
    const instructionKey = selectedInstruction || 'Auto';
    const instructionPrompt = instructionPrompts[instructionKey] || '';

    /* T102: no compiled-in fallback. Summarising with a silently substituted
       prompt would produce output the user never configured. */
    if (!instructionPrompt.trim()) {
      setSummaryStep('route', 'Loading instruction prompt', 'failed',
        activePromptDoc.missing
          ? 'The AI prompt library is not installed. Run database/019_add_ai_prompts_config_type.sql in Supabase.'
          : 'The "' + instructionKey + '" instruction has no prompt text. Edit it and add one.');
      settleSummarySteps();
      setIsGeneratingSummary(false);
      setProcessing(false);
      return;
    }

    /* T83: resolve the Ziva pipe BEFORE claiming any analysis is running,
       and name the provider that will actually serve the request. */
    const { apiKey, model, baseUrl, providerName, pipeCount } = getZivaApiConfig('summarization');

    if (!apiKey || !baseUrl) {
      /* T84: say which of the four possible causes it actually is. A
         single "unavailable" message is what made the previous routing
         bug take three rounds to find. */
      let reason = 'No Ziva AI provider is enabled for Meeting Notes Summarization. '
        + 'Open Ziva API settings, add a provider with an API key, and tick '
        + '"Meeting Notes Summarization".';
      try {
        const d = ZivaApiRouterService.getScopeDiagnostics('summarization');
        console.warn('[Ziva] summarization routing diagnostics', d);
        if (!d.totalProviders) {
          reason = 'No Ziva AI providers are configured. Add one in Ziva API settings.';
        } else if (!d.scopedProviders) {
          reason = `None of the ${d.totalProviders} configured providers has "Meeting Notes Summarization" enabled.`
            + (d.knownScopes.length ? ` Scopes found: ${d.knownScopes.join(', ')}.` : '');
        } else if (d.scopedMissingKey.length) {
          reason = `${d.scopedMissingKey.join(', ')} handles Meeting Notes Summarization but has no API key.`;
        } else if (d.scopedInactive.length) {
          reason = `${d.scopedInactive.join(', ')} handles Meeting Notes Summarization but is switched off.`;
        } else {
          reason = 'A provider is enabled for Meeting Notes Summarization but has no usable endpoint URL.';
        }
      } catch (e) { /* keep the generic message */ }

      setSummaryStep('route', 'Routing to Ziva AI', 'failed', reason);
      settleSummarySteps();
      setIsGeneratingSummary(false);
      setProcessing(false);
      return;
    }

    setSummaryStep('route', `Routing to ${providerName}`, 'done',
      pipeCount > 1 ? `${pipeCount} providers available — using the first in sequence.` : undefined);
    setSummaryStep('analyze', 'Analyzing transcript and notes', 'active');

    const pipe = { apiKey, baseUrl, model, providerName };
    /* BRIS-NN-MNB-T107: the title comes from the summary run itself.
       Requested in the SYSTEM message, which is composed here — the stored
       prompts stay exactly as configured. One extra output line costs no
       extra request, which matters on a per-minute token budget. */
    const systemMessage = `You are ZIVA AI Enterprise Meeting Assistant. ${instructionPrompt}

Begin your response with a single line containing a short, specific title in
the form "# Title" — eight words or fewer, naming what this recording was
actually about rather than restating the document type.

Then produce the FULL structured summary exactly as instructed above. The
title line is in addition to that summary, never a replacement for or an
abbreviation of it.`;
    let sectionCount = 0;

    /* Turn the markdown produced so far into progress rows: every
       completed heading is a finished section, the newest one is still
       being written. */
    const syncSections = (full) => {
      const matches = [...full.matchAll(/^#{1,6}[ \t]+(.+?)[ \t]*$/gm)];
      if (!matches.length) return;

      matches.forEach((m, i) => {
        const isLast = i === matches.length - 1;
        const label = m[1].replace(/[*_`]/g, '').trim();
        if (!label) return;

        /* Only the section being written shows a preview. T85: the detail
           was previously left in place when a section completed —
           setSummaryStep merges, and a `detail` of undefined is skipped —
           so every finished row kept a stale half-sentence. */
        let detail = '';
        if (isLast) {
          const body = full.slice(m.index + m[0].length).replace(/\s+/g, ' ').trim();
          if (body) detail = body.length > 90 ? `${body.slice(0, 90)}…` : body;
        }
        setSummaryStep(`sec-${i}`, label, isLast ? 'active' : 'done', detail);
      });
      sectionCount = matches.length;
    };

    const onDelta = (full) => {
      if (!full) return;
      setSummaryStep('analyze', 'Analyzing transcript and notes', 'done');
      syncSections(full);
    };

    /* ══════════════════════════════════════════════════════════════════
       BRIS-NN-MNB-T100 — oversized transcripts.

       Attempt the whole thing first: most meetings fit, and one request
       is both faster and cheaper than three. Only when the provider
       itself refuses on size do we split, so we never pay the chunking
       cost speculatively and never guess a limit the provider hasn't
       stated.
       ══════════════════════════════════════════════════════════════════ */
    const summariseInParts = async (limitTokens) => {
      /* Reserve room for the completion and the instruction. The provider
         counts max_tokens toward the same budget as the prompt, which is
         why a 12k limit rejected a 16k transcript with 4096 reserved. */
      const partMaxTokens = 1024;
      const overheadTokens = estimateTokens(systemMessage) + partMaxTokens + 512;
      const budgetTokens = Math.max(1000, (limitTokens || 12000) - overheadTokens);
      const budgetChars = budgetTokens * 4;

      const parts = splitForBudget(combinedInput, budgetChars);
      if (parts.length <= 1) {
        /* Splitting cannot help — one part is already over budget. */
        throw new Error(
          `${providerName} rejected this transcript as too large, and it cannot be split further.`
        );
      }

      setSummaryStep('analyze', 'Analyzing transcript and notes', 'done');
      setSummaryStep('split', `Transcript too large — summarising in ${parts.length} parts`, 'done',
        `${providerName} allows about ${limitTokens || 12000} tokens per request.`);

      const partSummaries = [];
      for (let i = 0; i < parts.length; i += 1) {
        const stepId = `part-${i}`;
        setSummaryStep(stepId, `Summarising part ${i + 1} of ${parts.length}`, 'active');
        try {
          const text = await callZivaChat(pipe, {
            system: 'You are ZIVA AI Enterprise Meeting Assistant. Summarise this PART of a '
              + 'longer transcript. Keep every decision, action item, name, number and date. '
              + 'Do not add headings or a conclusion — this is an intermediate note that will '
              + 'be combined with the other parts.',
            user: parts[i],
            maxTokens: partMaxTokens,
          });
          partSummaries.push(text);
          setSummaryStep(stepId, `Summarising part ${i + 1} of ${parts.length}`, 'done');
        } catch (partErr) {
          /* A per-minute limit is a wait, not a failure. One retry, paced
             past the window, then report honestly rather than losing the
             parts already summarised. */
          if (isCapacityError(partErr?.providerMessage || partErr?.message, partErr?.status)) {
            setSummaryStep(stepId, `Summarising part ${i + 1} of ${parts.length}`, 'active',
              'Provider rate limit reached — waiting before retrying this part.');
            await new Promise(r => setTimeout(r, 62000));
            const text = await callZivaChat(pipe, {
              system: 'You are ZIVA AI Enterprise Meeting Assistant. Summarise this PART of a '
                + 'longer transcript. Keep every decision, action item, name, number and date.',
              user: parts[i],
              maxTokens: partMaxTokens,
            });
            partSummaries.push(text);
            setSummaryStep(stepId, `Summarising part ${i + 1} of ${parts.length}`, 'done');
          } else {
            throw partErr;
          }
        }
      }

      /* Synthesis runs against the part summaries, which are far smaller
         than the transcript, and streams so the section rows still come
         from real headings. */
      setSummaryStep('synth', 'Combining parts into the final summary', 'active');
      const combined = partSummaries
        .map((s, i) => `=== PART ${i + 1} OF ${parts.length} ===\n${s}`)
        .join('\n\n');

      const finalText = await callZivaChat(pipe, {
        system: systemMessage,
        user: combined,
        maxTokens: 2048,
        onDelta,
      });
      setSummaryStep('synth', 'Combining parts into the final summary', 'done');
      return finalText;
    };

    try {
      /* BRIS-NN-MNB-T82: streamed, so the section rows in the progress
         list are the model's ACTUAL headings arriving in real time.
         T83: the pipe carries its own endpoint — the Groq URL used to be
         hardcoded here, so any other Ziva provider was sent to Groq.
         T100: max_tokens 2048, not 4096. The reserved completion counts
         toward the provider's per-minute budget, so an oversized reserve
         costs input headroom for no benefit — these summaries run well
         under 2048. */
      let full = '';
      try {
        full = await callZivaChat(pipe, {
          system: systemMessage,
          user: combinedInput,
          maxTokens: 2048,
          onDelta,
        });
      } catch (firstErr) {
        const msg = firstErr?.providerMessage || firstErr?.message;
        if (!isCapacityError(msg, firstErr?.status)) throw firstErr;
        full = await summariseInParts(parseTokenLimit(msg));
      }

      syncSections(full);

      if (!full.trim()) {
        throw new Error(`${providerName} returned an empty response.`);
      }

      /* ══════════════════════════════════════════════════════════════
         BRIS-NN-MNB-T108 — promote the leading H1 to the block title.

         Only a LEADING H1 counts: a heading further down is a section
         name ("Key Discussion Points"), not a title for the meeting.

         The H1 is then REMOVED from the stored summary. It has become the
         block title, and leaving it in rendered the same text twice — a
         large rule-underlined heading at the top of the summary saying
         what the header already says.

         (The previous attempt never fired: its regex reached the file as
         /^s*#s+(.+?)s*$/ — the backslashes were lost writing it through a
         shell-to-node string, so it looked for the literal text "s*#s+".) */
      const titleMatch = full.match(/^[ \t]*#[ \t]+(.+?)[ \t]*$/m);
      const derivedTitle = titleMatch
        ? titleMatch[1].replace(/[*_`"]/g, '').trim()
        : '';

      let summaryBody = full;
      if (derivedTitle && derivedTitle.length <= 120) {
        summaryBody = full.replace(titleMatch[0], '').replace(/^\s+/, '');
        setTitle(derivedTitle);
        saveProp('title', derivedTitle);
        setSummaryStep('title', 'Naming the meeting', 'done', derivedTitle);
      }

      saveProp('summary', summaryBody);
      saveProp('includeSummary', true);

      if (!sectionCount) {
        setSummaryStep('compose', 'Composing summary', 'done');
      }
      settleSummarySteps();
      setIsGeneratingSummary(false);
      setProcessing(false);
      return;
    } catch (err) {
      /* T83: NO local template fallback. A fabricated summary that looks
         like AI output is worse than none — it is indistinguishable from
         a real one once saved, and it masked the fact that the provider
         was never reachable. The failure is reported and nothing is
         written to the block. */
      console.error('Summary generation failed:', err);
      /* T100: reported on its own row. Marking 'analyze' failed would flip
         a step that genuinely completed — the split path fails later, at a
         part or at the synthesis. */
      setSummaryStep('error', 'Summary could not be generated', 'failed',
        String(err?.message || err));
    } finally {
      settleSummarySteps();
      setIsGeneratingSummary(false);
      setProcessing(false);
    }
  }, [isGeneratingSummary, processing, displayTranscriptLines, transcriptLines, transcription, extractTextFromBlocks, block.notesBlocks, notesContent, selectedInstruction, instructionPrompts, activePromptDoc, getZivaApiConfig, title, date, saveProp, setSummaryStep, settleSummarySteps, resetSummarySteps, setTitle, callZivaChat, estimateTokens, isCapacityError, parseTokenLimit, splitForBudget]);

  /* stopRecording is declared far above this function, so it cannot call
     it directly without hitting the temporal dead zone. The module
     already uses this ref pattern for startRecording/stopRecording. */
  const generateSummaryRef = useRef(null);
  generateSummaryRef.current = handleGenerateSummary;


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

  /* BRIS-NN-MNB-T98/T99: opens the instruction in the real NotionNest
     editor. Auto is included — it is an ordinary document row like any
     other now, and a built-in can be reset rather than only overwritten. */
  const openEditPromptModal = useCallback((instructionName) => {
    setUnifiedModalInstruction(instructionName);
    setUnifiedModalMode('edit');
    setUnifiedModalOpen(true);
    setShowSettingsPopover(false);
    setShowInstructionsSubmenu(false);
  }, []);

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
    setUnifiedModalInstruction('');
    setUnifiedModalMode('add');
    setUnifiedModalOpen(true);
  }, []);

  /* ── Prompt library mutations (BRIS-NN-MNB-T98) ──────────────────
     Every write goes through aiPromptConfigService so platform_config
     stays the source of truth; the local document is replaced with the
     service's result rather than patched optimistically, so the UI can
     never show a prompt the database rejected. */
  const [promptSaving, setPromptSaving] = useState(false);

  const saveInstructionPrompt = useCallback(async (key, payload) => {
    setPromptSaving(true);
    try {
      const targetKey = (payload.name || key || '').trim();
      if (!targetKey) return;
      const doc = await upsertInstruction(targetKey, payload);
      if (doc) {
        setPromptDoc(doc);
        saveProp('selectedInstruction', targetKey);
        setUnifiedModalOpen(false);
      }
    } finally {
      setPromptSaving(false);
    }
  }, [saveProp]);

  const resetInstructionPrompt = useCallback(async (key) => {
    setPromptSaving(true);
    try {
      const doc = await resetInstructionToDefault(key);
      if (doc) { setPromptDoc(doc); setUnifiedModalOpen(false); }
    } finally {
      setPromptSaving(false);
    }
  }, []);

  const removeInstructionPrompt = useCallback(async (key) => {
    const doc = await deleteInstruction(key);
    if (!doc) return;
    setPromptDoc(doc);
    if (selectedInstruction === key) saveProp('selectedInstruction', 'Auto');
  }, [selectedInstruction, saveProp]);

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
    /* T109: matched on &gt; — es() has already escaped the source, so the
       literal "> " this used to look for no longer exists by this point and
       blockquotes rendered as "&gt; text". */
    html = html.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');
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

    /* Lists. BRIS-NN-MNB-T109: items are joined before wrapping so a blank
       line between them (a "loose" list in markdown) still renders tight,
       the way Notion does. */
    html = html.replace(/^[-*•] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<\/li>)\s*\n\s*(?=<li>)/g, '$1');
    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    /* ══════════════════════════════════════════════════════════════════
       BRIS-NN-MNB-T109 — this is the "too many line spaces".

       Every remaining newline became a <br>, INCLUDING the ones between
       block elements. A list therefore rendered as

           <li>…</li><br><li>…</li><br></ul><br><h2>…

       so each bullet carried a blank line after it and every heading sat
       on top of another. Block tags bring their own margins; a <br> next
       to one is always double spacing.

       The old code also wrapped EVERYTHING in <p> and then tried to unwrap
       around block tags with two further regexes. Those unwrap passes
       listed only h1/h2, so h3–h6 kept their paragraph margins on top of
       their own, and what they left behind was unbalanced HTML.

       Prose BETWEEN blocks is wrapped instead. Block elements pass through
       untouched, and <br> is left to do the one job it should — a soft
       line break inside a paragraph.
       ══════════════════════════════════════════════════════════════════ */
    const BLOCK_SPLIT = /(<(?:h[1-6]|ul|ol|table|blockquote)\b[\s\S]*?<\/(?:h[1-6]|ul|ol|table|blockquote)>|<hr>)/g;
    const isBlock = /^(?:<(?:h[1-6]|ul|ol|table|blockquote)\b|<hr>)/;

    html = html
      .split(BLOCK_SPLIT)
      .map((part) => {
        if (!part) return '';
        if (isBlock.test(part)) return part;
        return part
          .split(/\n{2,}/)
          .map(p => p.trim())
          .filter(Boolean)
          .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('');
      })
      .join('');

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

  /* BRIS-NN-MNB-T93: the menu list now comes from the prompt document,
     so a preset can never be offered without a prompt behind it. The
     hardcoded array that used to be here listed Interview / Call /
     Stand-up / Workshop, none of which had prompts. */
  const INSTRUCTION_PRESETS = activePromptDoc.order.filter(
    k => activePromptDoc.instructions[k]?.isSystem
  );


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

  /* BRIS-NN-MNB-T93: renderCustomInstructions / renderCustomInstructionItem
     removed. Both were defined but renderCustomInstructions was never
     called anywhere, and they duplicated config/InstructionsMenu.jsx which
     the settings flyout actually renders. */

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
                {/* BRIS-NN-MNB-T131: restored. T127 removed the wrong one —
                    this is the entry that was asked to be kept, and the
                    parent split-button dropdown is the one that lost it. */}
                <div className="nnr-settings-flyout-item" onClick={(e) => { e.stopPropagation(); setShowSettingsPopover(false); setShowInstructionsSubmenu(false); startTranscribe(TRANSCRIBE_MODES.UPLOAD); }}>
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
          /* T104: nnr-instr-flyout releases the host popover's 360px clamp so
             the menu can size and scroll itself. Without it the flyout capped
             the height while `overflow: visible !important` let the surplus
             paint OUTSIDE the box — rows past the fold were both invisible
             and unclickable. */
          <div className="nnr-settings-flyout nnr-instr-flyout">
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

  /* T127: assigned HERE, below both values. Placing it earlier was itself
     a temporal-dead-zone bug — a plain statement in the render body is
     executed in source order, so it must sit after every name it reads,
     not merely after the ones a linter checks. */
  sttRefs.current = { getZivaApiConfig, transcriptUserName, callZivaChat };
  /* T132: assigned here, below selectedLanguage. A plain render statement
     runs in source order, so it must sit after every name it reads. */
  selectedLanguageRef.current = selectedLanguage;

  /* BRIS-NN-MNB-T111: honour the Original / Translated switch.
     This always normalised displayTranscriptLines, so selecting the
     translated tab changed the highlighted pill and nothing else — the
     translation was produced, saved and then never rendered. */
  const normalizedTranscriptLines = useMemo(() => {
    const useTranslated = transcriptSubTab === 'translated'
      && Array.isArray(translatedTranscriptLines)
      && translatedTranscriptLines.length > 0;
    return normalizeLines(useTranslated ? translatedTranscriptLines : displayTranscriptLines, {
      userName: transcriptUserName,
      source: TRANSCRIPT_SOURCE.LIVE,
      date,
    });
  }, [transcriptSubTab, translatedTranscriptLines, displayTranscriptLines, transcriptUserName, date]);

  /* The hidden prefix builder, handed to the view so it stays presentation-free. */
  const transcriptPrefixOf = useCallback(line => formatPrefix(line), []);

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T116 — copy whichever tab is showing, as-is.

     Position matters. This must sit below EVERY value in its dependency
     array, not merely below renderMd. It was first placed just after
     renderMd, which reads fine — but the deps array also names
     normalizedTranscriptLines, declared ~500 lines further down, and a
     dependency array is evaluated during render. That threw
     "Cannot access 'normalizedTranscriptLines' before initialization"
     and took the whole block down on mount.

     The trap is that the FUNCTION BODY may safely reference anything in
     the component — it only runs on click. The deps array may not.
     ══════════════════════════════════════════════════════════════════ */
  const copyActiveTab = useCallback(async () => {
    let plain = '';
    let html = '';

    if (viewMode === 'summary') {
      plain = summary || block.summary || '';
      html = plain ? renderMd(plain) : '';
    } else if (viewMode === 'notes') {
      plain = blocksToMarkdown(block.notesBlocks || []);
      html = plain ? renderMd(plain) : '';
    } else {
      /* Transcript: the visible lines, prefixes included when timestamps
         are on, so what lands on the clipboard is what is on screen. */
      const lines = normalizedTranscriptLines || [];
      plain = lines.length
        ? lines.map(l => (showTimeline ? `${formatPrefix(l)} ` : '') + (l.content || '')).join('\n')
        : (activeTranscriptText || '');
      html = plain
        ? `<div>${plain.split('\n').map(l =>
            `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('')}</div>`
        : '';
    }

    return copyRich(plain, html);
  }, [viewMode, summary, block.summary, block.notesBlocks, normalizedTranscriptLines,
      showTimeline, activeTranscriptText, renderMd, copyRich]);

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
    /* BRIS-NN-MNB-T70/T75/T76: Briselle Audio Controller contract.
       Every one of these is declared above AND destructured by the
       consumer — missing any of the three is the failure mode this
       module keeps hitting. Verified by verify-meeting-context.js. */
    playQueueIndex,
    playQueueTracks,
    currentQueueTrack,
    currentQueueSrc,
    queuePlaying,
    queueHasPrev,
    queueHasNext,
    queuePlay,
    queuePause,
    queueStop,
    queuePrev,
    queueNext,
    queueEnded,
    queueError,
    startPlayQueue,
    playerError,
    playerVariant,
    setPlayerVariant,
    /* BRIS-NN-MNB-T73 */
    recControlsRef,
    /* BRIS-NN-MNB-T90 */
    showSilenceNotice,
    dismissSilenceNotice,
    goToMeetingNote,
    /* BRIS-NN-MNB-T77 */
    audioFilesError,
    /* BRIS-NN-MNB-T116 */
    copyActiveTab,
    /* BRIS-NN-MNB-T102 */
    promptLibraryMissing,
    promptDocLoading,
    /* BRIS-NN-T144 */
    promptLoadError,
    retryPromptLoad,
    /* BRIS-NN-MNB-T82 */
    summarySteps,
    setSummaryStep,
    resetSummarySteps,
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
    setDate,
    setDateFormat,
    setDisplayTranscriptLines,
    setDynamicConfirmModalConfig,
    setEditingAiNotes,
    setEditingLineId,
    setInsightsCollapsed,
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
    promptSaving,
    saveInstructionPrompt,
    resetInstructionPrompt,
    removeInstructionPrompt,
    activePromptDoc,
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
      <div ref={meetingRootRef} className={`mt-container${recording ? ' is-recording' : ''}`} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

        {/* BRIS-NN-MNB-T89: the floating recording surfaces are mounted
            here, not inside TranscriptPanel. A recording is block state,
            not tab state — switching to Summary or Notes must not remove
            the only visible Stop control. */}
        <RecordingOverlays />

        {/* BRIS-NN-MNB-T130: the audio-file picker. Mounted HERE, not in
            TranscribeControl, because every menu that opens it is available
            when that component is unmounted. Hidden input, no layout cost. */}
        <input
          type="file"
          ref={audioUploadRef}
          accept="audio/*,video/*"
          className="nnr-hidden-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            /* Reset first: picking the SAME file twice must still fire
               onChange, and it will not if value still holds that path. */
            e.target.value = '';
            if (f) handleAudioUpload(f);
          }}
        />

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
