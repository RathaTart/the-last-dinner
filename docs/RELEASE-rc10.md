# Release candidate 1.0.0-rc.10 — Recorded wooden footsteps and distinct movement pace

Wooden floors now use five unmodified recordings from [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds), licensed CC0 and served from the game's own assets. The recordings total 29,779 bytes, avoid consecutive repeats and preserve their original impacts. Running uses stronger contact and slightly faster playback; crouching is quieter. The score, rugs, stone and other interaction effects retain their synthesized palette.

Movement uses one shared profile for actual speed, distance-based footstep cadence and auditions:

| Action | Travel speed | Footstep interval | Steady cadence |
|---|---:|---:|---:|
| Walk | 1.8 m/s | 0.400 s | 2.5 steps/s |
| Run | 3.8 m/s | 0.226 s | 4.4 steps/s |
| Crouch | 0.9 m/s | 0.556 s | 1.8 steps/s |

Hold Shift to run. The investigator runs 2.11 times as fast as walking; continuous stairs preserve the same full 3D speeds. Settings adds separate wood walking/running auditions, temporarily silencing music. Switching auditions or leaving Settings cancels their queued contacts without canceling normal gameplay sounds.

Recordings load once after the first audio gesture and decode in the background, with a five-second deadline. Startup keeps working and synthesis provides fallback until ready or after a failed load. Late loading cannot unmute the game or start a sound; disposal aborts and ignores pending work. No new package or cloud infrastructure is required.

## Validation

- **109/109 automated tests pass**, including twenty-seven audio tests for sample loading, failure/timeout fallback, mute/disposal, cue cancellation, variants and shared cadence.

- Real keyboard-input, navigation and movement-audio pipeline: in six seconds walking travels 10.8 m and emits 15 contacts, running travels 22.8 m and emits 27. Tested at 15/30/60/144 FPS. Both staircases retain each mode's speed in ascent/descent; floor reachability and collision checks pass.
- **13/13 Chrome PCM checks pass** using the exact runtime engine and decoded recordings. The auditions schedule four walking contacts 0.400 s apart and eight running contacts 0.226 s apart. Running contact peak is 0.0829 versus 0.0693 for walking on the same variant. Stress mix peak is 0.467; zero effects produces zero samples. `AUDIO-PCM-QA-rc10.json` records the results. These measurements do not claim physical speaker listening.
- All five distributed recordings match their official source archive byte for byte; license text and SHA-256 manifest are included.

## Rollback

Restore `rc9-2026-10-01T12-23-02-207Z` and Lambda version **18** using `OPERATIONS.md`. Saves retain their schema and progression.
