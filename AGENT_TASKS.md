# Aquarium Homepage — Agent Handoff

**Checkpoint:** 2026-11-04. This is a concise live handoff, not a replacement for the task queue or requirements.

- Repo: `/Users/ryantrapp/Desktop/Code/aquarium-homepage`; branch `main`; origin `https://github.com/ryantrappy/aquarium-homepage.git`.
- Refer to the homelab host as `trappserv.er`.

## Read first

1. [`AGENTS.md`](AGENTS.md) — Backlog rules and project constraints; follow them before acting.
2. This file — current verified checkpoint and restart steps.
3. [`agent_scratch.md`](agent_scratch.md) — newest user direction and short operational handoffs.
4. [`docs/requirements.md`](docs/requirements.md) — product goal and accepted scope.
5. Key Backlog records: [AQ-50 focused-fish focus bug](backlog/tasks/aq-50%20-%20Preserve-accessible-focus-when-a-fish-becomes-occluded-or-the-viewport-changes.md), [AQ-14.3 bare rock foundations](backlog/tasks/aq-14.3%20-%20Clean-reef-scan-boundaries-and-ground-the-aquascape.md), [AQ-42 modular coral](backlog/tasks/aq-42%20-%20Develop-coral-assets-and-biologically-varied-polyp-movement.md), [AQ-14.4 assembly](backlog/tasks/aq-14.4%20-%20Assemble-modular-coral-colonies-on-separate-live-rock-foundations.md), [AQ-34 3D reef integration](backlog/tasks/aq-34%20-%20Build-a-true-3D-reef-scene-with-depth-aware-fish-and-habitat-interactions.md), and [AQ-49 this handoff](backlog/tasks/aq-49%20-%20Maintain-a-master-agent-handoff-and-restart-guide.md). [AQ-40](backlog/tasks/aq-40%20-%20Create-a-verified-real-time-biological-asset-pipeline.md) is Done.

## Product and operating rules

- Main success criterion: a photorealistic, living reef aquarium. Realistic fish should fill most of the view and act as service links. The current scene is technical work; do not call it photorealistic or lifelike-complete.
- Follow the current priority/dependency order: **AQ-40 → AQ-50 focused-fish fix → AQ-14.3 foundations → AQ-42 coral modules → AQ-14.4 assembly → AQ-34 integration**, then species and final-scene refinement. Rejected scan cleanup is history, not a production asset path.
- Asset budget is **$0**. Use exact verified CC0, CC BY 4.0, or custom project assets only; preserve attribution and provenance. A generated/static image is not a rigged fish.
- Gemini, managed by the user, handles visual modeling. Use its supplied `src/rendering/` assets; Codex may make necessary functional model/pipeline changes while preserving visual work and avoiding concurrent edits. Create new Backlog tasks labeled `modeling` for model issues so they route to Gemini. Codex focuses on integration, renderer behavior, validation and tests.
- Work locally. Root may commit and push reviewed milestones; the user handles deployment. Do not make incremental server deployments or change authentication, proxy, or DNS configuration.
- Keep review to **1440×900** and **402×874 CSS px**. Root review is required before any task is marked Done. Use Luna at high reasoning for routine work.
- Preserve pause/settings, keyboard/reduced-motion behavior, native service links, and real telemetry semantics. Never invent readings or add service-health monitoring.

## Current checkpoint

### Git and worktree

- Baseline before the focus-fix milestone containing this handoff was **`67642dd`** (`Refresh agent handoff with pending focus-fix review state`); earlier milestones include `55b1d28` (pipeline specimens), `944b730` (modular asset contract), `0d2ab1f` (rig experiments), and `eee0efc` (moving Three.js scene/native service links). These technical milestones do not mean final art approval.
- AQ-50 is Done in Backlog. Its accepted six-path fix is included with this milestone handoff: `src/rendering/scene/aquarium.ts`, `src/rendering/scene/fish-link-focus.ts`, `src/rendering/scene/fish-link-focus.test.ts`, `src/components/AquariumScene.tsx`, `src/components/AquariumScene.test.tsx`, and `src/routes/index.tsx`. Inspect local `git status`/`git log` before continuing. At the committed AQ-40 checkpoint, fish entries and consumers use `ReefFish.thumbnail`; four approved PNG previews are under `public/fish/`. [`docs/fish-art-provenance.json`](docs/fish-art-provenance.json) records image provenance and legacy hashes; [`docs/fish-assets.md`](docs/fish-assets.md) records roster history. The four legacy unverified WebPs and unused `public/reef-background.webp` were intentionally removed in-scope; history/hashes remain recorded. The other 11 WebPs are unchanged.
- Do not blanket-stage, reset, clean, or delete worktree files. `docs/deployment 2.md` and old rendering prototypes/research files are unrelated concurrent material; preserve them and ask Root before touching. Inspect `git status --short` before every edit/commit.

### AQ-40 — complete pipeline gate

