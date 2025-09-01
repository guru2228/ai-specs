# Healthcare Agent Configuration Samples

## 1. Clinical Care Management Agent

```yaml
apiVersion: agents.enterprise.com/v1alpha9
kind: Agent
metadata:
  name: clinical-care-coordinator
  namespace: healthcare-prod
spec:
  schemaVersion: v1alpha9
  
  identity:
    urn: "urn:enterprise:healthcare:agent:care-coordinator:v1"
    uuid: "a7b8c9d0-1234-5678-90ab-cdef12345678"
    displayName: "Clinical Care Coordinator Agent"
    icon: "https://assets.enterprise.com/icons/healthcare-coordinator.svg"
    version: "1.2.0"
    git:
      repo: "https://github.com/enterprise/healthcare-agents"
      path: "agents/clinical/care-coordinator"
      ref: "refs/heads/main"
      commit: "abc123def456"
    ownerContacts:
      - "clinical-ops@enterprise.com"
      - "dr.smith@enterprise.com"
    createdAt: "2025-01-15T10:00:00Z"
    updatedAt: "2025-08-30T14:30:00Z"
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "clinical-operations"
    environment: prod
    labels:
      department: "care-management"
      compliance: "hipaa"
      tier: "critical"
    tags:
      - "patient-care"
      - "care-coordination"
      - "clinical"
    lifecycle: prod
  
  ownership:
    organization: "Enterprise Healthcare"
    team: "Clinical Operations"
    user: "sarah.johnson@enterprise.com"
    sloEmail: "clinical-slo@enterprise.com"
    askId: "CARE-2025-001"
  
  role: "Senior Clinical Care Coordinator"
  
  goal: "Coordinate comprehensive patient care by managing care plans, tracking patient progress, facilitating provider communication, and ensuring continuity of care across multiple touchpoints while maintaining HIPAA compliance."
  
  backstory: "I am an experienced clinical care coordinator with 15 years of expertise in managing complex patient cases across multiple specialties. I specialize in creating personalized care plans, coordinating between providers, and ensuring patients receive timely, appropriate care while navigating the healthcare system efficiently."
  
  systemPrompt: |
    You are a Senior Clinical Care Coordinator responsible for managing comprehensive patient care. Your primary responsibilities include:
    
    1. CARE PLAN MANAGEMENT
    - Develop and maintain individualized care plans based on patient diagnoses, conditions, and goals
    - Coordinate with multidisciplinary care teams
    - Track care plan adherence and outcomes
    - Adjust plans based on patient progress and clinical indicators
    
    2. PATIENT MONITORING
    - Review patient vitals, lab results, and clinical notes
    - Identify care gaps and potential complications early
    - Monitor medication adherence and side effects
    - Track appointment attendance and follow-up compliance
    
    3. PROVIDER COORDINATION
    - Facilitate communication between primary care, specialists, and ancillary services
    - Schedule and coordinate appointments
    - Ensure proper handoffs during care transitions
    - Manage referrals and authorizations
    
    4. PATIENT ENGAGEMENT
    - Conduct regular check-ins with high-risk patients
    - Provide education on conditions and self-management
    - Address barriers to care (transportation, financial, social)
    - Support medication management and adherence
    
    5. COMPLIANCE & DOCUMENTATION
    - Maintain HIPAA compliance in all communications
    - Document all care coordination activities
    - Report quality metrics and outcomes
    - Ensure proper consent and authorization procedures
    
    IMPORTANT GUIDELINES:
    - Always verify patient identity before discussing PHI
    - Use clinical terminology appropriately while ensuring patient understanding
    - Escalate urgent clinical issues to appropriate providers immediately
    - Never provide medical advice beyond your scope - defer to licensed providers
    - Document all interactions thoroughly in the patient record
    - Consider social determinants of health in care planning
    
    When processing patient information:
    - Prioritize based on acuity and risk stratification
    - Use evidence-based care protocols
    - Coordinate with insurance for coverage verification
    - Track and report care quality metrics
  
  persona:
    agentType: "Clinical Specialist"
    tone: "Professional, Empathetic, Clear"
    topics:
      - "Chronic Disease Management"
      - "Care Transitions"
      - "Medication Management"
      - "Patient Education"
      - "Healthcare Navigation"
      - "Social Determinants of Health"
  
  ioConfig:
    inputs:
      - format: json
        schemaRef: "schemas/fhir/patient-bundle.json"
        description: "FHIR patient bundles"
      - format: text
        contentTypes: ["text/plain"]
        description: "Clinical notes and communications"
      - format: file
        contentTypes: ["application/pdf", "application/dicom"]
        description: "Medical documents and imaging"
    outputs:
      - format: json
        schemaRef: "schemas/fhir/care-plan.json"
        description: "FHIR care plans"
      - format: text
        contentTypes: ["text/plain", "text/html"]
        description: "Care summaries and reports"
  
  behavior:
    responseFormat:
      type: json
      jsonSchemaRef: "schemas/clinical/care-response.json"
    toolChoice: auto
    reasoning:
      enabled: true
      maxReasoningTokens: 4000
    determinism:
      seed: 42
      idempotencyKey: "${patientId}-${timestamp}"
    contextWindow:
      maxPromptTokens: 100000
      truncationStrategy: middle
  
  llmGateways:
    - identity:
        urn: "urn:enterprise:gateway:clinical-llm:v1"
        displayName: "Clinical LLM Gateway"
      endpoint: "https://llm-gateway.enterprise.com/clinical/v1"
      vendor: "AzureOpenAI"
      apiVersion: "2024-08-01-preview"
      defaultModel: "gpt-4-turbo"
      models:
        - "gpt-4-turbo"
        - "gpt-4o"
      authentication:
        type: ManagedIdentity
        managedIdentity:
          clientId: "clinical-agent-identity"
  
  llm:
    gatewayRef:
      urn: "urn:enterprise:gateway:clinical-llm:v1"
    model: "gpt-4-turbo"
    parameters:
      temperature: 0.3
      topP: 0.9
      maxTokens: 4000
      stopSequences: ["[END_CARE_PLAN]", "[PHI_BOUNDARY]"]
  
  mcpServers:
    - identity:
        urn: "urn:enterprise:mcp:ehr-server:v1"
        displayName: "EHR Integration Server"
      url: "https://mcp-ehr.enterprise.com"
      protocol: https
      authentication:
        type: OAuth2.1
        oauth2_1:
          clientId: "clinical-agent"
          clientSecretRef:
            keyName: "ehr-client-secret"
          tokenUrl: "https://auth.enterprise.com/oauth/token"
          scope: "ehr.read ehr.write care-plans.manage"
    
    - identity:
        urn: "urn:enterprise:mcp:scheduling:v1"
        displayName: "Scheduling System"
      url: "https://mcp-scheduling.enterprise.com"
      protocol: https
      authentication:
        type: ApiKey
        apiKey:
          headerName: "X-API-Key"
          secretRef:
            keyName: "scheduling-api-key"
  
  tools:
    - identity:
        urn: "urn:enterprise:tool:patient-lookup:v1"
      name: "patientLookup"
      description: "Search and retrieve patient records from EHR"
      mcp:
        serverRef:
          urn: "urn:enterprise:mcp:ehr-server:v1"
        toolName: "searchPatients"
      timeoutMs: 5000
      retries: 2
      limits:
        rpm: 100
        concurrency: 5
    
    - identity:
        urn: "urn:enterprise:tool:care-plan:v1"
      name: "carePlanManager"
      description: "Create, update, and manage patient care plans"
      mcp:
        serverRef:
          urn: "urn:enterprise:mcp:ehr-server:v1"
        toolName: "manageCareplan"
      defaults:
        planType: "comprehensive"
        reviewPeriod: "30days"
      timeoutMs: 10000
    
    - identity:
        urn: "urn:enterprise:tool:appointment:v1"
      name: "appointmentScheduler"
      description: "Schedule and manage patient appointments"
      mcp:
        serverRef:
          urn: "urn:enterprise:mcp:scheduling:v1"
        toolName: "scheduleAppointment"
      cacheTTL: 300
  
  knowledgeBases:
    - identity:
        urn: "urn:enterprise:kb:clinical-guidelines:v1"
      name: "clinicalGuidelines"
      type: AzureAISearch
      connection:
        endpoint: "https://search-clinical.enterprise.com"
        index: "clinical-guidelines-v2"
        connectionStringSecretRef:
          keyName: "azure-search-connection"
      indexing:
        autoIngest: true
        schedule: "0 2 * * *"
    
    - identity:
        urn: "urn:enterprise:kb:drug-interactions:v1"
      name: "drugInteractions"
      type: PostgresPgvector
      connection:
        database: "clinical_knowledge"
        connectionStringSecretRef:
          keyName: "postgres-clinical-connection"
  
  rag:
    ingestion:
      chunker: semantic
      chunkSize: 512
      chunkOverlap: 50
      dedupe: true
      schedule: "0 */6 * * *"
    embedding:
      model: "text-embedding-3-large"
      dimension: 3072
    index:
      metric: cosine
      hybrid: true
      hnsw:
        m: 16
        efConstruction: 200
    retrieval:
      topK: 10
      mmr: true
      recencyBoost: true
      requireCitations: true
    retention:
      ttlDays: 365
      lineage: true
  
  stateManagement:
    memory:
      type: Redis
      retentionPolicy: "session"
    session:
      ttlSeconds: 28800
      store: Redis
  
  secretsProvider:
    type: AzureKeyVault
    azureKeyVault:
      vaultName: "clinical-secrets-prod"
      tenantId: "enterprise-tenant-id"
      useManagedIdentity: true
  
  security:
    rbac:
      roles: ["ClinicalCoordinator", "CareManager"]
    dataPolicy:
      classification: PHI
      redactPII: true
      retentionDays: 2555
    egress:
      allowlist:
        - "*.enterprise.com"
        - "api.fhir.org"
      mtls: true
  
  ops:
    timeouts:
      defaultMs: 30000
    retries:
      max: 3
      backoffMs: 1000
    rateLimit:
      rpm: 600
      rps: 20
    resources:
      cpu: "2"
      memory: "4Gi"
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "clinical-care-coordinator"
    logs:
      redaction: true
    metrics:
      - "care_plans_created"
      - "patient_interactions"
      - "care_gaps_identified"
      - "coordination_tasks_completed"

status:
  phase: Running
  conditions:
    - type: Available
      status: "True"
      lastTransitionTime: "2025-08-30T14:30:00Z"
      reason: "DeploymentSuccessful"
      message: "Agent is running and healthy"
```

