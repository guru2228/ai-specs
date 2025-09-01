# Clinical Care Management Workflow Samples

## 1. Patient Admission and Care Planning Workflow (Sequential Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: patient-admission-care-planning
  namespace: healthcare-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:admission-care-planning:v1"
    uuid: "wf-abc123-4567-8901-234567890abc"
    displayName: "Patient Admission and Care Planning Workflow"
    version: "1.0.0"
  
  ownership:
    team: "Clinical Operations"
    organization: "Enterprise Healthcare"
    user: "dr.jennifer.wilson@enterprise.com"
    askId: "CARE-WF-2025-001"
    sloEmail: "clinical-workflows@enterprise.com"
  
  description: "Comprehensive workflow for patient admission processing, initial assessment, care plan development, and care team coordination. Ensures all admission requirements are met, appropriate assessments are conducted, and a personalized care plan is established within regulatory timeframes."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "clinical-operations"
    environment: prod
    labels:
      workflow-type: "admission"
      department: "inpatient-services"
      compliance: "hipaa-joint-commission"
    tags:
      - "admission"
      - "care-planning"
      - "patient-intake"
  
  participants:
    - alias: "admissions-agent"
      agentRef:
        name: "admissions-coordinator"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:admissions:v1"
    
    - alias: "clinical-assessor"
      agentRef:
        name: "clinical-assessment-specialist"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:assessment:v1"
    
    - alias: "care-planner"
      agentRef:
        name: "clinical-care-coordinator"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:care-coordinator:v1"
    
    - alias: "pharmacy-reviewer"
      agentRef:
        name: "pharmacy-specialist"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:pharmacy:v1"
    
    - alias: "discharge-planner"
      agentRef:
        name: "discharge-planning-specialist"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:discharge:v1"
  
  inlineOrchestrator:
    metadata:
      name: "admission-workflow-orchestrator"
      labels:
        type: "orchestrator"
        workflow: "admission"
    spec:
      ownership:
        team: "Clinical Operations"
        organization: "Enterprise Healthcare"
        user: "orchestrator-admin@enterprise.com"
      
      role: "Clinical Workflow Orchestrator"
      
      goal: "Orchestrate the patient admission and care planning workflow, ensuring all steps are completed in the correct sequence, regulatory timeframes are met, and all necessary information is collected and shared between participating agents."
      
      systemPrompt: |
        You are the Clinical Workflow Orchestrator for patient admission and care planning. Your responsibilities:
        
        1. WORKFLOW MANAGEMENT
        - Execute admission workflow steps in the defined sequence
        - Ensure each step completes successfully before proceeding
        - Monitor timeframes for regulatory compliance (admission assessment within 24 hours)
        - Handle exceptions and route to appropriate agents
        
        2. DATA COORDINATION
        - Collect and validate patient information at each step
        - Pass relevant data between agents
        - Maintain workflow state and context
        - Ensure data completeness for care planning
        
        3. QUALITY ASSURANCE
        - Verify all required assessments are completed
        - Confirm care plan elements are comprehensive
        - Check medication reconciliation is performed
        - Validate discharge planning is initiated
        
        4. COMMUNICATION
        - Provide clear instructions to each agent
        - Consolidate outputs for the care team
        - Generate workflow summaries
        - Alert on any delays or issues
        
        WORKFLOW SEQUENCE:
        1. Admission Processing - Collect demographics, insurance, consent
        2. Clinical Assessment - Perform initial nursing and medical assessments
        3. Care Plan Development - Create comprehensive care plan based on assessments
        4. Medication Review - Reconcile medications and identify interactions
        5. Discharge Planning - Begin discharge planning from admission
        
        CRITICAL REQUIREMENTS:
        - All steps must be completed within 24 hours of admission
        - PHI must be handled according to HIPAA requirements
        - Document all workflow steps for audit trail
        - Escalate any clinical concerns immediately
      
      llm:
        provider: AzureOpenAI
        model: "gpt-4-turbo"
        parameters:
          temperature: 0.2
          maxTokens: 4000
      
      stateManagement:
        memory:
          type: Redis
          retentionPolicy: "session"
        session:
          ttlSeconds: 86400
          store: Redis
  
  orchestration:
    orchestrator: "inline"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/healthcare"
        registryIdentity:
          urn: "urn:enterprise:registry:healthcare-agents:v1"
  
  topology:
    mode: Sequential
    steps:
      - name: "admission-processing"
        order: 1
        agentAlias: "admissions-agent"
        task: "Process patient admission including demographics collection, insurance verification, consent forms, and initial triage. Assign patient room and notify care team of new admission."
        input: "workflow.initialInput"
        onError:
          strategy: Retry
          maxRetries: 2
          backoffMs: 5000
      
      - name: "clinical-assessment"
        order: 2
        agentAlias: "clinical-assessor"
        task: "Conduct comprehensive clinical assessment including vital signs, medical history, current symptoms, pain assessment, fall risk, skin integrity, nutritional status, and psychosocial evaluation."
        input: "steps.admission-processing.output"
        onError:
          strategy: FailFast
      
      - name: "care-plan-development"
        order: 3
        agentAlias: "care-planner"
        task: "Develop individualized care plan based on assessment findings. Include problem list, goals, interventions, and measurable outcomes. Coordinate with interdisciplinary team for specialized needs."
        input: "steps.clinical-assessment.output"
        onError:
          strategy: Retry
          maxRetries: 3
          backoffMs: 10000
      
      - name: "medication-reconciliation"
        order: 4
        agentAlias: "pharmacy-reviewer"
        task: "Perform medication reconciliation, checking home medications against admission orders. Identify potential interactions, duplications, or omissions. Recommend formulary alternatives if needed."
        input: "steps.care-plan-development.output"
        onError:
          strategy: FailFast
      
      - name: "discharge-planning-initiation"
        order: 5
        agentAlias: "discharge-planner"
        task: "Initiate discharge planning based on anticipated length of stay and patient needs. Identify potential barriers to discharge, required services, and begin coordination with post-acute providers if needed."
        input: "steps.medication-reconciliation.output"
        condition: "steps.clinical-assessment.output.admissionType != 'observation'"
        onError:
          strategy: Continue
  
  variables:
    maxAssessmentTime: "24hours"
    requiredAssessments: "nursing,medical,pharmacy,social"
    carePlanTemplate: "comprehensive-acute-care"
  
  artifacts:
    admissionRecordId: "${admission-processing.recordId}"
    carePlanId: "${care-plan-development.planId}"
    assessmentBundle: "${clinical-assessment.fhirBundle}"
  
  ops:
    timeouts:
      defaultMs: 300000
    retries:
      max: 3
      backoffMs: 5000
    concurrency: 5
    rateLimit:
      rpm: 30
  
  security:
    rbac:
      roles: ["MDTCoordinator", "ClinicalSpecialist"]
      allowedCallers:
        - urn: "urn:enterprise:system:tumor-board:v1"
    dataPolicy:
      classification: PHI
      redactPII: true
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "mdt-review-workflow"
    metrics:
      - "specialist_reviews_completed"
      - "consensus_achievement_rate"
      - "review_turnaround_time"
      - "treatment_recommendations"

