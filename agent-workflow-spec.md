# Optum AgentWorkflow Specification: A Developer's Guide
**Version:** 1.0
**Date:** August 31, 2025

## 1. Introduction
Welcome to the standardized framework for orchestrating AI Agents at Optum. This guide provides a comprehensive overview of the AgentWorkflow specification, a declarative, Kubernetes-native approach to defining and managing complex interactions between multiple agents.

**The Vision:** AgentWorkflows allow you to choreograph a series of tasks performed by one or more agents, enabling multi-agent collaboration, conditional logic, and state management within a single, version-controlled definition. By treating workflow definitions as code, we ensure standardization, portability, robust security, and full GitOps compatibility. You define the flow and participants, and our runtime environment handles the execution.

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
  urn: "urn:optum:agentworkflows:medical-coding-review:v1alpha1"
  uuid: "f1e2d3c4-b5a6-9876-5432-10fedcba9876"
  displayName: "Medical Coding Review Workflow"
  version: "1.0.0"
```

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
List of agents that will actively participate in the workflow (excluding an inline orchestrator).
*   **Purpose**: To declare the external agents that the workflow will interact with, providing an alias for easy referencing within the `topology`.
*   **Fields**:
    *   `alias` (string): A unique name used within the workflow to reference this participant.
    *   `agentRef` (object): Reference to a deployed Agent resource.
        *   `name` (string): Kubernetes name of the deployed Agent resource.
        *   `identityRef` (object): Logical identity reference (URN/UUID) for cross-namespace or discovery-based referencing.
    *   `overrides` (object): Optional per-participant overrides for this workflow instance.
        *   `llmModel` (string): Override the LLM model.
        *   `temperature` (number): Override the LLM temperature.
        *   `rateLimit` (integer): Override the rate limit (RPM).
        *   `timeoutMs` (integer): Override the default timeout (ms).

**Example:**
```yaml
participants:
  - alias: "triage-agent"
    agentRef:
      name: "clinical-triage-agent-prod"
      identityRef:
        urn: "urn:optum:agents:clinical:triage:v1"
    overrides:
      temperature: 0.5
  - alias: "coding-agent"
    agentRef:
      name: "senior-clinical-coder-prod"
      identityRef:
        urn: "urn:optum:agents:clinical:coder:v1"
    overrides:
      llmModel: "gpt-4-turbo-2024-04-09"
      rateLimit: 60 # 60 RPM for this workflow
  - alias: "audit-agent"
    agentRef:
      name: "audit-report-generator"
```

### 2.6. inlineOrchestrator (Optional)
Defines an orchestrator agent that is embedded directly within the workflow definition.
*   **Purpose**: To allow a workflow to define its own orchestrating agent without needing to deploy it separately. This agent implicitly becomes a participant.
*   **Fields**:
    *   `meta` (object): Optional metadata (name, labels, annotations) for the inline orchestrator.
    *   `spec` (object): Full `AgentSpec` defining the orchestrator agent. It includes core agent fields like `ownership`, `role`, `goal`, `systemPrompt`, `llm`, `llmGateways`, `mcpServers`, `tools`, and `stateManagement`.

**Example:**
```yaml
inlineOrchestrator:
  meta:
    name: "workflow-orchestrator-agent"
    labels:
      workflow-role: "orchestrator"
  spec:
    ownership:
      team: "Clinical Workflow Automation"
      organization: "Optum AI Orchestration"
      user: "workflow.manager@optum.com"
      askId: "AWF98765-ORCH"
      sloEmail: "workflow-alerts@optum.com"
    role: "Workflow Orchestrator"
    goal: "Manage the execution, branching, and error handling of the medical coding review workflow by calling specialized agents."
    systemPrompt: |
      You are an expert workflow orchestrator. Your primary role is to ensure the smooth, efficient, and compliant execution of the 'Medical Coding Review Workflow'.
      You will receive an initial clinical note. Your tasks are:
      1. Send the note to the 'triage-agent' to determine its complexity.
      2. Based on the triage outcome, either directly proceed to coding or route for further human review (if 'High Complexity').
      3. If coding is required, send the note to the 'coding-agent'.
      4. Finally, send all results to the 'audit-agent' for report generation.
      Use the provided tools to interact with the participating agents.
    llm:
      provider: OpenAI
      model: gpt-4-turbo
      parameters:
        temperature: 0.1
    stateManagement:
      memory:
        type: InMemory
        retentionPolicy: "session"
