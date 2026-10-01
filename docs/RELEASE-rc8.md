# Release candidate 1.0.0-rc.8 — Audio audibility and resume recovery

The rc.7 audio bus was running at the user's saved 45% music / 65% effects levels, with accepted preview events and no console errors, yet the user could not hear the game. The mix was extremely quiet: real Chrome rendering measured a default rug walking peak of only 0.00369 full scale and wood walking peak of 0.00789. Playback/event counters had confirmed scheduling without establishing an adequate output signal.

This release raises and calibrates the mix, gives envelopes an audible body, moves footsteps higher in frequency, and starts Test sounds with distinct 660/880 Hz reference pings. A meter in Settings samples the actual signal after the master and compressor. It detects digital output; it cannot detect a muted browser tab, the operating system's mixer or the selected physical output device.

`sound-controls.js` separates sound intent from a genuinely running context. A resume that resolves while still suspended cannot report readiness. Later trusted gestures can retry, including while a previous resume is pending. Visibility recovery recomputes readiness, and old asynchronous completions/errors cannot override the latest request. The Test button explains suspended audio or zero Effects rather than treating either as successful playback. Mute, slider levels and case progress retain their existing persistence.

## Validation

- **95/95 automated tests pass**, including sixteen audio tests and twelve new control-state tests for suspended/pending resumes, newer enable/mute requests, stale errors, visibility and saved mute.
- **8/8 actual PCM checks pass in Chrome** using the exact engine through OfflineAudioContext. Default preview RMS increased **17.4 dB**, walking footsteps **19.6–20.4 dB**, rug crouching **18.6 dB**, and music **13.5 dB**. Zero-level synthesis produced all-zero samples. Overlapping cues peaked at **0.392 full scale**, below clipping. Details: `AUDIO-PCM-QA.json`; developer-only renderer: `tools/audio-lab.mjs`.
- Local Chrome game controls verified a nonzero live meter/preview, zero-level output, unsaved slider rollback and mute surviving save/reload. No physical listening claim follows from these signal measurements.

## Rollback

Restore `rc7-2026-10-01T11-28-48-952Z` and Lambda version **16** using `OPERATIONS.md`. No new dependencies, recordings, infrastructure or save migration are needed. Roll back for audio clipping, mute failure, WebGL or bag/settings regression.
