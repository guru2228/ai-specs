# Optum Agent Specification: A Developer's Guide
**Version:** 1.0
**Date:** August 31, 2025

## 1. Introduction
Welcome to the standardized framework for building AI Agents at Optum. This guide provides a comprehensive overview of the Agent specification, a declarative, Kubernetes-native approach to defining and managing your agents.

**The Vision:** By externalizing agent configuration into a single, version-controlled YAML file, we treat agent definitions as code. This enables standardization, portability, robust security, and full GitOps compatibility. You define what your agent should do in this spec, and our runtime environment handles the rest.

## 2. Anatomy of the Agent Specification
An Agent is defined by its `.spec` section. Below is a detailed breakdown of each configuration block.

### 2.1. ownership (Mandatory)
This section establishes clear accountability for every agent.
*   **Purpose**: To identify the team and individuals responsible for the agent's maintenance, performance, and operational support.
*   **Fields**:
    *   `team` (string): The name of your team.
    *   `organization` (string): Your larger department or business unit.
    *   `user` (string): The primary individual owner or tech lead.
    *   `askId` (string): The official application ID for tracking.
    *   `sloEmail` (string): The distribution list for alerts and SLO notifications.

**Example:**
```yaml
ownership:
  team: "Clinical AI Solutions"
  organization: "Optum AI"
  user: "jane.doe@optum.com"
  askId: "A12345"
  sloEmail: "clinical-ai-alerts@optum.com"
```

### 2.2. identity (Optional but Recommended)
Provides a stable, immutable identity for the agent, crucial for discovery and versioning.
*   **Purpose**: To give the agent a unique and versioned identity for programmatic interaction, auditing, and lifecycle management.
*   **Fields**:
    *   `urn` (string): Unique Resource Name (e.g., `urn:optum:agents:clinical-coder:v1`).
    *   `uuid` (string, `format: uuid`): Universally Unique Identifier.
    *   `displayName` (string): A human-readable name.
    *   `icon` (string): URL to an icon representing the agent.
    *   `version` (string): Semantic version of the agent definition (e.g., `1.0.0`).
    *   `git` (object): Provenance details from Git.
        *   `repo` (string): Git repository URL.
        *   `path` (string): Path within the repository.
        *   `ref` (string): Git branch or tag.
        *   `commit` (string): Specific Git commit hash.
    *   `ownerContacts` (array of strings): Contact emails or identifiers for the owner.
    *   `createdAt` (string, `format: date-time`): Timestamp of creation.
    *   `updatedAt` (string, `format: date-time`): Timestamp of last update.

**Example:**
```yaml
identity:
  urn: "urn:optum:agents:clinical:coder:v1alpha9"
  uuid: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
  displayName: "Senior Clinical Coder"
  version: "1.0.0"
  git:
    repo: "https://github.com/optum/ai-agents.git"
    path: "agents/clinical-coder/agent.yaml"
    ref: "refs/heads/main"
    commit: "abcdef1234567890abcdef1234567890abcdef12"
```

### 2.3. context (Optional)
Defines the operational context where the agent is deployed and intended to run.
*   **Purpose**: To categorize and organize agents based on their deployment environment, tenancy, and custom labels/tags.
*   **Fields**:
    *   `tenantId` (string): Identifier for multi-tenancy.
    *   `workspaceId` (string): Workspace identifier within a tenant.
    *   `environment` (string, `enum: [playground, dev, test, stage, prod]`): The intended deployment environment.
    *   `labels` (object): Key-value pairs for organization.
    *   `tags` (array of strings): Simple descriptive tags.
    *   `lifecycle` (string, `enum: [ideation, prototype, development, testing, staging, prod]`): Current lifecycle stage.

**Example:**
```yaml
context:
  tenantId: "optum-health"
  workspaceId: "coding-automation"
  environment: "prod"
  labels:
    department: "clinical"
    priority: "high"
  tags: ["HIPAA", "PHI", "coding"]
  lifecycle: "prod"
```

### 2.4. role (Mandatory)
The designated title or role of the agent.
*   **Purpose**: A concise description of the agent's professional identity, guiding its interactions and expected capabilities.
*   **Fields**:
    *   `role` (string): E.g., "Senior Clinical Coder".

