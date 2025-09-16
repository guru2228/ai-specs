# Architecture Recommendation — Spec-First Agents Across Any Framework

*(Agent, AgentWorkflow, KnowledgeBase CRDs; minimal vs. conditional vs. optional across six contexts; spec enforcement without Studio UI)*

## 0) Summary

Enterprise teams can build agents in any framework (LangChain, CrewAI, Autogen, Google/OpenAI SDKs, Agno, Mastra, AgentScope) **as long as they implement the UAIS spec** as the contract of record. The spec is expressed as Kubernetes CRDs (Agent, AgentWorkflow, KnowledgeBase). Your **control plane** enforces conformance at Git/GitOps and admission-time; your **data plane** runs portable agent runtimes with thin adapters for each framework.

Core rules that make this viable:

* **Agent** requires `ownership`, `role`, `goal`, `systemPrompt`, and `llm`, with `llm.model` and **either** `llm.provider` **or** `llm.gatewayRef`. If `llm.gatewayRef` is used, it must match an `llmGateways` entry; if tools use MCP, `tools[].mcp.serverRef` must match `mcpServers`.   &#x20;
* **AgentWorkflow** requires `ownership`, `orchestration`, and `topology` with `mode` and at least one step (`name`,`task`); performers must reference participants or an external agent; at least one participant or an inline orchestrator is required.  &#x20;
* **KnowledgeBase** requires `type`, `connection`, and `rag`. Inside RAG, `retrieval.topK` is required. &#x20;

These schema guarantees let you enforce **Minimal**, **Conditional**, and **Optional** elements uniformly—regardless of how teams code.

---

## 1) Principles

1. **Spec-first contract.** The CRDs are the API. Source code (any framework) must **emit** or **consume** these manifests.
2. **Control-plane enforcement.** Validate manifests in CI and again at cluster admission to keep runtime honest.
3. **Adapters over rewrites.** Provide light adapters that map spec → framework primitives.
4. **Separation of concerns.** Design/Build/Operate/Catalog/Govern/Interoperate are distinct concerns with clear handoff artifacts.

---

## 2) What’s Minimal vs. Conditional vs. Optional (by context)

### 2.1 Agent

* **Minimal (Required to deploy anywhere)**

  * `ownership.team`, `role`, `goal`, `systemPrompt`, `llm.model` **and** (`llm.provider` **or** `llm.gatewayRef`). &#x20;
  * `context.environment` (playground/dev/test/stage/prod) for safe promos.&#x20;
* **Conditional (becomes required if you opt in)**

  * `llm.gatewayRef` + matching `llmGateways[*]` when using a gateway.&#x20;
  * `tools[].mcp.serverRef` + `mcpServers[*]` when using MCP tools.&#x20;
  * `knowledgeBases[]` when RAG is used (KB is a separate resource).
  * `securityConfig`/`security`/`telemetry.logs.redaction` for PHI/PII workloads.&#x20;
* **Optional (quality-of-life, catalogability)**

  * `identity.(urn|uuid)/displayName/version`, labels/tags, persona/behavior fine-tuning; still recommended if publishing to a catalog.

### 2.2 AgentWorkflow

* **Minimal**

  * `ownership`, `orchestration.{orchestrator, protocol.type}`, `topology.{mode, steps[].(name, task)}`; at least one participant or an inline orchestrator; performer integrity checks.  &#x20;
  * `context.environment` for lifecycle hygiene.&#x20;
* **Conditional**

  * `protocol.a2a.*` when A2A is selected; `local.serviceDiscovery` when Local.&#x20;
  * `dependencies` when `mode` is Network/Aggregate.&#x20;
* **Optional**

  * `variables`, `artifacts`, participant overrides, telemetry embellishments.

### 2.3 KnowledgeBase

* **Minimal**

  * `spec.required: [type, connection, rag]`; inside RAG: `retrieval.topK` and ingestion/embedding cores. &#x20;
* **Conditional**

  * Backend-specific connection blocks + secret refs (Postgres/Cosmos/etc.).
  * Clinical and security controls based on data class (PHI/PII).&#x20;
* **Optional**

  * Reranking, diversity, recency, query transformation, agentic retrieval, query routing.&#x20;

---

## 3) How to enforce the spec when teams don’t use Studio

### 3.1 Contract-first paths (pick one)

