# Exported rock socket verification

AQ-52 adds an offline geometry check for the supplied Gemini rock assets. A socket name or a schema-valid inspection record is placement intent; it does not establish rock contact, support or clearance. This tool reads the exported GLB rather than accepting support radii from the existing packaging report.

From the repository root, with Node 26:

```sh
node src/rendering/assets/inspect-rock-sockets.ts \
  src/rendering/assets/corals/live-rock-island-left.glb \
  /tmp/left-rock-socket-report.json
```

Choose a fresh report path for each run. The command refuses to overwrite a report and does not write to the source GLB, model generators or existing asset inspection files. It records the exact input hash so a changed model requires a new inspection. A rejected socket or no supported sockets produces a nonzero exit status while retaining the report for review. Run the same command for the right island when its current export is ready.

The inspector must account for exported node transforms and actual triangles. It rejects unsupported input instead of interpreting missing geometry as clear water. Its report distinguishes verified mounts from rejected intents and records measurement settings and limitations. Finite footprint samples do not prove continuous support between samples or establish a whole colony's clearance. Assembly still needs the actual coral envelope and its own geometry checks.

This version tests a planar mounting disk using 5 mm sample spacing, a 2 mm contact tolerance and a 30° maximum sampled surface slope. Orientation is compared with the nearest triangle's geometric normal, which is facet-sensitive at shared vertices. Clearance uses an oriented cylinder starting 2 mm above contact, with radius and height equal to the requested clearance radius. These are explicit inspection settings, not biological measurements or approval of an arbitrary coral shape.

This is functional tooling, not visual model approval or a fish habitat generator. Gemini owns visual modeling. Route model issues through Backlog tasks labeled `modeling`; preserve the supplied visual design when making any necessary functional pipeline changes. No main-scene asset promotion follows from a passing schema or this standalone report.

The existing packaging script's assumed support allowances remain unverified until the active pipeline consumes measured evidence. AQ-52 stays open until that replacement and Root review are complete.

## Reviewed export snapshot

Root ran the geometry checks against the two supplied foundation exports. The [left report](asset-evidence/aq52-left-socket-report.json) rejects 12 of 12 socket intents after 2,383 footprint samples; the [right report](asset-evidence/aq52-right-socket-report.json) rejects 11 of 11 after 2,164 samples. Every socket origin touches the exported rock, but all fail orientation and planar-footprint checks under the settings above. Eleven per island also intersect the clearance cylinder.

These hash-pinned reports preserve the requested intents and actual measurements. They are conservative mounting-readiness results for those exact exports, not visual model rejection, a whole-colony fit check or a claim about a newer Gemini revision. Re-run the tool on updated exports. No model was edited and no socket was promoted for runtime use.
