# Utilization Management Workflow Samples with Human-in-the-Loop

## 1. Prior Authorization Review Workflow with Clinical Escalation (Sequential Mode with HITL)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: prior-auth-review-hitl
  namespace: um-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:prior-auth-hitl:v1"
    uuid: "wf-um-001-2345-6789-0123456789ab"
    displayName: "Prior Authorization Review with Human Escalation"
    version: "2.0.0"
  
  ownership:
    team: "Utilization Management"
    organization: "Enterprise Healthcare"
    user: "dr.patricia.kumar@enterprise.com"
    askId: "UM-WF-2025-001"
    sloEmail: "um-workflows@enterprise.com"
  
  description: "Prior authorization workflow with automated initial review, RN clinical review for moderate complexity cases, and MD peer-to-peer review for denials or complex cases. Implements HITL checkpoints with specialized interface agents for human reviewers."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "utilization-management"
    environment: prod
    labels:
      workflow-type: "prior-authorization"
      review-level: "multi-tier"
      compliance: "ncqa-urac"
      sla: "standard"
    tags:
      - "prior-auth"
      - "clinical-review"
      - "human-in-loop"
  
  participants:
    - alias: "intake-processor"
      agentRef:
        name: "auth-intake-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:intake:v1"
    
    - alias: "auto-reviewer"
      agentRef:
        name: "automated-review-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:auto-review:v1"
      overrides:
        temperature: 0.1
        timeoutMs: 30000
    
    - alias: "rn-interface"
      agentRef:
        name: "rn-review-interface-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:rn-interface:v1"
    
    - alias: "md-interface"
      agentRef:
        name: "md-review-interface-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:md-interface:v1"
    
    - alias: "determination-processor"
      agentRef:
        name: "determination-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:determination:v1"
    
    - alias: "notification-sender"
      agentRef:
        name: "notification-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:notification:v1"
  
  inlineOrchestrator:
    metadata:
      name: "um-workflow-orchestrator"
    spec:
      ownership:
        team: "Utilization Management"
        organization: "Enterprise Healthcare"
      
      role: "UM Workflow Orchestrator with HITL Coordination"
      
      goal: "Orchestrate prior authorization reviews through automated and human review tiers, managing handoffs to RN and MD reviewers when clinical judgment is required, while ensuring SLA compliance."
      
      systemPrompt: |
        You are the UM Workflow Orchestrator managing prior authorization reviews with human-in-the-loop integration.
        
        REVIEW TIERS AND ROUTING LOGIC:
        
        1. AUTOMATED REVIEW (Tier 1):
           - Straightforward requests matching clear criteria
           - Auto-approve if all criteria met
           - Route to RN if partial match or additional review needed
           - Route to MD if potential denial or complex clinical scenario
        
        2. RN CLINICAL REVIEW (Tier 2):
           - Moderate complexity cases
           - Cases with partial criteria match
           - Can approve based on clinical judgment
           - Must escalate denials to MD
           - Interface: Present case via RN portal with decision tools
        
        3. MD PEER-TO-PEER (Tier 3):
           - All potential denials
           - Complex clinical scenarios
           - Appeals and reconsiderations
           - Provider peer-to-peer requests
           - Interface: Full clinical portal with communication tools
        
        HUMAN INTERFACE MANAGEMENT:
        - Create review tasks in appropriate queue
        - Present relevant clinical information
        - Capture human decisions and rationale
        - Resume workflow after human input
        - Track review times for SLA compliance
        
        SLA REQUIREMENTS:
        - Urgent: 72 hours
        - Standard: 14 days
        - Expedited appeal: 72 hours
        
        WORKFLOW CONTROLS:
        - Monitor queue depths and reviewer availability
        - Reassign tasks if SLA at risk
        - Escalate if approaching deadline
        - Document all decision points
        - Maintain audit trail for compliance
      
      llm:
        provider: AzureOpenAI
        model: "gpt-4-turbo"
        parameters:
          temperature: 0.2
          maxTokens: 6000
      
      mcpServers:
        - identity:
            urn: "urn:enterprise:mcp:um-queue:v1"
            displayName: "UM Queue Management"
          url: "https://mcp-queue.enterprise.com"
          protocol: https
          authentication:
            type: OAuth2.1
            oauth2_1:
              clientId: "um-orchestrator"
              clientSecretRef:
                keyName: "queue-oauth-secret"
              tokenUrl: "https://auth.enterprise.com/oauth/token"
              scope: "queue.manage review.assign"
      
      tools:
        - identity:
            urn: "urn:enterprise:tool:queue-manager:v1"
          name: "queueManager"
          description: "Manage review queues and task assignments"
          mcp:
            serverRef:
              urn: "urn:enterprise:mcp:um-queue:v1"
            toolName: "manageQueue"
      
      stateManagement:
        memory:
          type: Redis
          retentionPolicy: "session"
        session:
          ttlSeconds: 1209600  # 14 days for standard SLA
          store: Postgres
  
  orchestration:
    orchestrator: "inline"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/um"
        registryIdentity:
          urn: "urn:enterprise:registry:um-agents:v1"
  
  topology:
    mode: Sequential
    steps:
      - name: "intake-processing"
        order: 1
        agentAlias: "intake-processor"
        task: "Process authorization request, validate completeness, extract key clinical information, verify member eligibility, and identify service type and urgency level."
        input: "workflow.initialInput"
        onError:
          strategy: FailFast
      
      - name: "cardiology-review"
        agentAlias: "cardiology-reviewer"
        task: |
          Cardiology specialist review interface:
          - Focused cardiac history and diagnostic results
          - Current cardiac medications and interventions
          - Specific cardiac aspects of the requested service
          - Risk stratification tools
          - Evidence-based cardiology guidelines
          - Capture specialist opinion and recommendations
        input: "steps.case-preparation.output"
      
      - name: "oncology-review"
        agentAlias: "oncology-reviewer"
        task: |
          Oncology specialist review interface:
          - Cancer staging and treatment history
          - Molecular markers and pathology reports
          - Prior treatment responses and toxicities
          - Clinical trial eligibility assessment
          - NCCN guideline references
          - Capture oncology-specific recommendations
        input: "steps.case-preparation.output"
      
      - name: "surgery-review"
        agentAlias: "surgery-reviewer"
        task: |
          Surgical specialist review interface:
          - Surgical candidacy assessment
          - Operative risk evaluation
          - Alternative surgical approaches
          - Pre-operative optimization needs
          - Expected outcomes and complications
          - Capture surgical recommendations
        input: "steps.case-preparation.output"
      
      - name: "pharmacy-review"
        agentAlias: "pharmacy-reviewer"
        task: |
          Clinical pharmacy review interface:
          - Medication therapy review
          - Drug interactions and contraindications
          - Dosing optimization for organ function
          - Cost-effectiveness analysis
          - Formulary alternatives
          - Capture pharmacy recommendations
        input: "steps.case-preparation.output"
      
      - name: "panel-moderation"
        agentAlias: "moderator-interface"
        task: |
          Panel moderator consolidation interface:
          - Real-time view of all specialist inputs
          - Conflict identification and resolution tools
          - Virtual panel discussion facilitation
          - Voting mechanism for disputed items
          - Final recommendation synthesis
          - Document panel consensus and dissenting opinions
        input: "steps.case-preparation.output"
        dependencies: ["cardiology-review", "oncology-review", "surgery-review", "pharmacy-review"]
      
      - name: "consensus-determination"
        agentAlias: "consensus-builder"
        task: "Generate final panel determination based on specialist inputs and moderator synthesis. Create comprehensive rationale incorporating all viewpoints."
        input: "steps.panel-moderation.output"
        dependencies: ["panel-moderation"]
  
  variables:
    panelReviewDeadline: "48hours"
    minimumPanelists: "3"
    consensusThreshold: "0.66"
  
  ops:
    timeouts:
      defaultMs: 7200000  # 2 hours for panel completion
    concurrency: 4  # All specialists review in parallel
    rateLimit:
      rpm: 20
  
  telemetry:
    metrics:
      - "panel_review_completion_time"
      - "specialist_participation_rate"
      - "consensus_achievement_rate"
      - "dissenting_opinion_rate"

