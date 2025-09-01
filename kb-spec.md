# Optum KnowledgeBase Specification: A Developer's Guide for Healthcare AI
**Version:** 2.0 (based on spec v1alpha2)
**Date:** August 31, 2025

## 1. Introduction
Welcome to the developer's guide for the Optum KnowledgeBase Custom Resource Definition (CRD). This specification provides a declarative, Kubernetes-native framework for defining, managing, and securing knowledge repositories for Retrieval-Augmented Generation (RAG) in AI applications.

**The Vision:** The KnowledgeBase CRD is engineered to treat knowledge sources as code. By defining your data sources, ingestion pipelines, RAG strategies, and security policies in a single version-controlled YAML file, we enable standardization, robust security, and full GitOps compatibility. This version (`v1alpha2`) introduces groundbreaking enhancements specifically designed for the complexities and regulatory demands of the healthcare domain, including deep support for clinical data, multi-format content, and stringent compliance frameworks like HIPAA.

This guide will walk you through the anatomy of the specification, providing detailed explanations and practical examples to help you build powerful, secure, and compliant RAG systems.

---

## 2. Anatomy of the KnowledgeBase Specification
A KnowledgeBase is defined by its `.spec` section. Below is a detailed breakdown of each configuration block.

### 2.1. identity (Optional but Recommended)
Provides a stable, immutable identity for the knowledge base.
*   **Purpose**: To give the knowledge base a unique and versioned identity for programmatic interaction, auditing, and lifecycle management.
*   **Fields**:
    *   `urn`, `uuid`: Unique identifiers.
    *   `displayName`: A human-readable name.
    *   `version`: Semantic version of the definition.
    *   `git`: Provenance details from a Git repository.

**Example:**
```yaml
identity:
  urn: "urn:optum:kb:clinical-guidelines:v1alpha2"
  uuid: "123e4567-e89b-12d3-a456-426614174000"
  displayName: "Clinical Practice Guidelines KB"
  version: "1.0.0"
  git:
    repo: "https://github.com/optum/knowledge-bases.git"
    path: "clinical-guidelines/kb.yaml"
    ref: "refs/heads/main"
```

### 2.2. ownership (Mandatory)
Establishes clear accountability for the knowledge base.
*   **Purpose**: To identify the team and individuals responsible for the data, maintenance, and operational support.
*   **Fields**: `team`, `organization`, `user`, `askId`, `sloEmail`.

**Example:**
```yaml
ownership:
  team: "Clinical AI Content Curation"
  organization: "Optum AI"
  user: "data.steward@optum.com"
  askId: "KB54321"
  sloEmail: "clinical-ai-kb-alerts@optum.com"```

### 2.3. context (Optional)
Defines the operational context where the knowledge base is used.
*   **Purpose**: To categorize and organize knowledge bases by environment, tenancy, and custom labels.
*   **Fields**: `tenantId`, `workspaceId`, `environment`, `labels`, `tags`, `lifecycle`.

**Example:**
```yaml
context:
  tenantId: "optum-health"
  environment: "prod"
  labels:
    data-domain: "clinical"
  tags: ["guidelines", "oncology", "HIPAA"]
  lifecycle: "prod"
```

### 2.4. type & connection (Mandatory)
Defines the backend storage technology and its connection details.
*   **Purpose**: To specify the physical data store for the knowledge base. This version supports `PostgresPgvector`, `AzureCosmosDb`, `AzureAISearch`, and `AzureBlobStorage`.
*   **Fields**: The `connection` object contains specific configurations for each type (`postgres`, `cosmosdb`, `aisearch`, `blobstorage`), including secret references for credentials.

**Example (Azure AI Search):**
```yaml
type: AzureAISearch
connection:
  type: AzureAISearch
  aisearch:
    endpoint: "https://optum-clinical-kb.search.windows.net"
    indexName: "clinical-guidelines-index"
    apiKeySecretRef:
      keyName: "clinical-kb-search-api-key"
    semanticConfigurationName: "clinical-semantic-config"
```

