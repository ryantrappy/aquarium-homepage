# Fish behavior runtime contract

`src/simulation/behavior-runtime.ts` is an engine-independent AQ-44 slice. It consumes the immutable species profiles from `src/lib/fish-behavior.ts` and stores state, timer, seed, target anchor, and deterministic tuning on each fish instance. The runtime does not own mesh deformation, locomotion, service launching, or scene lifecycle.

## Time and state

Call `advanceFishBehavior` with elapsed simulation seconds for one instance. It advances in 1/30-second fixed steps by default, caps catch-up at 0.25 seconds, and limits each call to at most 120 steps. Custom step and catch-up options must be finite, positive, and within that work bound. Time is ignored while paused or page-hidden. The first call after suspension only resumes the instance and clears its accumulator, preventing a hidden/paused interval from becoming a catch-up jump. The caller should still stop elapsed-time delivery while suspended; the runtime does not read `document.visibilityState` or subscribe to UI state. State durations are sampled deterministically from the profile range and the instance seed/entry index. Only transitions declared by that species profile are eligible.

Current profile-state mapping to adapter intent is `idle` → hold, `swim` → travel, `forage` → forage, `display` → display, `retreat` → flee, and `burst` → burst. A burst is the high-effort motion itself; the profile's declared completion transition returns the fish to cruise. Current profiles do not declare a separate recovery state. These are animation/motion cues only; the renderer remains responsible for mesh deformation and actual motion. New instances default to adult life stage. A profile's juvenile/subadult-only retreat transition is gated by the optional life-stage argument.

## Events

`fish-activation` includes one `instanceId`, so an activation event cannot affect other fish when passed through `dispatchBehaviorEvent`. `behavior-opportunity` provides similarly scoped forage/display opportunity triggers, and those events only enter states supported by that profile. Group and environment disturbances have separate explicit event types and may optionally name their intended instances. The caller still launches the configured service immediately; behavior dispatch is a separate, non-blocking side effect. AQ-13 integration is pending.

## Navigation adapter

`getNavigationRequest` returns the current state cue, semantic anchor, and per-instance generation only when that state declares a target compatible with the species profile. `requestNavigation` forwards that request to a typed adapter. The adapter resolves anchors and paths, then reports `arrived`, `blocked`, or `unavailable` with the request generation and anchor; it must not teleport fish or route them through solid geometry. State transitions and explicit replans increment the generation. A blocked/unavailable target is cleared while the fish holds its current state; `replanNavigation` retries only that state's declared target. The runtime never substitutes another anchor with different semantics. Stale outcomes from a prior request are ignored even when they use the same anchor type. Arrival at the declared retreat destination may trigger the profile's declared `refuge-reached` transition; arrival at another anchor cannot.

AQ-34 owns real anchor resolution, obstacle avoidance, and path movement. This module exposes the boundary for that integration but does not claim those scene behaviors are implemented.

## Optional per-fish extension scaffold (AQ-55)

`src/simulation/fish-extensions.ts` adds an optional typed extension layer around the existing FSM and renderer. `EMPTY_FISH_EXTENSIONS` is the default registry and contains no hooks. The app currently registers no behavior or animation content, so this scaffold by itself does not add or change a fish behavior.

An extension has a stable name and a `kind` of `behavior` or `animation`. Its `create(snapshot)` factory is called once per fish instance and returns a private controller; the controller may keep closure state and can release it from `dispose()`. Fish removal calls disposal once. Callbacks receive a frozen, detached snapshot of scalar fish state and a bounded simulation delta, never a mutable fish object, route, DOM element, or Three.js object.

Registry layers resolve in this order: shared `defaults`, the selected `species`, then the fish `instanceId`. Each layer declares explicit operations by extension name:

```ts
const extensions: FishExtensionConfig = {
  defaults: {
    pace: { operation: 'add', extension: myAnimationExtension },
  },
  species: {
    'yellow-tang': {
      pace: { operation: 'replace', extension: tangPaceExtension },
    },
  },
  instances: {
    'fish-7': {
      pace: { operation: 'disable' },
    },
  },
}
```

`add` requires that name to be absent; `replace` requires it to exist and keeps the name; `disable` removes it. A later layer may add a disabled name again. Invalid implicit adds/replacements throw instead of silently changing precedence. Entries run in locale-independent extension-name order for deterministic results.

Each runtime is bound to its initial fish and species IDs; a mismatched step snapshot is rejected. It copies and freezes snapshots even if the host passes mutable data. If setup fails, already-created controllers are disposed. Teardown attempts every controller and is idempotent even after errors; the scene reports teardown errors after releasing its fish resources.

Behavior callbacks can request only fish-scoped existing FSM cues (threat, high effort, forage opportunity, or display opportunity). The adapter stamps the owning instance ID, then existing profile transitions decide whether the cue is eligible. Extensions cannot request group/environment events, select anchors, create routes, teleport fish, alter service links, or write pose state. Animation callbacks may return only a finite `playbackRate` multiplier from `0.25` to `2`; the renderer applies it to its existing animation mixer update. Both hook kinds run only after the scene's existing pause, hidden-page, focus, and reduced-motion gates allow a simulation step. Service links continue to navigate immediately through the existing native anchors.

To opt into a registry in a host that owns scene setup, pass it as the final optional `fishExtensions` argument to `createAquarium(...)` (or the fifth argument to `createSwimmingFish(...)` in a motion adapter). Omitting the argument uses the empty registry. Defining a scaffold extension demonstrates a registration capability only; species-specific lifelike behavior, turning, or new animation content still requires separate implementation and review.

## Deterministic profile demo

Run `npm run behavior:demo` to print a developer-only trace for an ocellaris clownfish, yellow watchman goby, mandarin dragonet, blue-green chromis, and yellow tang. It lists timed state/event changes, requested anchors, and sampled/tuned speed values. The demo uses the independent runtime and a deterministic simulated navigation-arrival response; it does not create rendered fish or demonstrate locomotion fidelity.
