# Habitat navigation core contract

`src/simulation/habitat-navigation.ts` is the engine-independent AQ-34 route-planning slice. It consumes the semantic `NavigationRequest` emitted by the behavior runtime and returns either a route or a stable `blocked` / `unavailable` result. The route planner never changes fish position, advances a fish, or assumes a navmesh.

## Inputs supplied by the scene adapter

- `waterBounds`: finite axis-aligned min/max water volume in scene units. The fish center remains at least its clearance radius inside each tank face.
- `obstacles`: at most 32 finite axis-aligned boxes representing hard, solid rock/coral volumes. Each box is inflated by the fish clearance radius before routing. Soft anemone habitat is not a hard obstacle and should not be added as one.
- `anchorLocations`: at most 128 real, scene-supplied positions. Each location has a stable ID and the typed `HabitatAnchor` category. An optional stable-species allowlist can further restrict use. The core never fabricates an anchor because a profile lists its type.
- `start` and `fishClearanceRadius`: finite position and non-negative body clearance in the same scene units.

The request is accepted only if its species profile enables the requested anchor and its current behavior state's configured target is that same anchor. An absent compatible location returns `unavailable`. Existing candidates outside the safe tank volume or inside a hard obstacle, or with no collision-free route, return `blocked`.

## Route planning and result handoff

The core builds a 3D visibility graph from the start, compatible supplied anchor locations, and clearance-offset corners of inflated obstacle boxes. When a corner falls outside the fish-safe tank volume, each coordinate is clipped to the nearest safe tank face and duplicate points are removed. Those face/edge waypoints allow a route around an obstacle that spans one tank axis while preserving a detour through another open axis. A truly separating wall still produces no route. The graph connects only segments that do not cross an obstacle interior, then finds a shortest route with deterministic Dijkstra search. The obstacle AABBs are conservatively expanded by the fish clearance radius. Input count limits bound graph size and work. A route result contains its points, length, selected location ID, and the originating instance ID, anchor type, and navigation generation.

The scene adapter advances along returned points using its selected engine. It reports route completion or failure to the behavior runtime with the same generation and anchor. Runtime generation checks reject stale outcomes when the fish has changed state or replanned, even when the new request uses the same anchor category. Failed routes do not switch to a different anchor meaning; the fish holds while the adapter decides when to replan.

## Current limits

This core uses conservative axis-aligned obstacle volumes and a 3D visibility graph. It does not model mesh triangles, dynamic obstacles, fish-to-fish avoidance, renderer occlusion, or fish deformation. AQ-5 still selects the rendering engine, so no production reef geometry or browser demonstration is wired here. Scene integration and viewport checks remain pending.