**Example:**
```yaml
role: "Senior Clinical Coder"
```

### 2.5. goal (Mandatory)
The primary objective the agent is designed to achieve.
*   **Purpose**: A clear statement of the agent's mission, driving its decision-making and task execution.
*   **Fields**:
    *   `goal` (string): E.g., "Review patient clinical notes to accurately assign ICD-10-CM and CPT codes, ensuring compliance and maximizing reimbursement."

**Example:**
```yaml
goal: "Review patient clinical notes to accurately assign ICD-10-CM and CPT codes, ensuring compliance and maximizing reimbursement."
```

### 2.6. backstory (Optional)
An optional narrative background providing context and personality.
*   **Purpose**: To imbue the agent with a narrative, aiding in nuanced prompt engineering and consistent persona.
*   **Fields**:
    *   `backstory` (string): A descriptive narrative.

**Example:**
```yaml
backstory: "As a highly experienced clinical coder with over 15 years in various specialties, I possess a deep understanding of medical terminology, anatomy, physiology, and the intricate guidelines of ICD-10-CM and CPT coding. My expertise lies in abstracting complex medical information from patient records and translating it into precise, compliant codes. I am committed to accuracy, efficiency, and continuous learning to stay abreast of coding changes."
```

### 2.7. systemPrompt (Mandatory if `promptTemplateRef` is not used)
The core instructions defining the agent's behavior and operational guidelines.
*   **Purpose**: To program the LLM with its fundamental directives, constraints, and operational persona.
*   **Fields**:
    *   `systemPrompt` (string): The prompt text.

**Example:**
```yaml
systemPrompt: |
  You are an expert Senior Clinical Coder. Your task is to analyze provided clinical documentation and assign the most appropriate ICD-10-CM diagnosis codes and CPT procedure codes.
  Follow these rules:
  1. Always refer to official coding guidelines (e.g., AHA Coding Clinic, AMA CPT guidelines).
  2. Prioritize codes that accurately reflect the patient's condition and treatment.
  3. Do not infer; if information is missing, state what is needed for accurate coding.
  4. Present codes clearly with descriptions and supporting rationale from the notes.
  5. If the documentation does not support any specific code, state "Documentation Insufficient."
```

### 2.8. promptTemplateRef (Mandatory if `systemPrompt` is not used)
A reference to a prompt template in the central POML library.
*   **Purpose**: To enable reuse and standardization of prompts across multiple agents.
*   **Fields**:
    *   `promptTemplateRef` (string): E.g., `prompts/poml/clinical/summarize-note.poml`.

**Example:**
```yaml
promptTemplateRef: "prompts/poml/clinical/clinical-coding-guidelines.poml"
```

### 2.9. persona (Optional)
Defines personality traits and communication style.
*   **Purpose**: To fine-tune the agent's interaction style and thematic focus.
*   **Fields**:
    *   `agentType` (string): High-level type (e.g., `Analyst`, `Assistant`, `ToolUser`).
    *   `tone` (string): Desired communication tone (e.g., `Formal`, `Friendly`, `Technical`).
    *   `topics` (array of strings): Topics the agent is knowledgeable about.

**Example:**
```yaml
persona:
  agentType: "Analyst"
  tone: "Formal, Authoritative, Meticulous"
  topics: ["ICD-10-CM", "CPT", "HCPCS", "medical billing", "clinical documentation"]
```

### 2.10. ioConfig (Optional)
Input/Output configuration for the agent.
*   **Purpose**: To declare the data formats and content types the agent expects as input and produces as output.
*   **Fields**:
    *   `inputs` (array of objects): Supported input formats.
        *   `format` (string, `enum: [text, file, image, audio, video, json, xml]`): Input format type.
        *   `schemaDefinition` (string): Inline JSON Schema definition.
        *   `schemaRef` (string): Reference to an external schema definition.
        *   `contentTypes` (array of strings): Specific MIME types (e.g., `application/pdf`).
    *   `outputs` (array of objects): Supported output formats.
        *   `format` (string, `enum: [text, file, image, audio, video, json, xml]`): Output format type.
        *   `schemaDefinition` (string): Inline JSON Schema definition.
        *   `schemaRef` (string): Reference to an external schema definition.
        *   `contentTypes` (array of strings): Specific MIME types (e.g., `application/json`).

