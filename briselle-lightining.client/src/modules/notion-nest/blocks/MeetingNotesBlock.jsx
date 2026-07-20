/* ============================================================
   NotionNest — blocks/MeetingNotesBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L2489
   ============================================================ */
import { useRef, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { Plus, ExternalLink, AlertTriangle, FileText, Bell, Database, Edit3, Variable, Settings, Trash2, GripVertical, ChevronDown, X, Check, Mic, Calendar, Users, Lightbulb, Copy, Volume2, MoreHorizontal, List, Clock, UserPlus, MessageSquare, Download, Share2, Play, Pause, Sliders, Upload, Globe, BookOpen, Link, ArrowRight, Video, MessageCircle, HelpCircle, Info, Speaker, Megaphone, MegaphoneOff, AudioLines } from 'lucide-react';

export const MeetingNotesBlock = memo(function MeetingNotesBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [timer, setTimer] = useState(0);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [viewMode, setViewMode] = useState('transcript');
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
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [showInstructionsSubmenu, setShowInstructionsSubmenu] = useState(false);
  const [customInstructions, setCustomInstructions] = useState([]);
  const [showBulbInfo, setShowBulbInfo] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [editingLineId, setEditingLineId] = useState(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [showAudioSourceMenu, setShowAudioSourceMenu] = useState(false);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [showOutputDeviceMenu, setShowOutputDeviceMenu] = useState(false);
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

  const title = block.title || 'Meeting';
  const date = block.date || new Date().toISOString().split('T')[0];
  const participants = block.participants || [];
  const mode = block.mode || 'auto';
  const includeSummary = block.includeSummary !== false;
  const includeBullets = block.includeBullets !== false;
  const includeActionItems = block.includeActionItems !== false;
  const includeFollowUp = block.includeFollowUp !== false;
  const summary = block.summary || '';
  const bulletPoints = block.bulletPoints || [];
  const transcription = block.transcription || '';

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

  useEffect(() => {
    setDisplayTranscriptLines(block.transcriptLines || []);
    transcriptLinesRef.current = block.transcriptLines || [];
  }, [block.transcriptLines]);

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
  const selectedInstruction = block.selectedInstruction || 'Auto';

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
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser. Use Chrome or Edge.'); return; }

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
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
        saveProp('transcriptLines', newLines);

        if (modeRef.current === 'auto') {
          const newContent = (contentRef.current || '') + line;
          contentRef.current = newContent.trim();
          saveProp('content', newContent.trim());
        }
      }
      setInterimText(interim);
    };
    recog.onerror = function () { stopRecording(); };
    recog.onend = function () { if (recordingRef.current) recog.start(); };
    recog.start();
    setRecognition(recog);
    setRecording(true);
    recordingRef.current = true;
    recStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - recStartTimeRef.current) / 1000)), 1000);
  }, [saveProp]);

  const stopRecording = useCallback(() => {
    if (recognition) { recognition.stop(); setRecognition(null); }
    if (wakeWordRef.current) { try { wakeWordRef.current.stop(); } catch (e) { } wakeWordRef.current = null; }
    clearInterval(timerRef.current);
    setRecording(false);
    recordingRef.current = false;
    setInterimText('');
    setIsPaused(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      // Save audio data to block properties
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        saveProp('audioData', base64Data);
        saveProp('audioDuration', timer);
        setAudioUrl(URL.createObjectURL(audioBlob));
        setAudioDuration(timer);
      };
      reader.readAsDataURL(audioBlob);
    }

    // Final save of transcript data
    saveProp('transcription', transcriptionRef.current);
    saveProp('transcriptLines', transcriptLinesRef.current);

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
  }, [recognition, timer, saveProp]);

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
      recog.lang = 'en-US';
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

            // Created At: 2026-07-20 | Last Modified: 2026-07-20 | Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L2774
            var newTimestamp = formatFullTimestamp();
            const newLineObj = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
              timestamp: newTimestamp,
              source: 'Auto Transcribing',
              content: `${speaker}: ${lineContent}`
            };
            const newLines = [...transcriptLinesRef.current, newLineObj];
            transcriptLinesRef.current = newLines;
            saveProp('transcriptLines', newLines);

            if (modeRef.current === 'auto') {
              const newContent = (contentRef.current || '') + line;
              contentRef.current = newContent.trim();
              saveProp('content', newContent.trim());
            }
          }
          setInterimText(interim);
        };
        recog.onerror = () => { };
        recog.onend = () => { if (recordingRef.current) recog.start(); };
        recog.start();
        setRecognition(recog);
      }
      recordingRef.current = true;
      setRecording(true);
      timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - recStartTimeRef.current) / 1000)), 1000);
      setIsPaused(false);
  }, [saveProp]);

  const addManualLine = useCallback(() => {
    var newTimestamp = formatFullTimestamp();
    var newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newLineObj = {
      id: newId,
      timestamp: newTimestamp,
      source: 'Manual Transcribing',
      content: ''
    };
    const newLines = [...(transcriptLinesRef.current || []), newLineObj];
    saveProp('transcriptLines', newLines);
    setEditingLineId(newId);
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
      saveProp('audioData', ev.target.result);
      saveProp('audioDuration', 0);
      setAudioUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  }, [saveProp]);

  const clearAllLines = useCallback(() => {
    saveProp('transcriptLines', []);
    saveProp('transcription', '');
    saveProp('content', '');
    setShowConfirmClear(false);
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

  /* ── Speaker change during recording ── */
  const handleSpeakerChange = (e) => {
    setCurrentSpeaker(e.target.value);
  };

  /* ── Text-to-Speech ── */
  const readAloud = (text) => {
    if (!window.speechSynthesis) return;
    if (isReadingAloud) { window.speechSynthesis.cancel(); setIsReadingAloud(false); return; }
    const content = text || notesContent || finalNotes;
    if (!content || !content.trim()) return;
    const u = new SpeechSynthesisUtterance(content);
    u.lang = 'en-US'; u.rate = 1;
    u.onend = () => setIsReadingAloud(false);
    u.onerror = () => setIsReadingAloud(false);
    setIsReadingAloud(true);
    window.speechSynthesis.speak(u);
  };

  /* ── Copy ── */
  const copyText = (text) => { if (text) navigator.clipboard.writeText(text); };

  /* ── Generate AI summary (local fallback) ── */
  const generateSummary = useCallback(() => {
    const text = notesContent || transcription;
    if (!text.trim()) return;
    const words = text.split(/\s+/);
    saveProp('summary', words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : ''));
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    saveProp('bulletPoints', sentences.slice(0, 5).map(s => s.trim()));
    saveProp('aiInsights', [
      { icon: 'Lightbulb', text: `${words.length} words transcribed` },
      { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
    ]);
  }, [notesContent, transcription, timer, saveProp]);

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

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(playbackTimerRef.current);
    if (recognition) recognition.stop();
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
  }, [recognition]);

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
    'English (US)', 'English (India)', 'English (UK)', 'Indian Languages',
    'Tamil', 'Hindi', 'Kannada', 'Telugu', 'Malayalam', 'Urdu',
    'Traditional Chinese', 'Simplified Chinese', 'German', 'Russian',
    'Dutch', 'Japanese', 'Spanish', 'French', 'Hebrew', 'Portuguese',
    'Indonesian', 'Vietnamese', 'Thai'
  ];

  const INSTRUCTION_PRESETS = ['Auto', 'Meeting', 'Candidate Interview', 'Customer Call', 'Stand-Up'];

  function renderCustomInstructions() {
    var items = [];
    for (var idx = 0; idx < customInstructions.length; idx++) {
      var ci = customInstructions[idx];
      items.push(renderCustomInstructionItem(ci, idx));
    }
    return items;
  }

  function handleAddCustomInstruction() {
    var name = prompt('Custom instruction name:');
    if (name) {
      setCustomInstructions(customInstructions.concat([name]));
      saveProp('selectedInstruction', name);
      setShowInstructionsSubmenu(false);
    }
  }

  function handleAudioFileChange(e) {
    var f = e.target.files && e.target.files[0];
    if (f) { handleAudioUpload(f); }
    e.target.value = '';
  }

  function renderCustomInstructionItem(ci, i) {
    var handleSelect = function () { saveProp('selectedInstruction', ci); setShowInstructionsSubmenu(false); };
    var handleEdit = function (e) { e.stopPropagation(); var name = prompt('Edit name:', ci); if (name) { var upd = customInstructions.slice(); upd[i] = name; setCustomInstructions(upd); if (selectedInstruction === ci) saveProp('selectedInstruction', name); } };
    var handleDelete = function (e) { e.stopPropagation(); var upd = customInstructions.filter(function (_, idx) { return idx !== i; }); setCustomInstructions(upd); if (selectedInstruction === ci) saveProp('selectedInstruction', 'Auto'); };
    return (
      <div key={i} className={'nnr-settings-subitem' + (selectedInstruction === ci ? ' active' : '')} onClick={handleSelect}>
        {ci}
        {selectedInstruction === ci && <Check size={12} />}
        <span className="nnr-settings-subitem-actions">
          <span className="nnr-icon-btn-sm" onClick={handleEdit}><Edit3 size={12} /></span>
          <span className="nnr-icon-btn-sm" onClick={handleDelete}><Trash2 size={12} /></span>
        </span>
      </div>
    );
  }

  const renderSettingsPopover = () => (
    <div className="nnr-settings-popover">
      {/* Upload Audio */}
      <div className="nnr-settings-item" onClick={() => { audioUploadRef.current?.click(); setShowSettingsPopover(false); }}>
        <Upload size={14} />
        <span>Upload Audio</span>
      </div>

      {/* Language submenu */}
      <div className="nnr-settings-item" onClick={() => setShowLanguageSubmenu(!showLanguageSubmenu)}>
        <Globe size={14} />
        <span>Language</span>
        <span className="nnr-settings-item-right">
          <span className="nnr-settings-selected">{selectedLanguage}</span>
          <ChevronDown size={12} />
        </span>
      </div>
      {showLanguageSubmenu && (
        <div className="nnr-settings-submenu">
          {LANGUAGES.map(lang => (
            <div key={lang} className={`nnr-settings-subitem${selectedLanguage === lang ? ' active' : ''}`} onClick={() => { saveProp('selectedLanguage', lang); setShowLanguageSubmenu(false); }}>
              {lang}
              {selectedLanguage === lang && <Check size={12} />}
            </div>
          ))}
        </div>
      )}

      {/* Instructions submenu */}
      <div className="nnr-settings-item" onClick={() => setShowInstructionsSubmenu(!showInstructionsSubmenu)}>
        <BookOpen size={14} />
        <span>Instructions</span>
        <span className="nnr-settings-item-right">
          <span className="nnr-settings-selected">{selectedInstruction}</span>
          <ChevronDown size={12} />
        </span>
      </div>
      {showInstructionsSubmenu && (
        <div className="nnr-settings-submenu">
          {INSTRUCTION_PRESETS.map(inst => (
            <div key={inst} className={`nnr-settings-subitem${selectedInstruction === inst ? ' active' : ''}`} onClick={() => { saveProp('selectedInstruction', inst); setShowInstructionsSubmenu(false); }}>
              {inst}
              {selectedInstruction === inst && <Check size={12} />}
              <span className="nnr-settings-subitem-actions">
                <Edit3 size={12} />
                <MoreHorizontal size={12} />
              </span>
            </div>
          ))}
          <div className="nnr-settings-subitem nnr-settings-subitem-add" onClick={handleAddCustomInstruction}>
            <Plus size={14} /> Add custom instruction
          </div>
          {renderCustomInstructions()}
        </div>
      )}

      {/* Consent section */}
      <div className="nnr-settings-item">
        <Volume2 size={14} />
        <span>Auto Play Consent</span>
        <span className="nnr-settings-item-right">
          <label className="nnr-toggle-switch">
            <input type="checkbox" checked={consentEnabled} onChange={e => saveProp('consentEnabled', e.target.checked)} />
            <span className="nnr-toggle-slider"></span>
          </label>
        </span>
      </div>
      <div className="nnr-settings-item nnr-settings-item-sub">
        <span>Play consent message</span>
      </div>
      <div className="nnr-settings-item nnr-settings-item-sub">
        <Info size={14} />
        <span>Learn more</span>
      </div>

      <div className="nnr-settings-divider" />

      {/* Copy link to block */}
      <div className="nnr-settings-item" onClick={() => { navigator.clipboard.writeText(window.location.href); setShowSettingsPopover(false); }}>
        <Link size={14} />
        <span>Copy link to block</span>
      </div>

      {/* Move to */}
      <div className="nnr-settings-item">
        <ArrowRight size={14} />
        <span>Move to</span>
      </div>

      {/* Delete */}
      <div className="nnr-settings-item">
        <Trash2 size={14} />
        <span>Delete</span>
      </div>

      <div className="nnr-settings-divider" />

      {/* Connect Calendar */}
      <div className="nnr-settings-item">
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

      {/* Learn more */}
      <div className="nnr-settings-item">
        <HelpCircle size={14} />
        <span>Learn more</span>
      </div>
    </div>
  );

  return (
    <div className="block-content">
      <div className="mt-container">
        {/* ═══ Header ═══ */}
        <div className="mt-header">
          <div className="mt-header-left">
            <div className="mt-date-wrap" onClick={() => dateInputRef.current?.showPicker?.() || setShowDatePicker(true)} title="Change date">
              <Calendar size={14} />
              <span className="mt-date-text">{date}</span>
              <input ref={dateInputRef} type="date" value={date} onChange={e => saveProp('date', e.target.value)} className="mt-date-input" />
            </div>
            <input className="mt-title-input" type="text" value={title} onChange={e => saveProp('title', e.target.value)} placeholder="Meeting title" />
          </div>
          <div className="mt-header-right">
            <div className="mt-icon-btn mt-people-btn" onClick={() => setShowParticipantsPanel(!showParticipantsPanel)} title={`${participants.length} participant${participants.length !== 1 ? 's' : ''}`}>
              <Users size={14} />
              {participants.length > 0 && <span className="mt-badge">{participants.length}</span>}
              <span className="mt-add-people"><UserPlus size={10} /></span>
            </div>
            <div className="nnr-bulb-wrap" ref={bulbWrapRef}>
              <div className="mt-icon-btn" onClick={() => setShowBulbInfo(!showBulbInfo)} title="Info">
                <Lightbulb size={14} />
              </div>
              {showBulbInfo && (
                <div className="nnr-bulb-popover">
                  <div className="nnr-bulb-content">
                    <p>For complete summaries during video calls, use NotionNest app to capture microphone and system audio. Browser captures microphone only.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-icon-btn" onClick={() => setShowMoreMenu(!showMoreMenu)} title="More">
              <MoreHorizontal size={14} />
            </div>
            <div className="mt-icon-btn" title="Settings">
              <Settings size={14} />
            </div>
          </div>
        </div>

        {/* ═══ Participants Panel ═══ */}
        {showParticipantsPanel && (
          <div className="mt-participants-panel">
            {participants.map(p => (
              <div key={p.id} className="mt-participant-row">
                <div className="mt-avatar">{p.name.charAt(0).toUpperCase()}</div>
                <div className="mt-participant-detail">
                  <span className="mt-participant-name">{p.name}</span>
                  {p.email && <span className="mt-participant-email">{p.email}</span>}
                </div>
                <div className="mt-participant-remove" onClick={() => removeParticipant(p.id)}><X size={12} /></div>
              </div>
            ))}
            <div className="mt-participant-add-row">
              <input type="text" placeholder="Name" value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} className="mt-participant-input" />
              <input type="text" placeholder="Email" value={newParticipantEmail} onChange={e => setNewParticipantEmail(e.target.value)} className="mt-participant-input" />
              <button className="mt-participant-add-btn" onClick={addParticipant}><Plus size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Notion.so-style Unified Recording UI ═══ */}
        <div className="nnr-unified">
          {/* ─── Tab Header ─── */}
          <div className="nnr-tab-header">
            <div
              className={`nnr-tab-btn${viewMode === 'transcript' ? ' active' : ''}`}
              onClick={() => setViewMode('transcript')}
            >
              <Mic size={14} /> Transcript
            </div>
            {(transcription || finalNotes || notesBody) && (
              <div
                className={`nnr-tab-btn${viewMode === 'final_notes' ? ' active' : ''}`}
                onClick={() => setViewMode('final_notes')}
              >
                <FileText size={14} /> Final Notes
              </div>
            )}
          </div>

          {/* ─── Transcript Tab ─── */}
          {viewMode === 'transcript' && (
            <div className="nnr-tab-content">
              {/* Single horizontal row: Auto/Manual | Animation/Audio | Controls */}
              <div className="nnr-transcript-row">
                {/* Left: Auto/Manual toggle (always visible) */}
                <div className="nnr-transcript-left">
                  <div className="nnr-mode-toggle">
                    <span
                      className={`nnr-mode-option${mode === 'auto' ? ' active' : ''}`}
                      onClick={() => saveProp('mode', 'auto')}
                    >
                      Auto
                    </span>
                    <span
                      className={`nnr-mode-option${mode === 'manual' ? ' active' : ''}`}
                      onClick={() => saveProp('mode', 'manual')}
                    >
                      Manual
                    </span>
                    {mode === 'manual' && (
                      <div
                        className="nnr-add-manual-compact"
                        onClick={addManualLine}
                        title="Add Manual Transcript"
                      >
                        <Plus size={14} />
                        <span className="nnr-add-manual-label">Add Manual Transcript</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center: Waveform (recording) OR Audio playback (stopped) */}
                <div className="nnr-transcript-center">
                  {/* During recording: waveform animation */}
                  {recording && (
                    <div className="nnr-waveform">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div
                          key={i}
                          className={`nnr-wave-dot${i % 5 === 0 ? ' nnr-wave-bar-el' : ''}`}
                          style={{ animationDelay: `${i * 0.06}s` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* After recording: audio playback controls */}
                  {!recording && transcription && (audioUrl || block.audioData) && (
                    <div className="nnr-audio-controls">
                      <audio
                        ref={audioRef}
                        src={audioUrl || block.audioData}
                        preload="auto"
                        onLoadedMetadata={() => {
                          if (audioRef.current) {
                            setAudioDuration(audioRef.current.duration);
                          }
                        }}
                      />
                      <button className="nnr-play-btn-sm" onClick={isPlaying ? pauseAudio : playAudio}>
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <span className="nnr-audio-time">
                        {formatTime(Math.floor(currentPlaybackTime))} / {formatTime(audioDuration || block.audioDuration || timer)}
                      </span>
                    </div>
                  )}

                  {/* Idle state text relocated to transcript content area (T2) */}
                </div>

                {/* Right: Sliders + Icons (always) / Start or Pause+Stop */}
                <div className="nnr-transcript-right">
                  {/* Sliders */}
                  <div className="nnr-settings-wrap" ref={settingsWrapRef}>
                    <div className="nnr-icon-btn" title="Recording settings" onClick={() => setShowSettingsPopover(!showSettingsPopover)}>
                      <Sliders size={14} />
                    </div>
                    {showSettingsPopover && renderSettingsPopover()}
                  </div>

                  {/* Delete icon - only when transcript content exists */}
                  {(transcription || transcriptLines.length > 0 || notesContent) && (
                    <div className="nnr-icon-btn" title="Clear all" onClick={() => setShowConfirmClear(true)}>
                      <Trash2 size={14} />
                    </div>
                  )}

                  {/* Copy icon */}
                  <div className="nnr-icon-btn" title="Copy transcript" onClick={() => copyText(displayTranscription)}>
                    <Copy size={14} />
                  </div>

                  {/* Read aloud toggle */}
                  <div className={'nnr-icon-btn' + (isReadingAloud ? ' nnr-icon-btn-active' : '')} title={isReadingAloud ? 'Stop reading aloud' : 'Read aloud'} onClick={() => readAloud(displayTranscription)}>
                    {isReadingAloud ? <MegaphoneOff size={14} /> : <Megaphone size={14} />}
                  </div>

                  {/* Speaker output device selector */}
                  <div className="nnr-output-device-wrap" ref={outputDeviceWrapRef}>
                    <div className="nnr-icon-btn" title="Select playback speaker" onClick={() => { if (!showOutputDeviceMenu) enumerateOutputDevices(); setShowOutputDeviceMenu(!showOutputDeviceMenu); }}>
                      <Speaker size={14} />
                    </div>
                    {showOutputDeviceMenu && (
                      <div className="nnr-output-device-menu">
                        {audioOutputDevices.length === 0 && (
                          <div className="nnr-output-device-item">Default</div>
                        )}
                        {audioOutputDevices.map((device) => (
                          <div key={device.deviceId} className={'nnr-output-device-item' + (selectedOutputDevice === device.deviceId ? ' active' : '')} onClick={() => { saveProp('selectedOutputDevice', device.deviceId); setShowOutputDeviceMenu(false); }}>
                            {device.label || 'Speaker ' + (audioOutputDevices.indexOf(device) + 1)}
                            {selectedOutputDevice === device.deviceId && <Check size={12} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="nnr-icons-divider" />

                  {/* Mic source selection (locked to All Sources in Meeting mode) */}
                  <div className="nnr-audio-source-wrap" ref={audioSourceWrapRef}>
                    <div className="nnr-icon-btn" title={'Audio source: ' + audioSource + (selectedInstruction === 'Meeting' ? ' (locked for Meeting)' : '')} onClick={() => { if (selectedInstruction !== 'Meeting') setShowAudioSourceMenu(!showAudioSourceMenu); }}>
                      <Mic size={14} />
                    </div>
                    {selectedInstruction !== 'Meeting' && showAudioSourceMenu && (
                      <div className="nnr-audio-source-menu">
                        <div className={'nnr-audio-source-item' + (audioSource === 'mic' ? ' active' : '')} onClick={() => { saveProp('audioSource', 'mic'); setShowAudioSourceMenu(false); }}>
                          <Mic size={12} /> Mic {audioSource === 'mic' && <Check size={12} />}
                        </div>
                        <div className={'nnr-audio-source-item' + (audioSource === 'system' ? ' active' : '')} onClick={() => { saveProp('audioSource', 'system'); setShowAudioSourceMenu(false); }}>
                          <Volume2 size={12} /> System Audio {audioSource === 'system' && <Check size={12} />}
                        </div>
                        <div className={'nnr-audio-source-item' + (audioSource === 'both' ? ' active' : '')} onClick={() => { saveProp('audioSource', 'both'); setShowAudioSourceMenu(false); }}>
                          <Mic size={12} /><Volume2 size={12} /> All Sources {audioSource === 'both' && <Check size={12} />}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="nnr-icons-divider" />

                  {/* Start transcribing or Pause/Stop */}
                  {!recording ? (
                    <div
                      className="nnr-icon-btn nnr-start-record-btn"
                      title="Start transcribing"
                      onClick={() => {
                        if (mode === 'manual') {
                          saveProp('mode', 'auto');
                        }
                        startRecording();
                      }}
                    >
                      <AudioLines size={16} />
                    </div>
                  ) : (
                    <>
                      <span className="nnr-action-text" onClick={toggleRecording}>
                        {isPaused ? 'Resume' : 'Pause'}
                      </span>
                      <span className="nnr-action-text nnr-stop" onClick={stopRecording}>
                        Stop
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Transcript content area (below the controls row) — always rendered */}
              <div className="nnr-transcript-content">
                {/* Idle placeholder: shown only when no content exists */}
                {!recording && displayTranscriptLines.length === 0 && !displayTranscription && !notesContent && (
                  <div className="nnr-transcript-text nnr-transcript-empty">
                    <span className="nnr-idle-text">Click <AudioLines size={14} style={{ color: '#2383e2', display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }} /> to begin</span>
                  </div>
                )}
                {displayTranscriptLines && displayTranscriptLines.length > 0 ? (
                  <div className="nnr-transcript-text">
                    {displayTranscriptLines.map(function (line, idx) {
                      var isManualSource = line.source && (line.source.indexOf('Manual') !== -1);
                      var canEdit = mode === 'manual' && isManualSource;
                      var lineNum = String(idx + 1).padStart(3, '0');
                      var cssClass = 'nnr-line-content';
                      if (canEdit) cssClass = cssClass;
                      else cssClass = cssClass + ' nnr-line-content-greyed';
                      return (
                        <div key={line.id} className="nnr-transcript-line">
                          <span className="nnr-line-number">{lineNum}</span>
                          <span className="nnr-line-meta">{line.timestamp} | {line.source} | </span>
                          <span
                            className={cssClass}
                            contentEditable={canEdit}
                            suppressContentEditableWarning={true}
                            onBlur={function (e) { var txt = e.currentTarget.textContent; updateManualLine(line.id, txt); setEditingLineId(null); }}
                            onFocus={function () { setEditingLineId(line.id); }}
                          >{line.content}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="nnr-transcript-text">
                    {displayTranscription || notesContent}
                  </div>
                )}
                {interimText && <div className="nnr-transcript-interim-wrap"><span className="nnr-interim">{interimText}<span className="nnr-interim-cursor">|</span></span></div>}
              </div>

              {/* Clear confirmation modal (reused pattern) */}
              {showConfirmClear && (
                <div className="confirm-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="confirm-modal">
                    <h3>Clear all transcript?</h3>
                    <p>This will delete all recorded lines and transcription. This action cannot be undone.</p>
                    <div className="confirm-modal-actions">
                      <button className="confirm-btn-cancel" onClick={() => setShowConfirmClear(false)}>
                        Cancel
                      </button>
                      <button className="confirm-btn-delete" onClick={clearAllLines}>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden audio file input for Upload Audio */}
              <input type="file" ref={audioUploadRef} accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFileChange} />

              {/* Consent card (only shown when not in Manual mode after stop) */}
              {transcription && !recording && mode !== 'manual' && (
                <div className="nnr-consent-card">
                  <div className="nnr-consent-title">Choose how you notify others</div>
                  <div className="nnr-consent-buttons">
                    <button className="nnr-consent-btn" onClick={() => saveProp('consentMode', 'manual')}>
                      <UserPlus size={12} /> Get consent myself
                    </button>
                    <button className="nnr-consent-btn" onClick={() => saveProp('consentMode', 'auto')}>
                      <Volume2 size={12} /> Automatically play audio
                    </button>
                  </div>
                  {block.consentMode && (
                    <div className="nnr-consent-status">
                      Consent mode: {block.consentMode === 'manual' ? 'Manual consent required' : 'Automatic audio playback'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Final Notes Tab ─── */}
          {viewMode === 'final_notes' && (
            <div className="nnr-tab-content">
              {/* Processing state with progress bar */}
              {processing && (
                <div className="nnr-processing-state">
                  <div className="nnr-progress-bar">
                    <div className="nnr-progress-fill"></div>
                  </div>
                  <p className="nnr-processing-text">Generating meeting notes with Ziva AI...</p>
                </div>
              )}

              {/* Final notes content */}
              {!processing && (finalNotes || notesBody) && (
                <div className="nnr-final-notes-content">
                  {/* Header row: Toggle buttons (left) + Download dropdown (right) */}
                  <div className="nnr-final-header-row">
                    <div className="nnr-toggle-group">
                      {hasSummarySection && (
                        <label className={`nnr-toggle-chip${includeSummary ? ' active' : ''}`} onClick={() => saveProp('includeSummary', !includeSummary)}>Summary</label>
                      )}
                      {hasKeyPointsSection && (
                        <label className={`nnr-toggle-chip${includeBullets ? ' active' : ''}`} onClick={() => saveProp('includeBullets', !includeBullets)}>Key Points</label>
                      )}
                      {hasActionItemsSection && (
                        <label className={`nnr-toggle-chip${includeActionItems ? ' active' : ''}`} onClick={() => saveProp('includeActionItems', !includeActionItems)}>Actions</label>
                      )}
                      {hasFollowUpSection && (
                        <label className={`nnr-toggle-chip${includeFollowUp ? ' active' : ''}`} onClick={() => saveProp('includeFollowUp', !includeFollowUp)}>Follow Up</label>
                      )}
                    </div>

                    {/* Download icon with pop-over */}
                    <div className="nnr-download-wrap" ref={downloadWrapRef}>
                      <button className="nnr-download-icon-btn" onClick={() => setShowDownloadMenu(!showDownloadMenu)} title="Download">
                        <Download size={16} />
                      </button>
                      {showDownloadMenu && (
                        <div className="nnr-download-dropdown">
                          <div className="nnr-download-item" onClick={() => { exportTxt(); setShowDownloadMenu(false); }}>TXT</div>
                          <div className="nnr-download-item" onClick={() => { exportDocx(); setShowDownloadMenu(false); }}>DOCX</div>
                          <div className="nnr-download-item" onClick={() => { exportCsv(); setShowDownloadMenu(false); }}>CSV</div>
                          <div className="nnr-download-item" onClick={() => { exportJson(); setShowDownloadMenu(false); }}>JSON</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Insights */}
                  {aiInsights.length > 0 && (
                    <div className="nnr-insights-section">
                      <h4>AI Insights</h4>
                      <div className="mt-insights-row">
                        {aiInsights.map((ins, i) => (
                          <div key={i} className="mt-insight-card">
                            {ins.icon === 'Lightbulb' && <Lightbulb size={14} />}
                            {ins.icon === 'Clock' && <Clock size={14} />}
                            {ins.icon === 'Users' && <Users size={14} />}
                            <span>{ins.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated notes */}
                  <div className="nnr-generated-notes">
                    <div className="mt-rich-text" dangerouslySetInnerHTML={{ __html: renderMd(notesBody || finalNotes) }} />
                  </div>

                  {/* Transcript section — references same content as Transcript tab */}
                  {(displayTranscription || transcriptLines.length > 0) && (
                    <div className="nnr-final-transcript-section">
                      <h4>Transcript</h4>
                      <div className="nnr-final-meta-row">
                        <span className="nnr-final-meta-item">Date: {date}</span>
                        <span className="nnr-final-meta-item">Duration: {formatTime(timer)}</span>
                        <span className="nnr-final-meta-item">Source: {mode === 'auto' ? 'Auto Recording' : 'Manual Entry'}</span>
                      </div>
                      <div className="nnr-final-transcript-body">
                        {transcriptLines.length > 0 ? transcriptLines.map(function (line, idx) {
                          var lineNum = String(idx + 1).padStart(3, '0');
                          return <div key={line.id} className="nnr-transcript-line"><span className="nnr-line-number">{lineNum}</span><span className="nnr-line-meta">{line.timestamp} | {line.source} | </span><span className="nnr-line-content">{line.content}</span></div>;
                        }) : (displayTranscription)}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="nnr-final-actions">
                    <button className="nnr-act-btn" onClick={() => copyText(finalNotes || notesBody)} title="Copy">
                      <Copy size={14} /> Copy
                    </button>
                    <button className={'nnr-act-btn' + (isReadingAloud ? ' nnr-act-btn-active' : '')} onClick={() => readAloud(finalNotes || notesBody)} title={isReadingAloud ? 'Stop reading aloud' : 'Read aloud'}>
                      {isReadingAloud ? <MegaphoneOff size={14} /> : <Megaphone size={14} />} {isReadingAloud ? 'Stop' : 'Read aloud'}
                    </button>
                    <button className="nnr-act-btn" onClick={shareNotes} title="Share">
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!processing && !finalNotes && !notesBody && (
                <div className="nnr-empty-state">
                  <p>Final notes will be generated after recording stops.</p>
                  <button className="nnr-generate-btn" onClick={finishTakingNotes} disabled={processing}>
                    {processing ? 'Generating...' : <><Check size={13} /> Generate Final Notes</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ More Menu ═══ */}
        {showMoreMenu && (
          <div className="mt-more-menu">
            <div className="mt-more-item" onClick={() => { copyText(notesContent); setShowMoreMenu(false); }}><Copy size={12} /> Copy notes</div>
            <div className="mt-more-item" onClick={() => { readAloud(notesContent); setShowMoreMenu(false); }}><Volume2 size={12} /> Read aloud</div>
            <div className="mt-more-item" onClick={() => { generateSummary(); setShowMoreMenu(false); }}><MessageSquare size={12} /> Generate summary</div>
            <div className="mt-more-item" onClick={() => { saveProp('includeSummary', !includeSummary); setShowMoreMenu(false); }}><List size={12} /> {includeSummary ? 'Hide' : 'Show'} summary</div>
            <div className="mt-more-item" onClick={() => { saveProp('includeBullets', !includeBullets); setShowMoreMenu(false); }}><List size={12} /> {includeBullets ? 'Hide' : 'Show'} bullets</div>
            <div className="mt-more-item" onClick={() => { saveProp('mode', mode === 'auto' ? 'manual' : 'auto'); setShowMoreMenu(false); }}><Mic size={12} /> Switch to {mode === 'auto' ? 'manual' : 'auto'}</div>
            <div className="mt-more-item" onClick={() => { setViewMode('transcript'); setShowMoreMenu(false); }}><FileText size={12} /> View transcript</div>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   Button Block — Full Notion-style action button
   ───────────────────────────────────────────── */
const ACTION_DEFS = {
  insertBlock: { label: 'Insert block', icon: 'Plus', color: '#2383e2' },
  openUrl: { label: 'Open URL', icon: 'ExternalLink', color: '#0f7b6c' },
  showConfirmation: { label: 'Show confirmation', icon: 'AlertTriangle', color: '#d9730d' },
  openPage: { label: 'Open page', icon: 'FileText', color: '#9065b0' },
  sendNotification: { label: 'Send notification', icon: 'Bell', color: '#eb5757' },
  addToDatabase: { label: 'Add pages to', icon: 'Database', color: '#2383e2' },
  editDatabase: { label: 'Edit pages in', icon: 'Edit3', color: '#dfab01' },
  form: { label: 'Form', icon: 'Variable', color: '#c14c8a' },
  defineVariables: { label: 'Define variables', icon: 'Variable', color: '#706e6b' },
};

function genId() { return Math.random().toString(36).slice(2, 10); }

function defaultActionConfig(type) {
  const cfgs = {
    insertBlock: { blockType: 'paragraph', content: '' },
    openUrl: { url: '', newTab: true },
    showConfirmation: { title: 'Are you sure?', confirmText: 'Continue', cancelText: 'Cancel' },
    openPage: { pageId: '', pageTitle: '' },
    sendNotification: { title: '', message: '', type: 'info' },
    addToDatabase: { databaseId: '', databaseName: '', values: [] },
    editDatabase: { databaseId: '', databaseName: '', filter: '', updates: [] },
    form: { fields: [], submitLabel: 'Submit' },
    defineVariables: { variables: [] },
  };
  return cfgs[type] || {};
}

function createAction(type) {
  return { id: genId(), type, enabled: true, label: ACTION_DEFS[type]?.label || type, config: defaultActionConfig(type) };
}

/* ── Action config editor sub-components ── */
function ActionConfigInsertBlock({ config, onChange, blockTypes }) {
  return (
    <div className="btn-act-config">
      <label>Block type</label>
      <select value={config.blockType || 'paragraph'} onChange={e => onChange({ ...config, blockType: e.target.value })}>
        {blockTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <label>Initial content</label>
      <input type="text" value={config.content || ''} onChange={e => onChange({ ...config, content: e.target.value })} placeholder="Optional" />
    </div>
  );
}

function ActionConfigOpenUrl({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>URL</label>
      <input type="text" value={config.url || ''} onChange={e => onChange({ ...config, url: e.target.value })} placeholder="https://..." />
      <label className="btn-act-row">
        <input type="checkbox" checked={config.newTab !== false} onChange={e => onChange({ ...config, newTab: e.target.checked })} />
        Open in new tab
      </label>
    </div>
  );
}

function ActionConfigConfirmation({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>Title</label>
      <input type="text" value={config.title || ''} onChange={e => onChange({ ...config, title: e.target.value })} />
      <label>Confirm button</label>
      <input type="text" value={config.confirmText || 'Continue'} onChange={e => onChange({ ...config, confirmText: e.target.value })} />
      <label>Cancel button</label>
      <input type="text" value={config.cancelText || 'Cancel'} onChange={e => onChange({ ...config, cancelText: e.target.value })} />
    </div>
  );
}

function ActionConfigOpenPage({ config, onChange, notionPages }) {
  const [search, setSearch] = useState('');
  const filtered = notionPages.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="btn-act-config">
      <label>Search page</label>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to search..." />
      {config.pageTitle && <div className="btn-act-selected">Selected: {config.pageTitle}</div>}
      {search && <div className="btn-act-page-list">
        {filtered.slice(0, 10).map(p => (
          <div key={p.id} className="btn-act-page-item" onClick={() => onChange({ pageId: p.id, pageTitle: p.title })}>
            {p.title || 'Untitled'}
          </div>
        ))}
        {filtered.length === 0 && <div className="btn-act-empty">No pages found</div>}
      </div>}
    </div>
  );
}

function ActionConfigNotification({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>Title</label>
      <input type="text" value={config.title || ''} onChange={e => onChange({ ...config, title: e.target.value })} />
      <label>Message</label>
      <input type="text" value={config.message || ''} onChange={e => onChange({ ...config, message: e.target.value })} />
      <label>Type</label>
      <select value={config.type || 'info'} onChange={e => onChange({ ...config, type: e.target.value })}>
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
      </select>
    </div>
  );
}

function ActionConfigDatabase({ config, onChange, label }) {
  return (
    <div className="btn-act-config">
      <label>Database</label>
      <input type="text" value={config.databaseName || ''} onChange={e => onChange({ ...config, databaseName: e.target.value, databaseId: e.target.value })} placeholder="Database name or ID" />
      <p className="btn-act-hint">Enter the database name or ID. Database integration coming soon.</p>
    </div>
  );
}

function ActionConfigForm({ config, onChange }) {
  const addField = () => {
    const fields = [...(config.fields || []), { id: genId(), label: '', type: 'text', required: false }];
    onChange({ ...config, fields });
  };
  const updField = (idx, updates) => {
    const fields = [...(config.fields || [])];
    fields[idx] = { ...fields[idx], ...updates };
    onChange({ ...config, fields });
  };
  const delField = (idx) => {
    const fields = (config.fields || []).filter((_, i) => i !== idx);
    onChange({ ...config, fields });
  };
  return (
    <div className="btn-act-config">
      <label>Submit label</label>
      <input type="text" value={config.submitLabel || 'Submit'} onChange={e => onChange({ ...config, submitLabel: e.target.value })} />
      <label>Fields</label>
      {(config.fields || []).map((f, i) => (
        <div key={f.id} className="btn-act-field-row">
          <input type="text" value={f.label} onChange={e => updField(i, { label: e.target.value })} placeholder="Field label" />
          <select value={f.type} onChange={e => updField(i, { type: e.target.value })}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="email">Email</option>
            <option value="textarea">Textarea</option>
            <option value="select">Select</option>
          </select>
          <label className="btn-act-chk"><input type="checkbox" checked={f.required} onChange={e => updField(i, { required: e.target.checked })} />Req</label>
          <div className="btn-act-field-del" onClick={() => delField(i)}><Trash2 size={12} /></div>
        </div>
      ))}
      <div className="btn-act-add-field" onClick={addField}><Plus size={12} /> Add field</div>
    </div>
  );
}

function ActionConfigVariables({ config, onChange }) {
  const addVar = () => {
    const variables = [...(config.variables || []), { id: genId(), name: '', value: '' }];
    onChange({ ...config, variables });
  };
  const updVar = (idx, updates) => {
    const variables = [...(config.variables || [])];
    variables[idx] = { ...variables[idx], ...updates };
    onChange({ ...config, variables });
  };
  const delVar = (idx) => {
    const variables = (config.variables || []).filter((_, i) => i !== idx);
    onChange({ ...config, variables });
  };
  return (
    <div className="btn-act-config">
      {(config.variables || []).map((v, i) => (
        <div key={v.id} className="btn-act-field-row">
          <input type="text" value={v.name} onChange={e => updVar(i, { name: e.target.value })} placeholder="Variable name" />
          <input type="text" value={v.value} onChange={e => updVar(i, { value: e.target.value })} placeholder="Value" />
          <div className="btn-act-field-del" onClick={() => delVar(i)}><Trash2 size={12} /></div>
        </div>
      ))}
      <div className="btn-act-add-field" onClick={addVar}><Plus size={12} /> Add variable</div>
    </div>
  );
}

function ActionConfigEditor({ action, onChange, onDelete, notionPages, blockTypes }) {
  const [open, setOpen] = useState(false);
  const cfg = action.config || {};
  const def = ACTION_DEFS[action.type];

  const renderConfig = () => {
    const props = { config: cfg, onChange: (c) => onChange({ ...action, config: c }), notionPages, blockTypes, label: def?.label || '' };
    switch (action.type) {
      case 'insertBlock': return <ActionConfigInsertBlock {...props} />;
      case 'openUrl': return <ActionConfigOpenUrl {...props} />;
      case 'showConfirmation': return <ActionConfigConfirmation {...props} />;
      case 'openPage': return <ActionConfigOpenPage {...props} />;
      case 'sendNotification': return <ActionConfigNotification {...props} />;
      case 'addToDatabase': return <ActionConfigDatabase {...props} />;
      case 'editDatabase': return <ActionConfigDatabase {...props} />;
      case 'form': return <ActionConfigForm {...props} />;
      case 'defineVariables': return <ActionConfigVariables {...props} />;
      default: return null;
    }
  };

  return (
    <div className={`btn-act-item${open ? ' btn-act-open' : ''}`}>
      <div className="btn-act-header" onClick={() => setOpen(!open)}>
        <GripVertical size={14} className="btn-act-grip" />
        <span className={`btn-act-dot`} style={{ background: def?.color || '#999' }} />
        <span className="btn-act-type">{action.label || def?.label}</span>
        <label className="btn-act-toggle" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={action.enabled !== false} onChange={e => onChange({ ...action, enabled: e.target.checked })} />
        </label>
        <div className="btn-act-del" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={13} /></div>
        <ChevronDown size={14} className={`btn-act-chevron${open ? ' rotated' : ''}`} />
      </div>
      {open && renderConfig()}
    </div>
  );
}

/* ── Action execution engine ── */
function executeActions(actions, ctx) {
  const { block, addBlock, updateBlockProperty, setDeleteConfirm } = ctx;
  const run = async (index) => {
    if (index >= actions.length) return;
    const action = actions[index];
    if (!action.enabled) { run(index + 1); return; }
    const cfg = action.config || {};
    try {
      switch (action.type) {
        case 'insertBlock': {
          addBlock(cfg.blockType || 'paragraph', block.id, cfg.content || '');
          run(index + 1);
          break;
        }
        case 'openUrl': {
          if (cfg.url) window.open(cfg.url, cfg.newTab !== false ? '_blank' : '_self', 'noopener');
          run(index + 1);
          break;
        }
        case 'showConfirmation': {
          setDeleteConfirm({
            type: 'action',
            blockId: block.id,
            title: cfg.title || 'Are you sure?',
            message: '',
            cancelText: cfg.cancelText || 'Cancel',
            confirmText: cfg.confirmText || 'Continue',
            onConfirm: () => { setDeleteConfirm(null); run(index + 1); },
            onCancel: () => setDeleteConfirm(null)
          });
          break;
        }
        case 'openPage': {
          if (cfg.pageId) {
            const navigate = ctx.navigateRef?.current;
            if (navigate) navigate(`/notion/${cfg.pageId}`);
          }
          run(index + 1);
          break;
        }
        case 'sendNotification': {
          if (cfg.message) {
            const notify = ctx.notifyRef?.current;
            if (notify) notify(cfg.message, cfg.type || 'info', cfg.title);
          }
          run(index + 1);
          break;
        }
        case 'addToDatabase':
        case 'editDatabase': {
          // Placeholder - will be integrated with database system
          run(index + 1);
          break;
        }
        case 'form': {
          // For now, just proceed
          run(index + 1);
          break;
        }
        case 'defineVariables': {
          const variables = cfg.variables || [];
          if (variables.length > 0 && ctx.setVariablesRef?.current) {
            ctx.setVariablesRef.current(variables);
          }
          run(index + 1);
          break;
        }
        default: run(index + 1);
      }
    } catch {
      run(index + 1);
    }
  };
  run(0);
}