status:
  phase: Running
  lastExecutionTime: "2025-08-31T09:00:00Z"
  conditions:
    - type: Available
      status: "True"
      lastTransitionTime: "2025-08-31T09:00:00Z"
      message: "MDT review workflow operational"
```

## 6. Post-Discharge Follow-up Workflow (Hierarchical Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: post-discharge-followup
  namespace: healthcare-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:post-discharge:v1"
    uuid: "wf-890123-4567-8901-234567890123"
    displayName: "Post-Discharge Follow-up and Readmission Prevention"
    version: "1.3.0"
  
  ownership:
    team: "Transitions of Care"
    organization: "Enterprise Healthcare"
    user: "lisa.johnson@enterprise.com"
    askId: "TOC-WF-2025-006"
    sloEmail: "transitions@enterprise.com"
  
  description: "Hierarchical workflow for post-discharge patient management with tiered interventions based on readmission risk, including automated outreach, medication reconciliation, appointment scheduling, and escalation to care management when needed."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "care-transitions"
    environment: prod
    labels:
      workflow-type: "post-discharge"
      program: "readmission-prevention"
      tier: "high-priority"
    tags:
      - "transitions"
      - "readmission-prevention"
      - "follow-up"
  
  participants:
    - alias: "discharge-reviewer"
      agentRef:
        name: "discharge-summary-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:discharge-review:v1"
    
    - alias: "outreach-coordinator"
      agentRef:
        name: "patient-outreach-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:outreach:v1"
    
    - alias: "medication-reconciler"
      agentRef:
        name: "medication-reconciliation-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:med-rec:v1"
    
    - alias: "appointment-scheduler"
      agentRef:
        name: "scheduling-coordinator-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:scheduling:v1"
    
    - alias: "home-health-coordinator"
      agentRef:
        name: "home-health-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:home-health:v1"
    
    - alias: "case-manager"
      agentRef:
        name: "intensive-case-management-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:case-mgmt:v1"
  
  inlineOrchestrator:
    metadata:
      name: "discharge-workflow-orchestrator"
    spec:
      ownership:
        team: "Transitions of Care"
        organization: "Enterprise Healthcare"
      
      role: "Post-Discharge Workflow Orchestrator"
      
      goal: "Orchestrate hierarchical post-discharge interventions based on patient risk level and response to outreach, ensuring appropriate level of care and preventing readmissions."
      
      systemPrompt: |
        You are the Post-Discharge Workflow Orchestrator managing tiered interventions for recently discharged patients. 
        
        HIERARCHICAL INTERVENTION TIERS:
        
        Tier 1 - Standard Follow-up (All Patients):
        - 48-hour post-discharge call
        - Medication reconciliation
        - PCP appointment scheduling within 7 days
        
        Tier 2 - Enhanced Support (Moderate Risk):
        - All Tier 1 interventions
        - Home health evaluation
        - Specialist follow-up coordination
        - Weekly check-ins for 30 days
        
        Tier 3 - Intensive Management (High Risk):
        - All Tier 2 interventions
        - Dedicated case manager assignment
        - Daily monitoring for first week
        - Social services coordination
        - Readmission prevention planning
        
        ESCALATION CRITERIA:
        - Failed contact attempts → Escalate to next tier
        - Clinical deterioration → Immediate case management
        - Multiple ED visits → Intensive management
        - Social barriers identified → Social services involvement
        
        WORKFLOW RULES:
        1. Start with tier appropriate to discharge risk score
        2. Escalate if intervention goals not met
        3. Document all attempts and outcomes
        4. Alert providers for urgent issues
        5. Track metrics for quality reporting
      
      llm:
        provider: AzureOpenAI
        model: "gpt-4-turbo"
        parameters:
          temperature: 0.3
          maxTokens: 6000
      
      stateManagement:
        memory:
          type: Redis
          retentionPolicy: "timeWindow"
        session:
          ttlSeconds: 2592000
          store: Postgres
  
  orchestration:
    orchestrator: "inline"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/healthcare"
  
  topology:
    mode: Hierarchical
    steps:
      - name: "discharge-analysis"
        order: 1
        agentAlias: "discharge-reviewer"
        task: "Review discharge summary, calculate readmission risk score, identify follow-up needs, and determine initial intervention tier based on clinical and social factors."
        input: "workflow.initialInput"
      
      - name: "initial-outreach"
        order: 2
        agentAlias: "outreach-coordinator"
        task: "Conduct 48-hour post-discharge call. Assess patient status, symptoms, understanding of discharge instructions, and ability to obtain medications and attend appointments."
        input: "steps.discharge-analysis.output"
        onError:
          strategy: Retry
          maxRetries: 3
          backoffMs: 14400000
      
      - name: "medication-verification"
        order: 3
        agentAlias: "medication-reconciler"
        task: "Verify patient has obtained discharge medications, understands dosing, and has no issues with adherence. Identify and resolve any medication access barriers."
        input: "steps.initial-outreach.output"
        condition: "steps.initial-outreach.output.contactSuccessful == true"
      
      - name: "appointment-coordination"
        order: 4
        agentAlias: "appointment-scheduler"
        task: "Schedule follow-up appointments with PCP and specialists as indicated. Confirm transportation arrangements and send appointment reminders."
        input: "steps.initial-outreach.output"
        dependencies: ["initial-outreach"]
      
      - name: "home-health-assessment"
        order: 5
        agentAlias: "home-health-coordinator"
        task: "Coordinate home health services for moderate to high-risk patients. Arrange nursing visits, therapy services, and DME as needed."
        input: "steps.discharge-analysis.output"
        condition: "steps.discharge-analysis.output.riskTier >= 2"
        dependencies: ["initial-outreach"]
      
      - name: "intensive-management"
        order: 6
        agentAlias: "case-manager"
        task: "Provide intensive case management for high-risk patients including daily monitoring, care coordination, barrier resolution, and readmission prevention planning."
        input: "steps.discharge-analysis.output"
        condition: "steps.discharge-analysis.output.riskTier == 3 || steps.initial-outreach.output.escalationNeeded == true"
        dependencies: ["initial-outreach", "medication-verification"]
  
  variables:
    outreachWindow: "48hours"
    followupAppointment: "7days"
    highRiskThreshold: "0.7"
    monitoringDuration: "30days"
  
  artifacts:
    dischargeRecordId: "${discharge-analysis.dischargeId}"
    riskScore: "${discharge-analysis.readmissionRisk}"
    careplanId: "${intensive-management.careplanId}"
  
  ops:
    timeouts:
      defaultMs: 300000
    retries:
      max: 3
      backoffMs: 3600000
    concurrency: 3
    rateLimit:
      rpm: 60
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "post-discharge-workflow"
    logs:
      redaction: true
    metrics:
      - "discharge_followup_rate"
      - "medication_reconciliation_completion"
      - "appointment_scheduling_success"
      - "readmission_rate_30day"
      - "escalation_rate"
  
  security:
    rbac:
      roles: ["TransitionCoordinator", "CaseManagement"]
      allowedCallers:
        - urn: "urn:enterprise:system:discharge-system:v1"
        - urn: "urn:enterprise:portal:provider:v1"
    dataPolicy:
      classification: PHI
      redactPII: true
    egress:
      allowlist:
        - "*.enterprise.com"
        - "homehealth-partners.com"
  
  secretsProvider:
    type: AzureKeyVault
    azureKeyVault:
      vaultName: "transitions-kv-prod"
      tenantId: "enterprise-tenant-id"
      useManagedIdentity: true

status:
  phase: Running
  lastExecutionTime: "2025-08-31T11:30:00Z"
  conditions:
    - type: Available
      status: "True"
      lastTransitionTime: "2025-08-31T11:30:00Z"
      message: "Workflow processing post-discharge patients"
    - type: Progressing
      status: "True"
      lastTransitionTime: "2025-08-31T11:30:00Z"
      message: "Processing 47 active discharge cases"
``` 1
    rateLimit:
      rpm: 30
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "admission-workflow"
    logs:
      redaction: true
    metrics:
      - "workflow_duration"
      - "step_completion_time"
      - "admission_to_assessment_time"
      - "care_plan_completion_rate"
  
  security:
    rbac:
      roles: ["ClinicalWorkflowExecutor", "AdmissionsTeam"]
      allowedCallers:
        - urn: "urn:enterprise:system:ehr:v1"
        - urn: "urn:enterprise:portal:clinical:v1"
    dataPolicy:
      classification: PHI
      redactPII: true
  
  secretsProvider:
    type: AzureKeyVault
    azureKeyVault:
      vaultName: "clinical-workflows-kv"
      tenantId: "enterprise-tenant-id"
      useManagedIdentity: true