```

### 2.7. orchestration (Mandatory)
Configures the orchestrator agent and the inter-agent communication protocol.
*   **Purpose**: To specify which agent is the orchestrator and how it communicates with other agents (A2A or Local calls).
*   **Fields**:
    *   `orchestrator` (string): The alias of the agent managing the workflow execution. Use `"inline"` if `inlineOrchestrator` is defined.
    *   `protocol` (object): Inter-agent communication protocol.
        *   `type` (string, `enum: [A2A, Local]`): Protocol for agent communication.
        *   `a2a` (object): A2A-specific configuration.
            *   `registryServer` (string, `format: uri`): URL of the A2A Registry Server.
            *   `registryIdentity` (object): Optional identity (URN/UUID) of the A2A registry.
        *   `local` (object): Local-specific configuration.
            *   `serviceDiscovery` (string): Service discovery mechanism for local calls (e.g., `DNS`).

**Example:**
```yaml
orchestration:
  orchestrator: "inline" # References the inlineOrchestrator
  protocol:
    type: A2A
    a2a:
      registryServer: "https://a2a.optum.com/registry/v1"
      registryIdentity:
        urn: "urn:optum:a2a-registries:enterprise"
```
Or if using a participant as orchestrator:
```yaml
orchestration:
  orchestrator: "workflow-manager-agent" # Alias of an agent defined in 'participants'
  protocol:
    type: Local
    local:
      serviceDiscovery: "kubernetes-dns"
```

### 2.8. topology (Mandatory)
Defines the workflow's structure and execution steps.
*   **Purpose**: To layout the sequence, conditions, and dependencies of tasks performed by agents within the workflow.
*   **Fields**:
    *   `mode` (string, `enum: [Sequential, Hierarchical, Parallel, Network]`): The overall pattern of orchestration.
        *   `Sequential`: Steps run one after another in the defined order.
        *   `Hierarchical`: A main orchestrator delegates to sub-orchestrators or agents.
        *   `Parallel`: Steps can run concurrently.
        *   `Network`: Steps define explicit dependencies, forming a DAG.
    *   `steps` (array of objects, `minItems: 1`): List of individual workflow steps.
        *   `name` (string): A unique name for this step.
        *   `agentAlias` (string): The alias of the agent performing this step (from `participants` or `"inline"`). Mutually exclusive with `agentRef`.
        *   `agentRef` (object): Direct reference to an external agent for this step (name/identityRef). Mutually exclusive with `agentAlias`.
        *   `task` (string): The specific instruction or goal for the agent in this step.
        *   `input` (string): Source of input for this step (e.g., `'workflow.initialInput'` or `'steps.step_name.output'`). Supports simple path-based referencing.
        *   `condition` (string): CEL-like boolean condition for conditional execution (e.g., `'steps.triage.output.priority == "High"'`).
        *   `dependencies` (array of strings): Names of steps that must complete before this one (for `Network` mode).
        *   `onError` (object): Error handling strategy for the step.
            *   `strategy` (string, `enum: [FailFast, Continue, Retry]`): Strategy on error.
            *   `maxRetries` (integer): Max retries if `Retry`.
            *   `backoffMs` (integer): Base backoff time for retries.

**Example (Sequential Mode):**
```yaml
topology:
  mode: Sequential
  steps:
    - name: "triage-note"
      agentAlias: "triage-agent"
      task: "Analyze the clinical note for complexity and urgency."
      input: "workflow.initialInput.clinicalNote"
    - name: "code-note"
      agentAlias: "coding-agent"
      task: "Assign ICD-10-CM and CPT codes based on the triaged note."
      input: "steps.triage-note.output.processedNote"
      condition: "steps.triage-note.output.complexity != 'High'" # Only code if not high complexity
      onError:
        strategy: Retry
        maxRetries: 1
        backoffMs: 5000
    - name: "generate-audit-report"
      agentAlias: "audit-agent"
      task: "Generate a summary audit report from the coding results."
      input: "steps.code-note.output.codingResults"
```

**Example (Network Mode with Dependencies):**
```yaml
topology:
  mode: Network
  steps:
    - name: "prepare-data"
      agentAlias: "data-prep-agent"
      task: "Extract and clean patient data."
      input: "workflow.initialInput.rawData"
    - name: "analyze-risk"
      agentAlias: "risk-assessment-agent"
      task: "Assess patient risk factors."
      input: "steps.prepare-data.output.cleanedData"
      dependencies: ["prepare-data"]
    - name: "recommend-treatment"
      agentAlias: "treatment-recommender-agent"
      task: "Recommend personalized treatment plans."
      input: "steps.prepare-data.output.cleanedData"
      dependencies: ["prepare-data"]
    - name: "finalize-report"
      agentAlias: "reporting-agent"
      task: "Compile all analyses into a final report."
      input: "{ risk: steps.analyze-risk.output, treatment: steps.recommend-treatment.output }"
      dependencies: ["analyze-risk", "recommend-treatment"]
```

### 2.9. variables (Optional)
Named variables available to steps, often for template rendering.
*   **Purpose**: To define global or workflow-level variables that can be dynamically injected into step tasks or inputs.
*   **Fields**:
    *   `additionalProperties` (string): Key-value pairs of variable names and their string values.

**Example:**
```yaml
variables:
  currentDate: "{{ .now.Format \"2006-01-02\" }}"
  reportTitle: "Monthly Clinical Coding Audit"
