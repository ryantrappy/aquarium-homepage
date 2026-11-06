# Agent Documentation Catalog & Knowledge Hub

<!-- AGENT_DOC_METADATA
Category: Governance / Hub
Status: Canonical / Active
Authority: Binding Single Source of Documentation Truth
Backlog: AQ-61, AQ-63, AQ-65, AQ-66, AQ-64, AQ-53, AQ-60, AQ-42
Owner: @documentation
Updated: 2026-11-06
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
| **3D Rendering & Scene** | [`rendering.md`](rendering.md) | [`rendering-research-history.md`](rendering-research-history.md) | [`asset-pipeline-proof.md`](asset-pipeline-proof.md), [AQ-70.12 sand functional proof](asset-evidence/aq70-12/functional-review.json) |
| **Fish Motion & Biomechanics** | [`fish-turning-and-maneuvering-plan.md`](fish-turning-and-maneuvering-plan.md) | [`sketchfab-motion-review.md`](sketchfab-motion-review.md), [`mesh2motion-review.md`](mesh2motion-review.md) | [`asset-evidence/fish-rig-inventory.md`](asset-evidence/fish-rig-inventory.md)  [AQ-58 reset proof](asset-evidence/aq58/fish-player-review.json) |
| **Fish Behavior & AI Runtime** | [`behavior-runtime-contract.md`](behavior-runtime-contract.md) | [`fish-behavior-design.md`](fish-behavior-design.md), [`reef-fish-roster.md`](reef-fish-roster.md) | `src/simulation/behavior-runtime.test.ts`  [AQ-64 state preservation](asset-evidence/aq64/review.json) |
| **Reef Navigation & Habitat** | [`habitat-navigation-core-contract.md`](habitat-navigation-core-contract.md) | [`modular-coral-and-live-rock-spec.md`](modular-coral-and-live-rock-spec.md) | `src/simulation/habitat-navigation.test.ts` |
| **3D Collision & Geometry** | [`asset-evidence/aq58/3d-collision-review.md`](asset-evidence/aq58/3d-collision-review.md) | [`asset-evidence/aq58/README.md`](asset-evidence/aq58/README.md) | [`asset-evidence/aq58/`](asset-evidence/aq58/) |
| **Biological Asset Pipeline** | [`asset-contract.md`](asset-contract.md) | [`open-source-asset-and-motion-research.md`](open-source-asset-and-motion-research.md) | [`asset-pipeline-proof.md`](asset-pipeline-proof.md), [`asset-evidence/aq57/`](asset-evidence/aq57/) |
| **Fish Roster & Adult Scaling** | [`fish-scale-reference.md`](fish-scale-reference.md) | [`reef-fish-roster.md`](reef-fish-roster.md) | `src/rendering/scene/fish-scale.test.ts`, [AQ-60 initial spread proof](asset-evidence/aq60/spawn-review.json) |
| **Modular Corals & Rock Sockets**| [`modular-coral-and-live-rock-spec.md`](modular-coral-and-live-rock-spec.md)| [`socket-verification.md`](socket-verification.md) | [`asset-evidence/aq52-left-socket-report.json`](asset-evidence/aq52-left-socket-report.json), [AQ-53 mask runtime proof](asset-evidence/aq53/review.json), [AQ-42 displaced bounds](asset-evidence/aq42/displacement-bounds-review.json) |
| **2D Thumbnails & Cutouts** | [`fish-assets.md`](fish-assets.md) | [`fish-art-provenance.json`](fish-art-provenance.json) | `public/fish-art-provenance.json`  [AQ-66 thumbnail proof](asset-evidence/aq66/review.json) |
| **Homelab Services & Links** | [`service-mapping-review.md`](service-mapping-review.md) | [`requirements.md`](requirements.md) | Backlog `AQ-8` / `AQ-56` |
| **Read-Only Telemetry (Hardware)**| [`network-traffic-source.md`](network-traffic-source.md) | Server endpoints (`src/routes/api/telemetry/`) | `src/server/disk-capacity-math.test.ts` |
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
| [`modular-coral-and-live-rock-spec.md`](modular-coral-and-live-rock-spec.md) | **Canonical** | Binding | `AQ-14.3`, `AQ-42` | Technical specification for 8 modular coral archetypes and 2 live-rock foundations (left cave, right shelf). |
| [`behavior-runtime-contract.md`](behavior-runtime-contract.md) | **Canonical** | Binding | `AQ-44` | Engine-independent behavior state machine (swim, hover, dart, feed, rest, school, avoid, burst). |
| [`habitat-navigation-core-contract.md`](habitat-navigation-core-contract.md) | **Canonical** | Binding | `AQ-45` | Navigation contracts: spatial zones (open water, crevice, cave, substrate), waypoint steering, boundary clamps. |
| [`fish-scale-reference.md`](fish-scale-reference.md) | **Canonical** | Binding | `AQ-60` | Adult biological lengths and render scales for all 15 roster species (parsed by `fish-scale.test.ts`). |
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
| [AQ-70.12 sand functional review](asset-evidence/aq70-12/functional-review.json) | **Active** | Evidentiary | `AQ-70.12` | Real WebGL shader/phase comparisons; final sand art, physical grain and budgets remain open. |
| [AQ-70.14 caption/access review](asset-evidence/aq70-14/review.json) | **Complete** | Evidentiary | `AQ-70.14` | Both-viewport compact captions, native intercepted-label routing, keyboard/touch/modal access and exact PNGs. |
| [`code-review-findings.md`](code-review-findings.md) | **Active** | Evidentiary | `AQ-61` | Comprehensive codebase audit: runtime picking desync, mobile memory allocations, narrow-viewport navigation locks. |
| [`agent-change-audit.md`](agent-change-audit.md) | **Complete** | Evidentiary | `AQ-57` | Root audit of concurrent agent changes, rejected runtime experiments, and baseline restoration. |
| [AQ-58 fish player and clip-only review](asset-evidence/aq58/fish-player-review.json) | **Active** | Evidentiary | AQ-58 | Source-pinned clean-pose reset compatibility and conditional supplied clip-only spheres; main-scene collision remains open. |
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
