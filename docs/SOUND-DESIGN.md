# Sound design

The house uses original synthesized music, ambience and interaction sounds. No downloaded recordings, external sound service, paid assets or additional application are needed. Audio waits for a real player interaction before creating/resuming its device. With the Sound preference enabled, the first click or key press unlocks playback. A saved mute prevents this automatic unlock; the Sound button and explicit Settings preview can enable playback again. Sound is optional: clues, puzzle results, memory moments and the hidden-panel sequence remain available as text and visual controls.

The sound palette should feel close, subdued and material-based: worn wood, stone, paper, fabric, brass and a restrained score. Short feedback confirms an action; it does not announce whether an NPC or an AI-generated reply is truthful. Avoid loud horror stingers, repeated reward fanfares and voices layered over dialogue.

## Runtime responsibilities

- [`audio.js`](../audio.js) owns WebAudio synthesis, music/effects buses, mute, cached volume levels, voice limits and cancellation.
- [`scene.js`](../scene.js) reports actual investigator movement and room/stance changes. It does not own an AudioContext. [`movement-audio.js`](../movement-audio.js) samples floor finishes and advances footstep cadence from distance traveled, including height on stair slopes.
- [`app.js`](../app.js) reports discrete story and interface actions after their relevant state checks succeed.
- [`mansion-layout.js`](../mansion-layout.js) defines rooms, floors and continuous stair routes; [`mansion-environment.js`](../mansion-environment.js) renders their visible materials.

One shared noise buffer provides the short tactile components. Oscillators, gain envelopes and filtering supply tonal and mechanical detail. Cues have bounded duration, a 24-voice limit and a shared compressor. Cue-specific cooldowns suppress repeated bursts. There is no network request or AI call for a sound.

Each effects cue allocates all its nodes before scheduling. The engine then shifts every source, envelope and pitch event together to 30 ms after allocation completes, preserving the timing between impacts and preview steps. Short effects cannot expire while a slow device is still creating their nodes. `maxScheduleLateMs` records the largest observed allocation delay in milliseconds; it excludes the intentional 30 ms lookahead.

## Cue vocabulary and triggers

| Cue | Trigger | Intended character |
|---|---|---|
| `footstep` | Actual traveled distance; options `surface`, `mode`, `stair` | Short impact; wood creak on wooden stairs, firmer stone contact, softened rug contact |
| `stance` | Crouch/stand state changes | Quiet clothing movement; no repeated sound each frame |
| `door` | Crossing a real doorway | Restrained timber/mechanical movement; walking into a wall is silent |
| `bagOpen`, `bagClose` | Bag changes between closed/open | Paper/leather movement and a light clasp |
| `inspect` | Collecting or rereading an object/evidence item; repeating an acknowledged interaction | Brief dry paper/tactile cue |
| `success` | Trust unlock or a new deterministic observation/preparation; completed timeline or deduction | Small, clear tonal confirmation |
| `error` | A submitted puzzle answer or panel code fails | Soft low response; the visible explanation remains authoritative |
| `secretUnlock` | The panel changes from locked to unlocked | Wood/metal shift; no automatic replay when merely returning to the room |
| `memoryEnter`, `memoryExit` | Entering/leaving a memory | Short airy transition, with different direction/colour |
| `memoryStep` | Moving to a different memory moment; option `step` | Small transition, not a clue-answer signal |
| `intro` | A new opening-cutscene shot; option `step` | Brief authored mood accent; changing/skipping shots does not schedule an old shot again |
| `ending` | Choosing an ending; option `id` | Restrained closing motif appropriate to that ending |
| `testTone` | Reference tones at the beginning of the Settings preview | Clear 660/880 Hz pings, easier to hear on small speakers than a bass-only cue |
| `preview` | Explicit Settings sound test | Reference pings followed by wood, stone, crouched rug, bag, memory and success cues; subject to the current effects level |

Options for footsteps are `surface: 'wood' | 'stone' | 'rug'`, `mode: 'walk' | 'run' | 'crouch'`, and `stair: boolean`. Running gives stronger contact; crouching is quieter. These sounds describe movement, not an implemented NPC-hearing or stealth-detection system.

The ending identifiers are `reunion`, `letter` and `distance`. Their audio reflects the established epilogues in the [story bible](STORY-BIBLE.md); it does not add story facts or imply that the dead return.

The final intro shot plays six tape impacts grouped **3–1–2**, with longer pauses between groups. The written sequence remains available when sound is muted.

## Floor finishes

The foyer, kitchen and all basement rooms have stone finishes. Other rooms have wood floors. The grand staircase is wood; the kitchen-to-cellar service staircase is stone. A stair surface takes priority over a floor rug beneath it.

Visible rugs are axis-aligned around each room's centre. Their sizes below come from the current renderer and should remain synchronized if furnishings change.

| Room | Rug width × depth, metres |
|---|---:|
| Foyer | 2.65 × 2.3 |
| Dining room | 6.6 × 5.1 |
| Music room (`library`) | 6.2 × 7.5 |
| Bedroom | 5.5 × 6 |
| Grand hall | 1.65 × 9.6 |
| Upstairs landing | 1.55 × 11.4 |
| Gallery | 4.3 × 14.8 |