### 2.5. rag (Mandatory)
This is the core of the CRD, defining the entire Retrieval-Augmented Generation pipeline.

#### 2.5.1. rag.ingestion
Configures how raw data is processed, from content extraction to chunking and scheduling.
*   **Purpose**: To create a flexible, multi-format pipeline that can handle standard documents, images, audio/video, and specialized clinical notes.
*   **Key Sections**:
    *   **`contentTypes`**: Defines handlers for different MIME types. This is where you enable powerful features like OCR, image captioning, audio transcription, and **clinical entity recognition**.
    *   **`chunking`**: Specifies the strategy for splitting documents. Includes the `clinical-segment` strategy to intelligently chunk based on clinical section headers.
    *   **`preprocessing`**: Defines steps to clean and normalize data before chunking, including clinical-specific normalizations for dates and medical codes.
    *   **`scheduling`**: Automates the ingestion process with cron-like schedules.

**Example (Clinical Ingestion):**
```yaml
ingestion:
  contentTypes:
    - mimeType: application/pdf
      handlers:
        - name: pdf-extractor
          config:
            ocr: true
            clinicalEntityRecognition: true
            medicationExtraction: true
    - mimeType: text/plain
      handlers:
        - name: clinical-text-processor
          config:
            diagnosisExtraction: true
            labValueExtraction: true
  chunking:
    strategy: clinical-segment
    size: 512
    overlap: 64
    clinicalChunking:
      useSectionBoundaries: true
      sectionHeaders: ["HISTORY OF PRESENT ILLNESS", "ASSESSMENT AND PLAN"]
  preprocessing:
    clinicalNormalization:
      normalizeDates: true
      normalizeDiagnosisCodes: true
  scheduling:
    autoIngest: true
    schedule: "0 2 * * *" # Run at 2 AM daily
```

#### 2.5.2. rag.embedding
Configures the model and process for converting text chunks into vector embeddings.
*   **Purpose**: To define how semantic meaning is captured in vector form, with options for using specialized clinical models.
*   **Fields**: `model`, `provider`, `dimension`, and a `clinical` section to enable `useClinicalEmbeddings` and hybrid approaches that blend general and clinical models.

**Example (Hybrid Clinical Embedding):**
```yaml
embedding:
  model: "text-embedding-3-large"
  provider: AzureOpenAI
  dimension: 3072
  clinical:
    useClinicalEmbeddings: true
    clinicalEmbeddingModel: "embaas-clinical-v2"
    hybridEmbedding:
      enabled: true
      generalWeight: 0.4
      clinicalWeight: 0.6
```

#### 2.5.3. rag.indexing
Configures the vector index for efficient similarity searches.
*   **Purpose**: To define the structure and parameters of the vector index to balance search speed and accuracy.
*   **Fields**: `indexType` (e.g., `hnsw`, `ivf`), parameters for the chosen type, and `hybrid` search configuration to combine vector search with traditional keyword search (BM25).

**Example (HNSW with Hybrid Search):**
```yaml
indexing:
  autoIndex: true
  indexType: hnsw
  hnsw:
    m: 16
    efConstruction: 128
    efSearch: 64
    metric: cosine
  hybrid:
    enabled: true
    keywordWeight: 0.3
    vectorWeight: 0.7
```

#### 2.5.4. rag.retrieval
Configures how information is retrieved from the index at query time.
*   **Purpose**: To fine-tune the search process with advanced techniques like re-ranking, diversity, and clinical-specific logic.
*   **Key Sections**:
    *   **`topK` / `similarityThreshold`**: Basic retrieval parameters.
    *   **`reranking`**: Uses a secondary model (like a cross-encoder) to re-rank initial results for better relevance.
    *   **`queryTransformation`**: Enhances the user's query using methods like HyDE (Hypothetical Document Embeddings) or multi-query generation.
    *   **`clinical`**: A powerful section for healthcare, enabling query expansion with medical terminologies, filtering by evidence level, and clinical relevance scoring.

