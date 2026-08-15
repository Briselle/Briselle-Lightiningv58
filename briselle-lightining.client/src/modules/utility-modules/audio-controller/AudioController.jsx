/* ============================================================
   Briselle Enterprise Platform — Common Utility Modules
   AudioController.jsx — Dynamic Thin-Line Equalizer Audio Controller
   Created At: 2026-07-25 | Last Modified: 2026-07-26
   ============================================================ */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Speaker, X, Music } from 'lucide-react';
import './AudioController.css';

export function AudioController({
  src,
  title = 'Audio Track',
  artist = 'Briselle Ziva AI',
  duration = 0,
  currentTime = 0,
  isPlaying = false,
  onPlay,
  onPause,
  onSeek,
  onPrev,
  onNext,
  onTimeUpdate,
  onEnded,
  onClose,
  hasPrev = false,
  hasNext = false,
  outputDevices = [],
  selectedOutputDevice = '',
  onSelectOutputDevice,
  brandColor = '#2383e2',
  sticky = false,
  className = ''
}) {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
  const [barCount, setBarCount] = useState(48);
  const [internalTime, setInternalTime] = useState(0);
  const [internalDuration, setInternalDuration] = useState(0);
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  const activeTime = currentTime || internalTime || 0;
  const activeDuration = duration || internalDuration || 0;
  const timeLeft = Math.max(0, activeDuration - activeTime);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync internal audio player playback & volume
  useEffect(() => {
    if (audioRef.current && src) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Dynamic responsive bar count calculation based on container width
  useEffect(() => {
    if (!progressBarRef.current) return;

    const updateBarCount = () => {
      if (progressBarRef.current) {
        const width = progressBarRef.current.clientWidth;
        // Each thin bar is 2px width + 2px gap = 4px per bar
        const computedBars = Math.max(16, Math.floor(width / 4));
        setBarCount(computedBars);
      }
    };

    updateBarCount();
    const observer = new ResizeObserver(() => updateBarCount());
    observer.observe(progressBarRef.current);

    return () => observer.disconnect();
  }, []);

  // Scrub bar click handler
  const handleScrub = (e) => {
    if (!progressBarRef.current || !activeDuration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const newTime = percentage * activeDuration;
    setInternalTime(newTime);
    if (onSeek) {
      onSeek(newTime);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const progressPercent = activeDuration > 0 ? Math.min(100, Math.max(0, (activeTime / activeDuration) * 100)) : 0;

  // Speaker Volume Controlled Height Scale (Muted/0 = 0.25x base, 1.0 = 1.0x 4x max height)
  const activeVolLevel = isMuted ? 0 : volume;
  const volumeHeightMultiplier = activeVolLevel === 0 ? 0.25 : 0.4 + activeVolLevel * 0.6;

  return (
    <div className={`briselle-audio-controller ${sticky ? 'bac-sticky' : ''} ${className}`}>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          onLoadedMetadata={() => {
            if (audioRef.current) setInternalDuration(audioRef.current.duration);
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
      )}

      {/* LINE 1: Title, Branding Badge, Speaker Selector, ALWAYS-VISIBLE Inline Volume Slider & Close Button */}
      <div className="bac-header-row">
        <div className="bac-title-wrap">
          <div className="bac-icon-badge" style={{ backgroundColor: `${brandColor}18`, color: brandColor }}>
            <Music size={13} />
          </div>
          <span className="bac-track-title" title={title}>{title}</span>
          <span className="bac-brand-badge" style={{ color: brandColor, backgroundColor: `${brandColor}12` }}>
            {artist || 'Briselle Ziva AI'}
          </span>
        </div>

        {/* LINE 1 RIGHT CONTROLS: Speaker Selector + Always Visible Inline Volume Slider + Close Button */}
        <div className="bac-header-right-controls">
          {outputDevices.length > 0 && (
            <div className="bac-device-wrap">
              <button
                type="button"
                className="bac-btn bac-btn-speaker"
                onClick={() => setShowSpeakerMenu(!showSpeakerMenu)}
                title="Select playback speaker"
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

          {/* ALWAYS VISIBLE INLINE VOLUME CONTROL IN LINE 1: Volume Icon + Slider */}
          <div className="bac-volume-inline-group" title={`Volume: ${Math.round(activeVolLevel * 100)}%`}>
            <button
              type="button"
              className="bac-btn bac-btn-vol"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
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
            />
          </div>

          {onClose && (
            <button
              type="button"
              className="bac-btn bac-btn-close"
              onClick={onClose}
              title="Close Player"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* LINE 2: Playback Controls & Dynamic Waveform Equalizer Row */}
      <div className="bac-controls-row">
        {/* Main Play / Pause Control */}
        <div className="bac-main-actions">
          {hasPrev && (
            <button
              type="button"
              className="bac-btn bac-btn-prev"
              onClick={onPrev}
              title="Previous Track"
            >
              <SkipBack size={13} />
            </button>
          )}

          <button
            type="button"
            className="bac-btn bac-btn-main"
            style={{ backgroundColor: brandColor }}
            onClick={isPlaying ? onPause : onPlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="bac-play-icon" />}
          </button>

          {hasNext && (
            <button
              type="button"
              className="bac-btn bac-btn-next"
              onClick={onNext}
              title="Next Track"
            >
              <SkipForward size={13} />
            </button>
          )}
        </div>

        {/* Dynamic Thin-Line Skin-Wave Equalizer (4x Height Scale + Speaker Volume Height Control) */}
        <div className="bac-waveform-container" ref={progressBarRef} onClick={handleScrub}>
          <div className="bac-waveform-bars">
            {Array.from({ length: barCount }).map((_, idx) => {
              const barPercent = (idx / barCount) * 100;
              const isActive = barPercent <= progressPercent;
              const isAccentBar = idx % 5 === 0;

              // Wave height pattern scaled by speaker volume multiplier (up to 48px 4x height)
              const baseHeightPx = isAccentBar ? 38 : Math.max(8, (Math.sin(idx * 0.4) * 0.5 + 0.5) * 44 + 6);
              const actualHeightPx = Math.max(4, Math.round(baseHeightPx * volumeHeightMultiplier));

              return (
                <div
                  key={idx}
                  className={`bac-wave-bar ${isAccentBar ? 'bac-wave-accent' : ''} ${isActive ? 'active' : ''} ${isPlaying ? 'animating' : ''}`}
                  style={{
                    height: `${actualHeightPx}px`,
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

        {/* Time Display (Elapsed / Total & Time Left) */}
        <div className="bac-time-display">
          <span className="bac-current-time">{formatTime(activeTime)}</span>
          <span className="bac-time-divider">/</span>
          <span className="bac-total-time">{formatTime(activeDuration)}</span>
          <span className="bac-time-left">(-{formatTime(timeLeft)})</span>
        </div>
      </div>
    </div>
  );
}

export default AudioController;