```

### 2.10. artifacts (Optional)
Named artifacts persisted from steps.
*   **Purpose**: To specify important outputs from workflow steps that should be stored and made accessible, typically as URIs, IDs, or small JSON blobs.
*   **Fields**:
    *   `additionalProperties` (string): Key-value pairs of artifact names and their values (e.g., file paths, database IDs).

**Example:**
```yaml
artifacts:
  finalAuditReportUrl: "s3://optum-audit-reports/{{ .workflow.id }}/report.pdf"
  codingSessionId: "{{ .steps.code-note.output.sessionId }}"
```

### 2.11. ops (Optional)
Global runtime controls for the workflow.
*   **Purpose**: To define default operational settings like timeouts, retries, concurrency, and rate limits that apply to all steps within the workflow.
*   **Fields**:
    *   `timeouts` (object): Default timeout settings.
        *   `defaultMs` (integer): Default timeout for workflow steps in milliseconds.
    *   `retries` (object): Default retry settings.
        *   `max` (integer): Maximum number of retries for workflow steps.
        *   `backoffMs` (integer): Base backoff time in milliseconds for retries.
    *   `concurrency` (integer): Maximum number of steps that can run concurrently.
    *   `rateLimit` (object): Default rate limiting.
        *   `rpm` (integer): Default requests per minute limit for workflow steps.
        *   `rps` (integer): Default requests per second limit for workflow steps.

**Example:**
```yaml
ops:
  timeouts:
    defaultMs: 60000 # 1 minute
  retries:
    max: 2
    backoffMs: 2000 # 2 seconds
  concurrency: 5 # Allow up to 5 steps to run in parallel
  rateLimit:
    rpm: 300 # 300 requests per minute across all steps
```

### 2.12. telemetry (Optional)
Observability configuration for the workflow.
*   **Purpose**: To enable and configure tracing, logging, and metrics collection for the entire workflow.
*   **Fields**:
    *   `opentelemetry` (object): OpenTelemetry settings.
        *   `enabled` (boolean): Enable OpenTelemetry tracing/metrics.
        *   `serviceName` (string): Service name for workflow telemetry.
    *   `logs` (object): Log configuration.
        *   `redaction` (boolean): Enable log redaction for sensitive data.
    *   `metrics` (array of strings): Custom metrics to collect.

**Example:**
```yaml
telemetry:
  opentelemetry:
    enabled: true
    serviceName: "medical-coding-workflow"
  logs:
    redaction: true
  metrics:
    - "workflow_duration_seconds"
    - "step_execution_count"
```

### 2.13. security (Optional)
Security policies for the workflow.
*   **Purpose**: To define access control (RBAC), network egress rules, and data handling policies at the workflow level.
*   **Fields**:
    *   `rbac` (object): Role-Based Access Control.
        *   `roles` (array of strings): Roles required to execute the workflow.
        *   `allowedCallers` (array of objects): URN/UUID of entities allowed to trigger the workflow.
    *   `egress` (object): Network egress policies.
        *   `allowlist` (array of strings): List of allowed external domains/URLs for the workflow.
    *   `dataPolicy` (object): Data handling policies.
        *   `classification` (string, `enum: [Public, Internal, Confidential, PHI]`): Data classification level.
        *   `redactPII` (boolean): Automatically redact PII from workflow inputs/outputs.

**Example:**
```yaml
security:
  rbac:
    roles: ["workflow-executor", "workflow-admin"]
    allowedCallers:
      - urn: "urn:optum:users:analytics-team"
      - uuid: "c9b8a7d6-e5f4-3210-fedc-ba9876543210" # ID of an allowed service account
  egress:
    allowlist:
      - "*.optum.com"
      - "api.thirdpartybilling.com"
  dataPolicy:
    classification: PHI
    redactPII: true
```

### 2.14. secretsProvider (Optional)
Centralized secret management for workflow-level secrets.
*   **Purpose**: To specify how the workflow accesses sensitive information that is not directly tied to a specific participant agent (e.g., workflow-global API keys).
*   **Fields**:
    *   `type` (string, `enum: [AzureKeyVault]`): Type of secret provider.
    *   `azureKeyVault` (object): Azure Key Vault specific configuration.
        *   `vaultName` (string): Name of the Azure Key Vault.
        *   `tenantId` (string): Azure Tenant ID.
        *   `useManagedIdentity` (boolean): Use Managed Identity for authentication.

**Example:**
```yaml
secretsProvider:
  type: AzureKeyVault
  azureKeyVault:
    vaultName: "OptumWorkflowSecrets"
    tenantId: "abcdef12-3456-7890-abcd-ef1234567890"
    useManagedIdentity: true
```
