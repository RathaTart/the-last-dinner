# Release candidate 1.0.0-rc.2 — investigator controls

October 1, 2026, Bangkok. Public game: https://d3imrhbpvqr1t2.cloudfront.net

## Requested changes

- Direct investigator movement using WASD or arrow keys, relative to the current camera angle.
- Nearby interaction with E or the touch interaction button. Clicking distant objects or residents cannot grant clues or open conversations. The room map no longer moves the player.
- Collision with exterior bounds, interior partitions and major furniture. The central passage connects all four rooms.
- The current room is lit; others are dark. Their NPCs, room labels and interaction markers are concealed. Dark architecture can still appear as silhouettes.
- Mouse/touch drag rotates the camera, scroll zooms, and R resets. Exterior walls fade when they obstruct a view from behind.
- A four-shot opening explains the anonymous client, house sale, old disappearance, memory-reading ability and investigator's task. It uses the live 3D scene, animated arrival and bilingual captions, with automatic progression, Next, Skip and replay in Settings. It has no voice acting.
- Pausing NPC time still permits walking. Text fields and open dialogs suppress movement; conversation/evidence views pause investigator input until Back. Memories remain staged observations.

## Validation

Build succeeds and **23 automated tests pass**. New checks cover collision, hallway traversal, diagonal speed, long-frame bounds, camera-relative controls, proximity across room boundaries, reachability of all four rooms and all three physical evidence objects, and intro completion/save migration.

Manual browser checks on the local build used physical keyboard actions to walk into all four rooms, E to inspect and talk, and normal interface actions to collect all six clues through all three memory puzzles. The complete timeline, conclusion, three preparations and reunion ending were reached using the new controls. Returning from memories restored investigator position and resident poses. Mouse drag changed the camera angle; a rear view showed the exterior wall fading. Console warnings/errors were empty.

A 390 × 844 browser viewport showed the directional pad and interaction button without horizontal clipping. Pressing the left touch control moved the character. The opening captions/letter fit that viewport. Replay/Next/Skip preserved six collected clues and restored the exact investigator position. The initial opening also finished automatically. The viewport override was reset afterward. This is browser emulation, not physical phone testing.

All **19 public HTTP checks passed** on release `rc2-2026-10-01T06-02-14-108Z`, Lambda version 8, including release-version matching, new control/cutscene markup, live Thai AI and private-origin denials. Results are in `PUBLIC-SMOKE.json`; the preceding report is preserved as `PUBLIC-SMOKE-rc1.json`. Public browser checks also verified the opening, Skip, physical walking, E collecting the clock tag and mouse camera rotation. A 1248 × 704 public desktop viewport had no horizontal overflow; the normal narrower app panel was also exercised. Test progress was reset for handoff, and temporary viewport overrides were cleared.

The dialogue implementation/model and its earlier 90-case evaluation are unchanged; that full live model suite was not repeated for this controls update.

## Delivery and limits

The existing AWS URL and private-origin architecture are reused. No new paid infrastructure or asset service is required. Kenney CC0 assets, original geometry/audio and licensed fonts are unchanged. Saved clue/ending data remain version 2, with an optional `introSeen` field; existing unfinished saves receive the opening once without losing progress. Exact walking coordinates and camera angle are not persisted across reload; the saved room determines a safe spawn.

Source tag: `v1.0.0-rc.2`. Archive: `.release/the-last-dinner-1.0.0-rc.2-source.zip`. Prior snapshots and the rc.1 tag remain available. Release-candidate limits in `RELEASE.md` still apply: independent playtesting, measured frame-rate/device coverage and editorial feedback remain outstanding. Cinematics are staged in-engine with captions, not a voiced film.
