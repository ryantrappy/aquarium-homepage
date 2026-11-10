---
id: AQ-16
title: Show remaining disk space in an aquarium top-off reservoir
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-03T04:25:00Z'
updated_date: '2026-11-08T04:47:00Z'
labels: []
dependencies: []
references:
  - docs/design.md
documentation:
  - docs/requirements.md
priority: '38'
type: feature
ordinal: 38
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an aquarium top-off reservoir whose level represents actual remaining disk capacity. Settings must allow the user to select one disk or aggregate all unique disks. Research a configurable integration source during implementation and keep the integration read-only; do not change server or disk configuration. This is read-only aquarium telemetry, not service health monitoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A selected single-disk scope shows actual free and total capacity and the corresponding remaining percentage.
- [ ] #2 An all-disks scope aggregates free and total capacity across unique disks and computes the percentage as summed free capacity divided by summed total capacity.
- [ ] #3 Duplicate mounts are not counted more than once in the aggregate, and the selected disk or aggregate scope is obvious to the user.
- [ ] #4 The reservoir is visually embedded as aquarium equipment rather than presented as a conventional dashboard card or overlay.
- [ ] #5 Unavailable and stale source data are identified clearly; no simulated or fabricated healthy-looking disk level is shown.
- [ ] #6 Reading telemetry does not modify server, disk, or mount configuration.
- [ ] #7 The reservoir water level physically corresponds to the remaining-space percentage: it is fuller when more free space remains and lowers as the disk fills.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Luna completes the task with high reasoning effort.
- [ ] #2 Root agent reviews the completed result before the task is marked Done.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reuse the reviewed host inventory and configure only explicit trusted read-only data-filesystem paths; never bind broad host roots or change mounts. 2. Consume completed AQ16.1 exact aggregation in a read-only stat/statfs adapter with stable configured selection IDs and per-sample filesystem identity deduplication; exclude unconfigured/system/pseudo scopes and report real stale/unavailable states. 3. Expose same-origin GET-only discovery/read API with exact byte strings, selected scope and weighted percentage, no client-controlled paths. 4. Integrate explicit disk/all-unique scope selection and a scene reservoir whose physical fill follows available capacity, preserving actual measurement timestamps and no fabricated data. 5. Root verifies source/data/visual/controls evidence before checking parent criteria or Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only source inventory on trappserv.er (2026-11-03): findmnt and df are available. Mounted local block filesystems include the root LVM ext4 volume (also shown as a duplicate /usr/share/hunspell submount), NVMe boot/EFI partitions, and mounted SATA ext3/ext4 data volumes under /media/internal; pseudo filesystems, snap loop images, Docker overlay mounts, and network namespace mounts are also visible and must be excluded. AQ16 adapter proposal: build candidates from the host mount table and block-device identity; count each eligible filesystem/device once (dedupe source/major:minor, normalize LVM subvolume suffixes), exclude pseudo/loop/overlay/snap/boot-only scopes as agreed, and obtain byte free/total via statfs/df on explicit read-only mount paths. Aggregate as sum(free)/sum(total), label the chosen scope, surface inaccessible/stale data. Avoid exposing a broad host-root mount just to inspect usage; make the required disk mount paths explicit and read-only. No mount or server config was changed.

Bounded math packet AQ16.1 is Root-reviewed Done. Parent still needs actual read-only source adapter/API/settings/reservoir and live-source evidence. No mount/server/deployment changes have been made.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-03T19:11:00Z

---

Read-only inventory/source proposal on trappserv.er (2026-11-03 19:10 UTC): `findmnt`/`lsblk` and `df -B1 -T` show nine mounted data filesystems on distinct whole disks (`/media/internal/...`, `/dev/sda1` through `/dev/sdj1` with sdf unused for data); sizes round to 2, 3, 4, 6, 12, and 14 TB classes. Current free-space examples range from about 0.25 GB on `/media/internal/threeTB` (reported 100% used) to 6.4 TB on `/media/internal/twelveTb`. Root is a 488 GB ext4 LVM filesystem on the system NVMe, with about 39.7 GB free; `/boot` and `/boot/efi` are separate system partitions and should not be offered as data disks. `/var/snap/firefox/common/host-hunspell` resolves to the same root LVM major:minor and source subdirectory as `/`, so it must not be counted twice. Loop/snap, pseudo, swap, Docker overlay/bridge mounts are not capacity candidates.

Proposed next integration (not implemented): provide explicit read-only binds for chosen filesystem paths, including a non-root directory on the root filesystem if root capacity is offered; do not bind `/` or broad `/media/internal` just for statfs. Keep a stable mount-ID/label per configured scope, dedupe by filesystem source plus major:minor (and normalize bind/subvolume paths), obtain byte totals/free via statfs for each unique eligible mounted filesystem, and aggregate summed free / summed total. Keep boot/EFI, swap, loops, pseudo filesystems, and container mounts out of selection. No host mount or server config was changed.

---
<!-- COMMENTS:END -->
