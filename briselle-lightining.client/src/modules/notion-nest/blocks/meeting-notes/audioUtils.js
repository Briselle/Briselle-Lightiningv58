/* ============================================================
   NotionNest — meeting-notes/audioUtils.js
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L151-L204

   Task: BRIS-NN-MNB-R06
   Purpose: PCM -> WAV encoding for recorded audio. Pure, no React.
   ============================================================ */
export function bufferToWavBlob(audioBuffer, offsetSec = 0, durationSec = null) {
  try {
    const numOfChan = audioBuffer.numberOfChannels || 1;
    const sampleRate = audioBuffer.sampleRate || 44100;
    const startSample = Math.floor(offsetSec * sampleRate);
    const maxSamples = audioBuffer.length - startSample;
    const totalSamples = durationSec ? Math.min(Math.floor(durationSec * sampleRate), maxSamples) : maxSamples;

    if (totalSamples <= 0) return null;

    const buffer = new ArrayBuffer(44 + totalSamples * 2 * numOfChan);
    const view = new DataView(buffer);

    const writeString = (v, offset, str) => {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2 * numOfChan, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2 * numOfChan, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, totalSamples * 2 * numOfChan, true);

    let offset = 44;
    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    for (let i = 0; i < totalSamples; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][startSample + i] || 0));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  } catch (e) {
    console.warn('WAV encoding notice:', e);
    return null;
  }
}