status:
  phase: Running
  lastExecutionTime: "2025-08-31T14:00:00Z"
```

## 5. Retrospective Review with Audit HITL (Loop Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: retrospective-review-audit
  namespace: um-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:retro-review:v1"
    uuid: "wf-um-005-6789-0123-456789012345"
    displayName: "Retrospective Review with Audit Loop"
    version: "1.1.0"
  
  ownership:
    team: "Retrospective Review"
    organization: "Enterprise Healthcare"
    user: "david.kim@enterprise.com"
    askId: "UM-WF-2025-005"
    sloEmail: "retro-review@enterprise.com"
  
  description: "Iterative retrospective review workflow for post-service authorization with automated screening, clinical auditor review for questionable claims, and provider education loops for pattern identification."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "retrospective-review"
    environment: prod
    labels:
      workflow-type: "retrospective"
      review-timing: "post-service"
      audit-enabled: "true"
  
  participants:
    - alias: "claims-analyzer"
      agentRef:
        name: "claims-analysis-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:claims-analysis:v1"
    
    - alias: "pattern-detector"
      agentRef:
        name: "pattern-detection-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:patterns:v1"
    
    - alias: "auditor-interface"
      agentRef:
        name: "clinical-auditor-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:audit-portal:v1"
    
    - alias: "provider-educator"
      agentRef:
        name: "provider-education-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:education:v1"
    
    - alias: "recovery-processor"
      agentRef:
        name: "payment-recovery-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:recovery:v1"
  
  orchestration:
    orchestrator: "claims-analyzer"
    protocol:
      type: Local
      local:
        serviceDiscovery: "kubernetes-dns"
  
  topology:
    mode: Loop
    steps:
      - name: "claims-screening"
        agentAlias: "claims-analyzer"
        task: "Screen submitted claims for retrospective review triggers including high-dollar services, outlier patterns, and targeted review categories."
        input: "workflow.initialInput"
        loopConfig:
          maxIterations: 100  # Process up to 100 claims per batch
      
      - name: "pattern-analysis"
        agentAlias: "pattern-detector"
        task: "Analyze provider billing patterns, identify outliers, detect potential fraud/waste/abuse indicators, and flag claims requiring detailed review."
        input: "steps.claims-screening.output"
        dependencies: ["claims-screening"]
      
      - name: "clinical-audit"
        agentAlias: "auditor-interface"
        task: |
          Clinical auditor review portal for flagged claims:
          - Detailed claim information with service codes
          - Medical record request and review tools
          - Documentation adequacy assessment
          - Medical necessity evaluation against retrospective criteria
          - Coding accuracy verification
          - Provider communication interface
          - Determination with recovery amount calculation
          - Pattern documentation for provider education
        input: "steps.pattern-analysis.output"
        condition: "steps.pattern-analysis.output.requiresAudit == true"
        dependencies: ["pattern-analysis"]
        onError:
          strategy: Retry
          maxRetries: 2
          backoffMs: 3600000  # 1 hour
      
      - name: "provider-education"
        agentAlias: "provider-educator"
        task: "Generate provider education materials based on identified patterns, schedule education sessions, and track provider improvement."
        input: "steps.clinical-audit.output"
        condition: "steps.clinical-audit.output.educationNeeded == true"
        dependencies: ["clinical-audit"]
      
      - name: "payment-recovery"
        agentAlias: "recovery-processor"
        task: "Process payment recoveries for claims determined to be inappropriately paid, generate recovery letters, and manage provider disputes."
        input: "steps.clinical-audit.output"
        condition: "steps.clinical-audit.output.recoveryAmount > 0"
        dependencies: ["clinical-audit"]
  
  variables:
    auditThreshold: "$10000"
    patternThreshold: "3"
    recoveryMinimum: "$500"
    educationTrigger: "5"
  
  ops:
    timeouts:
      defaultMs: 1800000  # 30 minutes
    retries:
      max: 2
      backoffMs: 600000
    concurrency: 5
  
  telemetry:
    metrics:
      - "claims_reviewed_count"
      - "audit_trigger_rate"
      - "recovery_amount_total"
      - "provider_pattern_detection_rate"
      - "education_session_count"

status:
  phase: Running
  lastExecutionTime: "2025-08-31T09:00:00Z"
```