status:
  phase: Running
  lastExecutionTime: "2025-08-31T10:30:00Z"
  conditions:
    - type: Available
      status: "True"
      lastTransitionTime: "2025-08-31T10:30:00Z"
      message: "Workflow is available and ready to process admissions"
```

## 2. Complex Care Coordination Workflow (Network Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: complex-care-coordination
  namespace: healthcare-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:complex-care:v1"
    uuid: "wf-def456-7890-1234-567890abcdef"
    displayName: "Complex Care Coordination Workflow"
    version: "2.0.0"
  
  ownership:
    team: "Complex Care Management"
    organization: "Enterprise Healthcare"
    user: "sarah.martinez@enterprise.com"
    askId: "CARE-WF-2025-002"
    sloEmail: "complex-care@enterprise.com"
  
  description: "Advanced care coordination workflow for patients with multiple chronic conditions requiring synchronized care from multiple specialists, care transitions management, and intensive case management with dynamic decision routing based on clinical indicators."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "complex-care-mgmt"
    environment: prod
    labels:
      workflow-type: "complex-care"
      program: "high-risk-patients"
      compliance: "hipaa-ncqa-hedis"
    tags:
      - "chronic-disease"
      - "care-coordination"
      - "high-risk"
  
  participants:
    - alias: "risk-stratifier"
      agentRef:
        name: "risk-stratification-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:risk-stratification:v1"
      overrides:
        llmModel: "gpt-4-turbo"
        temperature: 0.1
    
    - alias: "care-coordinator"
      agentRef:
        name: "clinical-care-coordinator"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:care-coordinator:v1"
    
    - alias: "diabetes-specialist"
      agentRef:
        name: "diabetes-management-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:diabetes:v1"
    
    - alias: "cardiac-specialist"
      agentRef:
        name: "cardiac-care-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:cardiac:v1"
    
    - alias: "mental-health"
      agentRef:
        name: "behavioral-health-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:behavioral:v1"
    
    - alias: "social-worker"
      agentRef:
        name: "social-determinants-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:sdoh:v1"
    
    - alias: "care-gap-analyzer"
      agentRef:
        name: "quality-gaps-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:quality:v1"
    
    - alias: "transition-coordinator"
      agentRef:
        name: "transitions-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:transitions:v1"
  
  orchestration:
    orchestrator: "care-coordinator"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/healthcare"
  
  topology:
    mode: Network
    steps:
      - name: "initial-risk-assessment"
        agentAlias: "risk-stratifier"
        task: "Perform comprehensive risk stratification using claims data, clinical history, and social determinants. Calculate risk scores for readmission, ED utilization, and disease progression."
        input: "workflow.initialInput"
      
      - name: "care-gap-analysis"
        agentAlias: "care-gap-analyzer"
        task: "Identify care gaps including missed preventive services, medication adherence issues, and quality measure gaps. Prioritize interventions based on clinical impact."
        input: "workflow.initialInput"
        dependencies: []
      
      - name: "sdoh-assessment"
        agentAlias: "social-worker"
        task: "Assess social determinants of health including housing stability, food security, transportation, and social support. Identify community resources and support services."
        input: "workflow.initialInput"
        dependencies: []
      
      - name: "diabetes-management"
        agentAlias: "diabetes-specialist"
        task: "Review diabetes control metrics, adjust treatment plans, coordinate with endocrinology, and provide self-management education. Monitor for complications."
        input: "steps.initial-risk-assessment.output"
        condition: "steps.initial-risk-assessment.output.conditions contains 'diabetes'"
        dependencies: ["initial-risk-assessment", "care-gap-analysis"]
      
      - name: "cardiac-management"
        agentAlias: "cardiac-specialist"
        task: "Manage cardiac conditions including heart failure, hypertension, and arrhythmias. Coordinate with cardiology, monitor vital signs, and manage cardiac medications."
        input: "steps.initial-risk-assessment.output"
        condition: "steps.initial-risk-assessment.output.conditions contains 'cardiac'"
        dependencies: ["initial-risk-assessment", "care-gap-analysis"]
      
      - name: "behavioral-health-integration"
        agentAlias: "mental-health"
        task: "Screen for depression, anxiety, and cognitive issues. Coordinate psychiatric care, therapy services, and medication management for behavioral health conditions."
        input: "steps.initial-risk-assessment.output"
        condition: "steps.initial-risk-assessment.output.behavioralHealthRisk == 'high'"
        dependencies: ["initial-risk-assessment", "sdoh-assessment"]
      
      - name: "care-plan-synthesis"
        agentAlias: "care-coordinator"
        task: "Synthesize all specialist recommendations into unified care plan. Resolve conflicts, prioritize interventions, and establish care team roles and responsibilities."
        dependencies: ["diabetes-management", "cardiac-management", "behavioral-health-integration", "sdoh-assessment"]
      
      - name: "transition-planning"
        agentAlias: "transition-coordinator"
        task: "Coordinate care transitions between settings. Arrange follow-up appointments, medication reconciliation, and home health services. Prevent readmissions."
        input: "steps.care-plan-synthesis.output"
        dependencies: ["care-plan-synthesis"]
        condition: "steps.care-plan-synthesis.output.requiresTransition == true"
  
  variables:
    riskThreshold: "0.75"
    careGapPriority: "high"
    coordinationFrequency: "weekly"
  
  ops:
    timeouts:
      defaultMs: 600000
    retries:
      max: 2
      backoffMs: 10000
    concurrency: 4
    rateLimit:
      rpm: 60
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "complex-care-workflow"
    metrics:
      - "risk_scores_calculated"
      - "care_gaps_identified"
      - "specialist_consultations"
      - "care_plan_updates"

status:
  phase: Running
  lastExecutionTime: "2025-08-31T14:15:00Z"
```

