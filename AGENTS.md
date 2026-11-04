
<!-- BACKLOG.MD GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.55.3 -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**At the beginning of each conversation in this project, run `backlog instructions overview` before answering or taking action. Re-read it only if you have not read it yet in the current conversation.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Before task lifecycle actions, read the matching detailed guide:
- `backlog instructions task-creation` before creating or splitting tasks
- `backlog instructions task-execution` before planning, changing status or assignee, adding a plan or implementation notes, or implementing task work
- `backlog instructions task-finalization` before checking acceptance criteria, writing final summaries, or moving tasks to terminal statuses

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD GUIDELINES END -->

## Current project handoff

After reading all of `AGENTS.md` and its policies, read [`AGENT_TASKS.md`](AGENT_TASKS.md) for the current checkpoint and restart path. Backlog remains authoritative for acceptance criteria. Refresh the master at reviewed milestones or agent handoff, and have Root verify its facts before committing.

## Aquarium Homepage project guidance

- Read `docs/requirements.md` for the product goals and agreed scope.
- Use Backlog.md tasks as the durable work queue; create and update tasks with the CLI, not by editing task Markdown directly.
- Default to Luna with high reasoning effort for routine implementation; the root agent may select a stronger model for demanding work. Root review is required before any task is marked Done.
- Use Backlog.md as the iteration channel. The root agent records review findings on the active task with CLI comments or notes, and assigns the next iteration. Implementing agents read those entries, address them, and respond on the task until root review is satisfied. Before handoff, the implementing agent checks only acceptance criteria they verified and records objective evidence. Root performs the final review and marks Done only after the agent checks and all review feedback are complete. Track deferred, distinct work in separate tasks; keep routine fixes as feedback on the current task.
- Primary project goal: create a photorealistic, living reef aquarium with realistic fish swimming through almost the entire main view and serving as clickable links to configured services. This is the main success criterion; refine fish realism and the aquarium experience ahead of secondary dashboard or navigation UI.
- Use a sharp, front-on view of the water portion of a real reef tank with clear perspective, deep focus, live rock, coral, and sand. Do not use a blurry background or open-ocean vignette. Remove the page header, marketing title, and persistent service list from the main view; show the list only in a modal opened from a deliberate, compact Services button. Keep Pause and Settings compact and aquarium-themed.
- Keep responsive browser verification focused on two viewports only: 402×874 CSS pixels as the iPhone 18 Pro proxy (inferred by dividing Apple's 1206×2622 display resolution by 3) and 1440×900 for a normal laptop. Do not add or repeat a broad phone/tablet/device matrix unless the user asks; prior size measurements and review comments remain historical records.
- The OpenPencil design is an editable starting baseline and can evolve substantially. Current translating fish cutouts are scaffold only; do not describe them as completed lifelike animation. A still sprite sliding through the tank does not satisfy the realistic-fish goal.
- Preserve practical baseline behavior inside the aquarium experience: pause motion and settings must remain available and work. Aquarium telemetry may show read-only CPU temperature, disk capacity, and network traffic when configured; never invent live values or present them as service health monitoring.
- Do not add service health monitoring; it was not requested.
- Work locally until the aquarium works and looks right. Commit and push reviewed milestones; the user will handle deployment after pushes. Do not perform incremental server deployments.
- Asset budget is $0. Bundle only verified CC0, CC-BY 4.0, or custom-made visual assets; exclude paid, noncommercial, and no-derivatives assets. Keep attribution and derivative provenance with each imported asset. Software dependencies retain their own compatible open-source licenses.
- Prefer the user-managed Gemini agent for visual modeling and use its supplied models under `src/rendering/`. Codex may modify models or their supporting pipeline when necessary for functionality, while preserving Gemini's visual work and avoiding concurrent edits. Route model issues through new Backlog tasks labeled `modeling` so the Gemini agent can pick them up. Codex agents focus on integration, renderer behavior, asset validation, and testing; do not delegate competing visual model creation.
- If there are tasks in the agent_scratch.md file look at them and execute them as if they were sent directly to you from the user.
- At every startup/resume, read `agent_scratch.md` before choosing work. Mark each entry you inspect with a dated review note and its disposition (actioned, current policy, pending, or superseded); reviewed does not mean completed.