- Backlog status is **Done**; all three acceptance criteria are checked. Catalog completed the preview/background provenance and removal inventory.
- Reviewed studies are in [`docs/asset-pipeline-proof.md`](docs/asset-pipeline-proof.md) and [`src/rendering/proof/pipeline-assets/`](src/rendering/proof/pipeline-assets/): an original rock bake plus a licensed PixForge Staghorn LOD/normal-bake pair. They prove bounded pipeline behavior only, not finished reef art or modular coral compliance. Asset hashes, exact recipes, limits, validator reports, and attribution live in the linked reports/manifest; consult those instead of copying values here.
- Root accepted the Staghorn normal map’s limited technical result and the original rock’s bake proof. The rock remains a rounded pebble unsuitable for final habitat art; the coral remains a coarse technical sample. Main-scene promotion is not approved.
- Root verified 104 tests, typecheck, the main production build, and actual native-Chrome review at 1440×900 and 402×874. A temporary Firefish service was added; the new art kept its correct proportions, an opaque body click opened ExampleDomain in a new tab, and deletion restored the exact previously captured API body and ETag. Motion resumed. This was a reversible interaction check; future edits must preserve the current config and revision rather than restore an old snapshot over newer user changes.
- The four approved static previews are `blue-green-chromis-v2.png`, `firefish-v2.png`, `yellow-watchman-goby-v2.png`, and `mandarin-dragonet-v2.png`; they imply no new rig or model. After the build, all four removed legacy WebPs and unused `reef-background.webp` returned HTTP 404, while each v2 PNG returned HTTP 200 with expected dimensions. `FishFigure`, `ServiceDock`, the service picker and aquarium fallback use catalog thumbnail paths; fallback plane height follows loaded image aspect ratio, preserving alpha-based fish picking.
- Root's focused-fish resize warning was resolved by AQ-50. The AQ-40 bake studies remain technical, not final habitat art. The rock is a rounded pebble; coral remains a coarse sample; no final photorealism claim is supported.

### AQ-50 accepted; AQ-14.3 asset audit underway

- **AQ-50 is Done** in Backlog. The review worker ran the full suite (111 tests) and typecheck; Root reviewed the six paths, checked scoped whitespace, built production and verified native new-tab return and paused resize at 1440×900 and 402×874 with no focused-`aria-hidden` warning. Native accessibility-tree inspection confirmed fish focus and fallback to Services. Browser-host screenshots were unavailable; no script or viewport-scale measurement was made because DevTools blocked pasted commands with its self-XSS guard. Configuration was untouched. Links opened natively; destination errors were unrelated. See [AQ-50](backlog/tasks/aq-50%20-%20Preserve-accessible-focus-when-a-fish-becomes-occluded-or-the-viewport-changes.md).
- AQ-50's six source/test paths are included in the reviewed focus-fix milestone containing this handoff. The preceding commit was `67642dd`. Preserve unrelated untracked files.
- **AQ-14.3 is In Progress, assigned `@gemini`.** The user-managed modeling agent supplies eight coral GLBs and two rock GLBs in untracked `src/rendering/assets/corals/`, with generators under untracked `src/rendering/modeling/`. Codex's read-only audit rendered the exact packaged rock GLBs under `/tmp/aq143-audit/`: both show stepped solids without a pass-through arch. Packaging support radii are constant allowances labeled as probes, without measurements in that script. These readiness findings are now routed through modeling-tagged tasks; preserve Gemini's visual work when making any necessary functional changes. Root withdrew its earlier modeling repair assignment after the user's ownership clarification; the worker confirmed no generator, packager, asset or report edits were made, and its Blender jobs completed. Original copies remain under `/tmp/aq143-originals/`. Use the supplied assets; no replacement models and no scene promotion occurred. AQ-42 and AQ-14.4 remain dependency-gated. Follow [`docs/modular-coral-and-live-rock-spec.md`](docs/modular-coral-and-live-rock-spec.md) and [`docs/asset-contract.md`](docs/asset-contract.md).
- **Last known ownership:** Root completed AQ-50 review/acceptance and pushed `af90d85`; the user-managed Gemini agent owns models. The foundation audit worker stopped without model edits. Codex's coral readiness preflight is read-only. Reconfirm active workers before reassigning.
- Main scene has only two rigged fish (clownfish and yellow tang); the other 13 roster entries remain static artwork previews. No photorealism completion claim. The previous fused reef scan and its cleanup derivatives are not accepted modular foundations.
- Read-only AQ-42 preflight matched all eight coral GLB hashes to the supplied manifest, inspected normalized U16 raw-mask attributes and rigid R=0. Current torch/hammer/anemone generators encode `R=h^1.8`; do not apply the contract exponent twice in a future adapter. Their embedded ORM maps do not bind standard `occlusionTexture`; custom contact AO remains a renderer concern. These are audit-time findings while Gemini may continue updating files; coordinate functional changes and route visual/model issues through modeling-tagged tasks. Read the latest task/export before integrating.
- Model findings are routed to `@gemini` in **AQ-51** (real left cave opening), **AQ-52** (measured socket support/clearance), and **AQ-53** (mask encoding contract). All carry the `modeling` label and require checking the latest export before acting. The user's latest clarification permits necessary functional model changes by Codex; prefer Gemini for visual work.
- App configuration has a three-example starter baseline, not finalized user service mappings. Preserve it; do not replace it with invented homelab URLs. Final mappings remain a user configuration decision. The live deployment details and recovery steps are in [`docs/deployment.md`](docs/deployment.md); do not change the deployed service or auth policy from this agent workflow.

