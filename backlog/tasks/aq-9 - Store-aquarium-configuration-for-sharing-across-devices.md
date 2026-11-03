---
id: AQ-9
title: Store aquarium configuration for sharing across devices
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T13:38:00Z'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
priority: medium
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Browser-local settings are sufficient for the first pass, but shared configuration will be needed to use the launcher from more than one device.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Service configuration can be read and updated through a shared storage mechanism.
- [x] #2 The configuration format preserves service name, URL, representation choice, and aquarium mode.
- [x] #3 The app handles unavailable shared storage with a clear user-facing error and does not silently discard edits.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent has reviewed the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Store a strict versioned reef-only envelope in a Node-only JSON file; preserve service ids, names, URLs, fishId choices, and example markers.
2. Expose same-origin GET/PUT plus explicit reset routes with content validation, atomic temp-file rename, a serialized write queue, and SHA-256 revision checks for stale writers.
3. Switch the client hook to the shared API, keep browser-local import/export as an explicit migration path, and make async failures visible without dropping form drafts.
4. Add isolated Node 24 Nitro/Docker deployment artifacts that bind only to loopback; document the existing Caddy/Authelia boundary and read-only server telemetry/service discovery.
5. Verify store conflict/recovery behavior, typecheck/build, and real HTTP persistence/conflict responses.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial implementation is underway: strict reef config schema, Node-only atomic JSON store, revision-checked API handlers, async shared client hook, server-store tests, and verified read-only inventory (Ubuntu 24.04; existing Docker/Caddy/Authelia/Uptime Kuma/InfluxDB/Scrutiny; hwmon, df/findmnt, and /proc/net/dev sources). TanStack official current docs reviewed; Nitro adapter selected.

Fixed React external-store error notifications by publishing immutable composite snapshots; added retryLoad. Shared CRUD/import/reset callbacks now return Promise<void> and resolve only after API persistence. Added same-origin write guard (Origin/Sec-Fetch-Site), tests for snapshot/error rerender contract, origin rejection, and network failure, plus migration/storage API notes in docs/deployment.md. Verification: npm run typecheck, npm test (17 tests), npm run build; real Node HTTP: GET 200 seeded reef config; PUT 200 persisted empty list; stale If-Match PUT 409 with latest config; cross-origin reset 403; restart GET returned persisted empty config/revision. ServiceManager must await these callbacks and expose retry; catalog agent coordinating UI changes.

Storage follow-up: reset now requires If-Match revision checks just like PUT; stale reset returns 409 and reloads current state in the client. A deliberately invoked reset can still repair invalid JSON, while ordinary I/O errors remain untouched. Verified npm run typecheck; 18 targeted tests passed across shared store, API origin guard, service snapshot, and service utilities; npm run build produced Nitro Node output.

Root-review follow-up: reset does not repair malformed JSON; readSharedConfig rejects it, reset propagates the unavailable error, and the original file stays untouched. Deployment guidance now says malformed or unreadable storage needs operator inspection and backup-based repair. Missing edit targets after another browser deletes the service now throw an explicit error before save; the ServiceManager's async catch leaves its draft fields intact. Added a pure state helper test; targeted suite passes 19/19, with typecheck passing.

Repair follow-up updated per root review: initial-load failure exposes explicit Restore examples through resetRequestForSnapshot; the client sends repairInvalid only when the snapshot has a loadError. The store allows that request only when reread proves the file is syntactically or schema invalid. If the current file is valid, a matching revision remains mandatory; ordinary I/O failures remain unavailable. Added store, request-shape, and initial-error-state coverage.

Local production HTTP recovery proof after the repair guard: with malformed JSON, GET /api/config returned 503 and preserved the invalid-file error; same-origin explicit POST {reset:true,repairInvalid:true} returned 200 with reef example config; follow-up GET returned 200 with matching revision. Local server and temporary directory were removed.

Root repair-flow iteration: resetServices now routes through resetSharedConfigForSnapshot(snapshot,revision), so it bypasses ordinary ensureLoaded only for the deliberate restore action. The helper sets repairInvalid only when the external-store snapshot has loadError; otherwise it requires a loaded revision. Store repair accepts only ConfigInvalidError after a fresh read; if the file became valid, a missing/stale revision returns 409 without overwrite. Added one client-path test invoking the exact reset helper used by the hook from an initial error snapshot and asserting repairInvalid request shape. Verification after UI integration: npm run typecheck; npm test (26 tests); npm run build. Built-server HTTP proof: corrupt file GET 503; explicit same-origin repair POST 200 with 3 examples; follow-up GET 200/matching revision. After saving a valid empty config, repair-without-If-Match returned 409 and a subsequent GET still had zero services. Temporary server and data removed.

