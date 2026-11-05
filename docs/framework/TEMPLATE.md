# Document Title

<!-- AGENT_DOC_METADATA
Category: [Governance | Specification | Architecture | Evidence | Runbook | Research | Archive]
Status: [Canonical | Active | Candidate | Historical | Superseded]
Authority: [Binding | Active | Evidentiary | Operational | Informational | Historical]
Backlog: [AQ-XX | None]
Owner: [@role]
Updated: YYYY-MM-DD
Upstream: [Comma-separated upstream documents, requirements, or Backlog tasks]
Downstream: [Comma-separated downstream source files, tests, or dependent documents]
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: [e.g. Specification / Contract]
> - **Status**: [e.g. Canonical / Active]
> - **Authority**: [e.g. Binding]
> - **Backlog Reference**: `AQ-XX`
> - **Summary**: [Concise 1-2 sentence description of the technical purpose and scope of this document.]

---

## 1. Scope & Objective

State the exact technical scope, objective, and problem this document solves. Differentiate what is in scope versus out of scope.

---

## 2. Technical Specification / Design

Detail the architectural decisions, math formulas, schemas, interfaces, or contracts here.

```typescript
// Include explicit code snippets, type definitions, or schema definitions where applicable
export interface ExampleContract {
  id: string;
  value: number;
}
```

---

## 3. Verification & Acceptance Criteria

Specify how an agent or automated check verifies compliance with this document:
- Unit test commands (e.g., `npx vitest run src/...`)
- Fixture files or evidence reports
- Exact metrics or limits

---

## 4. Dependencies & Consumers

- **Upstream Tasks / Contracts**:
  - [`docs/requirements.md`](requirements.md)
- **Downstream Implementations / Consumers**:
  - [`src/example/file.ts`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/example/file.ts)
  - [`src/example/file.test.ts`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/example/file.test.ts)

---

## 5. Revision & Review History

| Date | Agent / Author | Backlog Task | Summary of Changes |
|---|---|---|---|
| YYYY-MM-DD | @role | AQ-XX | Initial creation |