## Restart checklist

1. Read **all of `AGENTS.md` first**, including policy text after the handoff pointer, then read this guide and the latest scratch entry. From the repository root run `git status --short`, `git branch --show-current`, and `git log -1 --oneline`. Preserve existing changes and untracked files.
2. Use `npm run backlog -- instructions overview`, then `npm run backlog -- task view AQ-40 --plain` and the active dependency task. Read `task-execution` before implementing and `task-finalization` before AC checks or Done. Use Backlog CLI, never edit task Markdown directly.
3. Inspect existing processes before starting anything. The main Nitro output uses `127.0.0.1:5173` and runs `node .output/server/index.mjs`; the isolated proof Vite uses `127.0.0.1:5189`. Verify current listeners with `lsof -nP -iTCP:5173 -sTCP:LISTEN` and `lsof -nP -iTCP:5189 -sTCP:LISTEN`, then inspect their PIDs with `ps`. PIDs and tool session IDs are transient; running output may predate current Git source. Do not start competing servers/builds during Root review.
4. Local paths: main source and tests under `src/`; local shared config defaults to `.data/reef-config.json` (`REEF_CONFIG_PATH` can select another path). The deployed persistent config is documented in `docs/deployment.md`; never dump credentials or overwrite a newer user config with a historical three-example snapshot.
5. If Root asks for checks, use `npm run typecheck`, `npm test`, or targeted `npx vitest run <test paths>`. Main build is `npm run build`; proof viewer uses `npx vite --config src/rendering/proof/vite.config.js` and `pipeline-study.html`. The isolated proof uses port 5189. Verify process ownership before invoking these.
6. For visual review use native Chrome via CUA/DevTools if browser-host automation is unavailable. Set exactly 1440×900 or 402×874 CSS pixels. Device toolbar can retain pinch scale 2.406 after a viewport change; toggle Device Toolbar off/on and verify `visualViewport.scale` is 1 before diagnosing app zoom. Do not bypass DevTools self-XSS paste warnings. Temporary `/tmp` captures are evidence notes, not durable artifacts.
7. Record verified evidence and unresolved limits in the matching Backlog task. Root reviews active feedback and owns Done. Refresh this handoff at a reviewed milestone or agent handoff.

## Evidence boundary

| Verified | Still open / do not claim |
| --- | --- |
| AQ-40 Done: pipeline inventory, bounded fixture, optimization/build and two-viewport review; Root reports 104 tests/typecheck/build and successful reversible Firefish interaction QA. | Final live-rock/coral art; full-roster fish rigs and performance. |
| Four v2 PNG previews are source-documented and static; Firefish aspect, body click, native new-tab return, deletion and config restoration were checked. | Those previews do not demonstrate swimming behavior, new GLB assets, or photorealism. |
| AQ-50 Done: 111 tests, typecheck, scoped diff check, production build, and Root native two-viewport return/paused-resize QA with no focused-aria-hidden warning; native accessibility-tree focus/fallback confirmed. | Browser-host screenshots unavailable; no script/scale measurement because DevTools self-XSS guard blocked paste. |
| AQ-14.3 asset handoff: 8 coral and 2 bare-rock GLBs plus generators are present as untracked local files; foundation worker is auditing the supplied assets directly. | No new coral or rock asset has been accepted or scene-promoted. AQ-42 and AQ-14.4 remain gated. |
| Main Three.js app has native links and two rigged species in its technical baseline. AQ-50's focus correction is accepted. | Species-complete articulation and accepted modular rock/coral assembly. |
| Existing local/deployed configuration uses an explicit shared versioned envelope; current example baseline was restored after QA. | Final service mappings; do not infer service URLs or change auth/deployment policy. Preserve newer user config. |

## Known implementation traps

- Keep the bounded simulation frame clock; do not substitute raw animation-frame elapsed time without checking pause/hidden/reduced-motion behavior.
- A service's selected stable fish ID must remain that species. Never silently substitute another species when artwork or a rig is missing.
- All thumbnail consumers must read `ReefFish.thumbnail`. Preview aspect ratios vary; preserve natural image proportions and transparent edges because aquarium picking reads artwork alpha.
- Coral `COLOR_0` is raw mask data under the asset contract, not display tint or alpha. A renderer must bypass ordinary vertex-color/vertex-alpha multiplication and bind each mask channel explicitly.
- Current habitat coordinates are legacy-scaled. The height-column habitat derivation fills columns toward the sand and is not cave-ready. Do not claim real caves or use it as cave-clearance evidence.
- During native Chrome emulation, 1440×900 can retain pinch scale 2.406; toggle the Device Toolbar off/on and confirm the native DOM reports `visualViewport.scale === 1`. Do not paste commands through DevTools self-XSS warnings or try to bypass them.
