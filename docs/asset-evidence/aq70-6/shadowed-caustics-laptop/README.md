# AQ-70.6 shadowed caustics review

<!-- AGENT_DOC_METADATA
Category: Test Evidence
Status: Reviewed
Authority: Scoped verification
Backlog: AQ-70.6
Owner: @root
Updated: 2026-11-27
Upstream: ../../../rendering.md
Downstream: Caustic appearance and fixture review
-->

> [!NOTE]
> **Agent context.** The captures use the current default islands and center arch.

[Baseline](before.png) and [revised frame](after.png) share seed 2026, time 1.25, a 1440×900 DPR 1 viewport, and the five public example services. The revised [time 4.5 capture](phase-4.5.png) shows the changing highlights. The revised frame retains single irregular ridges on lit sand while the floor under rock shadows stays darker. All five inhabitants resolved, with zero failed assets and zero browser warnings or errors.

One warped cellular field defines the ridges. A second rotated sample varies the strength along those ridges. The shader derives an illumination gate from the already-evaluated direct diffuse, fades and filters with depth, and caps the addition at the existing configured maximum. Rock and coral use the same projection scale as sand and fish. Instanced geometry is projected from its rendered world position.

In the open sand rectangle from X 560–784 and Y 835–880, 2,216 of 10,350 pixels changed by at least five luma levels between the two revised phases. The actual Pause control produced two byte-identical settled frames. The first immediate frame approached the paused state while browser controls were settling. Fixture defaults, full material review, and hidden-page behavior remain open.

All 1,068 tests in 83 files, typecheck, and the production build passed.

## Sand ridge brightness — 2026-11-27

A sand-specific additive light cap of 0.60 gives the lit ridges more contrast against the aragonite. The shared clock, footprint, depth attenuation and fixture shadow gate remain in use. Other surfaces retain the 0.35 cap.

The matched desktop comparison uses the lower right reef, 1440×900 CSS pixels, DPR 1, seed 2026 and time 1.25. In the open sand rectangle x=690–909 and y=843–880, 1,027 of 8,360 pixels changed by more than one encoded luma level and the largest change was seven levels. A shaded sample below the right ledge, a reef-face area and an open-water area were pixel-identical. A capture at time 2.50 showed the moving pattern. Both accepted captures resolved 12 inhabitants with no failed assets or browser warnings and errors.

- [Matched sand comparison](sand-gain-comparison.png)