**Example:**
```yaml
ioConfig:
  inputs:
    - format: file
      contentTypes: ["application/pdf", "text/plain"]
    - format: json
      schemaDefinition: |
        {
          "type": "object",
          "properties": {
            "patientId": {"type": "string"},
            "clinicalNote": {"type": "string"},
            "dateOfService": {"type": "string", "format": "date"}
          },
          "required": ["patientId", "clinicalNote"]
        }
  outputs:
    - format: json
      schemaRef: "schemas/coding-result.json"
      contentTypes: ["application/json"]
```

### 2.11. behavior (Optional)
Fine-grained control over the agent's runtime behavior.
*   **Purpose**: To configure how the agent interacts with the LLM, uses tools, manages context, and handles determinism.
*   **Fields**:
    *   `responseFormat` (object): Desired output format from LLM.
        *   `type` (string, `enum: [text, json, xml]`): Desired LLM response format.
        *   `jsonSchemaRef` (string): Reference to a JSON schema for structured LLM output.
    *   `toolChoice` (string, `enum: [auto, required, none]`): Control how the agent uses tools.
    *   `reasoning` (object): LLM reasoning features.
        *   `enabled` (boolean): Enable advanced reasoning.
        *   `maxReasoningTokens` (integer): Max tokens for reasoning.
    *   `determinism` (object): Control for reproducibility.
        *   `seed` (integer): Seed for LLM sampling.
        *   `idempotencyKey` (string): Key for idempotent requests.
    *   `contextWindow` (object): Context management.
        *   `maxPromptTokens` (integer): Max tokens allowed in the prompt.
        *   `truncationStrategy` (string, `enum: [front, middle, back]`): How to truncate context.

**Example:**
```yaml
behavior:
  responseFormat:
    type: json
    jsonSchemaRef: "schemas/coding-result-response.json"
  toolChoice: auto
  reasoning:
    enabled: true
    maxReasoningTokens: 500
  determinism:
    seed: 12345
  contextWindow:
    maxPromptTokens: 8000
    truncationStrategy: "middle"
```

### 2.12. llmGateways (Optional)
A list of available LLM gateways that this agent can utilize.
*   **Purpose**: To define the connection points and authentication details for various LLM providers, abstracting them from the agent's core LLM configuration.
*   **Fields**:
    *   `identity` (object): Gateway identity (URN/UUID, `displayName`).
    *   `endpoint` (string): Base URL for the LLM gateway API.
    *   `vendor` (string): LLM vendor (e.g., `OpenAI`, `Anthropic`).
    *   `apiVersion` (string): API version.
    *   `defaultModel` (string): Default model for this gateway.
    *   `models` (array of strings): List of models supported by this gateway.
    *   `authentication` (object): Authentication details.
        *   `type` (string, `enum: [OAuth2.1, ApiKey, OIDC, ManagedIdentity, None]`).
        *   `oauth2_1`, `apiKey`, `oidc`, `managedIdentity`: Specific configuration for each auth type.

**Example:**
```yaml
llmGateways:
  - identity:
      urn: "urn:optum:llm-gateways:azure-openai-us-east"
      displayName: "Azure OpenAI US East"
    endpoint: "https://openaicommons.azure.com/openai/deployments/gpt-4"
    vendor: "AzureOpenAI"
    apiVersion: "2024-02-15-preview"
    defaultModel: "gpt-4-32k"
    models: ["gpt-4-32k", "gpt-4", "gpt-3.5-turbo"]
    authentication:
      type: ApiKey
      apiKey:
        headerName: "api-key"
        secretRef:
          keyName: "azure-openai-api-key"
```

