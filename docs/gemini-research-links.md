# Gemini research link handoff

<!-- AGENT_DOC_METADATA
Category: Research / Bibliography
Status: Active
Authority: Informational Reference
Backlog: AQ-5
Owner: @gemini
Updated: 2026-11-05
Upstream: docs/open-source-asset-and-motion-research.md
Downstream: None
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Research Bibliography & Source Links
> - **Status**: Active / Informational
> - **Authority**: Informational Reference
> - **Backlog Reference**: `AQ-5`
> - **Summary**: Curated inventory of external links, video timestamps, and model listings extracted from shared Gemini conversations.

This document records links extracted from the shared Gemini conversation and the small number of separate listing checks reported by root. It is a source handoff for the aquarium investigations, not a validation of every claim in that conversation. No budget is selected and no purchase is authorized by this research. It does not add species to the supported roster, establish asset reuse rights, or select an implementation.

## When a model is paid or inaccessible

If cost or download availability prevents testing a model, use its publicly accessible viewer, images, or animation previews as visual guidance. Buying it is not required to progress. Mark it reference-only rather than a tested asset, and use available licensed assets for implementation and tests; viewing a model does not grant asset reuse rights.

## Conversation source and evidence status

- Shared conversation: [Gemini share URL](https://share.gemini.google/moYtLbbQrU0o)
- Resolved browser URL: [Gemini conversation](https://gemini.google.com/share/9503ef97a3a6)
- The links below were extracted from the conversation's embedded links. Several of the originating pages could not be fetched by a text-only page request; root retrieved their hrefs through the browser. A URL in this handoff means the page was linked, not that its claims, availability, price, formats, anatomy, rig, animations, or license have been reviewed.
- Motion timestamps and behavior labels below were supplied in the conversation. They are review waypoints, not observations by this handoff author. Watch and record each relevant segment before using it as animation evidence; identify the visible species and distinguish direct observation from the video's title or caption.
- Root reported spot-checking the following listing facts on 2026-11-03: CGTrader's **Pack 8 (30 fish)** listing showed **$89**, with **1/30 GLTF, 29/30 FBX, and 26/30 PBR**, and included a discus; a CGTrader tang listing showed **458 polygons, 466 vertices, and $12**. These are page/listing spot checks only, not a quality, compatibility, commercial-rights, or budget approval.
- Root checked that the [Khronos Barramundi sample README](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/BarramundiFish/README.md) identifies that sample as CC0. The Barramundi is a glTF test/sample fish, not a target reef species; that license does not cover other models.
- The [Three.js GLTFLoader documentation](https://threejs.org/docs/pages/GLTFLoader.html) documents `setKTX2Loader` and `setDRACOLoader`. Treat KTX2 and Draco support as requiring configured loaders; do not turn a Gemini suggestion to avoid KTX2 or always enable Draco into a project-wide rule.

## Linked fish-model listings and collections

Treat each listing as an independent candidate. Confirm current page identity, source files, polygon/vertex and texture data, rig and clip contents, import/export behavior, attribution obligations, and the exact license before any asset is used. Price and licensing may change.

| Candidate/link | Handoff note |
| --- | --- |
| [JosKata clownfish — CGTrader](https://www.cgtrader.com/3d-models/animal/fish/clownfish-329350f1-57d9-4bf7-8522-9c7fdb5e5280) | Individual listing; animation, rig, source files, and terms remain to be inspected. |
| [JosKata yellow tang — CGTrader](https://www.cgtrader.com/3d-models/animal/fish/yellow-tang-3d5cfc5c-4ece-40aa-88e3-34a42ab2ce4e) | Individual listing; root separately spot-checked this tang listing's displayed mesh counts and price as recorded above. |
| [Purple tang — CGTrader](https://www.cgtrader.com/3d-models/animal/fish/purple-tang) | Search/listing page; verify the exact model behind the page and its terms. |
| [Coral Reef Fish Collection — Animated, Game Ready — Pack 8 (30 fish), CGTrader](https://www.cgtrader.com/3d-model-packs/coral-reef-fish-collection-animated-game-ready-pack-8) | Root spot-checked listing metadata as recorded above. This is Pack 8, a 30-fish listing, not an eight-fish pack. It includes a discus, so do not assume all included fish fit the saltwater roster. Inspect each model and included file individually. |
| [Coral Reef Fish Collection, 54 models — CGTrader](https://www.cgtrader.com/3d-models/animal/fish/coral-reef-fish-collection-animated-97037420-219e-4596-a843-507af88e58e6) | Individual pack listing; inspect its actual catalog, file formats, clips, and terms. |
| [Clownfish — Fab](https://www.fab.com/listings/47d61647-b710-4c79-848a-353211fec73d?lang=en) | Individual listing. |
| [Fish/tang candidate — Fab](https://www.fab.com/listings/aa50d843-d5df-43e4-896c-d80049dcd26e?lang=ko) | Individual listing; page language parameter is Korean. Verify model identity and current terms. |
| [Fish/tang candidate — Fab](https://www.fab.com/listings/3c19c4c9-743e-4c77-8084-f7e819fe9f7f?lang=de) | Individual listing; page language parameter is German. Verify model identity and current terms. |
| [Orange clownfish — Sketchfab](https://sketchfab.com/3d-models/orange-clownfish-67d920d3bf4341d6ba6b6358abd91041) | Individual listing; inspect downloadable files, creator/source, topology, rig, and license. |
| [Regal tang — Sketchfab](https://sketchfab.com/3d-models/regal-tang-b959a0cbeb4542bab2d9bc54e6e0780a) | Individual listing; inspect downloadable files, creator/source, topology, rig, and license. |
| [Clownfish — Poly Pizza](https://poly.pizza/m/769fHo3eEB) | Individual model page; verify its precise license, source files, geometry, and rights. |

### Discovery pages, not identified individual candidates

These are discovery pages or collections, not proof that a particular model is available or suitable:

- [Zacxophone Sketchfab models](https://sketchfab.com/Zacxophone/models)
- [Zacxophone Superhive creator page](https://superhivemarket.com/creators/zacxophone)
- [Sketchfab tang tag](https://sketchfab.com/tags/tang)
- [Jungle Jim animal collection](https://sketchfab.com/jungle_jim/collections/animals-by-jungle-jim-92b7197676534ca0ab3d52cddfe50de1)
- [Poly Pizza Sea Life search](https://poly.pizza/search/Sea%20Life)

The Gemini conversation labels a Sketchfab tang result as a Twardunger yellow tang, but the supplied URL is only the generic tang tag page. Identify a specific listing before citing or assessing that candidate.

## Linked fish-motion videos

The cues and time ranges in this table came from the shared conversation. They have not been validated as footage of the named fish or behavior in this handoff. Open the linked time range, inspect the segment, and record the fish identity, context, visible movement, and any limitations before using it as evidence.

| Video and review waypoint | Linked segment |
| --- | --- |
| Yellow Tang Easy Care Guide — cruise 00:30–00:38; turn 01:30–01:37; retreat 03:11–03:15 | [Cruise](https://www.youtube.com/watch?v=CIMmr-PKn_M&t=30s), [turn](https://www.youtube.com/watch?v=CIMmr-PKn_M&t=90s), [retreat](https://www.youtube.com/watch?v=CIMmr-PKn_M&t=191s) |
| Golden Grazer — hover 00:00–00:03; graze 00:03–00:07 | [Hover](https://www.youtube.com/watch?v=c2vSKErCqTM&t=0s), [graze](https://www.youtube.com/watch?v=c2vSKErCqTM&t=3s) |
| Rare Piebald Tang — turn 00:20–00:25; graze 00:42–00:54 | [Turn](https://www.youtube.com/watch?v=siSZkVow48Q&t=20s), [graze](https://www.youtube.com/watch?v=siSZkVow48Q&t=42s) |
| Snorkeling Yellow Tang, Captain Cook — cruise 00:13–00:25 | [Cruise](https://www.youtube.com/watch?v=fIiOV0jpDlE&t=13s) |
| Clownfish and Anemone — turn 00:11–00:16; hover 00:16–00:22; retreat 01:15–01:25 | [Turn](https://www.youtube.com/watch?v=MUMX7u7v2uY&t=11s), [hover](https://www.youtube.com/watch?v=MUMX7u7v2uY&t=16s), [retreat](https://www.youtube.com/watch?v=MUMX7u7v2uY&t=75s) |
| Prestige Reef Symbiotic Relationship — reverse 00:07–00:11; hover 02:26–02:34; cruise 02:45–02:52 | [Reverse](https://www.youtube.com/watch?v=mw-2yWO6WLY&t=7s), [hover](https://www.youtube.com/watch?v=mw-2yWO6WLY&t=146s), [cruise](https://www.youtube.com/watch?v=mw-2yWO6WLY&t=165s) |
| Why Clownfish Swim Up/Down — 00:00–00:35 and 01:41–02:15 | [Opening segment](https://www.youtube.com/watch?v=n_L9ev92miU&t=0s), [later segment](https://www.youtube.com/watch?v=n_L9ev92miU&t=101s) |
| David Cerny, Clownfish Feeding Anemone — 00:10–00:17 and other moments | [Video](https://www.youtube.com/watch?v=dQUe6zCkI0w&t=10s) |

The Gemini material identifies the clownfish in the last video as *Amphiprion clarkii*, not the target ocellaris clownfish. If confirmed on viewing, treat it only as comparative anemone/clownfish footage, not direct species evidence for AQ-18.

## Linked aquarium/tank references

These links are scene and habitat references, not validated specifications or permission to reuse images/video:

- [Polo Reef](https://www.youtube.com/watch?v=6nEcbCIBJpg)
- [Polo Reef origin/documentary](https://www.youtube.com/watch?v=DtK3hIBlRd8)
- [WWC 900-gallon reef tank](https://reefbuilders.com/2018/07/30/worldwide-corals-reef-tank-900-gallon/)
- [WWC show-tank aquascape timelapse](https://reefbuilders.com/2014/11/18/masterpiece-born-watch-time-lapse-aquascaping-worldwide-corals-show-tank/)
- [WWC dual 900-gallon tank](https://www.youtube.com/watch?v=Oh4pPj7xzkg)
- [Granada Hills 1000-gallon tank](https://www.youtube.com/watch?v=JsMSIrGzdZU)
- [BRS 160](https://www.youtube.com/watch?v=vs8hzOdxGv0)
- [NSA masterclass](https://www.youtube.com/watch?v=WJdl9BgDmNQ)
- [Part 3 update](https://www.youtube.com/watch?v=quJDLPG1no8)
- [Reef of the Month, July 2025](https://www.reef2reef.com/ams/reef-of-the-month-july-2025-lobsterofjustice-180-gallon-in-wall-sps-dream.1123/)

Gemini labeled the final link “Rebel.Reef,” while the URL identifies an article titled for `lobsterofjustice`. Confirm that this is the intended reference before attributing it to another name.

## Pipeline and sample-asset references

- [Khronos glTF Barramundi sample README](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/BarramundiFish/README.md) — root reports the README states CC0 for this sample only.
- [Paper Aquarium model README](https://github.com/MrMoT9I/paper-aquarium/blob/main/assets/models/README.md) — inspect the underlying model source and license; a repository link is not by itself a license grant.

Treat Gemini's implementation code, formulas, performance numbers, and engine recommendations as proposals until checked against primary sources and a controlled proof. In particular, separate model/rig/anatomy quality from engine capability, and compare engines with equivalent assets and animation inputs. Do not purchase models or change the production renderer based on this handoff alone.

## Backlog use

- [AQ-5](../backlog/tasks/aq-5%20-%20Select-realistic-fish-assets-and-animation-approach.md) owns the central renderer, asset, and animation-pipeline decision. Candidate assets should be checked individually for anatomy, full swimming clips, import behavior, license, and fit with the 15-species target.
- [AQ-14](../backlog/tasks/aq-14%20-%20Redesign-the-homepage-as-an-immersive-realistic-fish-tank.md) and [AQ-14.2](../backlog/tasks/aq-14.2%20-%20Add-restrained-reef-habitat-motion-and-lighting.md) can use the tank links for visual research while preserving the crisp, contained front-on aquarium direction.
- [AQ-35](../backlog/tasks/aq-35%20-%20Define-typed-behavior-profiles-for-all-15-reef-fish-species.md) should use observed fish behavior to inform species profiles, while distinguishing direct observation from design inference and unsupported exact durations or distances.
- [AQ-37](../backlog/tasks/aq-37%20-%20Investigate-Mesh2Motion-fish-rigs-and-animation-transfer.md) may use identified model listings as candidates only after per-asset source and license checks.
- [AQ-38](../backlog/tasks/aq-38%20-%20Evaluate-Babylon.js-for-photorealistic-reef-and-animated-fish-rendering.md) and AQ-5 should use the same controlled models and comparable animation inputs when comparing rendering engines.
