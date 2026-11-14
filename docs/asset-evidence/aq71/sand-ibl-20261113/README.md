# Effective PMREM role strengths — Root review, 2026-11-13

Native Chrome captures at exact source `69cad24`, 1440×900 and 402×874 CSS pixels, DPR1. Fixed lookdev seed2026/time1.25/full-scene/labels off. Both snapshots ready, no pending/failed assets, eleven inhabitants. Final reload console warnings/errors: zero. Browser metrics reset and review tab closed.

The initial property-only change `df6227e` produced PNGs byte-identical to the `6be5dcc` AQ82 baseline, despite sand material intensity changing to0.2. The saved property-only snapshots/measurements preserve that diagnostic. Installed Three r187 WebGLRenderer substitutes scene.environmentIntensity when a PBR material has no explicit envMap. Shared PMREM is now bound directly to PBR roles, with scene-owned disposal; no extra map or per-frame convolution. Fish0.55, reef0.35, sand0.2, rear-water0.65; ACES0.80 and LED intensities unchanged. The backdrop was rebalanced after effective0 made it too dark.

Compare baseline PNGs at `../../aq82/current-origins-20261113/`. Identical foreground crops measured with `scripts/measure-capture-histograms.mjs`:

| View | Crop x,y,w,h | Before mean luminance | After mean luminance | After p90 |
|---|---|---:|---:|---:|
| Laptop |600,840,250,45|0.875452|0.718763|0.776769|
| Phone |230,810,150,40|0.883600|0.741830|0.791622|

These are encoded-pixel luminance statistics, not physical radiometry. Root visually accepts current two-size exposure: readable fish/coral, blue rear-water fill and bright sand with visible caustic detail instead of the former nearly white floor. This accepts AQ71 AC3 only. Final reference-matching art remains separate; no controlled frame-rate parity acceptance from frozen captures or incidental timing. AQ71 remains In Progress for AC4.

Exact source: 758 tests across66 files, 45 focused tests, typecheck including14 script checks, production build pass. No model changes or deployment.