### 2.13. llm (Mandatory)
Configuration for the specific Large Language Model used by this agent.
*   **Purpose**: To specify the LLM provider, model, and generation parameters the agent will use for its primary reasoning and response generation.
*   **Fields**:
    *   `provider` (string, `enum: [AmazonBedrock, Anthropic, AzureOpenAI, Cohere, GoogleVertexAI, Local, Meta, MistralAI, Ollama, OpenAI]`): Direct LLM provider.
    *   `gatewayRef` (object): Reference to an `llmGateways` entry (URN/UUID).
    *   `model` (string): Specific model name to use (e.g., `gpt-4-32k`).
    *   `parameters` (object): LLM generation parameters.
        *   `temperature` (number): Sampling temperature.
        *   `topP` (number): Top-p (nucleus) sampling.
        *   `maxTokens` (integer): Maximum tokens to generate.
        *   `stopSequences` (array of strings): Sequences to stop generation.

**Example:**
```yaml
llm:
  gatewayRef:
    urn: "urn:optum:llm-gateways:azure-openai-us-east"
  model: "gpt-4-32k"
  parameters:
    temperature: 0.2
    topP: 0.9
    maxTokens: 1024
    stopSequences: ["<|end_of_turn|>", "Observation:"]
```

### 2.14. mcpServers (Optional)
List of Model Context Protocol (MCP) servers providing tools.
*   **Purpose**: To define the endpoints and authentication for external services that offer tools for the agent to use.
*   **Fields**:
    *   `identity` (object): MCP server identity (URN/UUID, `displayName`).
    *   `url` (string): Base URL for the MCP server.
    *   `protocol` (string, `enum: [http, https, ws, wss, grpc]`): Communication protocol.
    *   `authentication` (object): Authentication details (similar to `llmGateways.authentication`).

**Example:**
```yaml
mcpServers:
  - identity:
      urn: "urn:optum:mcp-servers:clinical-apis"
      displayName: "Clinical APIs MCP Server"
    url: "https://clinical-apis.optum.com/mcp/v1"
    protocol: "https"
    authentication:
      type: OAuth2.1
      oauth2_1:
        clientId: "clinical-agent-client"
        clientSecretRef:
          keyName: "clinical-apis-oauth-secret"
        tokenUrl: "https://auth.optum.com/oauth/token"
        scope: "clinical.read clinical.write"
```

### 2.15. tools (Optional)
Tools bound to this agent from MCP servers.
*   **Purpose**: To specify which tools (functions/APIs) the agent has access to, how they are configured, and how they map to agent inputs/outputs.
*   **Fields**:
    *   `identity` (object): Tool identity (URN/UUID).
    *   `name` (string): Name of the tool binding within the agent (e.g., `icd10cm_lookup`).
    *   `description` (string): Description of the tool's purpose.
    *   `mcp` (object): MCP-specific configuration.
        *   `serverRef` (object): Reference to an `mcpServers` entry (URN/UUID).
        *   `toolName` (string): Name of the tool as defined by the MCP server.
        *   `version` (string): Specific tool version.
        *   `schemaHash` (string): Hash of the tool schema.
    *   `defaults` (object): Default parameters for the tool.
    *   `parameterMapping` (object): Mapping agent input to tool parameters.
    *   `timeoutMs` (integer): Timeout for the tool call.
    *   `retries` (integer): Number of retries.
    *   `cacheTTL` (integer): Cache time-to-live for results.
    *   `limits` (object): Rate/concurrency limits.
        *   `rpm` (integer): Requests per minute.
        *   `concurrency` (integer): Max concurrent calls.
    *   `authOverride` (object): Override authentication for this tool.

**Example:**
```yaml
tools:
  - name: "icd10cm_lookup"
    description: "Looks up ICD-10-CM codes based on clinical terms."
    mcp:
      serverRef:
        urn: "urn:optum:mcp-servers:clinical-apis"
      toolName: "ICD10CMCodeLookup"
      version: "1.0"
    defaults:
      fuzzyMatch: true
    parameterMapping:
      query: "$.input.clinicalTerm"
    timeoutMs: 5000
    retries: 2
```

