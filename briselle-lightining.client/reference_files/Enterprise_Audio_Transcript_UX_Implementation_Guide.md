# Enterprise Audio Transcript Upload UX & Processing Workflow

## Objective

Implement a modern, enterprise-grade audio upload and transcription
workflow.

-   Uploaded audio is decoded directly into PCM.
-   The Speech-to-Text engine consumes the PCM stream.
-   Audio playback is optional.
-   Muting speakers must **not** affect transcription.

------------------------------------------------------------------------

## Workflow

``` text
Select File
    ↓
Uploading
    ↓
Upload Complete
    ↓
Preparing Audio
    ↓
Transcribing
    ↓
Transcript Ready
```

------------------------------------------------------------------------

## Stage 1 -- File Selection

Supported formats:

-   MP3
-   WAV
-   M4A
-   AAC
-   FLAC
-   OGG
-   MP4
-   MOV
-   WEBM

Display a file card immediately after selection.

``` text
🎵 Quarterly Review Meeting.mp3
128 MB
Duration: 01:42:18

Status: Waiting to Upload
```

------------------------------------------------------------------------

## Stage 2 -- Upload

Show a real upload progress bar.

``` text
Uploading...

████████████░░░░░░
63%

84 MB / 128 MB
Estimated Remaining: 22 seconds
```

After upload:

``` text
✓ Upload Complete
```

Pause for 300--500 ms before the next stage.

------------------------------------------------------------------------

## Stage 3 -- Preparing Audio

Show:

``` text
Preparing Audio...
Optimizing audio for transcription...
```

Tasks:

-   Validate file
-   Decode audio
-   Extract audio from video if needed
-   Normalize sample rate
-   Generate PCM stream

No percentage is required.

------------------------------------------------------------------------

## Stage 4 -- Transcribing

Never play the audio to transcribe it.

``` text
Audio File
    ↓
Decoder
    ↓
PCM Stream
    ↓
Speech Engine
    ↓
Transcript
```

Display:

``` text
Transcribing...

██████████░░░░░
67%
```

Rotate status messages:

-   Listening to speech...
-   Recognizing speakers...
-   Detecting language...
-   Formatting transcript...
-   Finalizing transcript...

------------------------------------------------------------------------

## Stage 5 -- Optional Playback

Playback is independent.

``` text
▶ Play
🔊 Volume
🔇 Mute
```

Muting or setting volume to zero must **not** stop transcription.

------------------------------------------------------------------------

## Stage 6 -- Transcript Ready

Display:

``` text
✅ Transcript Ready
```

Show:

-   Duration
-   Word Count
-   Language
-   Speakers
-   Processing Time

Actions:

-   Open Transcript
-   Search
-   Copy
-   Export
-   Download
-   Summarize
-   Translate

------------------------------------------------------------------------

## Processing Architecture

``` text
Uploaded File
      ↓
Validation
      ↓
Decode Audio
      ↓
PCM Stream
      ├────────► Speech Engine ─────► Transcript
      └────────► Audio Player ──────► Speaker (Optional)
```

Playback is completely independent of transcription.

------------------------------------------------------------------------

## Technical Requirements

-   Upload progress and transcription progress are separate.
-   Uploaded files never use the microphone.
-   Playback is optional.
-   Support resumable uploads.
-   Continue transcription if the browser loses focus.
-   Cancel only when the user explicitly requests it.

------------------------------------------------------------------------

## Future Sources

Reuse the same pipeline for:

-   Audio Files
-   Video Files
-   Live Microphone
-   System Audio
-   Browser Audio
-   Screen Recording
-   Zoom / Teams / Meet
-   Phone Calls
-   Live Streaming
-   Batch Processing
