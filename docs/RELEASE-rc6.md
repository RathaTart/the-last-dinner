# Release candidate 1.0.0-rc.6 — Movement and the investigator’s bag

October 1, 2026 · https://d3imrhbpvqr1t2.cloudfront.net

The investigator can now run with held Shift and crouch/stand with C. Walking is 2.3 m/s, running 4.3 m/s and crouching 1.15 m/s. Keyboard and touch sources retain event-duration integration; crouching takes priority over sprinting. The existing CC0 sprint clip blends with walking/idle without restarting strides. An articulated pose lowers the torso and bends the rigid limbs for crouching, respecting the model’s torso/child hierarchy.

Both staircases are continuous supported surfaces. The hall staircase rises through its west flight, rear turn and east flight to the upper landing. Kitchen service stairs descend through a west flight, turn under the hall and exit in the cellar. Shared architectural data creates both geometry and physics, including floor apertures and guardrails. Movement follows continuous height and a full 3D distance budget; the camera follows height and changes the visible floor around the turn. Stair buttons and E transitions have been removed from normal exploration. The hidden panel remains an E interaction.

Exploration fills the window. Title, time, floor, case notes, evidence, room list, map, hints, audio and settings live in the investigator’s bag. I/B/Tab opens it, M opens its map, and Escape closes the top window. Only bag access and the nearest contextual interaction remain in normal desktop play; mobile adds held direction/run buttons and a crouch toggle. Opening a window releases movement and temporarily pauses residents; closing restores the player’s pause preference. Crouch persists. Memory scenes remain visible outside the bag; observation puzzles and evidence can be read in its notebook.

Case ID, save schema, six NPCs, fourteen clues, six memories and three endings retain their existing gates. No new assets, infrastructure, permissions or database migration are needed.

## Validation

- 55 automated tests pass, including both stair directions, turn clearance, shaft/wrong-height protection, full 3D speed, duration-based input, independent Shift/touch sources, sprint blending and crouch hierarchy restoration. Build passes; production dependency audit reports zero vulnerabilities.
- Local browser checks use actual keyboard/pointer input and supported save-file imports. The investigator walked both staircases up and down without E; intermediate heights and endpoint floors were read from the visible canvas diagnostics. Fixtures supplied room positions/progress for targeted checks.
- Bag, evidence, map/settings, fresh restart and Lin’s observation puzzle were exercised. Lin’s memory opened upstairs, recorded its clue through the bag and returned to the original investigator position. A supplied completed-case fixture verified ending confirmation and closing the epilogue to reveal the house. Existing ending rules also pass automated tests.
- Responsive checks cover 1248 × 704, 390 × 844 and 304 × 923; the narrow document and bag widths fit the viewport. Console errors/warnings were empty during local interaction checks. These are browser viewport checks, not certification on physical phones.

The public release passes **35/35 HTTP checks**, including matching browser bundle, API rc.6, live Thai AI and protected origins. Public keyboard checks cover Tab/B bag access, native focus navigation, Escape and M map tabs. Actual touch movement reached the grand staircase at y = 0.753 m without E. Crouch toggled correctly, graphics high/low/high produced no console warning/error, and fresh restart left the investigator at foyer [0, 0, 8.1] with zero evidence and idle input. The viewport override was reset.

Published snapshot **rc6-2026-10-01T10-55-07-301Z**, Lambda version **14**, invalidation **IAVYFODJK12GBNEGD4KP0NM4IR** completed. The queried 15-minute CloudWatch window returned one available error datapoint with sum zero; this is a short observation, not a sustained fifteen-minute watch. Details: `PUBLIC-ACTIONS-QA.json`, `PUBLIC-SMOKE.json`. Live screenshots: `screenshots/actions-gameplay.png` and `screenshots/investigator-bag.png`.

## Rollback

Restore static snapshot `rc5-2026-10-01T10-10-07-515Z` and Lambda version 13 using `OPERATIONS.md`. Roll back if stair entry/exit, bag access, memory evidence or WebGL initialization fails. The cast remains stylized; dedicated art, physical-device profiling and independent playtesting remain production work.