## 6. Emergency Authorization Workflow with On-Call MD (Aggregate Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: emergency-auth-workflow
  namespace: um-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:emergency-auth:v1"
    uuid: "wf-um-006-7890-1234-567890123456"
    displayName: "Emergency Authorization with On-Call MD"
    version: "2.0.0"
  
  ownership:
    team: "Emergency Authorization"
    organization: "Enterprise Healthcare"
    user: "dr.susan.patel@enterprise.com"
    askId: "UM-WF-2025-006"
    sloEmail: "emergency-auth@enterprise.com"
  
  description: "Aggregate workflow for emergency and urgent authorizations requiring rapid multi-source input synthesis, with on-call MD interface for after-hours determinations and real-time provider consultation."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "emergency-auth"
    environment: prod
    labels:
      workflow-type: "emergency"
      availability: "24x7"
      response-time: "critical"
  
  participants:
    - alias: "urgency-triager"
      agentRef:
        name: "urgency-assessment-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:urgency:v1"
    
    - alias: "clinical-data-aggregator"
      agentRef:
        name: "clinical-aggregation-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:data-aggregator:v1"
    
    - alias: "coverage-validator"
      agentRef:
        name: "benefit-validation-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:benefits:v1"
    
    - alias: "network-checker"
      agentRef:
        name: "network-adequacy-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:network:v1"
    
    - alias: "on-call-md-interface"
      agentRef:
        name: "oncall-physician-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:oncall-md:v1"
    
    - alias: "rapid-determinator"
      agentRef:
        name: "emergency-determination-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:emergency-determination:v1"
  
  inlineOrchestrator:
    metadata:
      name: "emergency-orchestrator"
    spec:
      ownership:
        team: "Emergency Authorization"
        organization: "Enterprise Healthcare"
      
      role: "Emergency Authorization Orchestrator"
      
      goal: "Coordinate rapid authorization decisions for emergency and urgent services by aggregating multiple data sources and engaging on-call physicians for complex determinations."
      
      systemPrompt: |
        You are the Emergency Authorization Orchestrator managing time-critical authorization requests.
        
        EMERGENCY TRIAGE LEVELS:
        - STAT: Life-threatening, requires response in <1 hour
        - Urgent: Serious condition, requires response in <4 hours  
        - Expedited: Time-sensitive, requires response in <24 hours
        
        AGGREGATION REQUIREMENTS:
        - Collect all inputs within time constraints
        - Synthesize partial information if needed
        - Default to approval for true emergencies
        - Engage on-call MD for any uncertainty
        
        ON-CALL MD ENGAGEMENT:
        - Page immediately for STAT requests
        - Provide mobile-optimized interface
        - Include critical data summary
        - Enable direct provider consultation
        - Support voice-to-text for rapid documentation
        
        DECISION FRAMEWORK:
        - Life-threatening → Auto-approve with retro review
        - Urgent with clear criteria → Auto-approve
        - Complex/unclear → On-call MD review
        - Non-urgent → Route to standard workflow
        
        COMPLIANCE:
        - EMTALA requirements
        - Prudent layperson standard
        - State emergency service laws
        - Document all decision factors
      
      llm:
        provider: AzureOpenAI
        model: "gpt-4-turbo"
        parameters:
          temperature: 0.1
          maxTokens: 4000
      
      stateManagement:
        memory:
          type: InMemory
          retentionPolicy: "session"
        session:
          ttlSeconds: 86400
          store: Redis
  
  orchestration:
    orchestrator: "inline"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/um"
  
  topology:
    mode: Aggregate
    steps:
      - name: "urgency-assessment"
        agentAlias: "urgency-triager"
        task: "Assess urgency level based on presenting symptoms, vital signs, and clinical indicators. Determine response timeline requirement."
        input: "workflow.initialInput"
      
      - name: "clinical-aggregation"
        agentAlias: "clinical-data-aggregator"
        task: "Rapidly aggregate available clinical data from EHR, recent visits, active diagnoses, and current medications."
        input: "workflow.initialInput"
      
      - name: "coverage-check"
        agentAlias: "coverage-validator"
        task: "Verify member eligibility, benefit coverage for requested service, and any applicable limitations or exclusions."
        input: "workflow.initialInput"
      
      - name: "network-validation"
        agentAlias: "network-checker"
        task: "Check provider network status, identify in-network alternatives if needed, and calculate potential member liability."
        input: "workflow.initialInput"
      
      - name: "on-call-review"
        agentAlias: "on-call-md-interface"
        task: |
          On-call physician review interface:
          - Mobile-responsive emergency portal
          - Critical data summary dashboard
          - One-touch provider callback
          - Voice-to-text documentation
          - Quick approval/denial buttons
          - Partial approval options
          - Alternative service recommendations
          - Real-time chat with requesting provider
          - Integration with paging system
        input: "workflow.initialInput"
        condition: "steps.urgency-assessment.output.level in ['STAT', 'Urgent'] && steps.clinical-aggregation.output.complexityScore > 0.7"
        dependencies: ["urgency-assessment", "clinical-aggregation", "coverage-check", "network-validation"]
      
      - name: "rapid-determination"
        agentAlias: "rapid-determinator"
        task: "Generate immediate determination based on aggregated inputs and on-call MD decision if applicable. Issue authorization number and notify all parties."
        dependencies: [
          "urgency-assessment",
          "clinical-aggregation", 
          "coverage-check",
          "network-validation",
          "on-call-review"
        ]
  
  variables:
    statResponseTime: "1hour"
    urgentResponseTime: "4hours"
    expeditedResponseTime: "24hours"
    autoApprovalThreshold: "0.9"
  
  artifacts:
    emergencyAuthNumber: "${rapid-determination.authNumber}"
    responseTime: "${rapid-determination.processingTime}"
    mdReviewer: "${on-call-review.reviewerName}"
  
  ops:
    timeouts:
      defaultMs: 3600000  # 1 hour maximum
    retries:
      max: 0  # No retries for emergency
    concurrency: 4  # All data gathering in parallel
    rateLimit:
      rpm: 200  # High rate for emergencies
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "emergency-auth-workflow"
    logs:
      redaction: true
    metrics:
      - "emergency_response_time"
      - "stat_authorization_rate"
      - "on_call_engagement_rate"
      - "auto_approval_rate"
      - "average_determination_time"
  
  security:
    rbac:
      roles: ["EmergencyAuthorization", "OnCallPhysician", "UMSupervisor"]
      allowedCallers:
        - urn: "urn:enterprise:system:ed-system:v1"
        - urn: "urn:enterprise:system:provider-hotline:v1"
    dataPolicy:
      classification: PHI
      redactPII: true
    egress:
      allowlist:
        - "*.enterprise.com"
        - "emergency-paging.service.com"
  
  secretsProvider:
    type: AzureKeyVault
    azureKeyVault:
      vaultName: "emergency-auth-kv"
      tenantId: "enterprise-tenant-id"
      useManagedIdentity: true

