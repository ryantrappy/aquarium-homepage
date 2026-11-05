# Reef Control design notes

<!-- AGENT_DOC_METADATA
Category: Archive / Design Notes
Status: Superseded
Authority: Historical Reference (Superseded by docs/requirements.md & docs/design-principles.md)
Backlog: AQ-2, AQ-14
Owner: @root
Updated: 2026-11-05
Upstream: docs/requirements.md
Downstream: None
-->

> [!WARNING]
> **Superseded Document**  
> The early two-panel dashboard layout described in this note is superseded by the living photorealistic reef aquarium direction.  
> Refer to [`docs/requirements.md`](requirements.md) and [`docs/design-principles.md`](design-principles.md) for canonical guidance.

## Superseding direction — 2026-11-02

The first-pass composition documented below is a historical draft and remains a record of the earlier AQ-2 implementation. It is superseded as the product direction by the user's clarified priority: this homepage should be a highly creative, cool experience that feels like an actual fish tank. Realistic fish swimming should fill almost the entire main view.

Keep persistent UI to three compact aquarium controls: Services, Pause, and Settings. The Services button opens a named modal with the searchable service list; Settings opens a separate modal for service changes. The fish themselves remain clickable shortcuts. A large marketing headline, fixed searchable dock, branding, or footer should not take over the scene. Preserve keyboard and reduced-motion behavior. The tank environment is photorealistic; fish still use cutout assets with the existing simple movement scaffold, and lifelike species-aware locomotion remains tracked in AQ-12.

### Current layout

```text
┌──────────────────────────────────────────────────────────────┐
│               full-viewport front-on reef tank               │
│                                                  Services     │
│                                          Pause   Settings     │
│     named clickable fish move inside the tank water          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Services opens: On the reef · search · service links · Manage
Manage transitions to the existing separate settings dialog.
```

The aquarium image is the full viewport, with no marketing copy or permanent service list. The new front-on tank plate shows a visible water surface, crisp coral/live rock, and sand. Fish occupy bounded water areas and keep their named link labels. The list is only available after opening Services; its Manage action closes that dialog before opening the CRUD settings dialog. Both dialogs restore focus to their opener.

Future aquarium telemetry should appear as equipment embedded in the tank, not conventional dashboard overlays: a heater thermometer for real CPU temperature from a selected server/sensor; a top-off reservoir for remaining disk space with a single-disk or unique-disk aggregate scope; and a pump gear/flow element for actual ingress and egress rates from a selected network interface/source. The aggregate disk percentage must be weighted by total capacity and duplicate mounts must not be counted twice. Make the selected scope clear. Research a configurable data source during implementation; show unavailable or stale measurements honestly, never fake a healthy value, and keep all telemetry read-only. These indicators do not constitute service health monitoring.

## Earlier first-pass design draft (superseded 2026-11-02)

The following brief, visual system, layout, and review notes document the earlier AQ-2 direction and implementation. They are retained as historical context, not as the current target composition.

### Design brief

Reef Control turns the `trappserv.er` homelab into a small reef aquarium. Configured services are real links; each link is paired with a named, species-specific fish. The aquarium gives the page its character, while a stable searchable service dock keeps every shortcut easy to find. Example links are marked as examples, and the page reports no live health or temperature data.

### Visual system

| Token | Value | Use |
| --- | --- | --- |
| Trench | `#071b22` | Page and deep-water base |
| Deep water | `#10343a` | Scene fallback and management surface |
| Kelp | `#164a49` | Secondary reef surface |
| Lagoon | `#0e6d68` | Interactive emphasis |
| Seafoam | `#c7e7d0` | Text highlights and focus ring |
| Coral | `#f2a67e` | Small warm controls and example cue |
| Sand | `#e9d9bf` | Reserved for future detail |

The title uses a rounded system stack (`ui-rounded`, Trebuchet, system UI); the interface uses a quiet humanist system sans stack. The page is left aligned and uses sentence case. The photo carries most of the visual weight; labels and controls remain restrained so they do not compete with the fish.

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ reefcontrol                         Pause motion    Settings │
├──────────────────────────────────────────────────────────────┤
│  your homelab reef                                            │
│  Everything                 [species-correct fish, swimming] │
│  in its element.                                              │
│  A little reef for the things                                  │
│  that keep your home running.                                  │
├──────────────────────────────────────────────────────────────┤
│ On the reef          [Find a service]   [Manage services]     │
│  fish  Name · species                   fish  Name · species  │
│  fish  Name · species                   fish  Name · species  │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

The desktop hero is a broad ~600px panoramic reef with a calm dark-water center and coral at the edges. The title occupies the left; interactive fish swim in reserved open water to its right. A low two-column list anchors the app beneath the scene, with search and management actions always visible. On narrow screens the fish stay below and to the right of the title, and the dock becomes a single column. Service management opens in a native modal dialog with a list, add/edit form, and import/export actions.

### Principles and review

- Make the realistic generated reef image and lifelike fish cutouts the one memorable gesture. Keep navigation and configuration quiet.
- Every fish is an actual service link with its service name, catalog species, keyboard focus, and example state available in text. The dock remains searchable if a fish label is hard to read or fish overlap at higher service counts.
- Constrain randomized movement to open water, and let users pause it. `prefers-reduced-motion` disables fish movement by default.
- Preserve working shortcuts during recovery: malformed saved settings can be imported or restored to examples, and CRUD errors are shown beside the form.
- Keep the example state honest. Defaults are clearly labeled sample URLs; the interface does not infer uptime, aquarium telemetry, or other service status.

During implementation, the first scene draft placed only six fish in fixed slots. Review showed that this obscured the user's request for randomized movement and could hide valid services. The scene now measures its own bounds, places every configured shortcut in an adaptive grid, and gives each fish a small randomized path contained within its grid cell. Larger schools use smaller cutouts and labels; the dock remains the complete, stable index. Mobile placement reserves the title area and keeps each fish inside the scene.

### Asset provenance

The new front-on reef-tank environment and five transparent fish cutouts were generated specifically for this project using OpenAI's built-in ImageGen on 2026-11-02. The tank prompt used the supplied aquarium photo only as broad composition reference; its tank, coral arrangement, equipment, and surroundings were not reproduced. The original image has no baked-in fish, labels, or equipment. Fish prompts named the catalog species: Ocellaris clownfish (*Amphiprion ocellaris*), yellow tang (*Zebrasoma flavescens*), royal gramma (*Gramma loreto*), blue tang (*Paracanthurus hepatus*), and Banggai cardinalfish (*Pterapogon kauderni*). The initial royal-gramma and blue-tang output files were swapped during export; their visual contents were checked and filenames corrected before compression. Assets are project-owned generated images. The served tank environment is `public/reef-tank-front.webp`; the prior background remains as `public/reef-background.webp` during this design review. Fish are transparent 600px-wide WebP cutouts.
