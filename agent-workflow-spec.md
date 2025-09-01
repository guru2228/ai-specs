# Optum AgentWorkflow Specification: A Developer's Guide
**Version:** 2.0 (based on spec v1alpha2)
**Date:** August 31, 2025

## 1. Introduction
Welcome to the standardized framework for orchestrating AI Agents at Optum. This guide provides a comprehensive overview of the **AgentWorkflow v1alpha2 specification**, a declarative, Kubernetes-native approach to defining and managing complex interactions between multiple agents.

**The Vision:** AgentWorkflows allow you to choreograph a series of tasks performed by one or more agents, enabling multi-agent collaboration, conditional logic, and state management within a single, version-controlled definition. By treating workflow definitions as code, we ensure standardization, portability, robust security, and full GitOps compatibility. You define the flow and participants, and our runtime environment handles the execution.

**What's New in v1alpha2:** This version introduces more sophisticated flow control within the `topology` section, including new modes like `Aggregate` (for synchronizing parallel tasks) and `Loop` (for iterative processes), giving you greater power to model complex business logic.

---

## 2. Anatomy of the AgentWorkflow Specification
An AgentWorkflow is defined by its `.spec` section. Below is a detailed breakdown of each configuration block.

### 2.1. ownership (Mandatory)
This section establishes clear accountability for every workflow.
*   **Purpose**: To identify the team and individuals responsible for the workflow's maintenance, performance, and operational support.
*   **Fields**:
    *   `team` (string): The name of your team.
    *   `organization` (string): Your larger department or business unit.
    *   `user` (string): The primary individual owner or tech lead.
    *   `askId` (string): The official application ID for tracking.
    *   `sloEmail` (string, `format: email`): The distribution list for alerts and SLO notifications.

**Example:**
```yaml
ownership:
  team: "Clinical Workflow Automation"
  organization: "Optum AI Orchestration"
  user: "john.smith@optum.com"
  askId: "AWF98765"
  sloEmail: "workflow-alerts@optum.com"
```

### 2.2. identity (Optional but Recommended)
Provides an optional stable identity for the workflow itself.
*   **Purpose**: To give the workflow a unique and versioned identity for programmatic interaction, auditing, and lifecycle management.
*   **Fields**:
    *   `urn` (string): Unique Resource Name (e.g., `urn:optum:workflows:patient-onboarding:v1`).
    *   `uuid` (string, `format: uuid`): Universally Unique Identifier.
    *   `displayName` (string): A human-readable name for the workflow.
    *   `version` (string): Semantic version of the workflow definition (e.g., `1.0.0`).

**Example:**
```yaml
identity:
  urn: "urn:optum:agentworkflows:medical-coding-review:v1alpha2"
  uuid: "f1e2d3c4-b5a6-9876-5432-10fedcba9876"
  displayName: "Medical Coding Review Workflow"
  version: "1.1.0"```

### 2.3. description (Mandatory)
A detailed description of what this workflow accomplishes.
*   **Purpose**: To provide a clear summary of the workflow's function, aiding in discoverability and understanding.
*   **Fields**:
    *   `description` (string, `minLength: 20`): A detailed explanation.

**Example:**
```yaml
description: "This workflow automates the review of patient clinical notes, triaging them based on complexity, assigning appropriate medical codes using a specialized agent, and generating a summary report for audit purposes. It ensures compliance and efficiency in the coding process."
```

### 2.4. context (Optional)
Defines the deployment and operational context for the workflow.
*   **Purpose**: To categorize and organize workflows based on their deployment environment, tenancy, and custom labels/tags.
*   **Fields**:
    *   `tenantId` (string): Identifier for multi-tenancy.
    *   `workspaceId` (string): Workspace identifier within a tenant.
    *   `environment` (string, `enum: [playground, dev, test, stage, prod]`): The intended deployment environment.
    *   `labels` (object): Key-value pairs for organization.
    *   `tags` (array of strings): Simple descriptive tags.

**Example:**
```yaml
context:
  tenantId: "optum-care"
  workspaceId: "coding-workflows"
  environment: "prod"
  labels:
    domain: "revenue-cycle"
    priority: "critical"
  tags: ["automated", "coding", "audit"]
```

### 2.5. participants (Mandatory if `inlineOrchestrator` is not used)
List of agents that will actively participate in the workflow.
*   **Purpose**: To declare the external agents that the workflow will interact with, providing an alias for easy referencing within the `topology`.
*   **Fields**:
    *   `alias` (string): A unique name used within the workflow to reference this participant.
    *   `agentRef` (object): Reference to a deployed Agent resource.
        *   `name` (string): Kubernetes name of the deployed Agent resource.
        *   `identityRef` (object): Logical identity reference (URN/UUID).
    *   `overrides` (object): Optional per-participant overrides for this workflow instance.
        *   `llmModel`, `temperature`, `rateLimit` (rpm), `timeoutMs`.