## 2. Utilization Management Agent

```yaml
apiVersion: agents.enterprise.com/v1alpha9
kind: Agent
metadata:
  name: utilization-review-specialist
  namespace: healthcare-prod
spec:
  schemaVersion: v1alpha9
  
  identity:
    urn: "urn:enterprise:healthcare:agent:utilization-mgmt:v1"
    uuid: "b8c9d0e1-2345-6789-01bc-def234567890"
    displayName: "Utilization Management Specialist"
    icon: "https://assets.enterprise.com/icons/utilization-mgmt.svg"
    version: "2.1.0"
    git:
      repo: "https://github.com/enterprise/healthcare-agents"
      path: "agents/utilization/review-specialist"
      ref: "refs/heads/main"
      commit: "def456ghi789"
    ownerContacts:
      - "utilization-team@enterprise.com"
      - "medical-director@enterprise.com"
    createdAt: "2025-02-01T09:00:00Z"
    updatedAt: "2025-08-30T15:00:00Z"
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "utilization-management"
    environment: prod
    labels:
      department: "utilization-review"
      compliance: "hipaa-ncqa"
      tier: "critical"
      accreditation: "urac"
    tags:
      - "prior-auth"
      - "medical-necessity"
      - "cost-management"
      - "quality-assurance"
    lifecycle: prod
  
  ownership:
    organization: "Enterprise Healthcare"
    team: "Utilization Management"
    user: "michael.chen@enterprise.com"
    sloEmail: "um-slo@enterprise.com"
    askId: "UM-2025-002"
  
  role: "Senior Utilization Review Specialist"
  
  goal: "Optimize healthcare resource utilization by conducting comprehensive medical necessity reviews, managing prior authorizations, ensuring appropriate level of care, and balancing quality patient care with cost-effectiveness while maintaining regulatory compliance."
  
  backstory: "I am a seasoned utilization management specialist with extensive experience in clinical review, healthcare economics, and regulatory compliance. I have processed thousands of authorization requests across all levels of care, from routine procedures to complex specialty treatments. My expertise includes InterQual and MCG criteria application, appeals management, and provider relations."
  
  systemPrompt: |
    You are a Senior Utilization Review Specialist responsible for managing healthcare resource utilization and authorization processes. Your core responsibilities include:
    
    1. PRIOR AUTHORIZATION MANAGEMENT
    - Review authorization requests for medical necessity
    - Apply evidence-based clinical criteria (InterQual, MCG, Milliman)
    - Determine appropriate level of care and setting
    - Process urgent, concurrent, and retrospective reviews
    - Document determination rationale comprehensively
    
    2. CLINICAL CRITERIA APPLICATION
    - Apply standardized review criteria consistently
    - Consider patient-specific clinical factors
    - Evaluate alternative treatment options
    - Assess cost-effectiveness without compromising quality
    - Stay current with clinical guidelines and criteria updates
    
    3. PROVIDER COLLABORATION
    - Conduct peer-to-peer reviews when necessary
    - Communicate determination decisions clearly
    - Provide education on criteria and guidelines
    - Facilitate appeals and reconsiderations
    - Build collaborative relationships with providers
    
    4. REGULATORY COMPLIANCE
    - Ensure timely review turnaround (urgent: 72hrs, standard: 14 days)
    - Maintain NCQA, URAC, and state-specific compliance
    - Follow CMS guidelines for Medicare Advantage
    - Document according to regulatory requirements
    - Track and report quality metrics
    
    5. CARE OPTIMIZATION
    - Identify opportunities for care improvement
    - Recommend evidence-based alternatives
    - Flag potential quality or safety concerns
    - Coordinate with case management for complex cases
    - Monitor utilization patterns and trends
    
    CRITICAL REVIEW GUIDELINES:
    - Apply criteria objectively and consistently
    - Consider the whole patient, not just the diagnosis
    - Document medical necessity clearly with clinical evidence
    - Escalate complex cases to Medical Director when appropriate
    - Never deny solely based on cost without clinical justification
    - Ensure all determinations are timely and well-documented
    
    DETERMINATION FRAMEWORK:
    - Approved: Meets clinical criteria, medically necessary
    - Modified: Alternative level/setting/duration approved
    - Denied: Does not meet criteria (provide specific rationale)
    - Pended: Additional information required (specify exactly what)
    
    For each review, consider:
    - Diagnosis and clinical presentation
    - Severity of illness and intensity of service
    - Prior treatments and responses
    - Comorbidities and complications
    - Psychosocial factors
    - Discharge planning needs
    
    QUALITY INDICATORS TO MONITOR:
    - Appropriate admissions and continued stays
    - Readmission risks
    - Length of stay optimization
    - Transition of care planning
    - Provider variation patterns
    - Appeals and overturn rates
  
  persona:
    agentType: "Clinical Reviewer"
    tone: "Professional, Objective, Collaborative"
    topics:
      - "Medical Necessity Review"
      - "Clinical Guidelines"
      - "Healthcare Economics"
      - "Regulatory Compliance"
      - "Quality Management"
      - "Provider Relations"
  
  ioConfig:
    inputs:
      - format: json
        schemaRef: "schemas/um/authorization-request.json"
        description: "Prior authorization requests"
      - format: file
        contentTypes: ["application/pdf", "image/jpeg", "image/png"]
        description: "Clinical documentation and imaging"
      - format: xml
        schemaRef: "schemas/x12/278-request.xsd"
        description: "X12 278 authorization requests"
    outputs:
      - format: json
        schemaRef: "schemas/um/determination.json"
        description: "Authorization determinations"
      - format: xml
        schemaRef: "schemas/x12/278-response.xsd"
        description: "X12 278 authorization responses"
      - format: text
        contentTypes: ["text/plain", "text/html"]
        description: "Determination letters and reports"
  
  behavior:
    responseFormat:
      type: json
      jsonSchemaRef: "schemas/um/review-response.json"
    toolChoice: required
    reasoning:
      enabled: true
      maxReasoningTokens: 6000
    determinism:
      seed: 100
      idempotencyKey: "${authNumber}-${reviewDate}"
    contextWindow:
      maxPromptTokens: 120000
      truncationStrategy: back
  
  llmGateways:
    - identity:
        urn: "urn:enterprise:gateway:um-llm:v1"
        displayName: "UM Clinical LLM Gateway"
      endpoint: "https://llm-gateway.enterprise.com/um/v1"
      vendor: "Anthropic"
      apiVersion: "2024-08-01"
      defaultModel: "claude-3-opus"
      models:
        - "claude-3-opus"
        - "claude-3.5-sonnet"
      authentication:
        type: OAuth2.1
        oauth2_1:
          clientId: "um-agent-client"
          clientSecretRef:
            keyName: "um-oauth-secret"
          tokenUrl: "https://auth.enterprise.com/oauth/token"
          scope: "um.review um.authorize clinical.read"
  
  llm:
    gatewayRef:
      urn: "urn:enterprise:gateway:um-llm:v1"
    model: "claude-3-opus"
    parameters:
      temperature: 0.2
      topP: 0.95
      maxTokens: 8000
      stopSequences: ["[END_REVIEW]", "[DETERMINATION_COMPLETE]"]
  
  mcpServers:
    - identity:
        urn: "urn:enterprise:mcp:um-system:v1"
        displayName: "UM Authorization System"
      url: "https://mcp-um.enterprise.com"
      protocol: https
      authentication:
        type: OAuth2.1
        oauth2_1:
          clientId: "um-mcp-client"
          clientSecretRef:
            keyName: "um-mcp-secret"
          tokenUrl: "https://auth.enterprise.com/oauth/token"
          scope: "um.full-access"
    
    - identity:
        urn: "urn:enterprise:mcp:clinical-criteria:v1"
        displayName: "Clinical Criteria Server"
      url: "https://mcp-criteria.enterprise.com"
      protocol: https
      authentication:
        type: ApiKey
        apiKey:
          headerName: "X-Criteria-Key"
          secretRef:
            keyName: "criteria-api-key"
    
    - identity:
        urn: "urn:enterprise:mcp:claims-system:v1"
        displayName: "Claims Integration"
      url: "https://mcp-claims.enterprise.com"
      protocol: grpc
      authentication:
        type: ManagedIdentity
        managedIdentity:
          clientId: "um-claims-identity"
  
  tools:
    - identity:
        urn: "urn:enterprise:tool:auth-intake:v1"
      name: "authorizationIntake"
      description: "Process incoming authorization requests"
      mcp:
        serverRef:
          urn: "urn:enterprise:mcp:um-system:v1"
        toolName: "intakeAuthorization"
      timeoutMs: 5000
      retries: 2
      cacheTTL: 0
    
    - identity:
        urn: "urn:enterprise:tool:criteria-check:v1"
      name: "criteriaChecker"
      description: "Apply clinical criteria for medical necessity"
      mcp:
        serverRef:
          urn: "urn:enterprise:mcp:clinical-criteria:v1"
        toolName: "applyCriteria"
      defaults:
        criteriaSet: "InterQual2025"
        includeAlternatives: true
      timeoutMs: 8000
    
    - identity:
        urn: "urn:enterprise:tool:claims-history:v1"
      name: "claimsHistory"
      description: "Retrieve member claims and utilization history"
      mcp:
        serverRef:
          urn: "urn:enterprise:mcp:claims-system:v1"
        toolName: "getMemberClaims"
      cacheTTL: 3600
      limits:
        rpm: 200
        concurrency: 10
    
    - identity:
        urn: "urn:enterprise:tool:determination:v1"
      name: "determinationProcessor"
      description: "Process and document authorization determinations"
      mcp:
        serverRef:
          urn: "urn:enterprise:mcp:um-system:v1"
        toolName: "processDetermination"
      timeoutMs: 10000
  
  knowledgeBases:
    - identity:
        urn: "urn:enterprise:kb:medical-policies:v1"
      name: "medicalPolicies"
      type: AzureAISearch
      connection:
        endpoint: "https://search-um.enterprise.com"
        index: "medical-policies-2025"
        connectionStringSecretRef:
          keyName: "azure-search-um"
      indexing:
        autoIngest: true
        schedule: "0 1 * * *"
    
    - identity:
        urn: "urn:enterprise:kb:clinical-criteria:v1"
      name: "clinicalCriteriaKB"
      type: PostgresPgvector
      connection:
        database: "um_criteria"
        connectionStringSecretRef:
          keyName: "postgres-um-connection"
    
    - identity:
        urn: "urn:enterprise:kb:provider-contracts:v1"
      name: "providerContracts"
      type: AzureCosmosDb
      connection:
        endpoint: "https://cosmos-um.enterprise.com"
        database: "provider-agreements"
        connectionStringSecretRef:
          keyName: "cosmos-um-connection"
  
  rag:
    ingestion:
      chunker: semantic
      chunkSize: 768
      chunkOverlap: 100
      dedupe: true
      schedule: "0 0 * * *"
    embedding:
      model: "text-embedding-3-large"
      dimension: 3072
    index:
      metric: cosine
      hybrid: true
      ivf:
        nlist: 100
        nprobe: 10
    retrieval:
      topK: 15
      mmr: true
      filtersRef: "filters/um-retrieval.json"
      recencyBoost: true
      requireCitations: true
    retention:
      ttlDays: 2555
      lineage: true
  
  api:
    openapiRef: "https://api.enterprise.com/specs/um-agent-v2.yaml"
    endpoints:
      - name: query
        method: POST
        path: "/api/v2/authorization/review"
        contentTypes: ["application/json"]
        authScopes: ["um.review", "um.authorize"]
        rateLimit:
          rpm: 1000
          rps: 20
        streaming: false
      - name: retrieve
        method: GET
        path: "/api/v2/determination/{authNumber}"
        contentTypes: ["application/json"]
        authScopes: ["um.read"]
        rateLimit:
          rpm: 2000
      - name: run
        method: POST
        path: "/api/v2/batch/review"
        contentTypes: ["application/json"]
        authScopes: ["um.batch"]
        streaming: true
  
  a2aRegistries:
    - identity:
        urn: "urn:enterprise:registry:healthcare-agents:v1"
        displayName: "Healthcare Agent Registry"
      url: "https://registry.enterprise.com/healthcare"
      protocol: https
      authentication:
        type: OIDC
        oidc:
          issuer: "https://auth.enterprise.com"
          audience: "agent-registry"
          clientId: "um-agent"
          clientSecretRef:
            keyName: "registry-oidc-secret"
  
  a2a:
    card:
      protocolVersion: "1.0.0"
      name: "Utilization Management Specialist"
      description: "Automated utilization review and authorization management"
      version: "2.1.0"
      iconUrl: "https://assets.enterprise.com/icons/um-agent.svg"
      documentationUrl: "https://docs.enterprise.com/agents/um"
      provider:
        organization: "Enterprise Healthcare"
        url: "https://enterprise.com"
      preferredInterface:
        url: "https://um-agent.enterprise.com/a2a"
        transport: "HTTP+JSON"
      capabilities:
        streaming: true
        pushNotifications: false
        stateTransitionHistory: true
      defaultInputModes: ["structured", "document"]
      defaultOutputModes: ["structured", "report"]
      skills:
        - id: "prior-auth-review"
          name: "Prior Authorization Review"
          description: "Review and determine medical necessity for authorization requests"
          tags: ["authorization", "medical-necessity", "clinical-review"]
          examples:
            - "Review authorization for MRI lumbar spine"
            - "Evaluate inpatient admission request"
          inputModes: ["structured"]
          outputModes: ["structured"]
        - id: "criteria-application"
          name: "Clinical Criteria Application"
          description: "Apply InterQual, MCG, or custom criteria"
          tags: ["criteria", "guidelines", "evidence-based"]
          inputModes: ["structured", "document"]
          outputModes: ["structured", "report"]
        - id: "appeals-review"
          name: "Appeals Processing"
          description: "Review and process authorization appeals"
          tags: ["appeals", "reconsideration", "peer-review"]
          inputModes: ["document"]
          outputModes: ["structured", "report"]
      supportsAuthenticatedExtendedCard: true
    
    publishTo:
      - registryRef:
          urn: "urn:enterprise:registry:healthcare-agents:v1"
        visibility: workspace
    
    discovery:
      registryRefs:
        - urn: "urn:enterprise:registry:healthcare-agents:v1"
    
    callPolicy:
      allowedAgentAudiences:
        - urn: "urn:enterprise:healthcare:agent:care-coordinator:v1"
        - urn: "urn:enterprise:healthcare:agent:case-manager:v1"
        - urn: "urn:enterprise:healthcare:agent:medical-director:v1"
  
  stateManagement:
    memory:
      type: Redis
      retentionPolicy: "timeWindow"
    session:
      ttlSeconds: 86400
      store: Postgres
  
  secretsProvider:
    type: AzureKeyVault
    azureKeyVault:
      vaultName: "um-secrets-prod"
      tenantId: "enterprise-tenant-id"
      useManagedIdentity: true
  
  securityConfig:
    guardrails:
      input:
        piiDetection: true
        phiValidation: true
        threatDetection: true
      output:
        piiRedaction: true
        complianceCheck: true
    evaluations:
      - name: "determination-accuracy"
        metric: "accuracy"
        datasetRef: "datasets/um-test-cases-2025"
        schedule: "0 0 * * 0"
      - name: "criteria-consistency"
        metric: "consistency"
        datasetRef: "datasets/criteria-validation"
        schedule: "0 0 1 * *"
  
  security:
    rbac:
      roles: ["UtilizationReviewer", "ClinicalReviewer", "UMSpecialist"]
      allowedCallers:
        - urn: "urn:enterprise:healthcare:agent:provider-portal:v1"
        - urn: "urn:enterprise:healthcare:agent:member-services:v1"
    dataPolicy:
      classification: PHI
      redactPII: true
      retentionDays: 2555
    egress:
      allowlist:
        - "*.enterprise.com"
        - "interqual.com"
        - "mcg.com"
      mtls: true
      jwksUri: "https://auth.enterprise.com/.well-known/jwks.json"
    secrets:
      rotationDays: 90
      useManagedIdentity: true
  
  ops:
    timeouts:
      defaultMs: 45000
    retries:
      max: 3
      backoffMs: 2000
    rateLimit:
      rpm: 1000
      rps: 30
    resources:
      cpu: "4"
      memory: "8Gi"
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "um-review-specialist"
    logs:
      redaction: true
    metrics:
      - "authorizations_processed"
      - "determinations_issued"
      - "average_review_time"
      - "approval_rate"
      - "appeals_rate"
      - "criteria_match_rate"
      - "overturn_rate"
  
  evaluation:
    datasets:
      - "datasets/um-historical-reviews-2024"
      - "datasets/clinical-scenarios-2025"
    metrics:
      - "determination_accuracy"
      - "turnaround_time"
      - "consistency_score"
      - "compliance_rate"
    thresholds:
      determination_accuracy: 0.95
      turnaround_time: 72
      consistency_score: 0.90
      compliance_rate: 0.99
    gatingPolicy: warn
  
  community:
    docsUrl: "https://docs.enterprise.com/agents/um-specialist"
    examplesUrl: "https://github.com/enterprise/um-examples"
    contributionGuideUrl: "https://docs.enterprise.com/contribute/um-agent"
    license: "Enterprise-Healthcare-License-2.0"

status:
  phase: Running
  conditions:
    - type: Available
      status: "True"
      lastTransitionTime: "2025-08-30T15:00:00Z"
      reason: "HealthyAndOperational"
      message: "UM agent is processing reviews normally"
    - type: Progressing
      status: "False"
      lastTransitionTime: "2025-08-30T15:00:00Z"
      reason: "StableVersion"
      message: "No updates in progress"