### 2.16. knowledgeBases (Optional)
List of knowledge bases the agent can access.
*   **Purpose**: To provide the agent with access to external data sources for Retrieval-Augmented Generation (RAG).
*   **Fields**:
    *   `identity` (object): Knowledge base identity (URN/UUID).
    *   `name` (string): Name of the knowledge base binding.
    *   `type` (string, `enum: [AzureBlobVectorize, PostgresPgvector, AzureCosmosDb, AzureAISearch]`): Type of knowledge base.
    *   `connection` (object): Connection details (e.g., `connectionStringSecretRef`, `endpoint`).
    *   `indexing` (object): Indexing configuration (e.g., `autoIngest`, `schedule`).

**Example:**
```yaml
knowledgeBases:
  - name: "clinical_guidelines_kb"
    type: "AzureAISearch"
    connection:
      endpoint: "https://clinicalkb.search.windows.net"
      index: "coding-guidelines-index"
      connectionStringSecretRef:
        keyName: "azure-ai-search-connection-string"
    indexing:
      autoIngest: true
      schedule: "0 0 * * *" # Daily at midnight
```

### 2.17. rag (Optional)
Retrieval-Augmented Generation (RAG) configuration.
*   **Purpose**: To define how the agent will retrieve and use information from knowledge bases to augment its responses.
*   **Fields**:
    *   `ingestion` (object): Data ingestion settings (e.g., `chunker`, `chunkSize`, `schedule`).
    *   `embedding` (object): Embedding model settings (e.g., `model`, `dimension`).
    *   `index` (object): Vector index settings (e.g., `metric`, `hnsw`, `ivf`, `hybrid`).
    *   `retrieval` (object): Retrieval settings (e.g., `topK`, `mmr`, `recencyBoost`, `requireCitations`).
    *   `retention` (object): Data retention settings (e.g., `ttlDays`, `lineage`).

**Example:**
```yaml
rag:
  ingestion:
    chunker: "semantic"
    chunkSize: 500
    chunkOverlap: 100
    dedupe: true
    schedule: "0 1 * * *" # Daily at 1 AM
  embedding:
    model: "text-embedding-ada-002"
    dimension: 1536
  index:
    metric: "cosine"
    hybrid: true
  retrieval:
    topK: 5
    mmr: true
    recencyBoost: true
    requireCitations: true
  retention:
    ttlDays: 365
    lineage: true
```

### 2.18. api (Optional)
API endpoints exposed by the agent.
*   **Purpose**: To define the external interfaces through which other applications or agents can interact with this agent.
*   **Fields**:
    *   `openapiRef` (string, `format: uri`): Reference to an OpenAPI specification.
    *   `endpoints` (array of objects): Specific API endpoints.
        *   `name` (string, `enum: [ingest, upsert, query, retrieve, chat, run, evaluate]`): Standardized name for the function.
        *   `method` (string, `enum: [GET, POST, PUT, DELETE, PATCH]`): HTTP method.
        *   `path` (string): Path for the endpoint (e.g., `/api/v1/query`).
        *   `contentTypes` (array of strings): Supported MIME types.
        *   `authScopes` (array of strings): Required OAuth scopes.
        *   `rateLimit` (object): Rate limiting (e.g., `rpm`, `rps`).
        *   `streaming` (boolean): Supports streaming responses.
        *   `errorModelRef` (string): Reference to the error model.

**Example:**
```yaml
api:
  openapiRef: "https://api.optum.com/agents/clinical-coder/openapi.yaml"
  endpoints:
    - name: "run"
      method: "POST"
      path: "/v1/code"
      contentTypes: ["application/json"]
      authScopes: ["agent.clinical_coder.run"]
      rateLimit:
        rpm: 100
        rps: 5
      streaming: false
```

### 2.19. a2aRegistries (Optional)
List of Agent-to-Agent (A2A) registries.
*   **Purpose**: To configure connections to external registries where other agents can be discovered or this agent can publish its capabilities.
*   **Fields**:
    *   `identity` (object): Registry identity (URN/UUID, `displayName`).
    *   `url` (string): Base URL for the registry.
    *   `protocol` (string, `enum: [http, https, ws, wss, grpc]`): Communication protocol.
    *   `authentication` (object): Authentication details.