## 3. Emergency Department Triage Workflow (Parallel Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: ed-triage-assessment
  namespace: healthcare-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:ed-triage:v1"
    uuid: "wf-789012-3456-7890-123456789012"
    displayName: "Emergency Department Triage and Assessment"
    version: "1.5.0"
  
  ownership:
    team: "Emergency Medicine"
    organization: "Enterprise Healthcare"
    user: "dr.robert.chen@enterprise.com"
    askId: "ED-WF-2025-003"
    sloEmail: "ed-workflows@enterprise.com"
  
  description: "Rapid parallel assessment workflow for emergency department patients, enabling simultaneous triage, diagnostic ordering, and specialist consultations to reduce door-to-treatment time while maintaining clinical quality and safety standards."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "emergency-department"
    environment: prod
    labels:
      workflow-type: "emergency"
      department: "emergency-medicine"
      priority: "critical"
    tags:
      - "triage"
      - "emergency"
      - "rapid-assessment"
  
  participants:
    - alias: "triage-nurse"
      agentRef:
        name: "ed-triage-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:ed-triage:v1"
      overrides:
        timeoutMs: 60000
    
    - alias: "diagnostic-coordinator"
      agentRef:
        name: "diagnostic-ordering-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:diagnostics:v1"
    
    - alias: "lab-processor"
      agentRef:
        name: "lab-results-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:laboratory:v1"
    
    - alias: "radiology-reviewer"
      agentRef:
        name: "radiology-interpretation-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:radiology:v1"
    
    - alias: "medication-screener"
      agentRef:
        name: "drug-interaction-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:pharmacy-screen:v1"
    
    - alias: "disposition-planner"
      agentRef:
        name: "ed-disposition-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:ed-disposition:v1"
  
  orchestration:
    orchestrator: "triage-nurse"
    protocol:
      type: Local
      local:
        serviceDiscovery: "kubernetes-dns"
  
  topology:
    mode: Parallel
    steps:
      - name: "initial-triage"
        agentAlias: "triage-nurse"
        task: "Perform ESI triage scoring, chief complaint assessment, vital signs review, and determine urgency level. Identify red flags requiring immediate intervention."
        input: "workflow.initialInput"
        onError:
          strategy: FailFast
      
      - name: "diagnostic-ordering"
        agentAlias: "diagnostic-coordinator"
        task: "Based on presenting symptoms and triage assessment, order appropriate diagnostic tests including labs, imaging, and EKG as indicated by clinical protocols."
        input: "workflow.initialInput"
      
      - name: "lab-processing"
        agentAlias: "lab-processor"
        task: "Process and interpret laboratory results including CBC, metabolic panel, cardiac markers, and other ordered tests. Flag critical values for immediate attention."
        input: "workflow.initialInput"
      
      - name: "imaging-review"
        agentAlias: "radiology-reviewer"
        task: "Review and provide preliminary interpretation of imaging studies. Identify urgent findings requiring immediate physician notification."
        input: "workflow.initialInput"
      
      - name: "medication-safety"
        agentAlias: "medication-screener"
        task: "Screen current medications, allergies, and potential drug interactions. Provide recommendations for safe medication administration in emergency setting."
        input: "workflow.initialInput"
      
      - name: "disposition-planning"
        agentAlias: "disposition-planner"
        task: "Begin disposition planning based on initial assessment. Identify admission criteria, observation needs, or discharge requirements. Coordinate with inpatient teams if needed."
        input: "workflow.initialInput"
  
  variables:
    maxTriageTime: "10minutes"
    criticalLabTurnaround: "30minutes"
    dispositionTarget: "4hours"
  
  ops:
    timeouts:
      defaultMs: 120000
    retries:
      max: 1
      backoffMs: 5000
    concurrency: 6
    rateLimit:
      rpm: 120
      rps: 5
  
  security:
    rbac:
      roles: ["EmergencyMedicine", "EDStaff"]
    dataPolicy:
      classification: PHI
      redactPII: true
  
  telemetry:
    opentelemetry:
      enabled: true
      serviceName: "ed-triage-workflow"
    metrics:
      - "door_to_triage_time"
      - "parallel_step_completion"
      - "critical_value_alerts"