* **Spec-first (recommended):** Teams author YAML (Agent/Workflow/KB). CI runs `uais validate` (kubeconform + custom rules) and pre-commit checks; GitOps deploys.

  * Enforces CRD required fields and cross-field invariants (e.g., gatewayRef matches `llmGateways`; MCP tool references resolve). &#x20;
* **Code-first:** Provide light **emitter libraries** (Python/TS) to decorate framework code and **export** a valid CRD manifest (`uais export`). Same CI/Admission checks apply.
* **Mixed:** Teams keep code configs; a small generator produces the CRDs from their configs during build.

### 3.2 Policy-as-code (CI + Admission)

* **CI Gate:** `uais validate` runs OpenAPI schema validation + **custom conformance tests** for Minimal/Conditional profiles.
* **Admission Gate:** OPA Gatekeeper/Kyverno constraints, e.g.:

  * Must have `context.environment`. (Agent/Workflow) &#x20;
  * If `llm.gatewayRef` set, referenced gateway must exist.&#x20;
  * If `tools[].mcp.serverRef` set, referenced MCP must exist.&#x20;
  * Workflows must have `mode` + at least one step (`name`,`task`) and a valid performer. &#x20;

### 3.3 Golden-path GitOps

* **Repo layout:**

  ```
  /agents/      # Agent*.yaml (one per agent)
  /workflows/   # AgentWorkflow*.yaml
  /knowledge/   # KnowledgeBase*.yaml
  /overlays/{env}/ # Kustomize overlays for environment
  ```
* **ArgoCD** syncs namespaces by env; `additionalPrinterColumns` give at-a-glance env/phase. &#x20;

---

## 4) Framework-agnostic adapter kit (UAIS Shim)

Ship a small **UAIS Adapter** for each popular framework to map CRD to runtime:

| UAIS Spec                            | Framework mapping (examples)                                                        | Notes                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `systemPrompt` / `promptTemplateRef` | LangChain `SystemMessagePromptTemplate`; CrewAI Role/Goal; Autogen `system_message` | Honor **either** inline or template ref.                |
| `llm.*`                              | LangChain `ChatOpenAI/ChatAnthropic` config; Agno/OpenAI SDK client; Google AI SDK  | If `gatewayRef` present, route via LLM Gateway client.  |
| `tools[].mcp`                        | Bind MCP tool runners or HTTP shims                                                 | Validate `serverRef` resolution before runtime.         |
| `stateManagement`                    | Memory/session stores (Redis/Postgres adapters)                                     | Support seed/idempotency if present.                    |
| `knowledgeBases[]`                   | Retrieval client uses KB `retrieval.topK`, filters, reranking                       | Respect RAG knobs; require `topK`.                      |
| Workflow `protocol`                  | A2A client (registry lookup) or Local (service DNS)                                 | Use spec to choose call path.                           |

> Deliverables: lightweight packages (`uais-langchain`, `uais-crewai`, `uais-autogen`, `uais-openai`, `uais-google`, `uais-agno`, `uais-mastra`, `uais-agentscope`) plus a common **A2A client** and **MCP client**.

---

## 5) Six-context recommendation (with enforcement knobs)

### 5.1 Design (authoring & intent)

* **Minimal:** Agent core (`role/goal/systemPrompt/llm.model`), Workflow `mode/steps(name,task)`, KB RAG cores.  &#x20;
* **Conditional:** Structured output schema, loop/dependency graphs, content preprocessing/chunking.
* **Optional:** Persona, examples, labels/tags.

### 5.2 Build (wiring & provisioning)

* **Minimal:** LLM provider **or** gateway; connections/secrets for KB backend; participant/inline orchestrator presence.  &#x20;
* **Conditional:** MCP servers & tools; A2A registry config; Local service discovery.&#x20;
* **Optional:** API façade and custom endpoints.

### 5.3 Operate (runtime & SRE)

* **Minimal:** `context.environment` set on all resources. &#x20;
* **Conditional:** `timeouts/retries/rateLimit/resources`, log redaction, memory/session. &#x20;
* **Optional:** Custom metrics, eval schedules.

### 5.4 Catalog (discovery & marketplace)

* **Minimal:** None for runtime; recommended if publishing.
* **Conditional:** `identity.(urn|uuid)` + display metadata; A2A `publishTo/discovery/callPolicy`.&#x20;
* **Optional:** Icons, docs links, tags.

