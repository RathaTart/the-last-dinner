# The Last Dinner — บ้านที่จำได้

A bilingual horror mystery in a theatrical cutaway mansion. Investigate a concealed mass murder across **three floors, fourteen rooms and six residents**. Compare fourteen clues with six partial memories, open a hidden chamber, reconstruct eight events, and choose whether truth leaves the house with its survivor protected.

**Play:** https://d3imrhbpvqr1t2.cloudfront.net

Version **1.0.0-rc.6** adds running, crouching and continuous stair traversal to the approximately **24 × 19 metre estate**. Walk onto either staircase, turn on its landing, and continue to the next floor; the investigator's height follows the steps. Exploration fills the game window, with time, evidence and case tools inside an investigator's bag. The mansion has a foyer, central hall, upstairs landing and cellar corridor. Furniture placement, visible walls, clue anchors, stair surfaces and collision come from one layout file. Detailed procedural furnishings and local CC0 material maps support the stylized cast. Read the [mansion design](docs/MANSION-DESIGN.md), [storyboard](docs/STORYBOARD.md), and [canon with spoilers](docs/STORY-BIBLE.md). The original case is archived in [STORY-BIBLE-rc3.md](docs/STORY-BIBLE-rc3.md).

## Run and verify

Node.js 22.9+ and npm are required. From this directory:

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:8795. The local server listens only on loopback. Without configuration, dialogue is authored and no model is contacted.

```powershell
npm run build
npm test
npm audit --omit=dev
```

The GitHub Actions workflow performs the same checks when this repository is pushed. It has not been run on GitHub yet. There is no GitHub remote configured.

## Play

Watch or skip the opening. **WASD / arrow keys** move the investigator relative to the camera. Hold **Shift** to run; press **C** to crouch or stand. Walking is 2.3 m/s, running 4.3 m/s and crouched walking 1.15 m/s, including distance along stair slopes. Crouching takes precedence over held Run until you stand again. **E** talks, inspects or operates the nearby hidden panel. On touchscreens, hold the arrows and Run button; tap Crouch to change stance. Walls and major furniture block movement. Only the current room is illuminated; other-room residents and interaction markers are hidden. During a stair traversal the camera follows your height and reveals the relevant connecting floor.

The scene fills the window during exploration. Click the bag icon or press **I / B / Tab** to open the investigator's bag, which holds time, case notes, evidence, progress, settings and hints. **M** opens the floor plan. The map records your location; it does not move the character. Close the bag with Escape or Return to resume walking. Opening the bag or another modal releases movement and freezes NPC routines; press movement again after closing it. Inside the bag, Tab and Enter operate its controls.

Drag either mouse button to rotate the camera; scroll to zoom; **R** restores the original angle. Exterior walls become transparent when the camera looks through them. In Settings, Replay opening preserves your evidence and restores your position afterward. Reduced motion replaces cinematic camera travel with cuts.

Approach the dining clock, kitchen ledger and piano book. Show each object to a nearby resident to open their memory. Each memory has three moments; the second requires an observation puzzle before its evidence becomes available. Correct the clock, inspect the payer field, and move Lamai's point of listening. Memories are staged observation scenes; use the bag to review or solve their details and exit the memory to return to present-day movement. Conversation and evidence reading take place in the bag. Text fields and modal windows suppress walking. The bag's Pause control can freeze NPC routines after you return to exploration while still allowing the investigator to walk.

Enter through the foyer. The central hall connects the dining room, kitchen, clock workshop and music room. Walk up the grand staircase's west flight, cross its rear turn landing, then follow the east flight onto the upstairs landing. The kitchen service stairs descend on the west flight, turn across the rear landing, and continue on the east flight into the cellar corridor. Both routes work in reverse with the same movement controls; no stair interaction button is required. Inspect the register, marked photograph, door service log and entry names. Each resident has an object and observation puzzle. Corroborate Somchai and Nara, then enter code 312 at the boiler room's hidden panel. The sealed room has no doorway from the cellar corridor. Once all fourteen clues are collected, reconstruct eight events and conclude. Secure an admission, preserve originals and protect the survivor for the fullest ending; other choices leave justice unfinished or bury the file. Wrong answers are recoverable. The bag's hints offer three levels; the final level asks before revealing answers.

