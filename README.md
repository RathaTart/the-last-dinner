# The Last Dinner — บ้านที่จำได้

A short, bilingual browser mystery in a theatrical cutaway house. Explore four rooms, follow three residents, enter their subjective memories, compare six pieces of evidence, reconstruct the evening, and decide how to deliver the truth. Three endings depend on playable preparations. No timer can make the case unwinnable.

**Play:** https://d3imrhbpvqr1t2.cloudfront.net

Version **1.0.0-rc.2** adds direct investigator movement, nearby interaction, darkness outside the current room, mouse camera rotation and a four-shot opening cutscene. It retains the complete one-case progression, animated characters, clinic memory, procedural music, save migration/import/export, hints and graphics settings. Read [current release evidence](docs/RELEASE-rc2.md) and [earlier checks and limits](docs/RELEASE.md). The [Thai production plan](PRODUCTION-PLAN.md) records the original design scope.

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

Watch or skip the opening. **WASD / arrow keys** move the investigator relative to the camera; **E** talks or inspects the nearest eligible target. On touchscreens, hold the on-screen arrows and tap the interaction button. Walk through the open central passages: walls and major furniture block movement. Only the current room is illuminated; other-room residents and interaction markers are hidden. The room map records your location rather than moving the character.

Drag either mouse button to rotate the camera; scroll to zoom; **R** restores the original angle. Exterior walls become transparent when the camera looks through them. In Settings, Replay opening preserves your evidence and restores your position afterward. Reduced motion replaces cinematic camera travel with cuts.

Approach the dining clock, kitchen ledger and piano book. Show each object to a nearby resident to open their memory. Each memory has three moments; the second requires an observation puzzle before its evidence becomes available. Correct the clock, inspect the payer field, and move Lamai's point of listening. Memories are staged observation scenes; movement resumes in the present. Close the conversation or evidence panel with Back before walking onward. Pausing time freezes NPC routines while still allowing the investigator to walk.

Once all six clues are collected, arrange the timeline and select supporting evidence, then draw your conclusion. Help the residents prepare an apology, confession and invitation to make the reunion possible. Other choices lead to a letter or continued distance. Wrong answers are recoverable. The `?` button provides three hint levels; the final level asks before revealing answers.

Progress and conversations are saved in this browser. Settings support low graphics, reduced motion, separate music/effects levels, and save files. Changing languages changes the interface; existing conversation records retain the language in which they were spoken.

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
| `content.js`, `game.js` | Story, evidence, timeline, progression and save migration |
| `scene.js`, `audio.js` | Three.js house, animation, memory staging and WebAudio |
| `navigation.js` | Camera-relative movement, collision footprints, room membership and interaction range |
| `app.js` | Interface, dialogue, notebook, settings and saves |
| `dialogue.mjs`, `dialogue-acts.mjs`, `backend.mjs` | Model context, reviewed Thai acts, fallback, session and quotas |
| `bedrock.mjs`, `lambda.mjs`, `server.mjs` | Cloud provider and cloud/local HTTP adapters |
| `tools/` | Build, infrastructure, deployment, rollback and live evaluations |

Story, interface, house geometry and synthesized audio were made for this game. Kenney character/furniture assets are CC0; self-hosted fonts use the SIL OFL and Three.js uses MIT. See [asset register](docs/ASSETS.md), the machine-readable manifest and included license texts. No commercial game's artwork, music or code is included. The clinic figures and some props remain procedural, and character art is intentionally stylized.