**Example (Advanced Clinical Retrieval):**
```yaml
retrieval:
  topK: 10
  reranking:
    enabled: true
    model: "ms-marco-MiniLM-L-12-v2"
    topN: 25 # Re-rank the top 25 initial results
  queryTransformation:
    enabled: true
    methods: [hyde]
  clinical:
    clinicalQueryExpansion:
      enabled: true
      terminologyExpansion: true
      synonymExpansion: true
    clinicalFiltering:
      filterByEvidenceLevel: true
```

#### 2.5.5. rag.agentic
Configures "agentic" RAG behaviors where an agent can reason about the retrieval process itself.
*   **Purpose**: To move beyond simple "retrieve-then-generate" to more intelligent, adaptive RAG.
*   **Fields**:
    *   `adaptiveRetrieval`: Allows the agent to dynamically change its retrieval strategy (e.g., adjust `topK`) based on initial results.
    *   `selfReflection`: Enables the agent to critique its retrieved results and perform another retrieval if they are deemed insufficient.
    *   `queryRouting`: Allows the agent to route a query to different knowledge bases based on its content.

**Example (Agentic Self-Reflection):**
```yaml
agentic:
  adaptiveRetrieval:
    enabled: true
    strategy: confidence-based
    confidenceThreshold: 0.7
    maxRetrievalAttempts: 2
  selfReflection:
    enabled: true
    prompt: "Review the retrieved clinical context. Is it sufficient to answer the query safely and accurately? If not, identify gaps and suggest a revised query."
    minConfidence: 0.6
```

### 2.6. security (Mandatory for Healthcare)
A comprehensive suite of security controls, crucial for handling sensitive data.

#### 2.6.1. security.phiRedaction
Configures the detection and redaction of Protected Health Information (PHI) and Personally Identifiable Information (PII).
*   **Purpose**: To automatically de-identify data during ingestion or at query time, a cornerstone of HIPAA compliance.
*   **Key Features**:
    *   A vast list of predefined `entities` to detect, including medical record numbers, diagnoses, and detailed clinical note types.
    *   **`clinicalContextPreservation`**: A critical feature that redacts PHI while attempting to preserve the surrounding clinical context, preventing the loss of valuable medical information.
    *   Redaction of sensitive clinical data like mental health, substance abuse, and genetic information.

**Example:**
```yaml
phiRedaction:
  enabled: true
  methods: [masking, replacement]
  entities:
    - PERSON
    - MEDICAL_RECORD_NUMBER
    - DIAGNOSIS
    - MENTAL_HEALTH_CONDITION
  clinical:
    sensitiveClinicalDataRedaction:
      mentalHealthConditions: true
      substanceAbuseHistory: true
    clinicalContextPreservation:
      preserveClinicalContext: true
      contextWindowSize: 50 # characters
```

#### 2.6.2. security.compliance
Enables features required to meet specific regulatory standards.
*   **Purpose**: To provide auditable, declarative controls for HIPAA, GDPR, HITRUST, and clinical safety.
*   **Key Sections**:
    *   **`hipaa`**: Enables audit logging, role-based access controls, encryption policies, and data retention rules required by HIPAA.
    *   **`clinicalSafety`**: Configures a framework for ensuring clinical safety, including `humanInTheLoop` requirements, escalation procedures for high-risk scenarios, and risk stratification based on medical conditions.

**Example (HIPAA & Clinical Safety):**
```yaml
compliance:
  hipaa:
    enabled: true
    baaRequired: true
    auditLogging:
      enabled: true
      retentionPeriodDays: 2190 # 6 years
    minimumRetentionPeriod: "7 years"
  clinicalSafety:
    enabled: true
    humanInTheLoop: true
    riskStratification:
      highRiskConditions: ["myocardial infarction", "sepsis"]
      escalationThresholds:
        highRisk: 0.8
```

