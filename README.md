# Reef Control

A playful, reef-inspired launcher for services on your home network.

## Run locally

```sh
npm install
npm run dev
```

The app saves settings through its same-origin API to `.data/reef-config.json` on the Node server. A browser that can reach the same app instance sees the shared list. The first run serves three clearly labeled example shortcuts and does not probe their health. Existing browser-local settings are not copied automatically; use **Import list** in settings to migrate a previously exported JSON list.

The persisted envelope is versioned and reef-only: `{ "version": 1, "mode": "reef", "services": [...] }`. The server validates every write, serializes writes, and checks revisions so one browser cannot silently overwrite another browser's newer settings. The JSON file is stored outside the public assets. For deployment, see the isolated Docker setup and LAN-only reverse proxy described in [docs/deployment.md](docs/deployment.md).

The initial shortcuts are labeled examples. Their links use `trappserv.er` with example ports; they are placeholders and do not indicate that those services exist or are online. The launcher does not check service health.

## Design

The current editable OpenPencil design is [design/reef-control-v2.fig](design/reef-control-v2.fig), with the [main aquarium preview](design/reef-control-v2-preview.png), the [On the reef modal preview](design/reef-control-v2-modal-preview.png), and the [reproducible builder script](design/build-openpencil.js). The original concept remains in [design/reef-control.fig](design/reef-control.fig) with its [preview](design/reef-control-preview.png).

The builder was verified with OpenPencil CLI `@open-pencil/cli` version `0.16.0`. From the repository root, rebuild the artboard and preview with:

```sh
npm exec --yes --package=@open-pencil/cli@0.16.0 -- openpencil eval design/reef-control-v2.fig --stdin --write < design/build-openpencil.js
npm exec --yes --package=@open-pencil/cli@0.16.0 -- openpencil export design/reef-control-v2.fig --page 'Main aquarium' --format png --output design/reef-control-v2-preview.png
npm exec --yes --package=@open-pencil/cli@0.16.0 -- openpencil export design/reef-control-v2.fig --page 'On the reef modal' --format png --output design/reef-control-v2-modal-preview.png
```

The builder reads its image assets from relative `public/` paths, so these commands work from a repository checkout.

![Reef Control desktop design preview](design/reef-control-preview.png)

## Project checks

```sh
npm run typecheck
npm test
npm run build
```

For a production Node build, `npm run build` uses the Nitro Vite plugin and `npm start` serves `.output/server/index.mjs`. See [deployment notes](docs/deployment.md) before exposing it on a network.

## Continuous integration

Every pull request to `gemini_control` (and every push to it) runs the same checks in GitHub Actions (`.github/workflows/ci.yml`): `npm ci`, `npm run typecheck`, `npm run build`, and `npm test`. The `ci` check is a required status check on `gemini_control`, so a PR cannot be merged while it is failing — a repo admin enables that in GitHub under Settings → Branches → branch protection rule for `gemini_control` → "Require status checks to pass" → select `ci`. (AQ-90)

## Backlog

Project work is tracked in `backlog/` with the Backlog.md CLI. At the start of a work session, read all of [AGENTS.md](AGENTS.md), then [AGENT_TASKS.md](AGENT_TASKS.md) for the current checkpoint and task order. The active Backlog task is authoritative for its scope and acceptance criteria. Use `npm run backlog -- instructions overview`, `npm run backlog -- task list --plain`, `npm run backlog -- task view AQ-50 --plain`, and `npm run backlog -- task edit ...` to inspect or update work. Follow the dependency order in [AGENT_TASKS.md](AGENT_TASKS.md); mark tasks Done only after root review.

### Temporary Lead Handoff (`gemini_control` branch)

On the `gemini_control` branch, **Gemini Argon** acts as the short-term lead developer managing work while the Codex designated lead is out of tokens for a few days:

- **Task Status Policy**: Do not mark tasks as fully complete (`Done`). Instead, mark reviewed tasks as `gemini approved` and leave their status as `In Progress`.
- **Codex Return & Final Completion**: Only the Codex designated lead can move tasks to `Done` (completed). When the Codex lead returns and takes control back after Gemini Argon has worked for a while, it must check and review the `gemini approved` items first.

