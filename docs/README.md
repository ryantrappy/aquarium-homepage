# Agent Documentation Catalog & Knowledge Hub

<!-- AGENT_DOC_METADATA
Category: Governance / Hub
Status: Canonical / Active
Authority: Binding Single Source of Documentation Truth
Backlog: AQ-61, AQ-63, AQ-65, AQ-66, AQ-64, AQ-53, AQ-60, AQ-42
Owner: @documentation
Updated: 2026-11-14
Upstream: AGENTS.md, AGENT_TASKS.md, docs/requirements.md, docs/framework/DOCUMENTATION_FRAMEWORK.md
Downstream: All repository documentation and active agent workflows
-->

> [!IMPORTANT]
> **Single Source of Truth for Autonomous AI Agents**  
> This directory (`docs/`) contains all architectural specifications, biological asset contracts, behavioral state machines, verification evidence, and operational runbooks for the `aquarium-homepage` project.  
> **Incoming agents MUST consult this hub before making implementation decisions or creating new documents.**  
> For the mandatory documentation operating standard and contribution protocol, see [`docs/framework/DOCUMENTATION_FRAMEWORK.md`](framework/DOCUMENTATION_FRAMEWORK.md).

---

## 1. Quick Topic & Subsystem Lookup

Find the authoritative documents for your task area:

| Subsystem / Topic | Primary Canonical Spec | Supporting Plans & Research | Validation & Evidence |
|---|---|---|---|
| **Primary Requirements & Scope** | [`requirements.md`](requirements.md) | [`design-principles.md`](design-principles.md) | [`agent-change-audit.md`](agent-change-audit.md) |
| **3D Rendering & Scene** | [`rendering.md`](rendering.md), [performance budgets](photorealism-budgets.md) | [`rendering-research-history.md`](rendering-research-history.md) | [`asset-pipeline-proof.md`](asset-pipeline-proof.md), [candidate donor provenance](asset-evidence/aq12/splat-candidate-provenance.json), [AQ-59 runtime material review](asset-evidence/aq59/runtime-20261112/review.json), [AQ-76 native runtime comparison](asset-evidence/aq76/native-20261112/review.json), [AQ-76 recovery policy](asset-evidence/aq76/recovery-20261114/README.md), [repeatable look-dev baseline](asset-evidence/aq70-2/baseline-before/review.json), [AQ-70.12 sand functional proof](asset-evidence/aq70-12/functional-review.json) |
| **Fish Motion & Biomechanics** | [`fish-turning-and-maneuvering-plan.md`](fish-turning-and-maneuvering-plan.md) | [`sketchfab-motion-review.md`](sketchfab-motion-review.md), [`mesh2motion-review.md`](mesh2motion-review.md) | [`asset-evidence/fish-rig-inventory.md`](asset-evidence/fish-rig-inventory.md)  [AQ-58 reset proof](asset-evidence/aq58/fish-player-review.json) |
| **Fish Behavior & AI Runtime** | [`behavior-runtime-contract.md`](behavior-runtime-contract.md) | [`fish-behavior-design.md`](fish-behavior-design.md), [`reef-fish-roster.md`](reef-fish-roster.md) | [AQ-41 controller CPU samples](asset-evidence/aq41/current-controller-benchmark.json), `src/simulation/behavior-runtime.test.ts`, [AQ-105 mounted hosting](asset-evidence/aq105/README.md), [final two-size review](asset-evidence/aq105/final-4df19de/README.md)  [AQ-64 state preservation](asset-evidence/aq64/review.json) |
| **Reef Navigation & Habitat** | [`habitat-navigation-core-contract.md`](habitat-navigation-core-contract.md) | [`modular-coral-and-live-rock-spec.md`](modular-coral-and-live-rock-spec.md) | `src/simulation/habitat-navigation.test.ts`, [AQ-104 final distribution review](asset-evidence/aq104/current-604c8aa/README.md) |
| **3D Collision & Geometry** | [`asset-evidence/aq58/3d-collision-review.md`](asset-evidence/aq58/3d-collision-review.md) | [`asset-evidence/aq58/README.md`](asset-evidence/aq58/README.md) | [`asset-evidence/aq58/`](asset-evidence/aq58/) |
| **Biological Asset Pipeline** | [`asset-contract.md`](asset-contract.md) | [`open-source-asset-and-motion-research.md`](open-source-asset-and-motion-research.md) | [`asset-pipeline-proof.md`](asset-pipeline-proof.md), [`asset-evidence/aq57/`](asset-evidence/aq57/) |
| **Fish Roster & Adult Scaling** | [`fish-scale-reference.md`](fish-scale-reference.md) | [`reef-fish-roster.md`](reef-fish-roster.md) | `src/rendering/scene/fish-scale.test.ts`, [AQ-60 initial spread proof](asset-evidence/aq60/spawn-review.json) |
| **Modular Corals & Rock Sockets**| [`modular-coral-and-live-rock-spec.md`](modular-coral-and-live-rock-spec.md)| [`socket-verification.md`](socket-verification.md) | [`asset-evidence/aq52-left-socket-report.json`](asset-evidence/aq52-left-socket-report.json), [AQ-53 mask runtime proof](asset-evidence/aq53/review.json), [AQ-42 displaced bounds](asset-evidence/aq42/displacement-bounds-review.json) |
| **2D Thumbnails & Cutouts** | [`fish-assets.md`](fish-assets.md) | [`fish-art-provenance.json`](fish-art-provenance.json) | `public/fish-art-provenance.json`  [AQ-66 thumbnail proof](asset-evidence/aq66/review.json) |
| **Homelab Services & Links** | [`service-mapping-review.md`](service-mapping-review.md) | [`requirements.md`](requirements.md) | Backlog `AQ-8` / `AQ-56` |
| **Read-Only Telemetry (Hardware)**| [`network-traffic-source.md`](network-traffic-source.md) | Server endpoints (`src/routes/api/telemetry/`) | `src/server/disk-capacity-math.test.ts` |
| **Ambient Motion & Lighting** | [`rendering.md`](rendering.md) | [`requirements.md`](requirements.md) | [AQ-14.2/AQ-70.6 Root visual review](asset-evidence/aq14-2/root-visual-review.json) |
| **Accessibility & Controls** | [`accessibility-audit.md`](accessibility-audit.md) | [`design-principles.md`](design-principles.md) | Backlog `AQ-6` / `AQ-50`  [AQ-63 interaction proof](asset-evidence/aq63/review.json), [AQ-70.14 caption/access proof](asset-evidence/aq70-14/review.json) |
| **Deployment & Production** | [`deployment.md`](deployment.md) | [`deployment-2.md`](archive/deployment-2.md) *(Historical)* | Docker / Node 24 on `trappserv.er` |
| **Documentation Standards** | [`framework/DOCUMENTATION_FRAMEWORK.md`](framework/DOCUMENTATION_FRAMEWORK.md)| [`framework/TEMPLATE.md`](framework/TEMPLATE.md) | Backlog `AQ-61` |

