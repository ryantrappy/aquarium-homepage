---
id: AQ-46
title: Research moray and garden eel options for a future reef roster
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03T12:38:00Z'
updated_date: '2026-11-05 13:09'
labels:
  - gemini-research
dependencies: []
references:
  - docs/fish-behavior-design.md
  - 'https://pubmed.ncbi.nlm.nih.gov/15107438/'
  - 'https://www.flaquarium.org/explore/habitats/shorelines/garden-eel/'
  - >-
    https://www.calacademy.org/learn-explore/creature-closeups/spotted-garden-eel
  - 'https://www.flaquarium.org/explore/habitats/coral-reefs/moray-eel/'
documentation:
  - docs/fish-behavior-design.md
  - docs/reef-fish-roster.md
priority: low
type: spike
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The behavior proposal suggests eel-like fish, but the approved target is the existing 15-species roster. Research moray and garden eels only as optional future additions; do not add species or IDs to the production catalog in this task. Compare the distinct morphology, habitat, locomotion, and plausible anchor interactions of a reef-sheltering moray and a sand-dwelling garden eel. In particular, do not collapse them into one generic eel spline or treat ventilation mouth-gaping as aggression. Cite verified biological sources and investigate candidate visual assets and their specific licensing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The research distinguishes moray and garden eel morphology, habitat, locomotion, and refuges with species-level sources; it does not assert a single generic eel behavior.
- [x] #2 Garden-eel behavior is represented as tail-first burrow residence and swaying/emergence with a tunable exposed-body presentation, while moray behavior uses a reef crevice refuge and body waves during swimming; mouth opening is identified as ventilation where supported.
- [x] #3 The review proposes separate stable IDs, habitat anchors, and animation implications for each candidate, or documents why either should be deferred; no fixed universal buried-time percentage or exact behavior duration is invented.
- [x] #4 Potential visual references/assets and their individual source and license status are recorded.
- [x] #5 The final recommendation covers whether to add either candidate in a future roster iteration, with rationale; this research task does not change the current 15-species catalog.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify moray and garden eel behavior from primary aquarium, museum, and research sources at species level.
2. Separate documented morphology, habitat, refuge, locomotion, and mouth/feeding behavior from animation inference; avoid universal timing or buried-time percentages.
3. Review representative visual references and record each asset source and license status without assuming reuse rights.
4. Recommend distinct optional stable IDs, compatible habitat anchors, behavior implications, and whether to defer each candidate.
5. Record evidence and limits in Backlog comments; do not change the current 15-species catalog.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-03T18:58:00Z

---

Research summary for root review (2026-11-03):

**Documented biology.** Use *Heteroconger hassi* (spotted garden eel) as the precise garden-eel candidate. California Academy of Sciences describes its slim, straw-like shape, colonies over current-exposed sandy bottoms, tail-first withdrawal, and zooplankton feeding; OIST reports posterior body anchored in a self-made burrow and flow-dependent adjustment of exposed length/posture. Its 0.25 m/s full-retreat result is from a specific lab flume, not a universal threshold or timing rule. A 2007 morphology study of *H. hassi* and *H. longissimus* describes a reduced, reinforced pointed caudal tool associated with tail-first burrowing. Sources: https://www.calacademy.org/learn-explore/creature-closeups/spotted-garden-eel ; https://www.oist.jp/news-center/news/2022/7/20/going-against-flow-scientists-reveal-garden-eels-unique-way-feeding ; https://marineinfo.org/nl/imis?module=ref&refid=280852 .

Use *Gymnothorax funebris* (green moray) as the reef-sheltering candidate. Florida Museum documents its elongated body, extended dorsal fin/small caudal fin, daytime residence in rocky crevices, nocturnal foraging, and continuous mouth opening/closing to pump water for respiration. Aquarium of the Pacific provides general moray context (California moray, *G. mordax*), but should not be treated as species-level evidence. Sources: https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/green-moray/ ; https://www.aquariumofpacific.org/onlinelearningcenter/species/california_moray . The proposed moray traveling body wave is an animation inference from anguilliform locomotion research, not a measured *G. funebris* gait reference: https://pmc.ncbi.nlm.nih.gov/articles/PMC2981590/ .

**Optional profile concepts (not production IDs):** `spotted-garden-eel` with `sandBurrowEntrance` plus current-facing orientation; keep tail fixed below sand, expose a configurable upper-body span, sway/bend with current, and use short plankton strikes. Alarm retreat is tail-first into the same anchor. Do not animate free swimming as the normal state. `green-moray-eel` with `reefCrevice`; daytime state shows head/short body section at the opening, with gentle respiration mouth motion; a separate low-frequency exploratory swim uses a traveling lateral body wave and returns to a crevice. Never encode respiration gape as threat or aggression. These distinct anchors and behaviors are visual inferences consistent with the cited biology. Do not assign fixed buried proportions, feeding intervals, emergence times, or swim durations.

**Assets/license review:** California Academy page has an image credited © Pelican and no reuse license identified; reference only. Florida Museum green moray page image is credited © Keri Wilk and no reuse license identified; reference only. Florida Museum Sketchfab item “Neurocranium of a Green Moray Eel” is a skull scan, not an animatable body, and its premium/download license could not be verified: https://sketchfab.com/3d-models/neurocranium-of-a-green-moray-eel-ed16a82d538b431ebb68307cfff5fd15 . No verified, licensed full-body garden eel or green moray production asset found. Do not reuse any of these without rights review.

**Recommendation:** Preserve the current 15-species roster. If future work has distinct sandy burrow habitat and licensed body assets, prioritize *H. hassi* as a highly legible, behaviorally distinct addition. Defer *G. funebris* until a suitable large elongated body and reef crevice can be represented well; the biology is viable but the asset/scene fit is not yet established. Root review remains required before task completion.

---

author: @root
created: 2026-11-03T19:00:00Z

---

Root checked OIST H. hassi flume summary and Florida Museum G. funebris species profile: distinct habitat and body forms, study-specific flow finding, and ventilation interpretation are supported. Asset reuse limits and future-only recommendation are clear. Please check verified research ACs and add a concise final summary for root sign-off; keep current roster unchanged.

---

created: 2026-11-03T19:01:00Z

---

Root review follow-up (2026-11-03): acceptance criteria 2–5 are checked based on the sources, separate optional IDs/anchors and animation implications, specific visual asset/license notes, and future-only recommendation. Criterion 1 remains unchecked: I found species-level morphology, habitat/refuge, and garden-eel behavior sources, but did not verify a *Gymnothorax funebris*-specific locomotion study; the moray body-wave proposal is explicitly an inference from general anguilliform locomotion.

---

author: @root
created: 2026-11-03T19:15:00Z

---

Root accepts the bounded future-roster research after reviewing species-level OIST H. hassi feeding/burrow evidence and Florida Museum G. funebris morphology, crevice/nocturnal activity and respiration evidence. AC1 is satisfied by distinguishing those sourced species facts and explicitly labeling the moray body-wave animation as a broader anguilliform inference, rather than claiming measured G. funebris kinematics. That evidence gap is retained in the defer-moray recommendation. No gait timing, production species, model reuse rights or implementation is approved by this closure.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Research supports *Heteroconger hassi* as the higher-priority future candidate for its tail-first burrow and current-adjusted feeding posture; *Gymnothorax funebris* remains a distinct crevice-dwelling candidate, with its traveling swimming wave treated as an anguilliform animation inference rather than a directly measured species gait. Visual references and reuse limits are documented. No roster change; root review is still required before Done.
<!-- SECTION:FINAL_SUMMARY:END -->
