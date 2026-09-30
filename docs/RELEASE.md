# Release candidate 1.0.0-rc.1

October 1, 2026, Bangkok. Public demo: https://d3imrhbpvqr1t2.cloudfront.net

## Implemented from the production plan

- A complete one-case game with four cutaway rooms, three residents and six clues.
- Evidence-based memory access, three observation puzzles, three moments per memory and a distinct clinic scene.
- An ambiguous letter, a clock-dependent timeline, supporting evidence selection and recoverable wrong answers.
- Playable apology/confession/invitation preparations, deliberate ending confirmation and three staged epilogues.
- Kenney CC0 character animation/furniture, self-hosted licensed Thai/English fonts and original synthesized music/ambience.
- Local saves, prototype migration, import/export, layered hints, low graphics and reduced motion.
- Server-side Bedrock dialogue: AI interprets Thai questions into reviewed dialogue acts; English prose uses allowed fictional facts, output filtering and fallback. Critical lines remain authored.
- HTTPS release, private origins, atomic quota counters, WAF, a free CDN plan, budget/metrics, build/deploy/rollback scripts and an asset register.

## Verified evidence

The local build succeeds; **18 automated tests pass**; `npm audit --omit=dev` reports no known vulnerabilities at the time checked. Tests cover memory gates, timeline support, all ending gates, save migration/damage, bounded model context, known spoilers, timeout/invalid-output fallback, signed session/global quotas, trusted viewer IP parsing, API validation and private-file serving.

Manual Codex browser checks on the local build and public AWS URL verified full exploration → three memory puzzles → all six clues → timeline → conclusion. Wrong time/culprit/preparation selections produced recoverable feedback. All three epilogues were reached on the public URL; the exported solved save was imported between routes to exercise their different preparations. The reunion route was also played from start to finish locally. Reload preserved the public ending and settings. Imported test saves contain only fictional progress and test dialogue.

Desktop and a **390 × 844 browser viewport** were inspected. There was no horizontal overflow; settings, low graphics, reduced motion and language switching worked. Escape closed the modal and restored focus to Settings. The mobile test is viewport emulation, not a physical phone/Safari test. Evidence and puzzle controls work with sound off. Save export created a valid JSON file, and importing it restored all six clues and the solved-case state.

Live model evaluation reports are in `AI-EVAL*.json`. These combine three residents, Thai/English, three evidence stages, emotional questions, plot questions and injection attempts. The final suite has **90 cases: 54 accepted AI answers, 36 authored answers, zero provider errors and zero known-filter failures**, including a less templated question about what each resident misses. A filter pass means only that known output rules passed, not that every generated sentence is accurate. Model-written Thai sometimes produced wrong words or invented biography during manual review, so the final Thai path uses reviewed dialogue acts selected by AI. Earlier generative reports are comparison evidence, not acceptance evidence for the final path. Provider access failures are recorded as fallback, never counted as successful AI answers.

The deployed HTTP smoke checks in `PUBLIC-SMOKE.json` passed all 17 checks on release `rc1-2026-09-30T21-45-40-117Z`, Lambda version 6. They verify live Thai AI acts, signed cookie flags, rejected cross-site/invalid requests, asset delivery and denied anonymous direct access to both origins. A real rollback to the preceding published Lambda/static snapshot was performed; health remained HTTP 200, then the current release was restored. The final public browser check showed reviewed Thai dialogue, authored plot-critical dialogue and no console errors/warnings. Test progress was reset to zero clues for handoff.

The local repository is on `codex/last-dinner-release`, with release tag `v1.0.0-rc.1`. A source-only archive is supplied in the ignored `.release/the-last-dinner-1.0.0-rc.1-source.zip`; it excludes credentials, signing parameters, dependency installs and private deployment files. Reinstall dependencies and build using the README. Local deployment/rollback manifests are kept separately in `.release/deployments/`.

## Practical release limits

This is a complete short-case **release candidate**, not a claim that every commercial quality gate has been met. Independent blind playtesting, measured completion-time distribution, sustained device/frame-rate profiling, physical iOS/Safari/Firefox testing and human editorial review are still needed for a broadly marketed 1.0. No results for those checks are invented. The 30–45 minute duration in the original plan remains a target, not a measured result.

The ending scenes are tableaux with text; there are no voiced cinematics. NPC schedules are authored, not autonomous model-driven simulations. Some clinic figures and props remain procedural. There is no account system, cloud save, additional case, multiplayer or Steam build. AI prose can still be wrong; evidence and outcomes do not depend on it.

The authored GitHub Actions workflow has not been executed on GitHub because no remote repository is configured. Build/test results here were run locally. Cost Explorer had not yet produced a final bill; the configured budget is a console tracker, not a hard cap or a notification subscription.