---

## 2. Master Document Directory

Directory of project documentation and verification evidence:

### Tier 1: Core Governance & Active Checkpoints (Binding)
| Document | Status | Authority | Scope / Purpose |
|---|---|---|---|
| [`requirements.md`](requirements.md) | **Canonical** | Binding | Core product vision: photorealistic reef tank, realistic swimming, homelab links, dual viewports. |
| [`design-principles.md`](design-principles.md) | **Canonical** | Binding | Aesthetic guidelines: aquarium first, unobtrusive UI, $0 CC0/CC-BY 4.0 asset budget, no live health claims. |
| [`framework/DOCUMENTATION_FRAMEWORK.md`](framework/DOCUMENTATION_FRAMEWORK.md) | **Canonical** | Binding | Mandatory documentation specification, authority hierarchy, header schema, and agent protocols. |
| [`framework/TEMPLATE.md`](framework/TEMPLATE.md) | **Active** | Operational | Drop-in template for creating new compliant agent documentation. |

---

### Tier 2: Canonical Technical Specifications & Contracts (Binding)
| Document | Status | Authority | Backlog | Scope / Purpose |
|---|---|---|---|---|
| [`asset-contract.md`](asset-contract.md) | **Canonical** | Binding | `AQ-40` | Canonical coordinate convention (+Y up, +Z forward, fish head -X), meter scale, `COLOR_0` raw linear masks. |
| [Performance and delivery budgets](photorealism-budgets.md) | **Active** | Binding | `AQ-70.3`, `AQ-76` | Frame/asset/scene caps and distinct quality-recovery observation policy; historical totals are dated measurements. |
| [`modular-coral-and-live-rock-spec.md`](modular-coral-and-live-rock-spec.md) | **Canonical** | Binding | `AQ-14.3`, `AQ-42` | Technical specification for 8 modular coral archetypes and 2 live-rock foundations (left cave, right shelf). |
| [`behavior-runtime-contract.md`](behavior-runtime-contract.md) | **Canonical** | Binding | `AQ-44` | Engine-independent behavior state machine (swim, hover, dart, feed, rest, school, avoid, burst). |
| [`habitat-navigation-core-contract.md`](habitat-navigation-core-contract.md) | **Canonical** | Binding | `AQ-45` | Navigation contracts: spatial zones (open water, crevice, cave, substrate), waypoint steering, boundary clamps. |
| [`fish-scale-reference.md`](fish-scale-reference.md) | **Canonical** | Binding | `AQ-60` | Adult biological lengths and render scales for all 16 roster species (parsed by `fish-scale.test.ts`). |
| [`fish-behavior-design.md`](fish-behavior-design.md) | **Canonical** | Binding | `AQ-35` | Biological behavior profiles, swimming speed ranges, schooling affinities, and depth bounds for all species. |
| [`reef-fish-roster.md`](reef-fish-roster.md) | **Canonical** | Binding | `AQ-35` | Biological taxonomic index of all 15 supported species, morphological archetypes, and color briefs. |

