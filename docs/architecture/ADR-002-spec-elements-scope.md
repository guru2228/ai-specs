# Architecture Recommendation — Minimal vs. Conditional vs. Optional Elements

*(Agent, AgentWorkflow, KnowledgeBase CRDs across six architectural contexts)*

## 0) Purpose & Scope

This document recommends which elements of your three specs are **Minimal (must have)**, **Conditional (required if you select a capability or posture)**, or **Optional (nice-to-have)** across six viewpoints:

* **Design** (authoring & intent)
* **Build** (wiring & provisioning)
* **Operate** (runtime controls & SRE)
* **Catalog** (discovery & marketplace)
* **Govern** (ownership, risk, compliance)
* **Interoperate** (A2A/MCP/KB connectivity)

Where relevant, we cite your CRDs to show what is **schema-required** vs. **policy-driven**.

---

## 1) Agent (Agent CRD)

### 1.1 Recommendations by View

| View             | Minimal (must have)                                  | Conditional (when you choose X)                                                                                                                                          | Optional                                                       | Rationale                                                                                                                                                                         |                                                                                                   |
| ---------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Design**       | `role`, `goal`, `systemPrompt`, `llm.model`          | `promptTemplateRef` (if externalizing prompt), `ioConfig.inputs/outputs` (if non-text I/O), `behavior/responseFormat` (if structured output)                             | `persona.*`, additional `behavior.*`                           | Core authoring intent and a concrete model are mandatory per CRD (`spec.required` includes `role`, `goal`, `systemPrompt`, `llm`; `llm.required: [model]`).                       |                                                                                                   |
| **Build**        | `llm` with **either** `provider` **or** `gatewayRef` | `llmGateways` (if you set `gatewayRef`), `mcpServers` + `tools[].mcp.serverRef` (if using tools), `knowledgeBases[]` (if using RAG), `secretsProvider` (if you adopt it) | `api.*`                                                        | The CRD enforces “provider OR gatewayRef,” and validates gatewayRef against `llmGateways`. Tools must resolve to an MCP server (URN/UUID). KB bindings only if agent uses RAG.    |                                                                                                   |
| **Operate**      | `context.environment`                                | `ops.*` (timeouts/retries/rateLimit/resources) when SLOs/quotas exist; `stateManagement.*` if sessions/memory needed; `telemetry.*` if tracing/log redaction mandated    | —                                                              | Env scoping prevents cross-env drift; ops/telemetry/state are posture-driven (scale, reliability, privacy).                                                                       |                                                                                                   |
| **Catalog**      | —                                                    | \`identity.(urn                                                                                                                                                          | uuid)`+`displayName/version\` when you want registry/discovery | `labels/tags`                                                                                                                                                                     | Catalogs need stable identity; runtime does not. Identity is validated if present (URN or UUID).  |
| **Govern**       | `ownership.team`                                     | `securityConfig.guardrails/evaluations`, `security.rbac/egress`, `telemetry.logs.redaction` when handling PHI/PII or gated releases                                      | `community/license` (if used)                                  | Ownership is required by CRD; additional guardrails become mandatory under risk/compliance postures.                                                                              |                                                                                                   |
| **Interoperate** | —                                                    | `a2a.*` (if participating in A2A), `tools/mcpServers` (if MCP), `knowledgeBases` (if RAG)                                                                                | `api.endpoints`                                                | Integration fields become required once you opt into A2A/MCP/KB patterns and must satisfy cross-object validations.                                                               |                                                                                                   |

### 1.2 Enforcement & Cross-Field Rules (why the above is “Minimal/Conditional”)

* **Agent core fields** are schema-required: `ownership`, `role`, `goal`, `systemPrompt`, `llm`.&#x20;
* **LLM**: `model` is required; you must provide **either** `provider` or `gatewayRef`. &#x20;
* **Gateway references** must match an entry in `llmGateways`.&#x20;
* **MCP tools** must reference an existing `mcpServers` entry by URN/UUID.&#x20;
* **Environment** is a first-class enum (`playground|dev|test|stage|prod`)—treat as part of minimal operational hygiene.&#x20;

---

## 2) AgentWorkflow (Workflow CRD)

### 2.1 Recommendations by View

| View             | Minimal (must have)                                         | Conditional (when you choose X)                                                                                                                                                       | Optional                                                | Rationale                                                                                                         |                                                                 |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Design**       | `topology.mode`, at least one `steps[].{name, task}`        | `steps[].agentAlias` **or** `steps[].agentRef` (each step must have a performer); `dependencies` for `Network/Aggregate`; `loopConfig` for `Loop`                                     | `variables`, `artifacts`                                | CRD requires `topology.mode` & `steps` with `name`+`task`; validations enforce performer/dependency integrity.    |                                                                 |
| **Build**        | Participants **or** `inlineOrchestrator.spec`               | `participants[].agentRef` when binding to deployed Agents; `inlineOrchestrator.spec` when embedded                                                                                    | `participants[].overrides`                              | You must either point to real agents or embed one as orchestrator.                                                |                                                                 |
| **Operate**      | `orchestration.orchestrator`, `orchestration.protocol.type` | `protocol.a2a.*` or `protocol.local.*` config depending on protocol; `ops.*` (timeouts/retries/concurrency/rateLimit) if SLOs required; `telemetry.*` if tracing/log redaction needed | —                                                       | Protocol choice dictates which sub-fields apply; SRE knobs are posture-driven.                                    |                                                                 |
| **Catalog**      | —                                                           | \`identity.(urn                                                                                                                                                                       | uuid)/displayName/version\` if workflow is discoverable | `context.labels/tags`                                                                                             | Identity enables listing & versioning; not needed just to run.  |
| **Govern**       | `ownership.team`                                            | `security.rbac.allowedCallers`, `security.dataPolicy.classification/redactPII`, `egress.allowlist` when exposed beyond team or touching sensitive data                                | —                                                       | Ownership required; RBAC/data policies scale with exposure and data class.                                        |                                                                 |
| **Interoperate** | —                                                           | A2A registry/caller policies if `protocol.type=A2A`; `agentRef.identityRef` when resolving logical IDs                                                                                | —                                                       | Cross-agent calling introduces discovery and caller policy.                                                       |                                                                 |

### 2.2 Enforcement & Cross-Field Rules

* **Workflow core**: `spec.required` = `ownership`, `orchestration`, `topology`.&#x20;
* **Performer integrity**: each `step.agentAlias` must match a `participant.alias` or the inline orchestrator; or use `agentRef`.&#x20;
* **At least one participant or inline orchestrator** is required.&#x20;

---

## 3) KnowledgeBase (KB CRD)

### 3.1 Recommendations by View

| View             | Minimal (must have)                                                                                             | Conditional (when you choose X)                                                                                                                        | Optional                                                       | Rationale                                                                                                                                           |                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Design**       | `type`, `rag.ingestion.contentTypes[].{mimeType, handlers[].name}`, `rag.embedding.model`, `rag.retrieval.topK` | `ingestion.chunking.*`, `preprocessing.*` when needed by content; clinical flags when clinical use                                                     | `reranking/diversity/recency/queryTransformation`, `agentic.*` | CRD mandates `spec.required: [type, connection, rag]` and inside RAG: `required: [ingestion, embedding, retrieval]` with required fields listed.    |                                                        |
| **Build**        | `connection.type` and its backend block; required secret refs                                                   | Backend-specific fields (e.g., Postgres/Cosmos/AI Search/Blob)                                                                                         | —                                                              | You must wire the backing store and credentials appropriate to the chosen connection.                                                               |                                                        |
| **Operate**      | —                                                                                                               | `ops.timeouts/retries/rateLimiting/resources`, `indexing.*`, `scheduling.*` when SLOs/auto jobs are needed                                             | `telemetry.*`                                                  | Operational controls are posture/scale dependent.                                                                                                   |                                                        |
| **Catalog**      | —                                                                                                               | \`identity.(urn                                                                                                                                        | uuid)/displayName/version\` if discoverable                    | `labels/tags/lifecycle`                                                                                                                             | Identity enables discovery; not required to function.  |
| **Govern**       | `ownership.team`                                                                                                | `security.dataClassification`, `phiRedaction`, `encryption`, `compliance.hipaa/gdpr/hitrust`, `telemetry.audit`, `lifecycle.retention` (as applicable) | —                                                              | Governance knobs become required by data class and policy.                                                                                          |                                                        |
| **Interoperate** | —                                                                                                               | `retrieval.filters` (if query-time policy), `agentic.*`, `queryRouting.*` (if multi-KB)                                                                | —                                                              | Smarter retrieval/routing only when adopted.                                                                                                        |                                                        |

### 3.2 Enforcement & Cross-Field Rules

* **KB core**: `spec.required: [type, connection, rag]`.&#x20;
* **RAG core**: `rag.required: [ingestion, embedding, retrieval]`; `ingestion.contentTypes[].{mimeType, handlers[].name}` and `retrieval.topK` are required. &#x20;

---

## 4) Cross-Spec Decision Rules (what makes fields **Conditional**)

1. **Use an LLM Gateway?**
   Then set `llm.gatewayRef` and define the matching entry in `llmGateways` (identity+endpoint+auth). This is enforced by validation. &#x20;

2. **Use MCP Tools?**
   If `tools[].mcp.serverRef` exists, the referenced server must exist in `mcpServers` by URN/UUID—making both blocks required together.&#x20;

3. **Use A2A?**
   If a workflow sets `protocol.type=A2A`, populate registry details and (optionally) caller policies. Steps must reference a valid participant or `agentRef`. &#x20;

4. **Adopt RAG?**
   A KB must declare RAG cores (ingestion/embedding/retrieval). Agents only need KB bindings when they actually use RAG. &#x20;

---

## 5) Operating Model & Policy-as-Code (how to enforce the recommendations)

* **Schema gates** (pre-commit & CI): Validate manifests against the CRDs to enforce minimal fields automatically:

  * Agent core fields present; `llm.model` set; `provider` **or** `gatewayRef` supplied. &#x20;
  * MCP tool/server and gateway reference integrity.&#x20;
  * Workflow topology integrity and performer checks.&#x20;
* **Environment hygiene**: Require `context.environment` for Agents/Workflows/KBs to prevent cross-env drift.  &#x20;
* **Risk-based add-ons**: Auto-inject `telemetry.logs.redaction`, RBAC, and PHI redaction for sensitive classes. &#x20;
* **Catalog readiness**: If publishing to a registry/marketplace, require identity (URN/UUID) + display metadata at PR gate.&#x20;

---

## 6) “MVP” Minimal Checklists

### Agent — Minimal

* `ownership.team`, `role`, `goal`, `systemPrompt` present; `llm.model` set **and** either `llm.provider` or `llm.gatewayRef`. &#x20;
* `context.environment` set.&#x20;

### AgentWorkflow — Minimal

* `ownership`, `orchestration.{orchestrator,protocol.type}`, `topology.{mode, steps[].(name,task)}`. &#x20;
* At least one participant **or** an `inlineOrchestrator`.&#x20;

### KnowledgeBase — Minimal

* `spec.required: [type, connection, rag]`; `rag.required: [ingestion, embedding, retrieval]`; `ingestion.contentTypes[].{mimeType, handlers[].name}`; `retrieval.topK`.  &#x20;

---

## 7) Implementation Roadmap

1. **Authoring UI (Design)**

   * Drive conditional visibility: show MCP fields only after “Use tools (MCP)” is checked; show Gateway fields only after “Use LLM Gateway” is selected; show RAG fields only after “Use KB/RAG.”
   * Persist **Minimal** as required in the form; surface **Conditional** when toggles are on.

2. **Scaffolding & Build**

   * Templates for: (a) “Solo Agent” (no tools), (b) “Tool-using Agent (MCP)”, (c) “Agent + RAG”, (d) “Workflow (Local/A2A)”.
   * Add pre-commit schema validation and namespaced identity checks.

3. **Operate**

   * Provide opinionated defaults for `timeouts/retries/rateLimit`, centralized OpenTelemetry toggle, and log redaction policy bundles by data class.

4. **Catalog**

   * When “Publish to Catalog” is selected, require `identity.(urn|uuid)` + `displayName/version` and validate A2A card completeness if exposed.&#x20;

5. **Govern**

   * Map data classes to required controls:

     * **PHI/PII** → require `phiRedaction`, encryption at rest/in transit, audit logging, RBAC. &#x20;

---

## 8) Why each bucket (Required / Conditional / Optional)?

* **Required (Minimal)**: The CRD itself marks these as **required** (hard schema constraint) or they are foundational (e.g., `context.environment`) for safe multi-env operation. Examples: Agent core fields; Workflow `ownership/orchestration/topology`; KB `type/connection/rag`.  &#x20;
* **Conditional**: These become required **only when you opt into** a capability (A2A, MCP, Gateway, RAG) or a risk posture (e.g., PHI). The CRDs include validations that force cross-object consistency when you opt in (e.g., `gatewayRef` must match `llmGateways`; `tools[].mcp.serverRef` must match `mcpServers`). &#x20;
* **Optional**: Improve discoverability, UX, and observability (identity/display metadata, labels/tags, friendly docs), but are not needed to execute.

---

## 9) Appendix — Field-to-View Mapping (selected excerpts)

* **Agent → Minimal**: `spec.required [ownership, role, goal, systemPrompt, llm]`; `llm.required [model]`; `llm.provider || llm.gatewayRef`. &#x20;
* **Workflow → Minimal**: `spec.required [ownership, orchestration, topology]`; `topology.required [mode, steps]`; `steps.required [name, task]`. &#x20;
* **KB → Minimal**: `spec.required [type, connection, rag]`; `rag.required [ingestion, embedding, retrieval]`; `retrieval.required [topK]`.  &#x20;

---

### Decision Summary (TL;DR)

* Treat **schema-required** fields as your **Minimal** authoring surface in AI Studio.
* Reveal **Conditional** surfaces behind explicit toggles: *Use Gateway*, *Use Tools (MCP)*, *Use RAG*, *Expose via A2A*, *Handle PHI*.
* Keep everything else **Optional** to reduce cognitive load, but offer presets for observability and catalogability.