status:
  phase: Running
  lastExecutionTime: "2025-08-31T15:45:00Z"
```

## 4. Chronic Disease Management Loop Workflow (Loop Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: chronic-disease-monitoring
  namespace: healthcare-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:chronic-monitoring:v1"
    uuid: "wf-345678-9012-3456-789012345678"
    displayName: "Chronic Disease Continuous Monitoring"
    version: "1.2.0"
  
  ownership:
    team: "Population Health"
    organization: "Enterprise Healthcare"
    user: "nancy.wong@enterprise.com"
    askId: "POP-WF-2025-004"
    sloEmail: "population-health@enterprise.com"
  
  description: "Iterative monitoring workflow for chronic disease management that continuously assesses patient status, adjusts interventions, and escalates care when thresholds are exceeded, using a feedback loop for optimization."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "population-health"
    environment: prod
    labels:
      workflow-type: "monitoring"
      program: "chronic-disease"
      frequency: "continuous"
  
  participants:
    - alias: "monitor"
      agentRef:
        name: "patient-monitor-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:monitoring:v1"
    
    - alias: "analyzer"
      agentRef:
        name: "trend-analysis-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:analytics:v1"
    
    - alias: "intervener"
      agentRef:
        name: "intervention-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:intervention:v1"
    
    - alias: "escalator"
      agentRef:
        name: "escalation-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:escalation:v1"
  
  orchestration:
    orchestrator: "monitor"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/healthcare"
  
  topology:
    mode: Loop
    steps:
      - name: "collect-metrics"
        agentAlias: "monitor"
        task: "Collect patient health metrics from connected devices, patient-reported outcomes, and recent lab results. Check for data completeness and validity."
        input: "workflow.initialInput"
        loopConfig:
          maxIterations: 30
      
      - name: "analyze-trends"
        agentAlias: "analyzer"
        task: "Analyze collected metrics for trends, patterns, and deviations from baseline. Calculate risk scores and identify concerning changes."
        input: "steps.collect-metrics.output"
        dependencies: ["collect-metrics"]
      
      - name: "determine-intervention"
        agentAlias: "intervener"
        task: "Based on analysis, determine if intervention is needed. Select appropriate intervention type: education, medication adjustment, or provider contact."
        input: "steps.analyze-trends.output"
        dependencies: ["analyze-trends"]
        condition: "steps.analyze-trends.output.interventionNeeded == true"
      
      - name: "escalate-if-needed"
        agentAlias: "escalator"
        task: "Escalate to care team if critical thresholds exceeded or multiple intervention failures detected. Schedule urgent appointments if necessary."
        input: "steps.analyze-trends.output"
        dependencies: ["analyze-trends"]
        condition: "steps.analyze-trends.output.riskScore > 0.8 || steps.determine-intervention.output.failureCount > 2"
        onError:
          strategy: FailFast
  
  variables:
    monitoringInterval: "daily"
    escalationThreshold: "0.8"
    maxInterventionAttempts: "3"
  
  ops:
    timeouts:
      defaultMs: 180000
    retries:
      max: 2
      backoffMs: 15000
    concurrency: 2
  
  telemetry:
    metrics:
      - "monitoring_cycles_completed"
      - "interventions_triggered"
      - "escalations_required"

status:
  phase: Running
  lastExecutionTime: "2025-08-31T16:00:00Z"
```