---

### Tier 3: Architecture & Implementation Plans (Active)
| Document | Status | Authority | Backlog | Scope / Purpose |
|---|---|---|---|---|
| [`rendering.md`](rendering.md) | **Active** | Active | `AQ-5`, `AQ-38` | Three.js rendering architecture, multi-engine study summary, shader passes, performance constraints. |
| [`fish-turning-and-maneuvering-plan.md`](fish-turning-and-maneuvering-plan.md) | **Active** | Active | `AQ-49` | Biomechanical turning mathematics: Hermite spline spine bending, roll banking, pectoral fin modulation. |

---

### Tier 4: Audits & Verification Evidence (Evidentiary)
| Document | Status | Authority | Backlog | Scope / Purpose |
|---|---|---|---|---|
| [AQ-105 mounted-anemone hosting](asset-evidence/aq105/README.md), [final Root review](asset-evidence/aq105/final-4df19de/README.md) | **Active** | Evidentiary | `AQ-105` | Accepted mounted hosting, species-scoped soft access,875tests and exact two-size native pose/link/control evidence at4df19de; broader art/body/budget gates remain open. |
| [AQ-104 final Root distribution review](asset-evidence/aq104/current-604c8aa/README.md) | **Complete** | Evidentiary | `AQ-104` | Current-source sustained sector utilization, blocked-school recovery, 865 passing tests and both-size native motion/Pause/control evidence; broader art/body/performance gates remain separate. |
| [AQ-104 mixed-roster temporal evidence](asset-evidence/aq104/f084-temporal-investigation.json) / [native staging](asset-evidence/aq104/f084-staging/review.json) | **Active** | Evidentiary | `AQ-104` | Historical f084 controlled60s distribution and frozen staging; superseded for final task acceptance by the current-source Root review above. |
| [Schooling controller CPU samples](asset-evidence/aq41/current-controller-benchmark.json) | **Active** | Evidentiary | `AQ-41` | Raw Node CPU simulation timings for40/48 inhabitants and both aspect-specific layouts; explicitly excludes browser/GPU timing and does not establish a population cap. |
| [Live-rock runtime material review](asset-evidence/aq59/runtime-20261112/review.json) | **Active** | Evidentiary | `AQ-59` | Neutral carbonate/limited coralline shader refinement at both viewports; exact-export geometry, cave and final art gates remain open. |
| [Native runtime comparison](asset-evidence/aq76/native-20261112/review.json) | **Active** | Evidentiary | `AQ-76` | Both-view native rAF comparison before/after complete-school upgrades; budget failures and warmup limitations remain explicit. |
| [Reachable quality recovery](asset-evidence/aq76/recovery-20261114/README.md) | **Active** | Evidentiary | `AQ-76`, `AQ-70.3` | Healthy60Hz recovery regressions, explicit17.5ms recovery/16.7ms target distinction and unchanged overload/asset gates; full task remains open. |
| [Deterministic before baseline](asset-evidence/aq70-2/baseline-before/review.json) | **Complete** | Evidentiary | `AQ-70.2` | Four presets, both viewports,16 native PNGs/sidecars,8 byte-identical pairs; fixed High inspection stats do not certify normal performance or final art. |
| [Asymmetric reef placement review](asset-evidence/aq70-13/layout-20261112/review.json) | **Active** | Evidentiary | `AQ-70.13` | Shared placement/contact/navigation transforms and taller left formation; metric scale, central arch and final composition acceptance remain open. |
| [Current coral-origin integration](asset-evidence/aq82/current-origins-20261113/review.json) | **Active** | Evidentiary | `AQ-82` | Actual rendered mount origins replace stale canonical socket inputs; offset/transform/failure tests and native two-size links pass, while anatomical contact/permeability remain open. |
| [Current-source rock fallback review](asset-evidence/aq58/current-fallback-20261113/review.json) | **Active** | Evidentiary | `AQ-58` | Current displayed geometry drives conservative startup/failure bounds; source-bound tests, native two-size links and fail-closed controller checks pass; caves/envelopes remain open. |
| [Bounded water interface review](asset-evidence/aq103/interface-20261113/review.json) | **Active** | Evidentiary | `AQ-103` | Exact-source two-size native views and actual-controller freeze/lifecycle review; front-meniscus visibility and final fixture contrast remain open. |
| [Rear substrate transition review](asset-evidence/aq86/rear-seam-20261112/review.json) | **Active** | Evidentiary | `AQ-86`, `AQ-70.12` | Native before/after views at both sizes accept softer floor/wall contact and confirm corrected mapless edge shader; frozen timings do not establish runtime cost. |
| [Runtime rock source audit](asset-evidence/aq59/runtime-source-audit-20261112/review.json) | **Active** | Evidentiary | `AQ-59`, `AQ-94`, `AQ-101` | Read-only native/export inventories identify merged foundations, missing modular library/2048 atlas and runtime/canonical hash mismatch; historical completion gates reopened. |
| [Taller coral and glass preview](asset-evidence/aq70-13/taller-20261112/review.json) | **Active** | Evidentiary | `AQ-70.13`, `AQ-102` | User-requested larger upper colonies and clear enclosure/true side-reflection handoff at both viewports; full composition and glass art/cost gates remain open. |
| [Shaft compositing review](asset-evidence/aq86/compositing-20261112/review.json) | **Active** | Evidentiary | `AQ-86` | Corrected alpha attenuation, tank-only raymarch and render-state recovery; rear seam and final art remain open. |
| [Reduced-motion turn hold](asset-evidence/aq49/reduced-motion-20261112/review.json) | **Active** | Evidentiary | `AQ-49` | Controller regression and native two-size hold/resume proof; full turning art review remains open. |
| [Fish height and depth distribution](asset-evidence/aq87/distribution-20261112/review.json) | **Active** | Evidentiary | `AQ-87` | Exact-source laptop/phone views with copied ecological bands, eleven inhabitants and eight phone targets; accepts current-roster visual spread, not body clearance or full task completion. |
| [Current runtime rig reset check](asset-evidence/aq12-1/current-runtime-clip-check.json) | **Complete** | Evidentiary | `AQ-12.1` | All16 actual runtime URL mappings pass clip/overlay reset and pause checks after continuous-turn changes; excludes material, license and clearance acceptance. |
| [Ambient lighting Root review](asset-evidence/aq14-2/root-visual-review.json) | **Active** | Evidentiary | `AQ-14.2`, `AQ-70.6` | Native DPR1 captures at both required CSS sizes after surface/caustic refinement; art, freeze and performance limits explicitly remain open. |
| [Nine fish candidate provenance](asset-evidence/aq12/splat-candidate-provenance.json) | **Active** | Evidentiary | `AQ-12`, `AQ-70.10` | Exact candidate/donor hashes, retained payload proof, owner confirmation and derivative credit; no asset promotion. |
| [AQ-70.12 sand functional review](asset-evidence/aq70-12/functional-review.json) | **Active** | Evidentiary | `AQ-70.12` | Real WebGL shader/phase comparisons; final sand art, physical grain and budgets remain open. |
| [AQ-70.14 caption/access review](asset-evidence/aq70-14/review.json) | **Complete** | Evidentiary | `AQ-70.14` | Both-viewport compact captions, native intercepted-label routing, keyboard/touch/modal access and exact PNGs. |
| [`code-review-findings.md`](code-review-findings.md) | **Active** | Evidentiary | `AQ-61` | Comprehensive codebase audit: runtime picking desync, mobile memory allocations, narrow-viewport navigation locks. |
| [`agent-change-audit.md`](agent-change-audit.md) | **Complete** | Evidentiary | `AQ-57` | Root audit of concurrent agent changes, rejected runtime experiments, and baseline restoration. |
| [AQ-58 fish player and clip-only review](asset-evidence/aq58/fish-player-review.json) | **Active** | Evidentiary | AQ-58 | Source-pinned clean-pose reset compatibility and conditional supplied clip-only spheres; main-scene collision remains open. |
| [AQ-71 effective PMREM review](asset-evidence/aq71/sand-ibl-20261113/README.md) | **Active** | Evidentiary | AQ-71 | Explicit shared material bindings and native two-size exposure acceptance; controlled runtime parity open. |
| [AQ-70.13 eighty-percent reef mass](asset-evidence/aq70-13/fill-80-20261113/README.md) | **Active** | Evidentiary | AQ-70.13 | Much taller foundations, inherited socket poses, actual geometry navigation and native two-size review; broader metric/reference acceptance open. |
| [AQ-70.11 flowing torch](asset-evidence/aq70-11/flowing-torch-20261113/README.md) | **Active** | Evidentiary | AQ-70.11 | Saved soft-tissue/rigid-skeleton model, material role binding, finite transmission sampling and actual-loader motion proof; full tissue/variant rubric open. |
| [AQ-70.11 bushy right coral](asset-evidence/aq70-11/corymbose-20261113/README.md) | **Active** | Evidentiary | AQ-70.11 | Original saved branching crown, safe atlas padding and exact two-size compatibility; full rubric/macros/archetypes remain open. |
| [AQ-70.11 antler coral and taller crest](asset-evidence/aq70-11/antler-20261113/README.md) | **Active** | Evidentiary | AQ-70.11, AQ-70.13 | Saved original branching colony, authored PBR integration and native vertical-fill review; broader archetypes, scale, clearance and art remain open. |
| [AQ-94 supported arch growth](asset-evidence/aq94/arch-growth-20261113/README.md) | **Active** | Evidentiary | AQ-94 | Four measured native sockets, reused coral growth, authored-rock preservation and conservative coral bounds; final reef art/library open. |
| [AQ-94 central arch review](asset-evidence/aq94/central-arch-20261113/README.md) | **Active** | Evidentiary | AQ-94 | Saved packed custom arch, isolated reef sync, actual geometry passage tests and native two-size composition; full modular library/art open. |
| [AQ-42 displaced bounds review](asset-evidence/aq42/displacement-bounds-review.json) | **Active** | Evidentiary | AQ-42 | Continuous shader extrema, actual eight-asset audit and camera/shadow frustum regressions; final art/scene acceptance remains open. |
| [AQ-53 raw-mask runtime proof](asset-evidence/aq53/review.json) | **Complete** | Evidentiary | AQ-53 | Exact eight-coral raw masks, indexed pinned bases and shared surface/depth runtime curve; actual GPU motion and pause checks. |
| [AQ-60 natural initial spread](asset-evidence/aq60/spawn-review.json) | **Active** | Evidentiary | AQ-60 | Root native starting composition, safe headings/movement and survivor-state checks; broader scale task remains open. |
| [AQ-64 state preservation proof](asset-evidence/aq64/review.json) | **Complete** | Evidentiary | AQ-64 | Actual controller identity/resource tests and native edit/add/remove/reorder continuity at both target sizes. |
| [AQ-65 GPU attenuation proof](asset-evidence/aq65/gpu-ao-review.json) | **Complete** | Evidentiary | AQ-65 | Actual shader float readpixels match the CPU curve; bounded turn/pitch recovery tests. |
| [AQ-66 thumbnail evidence](asset-evidence/aq66/review.json) | **Complete** | Evidentiary | AQ-66 | Optimized image metrics, preserved PNG originals and native failed-artwork recovery proof. |
| [`asset-evidence/aq63/review.json`](asset-evidence/aq63/review.json) | **Complete** | Evidentiary | `AQ-63` | Root interaction tests, native browser observations and two viewport screenshots; no scene/art acceptance. |
| [`accessibility-audit.md`](accessibility-audit.md) | **Active** | Evidentiary | `AQ-6`, `AQ-50` | WCAG / keyboard navigation audit, focus trapping, reduced motion behavior, dual viewport checks. |
| [`service-mapping-review.md`](service-mapping-review.md) | **Complete** | Evidentiary | `AQ-8`, `AQ-56` | Verified starter homelab roster: Komodo, WatchMyBirds, Paperless, Home Assistant, Ombi. |
| [`asset-pipeline-proof.md`](asset-pipeline-proof.md) | **Active** | Evidentiary | `AQ-40` | Material baking, export validation, and technical pipeline proof records. |
| [`fish-assets.md`](fish-assets.md) | **Active** | Evidentiary | `AQ-40` | Static 2D thumbnail provenance and recognition cutout assets inventory. |
| [`fish-art-provenance.json`](fish-art-provenance.json) | **Canonical** | Fixture | `AQ-40` | Machine-readable SHA-256 hashes and provenance records for 2D cutout art. |
| [`asset-evidence/fish-rig-inventory.md`](asset-evidence/fish-rig-inventory.md) | **Active** | Evidentiary | `AQ-49.1` | Exact bone names and rotation channel inventory for 8 candidate fish rigs (174 total channels). |
| [`asset-evidence/fish-rig-inventory.json`](asset-evidence/fish-rig-inventory.json) | **Canonical** | Fixture | `AQ-49.1` | Machine-readable JSON inventory of rig tracks and joint hierarchies. |
| [`asset-evidence/aq58/3d-collision-review.md`](asset-evidence/aq58/3d-collision-review.md) | **Active** | Evidentiary | `AQ-58` | True 3D swept-volume collision analysis, cave clearances (20-60mm pass, 70mm blocked). |
| [`asset-evidence/aq58/README.md`](asset-evidence/aq58/README.md) | **Active** | Evidentiary | `AQ-58` | Directory overview of AQ-58 collision test fixtures and report outputs. |
| [`asset-evidence/aq58/left-collision-geometry.fixture.json.gz`](asset-evidence/aq58/left-collision-geometry.fixture.json.gz) | **Canonical** | Test Fixture | `AQ-58` | Compressed rock mesh fixture parsed directly by `mesh-collision.test.ts` & `mesh-habitat.test.ts`. |
| [`asset-evidence/aq57/README.md`](asset-evidence/aq57/README.md) | **Complete** | Evidentiary | `AQ-57` | Geometry verification report, rendering script outputs, and quarantine log for unaccepted assets. |
| [`asset-evidence/aq52-left-socket-report.json`](asset-evidence/aq52-left-socket-report.json) | **Canonical** | Test Fixture | `AQ-52` | Measured export geometry for left rock coral sockets (validated by `socket-report-freshness.test.ts`). |
| [`asset-evidence/aq52-right-socket-report.json`](asset-evidence/aq52-right-socket-report.json) | **Canonical** | Test Fixture | `AQ-52` | Measured export geometry for right rock coral sockets (validated by `socket-report-freshness.test.ts`). |