status:
  phase: Running
  lastExecutionTime: "2025-08-31T18:45:00Z"
  conditions:
    - type: Available
      status: "True"
      lastTransitionTime: "2025-08-31T18:45:00Z"
      message: "Emergency workflow active with 2 on-call MDs available"
    - type: Progressing
      status: "True"
      lastTransitionTime: "2025-08-31T18:45:00Z"
      message: "Processing emergency authorization request"
```workflow.initialInput"
        onError:
          strategy: Retry
          maxRetries: 2
          backoffMs: 5000
      
      - name: "automated-review"
        order: 2
        agentAlias: "auto-reviewer"
        task: "Apply clinical criteria (InterQual/MCG) to authorization request. Determine if request can be auto-approved, needs clinical review, or requires additional information."
        input: "steps.intake-processing.output"
        onError:
          strategy: FailFast
      
      - name: "rn-clinical-review"
        order: 3
        agentAlias: "rn-interface"
        task: |
          Present case to RN reviewer through clinical portal interface:
          - Display member history, current request, and clinical documentation
          - Show applicable criteria and guideline references
          - Provide decision support tools and similar case examples
          - Capture RN decision (approve/escalate/pend for info)
          - Document clinical rationale and any additional findings
          - Queue management: Assign to available RN based on specialty and workload
        input: "steps.automated-review.output"
        condition: "steps.automated-review.output.decision == 'requiresClinicalReview' && steps.automated-review.output.complexity == 'moderate'"
        onError:
          strategy: Retry
          maxRetries: 1
          backoffMs: 300000  # 5 minutes for human availability
      
      - name: "md-peer-review"
        order: 4
        agentAlias: "md-interface"
        task: |
          Present case to MD reviewer through comprehensive clinical portal:
          - Full clinical history, documentation, and imaging access
          - Direct provider communication tools for peer-to-peer
          - Evidence-based medicine references and specialty guidelines
          - Previous authorization history and patterns
          - Capture detailed MD determination with clinical rationale
          - Support for partial approvals or alternative recommendations
          - Schedule and conduct peer-to-peer calls if requested
        input: "steps.automated-review.output.decision == 'potentialDenial' ? steps.automated-review.output : steps.rn-clinical-review.output"
        condition: "steps.automated-review.output.decision == 'potentialDenial' || steps.automated-review.output.complexity == 'high' || steps.rn-clinical-review.output.escalateToMD == true"
        onError:
          strategy: Retry
          maxRetries: 2
          backoffMs: 1800000  # 30 minutes for MD availability
      
      - name: "determination-processing"
        order: 5
        agentAlias: "determination-processor"
        task: "Process final determination from appropriate review tier. Generate determination letter with specific rationale, applicable criteria, and appeal rights. Update authorization system and claims adjudication rules."
        input: |
          steps.md-peer-review.output ?? 
          steps.rn-clinical-review.output ?? 
          steps.automated-review.output
        onError:
          strategy: FailFast
      
      - name: "notification-delivery"
        order: 6
        agentAlias: "notification-sender"
        task: "Send determination notifications to provider and member through preferred channels. Include determination details, clinical rationale, appeal instructions, and any alternative recommendations."
        input: "steps.determination-processing.output"
        onError:
          strategy: Retry
          maxRetries: 3
          backoffMs: 60000
  
  variables:
    urgentSLA: "72hours"
    standardSLA: "14days"
    autoApprovalThreshold: "0.95"
    rnQueueTarget: "4hours"
    mdQueueTarget: "8hours"
  
  artifacts:
    authorizationNumber: "${intake-processing.authNumber}"
    determinationId: "${determination-processing.determinationId}"
    reviewerNotes: "${rn-clinical-review.clinicalNotes ?? md-peer-review.clinicalNotes}"
  
  ops:
    timeouts:
      defaultMs: 900000  # 15 minutes default
    retries:
      max: 2
      backoffMs: 60000
    concurrency: 1  # Sequential processing
    rateLimit:
      rpm: 100
      rps: 5
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "um-prior-auth-workflow"
    logs:
      redaction: true
    metrics:
      - "auto_approval_rate"
      - "rn_review_rate"
      - "md_review_rate"
      - "average_determination_time"
      - "sla_compliance_rate"
      - "human_review_queue_depth"
      - "peer_to_peer_rate"
  
  security:
    rbac:
      roles: ["UMReviewer", "ClinicalReviewer", "MedicalDirector"]
      allowedCallers:
        - urn: "urn:enterprise:system:provider-portal:v1"
        - urn: "urn:enterprise:system:claims:v1"
    dataPolicy:
      classification: PHI
      redactPII: true
    egress:
      allowlist:
        - "*.enterprise.com"
        - "interqual.com"
        - "mcg.com"
  
  secretsProvider:
    type: AzureKeyVault
    azureKeyVault:
      vaultName: "um-workflows-kv"
      tenantId: "enterprise-tenant-id"
      useManagedIdentity: true

status:
  phase: Running
  lastExecutionTime: "2025-08-31T10:00:00Z"
  conditions:
    - type: Available
      status: "True"
      lastTransitionTime: "2025-08-31T10:00:00Z"
      message: "Workflow operational with 3 RNs and 2 MDs available"
```

