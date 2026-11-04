<!-- Keep this header. Append brief handoff notes below, newest at the bottom, and trim stale entries when resolved. -->
<!-- Keep roughly the last 5 entries or ~100 lines max. Summarize what changed, verification run, and what remains. -->

### In the future do not worry about having it deployed until it is working well locally. I can handle the deployments once it is pushed. I want to ensure that everything is working before we worry about incremental deployments

### 2026-11-03 — Research handoff processed
- Asset budget remains **$0: verified CC0, CC-BY 4.0, or custom-made only**. No paid, NC, or ND assets. This and the local-first/user-deployment policy are now durable in AGENTS.md, docs/requirements.md and AQ-40.
- Reviewed and corrected docs/open-source-asset-and-motion-research.md. Original vs derivative mesh counts are separated. Candidate videos/timestamps are linked from AQ-18–AQ-32 and AQ-35 but remain unverified; no video-review criteria were checked just from supplied URLs.
- Optics, coral rigidity/soft tissue, particles and schooling proposals are linked to AQ-39/AQ-41/AQ-42/AQ-43. Unsupported universal biology, exact lighting/attenuation claims and unmeasured CPU timings were withdrawn or qualified as hypotheses. Apply effects only after scene-scale/source review.
- AQ-48 now tracks four rig-family directions; clown/tang technical revisions are under review, the other two remain provisional. AQ-14.3 tracks scan boundary/rock contact cleanup. Both use review-only derivatives outside git until accepted.

### 2026-11-03 — Moving main-scene milestone
- Commit eee0efc connects the actual Three.js main aquarium to native service links with per-instance travel, articulation, bounded frame clock, typed profile/state/navigation, pause/reduced motion, occlusion and alpha-aware artwork picking. Only clownfish and yellow tang have rigged assets; the other thirteen species remain correct-species artwork previews.
- Root verified 94 tests, typecheck, production build, a clean committed-source build, normal Vite dev hydration, both agreed viewports, native blank-target events, pause/reduced-motion freezes, Settings save/reload/removal and exact original three-example config restoration. GPU context loss retains usable native links. Hidden-state behavior is source/clock-tested, not deliberately browser-transition tested; full-roster performance is unproven.
- AQ-5/AQ-38 are Done as bounded engine/pipeline investigations. AQ-12/AQ-13/AQ-34 and realism/species/habitat tasks remain open. Coarse dead scan, approximate fins/materials and missing roster meshes do not meet final photorealism.
- No new deployment: user handles deployment after reviewed pushes. Leave unrelated docs/deployment 2.md and old local research artifacts untouched.