---

### Tier 5: Operations & Runbooks (Operational)
| Document | Status | Authority | Backlog | Scope / Purpose |
|---|---|---|---|---|
| [`deployment.md`](deployment.md) | **Active** | Operational | `AQ-10` | Production deployment guide: Docker container on `trappserv.er`, Node 24 runtime, environment config. |
| [`socket-verification.md`](socket-verification.md) | **Active** | Operational | `AQ-52` | Offline verification tool instructions (`scripts/check-socket-reports.mjs`) for rock coral sockets. |

---

### Tier 6: Research Spikes & Feasibility Studies (Informational)
| Document | Status | Authority | Backlog | Scope / Purpose |
|---|---|---|---|---|
| [`open-source-asset-and-motion-research.md`](open-source-asset-and-motion-research.md) | **Complete** | Informational | `AQ-5` | Survey of CC0 / CC-BY 4.0 3D models and motion rigs within the $0 budget. |
| [`sketchfab-motion-review.md`](sketchfab-motion-review.md) | **Complete** | Informational | `AQ-36` | Direct observation of Adam Prejean's animated aquarium in Sketchfab viewer. |
| [`mesh2motion-review.md`](mesh2motion-review.md) | **Complete** | Informational | `AQ-37` | Investigation into Mesh2Motion retargeting and Chrome browser file-URL security blocks. |
| [`network-traffic-source.md`](network-traffic-source.md) | **Complete** | Informational | `AQ-17` | Investigation of `/proc/net/dev` and Docker container network interface metrics. |
| [`gemini-research-links.md`](gemini-research-links.md) | **Active** | Informational | `AQ-5` | Research links and biological reference materials for coral and fish anatomy. |
| [`photorealism-reference.md`](photorealism-reference.md) | **Active** | Informational | `AQ-70.1` | **Project goal visual** ([`more-realistic-reef-guide.png`](more-realistic-reef-guide.png)) + 22 exact image file-page references and 11 gallery/resource/model links (not counted as images); coverage and per-item licensing remain incomplete. |
| [`photorealism-rubric.md`](photorealism-rubric.md) | **Active** | Informational | `AQ-70.1` | Visual pass/fail criteria, numeric color/exposure targets and histogram method, historical baseline gap table (source screenshot missing), caustic-frequency measurement gap, and real-time-vs-baked recommendation. |
| [`baked-lighting-spike.md`](baked-lighting-spike.md) | **Active** | Informational | `AQ-70.7` | Hybrid baked/real-time pipeline spike: feasibility, Three.js lightmap integration, Blender Cycles workflow, recommendation (pilot one island) and follow-up breakdown. |