## 2. Concurrent Review Workflow with Nurse Case Manager HITL (Network Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: concurrent-review-workflow
  namespace: um-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:concurrent-review:v1"
    uuid: "wf-um-002-3456-7890-123456789012"
    displayName: "Concurrent Review with Case Management"
    version: "1.5.0"
  
  ownership:
    team: "Utilization Management"
    organization: "Enterprise Healthcare"
    user: "nancy.williams@enterprise.com"
    askId: "UM-WF-2025-002"
    sloEmail: "concurrent-review@enterprise.com"
  
  description: "Concurrent review workflow for ongoing inpatient stays with automated daily reviews, nurse case manager interventions for length of stay management, and physician advisor consultations for complex cases."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "utilization-management"
    environment: prod
    labels:
      workflow-type: "concurrent-review"
      setting: "inpatient"
      review-frequency: "daily"
  
  participants:
    - alias: "census-monitor"
      agentRef:
        name: "census-monitoring-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:census:v1"
    
    - alias: "criteria-validator"
      agentRef:
        name: "continued-stay-validator"
        identityRef:
          urn: "urn:enterprise:um:agent:stay-criteria:v1"
    
    - alias: "nurse-cm-interface"
      agentRef:
        name: "nurse-case-manager-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:ncm-portal:v1"
    
    - alias: "physician-advisor-interface"
      agentRef:
        name: "physician-advisor-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:pa-portal:v1"
    
    - alias: "discharge-coordinator"
      agentRef:
        name: "discharge-planning-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:discharge:v1"
    
    - alias: "denial-processor"
      agentRef:
        name: "denial-management-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:denial:v1"
  
  orchestration:
    orchestrator: "census-monitor"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/um"
  
  topology:
    mode: Network
    steps:
      - name: "daily-census-review"
        agentAlias: "census-monitor"
        task: "Review all active inpatient admissions, identify cases requiring concurrent review based on length of stay, DRG, and payer requirements."
        input: "workflow.initialInput"
        dependencies: []
      
      - name: "continued-stay-validation"
        agentAlias: "criteria-validator"
        task: "Apply InterQual or MCG continued stay criteria to each case. Determine if continued inpatient stay meets medical necessity."
        input: "steps.daily-census-review.output"
        dependencies: ["daily-census-review"]
      
      - name: "nurse-cm-review"
        agentAlias: "nurse-cm-interface"
        task: |
          Present cases to Nurse Case Manager for review:
          - Dashboard view of all assigned cases with LOS alerts
          - Clinical documentation and daily progress notes
          - Projected vs actual length of stay comparison
          - Barrier identification tools (clinical, social, system)
          - Discharge planning checklist and coordination tools
          - Ability to approve continued stays within defined parameters
          - Option to escalate to Physician Advisor
          - Documentation of case management interventions
        input: "steps.continued-stay-validation.output"
        condition: "steps.continued-stay-validation.output.requiresReview == true"
        dependencies: ["continued-stay-validation"]
      
      - name: "physician-advisor-consultation"
        agentAlias: "physician-advisor-interface"
        task: |
          Engage Physician Advisor for complex determinations:
          - Complete clinical picture with all documentation
          - Attending physician contact information
          - Criteria variance analysis and clinical justification
          - Alternative level of care recommendations
          - Physician-to-physician discussion scheduling
          - Capture determination and supporting rationale
          - Quality of care concerns escalation pathway
        input: "steps.nurse-cm-review.output"
        condition: "steps.nurse-cm-review.output.escalateToPA == true || steps.continued-stay-validation.output.potentialDenial == true"
        dependencies: ["nurse-cm-review", "continued-stay-validation"]
      
      - name: "discharge-planning"
        agentAlias: "discharge-coordinator"
        task: "Coordinate discharge planning activities including post-acute placement, DME needs, home health services, and follow-up appointments."
        input: "steps.nurse-cm-review.output"
        condition: "steps.nurse-cm-review.output.initiateDischarge == true"
        dependencies: ["nurse-cm-review"]
      
      - name: "denial-management"
        agentAlias: "denial-processor"
        task: "Process continued stay denials, generate adverse determination notices, coordinate with attending physician, and manage appeal rights notification."
        input: "steps.physician-advisor-consultation.output"
        condition: "steps.physician-advisor-consultation.output.determination == 'deny'"
        dependencies: ["physician-advisor-consultation"]
  
  variables:
    reviewFrequency: "daily"
    losTargetVariance: "1.5days"
    escalationThreshold: "2days"
  
  ops:
    timeouts:
      defaultMs: 1800000  # 30 minutes
    retries:
      max: 1
      backoffMs: 300000
    concurrency: 10  # Multiple cases reviewed in parallel
  
  telemetry:
    metrics:
      - "daily_census_count"
      - "continued_stay_approval_rate"
      - "average_los_vs_gmlos"
      - "nurse_interventions_per_case"
      - "physician_advisor_consultation_rate"

