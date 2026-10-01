# Release candidate 1.0.0-rc.7 — House sound effects

October 1, 2026 · https://d3imrhbpvqr1t2.cloudfront.net

The investigator now makes footsteps based on actual 3D travel, including stair height. Wood, stone and exact visible rug footprints sound different; running is stronger and crouching quieter. A held key against a wall, idle input, a modal, a cinematic, memory exploration or a hidden page cannot generate investigator footsteps. Real doorway crossings and stance changes have restrained cues.

The bag/clasp, paper inspection, trust and puzzle confirmations, wrong answers, hidden panel, memory entry/exit/moments, intro shots and ending choices have distinct original synthesized sounds. The tape uses the story's 3–1–2 knock sequence. Reopening a completed ending or rereading acknowledged evidence does not replay a discovery fanfare. AI dialogue does not produce correctness sounds.

Audio unlocks on the first genuine player gesture unless a saved mute is present. The bag Sound toggle remembers mute. Settings has separate Music and Effects levels, live slider changes and a roughly three-second Test sounds preview. Saving commits levels; closing an unsaved modal restores them. Zero effects produces a silent preview. All story and puzzle information remains accessible visually.

One shared noise buffer, bounded envelopes, separate buses, compressor/headroom and a maximum of 24 sources keep synthesis compact. Mute/background transitions stop active and scheduled sources; stale asynchronous resume/suspend requests cannot override newer preferences. Foreground audio failure leaves the next trusted gesture able to retry. No external sound assets, dependencies, infrastructure, database migration or AI calls for effects are added.

## Validation

- **81/81 automated tests pass**. Fourteen cover audio graph routing, initial saved-zero levels, cue scheduling, the 3–1–2 groups, cancellation, voice limits, cleanup, failure recovery and asynchronous races. Twelve cover distance cadence across frame rates, blocked/idle movement, 3D stairs, mode changes, exact rug boundaries and genuine doorway crossings. Existing story, movement, stair, backend and save tests remain passing.
- Browser build passes; production dependency audit reports zero vulnerabilities.
- Local browser checks used actual keyboard/pointer input and the supported save-file import. DOM diagnostics verified rug walking and crouching, first-gesture audio activation, silent zero-level preview, unsaved-level restoration, persisted mute through Settings/save/reload, correct/wrong memory observation, paper inspection, memory exit and a fresh first-shot intro cue. Settings fits a 390-pixel viewport. Console warnings/errors were empty.

These checks verify runtime scheduling and controls; they do not substitute for listening and mix evaluation on speakers, headphones and physical mobile devices. Use Test sounds to audition the actual synthesis.

The public release passes **37/37 HTTP checks** and **7/7 targeted browser checks**. Public checks confirm the rc.7 bundle/API, live Thai AI, protected origins, audio preview, silent zero effects, persisted mute, actual rug walk/crouch cues and a fitting 319-pixel Settings modal without captured console warnings/errors. Screenshot: `screenshots/sound-settings.png`; diagnostics: `PUBLIC-SOUND-QA.json`, `PUBLIC-SMOKE.json`.

Published snapshot **rc7-2026-10-01T11-28-48-952Z**, Lambda version **16** is Active with Successful update status, and invalidation **ICBMWFFRT6DM0JA2WYBUBZMFNM** completed. The queried fifteen-minute CloudWatch window returned three available error datapoints, each with sum zero. This is a short post-deploy observation, not a sustained fifteen-minute watch.

## Rollback

Restore static snapshot `rc6-2026-10-01T10-55-07-301Z` and Lambda version **14** using `OPERATIONS.md`. Roll back if WebGL startup, bag access, settings, memory/puzzle interaction or audio mute fails. Save schema and existing case progress remain compatible.
