---
id: AQ-47
title: Research cleaner-wrasse station interactions for a future reef roster
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
  - 'https://www.sciencedirect.com/science/article/pii/S1055790315002729'
  - 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5539144/'
documentation:
  - docs/fish-behavior-design.md
  - docs/reef-fish-roster.md
priority: low
type: spike
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current 15-species roster does not include an obligate cleaner wrasse, and the six-line wrasse is not an obligate station cleaner. Research cleaning-station behavior as an optional future species and multi-fish interaction, rather than adding it to the existing roster or individual animation tasks. Investigate true cleaner identity, station placement, client solicitation/inspection responses, partner compatibility with candidate roster fish, and how variable interaction endings should affect a visual choreography. Distinguish cited behavior from visual timing choices and verify asset sources and licenses individually.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The task identifies a true cleaner-wrasse candidate with biological sources and explicitly avoids treating the six-line wrasse as a cleaner.
- [x] #2 The review summarizes cleaner and client behaviors at a station, including variability in approach, solicitation, inspection, termination, departure, and recovery, and identifies which existing roster species could plausibly serve as clients or which evidence is insufficient.
- [x] #3 Any animation timing is framed as configurable visual pacing, not a universal 2-3 second biological rule; behaviors are not applied to the current 15 fish without evidence.
- [x] #4 Potential visual references/assets and their individual source and license status are recorded.
- [x] #5 The research recommends whether a future cleaner species and shared station interaction merit separate roster work; it does not add a production species or implement choreography.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify the obligate cleaner identity, station habitat, and documented client interaction sequence in primary research and aquarium or museum sources.
2. Distinguish observed cleaner/client behavior and species-specific evidence from proposed simulation choreography and configurable pacing.
3. Assess which fish from the existing 15-species roster have evidence as plausible clients; describe the six-line wrasse as an occasional facultative cleaner in limited contexts, not an obligate station cleaner or cleaner protagonist.
4. Check candidate visual references and individual licensing/asset limitations.
5. Record recommendation and testable future interaction requirements in a Backlog comment; do not modify roster, production profiles, or UI.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-03T18:59:00Z

---

Research summary for root review (2026-11-03):

**Candidate and station.** Use the bluestreak cleaner wrasse (*Labroides dimidiatus*) as the optional representative true cleaner: research explicitly identifies it as obligate, with a reef territory/home range and cleaning station where client fish visit. Florida FishBase reports reef-associated habitat, resident station keeping, client visits, and a greeting dance; the Waikīkī Aquarium describes client solicitation/holding still with fins or mouth/gill openings spread while the cleaner inspects the body and may enter mouth/gill spaces. Sources: https://pmc.ncbi.nlm.nih.gov/articles/PMC5413917/ ; https://www.fishbase.se/summary/Labroides-dimidiatus ; https://www.waikikiaquarium.org/experience/animal-guide/fishes/wrasses/hawaiian-cleaner-wrasse/ . The aquarium behavioral description is the Hawaiian cleaner wrasse *Labroides phthirophagus*, so it supports genus-level cleaner station choreography, not every detail of *L. dimidiatus*.

**Six-line correction.** The six-line wrasse (*Pseudocheilinus hexataenia*) is not an obligate/station-keeping cleaner and should not fill this role. A comparative study classifies it as a facultative cleaner that may clean occasionally, primarily as a juvenile; its sample recorded only two client interactions by one 6 cm individual. That is an important rare exception, not evidence for using the roster six-line as the cleaner protagonist. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC5413917/ .