## 5. Multi-Disciplinary Team Review Workflow (Aggregate Mode)

```yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: AgentWorkflow
metadata:
  name: mdt-case-review
  namespace: healthcare-prod
spec:
  identity:
    urn: "urn:enterprise:workflow:mdt-review:v1"
    uuid: "wf-567890-1234-5678-901234567890"
    displayName: "Multi-Disciplinary Team Case Review"
    version: "1.0.0"
  
  ownership:
    team: "Clinical Quality"
    organization: "Enterprise Healthcare"
    user: "dr.alan.thompson@enterprise.com"
    askId: "MDT-WF-2025-005"
    sloEmail: "mdt-team@enterprise.com"
  
  description: "Aggregate workflow for multi-disciplinary team reviews where multiple specialists provide independent assessments that are then synthesized into a comprehensive treatment recommendation for complex cases."
  
  context:
    tenantId: "enterprise-health"
    workspaceId: "clinical-quality"
    environment: prod
    labels:
      workflow-type: "mdt-review"
      case-type: "complex"
      review-level: "comprehensive"
  
  participants:
    - alias: "oncologist"
      agentRef:
        name: "oncology-specialist-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:oncology:v1"
    
    - alias: "surgeon"
      agentRef:
        name: "surgical-consultant-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:surgery:v1"
    
    - alias: "radiologist"
      agentRef:
        name: "radiology-specialist-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:radiology-consult:v1"
    
    - alias: "pathologist"
      agentRef:
        name: "pathology-consultant-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:pathology:v1"
    
    - alias: "palliative-care"
      agentRef:
        name: "palliative-specialist-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:palliative:v1"
    
    - alias: "synthesizer"
      agentRef:
        name: "mdt-synthesis-agent"
        identityRef:
          urn: "urn:enterprise:healthcare:agent:mdt-synthesis:v1"
  
  orchestration:
    orchestrator: "synthesizer"
    protocol:
      type: A2A
      a2a:
        registryServer: "https://registry.enterprise.com/healthcare"
  
  topology:
    mode: Aggregate
    steps:
      - name: "oncology-review"
        agentAlias: "oncologist"
        task: "Review patient history, staging, molecular markers, and prior treatments. Provide medical oncology recommendations including chemotherapy options and clinical trial eligibility."
        input: "workflow.initialInput"
      
      - name: "surgical-evaluation"
        agentAlias: "surgeon"
        task: "Evaluate surgical candidacy, resectability, and operative risks. Provide recommendations for surgical approach, timing, and expected outcomes."
        input: "workflow.initialInput"
      
      - name: "radiology-assessment"
        agentAlias: "radiologist"
        task: "Review all imaging studies, assess disease extent, and evaluate treatment response. Provide recommendations for additional imaging or radiation therapy."
        input: "workflow.initialInput"
      
      - name: "pathology-analysis"
        agentAlias: "pathologist"
        task: "Review pathology specimens, confirm diagnosis, assess margins, and provide molecular profiling results. Recommend additional testing if needed."
        input: "workflow.initialInput"
      
      - name: "palliative-consultation"
        agentAlias: "palliative-care"
        task: "Assess symptom burden, quality of life, and goals of care. Provide recommendations for symptom management and advance care planning."
        input: "workflow.initialInput"
        condition: "workflow.initialInput.stage >= 'III'"
      
      - name: "consensus-synthesis"
        agentAlias: "synthesizer"
        task: "Synthesize all specialist recommendations into unified MDT consensus. Resolve conflicting opinions, prioritize treatments, and create comprehensive care plan with clear next steps."
        dependencies: [
          "oncology-review",
          "surgical-evaluation",
          "radiology-assessment",
          "pathology-analysis",
          "palliative-consultation"
        ]
  
  variables:
    reviewTimeframe: "48hours"
    consensusThreshold: "0.75"
    documentationStandard: "nccn-guidelines"
  
  ops:
    timeouts:
      defaultMs: 7200000
    retries:
      max: 1
      backoffMs: 30000
    concurrency: 