status:
  phase: Running
  lastExecutionTime: "2025-08-31T06:00:00Z"
```

## 3. Appeals Management Workflow with Multi-Level HITL (Hierarchical Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: appeals-management-workflow
  namespace: um-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:appeals-mgmt:v1"
    uuid: "wf-um-003-4567-8901-234567890123"
    displayName: "Appeals Management with Tiered Review"
    version: "1.2.0"
  
  ownership:
    team: "Appeals and Grievances"
    organization: "Enterprise Healthcare"
    user: "dr.james.rodriguez@enterprise.com"
    askId: "UM-WF-2025-003"
    sloEmail: "appeals-team@enterprise.com"
  
  description: "Hierarchical appeals workflow with automated triage, first-level clinical review by specialty-matched clinicians, second-level review by independent reviewers, and external IRO coordination when required."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "appeals-grievances"
    environment: prod
    labels:
      workflow-type: "appeals"
      compliance: "cms-medicare-advantage"
      review-levels: "multi-tier"
  
  participants:
    - alias: "appeals-intake"
      agentRef:
        name: "appeals-intake-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:appeals-intake:v1"
    
    - alias: "triage-agent"
      agentRef:
        name: "appeals-triage-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:appeals-triage:v1"
    
    - alias: "clinical-reviewer-interface"
      agentRef:
        name: "specialty-reviewer-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:specialty-review:v1"
    
    - alias: "medical-director-interface"
      agentRef:
        name: "medical-director-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:md-review:v1"
    
    - alias: "iro-coordinator"
      agentRef:
        name: "iro-coordination-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:iro:v1"
    
    - alias: "determination-writer"
      agentRef:
        name: "appeals-determination-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:appeals-determination:v1"
  
  inlineOrchestrator:
    metadata:
      name: "appeals-orchestrator"
    spec:
      ownership:
        team: "Appeals and Grievances"
        organization: "Enterprise Healthcare"
      
      role: "Appeals Workflow Orchestrator"
      
      goal: "Manage hierarchical appeals review process ensuring appropriate clinical expertise, regulatory compliance, and timely determinations."
      
      systemPrompt: |
        You are the Appeals Workflow Orchestrator managing a tiered review process with human clinical reviewers.
        
        APPEALS HIERARCHY:
        
        Level 1 - First Level Appeal:
        - Specialty-matched clinical reviewer (different from initial)
        - Can overturn previous denial
        - 30-day standard, 72-hour expedited timeline
        - Must offer peer-to-peer opportunity
        
        Level 2 - Second Level Appeal:
        - Medical Director or panel review
        - Independent from previous reviews
        - Final internal determination
        - 30-day standard, 72-hour expedited
        
        Level 3 - External Review:
        - Independent Review Organization (IRO)
        - Binding determination
        - Coordinate case file transfer
        - Monitor IRO timelines
        
        HUMAN REVIEWER ASSIGNMENT:
        - Match reviewer specialty to service type
        - Ensure reviewer independence
        - No previous involvement in case
        - Track reviewer availability and workload
        - Reassign if conflicts identified
        
        COMPLIANCE REQUIREMENTS:
        - CMS timelines for Medicare Advantage
        - State-specific appeal requirements
        - Documentation standards
        - Member notification requirements
      
      llm:
        provider: AzureOpenAI
        model: "gpt-4-turbo"
        parameters:
          temperature: 0.2
          maxTokens: 8000
      
      stateManagement:
        memory:
          type: Redis
          retentionPolicy: "session"
        session:
          ttlSeconds: 2592000  # 30 days
          store: Postgres
  
  orchestration:
    orchestrator: "inline"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/um"
  
  topology:
    mode: Hierarchical
    steps:
      - name: "appeal-intake"
        order: 1
        agentAlias: "appeals-intake"
        task: "Process appeal request, validate timeliness, identify appeal type and level, gather original determination and new clinical information."
        input: "workflow.initialInput"
      
      - name: "appeal-triage"
        order: 2
        agentAlias: "triage-agent"
        task: "Determine appeal urgency (standard vs expedited), identify required reviewer specialty, check for procedural issues, and route to appropriate review level."
        input: "steps.appeal-intake.output"
      
      - name: "first-level-clinical-review"
        order: 3
        agentAlias: "clinical-reviewer-interface"
        task: |
          Specialty-matched clinical reviewer portal:
          - Complete case file with new information highlighted
          - Original denial rationale and criteria applied
          - Additional clinical documentation submitted
          - Evidence-based guidelines and literature search tools
          - Peer-to-peer scheduling if requested
          - Decision capture with detailed clinical rationale
          - Option to partially overturn with modifications
        input: "steps.appeal-triage.output"
        condition: "steps.appeal-triage.output.appealLevel == 1"
        onError:
          strategy: Retry
          maxRetries: 2
          backoffMs: 1800000  # 30 minutes
      
      - name: "medical-director-review"
        order: 4
        agentAlias: "medical-director-interface"
        task: |
          Medical Director review portal for second-level appeals:
          - Full case history including first-level review
          - Panel review coordination if required
          - External consultant engagement tools
          - Comprehensive clinical literature access
          - Video conference for committee reviews
          - Final determination with binding rationale
          - Quality improvement flag for system issues
        input: "steps.first-level-clinical-review.output"
        condition: "steps.appeal-triage.output.appealLevel == 2 || (steps.first-level-clinical-review.output.determination == 'uphold' && workflow.initialInput.requestSecondLevel == true)"
        dependencies: ["first-level-clinical-review", "appeal-triage"]
      
      - name: "external-iro-review"
        order: 5
        agentAlias: "iro-coordinator"
        task: "Coordinate external review by Independent Review Organization. Compile and transmit case file, track IRO timeline, receive and process IRO determination."
        input: "steps.medical-director-review.output"
        condition: "steps.medical-director-review.output.determination == 'uphold' && workflow.initialInput.requestExternalReview == true"
        dependencies: ["medical-director-review"]
      
      - name: "determination-generation"
        order: 6
        agentAlias: "determination-writer"
        task: "Generate comprehensive appeal determination letter with specific rationale, criteria applied, and next level appeal rights. Update systems and notify all parties."
        input: |
          steps.external-iro-review.output ??
          steps.medical-director-review.output ??
          steps.first-level-clinical-review.output
        dependencies: ["first-level-clinical-review", "medical-director-review", "external-iro-review"]
  
  variables:
    standardTimeline: "30days"
    expeditedTimeline: "72hours"
    iroTimeline: "45days"
  
  ops:
    timeouts:
      defaultMs: 3600000  # 1 hour
    retries:
      max: 1
      backoffMs: 600000
    concurrency: 3
  
  telemetry:
    metrics:
      - "appeal_overturn_rate"
      - "level_1_overturn_rate"
      - "level_2_overturn_rate"
      - "iro_overturn_rate"
      - "timeline_compliance"
      - "reviewer_utilization"

status:
  phase: Running
```