### 2.7. evaluation
Defines how the knowledge base's performance, safety, and quality are measured.
*   **Purpose**: To establish a continuous evaluation framework with specific metrics, guardrails, and automated testing.
*   **Key Sections**:
    *   **`metrics`**: Defines a list of metrics to track, including `clinical-accuracy`, `guideline-adherence`, and `phi-leakage`, each with a target threshold.
    *   **`guardrails`**: Implements real-time safety checks on both input queries and output generations. The `clinical` subsection allows you to block prohibited diagnoses (e.g., "cancer diagnosis") and enforce the inclusion of disclaimers.
    *   **`testing`**: Defines automated test suites (`smoke`, `regression`, `clinical-safety`) with specific test cases to ensure ongoing reliability.

**Example (Clinical Guardrails):**
```yaml
guardrails:
  input:
    clinical:
      enabled: true
      severityThreshold: high
      action: block
      prohibitedQuestions: ["Diagnose my condition", "What is the best treatment for cancer?"]
  output:
    clinical:
      enabled: true
      action: sanitize
      disclaimers: ["This is not medical advice. Consult a healthcare professional."]
      guidelineReferences: true # Ensure outputs reference a guideline
      uncertaintyQuantification: true # Express confidence in the answer
```

### 2.8. lifecycle
Manages the data within the knowledge base over time.
*   **Purpose**: To define policies for data retention, archiving, and versioning, which are often required for compliance.
*   **Fields**:
    *   `retention`: Defines data retention policies (e.g., `ttlDays`). The `clinical` section allows specifying minimum retention periods (e.g., `'7 years'`).
    *   `archiving`: Configures automatic archiving of old data to cheaper storage.
    *   `versioning`: Enables version tracking of documents and data.

**Example (Clinical Retention):**
```yaml
lifecycle:
  retention:
    policy: time-based
    ttlDays: 2555 # ~7 years
    clinical:
      minimumRetentionPeriod: "7 years"
      legalHold: true
```

---

## 3. Implementation Guide: Creating a Clinical KB
This section provides a complete, practical example of a `KnowledgeBase` for clinical decision support.

### Step 1: Define the KnowledgeBase YAML
This configuration creates a HIPAA-compliant knowledge base using Azure AI Search. It ingests PDFs, performs clinical entity recognition, uses a hybrid embedding strategy, and has strong clinical safety guardrails.

```yaml
# clinical-kb.yaml
apiVersion: agents.enterprise.com/v1alpha2
kind: KnowledgeBase
metadata:
  name: clinical-decision-support-kb
  namespace: healthcare-ai
spec:
  identity:
    urn: "urn:optum:kb:clinical-decision-support:v1"
    displayName: "Clinical Decision Support KB"
  ownership:
    team: "Clinical AI Solutions"
    sloEmail: "clinical-ai-kb-alerts@optum.com"
  type: AzureAISearch
  connection:
    type: AzureAISearch
    aisearch:
      endpoint: "https://optum-cds-kb.search.windows.net"
      indexName: "clinical-guidelines-v1"
      apiKeySecretRef:
        keyName: "cds-kb-api-key"
  rag:
    ingestion:
      contentTypes:
        - mimeType: application/pdf
          handlers:
            - name: clinical-pdf-processor
              config:
                ocr: true
                clinicalEntityRecognition: true
                medicationExtraction: true
      chunking:
        strategy: clinical-segment
        size: 512
        overlap: 50
    embedding:
      model: "text-embedding-3-large"
      provider: AzureOpenAI
      dimension: 3072
      clinical:
        useClinicalEmbeddings: true
        clinicalEmbeddingModel: "embaas-clinical-v2"
        hybridEmbedding: { enabled: true, generalWeight: 0.4, clinicalWeight: 0.6 }
    retrieval:
      topK: 5
      reranking: { enabled: true, topN: 20 }
      clinical:
        clinicalQueryExpansion: { enabled: true, terminologyExpansion: true }
  security:
    dataClassification: ProtectedHealthInformation
    phiRedaction:
      enabled: true
      methods: [masking]
      entities: [PERSON, MEDICAL_RECORD_NUMBER, DATE, DIAGNOSIS]
      clinical:
        sensitiveClinicalDataRedaction: { mentalHealthConditions: true }
        clinicalContextPreservation: { preserveClinicalContext: true }
    compliance:
      hipaa:
        enabled: true
        auditLogging: { enabled: true, retentionPeriodDays: 2190 }
        minimumRetentionPeriod: "7 years"
      clinicalSafety:
        enabled: true
        humanInTheLoop: true
        riskStratification:
          highRiskConditions: ["myocardial infarction", "sepsis"]
  evaluation:
    guardrails:
      input:
        clinical:
          enabled: true
          action: block
          prohibitedQuestions: ["Diagnose my symptoms"]
      output:
        clinical:
          enabled: true
          action: sanitize
          disclaimers: ["This is not medical advice. Consult a qualified professional."]
          guidelineReferences: true
          uncertaintyQuantification: true
```

