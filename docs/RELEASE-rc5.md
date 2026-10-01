# Release candidate 1.0.0-rc.5 — The mansion redesign

October 1, 2026 · https://d3imrhbpvqr1t2.cloudfront.net

The quadrant layout made every floor look like a four-cell box. This release replaces it with an approximately 24 × 19 m estate: entrance foyer, central stair hall, public front wings, rear kitchen/workshop, upstairs landing and cellar passage. Fourteen rooms and circulation areas share one blueprint for walls, actual door openings, furniture, clue anchors, actor stations and navigation. The dining serving door joins the kitchen; the main stairs lead hall→landing, service stairs join kitchen→cellar, and the archive can only be entered through the boiler panel.

Original modular scenery adds bevelled furniture, wall panelling and cornices, deep framed windows/curtains, door surrounds, rugs, table settings, piano keys/books, bedroom and medical props, covered mortuary slabs, boiler pipes and an archive. Nine self-hosted 1K CC0 Poly Haven wood/plaster/stone maps total 3,891,250 bytes. Static detail is merged by material. Camera tracking centres exploration in the larger rooms; camera-side walls and their attached details cut away together. Room darkness uses actual rectangular bounds, including transformed/instanced geometry. The upper stairwell and kitchen service aperture are real holes with navigation protection; visible posts, rails and jamb bases have colliders. Basement floor is stone.

A three-floor plan shows doors, stairs and the current position. The concealed room is omitted until discovered. The game retains duration-based WASD/touch movement, E proximity interactions, mouse orbit, story gates, six NPCs, six memories, fourteen clues and three endings. Saves keep schema 3 and case ID `hollow-bell`; existing cases retain their room/progress and new cases start in the foyer. The original-story storage key is untouched.

## Verification

- Build and 46 automated tests pass. Production dependency audit: 0 vulnerabilities. Architectural flood-fill covers all fourteen rooms, eight physical clues, six actor routes, both stair directions and locked/unlocked archive reachability; movement regressions remain green.
- Local browser checks used real input and supported generated-save imports. Fixtures supplied some earlier evidence/trust; actual movement covered foyer/hall/dining, stairs in both directions, and boiler→archive. Wrong 231 was rejected, 312 opened the panel, and the final original file was approached and recorded for 14/14. Lin's memory crossed upstairs and ground scenes and returned correctly.
- Public release passes 32 HTTP checks. Downloaded browser bundle matches the local build; API reports rc.5, live Thai AI works and origins remain private. Public UI checks cover four intro shots, all floor-plan tabs, keyboard/touch doorway traversal, graphics high/low/high, fresh foyer start, preserved previous-story export, and no console warnings/errors.
- Responsive checks include 1248 × 704, 390 × 844 and 304 × 923. A new map button initially overflowed the narrow panel; the compact menu fixes it. Document width now equals scroll width at desktop and narrow breakpoints.
- CloudWatch returned 3 error datapoints over the queried 20-minute window, with 0 recorded Lambda errors. This is a short deployment observation, not long-term availability evidence.

Published snapshot **rc5-2026-10-01T10-10-07-515Z**, Lambda version **13**, invalidation **IDZ9GUTY57ZTD7KU12YKL6YC1Z** completed. Details: `PUBLIC-SMOKE.json` and `PUBLIC-MANSION-QA.json`. Screenshot: `screenshots/mansion-upgrade.png`.

## Production work and rollback

The current cast remains stylized prototype models. Distinct models/working animations, physical-device/GPU coverage, independent player tests, contextual sound and cinematic ending work remain. No Blender installation or new infrastructure was needed for this release; the production design records where Blender-authored GLB assets fit next.

Rollback uses the rc.4 static snapshot `rc4-2026-10-01T09-08-43-673Z` and Lambda version 11 via `OPERATIONS.md`. Roll back if WebGL initialization, floor changes, archive access or evidence progression fails. No database migration or infrastructure expansion occurred.