## 4. Complex Case Round-Robin Review (Parallel Mode with HITL)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: complex-case-panel-review
  namespace: um-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:panel-review:v1"
    uuid: "wf-um-004-5678-9012-345678901234"
    displayName: "Complex Case Panel Review"
    version: "1.0.0"
  
  ownership:
    team: "Clinical Review Committee"
    organization: "Enterprise Healthcare"
    user: "dr.michelle.chang@enterprise.com"
    askId: "UM-WF-2025-004"
    sloEmail: "clinical-committee@enterprise.com"
  
  description: "Parallel panel review workflow for complex cases requiring multiple specialist opinions, with synchronized human reviewer inputs and consensus building through a moderator interface."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "clinical-review"
    environment: prod
    labels:
      workflow-type: "panel-review"
      case-complexity: "high"
      review-type: "multi-specialty"
  
  participants:
    - alias: "case-presenter"
      agentRef:
        name: "case-presentation-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:case-presenter:v1"
    
    - alias: "cardiology-reviewer"
      agentRef:
        name: "specialist-review-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:specialist-portal:v1"
      overrides:
        llmModel: "gpt-4-turbo"
    
    - alias: "oncology-reviewer"
      agentRef:
        name: "specialist-review-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:specialist-portal:v1"
      overrides:
        llmModel: "gpt-4-turbo"
    
    - alias: "surgery-reviewer"
      agentRef:
        name: "specialist-review-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:specialist-portal:v1"
      overrides:
        llmModel: "gpt-4-turbo"
    
    - alias: "pharmacy-reviewer"
      agentRef:
        name: "pharmacy-review-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:pharmacy-portal:v1"
    
    - alias: "moderator-interface"
      agentRef:
        name: "panel-moderator-portal"
        identityRef:
          urn: "urn:enterprise:um:agent:moderator:v1"
    
    - alias: "consensus-builder"
      agentRef:
        name: "consensus-determination-agent"
        identityRef:
          urn: "urn:enterprise:um:agent:consensus:v1"
  
  orchestration:
    orchestrator: "moderator-interface"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/um"
  
  topology:
    mode: Parallel
    steps:
      - name: "case-preparation"
        agentAlias: "case-presenter"
        task: "Prepare comprehensive case presentation including clinical history, current request, relevant imaging, lab results, and specific questions for panel review."
        input: "