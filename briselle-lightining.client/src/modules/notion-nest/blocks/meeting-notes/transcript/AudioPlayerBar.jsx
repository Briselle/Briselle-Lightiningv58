/* ============================================================
   NotionNest — meeting-notes/transcript/AudioPlayerBar.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T57
   Purpose: Minimal audio player for the transcript toolbar. Owns the
            <audio> element, a play queue, transport controls, a seek
            bar and volume.

   Why this exists: playAudioFile() set `audioRef.current.src = file.data`
   but (a) no <audio> element was ever rendered, so audioRef was always
   null, and (b) DAM-stored recordings carry a url/fileId rather than
   base64 `data`. Playback therefore never worked from either path.

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, SkipForward } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { FileService } from '../../../../utility-modules/upload-module/FileService';

/** Playable source for a record, whichever storage path produced it. */
export function resolveAudioSrc(file) {
  if (!file) return null;
  return file.url || file.data || file.publicUrl || file.downloadUrl || null;
}

const fmt = (s) => {
  const t = Math.max(0, Math.floor(Number(s) || 0));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export function AudioPlayerBar() {
  const {
    playQueue, setPlayQueue,
    setCurrentPlayingAudioId,
    recording,
  } = useMeetingNotes();

  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const queue = Array.isArray(playQueue) ? playQueue : [];
  const current = queue[index] || null;
  const src = resolveAudioSrc(current);

  /* A new queue always restarts from its first track. */
  useEffect(() => { setIndex(0); }, [playQueue]);

  /* BRIS-NN-MNB-T65: resolve a source, then play.
     Records created by the DAM path may carry only a fileId — no url and
     no base64 — so there is nothing to assign to src. Fetch a signed URL
     in that case. Failures surface in the bar instead of being swallowed
     by a bare .catch(), which is why this looked like "nothing happens". */
  useEffect(() => {
    let cancelled = false;
    const el = audioRef.current;
    if (!el || !current) return undefined;

    const start = async () => {
      setError('');
      let playable = src;

      if (!playable && current.fileId) {
        try {
          playable = await FileService.getSignedUrl(current.fileId);
        } catch (e) {
          if (!cancelled) setError('Could not load this recording');
          return;
        }
      }

      if (!playable) {
        if (!cancelled) setError('This recording has no playable file');
        return;
      }
      if (cancelled) return;

      el.src = playable;
      el.volume = muted ? 0 : volume;
      try {
        await el.play();
        if (!cancelled) { setPlaying(true); setCurrentPlayingAudioId?.(current.id || null); }
      } catch (e) {
        /* Autoplay can be blocked until the user interacts; the transport
           button still works, so say so rather than failing silently. */
        if (!cancelled) { setPlaying(false); setError('Press play to start'); }
      }
    };

    start();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, current]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const next = useCallback(() => {
    if (index < queue.length - 1) setIndex(i => i + 1);
    else {
      setPlaying(false);
      setCurrentPlayingAudioId?.(null);
      setPlayQueue?.([]);          // queue finished — dismiss the bar
    }
  }, [index, queue.length, setPlayQueue, setCurrentPlayingAudioId]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else el.play().then(() => { setPlaying(true); setError(''); }).catch(() => setError('Playback blocked by the browser'));
  };

  const stop = () => {
    const el = audioRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
    setPlaying(false);
    setCurrentPlayingAudioId?.(null);
    setPlayQueue?.([]);
  };

  /* Hidden while recording — the live equalizer owns the strip then. */
  if (!current || recording) return null;

  return (
    <div className="nnr-player">
      <audio
        ref={audioRef}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setLength(e.currentTarget.duration || 0)}
        onEnded={next}
        preload="metadata"
      />

      <button type="button" className="nnr-player-btn" onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>

      <button type="button" className="nnr-player-btn stop" onClick={stop}
              aria-label="Stop" title="Stop">
        <Square size={12} fill="currentColor" />
      </button>

      {queue.length > 1 && (
        <button type="button" className="nnr-player-btn" onClick={next}
                aria-label="Next track" title={`Next (${index + 1}/${queue.length})`}>
          <SkipForward size={14} />
        </button>
      )}

      <span className="nnr-player-name" title={current.name}>{current.name}</span>

      <input
        className="nnr-player-seek"
        type="range"
        min={0}
        max={length || 0}
        step={0.1}
        value={Math.min(time, length || 0)}
        onChange={e => {
          const el = audioRef.current;
          if (el) { el.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }
        }}
        aria-label="Seek"
      />

      <span className="nnr-player-time">{fmt(time)} / {fmt(length)}</span>

      <button type="button" className="nnr-player-btn" onClick={() => setMuted(m => !m)}
              aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
        {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      <input
        className="nnr-player-vol"
        type="range"
        min={0} max={1} step={0.05}
        value={muted ? 0 : volume}
        onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
        aria-label="Volume"
      />

      {error && <span className="nnr-player-error">{error}</span>}

      {queue.length > 1 && (
        <span className="nnr-player-count">{index + 1}/{queue.length}</span>
      )}
    </div>
  );
}

export default AudioPlayerBar;
