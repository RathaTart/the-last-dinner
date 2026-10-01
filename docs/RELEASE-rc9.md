# Release candidate 1.0.0-rc.9 — Clearer short effects

The user could hear the rc.8 score but reported no footsteps or other effects. A real Chrome preview with music at zero and effects at one produced a post-limiter peak of 0.278 and RMS of 0.174, confirming a live FX signal. The input-to-movement-to-footstep pipeline also emitted eleven footsteps and one doorway cue over 6.9 metres at 30, 60 and 144 FPS. Physical audibility remains a listening check rather than an event-counter assumption.

Short cues now allocate all nodes first, then schedule every source, envelope and oscillator pitch event together 30 ms ahead. Slow node allocation cannot consume a short footstep before it starts. The tape's 3–1–2 rhythm and preview spacing are preserved.

Settings Test sounds pauses music for four seconds and restores the visible levels afterward. Closing/replacing Settings, hiding the page, muting or editing a slider clears that restore timer. The meter measures the effects bus independently of the score; music alone leaves it at zero. Live diagnostics include isolated FX RMS/peak, preview maxima, footstep counts and measured allocation delay.

This release includes the rc.8 calibration and sound readiness controller. It changes no story, save schema, infrastructure, dependencies or paid assets.

## Validation

- **97/97 tests pass**, including eighteen audio tests and twelve controller tests. Slow-allocation regression advances the audio clock 50 ms per node creation and checks that tone/noise/envelope/pitch events stay aligned in the future.
- **8/8 real Chrome PCM checks pass**, rendering the exact runtime engine through OfflineAudioContext. Walking RMS is 23.6–24.2 dB above rc.7, crouched rug contact 22.4 dB above rc.7, and preview RMS 17.7 dB above rc.7. Overlap stress peaks at 0.467 full scale. Zero effects produces zero samples. See `AUDIO-PCM-QA.json`.
- Local Chrome's default preview produces a nonzero isolated FX signal with the music bus at zero, then restores music to 45%. Music-only playback leaves FX RMS/peak at zero.

## Rollback

Restore `rc8-2026-10-01T12-04-11-788Z` with Lambda version **17** using `OPERATIONS.md`. The earlier rc.7 snapshot is `rc7-2026-10-01T11-28-48-952Z`, Lambda **16**. Roll back for clipping, mute failure or bag/settings regression.
