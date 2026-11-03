---
id: AQ-12
title: Animate reef fish with photorealistic, species-aware swimming
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:15:00Z'
updated_date: '2026-11-03T12:39:00Z'
labels: []
dependencies:
  - AQ-5
references:
  - https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
  - AQ-34
  - AQ-35
  - AQ-36
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/fish-behavior-design.md
priority: high
type: enhancement
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The aquarium will succeed when fish look like living reef animals swimming through water, not cutouts sliding through a background. Build on the licensed asset and rendering direction in AQ-5. The current translating cutouts are scaffold only and do not satisfy this goal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At least two supported reef species show visible body deformation and coordinated fin and tail propulsion while swimming; rigid still-sprite translation alone does not count as completion.
- [ ] #2 Species have distinct swimming speed, body motion, turning and banking behavior, and acceleration that fit their real-fish references.
- [ ] #3 Fish integrate with tank lighting and apparent depth through believable scale, color, shading, and occlusion rather than looking pasted over the water.
- [ ] #4 During turns and depth changes, the fish remains inside the aquarium and its service label and clickable target remain readable and correctly associated.
- [ ] #5 Motion can be paused, stops when the page is hidden, honors reduced-motion preferences, and remains responsive with the supported fish count.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T04:47:00Z

---

New follow-ups: AQ-34 tracks true 3D reef depth/occlusion; AQ-35 tracks typed per-species behavior profiles across the 15-species roster; AQ-36 tracks a separate animation-reference review. AQ-12 status, assignee, and plan are unchanged.

---

author: @root
created: 2026-11-03T12:39:00Z

---

The reviewed behavior brief at docs/fish-behavior-design.md separates per-instance behavior state from species profiles and fish deformation/animation. Use it as guidance for AQ-12's shared swimming behavior; state runtime and anchor interaction work are tracked separately in AQ-44/AQ-45.

---
<!-- COMMENTS:END -->
