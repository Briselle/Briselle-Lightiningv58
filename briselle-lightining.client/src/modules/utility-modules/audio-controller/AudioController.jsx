/* ============================================================
   Briselle Enterprise Platform — Common Utility Modules
   AudioController.jsx — Briselle Audio Controller (Simple + Full)
   Created At: 2026-07-25 | Last Modified: 2026-08-16
   Previous Version Back URL: utility-modules/audio-controller/AudioController.jsx@2026-07-26
                              (2-line-only player, no variant / stop / error)

   Task: BRIS-NN-MNB-T76
   Purpose: ONE audio controller for the whole platform. The parallel
            NotionNest player (meeting-notes/transcript/AudioPlayerBar.jsx)
            has been merged in here as the `simple` variant and deleted,
            so there is exactly one player implementation to maintain.

   Variants (user-switchable at runtime via onVariantChange):
     'full'   — the original two-line player: title, brand badge, speaker
                selector, transport, tall equalizer, elapsed/total/remaining.
     'simple' — one compact line: play/pause, stop, track name, the SAME
                equalizer at half height, time and volume.

   Backward compatibility: every new prop is optional and every default
   reproduces the previous behaviour exactly. `variant` defaults to 'full',
   so existing consumers (AudioBlock, Ziva) render as they did before.

   The ONE deliberate behaviour change: play() failures are no longer
   swallowed by `.catch(() => {})`. A failed play now shows an inline
   message and calls onError. Silence here is what made a completely
   broken player look merely unresponsive for five rounds.

   Styling: AudioController.css. No inline CSS except values that are
   data (computed bar heights, brand colour, progress width).
   ============================================================ */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX,
  Speaker, X, Minimize2, Maximize2
} from 'lucide-react';
import './AudioController.css';

/** The two supported layouts. Exported so callers can validate/persist. */
export const AUDIO_CONTROLLER_VARIANTS = ['simple', 'full'];

/** Format seconds as MM:SS, or H:MM:SS past the hour. */
export function formatAudioTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------
   Shared thin-line equalizer.

   BOTH variants render THIS component — the simple variant does not
   carry a second copy of the waveform. The variants differ only in the
   track height (`compact`) and the line density (`barPitch`); bar heights
   are percentages, so the waveform fills whatever height CSS gives it.
   ------------------------------------------------------------------ */
