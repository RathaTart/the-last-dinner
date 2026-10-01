# Release candidate 1.0.0-rc.3 — keyboard movement repair

October 1, 2026, Bangkok. Public game: https://d3imrhbpvqr1t2.cloudfront.net

## Diagnosis and changes

The player reported apparent leftward walking and intermittent key response. rc.2 moved the position immediately on the first keydown, then again in the render loop. The immediate step never changed facing or animation. Short taps could therefore move a character still facing the preceding direction. Animation fades also restarted a stride on frequent walk/idle transitions. The shared keyboard/touch key set and unconditional clearing when NPC time paused could interrupt held input. Conversation/evidence views blocked walking until Back, without a keyboard route back to exploration.

The replacement controller records physical key transitions and integrates their duration in one movement path. OS repeats never add a step; aliases, simultaneous directions and touch sources stay independent. Keyup, focus loss, hidden documents, editable fields and blocked views release input. A tap between frames still moves for its actual duration. Keyboard and pointer durations use the event timestamp, so delayed down/up handlers do not erase a tap; a regression first reproduced this failure, then passed after the timestamp fix. Input integration and player animation use elapsed time up to a 100 ms stall cap, rather than the NPC simulation's 40 ms cap.

The investigator turns toward the latest actual movement and finishes that turn after a tap. Idle/walk loops stay active with changing weights, so reversing directions does not reset stride time. Collision and camera-relative direction remain enforced. NPC time pause no longer clears investigator input. Movement keys, touch controls and Escape can leave present-time conversation/evidence panels; chat typing and modal dialogs still suppress walking. A visible bilingual investigator marker distinguishes the player from residents.

The original character asset's walk translation only bobs vertically; its clips do not contain lateral root motion. Assets, AI dialogue, progression rules, infrastructure and save schema are unchanged.

## Validation

Build succeeds and **34 automated tests pass**. Eleven new regressions exercise continuous held keyboard state at 15/30/60/144 simulated FPS, eight movement keys with camera rotation, release/no idle drift, taps within one frame, delayed event dispatch, OS repeat, opposite directions, independent touch/keyboard sources, blur/block/editable suppression, stalled-frame caps, animation phase/idle recovery and shortest-angle turning. These frame-rate checks validate controller timing, not measured GPU performance.

Local browser checks used actual WASD/arrow key events and verified coordinate direction, idle stop and facing. Mouse drag changed camera-relative movement. At 390 × 844, dragging within the forward control held pointer input and moved the player about 0.90 world units, then released to idle. E opened a nearby conversation; typing `wasd` in its input left position unchanged, and a movement key focused on the scene returned to exploration and moved. The investigator marker was visible and console warnings/errors were empty. The viewport override was reset. Continuous keyboard hold is covered by the event/controller regression harness; the browser automation provides taps and pointer holds. Physical phone and broad GPU testing remain outstanding.

All **21 public HTTP checks passed** on `rc3-2026-10-01T07-58-04-720Z`, Lambda version 10. The public browser bundle matches the local build byte for byte, API status reports rc.3, live Thai AI works and the origins remain private. CloudFront invalidation completed. `PUBLIC-SMOKE.json` contains the report; the rc.2 report is retained in `PUBLIC-SMOKE-rc2.json`.

Public browser checks measured positive/negative coordinate changes for all four WASD directions, with walking false after release. A settings dialog suppressed W; Escape closed it. Keyboard walking worked while NPC time paused. Mouse drag changed yaw from 0.635 to 0.285; R restored the default. A 1248 × 704 viewport had no horizontal overflow and console warnings/errors were empty. Reload preserved the current save's 0/6 clue count. Viewport override was reset and the original public tab remains open. `PUBLIC-INPUT-QA.json` records these checks; `screenshots/movement-fixed.png` is the public desktop screenshot.

The earlier complete-case and 90-case dialogue checks remain documented in rc.1/rc.2; those unchanged suites are not rerun against the model for this repair. Source tag: `v1.0.0-rc.3`. Source archive: `.release/the-last-dinner-1.0.0-rc.3-source.zip`, excluding credentials, installed dependencies and deployment secrets.

## Rollback

The previous release is `rc2-2026-10-01T06-02-14-108Z`, Lambda version 8. Roll back if the new public bundle fails to load, keyboard direction/release fails, or existing clue progression breaks. Use the existing snapshot rollback procedure in OPERATIONS.md. Saved evidence remains schema 2 and is compatible with both releases.