**Example:**
```yaml
participants:
  - alias: "triage-agent"
    agentRef:
      name: "clinical-triage-agent-prod"
  - alias: "coding-agent"
    agentRef:
      name: "senior-clinical-coder-prod"
    overrides:
      llmModel: "gpt-4-turbo-2024-04-09"
      rateLimit: 60 # 60 RPM for this workflow
```

### 2.6. inlineOrchestrator (Optional)
Defines an orchestrator agent that is embedded directly within the workflow definition.
*   **Purpose**: To allow a workflow to define its own orchestrating agent without needing to deploy it separately. This agent implicitly becomes a participant.
*   **Fields**:
    *   `metadata` (object): Optional metadata (name, labels) for the inline orchestrator.
    *   `spec` (object): Full `AgentSpec` defining the orchestrator agent, including fields like `ownership`, `role`, `goal`, `systemPrompt`, and `llm`.

**Example:**
```yaml
inlineOrchestrator:
  metadata:
    name: "workflow-orchestrator-agent"
  spec:
    ownership:
      team: "Clinical Workflow Automation"
      organization: "Optum AI Orchestration"
      user: "workflow.manager@optum.com"
    role: "Workflow Orchestrator"
    goal: "Manage the execution, branching, and error handling of the medical coding review workflow by calling specialized agents."
    systemPrompt: "You are an expert workflow orchestrator. Your primary role is to ensure the smooth, efficient, and compliant execution of the 'Medical Coding Review Workflow'..."
    llm:
      provider: OpenAI
      model: gpt-4-turbo
```

### 2.7. orchestration (Mandatory)
Configures the orchestrator agent and the inter-agent communication protocol.
*   **Purpose**: To specify which agent is the orchestrator and how it communicates with other agents.
*   **Fields**:
    *   `orchestrator` (string): The alias of the agent managing the workflow execution. Use `"inline"` if `inlineOrchestrator` is defined.
    *   `protocol` (object): Inter-agent communication protocol.
        *   `type` (string, `enum: [A2A, Local]`): Protocol for agent communication.
        *   `a2a` (object): A2A-specific configuration.
        *   `local` (object): Local-specific configuration (e.g., for Kubernetes DNS).

**Example:**
```yaml
orchestration:
  orchestrator: "inline" # References the inlineOrchestrator
  protocol:
    type: A2A
    a2a:
      registryServer: "https://a2a.optum.com/registry/v1"
```

### 2.8. topology (Mandatory)
Defines the workflow's structure and execution steps. This is the core logic of your workflow.
*   **Purpose**: To lay out the sequence, conditions, and dependencies of tasks performed by agents.
*   **Fields**:
    *   `mode` (string, `enum: [Sequential, Hierarchical, Parallel, Network, Aggregate, Loop]`): The overall pattern of orchestration.
        *   `Sequential`: Steps run one after another in the defined order.
        *   `Hierarchical`: A main orchestrator delegates tasks, potentially to sub-workflows.
        *   `Parallel`: Independent steps can run concurrently.
        *   `Network`: Steps execute based on a complex dependency graph (DAG).
        *   **`Aggregate` (New)**: A synchronization mode where a step waits for **all** of its specified `dependencies` to complete before executing. This is useful for "join" or "fan-in" patterns.
        *   **`Loop` (New)**: The workflow contains iterative logic, where steps can be repeated based on conditions defined in `loopConfig`.
    *   `steps` (array of objects): The list of individual workflow steps.
        *   `name` (string): A unique name for this step.
        *   `order` (integer, **New**): An optional integer to explicitly define the execution order, which can be useful for clarity in complex sequential flows. The primary ordering is still the array index.
        *   `agentAlias` or `agentRef`: The agent performing the task.
        *   `task` (string): The specific instruction or goal for the agent.
        *   `input` (string): Source of input for the step (e.g., `'workflow.initialInput'` or `'steps.triage.output.priority'`).
        *   `condition` (string): A CEL-like boolean condition for conditional execution (e.g., `'steps.triage.output.priority == "High"'`).
        *   `dependencies` (array of strings): For `Network` and `Aggregate` modes, lists the names of steps that must complete before this one.
        *   `onError` (object): Step-specific error handling (`FailFast`, `Continue`, `Retry`).
        *   `loopConfig` (object, **New**): Configuration for iterative logic. This is crucial for `Loop` mode.
            *   `maxIterations` (integer): Sets a hard limit on the number of times a loop can run to prevent infinite loops.

