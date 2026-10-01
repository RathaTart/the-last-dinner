# Release candidate 1.0.0-rc.4 — The slaughter beneath the bell

October 1, 2026 · https://d3imrhbpvqr1t2.cloudfront.net

## Scope and behavior

The former family misunderstanding becomes a concealed mass-murder case. Ten adult guests and Mira died five years earlier; Nara survived. Memories remain partial testimony, with the final original file confirming intent and fate. The player receives a key, twelve names and an anonymous tape before the house changes owners. Updated bilingual content, four-shot prologue, deductions and three endings follow this canon.

The house now has ten rooms across ground, second floor and basement. E at central stair markers changes floor; mouse orbit and rc.3's duration-based continuous keyboard/touch movement remain. Added scenes use original procedural beds, medical files, portraits, covered slabs, rust hooks, dried blood, boiler pipes and an archive. Only the current floor renders and only the occupied room is illuminated. NPCs work at three stations in their own room.

Three new residents join Arun, Lin and Lamai: Dr. Saran, Somchai and Nara. All six have an object gate, three memory moments and a second-moment observation puzzle. Fourteen evidence pieces feed eight timeline events. The hidden chamber requires Somchai's outside-bar testimony, Nara's escape testimony and code 312. Before unlocking, collision prevents entry; afterward the player must physically walk in and approach the file. Wrong answers and codes are recoverable.

Three endings depend on admission, original records and survivor protection. The dead do not return alive. The final scene is a six-person tableau; later investigation and buyer arrival are described in epilogue text rather than separate animated films.

## Save compatibility

Schema 3 uses case ID `hollow-bell` and storage key `last-dinner-hollow-bell-v3`. The rc.3 key `last-dinner-save-v1` is untouched. Settings can export that previous save. Previous-case files are rejected for import into the incompatible murder case; they are never reinterpreted as new evidence. Both saves can coexist. Rollback to rc.3 resumes the original key.

## Validation

- Build succeeds; **41 automated tests pass**; production dependency audit reports **0 vulnerabilities**.
- Floor flood-fill checks show stairs and every physical clue reachable. The locked chamber is unreachable before unlocking; spawn positions, floor membership, six memory gates, malformed save validation, timeline and all ending gates are covered.
- Eleven rc.3 movement regressions continue to pass, including 15/30/60/144 simulated FPS, timestamps, blur/editable suppression, diagonal speed and animation phase. These are controller checks, not a GPU benchmark.
- Local browser QA used real UI actions and supported checkpoint save imports. Physical clues were supplied by checkpoints; all six resident interactions, observation puzzles and memory recording were then exercised. Lin's memory crossed floor scenes and returned correctly. Actual touch holds traversed the ground corridor, E descended, stairs climbed and returned, a wrong code was retried, the chamber was walked into, and the original file was approached and recorded. Reconstruction rejected a wrong time and accepted the corrected eight-event sequence. All three ending flows were exercised in the UI; the full-protection ending survived reload. English epilogue, 390×844 touch layout, 1248×704 desktop and camera rotation were checked; console warnings/errors were empty.
- Bedrock evaluation **36/36 accepted AI responses**, all six residents × Thai/English × initial/memory/final evidence. No provider errors or filter failures. Usage: 7,533 input / 1,088 output tokens. `AI-EVAL-rc4.json` is the new-case report; earlier 90-case reports belong to the original case. Thai dialogue uses reviewed themes, English filtering is conservative rather than a semantic proof.

Published snapshot **rc4-2026-10-01T09-08-43-673Z**, Lambda version **11**, CloudFront invalidation **I21LJJXN12JK6H0RJ1THVT2JU3** completed. All **28 public HTTP checks passed**; the downloaded browser bundle matches the local build, API reports rc.4, dialogue for all new NPCs responds, live Thai AI works and both origins remain private.

Public browser QA confirmed the new prologue, Settings rc.4 and the previous-story export button. A fresh new case started at 0/14; actual movement and E traversed basement, returned to ground and climbed to the second floor without checkpoint imports. Other-room markers stayed hidden, desktop had no horizontal overflow and console warnings/errors were empty. `screenshots/horror-expansion.png` captures the live basement.

Public deployment verification is recorded in `PUBLIC-SMOKE.json` and `PUBLIC-HORROR-QA.json`. The previous smoke result is preserved as `PUBLIC-SMOKE-rc3.json`.

## Remaining production work

Independent player testing, physical-phone/GPU coverage, distinct character models, voice work, contextual knock audio and animated investigation/buyer endings remain. This expansion is playable and still a release candidate. The storyboard marks those presentation limits explicitly.

## Rollback

Previous static snapshot: `rc3-2026-10-01T07-58-04-720Z`, Lambda version 10. Use OPERATIONS.md's snapshot rollback if the browser fails to load, floor transitions fail, the hidden room becomes unreachable, or progression breaks. This release reuses existing infrastructure and quotas with no database/schema migration on the server. Original-case save storage remains available on rollback.
