# Animated aquarium reference review

Reviewed in the actual Sketchfab viewer on November 3, 2026: [Virtual Aquarium ALL Fish Animated](https://sketchfab.com/3d-models/virtual-aquarium-all-fish-animated-8de6bc7d49c64649910a199e7405ecb6), by **Adam Prejean (@adamprejean)**, published July 6, 2022. This is an animation reference, not a project asset. No model download, reuse permission, or match to our 15-species catalog was established.

## Direct observations

The viewer rendered seven textured, volumetric fish against a plain blue field. Playback was running, could be paused, and the selected clip changed visibly between **Slow Swim**, **Fast Swim**, and **Look Left at User**. The menu also offered All Animations, Look Right at User, and Static Pose; the latter two were not individually evaluated. The page reports 14.2k triangles and 7.5k vertices; those are displayed metadata, not an independent mesh audit.

- The rear body, caudal peduncle, and tail change shape and orientation between playback frames. This is articulated swimming rather than a rigid image translating across the screen.
- Pectoral fins change their visible angle independently of the body silhouette. Long dorsal/anal fin outlines remain recognizable through the poses. Fine fin-ray deformation and exact stroke timing were not measurable at this viewer scale.
- The attention clip presents fish at oblique and near-frontal angles. Eyes, snouts, and body thickness remain readable as the fish yaw. This is a useful minimum check for our earlier projection proof, whose repeated side texture failed head-on.
- The fish stay grouped around approximately fixed display positions during the inspected swim loops. There is no demonstrated tank-wide navigation, natural habitat selection, schooling, collision avoidance, or sustained travel path.
- No reef, sand, shelter, anemone, perch, feeding surface, or geometry occlusion is visible. These clips provide no evidence of habitat interactions.
- Selecting Fast Swim verifies that an alternate gait clip exists. The review did not measure a biologically justified speed/frequency ratio or certify species-specific movement.

The page description says the original Unity experience responds to users tapping the glass. A tap-triggered startle/recovery response was **not** demonstrated in the inspected viewer. A named attention clip is not evidence that the interactive reaction itself works.

[Saved viewer capture](../design/sketchfab-motion-reference.png) documents the reference and selected attention clip. A still capture supports provenance and pose review; it is not a substitute for the playback inspection above.

## Application to this project

| Work | Concrete lesson and verification requirement |
| --- | --- |
| AQ-5 / AQ-40, asset and engine pipeline | Evaluate closed anatomy, eyes, snout, gill region, fin translucency and texture seams from both sides, oblique and head-on views. Use the same licensed assets and rigs across engine comparisons; engine choice alone establishes no visual quality. |
| AQ-12, lifelike swimming | Separate articulated local gait from world-space travel. Couple tail and pectoral movement to acceleration and turning, then blend between rest, cruise, and faster motion without snapping. The reference supplies visual ideas, not calibrated parameters. |
| AQ-13, click startle | Open the configured URL immediately in a new tab, then animate acceleration, an appropriate turn and recovery in the originating tank. Do not delay navigation until a clip ends. The reference's stated glass-tap behavior remains unverified. |
| AQ-18–AQ-32, all 15 species tasks | Use each task's biological references and typed profile to choose locomotion, habitat zone, and supported states. Do not assign one common loop or the reference's unidentified fish behavior to every species. Verify each model's all-angle anatomy and independent fin motion alongside its species-specific behavior. |
| AQ-34 / AQ-45, reef and habitat | Build and verify depth-aware obstacle avoidance, occlusion, shelter/perch/forage anchors separately. The reference does not demonstrate any of them. |

The reference is useful for articulation and readable turning. Our acceptance target additionally requires realistic materials, aquarium lighting, accurate species anatomy, navigation through a sharp reef, accessible service links, pause, and reduced-motion behavior.