Root review follow-up: the same-origin guard uses explicit REEF_PUBLIC_ORIGIN when configured (production deploy sets https://aquarium.ryantr.app) and falls back to the request URL locally; it does not trust forwarded headers. The recovery UI passed root's browser check (invalid config alert, explicit Restore examples repairs to 3 examples, fields re-enable/focus). Typecheck and all four targeted suites pass (27 tests). Build was intentionally deferred while root finalizes review.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T04:52:00Z

---

Root approves simple atomic JSON shared storage for this small configuration. Preserve current fishId representation and an explicit reef mode envelope, revision/conflict protection and user-visible failures without discarded form drafts. Existing Caddy/Authelia boundary should be reused for deployment; isolate a supported Node runtime in the new app container rather than changing the homelab global Node18. Foundation owns package manifests and root Vite/Nitro config now, renderer coordinates any future deps. Coordinate async CRUD/import callback types with UI picker owner so forms await server results and do not claim success prematurely. Read-only server inventory succeeded; do not install or reconfigure telemetry sources.

---

author: @Luna
created: 2026-11-03T12:36:00Z

---

AQ-9 backend/shared state implementation updated. The initial hook used the services array itself as useSyncExternalStore snapshot, so load/error-only updates did not change snapshot identity; this is fixed and covered by services-state tests. Root requested Promise<void> mutation callbacks that resolve only after server persistence, cross-origin write rejection, and root final review. Awaiting the catalog owner to finish ServiceManager async handling. HTTP evidence: GET 200; persisted PUT 200; stale write 409; cross-origin reset 403; restart GET retained saved config.

---

author: @Luna
created: 2026-11-03 12:42

---

Closed stale-reset overwrite path: POST /api/config now requires the current If-Match revision and returns the same 409 conflict payload as PUT. Added a store test proving stale reset leaves the newer JSON intact; explicit reset remains able to repair invalid JSON. Targeted typecheck/tests/build pass. Root review pending.

---

author: @root
created: 2026-11-03T12:43:00Z

---

Root review: reset implementation calls read() before writing, so corrupt JSON cannot be repaired by reset; notes currently claim the opposite. Keep safe behavior and correct documentation, or explicitly design and test a repair flow. Also after a conflict reload, updateService currently reports success for an id deleted in the other browser because map() matches nothing. Please reject a missing edit target with a clear message while preserving draft, and verify. Browser integration review follows catalog handoff.

---

author: @root
created: 2026-11-03T12:46:00Z

---

Root code review: async manager integration now awaits persistence and the immutable snapshot fixes error-only rendering. One recovery defect remains: the hook resetServices calls ensureLoaded, which rejects whenever initial config loading failed or loadError is set. Thus the Restore examples button shown for an invalid shared file cannot actually call the server repair path. Please make explicit repair reachable safely: no silent overwrite of valid configs, use a guarded revision or invalid-file-specific repair contract, and test the initial corrupt-file -> UI recovery path. Keep stale reset conflict protection. Root still needs browser verification of failed-save draft retention/retry before final acceptance.

---

author: @Luna
created: 2026-11-03 12:46

---

Addressed root review: reset now refuses malformed/unreadable files and deployment docs match that behavior; missing edit targets are rejected after conflict reload so the editor cannot falsely report a no-op update as saved. The error leaves the draft in the form. npm run typecheck and 19 targeted tests pass; final root review still pending.

---

author: @Luna
created: 2026-11-03 12:49

---

Latest recovery behavior: the UI's explicit Restore examples action can now repair a corrupt JSON/schema envelope after initial load fails. It sends a repair flag only for an error snapshot; server allows repair only after proving the file is invalid. Valid files still need the If-Match revision; inaccessible storage is not overwritten. Added tests for corrupt repair, valid-file guard, request flag, and error-snapshot recovery decision.

---

author: @Luna
created: 2026-11-03 12:50

---

Verified the initial corrupt-config recovery end to end against the built Nitro server: initial GET 503; explicit same-origin repair POST 200 (seeded 3 examples); subsequent GET 200 with matching revision. Temporary server and data were removed.

---

author: @Luna
created: 2026-11-03T12:55:00Z

---

Root latest review called out that restore could not repair on initial load failure. Confirmed current hook no longer gates resetServices on ensureLoaded; extracted resetSharedConfigForSnapshot so the hook and regression test use the same path. A snapshot with loadError sends explicit repairInvalid, while a readable snapshot requires its revision. The store fresh-reads before repair and only replaces ConfigInvalidError; a valid file with missing/stale revision conflicts. Added client-path regression coverage. Real built-server evidence: initial corrupt GET 503 -> explicit repair POST 200 -> follow-up GET 200; subsequent valid empty config resisted unversioned repair with 409 and remained empty. typecheck/test/build pass (26 tests); temporary files removed.

---

author: @Luna
created: 2026-11-03 13:19

---

Origin guard tested behind the selected HTTPS origin using explicit REEF_PUBLIC_ORIGIN instead of forwarded-header trust. Added deployment env and tests for configured HTTPS allow, attacker-origin rejection, and local fallback. Targeted tests 27/27 and typecheck pass. Root separately verified the corrupt-config UI recovery flow; build held until final root review.

---

author: @root
created: 2026-11-03T13:38:00Z

---

Root verified actual browser add/edit/delete persistence, second-client load, stale edit conflict with retained draft, offline save failure and reconnect retry. Isolated production corrupt-file fixture showed clear disabled form/error, explicit Restore examples repaired file and re-enabled controls. Config preserves version/mode/name/URL/fishId. Exact public-origin guard tests pass; no proxy-header trust. Typecheck, 39 tests and production build passed. Server deployment remains AQ10.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added shared versioned reef configuration through a revision-checked same-origin API and atomic JSON storage. Async forms retain drafts on failures; explicit invalid-file repair and stale edit/reset protection are verified. Production origin is configured explicitly for the approved deployment hostname.
<!-- SECTION:FINAL_SUMMARY:END -->