The scene sampler uses these visible rug footprints for rug-specific footsteps. Update both the renderer and sampler when a rug moves or changes size. The first contact follows 0.15 m of actual movement; subsequent stride distances are 0.65 m walking, 1.05 m running and 0.45 m crouched, with at most two reported steps in one frame. The audio engine also guards footsteps with an 0.08-second cooldown.

## Mute, levels and lifetime

The Sound control mutes both buses, and its preference survives reloads and other Settings changes. The Music slider controls the score; Effects controls footsteps, ambience, interface and story cues. Saved levels must be cached before the AudioContext is created so that a saved zero does not produce a brief default-volume sound when Sound is enabled.

Settings sliders apply live, and Save settings persists their levels. Closing or replacing the modal restores saved levels if they were not saved. A Settings preview uses the visible Effects level and temporarily stops music for four seconds so the score cannot mask the effects. It then restores the current visible slider values. Closing/replacing Settings, saving, changing a slider, hiding the page or muting clears the restore timer, preventing a delayed callback from applying stale levels. Effects set to zero produces a silent preview.

A preview does not alter evidence, trust, puzzles, NPC time, save progression or story state. Previewing explicitly enables Sound and persists that preference, while leaving unsaved slider levels uncommitted. Sound is shown as playing only when the engine is enabled and its AudioContext is running.

The calibrated mix raises the original source levels and holds a short audible body before each exponential release. Footsteps include higher frequencies for small-speaker playback. User volume levels remain separate from this calibration: zero stays silent. Source peaks are bounded and the master compressor controls overlap; rendered measurements below check the tested mix for clipping.

Turning Sound off cancels queued preview/cue playback and quiets ongoing voices. Backgrounding the page suppresses scheduling and quiets playback. Returning should resume the present ambience without a backlog of footsteps or cutscene sounds. Rapid on/off requests must not let an older asynchronous AudioContext resume restart a stale timer.

Movement sounds stop when controls stop. A held direction against furniture or a wall must not generate footsteps. Cinematics, memories, endings, hidden pages and open modals do not generate investigator footsteps. The NPC Pause control can leave investigator movement enabled; its footsteps should continue while that investigator moves.

## Story integration checks

Emit cues from the action that changes state, rather than from `update()` or `render()`, which run repeatedly. Entering memory can change the score state during update, but its transition sound belongs in `enterMemory`; similarly, `memoryStep` fires only if the moment actually changes.

`inspect()` distinguishes a newly collected clue from rereading one for the evidence toast and progression. Both use the understated inspect sound rather than a collection fanfare. Showing an already acknowledged object, repeating a completed preparation or reopening an existing ending should not retrigger a discovery fanfare.

Puzzle failure cues follow failed submissions and retain their existing text. Success cues follow `solveObservation`, `reconstruct`, `solveCase` and `prepareEnding`, without changing their rules. A successful `unlockSecret` uses its own mechanical unlock cue. The 3–1–2 panel sequence remains readable; audio must not become the sole way to recover its code.

AI replies and fallback dialogue do not play success/failure sounds. A generated reply, fallback reply, timeout or classification result is not proof that an NPC statement is correct. Restoring a completed save sets the ending score mode without replaying the ending cue; restoring an open panel similarly does not replay its unlock. No text-to-speech or voice recording is provided by these effects.

## Verification

Use the Settings sound test to audition actual runtime synthesis; there is no separately approximated WAV preview. Graph/unit checks use deterministic nonzero noise and confirm scheduling, routing and cancellation, but their fake parameters do not render samples. Earlier tests used a constant random value that produced zero noise. Accepted event counts, active voices and a running AudioContext alone do not establish audible output.

`audio.getStatus()` exposes two live analysers over the most recent 1,024 samples: `rms`/`peak` measure the mixed output after the master and compressor; `effectsRms`/`effectsPeak` measure effects after their volume bus and before the master. Music-only playback must show zero effects output. Settings uses the effects meter, samples repeatedly during playback and retains preview maxima, since one instantaneous reading can fall between short sounds. These measurements confirm digital samples, not the browser's output device, system mixer or physical speakers.

The actual `OfflineAudioContext` results in [AUDIO-PCM-QA.json](AUDIO-PCM-QA.json) compare the runtime engine with rc7 at 44.1 kHz over four-second renders. All eight checks passed: preview, wood/stone/rug walking, rug crouching, music, silent effects and overlapping cues. Walking RMS increased by 23.6–24.2 dB; the overlap stress peak was 0.467 full scale, below clipping, and silent effects remained all zero. These are rendered PCM results; physical speaker listening was not verified.

Keep rendering the exact engine with nonzero seeded noise for DSP regressions. Check finite samples, useful RMS, bounded peaks and zero output for mute/zero effects, including overlapping cues. Keep the fake lifecycle tests alongside these renders: an offline context adapter does not establish live browser permission or device routing.

Verify a fresh silent start; saved zero levels on enable; music-only and effects-only mixes; Sound off during a preview; rapid mute toggles; background/foreground transitions; walking versus running/crouching; collision silence; both stair directions; doorway crossings; clue rereading; correct/wrong puzzles; memory transitions; cutscene skip; all three endings; and AI timeout/fallback. Confirm the same actions remain understandable and playable with all sound disabled.