---

### Tier 7: Historical Archives & Superseded Drafts (Historical)
| Document | Status | Authority | Successor | Scope / Purpose |
|---|---|---|---|---|
| [`design.md`](design.md) | **Superseded** | Historical | [`requirements.md`](requirements.md) | Early 2026-11-02 dashboard cards layout. Retained for historical context. |
| [`deployment-2.md`](archive/deployment-2.md) | **Archived** | Historical | [`deployment.md`](deployment.md) | Nitro/Node 24 preliminary hosting research and read-only discovery draft; content retained from the former `deployment 2.md` path. |
| [`rendering-research-history.md`](rendering-research-history.md) | **Archived** | Historical | [`rendering.md`](rendering.md) | Historical multi-engine spike notes and early asset experiments. |
| [`reef_aquarium_all_code.md`](reef_aquarium_all_code.md) | **Archived** | Unverified | None | Raw monolithic code dump from external Gemini interaction. |
| [`gemini_planning.md`](gemini_planning.md) | **Archived** | Historical | None | Unedited conversation log from external Gemini planning session. |

---

## 3. How to Contribute New Documentation (Agent Protocol)

Follow this 6-step checklist when authoring documentation:

```
[1. Check Prior Art]   --> Search docs/README.md & Backlog.md
[2. Copy Template]     --> Copy docs/framework/TEMPLATE.md
[3. Populate Header]   --> Fill AGENT_DOC_METADATA & Context Alert
[4. Register in Hub]   --> Add entry to docs/README.md (Sections 1 & 2)
[5. Link in Backlog]   --> Run `backlog task edit <ID> --doc docs/<path>`
[6. Commit Task]       --> Stage scoped files & commit: `git commit -m "docs(AQ-XX): ..."`
```

For full details, edge cases, and deprecation protocols, refer to [`docs/framework/DOCUMENTATION_FRAMEWORK.md`](framework/DOCUMENTATION_FRAMEWORK.md).
