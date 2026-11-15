# AQ-108 public showcase defaults — Root review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-108
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/requirements.md, docs/showcase-v1-finalization.md
Downstream: src/lib/services.ts, src/components/ServiceManager.tsx, src/components/ServiceDock.tsx, deploy/compose.yaml
-->

> **Agent Context & Authority** — Root accepted this source and laptop flow review. Task finalization additionally requires the completion commit and shared PR delivery. This is not acceptance of the remaining 19 showcase tasks or final aquarium art.

The reviewed source is pinned by [SHA-256](source-pins.json), isolated on private proof `f5746f3` over `7c08b43`. The new fixture configuration was `/tmp/aquarium-showcase-v1-config/aq108-f5746f3.json`; the original saved settings and deployment were not changed.

| Criterion | Objective Root evidence |
|---|---|
| Public defaults and reset | [Initial browser/API state](native/initial.json) contains Google, Wikipedia, GitHub, YouTube and Internet Archive, all marked examples. [Explicit reset](native/reset.json) returns HTTP 200 and restores those same five from the six-entry test list. Server fresh-store/reset tests pass. Shipped service defaults, form/import placeholders, Services footnote and Compose fallback contain no personal network hostname. Historical deployment records and saved user settings remain separate. |
| HTTPS prefix and editing | [Initial settings](native/settings-initial.jpg) shows the actual `https://` input value; [editing](native/edit-existing.json) preserves the configured Google URL. [Successful add](native/added.json) records the notice, six persisted entries and the reset prefix. Existing URL-validation tests remain intact. |
| Saved configuration preserved | [Reload](native/reload.json) retains the added `https://example.com/` shortcut. The client regression also preserves an existing personal-URL configuration unchanged; the server reader still uses defaults only for missing configuration or an explicit reset. No migration or real configuration write was introduced. |
| Review and delivery | [Focused checks](focused-tests.log): 35 tests across four files. [Typecheck](typecheck.log): TypeScript and 17 script syntax checks. [Production build](build.log) passes. [Compose resolution](compose-resolution.json) verifies the loopback port and exact public-origin default, plus explicit custom overrides. The completion commit and rolling PR are recorded on AQ-108. |

Root native review used only 1440×900 CSS pixels at DPR 1 in the in-app browser. The [Services modal](native/services.jpg) shows all five public examples and neutral navigation text; its [DOM record](native/services.txt) and [final captured warning/error log](native/console.json) are retained. The log is empty after final reload.

The first immediate post-click read preceded asynchronous save completion; [that transient record](native/add-before-settle.json) is retained and is not used as the accepted saved state. An early raw CDP PNG was clipped by the in-app browser's backing-scale capture behavior; accepted screenshots use the documented browser JPEG API and match the recorded CSS dialog bounds. The unused raw capture remains in `/tmp/aq108-root-review/native/`, not in the accepted visual evidence. No phone checks or deployment were performed.

Repository log copies trim trailing whitespace and extra EOF blank lines only; original stdout remains in `/tmp/aq108-root-review/`.