**Example:**
```yaml
a2aRegistries:
  - identity:
      urn: "urn:optum:a2a-registries:enterprise"
      displayName: "Optum Enterprise A2A Registry"
    url: "https://a2a.optum.com/registry/v1"
    protocol: "https"
    authentication:
      type: OIDC
      oidc:
        issuer: "https://sso.optum.com"
        audience: "a2a-registry"
        clientId: "clinical-coder-agent"
```

### 2.20. a2a (Optional)
A2A capabilities and configuration for this agent.
*   **Purpose**: To define how this agent participates in the Agent-to-Agent ecosystem, including its public "capability card" and how it discovers/publishes to registries.
*   **Fields**:
    *   `card` (object): Agent's A2A capability card (defines what it offers).
        *   `protocolVersion` (string): A2A protocol version.
        *   `name`, `description`, `version`, `iconUrl`, `documentationUrl`.
        *   `provider` (object): Organization providing the agent.
        *   `preferredInterface` (object): Primary communication interface (URL, transport).
        *   `additionalInterfaces` (array of objects): Other supported interfaces.
        *   `capabilities` (object): Streaming, push notifications, extensions.
        *   `securitySchemes`, `security` (array of objects): Security details.
        *   `defaultInputModes`, `defaultOutputModes` (array of strings).
        *   `skills` (array of objects): List of skills the agent offers via A2A (ID, name, description, tags, examples, input/output modes, security).
    *   `publishTo` (array of objects): Registries to publish this agent's card to.
        *   `registryRef` (object): Reference to an `a2aRegistries` entry (URN/UUID).
        *   `visibility` (string, `enum: [private, workspace, tenant, public]`).
    *   `discovery` (object): Discovery configuration for finding other agents.
        *   `registryRefs` (array of objects): Registries to query for discovery.
    *   `callPolicy` (object): Policy for incoming A2A calls.
        *   `allowedAgentAudiences` (array of objects): URN/UUID of allowed calling agents.

**Example:**
```yaml
a2a:
  card:
    protocolVersion: "1.0"
    name: "OptumClinicalCoder"
    description: "An agent that provides precise clinical coding services for patient notes."
    version: "1.0.0"
    preferredInterface:
      url: "https://clinical-coder.optum.com/a2a/jsonrpc"
      transport: "JSONRPC"
    skills:
      - id: "codeClinicalNote"
        name: "Code Clinical Note"
        description: "Abstracts clinical information and assigns ICD-10-CM and CPT codes."
        tags: ["coding", "medical", "clinical"]
        inputModes: ["text/plain", "application/json"]
        outputModes: ["application/json"]
  publishTo:
    - registryRef:
        urn: "urn:optum:a2a-registries:enterprise"
      visibility: "tenant"
  discovery:
    registryRefs:
      - urn: "urn:optum:a2a-registries:enterprise"
  callPolicy:
    allowedAgentAudiences:
      - urn: "urn:optum:agents:clinical-workflow-orchestrator"
```

### 2.21. stateManagement (Optional)
Configuration for agent memory and session state.
*   **Purpose**: To define how the agent stores and retrieves short-term conversational memory and longer-term user session data.
*   **Fields**:
    *   `memory` (object): Short-term conversational memory.
        *   `type` (string, `enum: [InMemory, Redis, Postgres]`): Type of memory store.
        *   `retentionPolicy` (string): Policy for retaining memory data (e.g., `session`, `lastN`, `timeWindow`).
    *   `session` (object): Longer-term user session data.
        *   `ttlSeconds` (integer): Time-to-live for session data.
        *   `store` (string, `enum: [InMemory, Redis, Postgres]`): Type of session store.

**Example:**
```yaml
stateManagement:
  memory:
    type: Redis
    retentionPolicy: "lastN:10" # Keep last 10 turns of conversation
  session:
    ttlSeconds: 3600 # Session expires after 1 hour of inactivity
    store: Redis
```