function BacEqualizer({
  progressPercent,
  isPlaying,
  brandColor,
  volumeMultiplier,
  heightScale = 1,
  /* Short track (the one-line variant). Controls the CONTAINER height in
     CSS; bar heights are percentages, so they follow automatically. */
  compact = false,
  /* Pixels consumed per bar (bar width + gap). 4 is the original
     density; BRIS-NN-MNB-T78 renders the full variant at 2, which is
     twice as many lines across the same width. */
  barPitch = 4,
  onScrubPercent,
}) {
  const containerRef = useRef(null);
  const [barCount, setBarCount] = useState(48);
  const isDense = barPitch <= 2;

  /* Bar count follows the container width at the configured pitch. */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const updateBarCount = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setBarCount(Math.max(16, Math.floor(width / barPitch)));
      }
    };

    updateBarCount();
    const observer = new ResizeObserver(updateBarCount);
    observer.observe(node);
    return () => observer.disconnect();
  }, [barPitch]);

  const handleScrub = (e) => {
    if (!containerRef.current || !onScrubPercent) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onScrubPercent(pct);
  };

  return (
    <div
      className={`bac-waveform-container${compact ? ' bac-waveform-compact' : ''}${isDense ? ' bac-waveform-dense' : ''}`}
      ref={containerRef}
      onClick={handleScrub}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuenow={Math.round(progressPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      onKeyDown={(e) => {
        if (!onScrubPercent) return;
        if (e.key === 'ArrowRight') onScrubPercent(Math.min(1, progressPercent / 100 + 0.05));
        if (e.key === 'ArrowLeft') onScrubPercent(Math.max(0, progressPercent / 100 - 0.05));
      }}
    >
      <div className="bac-waveform-bars">
        {Array.from({ length: barCount }).map((_, idx) => {
          const barPercent = (idx / barCount) * 100;
          const isActive = barPercent <= progressPercent;
          const isAccentBar = idx % 5 === 0;

          /* BRIS-NN-MNB-T79: bar heights are a PERCENTAGE of the track, not
             a pixel count. They used to be computed against a fixed 48px
             container, so any host that restyled the container height —
             like the meeting block, which slims it to 32px — had its bars
             overflow and get cut off by the container's overflow:hidden.
             As a fraction, the waveform fits whatever height it is given
             and both variants stay in proportion. */
          const baseHeightPx = isAccentBar
            ? 38
            : Math.max(8, (Math.sin(idx * 0.4) * 0.5 + 0.5) * 44 + 6);
          const heightPct = Math.max(
            6,
            Math.min(100, (baseHeightPx / 48) * 100 * volumeMultiplier * heightScale)
          );

          return (
            <div
              key={idx}
              className={`bac-wave-bar ${isAccentBar ? 'bac-wave-accent' : ''} ${isActive ? 'active' : ''} ${isPlaying ? 'animating' : ''}`}
              style={{
                height: `${heightPct.toFixed(1)}%`,
                backgroundColor: isActive ? brandColor : '#cbd5e1',
                animationDelay: `${(idx * 0.03).toFixed(2)}s`
              }}
            />
          );
        })}
      </div>
      <div
        className="bac-progress-fill"
        style={{ width: `${progressPercent}%`, backgroundColor: `${brandColor}18` }}
      />
    </div>
  );
}

export function AudioController({
  src,
  title = 'Audio Track',
  artist = 'Briselle Ziva AI',
  duration = 0,
  currentTime = 0,
  isPlaying = false,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onPrev,
  onNext,
  onTimeUpdate,
  onEnded,
  onClose,
  onError,
  /* Failure raised by the host (e.g. no signed URL could be resolved).
     Rendered in the SAME place as the controller's own play failure, so
     a single problem can never be reported twice. */
  error = '',
  queueLabel = '',
  hasPrev = false,
  hasNext = false,
  outputDevices = [],
  selectedOutputDevice = '',
  onSelectOutputDevice,
  brandColor = '#2383e2',
  sticky = false,
  variant = 'full',
  onVariantChange,
  className = ''
}) {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
  const [internalTime, setInternalTime] = useState(0);
  const [internalDuration, setInternalDuration] = useState(0);
  const [playError, setPlayError] = useState('');
  const audioRef = useRef(null);

  /* onError is read inside an effect that must NOT re-run when the parent
     re-creates the callback, so it is held in a ref rather than a dep. */
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const isSimple = variant === 'simple';
  const activeTime = currentTime || internalTime || 0;
  const activeDuration = duration || internalDuration || 0;
  const timeLeft = Math.max(0, activeDuration - activeTime);

  /* A new track clears the previous track's failure message. */
  useEffect(() => { setPlayError(''); setInternalTime(0); }, [src]);

  /* BRIS-NN-MNB-T76: drive playback from the isPlaying prop and REPORT
     failures. The previous `.catch(() => {})` here meant a blocked or
     unreachable source produced no signal at all — the play button simply
     did nothing and there was nothing on screen to explain why. */
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !src) return undefined;

    if (!isPlaying) { el.pause(); return undefined; }

    let cancelled = false;
    el.play()
      .then(() => { if (!cancelled) setPlayError(''); })
      .catch((err) => {
        if (cancelled) return;
        /* NotAllowedError = autoplay policy: the browser wants the play to
           originate from a gesture. Anything else is a real media failure. */
        const message = err?.name === 'NotAllowedError'
          ? 'Playback blocked — press play again'
          : 'This audio could not be played';
        setPlayError(message);
        if (onErrorRef.current) onErrorRef.current(message, err);
      });

    return () => { cancelled = true; };
  }, [isPlaying, src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  /* Scrub target shared by the equalizer in both variants. */
  const handleScrubPercent = useCallback((pct) => {
    if (!activeDuration) return;
    const newTime = pct * activeDuration;
    setInternalTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (onSeek) onSeek(newTime);
  }, [activeDuration, onSeek]);

  const toggleMute = () => setIsMuted(m => !m);

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const progressPercent = activeDuration > 0
    ? Math.min(100, Math.max(0, (activeTime / activeDuration) * 100))
    : 0;

  /* Speaker volume scales equalizer height (muted = 0.25x, full = 1.0x). */
  const activeVolLevel = isMuted ? 0 : volume;
  const volumeMultiplier = activeVolLevel === 0 ? 0.25 : 0.4 + activeVolLevel * 0.6;

  /* The <audio> element is identical for both variants — declared once. */
  const audioEl = src ? (
    <audio
      ref={audioRef}
      src={src}
      preload="auto"
      /* BRIS-NN-MNB-T78: the element's own error carries a MediaError
         code, which says WHY the media failed where a rejected play()
         promise does not. Without this, an unplayable source and a
         missing one are indistinguishable — which is how every recording
         being uploaded as a 0-byte file went unnoticed. */
      onError={() => {
        const code = audioRef.current?.error?.code;
        const reason = {
          1: 'Loading was aborted',
          2: 'Network error while loading the audio',
          3: 'The audio file is corrupt or empty',
          4: 'This audio format is not supported, or the file is empty',
        }[code] || 'This audio could not be played';
        console.error('AudioController media error', { code, src });
        setPlayError(reason);
        if (onErrorRef.current) onErrorRef.current(reason, { mediaErrorCode: code, src });
      }}
      onLoadedMetadata={() => {
        if (audioRef.current) {
          const d = audioRef.current.duration;
          /* MediaRecorder webm reports Infinity until fully seeked. */
          setInternalDuration(Number.isFinite(d) ? d : 0);
        }
      }}
      onTimeUpdate={() => {
        if (audioRef.current) {
          const cur = audioRef.current.currentTime;
          setInternalTime(cur);
          if (onTimeUpdate) onTimeUpdate(cur);
        }
      }}
      onEnded={() => {
        setInternalTime(0);
        if (onEnded) onEnded();
      }}
    />
  ) : null;

  /* Variant switch — only offered when the host wants it switchable. */
  const variantToggle = onVariantChange ? (
    <button
      type="button"
      className="bac-btn bac-btn-variant"
      onClick={() => onVariantChange(isSimple ? 'full' : 'simple')}
      title={isSimple ? 'Switch to full player' : 'Switch to simple player'}
      aria-label={isSimple ? 'Switch to full player' : 'Switch to simple player'}
    >
      {isSimple ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
    </button>
  ) : null;

  /* ──────────────────────────────────────────────────────────────────
     BRIS-NN-MNB-T80 — ONE transport group, rendered by both variants.

     The full variant used to have its own 32px brand-filled play button
     while the simple variant used the neutral 28px disc. Same controls,
     two appearances. This is now the single definition, in the compact
     style, and both variants place it on the right-hand side.
     ────────────────────────────────────────────────────────────────── */
  const transportGroup = (
    <div className="bac-transport">
      {hasPrev && (
        <button type="button" className="bac-btn bac-btn-prev" onClick={onPrev}
                title="Previous track" aria-label="Previous track">
          <SkipBack size={13} />
        </button>
      )}

      <button
        type="button"
        className="bac-btn bac-btn-simple-main"
        onClick={isPlaying ? onPause : onPlay}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying
          ? <Pause size={14} fill="currentColor" />
          : <Play size={14} fill="currentColor" />}
      </button>

      {onStop && (
        <button type="button" className="bac-btn bac-btn-stop" onClick={onStop}
                title="Stop" aria-label="Stop">
          <Square size={11} fill="currentColor" />
        </button>
      )}

      {hasNext && (
        <button type="button" className="bac-btn bac-btn-next" onClick={onNext}
                title="Next track" aria-label="Next track">
          <SkipForward size={13} />
        </button>
      )}
    </div>
  );

  const closeButton = onClose ? (
    <button
      type="button"
      className="bac-btn bac-btn-close"
      onClick={onClose}
      title="Close player"
      aria-label="Close player"
    >
      <X size={14} />
    </button>
  ) : null;

  const volumeGroup = (
    <div
      className="bac-volume-inline-group"
      title={`Volume: ${Math.round(activeVolLevel * 100)}%`}
    >
      <button
        type="button"
        className="bac-btn bac-btn-vol"
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={handleVolumeChange}
        className="bac-volume-slider-inline"
        aria-label="Volume"
      />
    </div>
  );

  const equalizer = (
    <BacEqualizer
      progressPercent={progressPercent}
      isPlaying={isPlaying}
      brandColor={brandColor}
      volumeMultiplier={volumeMultiplier}
      /* T79: compactness is the CONTAINER's height (.bac-waveform-compact),
         not a second scaling of the bars — otherwise the simple variant
         halved an already-halved track. Both variants fill their track. */
      heightScale={1}
      compact={isSimple}
      /* T78: the full variant runs at double density. */
      barPitch={isSimple ? 4 : 2}
      onScrubPercent={handleScrubPercent}
    />
  );

  /* One failure, one place. The host's error takes precedence because it
     describes why there is no usable source at all. */
  const shownError = error || playError;

  const errorRow = shownError
    ? <div className="bac-error" role="alert">{shownError}</div>
    : null;

  /* ---------------- SIMPLE VARIANT — single compact line ---------------- */
  if (isSimple) {
    return (
      <div
        className={`briselle-audio-controller bac-simple ${sticky ? 'bac-sticky' : ''} ${className}`}
      >
        {audioEl}

        {/* T80: transport moved from the left edge to the right, so its
            position matches the full variant. Order across both variants
            is now: content · time · volume · transport · toggle · close. */}
        <div className="bac-simple-row">
          {queueLabel && (
            <span className="bac-queue-count" title="Position in the play queue">
              {queueLabel}
            </span>
          )}

          <span className="bac-simple-name" title={title}>{title}</span>

          {equalizer}

          <div className="bac-time-display">
            <span className="bac-current-time">{formatAudioTime(activeTime)}</span>
            <span className="bac-time-divider">/</span>
            <span className="bac-total-time">{formatAudioTime(activeDuration)}</span>
          </div>

          {volumeGroup}
          {transportGroup}
          {variantToggle}
          {closeButton}
        </div>

        {errorRow}
      </div>
    );
  }

  /* ---------------- FULL VARIANT — two-line layout ----------------
     BRIS-NN-MNB-T78 repositioning, to the layout the user specified:

       line 1 │ file name ......................... [⤡] [🔊——] [✕]
       line 2 │ (n/total) ═══ equalizer ═══ 00:00/00:00 (-00:00) [◀][▶][■][▶▶]

     Nothing here is new behaviour — the same controls, moved. The one
     addition is the variant toggle, which switches this two-line view
     and the one-line simple view. Its icon doubles as the expand
     affordance: ⤡ collapses to simple, ⤢ expands back to full.
     ---------------------------------------------------------------- */
  return (
    <div className={`briselle-audio-controller ${sticky ? 'bac-sticky' : ''} ${className}`}>
      {audioEl}

      {/* LINE 1: file name at the left edge; controls at the right edge */}
      <div className="bac-header-row">
        <div className="bac-title-wrap">
          <span className="bac-track-title" title={title}>{title}</span>
          {artist && (
            <span className="bac-brand-badge" style={{ color: brandColor, backgroundColor: `${brandColor}12` }}>
              {artist}
            </span>
          )}
        </div>

        <div className="bac-header-right-controls">
          {outputDevices.length > 0 && (
            <div className="bac-device-wrap">
              <button
                type="button"
                className="bac-btn bac-btn-speaker"
                onClick={() => setShowSpeakerMenu(!showSpeakerMenu)}
                title="Select playback speaker"
                aria-label="Select playback speaker"
              >
                <Speaker size={13} />
              </button>
              {showSpeakerMenu && (
                <div className="bac-speaker-dropdown">
                  {outputDevices.map(d => (
                    <div
                      key={d.deviceId}
                      className={`bac-speaker-item ${selectedOutputDevice === d.deviceId ? 'active' : ''}`}
                      onClick={() => {
                        if (onSelectOutputDevice) onSelectOutputDevice(d.deviceId);
                        setShowSpeakerMenu(false);
                      }}
                    >
                      {d.label || `Speaker ${d.deviceId.substring(0, 5)}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {variantToggle}
          {volumeGroup}
          {closeButton}
        </div>
      </div>

      {/* LINE 2: queue count · full-stretch equalizer · time · transport */}
      <div className="bac-controls-row">
        {queueLabel && (
          <span className="bac-queue-count" title="Position in the play queue">
            {queueLabel}
          </span>
        )}

        {equalizer}

        <div className="bac-time-display">
          <span className="bac-current-time">{formatAudioTime(activeTime)}</span>
          <span className="bac-time-divider">/</span>
          <span className="bac-total-time">{formatAudioTime(activeDuration)}</span>
          <span className="bac-time-left">(-{formatAudioTime(timeLeft)})</span>
        </div>

        {transportGroup}
      </div>

      {errorRow}
    </div>
  );
}

export default AudioController;