**Sequence and variation.** Observed sequences vary: clients may signal with a stereotyped solicitation/incitation pose; cleaners can also initiate approach/inspection. Inspection surveys skin, gills, or buccal cavity. Client jolts can follow bites, and some dissatisfied clients chase the cleaner; resident clients may punish, while clients with access to alternative stations may switch partners. The station interaction is not a fixed-duration service. Source examples: in situ cleaner/client observations before/during/after disturbance recorded client solicitation, inspection, jolts, and retaliatory chases (https://pmc.ncbi.nlm.nih.gov/articles/PMC5539144/); cleaner/client conflict and escape behavior (https://pmc.ncbi.nlm.nih.gov/articles/PMC5413917/); broader client choice and partner switching (https://pmc.ncbi.nlm.nih.gov/articles/PMC10024986/). These sources support variable sequence outcomes; any simulator duration is a configurable visual pacing value only, not a universal 2–3 second biological rule.

**Roster client evidence.** The lyretail anthias already in the roster (*Pseudanthias squamipinnis*) is a verified candidate client: a field study specifically identifies it and black-and-white chromis (*Chromis dimidiata*) as client species with access to *L. dimidiatus*. Note our roster blue-green chromis is a different species, *Chromis viridis*, so do not transfer that evidence. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC2134928/ . I did not verify species-level *L. dimidiatus* client observations for the roster tangs, clownfish, other wrasses, butterflyfish, goby, blenny, cardinalfish, dragonet, or angelfish; broad evidence that many reef species visit stations is not enough to enable specific scripted clients. Client status also does not establish that the entire roster is ecologically or husbandry compatible.

**Optional future contract (not implemented):** proposed ID `bluestreak-cleaner-wrasse`; semantic anchor `cleaningStation` on a reef structure with a clear approach/inspection space. Interaction can model optional cleaner approach or client solicitation, client still/pose inspection, variable inspection path, then normal completion/departure, early client departure, or a jolt/chase followed by cleaner retreat. Return each actor to its own roaming/home behavior after a configurable visual recovery. Station occupancy, wait/decline behavior, client pose, inspection span, and recovery should be per-species/per-instance tuning; do not force the client pose onto unverified roster fish. A deterministic interaction test should cover both initiation directions, each ending path, station release, and return-to-roaming without overlapping actors or leaving a participant stuck. These are design/test implications, not cited universal behavioral rules.

**Visual references and rights:** Georgia Aquarium page gives a species-specific *L. dimidiatus* image/appearance and station summary, but no image reuse license found: reference only, https://www.georgiaaquarium.org/animal/bluestreak-cleaner-wrasse/ . REEF species page photo is credited to Paul Humann; no reuse license identified: reference only, https://www.reef.org/species/bluestreak-cleaner-wrasse . No verified, licensed full-body 3D production model was located; do not use an unlicensed reference image or 3D asset.

**Recommendation:** Advance a separately reviewed future roster/interactions proposal for *L. dimidiatus* only if the project wants multi-fish interactions. It adds a distinct station-mediated behavior but requires shared runtime support and explicit enabled client profiles; for the current evidence, only `lyretail-anthias` is enabled as a named client candidate, and no current roster behavior should be changed by this spike. Root review remains required; task stays In Progress.

---

author: @root
created: 2026-11-03T19:00:00Z

---

Root research review: source checks confirm obligate L. dimidiatus, rare facultative six-line exception, and exact named P. squamipinnis client evidence. Two wording corrections before final handoff: PMC2134928 tested wild-caught fish in treatment aquaria; describe a study of these named client species rather than a field observation of anthias cleaning. FishBase is not Florida FishBase. Adjust task description to say six-line is not an obligate station cleaner, preserving the rare facultative exception. Check only ACs verified and add concise final summary for root sign-off; no production changes.

---

created: 2026-11-03T19:02:00Z

---

Root review wording correction (2026-11-03): PMC2134928 tested wild-caught *Pseudanthias squamipinnis* and *Chromis dimidiata* in treatment aquaria with access to *Labroides dimidiatus*; this supports calling them named client species in that study, not saying it was a field observation of anthias cleaning. The roster blue-green chromis is *Chromis viridis*, so that evidence does not transfer. FishBase is not Florida FishBase; the source is cited simply as FishBase. Six-line wrasse description now states it is not an obligate station cleaner, preserving the study’s limited facultative-cleaner finding. Acceptance criteria 1–5 are checked from documented sources, variable interaction outcomes and inferred test contract, asset/license review, and future-only recommendation. Root review remains required before Done.

---

author: @root
created: 2026-11-03T19:10:00Z

---

Root accepts this bounded research deliverable after checking primary research PMC5413917 and PMC2134928 and reviewing the corrected source scope. All five research ACs are satisfied. Optional species/cleaning choreography remain future proposals, not enabled catalog or runtime behavior; no 3D reuse rights are inferred from reference photography.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Research recommends evaluating *Labroides dimidiatus* in a future roster and shared-interaction proposal, with station behavior modeled as variable visual choreography. A study in treatment aquaria identifies *Pseudanthias squamipinnis* among the named client species; other roster clients remain unverified. The six-line wrasse is not an obligate cleaner, despite limited reports of facultative juvenile cleaning. References, reuse limits, and test ideas are recorded. No production changes; root review is still required before Done.
<!-- SECTION:FINAL_SUMMARY:END -->