### 5.5 Govern (ownership, risk, compliance)

* **Minimal:** `ownership.team` everywhere.  &#x20;
* **Conditional:** PHI/PII classes → RBAC, egress allowlists, encryption/audit/BAA. &#x20;
* **Optional:** Community/license metadata.

### 5.6 Interoperate (A2A/MCP/KB)

* **Minimal:** None until you opt in.
* **Conditional:**

  * **A2A:** registry refs and caller policies.&#x20;
  * **MCP:** tool ↔ server linking.&#x20;
  * **KB:** bind KB resources; honor `topK` and filters.&#x20;
* **Optional:** Query routing, agentic retrieval.&#x20;

---

## 6) Conformance Profiles (enforceable tiers)

```yaml
profiles:
  bronze-minimal:
    agent:    [ownership.team, role, goal, systemPrompt, llm.model, (llm.provider|llm.gatewayRef), context.environment]
    workflow: [ownership.team, orchestration.orchestrator, orchestration.protocol.type, topology.mode, steps[].(name,task)]
    kb:       [type, connection, rag.retrieval.topK]
  silver-integrations:
    require:  [agent.llm.gatewayRef->llmGateways, tools[].mcp.serverRef->mcpServers]
  gold-governed:
    require:  [identity.(urn|uuid), security/rbac/egress, telemetry.logs.redaction, kb.security.compliance.hipaa.* for PHI]
```

CI and Admission select a profile per namespace/environment and enforce it.

---

## 7) Packaging, supply chain, and promotion

* **Artifacts:** App container(s) + CRDs (Agent/Workflow/KB).
* **Overlays per environment:** Kustomize patches for model SKUs, rate limits, secrets, and egress.
* **Supply chain:** SBOM + image/signature (cosign), provenance (SLSA).
* **Promotion:** Only manifests that pass **profile** gates promote to higher envs.

---

## 8) Telemetry, evaluation, and safety

* **OpenTelemetry:** standard attributes (agent URN/UUID, workflow run id, step name).
* **Redaction & RBAC:** enable for PHI/PII workloads at **gold** profile. &#x20;
* **Evaluations:** schedule CRD-driven evals to guard regressions (Agent `securityConfig.evaluations`).&#x20;

---

## 9) A2A, MCP, and KB interoperability patterns

* **A2A:** Workflows set `protocol.type=A2A` and can look up agents in registries; agents define `publishTo`, `discovery`, and `callPolicy`. &#x20;
* **MCP:** If declaring `tools[].mcp`, the referenced server must exist in `mcpServers` with identity and auth. &#x20;
* **KB:** Agents bind external KBs; KBs declare RAG controls (ingestion/embedding/retrieval) and optional quality features (reranking/diversity/recency). &#x20;

---

## 10) Roles & RACI

* **Platform (UAIS) Team:** Own CRDs, conformance profiles, CI/Admission policies, adapters, LLM gateways, A2A/MCP/KB primitives.
* **BU Teams:** Own agent/business logic, choose frameworks, emit/consume CRDs, own performance SLOs and evals.
* **Security/Compliance:** Own data class mappings → policy bundles (RBAC, egress, audit, redaction).
* **SRE:** Own telemetry backends, dashboards, alerts.

---

## 11) Migration & Exceptions

* **Migration:** Provide codemods/scaffolders to emit CRDs from existing projects (code-first path).
* **Exceptions:** Risk-accepted variances must be formal PR annotations; admission controllers can allow **time-boxed** waivers only in lower envs.

---

## 12) Quick “golden path” checklists

**Agent (bronze minimal):**

* ✓ `ownership.team`, ✓ `role/goal/systemPrompt`, ✓ `llm.model` + (**provider**|**gatewayRef**), ✓ `context.environment`.  &#x20;

**Workflow (bronze minimal):**

* ✓ `ownership`, ✓ `orchestration.{orchestrator,protocol.type}`, ✓ `topology.{mode, steps[name,task]}`, ✓ one participant or inline orchestrator.  &#x20;

**KnowledgeBase (bronze minimal):**

* ✓ `type`, `connection`, `rag.retrieval.topK` (plus RAG cores). &#x20;

---

## 13) What this means for “any framework”

* Teams can keep their favorite SDKs and patterns.
* The **only** contract that matters for deployment and operations is the UAIS spec.
* Adapters + CI/Admission make the contract enforceable and portable.