Progress and conversations are saved in this browser. This case uses schema 3 and a new storage key; the original case save is untouched and can be exported in Settings. Old-case save files cannot be imported into this incompatible story. Settings support low graphics, reduced motion, separate music/effects levels, and save files. Changing languages changes the interface; existing conversation records retain the language in which they were spoken.

## AI and data

The public version uses Claude Sonnet 4.5 through Amazon Bedrock to interpret free-form questions. In Thai, the model selects an approved conversational theme and the game returns reviewed Thai lines, including evidence-dependent variations. English uses model-drafted prose with filtering. The UI distinguishes AI-interpreted Thai dialogue, generated dialogue and fallback. Plot-critical questions, evidence, puzzles, trust and endings use authored text and deterministic rules. AI cannot modify game state. Timeout, invalid output, unavailable provider or exhausted quota falls back to authored dialogue, so the entire case remains playable.

For English prose, the model receives the question and the selected fictional resident's allowed facts. Thai classification receives the question, resident identity and theme descriptions; the server selects the appropriate reviewed line using discovered clues. Client conversation history is not supplied as canonical facts. A conservative spoiler filter catches known classes in generated English, but does not prove semantic accuracy. Generated prose can still be awkward or inaccurate, and classification can select an imperfect theme.

Raw questions are not stored by the game's backend. They are sent to Amazon Bedrock when AI is used; their processing is governed by AWS terms. DynamoDB stores counters, signed session identifiers and HMAC-derived IP identifiers with expiry, plus a lifetime aggregate. Browser saves can contain the user's own questions. No login, advertising or analytics tracker is present. See [operations](docs/OPERATIONS.md) for quota and cost details.

To use Bedrock locally, copy `.env.example` to `.env`, set `DIALOGUE_PROVIDER=bedrock`, and use the existing AWS profile. Credentials stay in the user's AWS credential store, never in browser files.

## Release and operations

AWS deployment is scoped to account `541099637009`, profile `codex-tart`, region `us-east-1`; scripts refuse a mismatched account. Infrastructure uses private S3, CloudFront OAC, an IAM-authenticated Lambda URL, DynamoDB counters and narrowly scoped Bedrock access. See [OPERATIONS.md](docs/OPERATIONS.md) for deploy, rollback and shutdown.

## Code and assets

| File | Responsibility |
|---|---|
| `content.js`, `game.js` | Story, evidence, timeline, progression and save validation |
| `scene.js`, `mansion-environment.js`, `audio.js` | Three.js mansion, materials, animation, memory staging and WebAudio |
| `mansion-layout.js`, `navigation.js` | Shared room bounds, door graph, furnishings, clue anchors, continuous stair surfaces, collision and movement speeds |
| `movement-input.js`, `locomotion.js` | Held movement/run input, crouch stance and animation blending |
| `app.js` | Investigator bag, interface, dialogue, notebook, settings and saves |
| `dialogue.mjs`, `dialogue-acts.mjs`, `backend.mjs` | Model context, reviewed Thai acts, fallback, session and quotas |
| `bedrock.mjs`, `lambda.mjs`, `server.mjs` | Cloud provider and cloud/local HTTP adapters |
| `tools/` | Build, infrastructure, deployment, rollback and live evaluations |

Story, interface, house geometry and synthesized audio were made for this game. Kenney character/furniture assets and the downloaded Poly Haven material maps are CC0; self-hosted fonts use the SIL OFL and Three.js uses MIT. See [asset register](docs/ASSETS.md), the machine-readable manifest and included license texts. No commercial game's artwork, music or code is included. The mansion architecture and furnishings are procedural geometry; characters reuse stylized licensed bases. Bespoke character art, a Blender export pipeline, recorded dialogue and broader device/play testing remain production work beyond this release.
