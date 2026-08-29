/* ============================================================
   NotionNest — meeting-notes/transcript/MeetingAudioPlayer.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: meeting-notes/transcript/AudioPlayerBar.jsx@2026-08-16
                              (the parallel player this replaces — deleted)

   Task: BRIS-NN-MNB-T70 / T74
   Purpose: The ONLY playback surface in the meeting block. A thin adapter
            between the play queue (owned by MeetingNotesBlockBase) and
            the shared Briselle Audio Controller.

   There is no player logic here on purpose. AudioPlayerBar existed
   because a second player was built alongside the platform one; that
   duplication has been merged into AudioController's `simple` variant
   and this file only wires it up.

   T74 — the floating dock is a REMOTE, not a second player.
   Rendering a second <AudioController> for the docked view would mount a
   second <audio> element with the same src: two overlapping playbacks.
   Moving the single controller into the dock instead would unmount and
   remount it, resetting playback to 00:00 every time the user scrolls
   past it. So the controller stays mounted inline and the dock is three
   buttons that drive the SAME queue handlers — no audio element, no
   second copy of any playback logic, styled with the controller's own
   button classes.

   Styling: AudioController.css + styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { useRef } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { useIsOffscreen } from '../hooks/useIsOffscreen';
import AudioController from '../../../../utility-modules/audio-controller/AudioController.jsx';

export function MeetingAudioPlayer() {
  const {
    currentQueueTrack,
    currentQueueSrc,
    playQueueTracks,
    playQueueIndex,
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
    playerError,
    playerVariant,
    setPlayerVariant,
    selectedOutputDevice,
    recording,
    title,
  } = useMeetingNotes();

  const anchorRef = useRef(null);

  /* Nothing queued, or a live recording owns the strip. */
  const active = !!currentQueueTrack && !recording;

  /* T74: only observe while a player is actually mounted. */
  const isOffscreen = useIsOffscreen(anchorRef, active, { minVisible: 1 });

  if (!active) return null;

  const trackCount = playQueueTracks.length;
  const trackTitle = currentQueueTrack.name || 'Recording';
  /* T78: the queue position moved out of the title and onto line 2's
     left edge, where the user asked for it. */
  const queueLabel = trackCount > 1 ? `${playQueueIndex + 1}/${trackCount}` : '';

  return (
    <>
      <div className="nnr-audio-player-row" ref={anchorRef}>
        <AudioController
          src={currentQueueSrc}
          title={trackTitle}
          artist={title || 'Briselle Ziva AI'}
          duration={Number(currentQueueTrack.duration) || 0}
          isPlaying={queuePlaying}
          onPlay={queuePlay}
          onPause={queuePause}
          onStop={queueStop}
          onPrev={queuePrev}
          onNext={queueNext}
          onEnded={queueEnded}
          onError={queueError}
          onClose={queueStop}
          hasPrev={queueHasPrev}
          hasNext={queueHasNext}
          queueLabel={queueLabel}
          selectedOutputDevice={selectedOutputDevice}
          variant={playerVariant}
          onVariantChange={setPlayerVariant}
          /* BRIS-NN-MNB-T78: the message used to be rendered here AND by
             the controller, so every failure appeared twice. The
             controller owns the display; this passes the queue-level
             failure (e.g. no signed URL) into that one place. */
          error={playerError}
        />
      </div>

      {/* T74: reuses useIsOffscreen from T73 — no second observer. */}
      {isOffscreen && (
        <div className="nnr-audio-dock" role="group" aria-label="Audio playback">
          <button
            type="button"
            className="bac-btn bac-btn-simple-main"
            onClick={queuePlaying ? queuePause : queuePlay}
            title={queuePlaying ? 'Pause' : 'Play'}
            aria-label={queuePlaying ? 'Pause' : 'Play'}
          >
            {queuePlaying
              ? <Pause size={14} fill="currentColor" />
              : <Play size={14} fill="currentColor" />}
          </button>

          <button
            type="button"
            className="bac-btn bac-btn-stop"
            onClick={queueStop}
            title="Stop"
            aria-label="Stop"
          >
            <Square size={11} fill="currentColor" />
          </button>

          <span className="nnr-audio-dock-name" title={trackTitle}>{trackTitle}</span>
        </div>
      )}
    </>
  );
}

export default MeetingAudioPlayer;