### Step 2: Apply the Configuration
Apply the manifest to your Kubernetes cluster.
```bash
kubectl apply -f clinical-kb.yaml
```

### Step 3: Reference in a Clinical Agent
Now, an `Agent` can use this powerful, secure knowledge base.

```yaml
# clinical-assistant-agent.yaml
apiVersion: agents.enterprise.com/v1alpha9
kind: Agent
metadata:
  name: clinical-assistant
  namespace: healthcare-ai
spec:
  # ... other agent properties like ownership, role, goal, llm
  knowledgeBases:
    - name: clinical-knowledge # A local alias for the KB
      type: AzureAISearch      # Must match the KB type
      connection:
        # Reference the KnowledgeBase CR you created
        knowledgeBaseRef:
          name: clinical-decision-support-kb
          namespace: healthcare-ai
  rag:
    retrieval:
      # This agent requires citations in its responses
      requireCitations: true
```

---

## 4. Best Practices & Troubleshooting

### Best Practices
*   **Start with Security:** For any healthcare use case, configure the `security` section first. Enable `hipaa` compliance and define `phiRedaction` rules from the outset.
*   **Leverage Clinical Features:** Don't use generic chunking for clinical notes. Use `strategy: clinical-segment`. Use `clinicalQueryExpansion` to significantly improve retrieval accuracy on medical queries.
*   **Use Hybrid Models:** For embeddings and search, a hybrid approach that combines general knowledge with clinical-specific models often yields the best results.
*   **Define Strict Guardrails:** Use `evaluation.guardrails` to prevent your AI from giving harmful or inappropriate medical advice. Block diagnostic questions and enforce disclaimers on all outputs.
*   **Version Everything:** Use the `identity.version` and `identity.git` fields to track changes to your knowledge base configuration as you would with any other piece of critical infrastructure.

### Troubleshooting Common Issues
1.  **Poor Clinical Retrieval Quality:**
    *   **Check Chunking:** Is your `chunking.strategy` set to `clinical-segment`? Are the `sectionHeaders` correct for your document formats?
    *   **Verify Embeddings:** Is `clinical.useClinicalEmbeddings` enabled? Try adjusting the weights in `hybridEmbedding`.
    *   **Expand Queries:** Ensure `clinicalQueryExpansion` is enabled in the `retrieval` section.

2.  **PHI Leakage Detected:**
    *   **Review `phiRedaction.entities`**: Have you included all relevant PHI types for your data? You may need to add more from the extensive list in the spec.
    *   **Add Custom Patterns**: If your data has unique identifiers, add them to `phiRedaction.customPatterns` with regex.
    *   **Check `clinicalContextPreservation`**: This is a balance. If too much context is preserved, it might include quasi-identifiers. Adjust the `contextWindowSize`.

3.  **HIPAA Compliance Gaps:**
    *   **Audit Everything:** Ensure `compliance.hipaa.auditLogging.enabled` is `true`.
    *   **Check Retention:** Does `lifecycle.retention.clinical.minimumRetentionPeriod` meet or exceed legal requirements (often 6-7 years)?
    *   **Access Control:** Ensure you have defined `security.accessControl` policies if you need fine-grained permissions.