#### Topology Examples

**Example (Aggregate Mode):**
This workflow performs two independent analyses in parallel (`analyze-risk`, `check-eligibility`) and then uses an `Aggregate` step (`finalize-report`) to combine the results once both are complete.

```yaml
topology:
  mode: Network # Network mode allows for parallel execution based on dependencies
  steps:
    - name: "prepare-data"
      agentAlias: "data-prep-agent"
      task: "Extract and clean patient data."
    - name: "analyze-risk"
      agentAlias: "risk-agent"
      task: "Assess patient risk factors."
      dependencies: ["prepare-data"]
    - name: "check-eligibility"
      agentAlias: "eligibility-agent"
      task: "Verify patient eligibility and benefits."
      dependencies: ["prepare-data"]
    - name: "finalize-report"
      agentAlias: "reporting-agent"
      task: "Compile risk and eligibility into a final report."
      # This step aggregates the results from the two parallel steps.
      # It will only start after BOTH analyze-risk and check-eligibility are done.
      dependencies: ["analyze-risk", "check-eligibility"]
```

**Example (Loop Mode):**
This workflow attempts to resolve a medical claim. If the claim is rejected with a fixable error, the `fix-claim` step runs. The `loopConfig` ensures this process is attempted up to 3 times.

```yaml
topology:
  mode: Loop
  steps:
    - name: "submit-claim"
      agentAlias: "submission-agent"
      task: "Submit the medical claim for processing."
      input: "workflow.initialInput.claimData"
    - name: "check-status"
      agentAlias: "status-check-agent"
      task: "Check the status of the submitted claim."
      input: "steps.submit-claim.output.claimId"
    - name: "fix-claim"
      agentAlias: "correction-agent"
      task: "Analyze the rejection reason and apply corrections to the claim."
      input: "steps.check-status.output.rejectionDetails"
      # This step only runs if the claim is rejected.
      condition: "steps.check-status.output.status == 'Rejected'"
      # The loop configuration is defined here. The orchestrator will re-run
      # the relevant steps (submit, check) until the condition is met or iterations are maxed out.
      loopConfig:
        maxIterations: 3
```

### 2.9. variables & artifacts (Optional)
*   **Purpose**: To define global variables for templating (`variables`) and to persist important outputs like file URIs or session IDs (`artifacts`).

**Example:**
```yaml
variables:
  reportTitle: "Monthly Clinical Coding Audit"
artifacts:
  finalAuditReportUrl: "s3://optum-audit-reports/{{ .workflow.id }}/report.pdf"
```

### 2.10. ops (Optional)
Global runtime controls for the workflow.
*   **Purpose**: To define default operational settings like timeouts, retries, concurrency, and rate limits that apply to all steps.
*   **Fields**: `timeouts`, `retries`, `concurrency`, `rateLimit`.

**Example:**
```yaml
ops:
  timeouts:
    defaultMs: 60000 # 1 minute
  retries:
    max: 2
    backoffMs: 2000 # 2 seconds
  concurrency: 5
```

### 2.11. telemetry (Optional)
Observability configuration for the workflow.
*   **Purpose**: To enable and configure tracing, logging, and metrics collection for the entire workflow.
*   **Fields**: `opentelemetry`, `logs`, `metrics`.

**Example:**
```yaml
telemetry:
  opentelemetry:
    enabled: true
    serviceName: "medical-coding-workflow"
  logs:
    redaction: true
```

### 2.12. security (Optional)
Security policies for the workflow.
*   **Purpose**: To define access control (RBAC), network egress rules, and data handling policies at the workflow level.
*   **Fields**: `rbac`, `egress`, `dataPolicy`.

**Example:**
```yaml
security:
  rbac:
    roles: ["workflow-executor"]
    allowedCallers:
      - urn: "urn:optum:services:claims-processor"
  dataPolicy:
    classification: PHI
    redactPII: true
```

### 2.13. secretsProvider (Optional)
Centralized secret management for workflow-level secrets.
*   **Purpose**: To specify how the workflow accesses sensitive information that is not directly tied to a specific participant agent.
*   **Fields**: `type`, `azureKeyVault`.

**Example:**
```yaml
secretsProvider:
  type: AzureKeyVault
  azureKeyVault:
    vaultName: "OptumWorkflowSecrets"
    tenantId: "abcdef12-3456-7890-abcd-ef1234567890"
    useManagedIdentity: true
```