### 2.22. secretsProvider (Mandatory if secrets are used by `llmGateways`, `mcpServers`, or `knowledgeBases`)
Centralized secret management configuration.
*   **Purpose**: To specify how the agent securely accesses sensitive information like API keys or connection strings.
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
    vaultName: "OptumClinicalAgentVault"
    tenantId: "abcdef12-3456-7890-abcd-ef1234567890"
    useManagedIdentity: true
```

### 2.23. securityConfig (Optional)
Security configurations, including guardrails and evaluations.
*   **Purpose**: To define safeguards for agent inputs and outputs, and to schedule evaluations for ongoing performance and safety monitoring.
*   **Fields**:
    *   `guardrails` (object): Input/Output guardrails.
        *   `input` (object): Input validation/analysis.
        *   `output` (object): Output validation/analysis.
    *   `evaluations` (array of objects): Agent performance evaluations.
        *   `name` (string): Name of the evaluation.
        *   `metric` (string): Metric to evaluate (e.g., `accuracy`, `toxicity`).
        *   `datasetRef` (string): Reference to the evaluation dataset.
        *   `schedule` (string): Cron-like schedule for evaluation runs.

**Example:**
```yaml
securityConfig:
  guardrails:
    input:
      piiDetection: { enabled: true, action: "redact" }
      toxicityDetection: { enabled: true, threshold: 0.8, action: "flag" }
    output:
      dataLeakagePrevention: { enabled: true, sensitiveDataTypes: ["PHI", "PCI"] }
  evaluations:
    - name: "coding-accuracy-monthly"
      metric: "accuracy"
      datasetRef: "datasets/clinical-coding-test-data.json"
      schedule: "0 0 1 * *" # First day of every month
```

### 2.24. security (Optional)
Security policies and configurations.
*   **Purpose**: To define access control (RBAC), data handling policies, network egress rules, and secret lifecycle management for the agent.
*   **Fields**:
    *   `rbac` (object): Role-Based Access Control.
        *   `roles` (array of strings): Roles assigned to the agent.
        *   `allowedCallers` (array of objects): URN/UUID of agents allowed to call this agent directly.
    *   `dataPolicy` (object): Data handling policies.
        *   `classification` (string, `enum: [Public, Internal, Confidential, PHI]`): Data classification level.
        *   `redactPII` (boolean): Automatically redact PII.
        *   `retentionDays` (integer): Data retention period.
    *   `egress` (object): Network egress policies.
        *   `allowlist` (array of strings): Allowed external domains/URLs.
        *   `mtls` (boolean): Require mutual TLS.
        *   `jwksUri` (string): URI for JWKS.
    *   `secrets` (object): Secret lifecycle management.
        *   `rotationDays` (integer): Secret rotation interval.
        *   `useManagedIdentity` (boolean): Use Managed Identity for secret access.

**Example:**
```yaml
security:
  rbac:
    roles: ["clinical-coder-role", "auditor"]
    allowedCallers:
      - urn: "urn:optum:agents:triage-assistant"
  dataPolicy:
    classification: PHI
    redactPII: true
    retentionDays: 90
  egress:
    allowlist:
      - "*.optum.com"
      - "api.icd10cm.com"
  secrets:
    rotationDays: 90
    useManagedIdentity: true
```

### 2.25. ops (Optional)
Operational configurations.
*   **Purpose**: To define default timeouts, retry policies, rate limits, and resource allocations for the agent's runtime.
*   **Fields**:
    *   `timeouts` (object): Default timeout settings.
        *   `defaultMs` (integer): Default timeout in milliseconds.
    *   `retries` (object): Default retry settings.
        *   `max` (integer): Maximum retries.
        *   `backoffMs` (integer): Base backoff time.
    *   `rateLimit` (object): Default rate limiting.
        *   `rpm` (integer): Requests per minute.
        *   `rps` (integer): Requests per second.
    *   `resources` (object): Resource allocation.
        *   `cpu` (string): CPU request/limit (e.g., `500m`).
        *   `memory` (string): Memory request/limit (e.g., `1Gi`).
        *   `gpu` (string): GPU request/limit (e.g., `1`).

**Example:**
```yaml
ops:
  timeouts:
    defaultMs: 30000 # 30 seconds
  retries:
    max: 3
    backoffMs: 
