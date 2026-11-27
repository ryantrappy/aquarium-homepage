# Yellow watchman goby surface review

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.8
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/fish-flex-material.ts
-->

The saved watchman goby includes both dorsal fins, blue spots in the base color map, and a benthic swim clip. Its current visible flank still reads as a nearly solid, glossy yellow in the fixed laptop close-up. The species material now reduces the strongest coat and sheen reflections and increases the base roughness applied to its authored roughness map. The texture, geometry, scale, and motion remain supplied by the same export.

The brightest encoded luma among changed fish pixels falls from 250.00 to 232.71. The 95th percentile falls from 181.98 to 177.96. The 3,184 changed pixels in the fish sample cover the rectangle x=475–605 and y=422–476. One pixel outside that rectangle differs by a single RGB level. The luma figure describes the fixed rendered image and uses weights 0.2126, 0.7152 and 0.0722. The spots remain faint and the anatomy, including the fin silhouette, needs a separate visual review.

- [Before](goby-before.png)
- [After](goby-after.png)
- [Capture state](capture.json)

The paired captures use 1440×900 CSS pixels at DPR 1, seed 2026 and time 1.25. The after view used base `dc59fe2` plus the material changes in `fish-flex-material.ts`, SHA-256 `c9bbd7290561a69b8cd770ec3d6b4f12e7d05ea2554ef453655fee25f80940ff`. The unchanged runtime goby GLB SHA-256 is `b825b3da057c1a39234756b85a69c7b877d5e4c264e3f26fa38f587bdbedfd5e`.

## Watchman goby markings

The cooler spots in the current atlas were difficult to distinguish against the surrounding yellow at in-tank scale. The associated material now enhances cool pigment within the mapped cheek, flank and dorsal region. The yellow tail and underside retain their original material response. The current GLB and animation still have the hash above.

The matched macro frames use the current review reef, 1440×900 CSS pixels at DPR 1, seed 2026 and times 1.25 and 3.00. At time 1.25, 470 pixels changed by more than one RGB level, all within the goby crop. The largest channel change was 30 levels. The sampled tail rectangle matched exactly in both comparisons. The pose checks reported no asset failures or console warnings or errors. Fin anatomy and broader material acceptance remain open.

- [Matched goby spot comparison](spot-comparison.png)
