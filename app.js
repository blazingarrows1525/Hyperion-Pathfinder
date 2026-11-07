
// ==============================================================================
// 0. SPATIAL AUDIO ENGINE & AMBIENT 3D BACKGROUND (WEB AUDIO & CANVAS)
// ==============================================================================
class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }
  toggle() {
    this.init();
    this.enabled = !this.enabled;
    const btn = document.getElementById('btn-sound-toggle');
    const label = document.getElementById('sound-toggle-label');
    if (btn) {
      btn.classList.toggle('active', this.enabled);
      btn.setAttribute('aria-pressed', String(this.enabled));
      const icon = btn.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', this.enabled ? 'volume-2' : 'volume-x');
        if (window.lucide) window.lucide.createIcons();
      }
    }
    if (label) label.textContent = this.enabled ? 'On' : 'Off';
    if (this.enabled) this.click();
    showToast(this.enabled ? 'Interface sounds on.' : 'Interface sounds off.');
    return this.enabled;
  }
  playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.04) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio context policy safe ignore
    }
  }
  click() { this.playTone(850, 'sine', 0.04, 0.035); }
  nodeSelect() {
    this.playTone(520, 'sine', 0.09, 0.05);
    setTimeout(() => this.playTone(1040, 'triangle', 0.16, 0.045), 60);
  }
  modeSwitch() {
    this.playTone(440, 'triangle', 0.07, 0.04);
    setTimeout(() => this.playTone(880, 'sine', 0.16, 0.045), 70);
  }
  burst() {
    this.playTone(280, 'sawtooth', 0.16, 0.05);
    setTimeout(() => this.playTone(620, 'sine', 0.22, 0.04), 80);
  }
  copy() {
    this.playTone(660, 'sine', 0.07, 0.045);
    setTimeout(() => this.playTone(990, 'sine', 0.14, 0.04), 65);
  }
}
const spatialAudio = new SpatialAudioEngine();
window.spatialAudio = spatialAudio;

function initSpatialAudioController() {
  const btn = document.getElementById('btn-sound-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      spatialAudio.toggle();
    });
  }
}

// ==============================================================================
// API BASE URL — same origin by default. A deployment that serves the UI from a
// different host sets window.CAREER_CONFIG = { API_BASE_URL: 'https://api…' }
// before app.js loads.
// ==============================================================================
function resolveApiBase() {
  const configured = window.CAREER_CONFIG && window.CAREER_CONFIG.API_BASE_URL;
  if (configured && typeof configured === 'string') return configured.replace(/\/$/, '');
  return '';
}

function apiUrl(path) {
  return `${resolveApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}

// ==============================================================================
// THEME PALETTE — the single colour source for canvases, charts and Three.js.
// Reads the active theme's CSS tokens, so a theme switch only needs a re-read.
// ==============================================================================
const PALETTE_TOKENS = {
  canvas: '--color-canvas',
  surface: '--color-surface',
  surfaceRaised: '--color-surface-raised',
  ink: '--color-ink',
  inkSoft: '--color-ink-soft',
  muted: '--color-muted',
  border: '--color-border',
  borderStrong: '--color-border-strong',
  forest: '--color-forest',
  terracotta: '--color-terracotta',
  ochre: '--color-ochre',
  lagoon: '--color-lagoon',
  orchid: '--color-orchid',
  danger: '--color-danger'
};

function getThemePalette() {
  const styles = getComputedStyle(document.documentElement);
  const read = (token) => styles.getPropertyValue(token).trim();
  const palette = {};
  Object.entries(PALETTE_TOKENS).forEach(([key, token]) => {
    palette[key] = read(token) || '#777777';
  });
  // Indexed by K-Means cluster id (0-4), matching --arch-N-color.
  palette.archetypes = [0, 1, 2, 3, 4].map(id => read(`--arch-${id}-color`) || palette.forest);
  palette.isDark = document.documentElement.getAttribute('data-theme') === 'grove';
  return palette;
}

/**
 * ==============================================================================
 * RESUME CHECKER — MASTER CLIENT CONTROLLER & ARCHITECTURE
 * Three.js 3D Constellation, 18-Framework Prompt Studio, Glassdoor Placement
 * Intelligence, Streaming AI Resume Analyzer & Accessible Interaction Lab
 * ==============================================================================
 */

// ==============================================================================
// 1. GLOBAL STATE STORE
// ==============================================================================
const appState = {
  // Motion & Environment
  motionMode: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full',
  apiStatus: 'checking', // 'checking' | 'connected' | 'offline' | 'demo'

  // Analyzer State
  analyzer: {
    selectedFile: null,
    jobDescription: '',
    status: 'idle', // 'idle' | 'submitting' | 'streaming' | 'complete' | 'cancelled' | 'error'
    abortController: null,
    activeRun: null, // the one run allowed to change anything; see startAnalysisRun
    streamBuffer: '', // the report on screen; only a validated new report replaces it
    reportJobDescription: '', // the job description that report was made for
    extractedScore: null,
    demoMode: false,
    reportIsDemo: false, // provenance of the report currently in streamBuffer
    errorMessage: ''
  },

  // Career Genome State
  genome: {
    selectedArchetypeId: 1, // Default: Data Science & AI/ML
    compareArchetypeA: 1,
    compareArchetypeB: 2
  },

  // Company Intelligence State
  companies: {
    searchQuery: '',
    activeFilter: 'all',
    sortBy: 'alumni', // 'alumni' (ranks by 2026 report offers) | 'name' | 'tier'
    selectedCompanyId: null
  },

  // 2026 placement report (placement_snapshot_2026.json), shared by the
  // snapshot section and the company directory once loaded.
  placementSnapshot: null,

  // GET /api/corpus-summary: alumni corpus counts per archetype (no names or files).
  corpusSummary: null,

  // Prompt Studio State (All 18 Frameworks)
  promptStudio: {
    selectedFrameworkId: 'CLEAR',
    categoryFilter: 'all',
    searchQuery: '',
    formData: {},
    drafts: {},          // per-framework drafts, memory only
    frameworks: [],      // from GET /api/frameworks (prompt_frameworks.json)
    registrySource: null,
    recommendation: null
  },

  // 5. Voice Assistant & Transcription State
  voice: {
    sttSupport: 'unknown', // 'supported' | 'unsupported'
    status: 'idle', // 'idle' | 'listening' | 'transcript_ready' | 'error'
    locale: 'en-IN',
    destination: 'replace_jd', // 'replace_jd' | 'append_jd' | 'coach_message'
    finalTranscript: '',
    interimTranscript: '',
    recognition: null,
    ttsUtterance: null,
    ttsStatus: 'idle', // 'idle' | 'playing' | 'paused'
    ttsRate: 1.0,
    activeVoice: null
  },

  // 6. Senior Executive Review State
  executiveReview: {
    selectedPersonaId: 'auto',
    status: 'idle',
    review: null,
    errorCode: null
  },

  // 7. In-Document Interactive Resume Tailoring State
  resumeDraft: {
    sourceRevisionId: 'rev_0',
    currentRevisionId: 'rev_0',
    textHash: '',
    displayText: '',
    originalText: '',
    markupItems: [],
    selectedMarkupId: null,
    // [{ revisionId, text, markups, score, breakdown, scored, edits: [{ before, after }] }]
    // score and breakdown belong to the revision; scored is false after an edit until it is re-scored.
    draftHistory: [],
    historyIndex: -1,
    lastRevisionNumber: 0,
    popoverAnchorId: null,
    unsavedChanges: false,
    recalculationStatus: 'idle',
    diffOpen: false
  },

  // 8. Conversational Career Coach State
  coachChat: {
    messages: [],
    status: 'idle'
  },

  // 9. Structured Report Reference
  reportData: null
};

// ==============================================================================
// 2. PROMPT FRAMEWORK WRITING GUIDES
// prompt_frameworks.json (served at GET /api/frameworks) is the source of truth
// for names, groups, expansions, "best for", fields and scenarios. These
// entries only add per-field help (placeholder, hint, example), matched to the
// registry by normalised field name; their other fields are a fallback used
// only if the registry cannot be loaded.
// ==============================================================================
// Writing help only: a sample and a placeholder and hint per field. The registry served by
// GET /api/frameworks (prompt_frameworks.json) owns every name, definition, group and field order.
const promptFrameworksRegistry = [
  // --- POSTER A: RESEARCH & STRUCTURED WORK ---
  {
    id: 'CLEAR',
    sample: {
      Context: 'Senior year CSE student targeting Tier-1 AI Research/ML Engineer campus placements.',
      Logic: 'Need to isolate metric-driven project bullet points that distinguish academic prototypes from production-ready systems.',
      Expectations: 'Provide a structured tabular breakdown contrasting weak vs strong achievement statements.',
      Action: 'Audit my computer vision and LLM project descriptions.',
      Restriction: 'Do not use buzzwords like "spearheaded" or "passionate". Focus strictly on measurable throughput, latency, or accuracy.'
    },
    fields: [
      { key: 'Context', placeholder: 'Describe your background, domain, and objective...', hint: 'Who are you and what is the situation?' },
      { key: 'Logic', placeholder: 'Explain the reasoning, rationale, or necessity...', hint: 'Why are you seeking this specific output?' },
      { key: 'Expectations', placeholder: 'Detail the format, depth, and output structure...', hint: 'What exactly must the result look like?' },
      { key: 'Action', placeholder: 'Specify the direct task for the AI to execute...', hint: 'What command or analysis should be run?' },
      { key: 'Restriction', placeholder: 'List constraints, taboos, or negative rules...', hint: 'What should be avoided or excluded?' }
    ]
  },
  {
    id: 'SMART',
    sample: {
      Specific: 'Upskill in Distributed Systems and System Design for Microsoft SDE-1 placement rounds.',
      Measurable: 'Implement an in-memory Redis-compatible distributed cache and complete 40 LeetCode Medium graph problems.',
      Achievable: 'Dedicate 2 hours daily alongside 7th-semester coursework.',
      Relevant: 'Directly aligns with Microsoft and Amazon interview bar requirements.',
      TimeBound: 'Complete within 4 weeks before campus hiring drives begin.'
    },
    fields: [
      { key: 'Specific', placeholder: 'What precise goal are you setting?' },
      { key: 'Measurable', placeholder: 'How will success and completion be quantified?' },
      { key: 'Achievable', placeholder: 'Is this realistic within your current bandwidth?' },
      { key: 'Relevant', placeholder: 'Why does this matter to your placement trajectory?' },
      { key: 'TimeBound', placeholder: 'What is the strict deadline or schedule?' }
    ]
  },
  {
    id: 'QUEST',
    sample: {
      Question: 'How does FAISS IndexFlatL2 compare with HNSW indexing for 100k resume embeddings on memory-constrained servers?',
      Understanding: 'I understand cosine similarity and basic Euclidean distance search.',
      Expectation: 'A technical trade-off matrix covering RAM consumption, query QPS, and recall accuracy.',
      Scope: 'Focus on CPU inference in Python microservices; exclude GPU clustering.',
      Time: 'Evaluate for deployment in the current sprint.'
    },
    fields: [
      { key: 'Question', placeholder: 'What core question are you investigating?' },
      { key: 'Understanding', placeholder: 'What is your current level of knowledge?' },
      { key: 'Expectation', placeholder: 'What deliverable are you expecting?' },
      { key: 'Scope', placeholder: 'What boundaries, technologies, or limits apply?' },
      { key: 'Time', placeholder: 'What time horizon or timeframe is relevant?' }
    ]
  },
  {
    id: 'GUIDE',
    sample: {
      Goal: 'Master Spring Boot microservices architecture for Goldman Sachs technical interviews.',
      Understanding: 'Proficient in Core Java, basic SQL, and REST principles.',
      Information: 'Need references covering JPA/Hibernate, Spring Security, and transaction isolation.',
      Direction: 'Provide a structured 5-milestone roadmap with hands-on deliverables.',
      Evaluation: 'Include self-check verification questions at each milestone.'
    },
    fields: [
      { key: 'Goal', placeholder: 'State the primary end objective...' },
      { key: 'Understanding', placeholder: 'Current familiarity and prerequisites...' },
      { key: 'Information', placeholder: 'What knowledge components are needed?' },
      { key: 'Direction', placeholder: 'How should the instruction proceed?' },
      { key: 'Evaluation', placeholder: 'How will comprehension be validated?' }
    ]
  },
  {
    id: 'FOCUS',
    sample: {
      Function: 'Technical resume bullet points optimization.',
      Outcome: 'A set of 5 concise, high-impact bullet points for a Cloud/DevOps internship.',
      Criteria: 'Must fit 1-2 lines each; must include specific metric deltas (e.g., % reduction, latency).',
      UnderlyingAssumptions: 'The reviewer has 15 seconds to scan before deciding.',
      Strategy: 'Use Google XYZ formula: Accomplished [X] as measured by [Y], by doing [Z].'
    },
    fields: [
      { key: 'Function', placeholder: 'What is the operational function?' },
      { key: 'Outcome', placeholder: 'What is the desired end outcome?' },
      { key: 'Criteria', placeholder: 'What mandatory criteria must be met?' },
      { key: 'UnderlyingAssumptions', placeholder: 'What assumptions are in play?' },
      { key: 'Strategy', placeholder: 'What execution strategy should be followed?' }
    ]
  },
  {
    id: 'IDEA',
    sample: {
      Intent: 'Rewrite a bland capstone project summary into an industry-grade portfolio description.',
      Details: 'Full-stack e-commerce project with Next.js, Stripe, Redis, and PostgreSQL.',
      Examples: 'Bad: "Made an e-commerce website with cart." Good: "Architected high-concurrency checkout with Redis rate-limiting and idempotent Stripe webhooks."',
      Adjustments: 'Keep tone technical, authoritative, and concise.'
    },
    fields: [
      { key: 'Intent', placeholder: 'What are you trying to accomplish?' },
      { key: 'Details', placeholder: 'Provide the raw facts, components, and tools...' },
      { key: 'Examples', placeholder: 'Supply positive or negative reference examples...' },
      { key: 'Adjustments', placeholder: 'What stylistic tweaks should be applied?' }
    ]
  },
  {
    id: 'RISEN',
    sample: {
      Requirement: 'Choose between accepting a ₹12 LPA Fintech offer or continuing into Super Dream hiring drives.',
      Information: 'Have strong algorithmic foundation (400+ LC), CGPA 8.9, 2 top-tier internships.',
      Strategy: 'Compare long-term engineering mentorship vs immediate brand prestige.',
      Evaluation: 'Assess risk profile and hiring market liquidity.',
      Negotiation: 'Determine possible start-date deferral or competing offer negotiation strategies.'
    },
    fields: [
      { key: 'Requirement', placeholder: 'What is the core decision requirement?' },
      { key: 'Information', placeholder: 'What background data and facts are known?' },
      { key: 'Strategy', placeholder: 'What evaluation strategy should be used?' },
      { key: 'Evaluation', placeholder: 'How should outcomes be judged?' },
      { key: 'Negotiation', placeholder: 'What trade-offs or negotiation room exist?' }
    ]
  },
  {
    id: 'RHODES',
    sample: {
      Research: 'Investigating impact of fine-tuning small LLMs (Llama 3 8B) for automated resume skill gap extraction.',
      Hypothesis: 'LoRA fine-tuning will outperform zero-shot GPT-4o-mini on proprietary university resume phrasing by >15% F1.',
      Objectives: 'Benchmark token efficiency, latency, and extraction precision.',
      Development: 'Construct 500 labeled benchmark resume-JD pairs with verified ground truth.',
      Execution: 'Train with HuggingFace TRL and evaluate with ROUGE/BERTScore.',
      Synthesis: 'Summarize deployment trade-offs in an academic conference format.'
    },
    fields: [
      { key: 'Research', placeholder: 'What domain or phenomenon is being studied?' },
      { key: 'Hypothesis', placeholder: 'What testable hypothesis is proposed?' },
      { key: 'Objectives', placeholder: 'What specific targets define success?' },
      { key: 'Development', placeholder: 'What dataset, methodology, or pipeline is built?' },
      { key: 'Execution', placeholder: 'How will the trial be executed?' },
      { key: 'Synthesis', placeholder: 'How should findings be reported?' }
    ]
  },
  {
    id: 'CREATE',
    sample: {
      Conceptualize: 'A real-time voice interview simulator for technical campus interviews.',
      Research: 'Inspect WebRTC, Whisper speech-to-text, and low-latency LLM streaming.',
      Experiment: 'Build a prototype testing audio streaming latency under 500ms.',
      Analyze: 'Evaluate latency bottlenecks between transcription and response generation.',
      Transform: 'Refactor sequential HTTP calls into full-duplex WebSockets.',
      Evaluate: 'Validate candidate stress levels and feedback quality against real mock interviews.'
    },
    fields: [
      { key: 'Conceptualize', placeholder: 'Initial concept or idea...' },
      { key: 'Research', placeholder: 'Technical references and prior art...' },
      { key: 'Experiment', placeholder: 'Test scenario or prototype...' },
      { key: 'Analyze', placeholder: 'Metrics and bottlenecks to observe...' },
      { key: 'Transform', placeholder: 'How the prototype is optimized...' },
      { key: 'Evaluate', placeholder: 'Final validation against success criteria...' }
    ]
  },

  // --- POSTER B: TASK & RESPONSE STRUCTURE ---
  {
    id: 'RACE',
    sample: {
      Role: 'Principal Software Architect at a Big Tech company conducting candidate screening.',
      Action: 'Critique my system design project (Scalable Distributed Log Aggregator).',
      Context: 'I am preparing for an Amazon SDE-2 bar raiser round.',
      Expectation: 'List 3 critical failure points in high-concurrency partitions and recommend resilient patterns.'
    },
    fields: [
      { key: 'Role', placeholder: 'Who should the AI act as?' },
      { key: 'Action', placeholder: 'What specific task must be executed?' },
      { key: 'Context', placeholder: 'What is the background or situation?' },
      { key: 'Expectation', placeholder: 'What is the expected deliverable?' }
    ]
  },
  {
    id: 'TAG',
    sample: {
      Task: 'Extract required technical keywords from a Google Cloud Architect JD.',
      Action: 'Categorize keywords into Infrastructure, Networking, Databases, and CI/CD.',
      Goal: 'Identify missing competencies in my resume before applying.'
    },
    fields: [
      { key: 'Task', placeholder: 'What is the primary task?' },
      { key: 'Action', placeholder: 'What action should be performed?' },
      { key: 'Goal', placeholder: 'What is the ultimate goal?' }
    ]
  },
  {
    id: 'TRACE',
    sample: {
      Task: 'Draft cold outreach LinkedIn messages to industry engineers at Microsoft.',
      Request: 'Write 3 personalized message variants under 300 characters each.',
      Action: 'Emphasize engineering background and interest in Azure Core Systems.',
      Context: 'Applying for campus off-campus referral for SDE-1.',
      Example: 'Reference example: "Hi [Name], inspired by your work on Azure networking..."'
    },
    fields: [
      { key: 'Task', placeholder: 'What task is being tackled?' },
      { key: 'Request', placeholder: 'What exact output are you requesting?' },
      { key: 'Action', placeholder: 'What specific direction must be followed?' },
      { key: 'Context', placeholder: 'What context informs the request?' },
      { key: 'Example', placeholder: 'Provide a sample format or style reference...' }
    ]
  },
  {
    id: 'CARE',
    sample: {
      Context: 'During my backend internship, database query spikes were causing 504 gateway timeouts on customer dashboards.',
      Action: 'Profiled slow queries using EXPLAIN ANALYZE, added composite indexes, and implemented a 60-second Redis cache.',
      Result: 'Reduced p99 query latency from 1,800ms to 45ms and dropped CPU utilization by 42%.',
      Example: 'Translate this into 2 resume bullet points and 1 behavioral interview talking point.'
    },
    fields: [
      { key: 'Context', placeholder: 'Describe the problem setting...' },
      { key: 'Action', placeholder: 'What specific actions did you take?' },
      { key: 'Result', placeholder: 'What quantifiable results were achieved?' },
      { key: 'Example', placeholder: 'How should this be packaged or formulated?' }
    ]
  },
  {
    id: 'PAR',
    sample: {
      Problem: 'Manual PDF invoice parsing was error-prone and took 12 human hours weekly.',
      Action: 'Engineered an asynchronous Celery pipeline using OpenCV and Tesseract OCR with automated schema validation.',
      Result: 'Processed 5,000+ monthly documents with 99.2% extraction accuracy, saving 10+ hours per week.'
    },
    fields: [
      { key: 'Problem', placeholder: 'What friction, bottleneck, or bug existed?' },
      { key: 'Action', placeholder: 'What engineering steps did you implement?' },
      { key: 'Result', placeholder: 'What measurable business/system delta occurred?' }
    ]
  },
  {
    id: 'STAR',
    sample: {
      Situation: 'Two weeks before hackathon finals, our team lead left the project, leaving authentication incomplete.',
      Task: 'Step in as technical coordinator to finish JWT auth and ensure deployment on AWS.',
      Action: 'Re-scoped features using MoSCoW prioritization, pair-programmed with junior peers, and wrote automated smoke tests.',
      Result: 'Shipped on schedule, handled 2,000 concurrent demo users, and won 2nd place overall.'
    },
    fields: [
      { key: 'Situation', placeholder: 'Set the scene and background...' },
      { key: 'Task', placeholder: 'What responsibility were you assigned?' },
      { key: 'Action', placeholder: 'What specific steps did you champion?' },
      { key: 'Result', placeholder: 'What outcome was achieved?' }
    ]
  },
  {
    id: 'APE',
    sample: {
      Action: 'Summarize the Top 10 Dynamic Programming patterns for tech placement interviews.',
      Purpose: 'Enable quick revision 24 hours prior to an online coding assessment.',
      Expectation: 'Provide pattern name, time complexity, and one classic LeetCode problem link.'
    },
    fields: [
      { key: 'Action', placeholder: 'What must be performed?' },
      { key: 'Purpose', placeholder: 'Why is this being done?' },
      { key: 'Expectation', placeholder: 'What are the strict output bounds?' }
    ]
  },
  {
    id: 'CRISPE',
    sample: {
      Capacity: 'Senior Staff Engineer and Placement Hiring Committee Chair at Cisco.',
      Insight: 'Students frequently list too many shallow tools without deep networking fundamentals.',
      Statement: 'Evaluate my resume project: "Distributed SDN Controller with OpenFlow".',
      Personality: 'Rigorous, pragmatic, skeptical of buzzwords, supportive of deep foundational knowledge.',
      Experiment: 'Provide 3 tough technical interview questions that would instantly expose shallow knowledge.'
    },
    fields: [
      { key: 'Capacity', placeholder: 'What role capacity does the model adopt?' },
      { key: 'Insight', placeholder: 'What context or insider perspective informs this?' },
      { key: 'Statement', placeholder: 'What statement or item is under review?' },
      { key: 'Personality', placeholder: 'What tone or demeanor should be used?' },
      { key: 'Experiment', placeholder: 'What test or simulation should be performed?' }
    ]
  },
  {
    id: 'RTF',
    sample: {
      Role: 'Expert ATS Resume Screener.',
      Task: 'Extract 5 missing hard skills by comparing my resume against the target Amazon SDE-1 JD.',
      Finish: 'Return a bulleted list where each bullet starts with the skill in bold, followed by a 1-sentence explanation of where it appears in the JD.'
    },
    fields: [
      { key: 'Role', placeholder: 'Define persona or position...' },
      { key: 'Task', placeholder: 'Define the explicit task...' },
      { key: 'Finish', placeholder: 'Define the strict delivery format and style...' }
    ]
  }
];

// ==============================================================================
// 3. DETERMINISTIC FRAMEWORK RECOMMENDER (TRANSPARENT, ZERO FAKE AI)
// ==============================================================================
const scenarioRecommendations = {
  research: {
    primaryId: 'CLEAR',
    altId: 'QUEST',
    reason: 'For structured technical research, CLEAR sets context, logic, and negative restrictions to eliminate ambiguities.'
  },
  resume: {
    primaryId: 'PAR',
    altId: 'STAR',
    reason: 'Problem-Action-Result format is the industry gold standard for metric-driven, scan-friendly resume bullet points.'
  },
  planning: {
    primaryId: 'SMART',
    altId: 'GUIDE',
    reason: 'SMART creates measurable benchmarks with hard deadlines, essential for placement preparation schedules.'
  },
  interview: {
    primaryId: 'STAR',
    altId: 'CARE',
    reason: 'Situation-Task-Action-Result is the universal model expected in Big Tech behavioral and bar-raiser rounds.'
  },
  email: {
    primaryId: 'RACE',
    altId: 'RTF',
    reason: 'RACE establishes role persona and communication boundaries for high-conversion networking outreach.'
  },
  experiment: {
    primaryId: 'CREATE',
    altId: 'RHODES',
    reason: 'CREATE structures end-to-end prototype ideation, experimentation, analysis, and validation.'
  }
};

// ==============================================================================
// 4. THE 5 ALUMNI CAREER ARCHETYPES DATA MODEL
// ==============================================================================
const archetypesDatabase = [
  {
    id: 0,
    name: 'Core Engineering & Business',
    clusterLabel: 'CLUSTER #0',
    accentColor: 'var(--arch-0-color)',
    sampleAlumniCount: '17 verified profiles',
    summary: 'Focuses on analytical modeling, business operations, tech consulting, and supply chain management. Profiles showcase cross-functional data synthesis and enterprise tooling.',
    keySkills: ['Business Analytics', 'SQL / PowerBI', 'Operations Research', 'Financial Modeling', 'Excel / VBA', 'Strategic Consulting', 'ERP Systems', 'Scrum / Agile'],
    typicalRoles: ['Management Trainee', 'Technology Consultant', 'Business Analyst', 'Operations Associate', 'Product Analyst'],
    projectThemes: ['E-Commerce Supply Chain Optimization', 'Customer Churn Classification in Banking', 'Procurement Lifecycle Automation'],
    sampleJd: `Business Technology Consultant — Enterprise Strategy.
Responsibilities:
- Bridge technical engineering architecture with executive business KPIs.
- Construct SQL data models and executive dashboards tracking revenue leakage.
- Facilitate agile sprint ceremonies and lead client requirement workshops.
Requirements:
- Strong analytical problem-solving and SQL proficiency.
- Experience with business process mapping and financial impact modeling.`
  },
  {
    id: 1,
    name: 'Data Science & AI/ML',
    clusterLabel: 'CLUSTER #1',
    accentColor: 'var(--arch-1-color)',
    sampleAlumniCount: '53 verified profiles',
    summary: 'Heavy focus on machine learning algorithms, deep neural architectures, natural language processing, computer vision, and mathematical modeling.',
    keySkills: ['Python', 'PyTorch / TensorFlow', 'HuggingFace Transformers', 'Scikit-Learn', 'Vector DBs (FAISS)', 'Computer Vision (OpenCV)', 'Data Pipelines (Pandas)', 'MLOps / Docker'],
    typicalRoles: ['Machine Learning Engineer', 'Data Scientist', 'AI Research Associate', 'NLP Specialist', 'Quant Analyst'],
    projectThemes: ['Transformer-based Domain Resume Matcher', 'Autonomous Vehicle Object Detection via YOLOv8', 'High-Frequency Time-Series Forecasting'],
    sampleJd: `Machine Learning Engineer — Core AI Research.
Responsibilities:
- Build and optimize deep learning pipelines handling millions of feature vectors.
- Fine-tune open-source LLMs using LoRA/PEFT for domain-specific NLP tasks.
- Containerize inference endpoints with FastAPI and Triton Inference Server.
Requirements:
- Deep command over Python, PyTorch, Linear Algebra, and Vector Search (FAISS/Pinecone).
- Proven track record evaluating latency, memory footprint, and F1/ROUGE metrics.`
  },
  {
    id: 2,
    name: 'General CS & Software Dev',
    clusterLabel: 'CLUSTER #2',
    accentColor: 'var(--arch-2-color)',
    sampleAlumniCount: '88 verified profiles',
    summary: 'The classical software engineering archetype. Grounded in solid Data Structures, Algorithms, Object-Oriented Design, operating systems internals, and distributed databases.',
    keySkills: ['Data Structures & Algorithms', 'C++ / Java', 'Object-Oriented Design', 'Operating Systems', 'DBMS & Indexing', 'Multithreading', 'Linux Internals', 'Git'],
    typicalRoles: ['Software Development Engineer I (SDE-1)', 'Systems Engineer', 'Backend Developer', 'Core Platforms Engineer'],
    projectThemes: ['Distributed In-Memory Key-Value Store', 'Multi-Threaded HTTP Web Server in C++', 'Custom Memory Allocator & Garbage Collector'],
    sampleJd: `Software Development Engineer (SDE-1) — Distributed Systems.
Responsibilities:
- Develop mission-critical backend services with low-latency SLAs.
- Write robust, thread-safe production code with comprehensive unit tests.
- Participate in design reviews analyzing algorithmic time and space complexity.
Requirements:
- Exceptional proficiency in C++ or Java and core computer science fundamentals.
- Strong understanding of Trees, Graphs, Dynamic Programming, and Concurrency.`
  },
  {
    id: 3,
    name: 'Full-Stack Web Development',
    clusterLabel: 'CLUSTER #3',
    accentColor: 'var(--arch-3-color)',
    sampleAlumniCount: '31 verified profiles',
    summary: 'End-to-end product engineering spanning modern responsive frontend architectures, REST/GraphQL APIs, relational and NoSQL databases, and cloud deployment.',
    keySkills: ['React / Next.js', 'Node.js / Express', 'TypeScript', 'FastAPI / Python', 'PostgreSQL / MongoDB', 'Redis Caching', 'Docker / CI/CD', 'Tailwind CSS'],
    typicalRoles: ['Full-Stack Engineer', 'Frontend Specialist', 'API Engineer', 'Product Developer', 'DevOps / Cloud Associate'],
    projectThemes: ['Real-Time Collaborative Code Editor with WebSockets', 'Microservices E-Commerce with Stripe Webhooks', 'Serverless Job Portal Platform'],
    sampleJd: `Full-Stack Software Engineer — Platform Engineering.
Responsibilities:
- Build accessible, performant responsive web apps with React and TypeScript.
- Design resilient REST and WebSocket APIs backed by PostgreSQL and Redis.
- Automate CI/CD pipelines deploying containerized microservices to cloud infrastructure.
Requirements:
- Proven experience with modern JavaScript/TypeScript, React state management, and backend frameworks (Node.js/FastAPI).`
  },
  {
    id: 4,
    name: 'Core Systems (Mech / Civil)',
    clusterLabel: 'CLUSTER #4',
    accentColor: 'var(--arch-4-color)',
    sampleAlumniCount: '37 verified profiles',
    summary: 'Physical engineering systems, embedded hardware integration, CAD/CAM design, finite element modeling, IoT sensor networks, and mechatronics.',
    keySkills: ['Embedded C', 'AutoCAD / SolidWorks', 'MATLAB / Simulink', 'Microcontrollers (ARM/ESP32)', 'IoT Protocols (MQTT)', 'FEA / ANSYS', 'Robotics', 'Mechatronics'],
    typicalRoles: ['Embedded Systems Engineer', 'Robotics Specialist', 'CAE / Design Analyst', 'Hardware Firmware Developer', 'IoT Systems Architect'],
    projectThemes: ['Autonomous Drone Flight Controller using PID & STM32', 'FEA Thermal Stress Analysis on EV Battery Housings', 'Industrial IoT Vibration Monitoring Array'],
    sampleJd: `Embedded Systems Firmware Engineer — Automotive & IoT.
Responsibilities:
- Program low-power microcontrollers (STM32/ESP32) using Embedded C.
- Implement SPI, I2C, UART, and CAN-bus sensor telemetry pipelines.
- Conduct hardware-in-the-loop (HIL) testing and thermal/mechanical validation.
Requirements:
- Bachelor's in Mechanical, Mechatronics, or ECE.
- Proficiency in C, microcontroller registers, and hardware debugging.`
  }
];

// ==============================================================================
// 5. COMPANY INTELLIGENCE & GLASSDOOR DIRECTORY DATASET
// ==============================================================================
const companyDatabase = [
  {
    id: 'google',
    name: 'Google',
    role: 'Software Engineer (SWE / STEP)',
    category: 'Product & Tech',
    tier: 'super-dream',
    tierLabel: 'Super Dream',
    logoChar: 'G',
    logoColor: '#4285F4',
    provenance: 'Project-curated sample data — unverified',
    skills: ['DSA / Graphs', 'System Design', 'C++', 'Go', 'Concurrency'],
    officialUrl: 'https://careers.google.com',
    sampleJd: `Software Engineer, Core Infrastructure — Google.
Responsibilities:
- Build large-scale distributed systems and cloud services handling billions of requests daily.
- Write robust, testable code in C++, Java, or Go.
- Optimize microservices latency, throughput, and memory consumption.
Qualifications:
- Bachelor's in Computer Science or related STEM field.
- Strong proficiency with Data Structures, Algorithms, Graph Traversal, and Dynamic Programming.`,
    interviewRounds: [
      { name: 'Online Coding Challenge', detail: '2 LeetCode Medium/Hard algorithmic questions (Graphs, Monotonic Stack).' },
      { name: 'Technical Round 1 (Data Structures)', detail: 'Deep dive into Trie / Segment Tree optimization & time complexity.' },
      { name: 'Technical Round 2 (Algorithms)', detail: 'Dynamic programming on DAGs + edge-case resilience.' },
      { name: 'Googleyness & Leadership', detail: 'Behavioral scenarios, handling architectural ambiguity, peer collaboration.' }
    ]
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    role: 'Software Development Engineer (SDE-1)',
    category: 'Product & Tech',
    tier: 'super-dream',
    tierLabel: 'Super Dream',
    logoChar: 'M',
    logoColor: '#00A4EF',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Algorithms', 'Azure', 'C# / Java', 'OOP Design', 'Distributed Systems'],
    officialUrl: 'https://careers.microsoft.com',
    sampleJd: `Software Development Engineer (SDE-1) — Microsoft Azure.
Responsibilities:
- Design and implement cloud services on Azure infrastructure.
- Collaborate with product managers and architects to deploy high-availability services.
Qualifications:
- Proficiency in OOP (C++, C#, or Java).
- Strong grasp of algorithmic problem solving, trees, graphs, and recursion.`,
    interviewRounds: [
      { name: 'Codility Assessment', detail: '3 questions within 90 minutes. Focus on arrays, hashing, and sliding window.' },
      { name: 'Technical Round 1', detail: 'Binary Trees, Lowest Common Ancestor, and Memory optimization.' },
      { name: 'Technical Round 2 (LLD)', detail: 'Design an in-memory Parking Lot or Rate Limiter with OOP design patterns.' },
      { name: 'AA (As Appropriate) Round', detail: 'Cultural fit, customer obsession, and live code walkthrough of resume projects.' }
    ]
  },
  {
    id: 'amazon',
    name: 'Amazon',
    role: 'SDE-1 / Cloud Support',
    category: 'Product & Tech',
    tier: 'super-dream',
    tierLabel: 'Super Dream',
    logoChar: 'A',
    logoColor: '#FF9900',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Java', 'Leadership Principles', 'AWS', 'Dynamic Programming', 'SQL'],
    officialUrl: 'https://amazon.jobs',
    sampleJd: `Software Development Engineer I (SDE I) — Amazon Web Services.
Responsibilities:
- Build mission-critical e-commerce and cloud infrastructure.
- Deliver production code under high throughput and zero downtime requirements.
Qualifications:
- Computer Science degree or equivalent experience.
- Strong proficiency in Java, C++, or Python.
- Demonstrated customer obsession and ownership aligned with Amazon Leadership Principles.`,
    interviewRounds: [
      { name: 'Online Assessment (OA1 & OA2)', detail: '2 Coding questions + Work Style assessment evaluating 16 Leadership Principles.' },
      { name: 'Technical Round 1', detail: 'Algorithms (Priority Queues, Dynamic Programming, Topological Sort).' },
      { name: 'Technical Round 2', detail: 'OOP modeling + Leadership Principle behavioral stories using STAR format.' },
      { name: 'Bar Raiser Round', detail: 'Challenging edge-case questions and deep dive into project trade-offs.' }
    ]
  },
  {
    id: 'cisco',
    name: 'Cisco',
    role: 'Software Engineer — Networking & Security',
    category: 'Product & Tech',
    tier: 'dream',
    tierLabel: 'Dream',
    logoChar: 'C',
    logoColor: '#1BA0D7',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Python', 'Computer Networks', 'TCP/IP', 'Linux', 'Security'],
    officialUrl: 'https://jobs.cisco.com',
    sampleJd: `Software Engineer — Cisco Secure & Enterprise Networks.
Responsibilities:
- Develop scalable network virtualization and enterprise routing software.
- Automate network testing frameworks using Python and Linux bash scripting.
Qualifications:
- Solid understanding of OSI model, TCP/IP stack, socket programming, and subnetting.`,
    interviewRounds: [
      { name: 'Aptitude & Technical MCQ', detail: 'Network protocol questions, C pointers, subnetting, and aptitude.' },
      { name: 'Technical Interview', detail: 'Socket programming, 3-way handshake, routing protocols (OSPF, BGP).' },
      { name: 'Managerial & HR', detail: 'Network architecture scenario and situational questions.' }
    ]
  },
  {
    id: 'goldman',
    name: 'Goldman Sachs',
    role: 'Analyst — Technology & Quantitative Analysis',
    category: 'FinTech',
    tier: 'super-dream',
    tierLabel: 'Super Dream',
    logoChar: 'GS',
    logoColor: '#7399C6',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Java / C++', 'Math & Probability', 'DSA', 'SQL', 'Financial Systems'],
    officialUrl: 'https://goldmansachs.com/careers',
    sampleJd: `Analyst — Engineering Division, Goldman Sachs.
Responsibilities:
- Build high-frequency low-latency risk management systems.
- Translate financial models into robust scalable distributed algorithms.
Qualifications:
- Solid background in Data Structures, Multithreading, and Memory Management.
- Familiarity with SQL, caching, and financial mathematics.`,
    interviewRounds: [
      { name: 'HackerRank Assessment', detail: 'Math, combinatorics, algorithms, and advanced SQL query questions.' },
      { name: 'Technical Round 1', detail: 'Hard Dynamic Programming, Bit manipulation, and thread synchronization.' },
      { name: 'Technical Round 2', detail: 'System Architecture, database indexing, and low-latency considerations.' }
    ]
  },
  {
    id: 'tcs',
    name: 'TCS (Digital / Prime)',
    role: 'Systems Engineer & AI Specialist',
    category: 'IT Services',
    tier: 'marquee',
    tierLabel: 'Digital / Prime',
    logoChar: 'TCS',
    logoColor: '#8B5CF6',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Java', 'Python', 'Cloud Basics', 'SQL', 'Full-Stack'],
    officialUrl: 'https://tcs.com/careers',
    sampleJd: `Systems Engineer (TCS Digital / Prime) — Next-Gen AI & Enterprise Engineering.
Responsibilities:
- Modernize legacy enterprise applications using Cloud, Microservices, and Generative AI.
Qualifications:
- Proficiency in Java, Python, or Web frameworks.
- Relational databases (MySQL, Oracle) and problem-solving aptitude.`,
    interviewRounds: [
      { name: 'TCS NQT', detail: 'Numerical ability, reasoning, verbal, and 2 hands-on coding questions.' },
      { name: 'Technical + Managerial', detail: 'Resume project discussion, OOP concepts, database normalization, and SDLC.' }
    ]
  },
  {
    id: 'deloitte',
    name: 'Deloitte',
    role: 'Technology Analyst — Enterprise Transformation',
    category: 'IT Services',
    tier: 'dream',
    tierLabel: 'Dream',
    logoChar: 'D',
    logoColor: '#86BC25',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Python / SQL', 'Cloud Architecture', 'Agile / Scrum', 'Data Analytics'],
    officialUrl: 'https://deloitte.com/careers',
    sampleJd: `Technology Analyst — Deloitte USI.
Responsibilities:
- Advise Fortune 500 clients on ERP cloud migrations and operational data engineering.
Qualifications:
- Bachelor's in Engineering with strong communication and database modeling skills.`,
    interviewRounds: [
      { name: 'Online Cognitive & Coding Test', detail: 'Aptitude, logical reasoning, and fundamentals.' },
      { name: 'Case Study & Tech Interview', detail: 'Client scenario modeling and architectural recommendations.' }
    ]
  },
  {
    id: 'paypal',
    name: 'PayPal',
    role: 'Software Engineer — Payments & Fraud Detection',
    category: 'FinTech',
    tier: 'super-dream',
    tierLabel: 'Super Dream',
    logoChar: 'PP',
    logoColor: '#003087',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Java', 'Kafka', 'Distributed Systems', 'REST APIs', 'Spring Boot'],
    officialUrl: 'https://careers.pypl.com',
    sampleJd: `Software Engineer — Payment Infrastructure, PayPal.
Responsibilities:
- Develop ultra-reliable settlement and checkout APIs handling thousands of transactions per second.
- Implement event-driven Kafka architectures with strict fault tolerance.`,
    interviewRounds: [
      { name: 'HackerRank OA', detail: '2 algorithmic questions (Tree serialization, sliding window).' },
      { name: 'Technical Round 1', detail: 'Concurrency in Java, thread pools, and cache consistency.' },
      { name: 'Technical Round 2', detail: 'Designing a distributed idempotent payment processor.' }
    ]
  },
  {
    id: 'uber',
    name: 'Uber',
    role: 'Software Engineer I — Marketplace & Dispatch',
    category: 'Product & Tech',
    tier: 'super-dream',
    tierLabel: 'Super Dream',
    logoChar: 'U',
    logoColor: '#000000',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Go', 'Java', 'Distributed Systems', 'Microservices', 'Kafka'],
    officialUrl: 'https://uber.com/careers',
    sampleJd: `Software Engineer I — Real-Time Marketplace, Uber.
Responsibilities:
- Optimize dynamic driver-rider matching algorithms across high-density urban grids.
- Maintain high-availability microservices in Go and Java.`,
    interviewRounds: [
      { name: 'Codesignal General Assessment', detail: 'Algorithmic speed and accuracy test.' },
      { name: 'Technical Architecture Round', detail: 'Designing geospatial indexing systems (H3/Uber Hexagonal).' },
      { name: 'Coding Rounds (x2)', detail: 'Complex graph pathfinding and concurrency locks.' }
    ]
  },
  {
    id: 'bosch',
    name: 'Bosch Global Software',
    role: 'Embedded Software Engineer — ADAS & Mobility',
    category: 'Automotive & Core',
    tier: 'dream',
    tierLabel: 'Dream',
    logoChar: 'B',
    logoColor: '#EA1D2D',
    provenance: 'Project-curated sample data — unverified',
    skills: ['Embedded C', 'AUTOSAR', 'CAN Protocol', 'MATLAB', 'RTOS'],
    officialUrl: 'https://bosch.com/careers',
    sampleJd: `Embedded Software Developer — ADAS Systems.
Responsibilities:
- Develop microcontroller firmware for Advanced Driver Assistance Systems (ADAS).
- Implement CAN communication stacks and write MISRA-compliant Embedded C code.`,
    interviewRounds: [
      { name: 'Technical Assessment', detail: 'C pointers, bitwise operations, RTOS concepts, and digital electronics.' },
      { name: 'Technical Interview', detail: 'Hardware interrupts, memory layout, and sensor bus communication.' }
    ]
  }
];

// ==============================================================================
// 6. CAREER ATLAS — the one WebGL scene on the page (Three.js r128)
// Five clay nodes for the five K-Means archetypes, sized by their corpus
// counts, on a matte paper disc, with a capped number of small dots as
// illustrative corpus points (never individual alumni). Links between
// neighbouring clusters are uniform: no similarity weight is implied.
// Renders on demand only, pauses offscreen or in a hidden tab, recolours in
// place on theme change, handles context loss and falls back to an SVG map.
// ==============================================================================
let scene = null;
let camera = null;
let renderer = null;
let careerAtlas = null;

const ATLAS_MODE_LABELS = { atlas: 'Atlas', orbit: 'Orbit', evidence: 'Evidence map' };
const ATLAS_DIAL_RADIUS = 306;
const ATLAS_ORBIT_RADIUS = 196;
// Full motion keeps the scene gently alive this long after load or the last interaction;
// then the ambient motion fades out and nothing renders until something changes.
const ATLAS_AMBIENT_MS = 10000;
const ATLAS_ZOOM_MIN = 0.62;
const ATLAS_ZOOM_MAX = 1.45;
// A press that travels further than this is a drag, not a click on a node.
const ATLAS_CLICK_SLOP_PX = 6;
// Below this stage width the legend alone names the clusters; labels would collide.
const ATLAS_LABEL_MIN_WIDTH = 720;
// Each cluster's solid, by cluster id. The legend's glyphs (styles.css, .legend-swatch) use the
// same silhouettes, so a cluster can be told apart by shape as well as by colour.
const ATLAS_SOLIDS = [
  { make: () => new THREE.CylinderGeometry(0.82, 0.96, 1.5, 6), halfHeight: 0.75, flat: true, turn: 0.26 }, // hexagon
  { make: () => new THREE.IcosahedronGeometry(1.04, 1), halfHeight: 1.04, flat: true, turn: 0 },              // circle
  { make: () => new THREE.OctahedronGeometry(1.22, 0), halfHeight: 1.22, flat: true, turn: 0.52 },            // diamond
  { make: () => new THREE.TorusGeometry(0.78, 0.34, 14, 40), halfHeight: 1.12, flat: false, turn: 0.3 },      // ring
  { make: () => new THREE.BoxGeometry(1.36, 1.36, 1.36), halfHeight: 0.68, flat: true, turn: 0.42 }           // square
];

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
  } catch (err) {
    return false;
  }
}

// Cluster i sits on an ellipse around the disc centre.
function atlasNodePosition(index, total) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2 - 0.3;
  return { x: Math.cos(angle) * ATLAS_ORBIT_RADIUS, z: Math.sin(angle) * ATLAS_ORBIT_RADIUS };
}

function getAtlasNodeData() {
  return archetypesDatabase.map(arch => {
    const c = getArchetypeCorpusCount(arch);
    return { id: arch.id, label: getArchetypeLabel(arch), count: c ? c.count : null, pct: c ? c.pct : null };
  });
}

// Deterministic pseudo-random numbers, so the illustrative dots never reshuffle.
function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

class CareerAtlas {
  constructor(canvas, wrapper) {
    this.canvas = canvas;
    this.wrapper = wrapper;
    this.mode = 'atlas';
    this.selectedId = appState.genome.selectedArchetypeId;
    this.hoverId = null;
    this.previewId = null;
    this.reducedMotion = appState.motionMode === 'reduced';
    // Rendering stops while any pause reason holds: offscreen, document-hidden or context-lost.
    this.pauseReasons = new Set();
    // Why the last frame asked for another: camera-easing, node-selection,
    // user-initiated-orbit or ambient-drift. Empty once the scene is at rest.
    this.frameReasons = new Set();
    this.frame = null;
    this.frameTimer = null;
    this.boundTick = () => this.tick();
    this.ambientUntil = 0;
    this.ambientMix = 0;
    this.easeK = 1;
    this.disposed = false;
    this.listeners = [];
    this.dragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.pressPoint = { x: 0, y: 0 };
    this.pressMoved = false;
    this.nodes = [];
    this.rot = { x: 0, y: 0 };
    this.targetRot = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.parallax = { x: 0, y: 0 };
    this.zoom = 1;
    this.targetZoom = 1;
    this.focus = { x: 0, z: 0 };
    this.size = { w: 1, h: 1 };
  }

  get lowDetail() {
    return document.body.classList.contains('designhead-minimalist') || this.size.w < 560;
  }

  init() {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (err) {
      console.warn('Career Atlas: WebGL renderer unavailable', err);
      return false;
    }
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 10, 4000);
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.cameraTarget = new THREE.Vector3();
    renderer = this.renderer;
    scene = this.scene;
    camera = this.camera;

    // A scene that cannot be built must not leave a half-bound instance behind.
    try {
      this.buildScene();
      this.applyPalette();
    } catch (err) {
      console.warn('Career Atlas: the scene could not be built', err);
      return false;
    }
    this.bindEvents();
    this.resize();
    this.armAmbient();
    return true;
  }

  // ---- scene graph --------------------------------------------------------------
  // An instrument, not a particle demo: an engraved dial, a small armillary marking the corpus,
  // and five matte solids on it. Each solid's shape identifies its cluster (see the legend), its
  // size follows the cluster's share of the corpus, and its spoke says only "part of the corpus".
  buildScene() {
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.projected = new THREE.Vector3();

    // A little haze seats the far edge of the dial in the stage background.
    this.scene.fog = new THREE.FogExp2(0x000000, 0.00026);

    // One key light and a soft fill: the solids read through their facets, not through glow.
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.7);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.9);
    this.sun.position.set(-280, 460, 300);
    this.scene.add(this.hemi, this.sun);

    // A soft round blob, used for contact shadows and the illustrative dots.
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const ctx = sprite.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.softTexture = new THREE.CanvasTexture(sprite);

    this.shadowGeo = new THREE.PlaneGeometry(1, 1);
    this.shadowMat = new THREE.MeshBasicMaterial({ map: this.softTexture, transparent: true, depthWrite: false, opacity: 0.3 });

    this.buildDial();
    this.buildArmillary();
    this.buildNodes();
    this.buildSpokes();

    // Illustrative dots: they suggest each cluster's share of the corpus and are not records.
    this.dotGeo = new THREE.BufferGeometry();
    this.dotMat = new THREE.PointsMaterial({ size: 9, map: this.softTexture, vertexColors: true, transparent: true, depthWrite: false });
    this.dots = new THREE.Points(this.dotGeo, this.dotMat);
    this.root.add(this.dots);

    this.updateNodeSizes();
    this.buildDots();
    this.buildLabels();
    this.syncSelection();
  }

  makeShadow(size, x, z) {
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.4, z);
    shadow.scale.set(size, size, 1);
    this.root.add(shadow);
    return shadow;
  }

  buildDial() {
    this.discGeo = new THREE.CylinderGeometry(ATLAS_DIAL_RADIUS, ATLAS_DIAL_RADIUS + 6, 8, 96);
    this.discMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    const disc = new THREE.Mesh(this.discGeo, this.discMat);
    disc.position.y = -4.2;
    this.root.add(disc);

    this.lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
    const ringGeos = [108, ATLAS_ORBIT_RADIUS, 256, ATLAS_DIAL_RADIUS - 8].map(radius => {
      const points = [];
      for (let i = 0; i < 144; i++) {
        const angle = (i / 144) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      this.root.add(new THREE.LineLoop(geo, this.lineMat));
      return geo;
    });
    this.ringGeos = ringGeos;

    // The graduated rim is what makes the disc read as an instrument.
    const ticks = [];
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const inner = i % 6 === 0 ? ATLAS_DIAL_RADIUS - 26 : ATLAS_DIAL_RADIUS - 16;
      const outer = ATLAS_DIAL_RADIUS - 8;
      ticks.push(Math.cos(angle) * inner, 0.3, Math.sin(angle) * inner, Math.cos(angle) * outer, 0.3, Math.sin(angle) * outer);
    }
    this.tickGeo = new THREE.BufferGeometry();
    this.tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
    this.root.add(new THREE.LineSegments(this.tickGeo, this.lineMat));
  }

  // The corpus marker: a brass armillary at the centre of the dial.
  buildArmillary() {
    this.brassMat = new THREE.MeshStandardMaterial({ roughness: 0.48, metalness: 0.3 });
    this.armillary = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(15, 19, 5, 40), this.brassMat);
    base.position.y = 2.5;
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 40, 12), this.brassMat);
    pin.position.y = 24;
    const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(7.5, 2), this.brassMat);
    globe.position.y = 48;
    this.ringGeo = new THREE.TorusGeometry(19, 0.55, 8, 72);
    this.armillaryRingA = new THREE.Mesh(this.ringGeo, this.brassMat);
    this.armillaryRingB = new THREE.Mesh(this.ringGeo, this.brassMat);
    this.armillaryRingA.position.y = 48;
    this.armillaryRingB.position.y = 48;
    this.armillaryRingA.rotation.set(1.18, 0, 0);
    this.armillaryRingB.rotation.set(0.42, 0.9, 0);
    this.armillary.add(base, pin, globe, this.armillaryRingA, this.armillaryRingB);
    this.root.add(this.armillary);
    this.makeShadow(74, 0, 0);
  }

  buildNodes() {
    const data = getAtlasNodeData();
    this.plinthGeo = new THREE.CylinderGeometry(1, 1.12, 1, 40);
    this.haloGeo = new THREE.RingGeometry(1.24, 1.38, 72);
    this.plinthMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, transparent: true });
    this.hitGeo = new THREE.SphereGeometry(1, 12, 8);
    this.hitMat = new THREE.MeshBasicMaterial();

    this.nodes = data.map((d, i) => {
      const pos = atlasNodePosition(i, data.length);
      const solid = ATLAS_SOLIDS[d.id % ATLAS_SOLIDS.length];
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.62, metalness: 0, flatShading: solid.flat, transparent: true,
        emissive: new THREE.Color(0x000000), emissiveIntensity: 0
      });
      const mesh = new THREE.Mesh(solid.make(), mat);
      mesh.rotation.y = solid.turn;
      mesh.userData.archetypeId = d.id;
      // An invisible sphere takes the pointer, so the hole in the ring and a small solid's
      // edge still count. Raycasting tests it; rendering skips it.
      const hit = new THREE.Mesh(this.hitGeo, this.hitMat);
      hit.visible = false;
      mesh.add(hit);

      const plinth = new THREE.Mesh(this.plinthGeo, this.plinthMat);
      const haloMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const halo = new THREE.Mesh(this.haloGeo, haloMat);
      halo.rotation.x = -Math.PI / 2;

      group.add(plinth, mesh, halo);
      this.root.add(group);
      return {
        ...d, pos, group, mesh, hit, plinth, halo, mat, haloMat,
        shadow: this.makeShadow(60, pos.x, pos.z),
        halfHeight: solid.halfHeight,
        radius: 30, lift: 1, opacity: 1, haloOpacity: 0,
        pulsePhase: i * 1.25, bobPhase: i * 0.85
      };
    });
    this.pickables = this.nodes.map(n => n.hit);
  }

  // Spokes run from the corpus marker to each cluster. They say "part of the corpus"; nothing
  // connects clusters to each other, because no measured similarity between them is shown.
  buildSpokes() {
    const positions = [];
    this.nodes.forEach(n => positions.push(0, 0.5, 0, n.pos.x, 0.5, n.pos.z));
    this.spokeGeo = new THREE.BufferGeometry();
    this.spokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.root.add(new THREE.LineSegments(this.spokeGeo, this.lineMat));

    this.activeSpokeGeo = new THREE.BoxGeometry(1, 0.4, 2.4);
    this.activeSpokeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 });
    this.activeSpoke = new THREE.Mesh(this.activeSpokeGeo, this.activeSpokeMat);
    this.root.add(this.activeSpoke);
  }

  // Names on the stage, placed from the 3D scene. The legend carries the same facts for
  // assistive technology, so this layer is decorative for it, and it stays out of the pointer's way.
  buildLabels() {
    if (this.labelLayer) this.labelLayer.remove();
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'atlas-node-labels';
    this.labelLayer.setAttribute('aria-hidden', 'true');
    this.nodes.forEach(n => {
      n.labelEl = document.createElement('span');
      n.labelEl.className = 'atlas-node-label';
      this.labelLayer.appendChild(n.labelEl);
    });
    this.corpusLabelEl = document.createElement('span');
    this.corpusLabelEl.className = 'atlas-node-label atlas-corpus-label';
    this.labelLayer.appendChild(this.corpusLabelEl);
    this.wrapper.appendChild(this.labelLayer);
    this.renderLabelText();
  }

  renderLabelText() {
    if (!this.labelLayer) return;
    this.nodes.forEach(n => {
      n.labelEl.textContent = n.label;
    });
    const known = this.nodes.every(n => typeof n.count === 'number');
    const total = known ? this.nodes.reduce((sum, n) => sum + n.count, 0) : null;
    this.corpusLabelEl.textContent = total === null ? 'Alumni corpus' : `Alumni corpus · ${total} resumes`;
  }

  placeLabel(el, x, y, z) {
    this.projected.set(x, y, z).project(this.camera);
    const px = Math.round((this.projected.x * 0.5 + 0.5) * this.size.w);
    const py = Math.round((-this.projected.y * 0.5 + 0.5) * this.size.h);
    el.style.transform = `translate(-50%, -100%) translate(${px}px, ${py}px)`;
  }

  updateLabels() {
    if (!this.labelLayer || this.labelLayer.hidden) return;
    this.nodes.forEach(n => {
      const top = n.mesh.position.y + n.radius * n.lift * n.halfHeight + 8;
      this.placeLabel(n.labelEl, n.pos.x, top, n.pos.z);
    });
    this.placeLabel(this.corpusLabelEl, 0, 70, 0);
  }

  updateNodeSizes() {
    const counts = this.nodes.map(n => n.count).filter(c => typeof c === 'number');
    const max = counts.length ? Math.max(...counts) : null;
    this.nodes.forEach(n => {
      // Square root, so a solid's visible area rather than its width follows the count.
      n.radius = max && typeof n.count === 'number' ? 15 + 27 * Math.sqrt(n.count / max) : 28;
      n.plinth.scale.set(n.radius * 0.6, 3, n.radius * 0.6);
      n.plinth.position.y = 1.5;
      n.halo.scale.setScalar(n.radius);
      n.halo.position.y = 0.7;
      n.shadow.scale.set(n.radius * 3.1, n.radius * 3.1, 1);
      n.hit.scale.setScalar(Math.max(1.3, 30 / n.radius));
    });
  }

  // Dot count per cluster follows its share of the corpus, capped overall.
  buildDots() {
    const total = this.lowDetail ? 60 : 120;
    const known = this.nodes.every(n => typeof n.count === 'number');
    const sum = known ? this.nodes.reduce((s, n) => s + n.count, 0) : this.nodes.length;
    const rand = seededRandom(226);
    const positions = [];
    this.dotOwners = [];
    this.nodes.forEach((n, i) => {
      const share = known ? n.count / sum : 1 / this.nodes.length;
      const count = Math.max(4, Math.round(total * share));
      for (let k = 0; k < count; k++) {
        const angle = rand() * Math.PI * 2;
        const dist = n.radius * 1.5 + 8 + rand() * 40;
        positions.push(n.pos.x + Math.cos(angle) * dist, 1.2, n.pos.z + Math.sin(angle) * dist);
        this.dotOwners.push(i);
      }
    });
    this.dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.dotGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(this.dotOwners.length * 3).fill(1), 3));
    this.dotMat.size = this.lowDetail ? 8 : 9;
    this.paintDots();
  }

  paintDots() {
    if (!this.palette || !this.dotOwners) return;
    const colors = this.dotGeo.getAttribute('color');
    const c = new THREE.Color();
    this.dotOwners.forEach((owner, i) => {
      c.set(this.palette.archetypes[this.nodes[owner].id]);
      const dim = this.mode === 'evidence' && this.nodes[owner].id !== this.selectedId;
      colors.setXYZ(i, dim ? c.r * 0.55 + 0.4 : c.r, dim ? c.g * 0.55 + 0.4 : c.g, dim ? c.b * 0.55 + 0.4 : c.b);
    });
    colors.needsUpdate = true;
  }

  applyPalette() {
    this.palette = getThemePalette();
    const p = this.palette;
    this.discMat.color.set(p.isDark ? p.surface : p.surfaceRaised);
    this.lineMat.color.set(p.borderStrong);
    this.hemi.color.set(p.isDark ? p.ink : '#ffffff');
    this.hemi.groundColor.set(p.border);
    this.hemi.intensity = p.isDark ? 0.6 : 0.78;
    this.sun.intensity = p.isDark ? 0.75 : 0.85;
    this.scene.fog.color.set(p.canvas);
    this.shadowMat.color.set(p.isDark ? '#000000' : p.ink);
    this.shadowMat.opacity = p.isDark ? 0.5 : 0.24;
    this.brassMat.color.set(p.ochre);
    this.plinthMat.color.set(p.border);

    this.nodes.forEach(n => {
      const c = p.archetypes[n.id];
      n.mat.color.set(c);
      n.mat.emissive.set(c);
      n.haloMat.color.set(c);
    });
    this.syncSelection();
    this.paintDots();
    this.requestRender();
  }

  refreshCounts() {
    const data = getAtlasNodeData();
    this.nodes.forEach((n, i) => Object.assign(n, { label: data[i].label, count: data[i].count, pct: data[i].pct }));
    this.updateNodeSizes();
    this.buildDots();
    this.renderLabelText();
    this.armAmbient();
  }

  // ---- state changes -----------------------------------------------------------
  setMode(mode) {
    if (!ATLAS_MODE_LABELS[mode]) return;
    this.mode = mode;
    this.wrapper.classList.toggle('is-orbit', mode === 'orbit');
    if (mode !== 'orbit') {
      this.targetRot.x = 0;
      this.targetRot.y = 0;
      this.velocity.x = this.velocity.y = 0;
    }
    this.syncSelection();
    this.paintDots();
    this.armAmbient();
  }

  setSelected(id) {
    this.selectedId = id;
    this.syncSelection();
    this.paintDots();
    this.armAmbient();
  }

  // Everything that follows the selected cluster and is not eased frame by frame.
  syncSelection() {
    const selected = this.nodes.find(n => n.id === this.selectedId);
    if (selected && this.activeSpoke) {
      const length = Math.hypot(selected.pos.x, selected.pos.z);
      this.activeSpoke.position.set(selected.pos.x / 2, 0.6, selected.pos.z / 2);
      this.activeSpoke.scale.x = length;
      this.activeSpoke.rotation.y = -Math.atan2(selected.pos.z, selected.pos.x);
      if (this.palette) this.activeSpokeMat.color.set(this.palette.archetypes[selected.id]);
    }
    if (this.labelLayer) {
      this.nodes.forEach(n => {
        n.labelEl.classList.toggle('is-selected', n.id === this.selectedId);
        n.labelEl.classList.toggle('is-dim', this.mode === 'evidence' && n.id !== this.selectedId);
      });
    }
  }

  // Keyboard focus or hover on a legend item highlights its node.
  preview(id) {
    this.previewId = id;
    this.armAmbient();
  }

  setReducedMotion(reduced) {
    this.reducedMotion = reduced;
    if (reduced) this.ambientUntil = 0;
    this.armAmbient();
  }

  zoomBy(factor) {
    this.targetZoom = Math.min(ATLAS_ZOOM_MAX, Math.max(ATLAS_ZOOM_MIN, this.targetZoom * factor));
    syncAtlasZoomButtons();
    this.armAmbient();
  }

  resetCamera() {
    this.targetRot.x = this.targetRot.y = 0;
    this.velocity.x = this.velocity.y = 0;
    this.targetZoom = 1;
    syncAtlasZoomButtons();
    this.armAmbient();
  }

  // Render the change now, and in Full motion (re)open the ambient window.
  // Calm and system-reduced motion never get ambient frames.
  armAmbient() {
    if (!this.reducedMotion) this.ambientUntil = performance.now() + ATLAS_AMBIENT_MS;
    this.requestRender();
  }

  get ambientActive() {
    return !this.reducedMotion && performance.now() < this.ambientUntil;
  }

  // Diagnostics for the lifecycle probes.
  get schedulerState() {
    if (this.disposed) return 'disposed';
    if (this.pauseReasons.size) return `paused-${[...this.pauseReasons][0]}`;
    if (this.frame) return 'frame-pending';
    if (this.frameTimer) return 'ambient-timer-pending';
    return 'at-rest';
  }

  // ---- loop ------------------------------------------------------------------------
  // At most one thing is ever pending: an animation frame or one cadence timer.
  // Direct input and easing get an immediate frame. Ambient motion runs at a capped cadence for
  // a bounded time after load or interaction, then the scene rests and renders nothing.
  requestRender() {
    if (this.disposed || this.frame || this.pauseReasons.size) return;
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
    this.frame = requestAnimationFrame(this.boundTick);
  }

  scheduleContinuousRender() {
    if (this.disposed || this.frame || this.frameTimer || this.pauseReasons.size) return;
    const interval = this.lowDetail ? (1000 / 24) : (1000 / 30);
    this.frameTimer = window.setTimeout(() => {
      this.frameTimer = null;
      if (this.disposed || this.pauseReasons.size) return;
      this.frame = requestAnimationFrame(this.boundTick);
    }, interval);
  }

  cancelPendingFrame() {
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.frameTimer) clearTimeout(this.frameTimer);
    this.frame = null;
    this.frameTimer = null;
  }

  pause(reason) {
    this.pauseReasons.add(reason);
    this.cancelPendingFrame();
  }

  resume(reason) {
    this.pauseReasons.delete(reason);
    this.requestRender();
  }

  // Eases toward a target at a rate normalised to time; a value still on its way keeps the loop alive.
  easeTo(from, to, reason) {
    const next = from + (to - from) * this.easeK;
    if (Math.abs(to - next) <= 0.0005) return to;
    this.frameReasons.add(reason);
    return next;
  }

  tick() {
    this.frame = null;
    if (this.disposed || this.pauseReasons.size) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;
    const frameScale = dt * 60;
    this.easeK = this.reducedMotion ? 1 : 1 - Math.pow(1 - 0.16, frameScale);
    const reasons = this.frameReasons;
    reasons.clear();

    // The ambient weight fades in and out, so the end of the window settles the scene
    // instead of snapping it. Every decorative motion below is scaled by it.
    const ambientTarget = this.ambientActive ? 1 : 0;
    this.ambientMix += (ambientTarget - this.ambientMix) * (this.reducedMotion ? 1 : 1 - Math.pow(1 - 0.06, frameScale));
    if (Math.abs(ambientTarget - this.ambientMix) < 0.002) this.ambientMix = ambientTarget;
    const amb = this.ambientMix;
    if (amb > 0) reasons.add('ambient-drift');

    // Orbit inertia after a drag
    if (!this.dragging && (Math.abs(this.velocity.x) > 0.0004 || Math.abs(this.velocity.y) > 0.0004)) {
      this.targetRot.y += this.velocity.x * frameScale;
      this.targetRot.x += this.velocity.y * frameScale;
      const decay = this.reducedMotion ? 0 : Math.pow(0.82, frameScale);
      this.velocity.x *= decay;
      this.velocity.y *= decay;
      this.clampRotation();
      reasons.add('user-initiated-orbit');
    }

    // Slow drift in Atlas mode, only inside the ambient window. It moves the camera and its
    // target together, so drifting is not "easing" and stays at the ambient cadence.
    if (this.mode === 'atlas' && !this.dragging && amb > 0) {
      const drift = dt * 0.012 * amb;
      this.targetRot.y += drift;
      this.rot.y += drift;
      this.clampRotation();
    }

    this.rot.x = this.easeTo(this.rot.x, this.targetRot.x, 'camera-easing');
    this.rot.y = this.easeTo(this.rot.y, this.targetRot.y, 'camera-easing');
    this.zoom = this.easeTo(this.zoom, this.mode === 'evidence' ? this.targetZoom * 0.82 : this.targetZoom, 'camera-easing');

    let focusX = 0;
    let focusZ = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (this.mode === 'evidence' && n.id === this.selectedId) {
        focusX = n.pos.x * 0.45;
        focusZ = n.pos.z * 0.45;
      }
    }
    this.focus.x = this.easeTo(this.focus.x, focusX, 'camera-easing');
    this.focus.z = this.easeTo(this.focus.z, focusZ, 'camera-easing');

    const highlighted = this.previewId !== null ? this.previewId : this.hoverId;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const isSelected = n.id === this.selectedId;
      const isHighlighted = n.id === highlighted;

      // A very slight breath and bob, only inside the ambient window.
      const pulse = Math.sin(this.elapsed * 1.4 + n.pulsePhase) * 0.018 * amb;
      const bob = Math.sin(this.elapsed * 0.8 + n.bobPhase) * 1.6 * amb;

      n.lift = this.easeTo(n.lift, isSelected ? 1.12 : isHighlighted ? 1.06 : 1, 'node-selection');
      n.opacity = this.easeTo(n.opacity, this.mode === 'evidence' && !isSelected ? 0.32 : 1, 'node-selection');
      n.haloOpacity = this.easeTo(n.haloOpacity, isSelected ? 0.95 : isHighlighted ? 0.5 : 0, 'node-selection');

      const r = n.radius * (n.lift + pulse);
      n.mesh.scale.setScalar(r);
      n.mesh.position.y = 3 + r * n.halfHeight + bob;
      n.mat.opacity = n.opacity;
      n.haloMat.opacity = n.haloOpacity;
      n.mat.emissiveIntensity = this.easeTo(n.mat.emissiveIntensity, isSelected ? 0.16 : isHighlighted ? 0.09 : 0, 'node-selection');
    }

    // The armillary turns slowly while the ambient window is open.
    this.armillaryRingA.rotation.z += dt * 0.22 * amb;
    this.armillaryRingB.rotation.y += dt * 0.16 * amb;

    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();

    if (reasons.has('camera-easing') || reasons.has('node-selection') || reasons.has('user-initiated-orbit')) {
      this.requestRender();
    } else if (reasons.size) {
      this.scheduleContinuousRender();
    }
  }

  clampRotation() {
    this.targetRot.y = Math.max(-0.95, Math.min(0.95, this.targetRot.y));
    this.targetRot.x = Math.max(-0.3, Math.min(0.42, this.targetRot.x));
  }

  updateCamera() {
    const aspect = this.size.w / this.size.h;
    const tanHalfFov = Math.tan((this.camera.fov / 2) * Math.PI / 180);
    // Keep the whole dial in frame whichever side of the stage is the tight one.
    const fit = Math.max((ATLAS_DIAL_RADIUS + 40) / (tanHalfFov * aspect), 292 / tanHalfFov);
    const distance = fit * this.zoom;
    const elevation = 0.66 + this.rot.x + this.parallax.y;
    const azimuth = this.rot.y + this.parallax.x;
    // Aimed a little in front of the centre, so the near rim of the dial stays in frame.
    this.cameraTarget.set(this.focus.x, 22, this.focus.z + 26);
    this.camera.position.set(
      this.cameraTarget.x + distance * Math.cos(elevation) * Math.sin(azimuth),
      this.cameraTarget.y + distance * Math.sin(elevation),
      this.cameraTarget.z + distance * Math.cos(elevation) * Math.cos(azimuth)
    );
    this.camera.lookAt(this.cameraTarget);
  }

  resize() {
    const w = Math.max(1, this.wrapper.clientWidth);
    const h = Math.max(1, this.wrapper.clientHeight);
    const sizeClassChanged = (w < 560) !== (this.size.w < 560);
    this.size = { w, h };
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowDetail ? 1 : 1.5));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.labelLayer) this.labelLayer.hidden = w < ATLAS_LABEL_MIN_WIDTH;
    if (sizeClassChanged) this.buildDots();
    this.requestRender();
  }

  // ---- input -----------------------------------------------------------------
  on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.listeners.push(() => target.removeEventListener(type, handler, options));
  }

  pickNode(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    return hit ? this.nodes.find(n => n.hit === hit.object) : null;
  }

  bindEvents() {
    this.on(this.canvas, 'pointerdown', (e) => {
      this.pressPoint.x = e.clientX;
      this.pressPoint.y = e.clientY;
      this.pressMoved = false;
      // Only Orbit takes over the pointer; Atlas and Evidence leave the page free to scroll.
      if (this.mode !== 'orbit') return;
      this.dragging = true;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
      this.velocity.x = this.velocity.y = 0;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.on(this.canvas, 'pointermove', (e) => {
      if (Math.hypot(e.clientX - this.pressPoint.x, e.clientY - this.pressPoint.y) > ATLAS_CLICK_SLOP_PX) {
        this.pressMoved = true;
      }
      if (this.dragging) {
        const dx = (e.clientX - this.lastPointer.x) / this.size.w;
        const dy = (e.clientY - this.lastPointer.y) / this.size.h;
        this.lastPointer.x = e.clientX;
        this.lastPointer.y = e.clientY;
        this.velocity.x = -dx * 2.0;
        this.velocity.y = dy * 1.4;
        this.targetRot.y += this.velocity.x;
        this.targetRot.x += this.velocity.y;
        this.clampRotation();
        this.hideTooltip();
        this.requestRender();
        return;
      }
      if (e.pointerType === 'mouse') {
        const node = this.pickNode(e.clientX, e.clientY);
        const id = node ? node.id : null;
        if (id !== this.hoverId) {
          this.hoverId = id;
          this.canvas.style.cursor = node ? 'pointer' : '';
        }
        if (node) this.showTooltip(node, e.clientX, e.clientY);
        else this.hideTooltip();
        // a small parallax in Atlas mode only
        if (this.mode === 'atlas' && !this.reducedMotion) {
          const rect = this.canvas.getBoundingClientRect();
          this.parallax.x = ((e.clientX - rect.left) / rect.width - 0.5) * -0.05;
          this.parallax.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.025;
        }
        this.armAmbient(); // exploring the scene keeps it alive; it settles once the pointer rests
      }
    });
    const endDrag = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.canvas.hasPointerCapture && this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
      this.requestRender();
    };
    this.on(this.canvas, 'pointerup', endDrag);
    this.on(this.canvas, 'pointercancel', endDrag);
    this.on(this.canvas, 'lostpointercapture', endDrag);
    this.on(this.canvas, 'pointerleave', () => {
      this.hoverId = null;
      this.parallax.x = this.parallax.y = 0;
      this.canvas.style.cursor = '';
      this.hideTooltip();
      this.requestRender();
    });
    // Click or tap selects a cluster and syncs the legend and the Career Genome.
    // The release at the end of a drag is not a click on whatever lies under it.
    this.on(this.canvas, 'click', (e) => {
      if (this.pressMoved) return;
      const node = this.pickNode(e.clientX, e.clientY);
      if (!node) return;
      selectArchetype(node.id);
      this.showTooltip(node, e.clientX, e.clientY);
    });
    this.on(document, 'keydown', (e) => {
      if (e.key === 'Escape') this.hideTooltip();
    });

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.wrapper);
    } else {
      this.on(window, 'resize', () => this.resize());
    }
    if ('IntersectionObserver' in window) {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            this.pause('offscreen');
            return;
          }
          this.resume('offscreen');
          this.armAmbient(); // a brief settle-in when the stage scrolls back into view
        });
      });
      this.visibilityObserver.observe(this.wrapper);
    }
    this.on(document, 'visibilitychange', () => (document.hidden ? this.pause('document-hidden') : this.resume('document-hidden')));

    this.on(this.canvas, 'webglcontextlost', (e) => {
      e.preventDefault();
      this.pause('context-lost');
      this.hideTooltip();
      showAtlasFallback('The 3D view paused because the graphics context was lost. The map is shown in 2D until it recovers.');
      announceAtlasStatus('The 3D view paused. The 2D map is available.');
    });
    this.on(this.canvas, 'webglcontextrestored', () => {
      hideAtlasFallback();
      this.disposeSceneObjects();
      this.buildScene();
      this.applyPalette();
      this.resize();
      this.resume('context-lost');
      announceAtlasStatus('The 3D view is back.');
    });
  }

  showTooltip(node, clientX, clientY) {
    const tip = document.getElementById('canvas-3d-tooltip');
    const title = document.getElementById('tooltip-node-title');
    const sub = tip ? tip.querySelector('.tooltip-sub') : null;
    if (!tip || !title) return;
    title.textContent = node.label;
    if (sub) {
      sub.textContent = typeof node.count === 'number'
        ? `${node.count} resumes · ${node.pct}% of the corpus · cluster ${node.id}`
        : `Cluster ${node.id} · corpus count loading`;
    }
    tip.style.setProperty('--arch', `var(--arch-${node.id}-color)`);
    tip.style.display = 'block';
    // Inside the stage, whichever edge the pointer is near.
    const rect = this.wrapper.getBoundingClientRect();
    const maxX = Math.max(8, rect.width - tip.offsetWidth - 8);
    const maxY = Math.max(8, rect.height - tip.offsetHeight - 8);
    tip.style.left = `${Math.min(maxX, Math.max(8, clientX - rect.left + 14))}px`;
    tip.style.top = `${Math.min(maxY, Math.max(8, clientY - rect.top - tip.offsetHeight - 12))}px`;
  }

  hideTooltip() {
    const tip = document.getElementById('canvas-3d-tooltip');
    if (tip) tip.style.display = 'none';
  }

  // ---- teardown ------------------------------------------------------------------
  disposeSceneObjects() {
    if (!this.scene) return;
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    if (this.softTexture) this.softTexture.dispose();
    if (this.labelLayer) this.labelLayer.remove();
    this.labelLayer = null;
    this.corpusLabelEl = null;
    this.nodes = [];
    this.pickables = [];
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelPendingFrame();
    this.listeners.forEach(off => off());
    this.listeners = [];
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.visibilityObserver) this.visibilityObserver.disconnect();
    this.resizeObserver = null;
    this.visibilityObserver = null;
    this.hideTooltip();
    this.disposeSceneObjects();
    if (this.renderer) this.renderer.dispose();
    if (renderer === this.renderer) {
      scene = null;
      camera = null;
      renderer = null;
    }
    this.wrapper.classList.remove('is-orbit');
  }
}

// ---- 2D fallback: the same five clusters, as real buttons over a decorative dial ------
function showAtlasFallback(note, { offerThreeD = false } = {}) {
  const box = document.getElementById('atlas-fallback');
  const canvas = document.getElementById('spatial-hero-canvas');
  if (!box) return;
  const data = getAtlasNodeData();
  const known = data.filter(d => typeof d.count === 'number');
  const max = known.length ? Math.max(...known.map(d => d.count)) : null;
  const selectedId = appState.genome.selectedArchetypeId;
  const spots = data.map((d, i) => {
    const p = atlasNodePosition(i, data.length);
    return { ...d, left: 50 + (p.x / ATLAS_DIAL_RADIUS) * 37, top: 47 + (p.z / ATLAS_DIAL_RADIUS) * 37 };
  });
  box.innerHTML = `
    <svg class="atlas-fallback-svg" viewBox="0 0 800 440" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <ellipse class="fb-disc" cx="400" cy="207" rx="372" ry="190" />
      <ellipse class="fb-ring" cx="400" cy="207" rx="238" ry="122" />
      <ellipse class="fb-ring" cx="400" cy="207" rx="134" ry="68" />
      <g class="fb-links">${spots.map(s => `<line x1="400" y1="207" x2="${(s.left * 8).toFixed(1)}" y2="${(s.top * 4.4).toFixed(1)}" />`).join('')}</g>
      <circle class="fb-corpus" cx="400" cy="207" r="9" />
    </svg>
    <ul class="atlas-fallback-nodes">
      ${spots.map(s => {
        const size = max && typeof s.count === 'number' ? Math.round(14 + 14 * Math.sqrt(s.count / max)) : 18;
        const selected = s.id === selectedId;
        const detail = typeof s.count === 'number' ? `${s.count} resumes · ${s.pct}%` : 'Count loading';
        return `<li style="--spot-x:${s.left.toFixed(1)}%;--spot-y:${s.top.toFixed(1)}%">
          <button type="button" class="fb-node${selected ? ' is-selected' : ''}" data-archetype-id="${s.id}" aria-pressed="${selected}">
            <span class="legend-swatch" data-arch="${s.id}" style="--swatch-size:${size}px" aria-hidden="true"></span>
            <span class="fb-node-text"><span class="fb-node-name">${escapeHTML(s.label)}</span><span class="fb-node-count">${escapeHTML(detail)}</span></span>
          </button>
        </li>`;
      }).join('')}
    </ul>
    <div class="atlas-fallback-foot">
      <p class="atlas-fallback-note">${escapeHTML(note)}</p>
      ${offerThreeD ? '<button type="button" class="btn-text-action atlas-load-3d">Load the 3D view</button>' : ''}
    </div>`;
  box.hidden = false;
  if (canvas) canvas.hidden = true;
  const wrapper = document.getElementById('spatial-canvas-wrapper');
  if (wrapper) wrapper.classList.add('is-fallback');
  const stage = document.getElementById('hero-3d-stage');
  if (stage) stage.classList.add('is-fallback');
  if (!box.dataset.bound) {
    box.dataset.bound = 'true';
    box.addEventListener('click', (e) => {
      const node = e.target.closest('.fb-node');
      if (node) {
        selectArchetype(parseInt(node.getAttribute('data-archetype-id'), 10));
        return;
      }
      if (e.target.closest('.atlas-load-3d')) init3DScene({ force: true });
    });
  }
}

function hideAtlasFallback() {
  const box = document.getElementById('atlas-fallback');
  const canvas = document.getElementById('spatial-hero-canvas');
  if (box) box.hidden = true;
  if (canvas) canvas.hidden = false;
  const wrapper = document.getElementById('spatial-canvas-wrapper');
  if (wrapper) wrapper.classList.remove('is-fallback');
  const stage = document.getElementById('hero-3d-stage');
  if (stage) stage.classList.remove('is-fallback');
}

function syncAtlasFallbackSelection() {
  document.querySelectorAll('#atlas-fallback .fb-node').forEach(node => {
    const selected = parseInt(node.getAttribute('data-archetype-id'), 10) === appState.genome.selectedArchetypeId;
    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-pressed', String(selected));
  });
}

function announceAtlasStatus(message) {
  const status = document.getElementById('atlas-status');
  if (status) status.textContent = message;
}

// A device that says it is short of memory or data starts in 2D, with the choice to load 3D.
function atlasShouldStartIn2D() {
  const connection = navigator.connection;
  return Boolean((connection && connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2));
}

function syncAtlasZoomButtons() {
  const zoomIn = document.getElementById('btn-3d-zoom-in');
  const zoomOut = document.getElementById('btn-3d-zoom-out');
  if (!zoomIn || !zoomOut) return;
  const zoom = careerAtlas ? careerAtlas.targetZoom : 1;
  const focused = document.activeElement;
  zoomIn.disabled = zoom <= ATLAS_ZOOM_MIN + 0.0001;
  zoomOut.disabled = zoom >= ATLAS_ZOOM_MAX - 0.0001;
  // A button that just reached its limit must not take keyboard focus away with it.
  if (focused === zoomIn && zoomIn.disabled) zoomOut.focus();
  if (focused === zoomOut && zoomOut.disabled) zoomIn.focus();
}

// ---- lifecycle hooks used by the rest of the app -------------------------------------
function init3DScene({ force = false } = {}) {
  const canvas = document.getElementById('spatial-hero-canvas');
  const wrapper = document.getElementById('spatial-canvas-wrapper');
  if (!canvas || !wrapper) return;
  initAtlasControls();
  if (careerAtlas) return;

  const unavailable = 'The 3D view is not available in this browser. The career map works the same in 2D.';
  if (typeof THREE === 'undefined' || !webglAvailable()) {
    showAtlasFallback(unavailable);
    return;
  }
  if (!force && atlasShouldStartIn2D()) {
    showAtlasFallback('Showing the 2D map to save memory and data on this device.', { offerThreeD: true });
    return;
  }
  const atlas = new CareerAtlas(canvas, wrapper);
  if (!atlas.init()) {
    atlas.dispose();
    showAtlasFallback(unavailable);
    return;
  }
  careerAtlas = atlas;
  hideAtlasFallback();
  syncAtlasZoomButtons();
  if (new URLSearchParams(window.location.search).has('debug3d')) window.careerAtlas = atlas; // developer inspection only
  loadCorpusSummary().then(() => {
    if (careerAtlas) careerAtlas.refreshCounts();
    const box = document.getElementById('atlas-fallback');
    if (box && !box.hidden) {
      const note = box.querySelector('.atlas-fallback-note');
      showAtlasFallback(note ? note.textContent : unavailable, { offerThreeD: Boolean(box.querySelector('.atlas-load-3d')) });
    }
  });
}

function cleanup3DScene() {
  if (careerAtlas) careerAtlas.dispose();
  careerAtlas = null;
}

// Theme or 3D-detail change: recolour in place; rebuild dots for the detail level.
function update3DSceneAesthetic() {
  if (!careerAtlas) return;
  careerAtlas.applyPalette();
  careerAtlas.resize();
  careerAtlas.buildDots();
}

function reset3DCamera() {
  if (careerAtlas) careerAtlas.resetCamera();
}

let atlasControlsBound = false;

function initAtlasControls() {
  if (atlasControlsBound) return;
  atlasControlsBound = true;

  const modeButtons = document.querySelectorAll('.btn-3d-mode[data-mode]');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      modeButtons.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const hint = document.getElementById('spatial-drag-hint');
      if (hint) hint.hidden = mode !== 'orbit';
      if (careerAtlas) careerAtlas.setMode(mode);
      renderAtlasEvidenceCard(mode === 'evidence');
    });
  });

  const zoomIn = document.getElementById('btn-3d-zoom-in');
  const zoomOut = document.getElementById('btn-3d-zoom-out');
  const reset = document.getElementById('btn-3d-reset-cam-stage');
  if (zoomIn) zoomIn.addEventListener('click', () => careerAtlas && careerAtlas.zoomBy(0.86));
  if (zoomOut) zoomOut.addEventListener('click', () => careerAtlas && careerAtlas.zoomBy(1 / 0.86));
  if (reset) reset.addEventListener('click', reset3DCamera);

  // Legend items preview their node on hover and keyboard focus.
  document.querySelectorAll('.atlas-legend-item').forEach(item => {
    const id = parseInt(item.getAttribute('data-archetype-id'), 10);
    const on = () => careerAtlas && careerAtlas.preview(id);
    const off = () => careerAtlas && careerAtlas.preview(null);
    item.addEventListener('mouseenter', on);
    item.addEventListener('focus', on);
    item.addEventListener('mouseleave', off);
    item.addEventListener('blur', off);
  });
}

// Evidence map: the selected archetype's curated skills beside the scene.
function renderAtlasEvidenceCard(visible) {
  const card = document.getElementById('atlas-evidence-card');
  if (!card) return;
  const isVisible = typeof visible === 'boolean'
    ? visible
    : !!document.querySelector('.btn-3d-mode[data-mode="evidence"].active');
  card.hidden = !isVisible;
  if (!isVisible) return;
  const arch = archetypesDatabase.find(a => a.id === appState.genome.selectedArchetypeId);
  if (!arch) return;
  const c = getArchetypeCorpusCount(arch);
  card.innerHTML = `
    <p class="evidence-card-kicker"><span class="archetype-node" data-arch="${arch.id}" aria-hidden="true"></span> Cluster ${arch.id}</p>
    <h4 class="evidence-card-title">${escapeHTML(getArchetypeLabel(arch))}</h4>
    <p class="evidence-card-count">${c ? `${c.count} resumes · ${c.pct}% of the corpus` : 'Corpus count loading'}</p>
    <p class="evidence-card-label">Representative skills <span>curated</span></p>
    <ul class="skill-chips">${arch.keySkills.slice(0, 6).map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>
    <a class="btn-text-action" href="#genome">Open in Career Genome →</a>`;
}

function init3DCardTilt() {
  if (appState.motionMode === 'reduced') return;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover) return;

  // Forms, reports and long text stay still; tilt is for small showcase cards only.
  const cardSelector = '.archetype-card, .company-card, .btn-lab-item, .card-3d-tilt, .spatial-tilt-card';
  const tiltCards = document.querySelectorAll(cardSelector);

  tiltCards.forEach(card => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = 'true';

    let glare = card.querySelector('.specular-glare');
    if (!glare) {
      glare = document.createElement('div');
      glare.className = 'specular-glare';
      card.appendChild(glare);
    }

    card.addEventListener('mousemove', (e) => {
      if (appState.motionMode === 'reduced') return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (((y - centerY) / centerY) * -3.5).toFixed(2);
      const rotateY = (((x - centerX) / centerX) * 3.5).toFixed(2);

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;

      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;
      glare.style.opacity = '1';
      glare.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 65%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      glare.style.opacity = '0';
    });
  });
}

// Icon buttons give the optional interface click when sound is on.
// Nothing moves under the pointer: a target that shifts is harder to hit.
function initHoverButtons() {
  document.querySelectorAll('.btn-magnetic-glow, .btn-icon-circle').forEach(btn => {
    if (btn.dataset.clickSoundBound) return;
    btn.dataset.clickSoundBound = 'true';
    btn.addEventListener('click', () => {
      if (window.spatialAudio) window.spatialAudio.click();
    });
  });
}

// ==============================================================================
// 7.5 INTERACTIVE 3D NEUMORPHIC LIGHTING PUCK CONTROLLER
// ==============================================================================
function initNeumorphicLightingPuck() {
  const well = document.getElementById('neu-light-well');
  const puck = document.getElementById('neu-light-puck');
  const angleLabel = document.getElementById('neu-light-angle-label');
  if (!well || !puck) return;

  const COMPASS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  const SHORT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  let degrees = 225;
  let reach = 0.8;

  // Draws the puck and moves the sample card's shadow. Nothing outside that card changes.
  function apply() {
    const radians = (degrees * Math.PI) / 180;
    const maxReach = well.clientWidth / 2 - 18;
    puck.style.transform = `translate(${(Math.cos(radians) * maxReach * reach).toFixed(1)}px, ${(Math.sin(radians) * maxReach * reach).toFixed(1)}px)`;
    sampleShadow.degrees = degrees;
    renderSampleShadow();
    const index = Math.round(degrees / 45) % 8;
    if (angleLabel) angleLabel.textContent = `${degrees}° (${SHORT[index]})`;
    puck.setAttribute('aria-valuenow', String(degrees));
    puck.setAttribute('aria-valuetext', `${degrees} degrees, ${COMPASS[index]}`);
  }

  function fromPointer(clientX, clientY) {
    const rect = well.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const maxReach = rect.width / 2 - 18;
    reach = Math.min(1, Math.hypot(dx, dy) / maxReach);
    degrees = (Math.round((Math.atan2(dy, dx) * 180) / Math.PI) + 360) % 360;
    apply();
  }

  // Pointer capture ties the drag to this control, so nothing listens on the window between drags
  // and touch scrolling elsewhere on the page is never held up.
  well.addEventListener('pointerdown', (e) => {
    well.setPointerCapture(e.pointerId);
    fromPointer(e.clientX, e.clientY);
    puck.focus({ preventScroll: true });
  });
  well.addEventListener('pointermove', (e) => {
    if (well.hasPointerCapture(e.pointerId)) fromPointer(e.clientX, e.clientY);
  });
  well.addEventListener('pointerup', () => {
    if (window.spatialAudio) window.spatialAudio.click();
  });

  puck.addEventListener('keydown', (e) => {
    const steps = { ArrowRight: 15, ArrowUp: 15, ArrowLeft: -15, ArrowDown: -15 };
    if (e.key in steps) {
      degrees = (degrees + steps[e.key] + 360) % 360;
    } else if (e.key === 'Home') {
      degrees = 0;
    } else if (e.key === 'End') {
      degrees = 359;
    } else {
      return;
    }
    e.preventDefault();
    apply();
  });
  apply();
}


// ==============================================================================
// 8. BACKEND HEALTH CHECK & API STATUS SYNC
// ==============================================================================
async function checkBackendHealth() {
  const badge = document.getElementById('engine-status-badge');
  const label = document.getElementById('status-label-text');
  if (!badge || !label) return;

  if (appState.analyzer.demoMode) {
    badge.className = 'engine-status-badge status-demo';
    label.textContent = 'Demo mode';
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(apiUrl('/health'), {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      appState.apiStatus = 'connected';
      badge.className = 'engine-status-badge status-connected';
      label.textContent = 'API connected';
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    appState.apiStatus = 'offline';
    badge.className = 'engine-status-badge status-offline';
    label.textContent = 'API offline · demo available';
  }
}

// ==============================================================================
// 9. RESUME ANALYZER WORKSPACE CONTROLLER
// ==============================================================================
const RESUME_MAX_BYTES = 10 * 1024 * 1024; // services/pdf_ingestion.py MAX_FILE_BYTES
// /analyze takes the job description in its query string. Measured on uvicorn, 32,000
// characters pass and 60,000 get a plain-text 400, so the form stops well short of that.
const JD_MAX_CHARS = 20000;
const JD_MAX_QUERY_LENGTH = 30000;

function initResumeAnalyzer() {
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');
  const selectedPill = document.getElementById('selected-file-pill');
  const fileNameDisplay = document.getElementById('selected-filename');
  const clearFileBtn = document.getElementById('clear-file-btn');
  const jdTextarea = document.getElementById('jd-textarea');
  const charCounter = document.getElementById('jd-char-count');
  const clearJdBtn = document.getElementById('btn-clear-jd');
  const analyzeBtn = document.getElementById('btn-analyze-submit');
  const cancelBtn = document.getElementById('btn-cancel-request');
  const demoToggle = document.getElementById('demo-mode-toggle');

  if (!dropzone || !fileInput) return;

  // Drag and drop events
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) {
      validateAndSetFile(e.target.files[0]);
    }
  });

  // Clear file. The input is removed from the pill's way, so focus returns to it.
  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetFileSelection();
      fileInput.focus();
    });
  }

  // Counter, length check and state all follow the textarea's input event.
  if (jdTextarea && charCounter) {
    jdTextarea.addEventListener('input', syncJobDescription);
  }

  // Clear JD action
  if (clearJdBtn && jdTextarea) {
    clearJdBtn.addEventListener('click', () => {
      jdTextarea.value = '';
      syncJobDescription();
      jdTextarea.focus();
      showToast('Job description cleared.');
    });
  }

  // Role Presets
  document.querySelectorAll('.btn-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const presetKey = chip.getAttribute('data-preset');
      const company = companyDatabase.find(c => c.id === presetKey);
      if (company && jdTextarea) {
        if (jdTextarea.value.trim().length > 0) {
          if (!confirm('Replace your currently entered Job Description with the preset?')) {
            return;
          }
        }
        jdTextarea.value = company.sampleJd;
        jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        showToast(`Loaded the sample job description for ${company.name}.`);
      }
    });
  });

  // Demo Mode Switch
  if (demoToggle) {
    demoToggle.addEventListener('change', (e) => {
      appState.analyzer.demoMode = e.target.checked;
      checkBackendHealth();
      showToast(appState.analyzer.demoMode ? 'Demo mode on. Analyze plays the bundled sample report.' : 'Demo mode off. Analyze uses your resume.');
    });
  }

  // Submit Analysis
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      executeAnalysis();
    });
  }

  // Cancel in-flight request
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelAnalysis);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resumeFileProblem(file) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return 'This file is not a PDF. Choose a .pdf file.';
  }
  if (file.size === 0) return 'This PDF is empty (0 bytes). Choose another file.';
  if (file.size > RESUME_MAX_BYTES) {
    return `This PDF is ${formatFileSize(file.size)}, over the 10 MB limit. Choose a smaller file.`;
  }
  return '';
}

function validateAndSetFile(file) {
  const fileInput = document.getElementById('resume-file-input');
  const selectedPill = document.getElementById('selected-file-pill');
  const fileNameDisplay = document.getElementById('selected-filename');

  hideFieldError('file-error-msg');
  // Choosing the same file again must fire change, whatever happens to this one.
  if (fileInput) fileInput.value = '';

  const problem = resumeFileProblem(file);
  if (problem) {
    const kept = appState.analyzer.selectedFile;
    showFieldError('file-error-msg', kept ? `${problem} ${kept.name} is still attached.` : problem);
    return;
  }

  appState.analyzer.selectedFile = file;
  fileNameDisplay.textContent = `${file.name} (${formatFileSize(file.size)})`;
  selectedPill.style.display = 'inline-flex';
  showToast(`Resume attached: ${file.name}`);
}

function resetFileSelection() {
  appState.analyzer.selectedFile = null;
  const fileInput = document.getElementById('resume-file-input');
  const selectedPill = document.getElementById('selected-file-pill');
  if (fileInput) fileInput.value = '';
  if (selectedPill) selectedPill.style.display = 'none';
  hideFieldError('file-error-msg');
}

function jobDescriptionProblem(jd) {
  if (!jd) return 'Enter a job description or choose a sample.';
  if (jd.length > JD_MAX_CHARS) {
    return `This job description is over the ${JD_MAX_CHARS.toLocaleString()} character limit. Shorten it to continue.`;
  }
  if (new URLSearchParams({ job_description: jd }).toString().length > JD_MAX_QUERY_LENGTH) {
    return 'This job description has too many symbols or non-English characters to send in one request. Shorten it to continue.';
  }
  return '';
}

function syncJobDescription() {
  const jdTextarea = document.getElementById('jd-textarea');
  const counter = document.getElementById('jd-char-count');
  if (!jdTextarea) return;
  const value = jdTextarea.value;
  appState.analyzer.jobDescription = value;
  // An empty field is only an error once someone tries to run.
  const problem = value.trim() ? jobDescriptionProblem(value.trim()) : '';
  if (counter) {
    counter.textContent = `${value.length.toLocaleString()} of ${JD_MAX_CHARS.toLocaleString()} characters`;
    counter.classList.toggle('is-over-limit', Boolean(problem));
  }
  if (problem) showFieldError('jd-error-msg', problem);
  else hideFieldError('jd-error-msg');
}

const FIELD_ERROR_INPUTS = { 'file-error-msg': 'resume-file-input', 'jd-error-msg': 'jd-textarea' };

function showFieldError(id, msg) {
  const elem = document.getElementById(id);
  if (elem) {
    // Unchanged text is left alone so a live region does not repeat itself on every keystroke.
    if (elem.textContent !== msg) elem.textContent = msg;
    elem.classList.add('visible');
  }
  const input = document.getElementById(FIELD_ERROR_INPUTS[id]);
  if (input) input.setAttribute('aria-invalid', 'true');
}

function hideFieldError(id) {
  const elem = document.getElementById(id);
  if (elem) {
    elem.classList.remove('visible');
    elem.textContent = '';
  }
  const input = document.getElementById(FIELD_ERROR_INPUTS[id]);
  if (input) input.removeAttribute('aria-invalid');
}

// --- Analysis runs -----------------------------------------------------------
// A run owns its AbortController and timers, and only the current run may change anything.
// The report on screen (state and DOM) stays untouched until a new one has been validated,
// so a failed or cancelled run cannot erase it.

const ANALYSIS_STAGES = {
  sending: {
    title: 'Sending your resume',
    detail: 'Uploading the PDF and job description to the server.'
  },
  analyzing: {
    title: 'Analyzing on the server',
    detail: 'The server sends the whole report when it finishes, so there is no percentage to show. This can take up to a minute.'
  },
  demo: {
    title: 'Playing the illustrative demo',
    detail: 'A bundled sample report. Nothing is uploaded or analyzed.'
  }
};

// Server wording that is written for people. Anything else may carry exception text or paths,
// so it never reaches the page.
const ANALYSIS_SAFE_MESSAGES = [
  { pattern: /could not extract text/i, field: 'file', message: 'No text could be read from this PDF. It may be scanned or image-based. Try a PDF with selectable text.' },
  { pattern: /is empty \(0 bytes\)/i, field: 'file', message: 'This PDF is empty (0 bytes). Choose another file.' },
  { pattern: /exceeds the \d+\s*MB/i, field: 'file', message: 'This PDF is over the 10 MB limit. Choose a smaller file.' },
  { pattern: /not a valid PDF/i, field: 'file', message: 'This file is not a valid PDF, even though its name may end in .pdf. Choose another file.' },
  { pattern: /encrypted/i, field: 'file', message: 'This PDF is password protected. Remove the password and upload it again.' },
  { pattern: /page count .*exceeds/i, field: 'file', message: 'This PDF is over the 15 page limit. Upload a shorter version.' },
  { pattern: /failed to parse pdf/i, field: 'file', message: 'This PDF could not be read and may be damaged. Export it again and retry.' },
  { pattern: /job description is missing/i, field: 'jd', message: 'Enter a job description or choose a sample.' }
];
// /analyze answers HTTP 200 and then streams these instead of a report.
const ANALYSIS_STREAM_FAILURE = /^(Analysis Error:|Server streaming error:|Analysis finished, but no response)/;

function analysisFailure(message, field = '') {
  return Object.assign(new Error(message), { userFacing: true, field });
}

function safeAnalysisFailure(serverText, fallback) {
  const known = ANALYSIS_SAFE_MESSAGES.find(entry => entry.pattern.test(serverText || ''));
  return known ? analysisFailure(known.message, known.field) : analysisFailure(fallback);
}

async function analysisHttpFailure(response) {
  let detail = '';
  try {
    const body = await response.clone().json();
    detail = typeof body.detail === 'string' ? body.detail : '';
  } catch (notJson) {
    detail = await response.text().catch(() => '');
  }
  // Oversized request lines are refused before FastAPI runs, as a plain-text 400 or a 414/431.
  if (response.status === 414 || response.status === 431 || /invalid http request/i.test(detail)) {
    return analysisFailure('The server would not accept a job description this long. Shorten it and try again.', 'jd');
  }
  if (response.status === 413) {
    return analysisFailure('The server would not accept a file this large. Choose a smaller PDF.', 'file');
  }
  if (response.status >= 500) {
    return safeAnalysisFailure(detail, 'The server could not finish the analysis. Try again in a moment.');
  }
  return safeAnalysisFailure(detail, `The server refused this request (status ${response.status}). Check the file and job description, then try again.`);
}

function isCurrentRun(run) {
  return appState.analyzer.activeRun === run && !run.controller.signal.aborted;
}

function hasCommittedReport() {
  return Boolean(appState.analyzer.streamBuffer);
}

function setAnalysisStage(stageKey) {
  const stage = ANALYSIS_STAGES[stageKey];
  const title = document.getElementById('analysis-progress-title');
  const detail = document.getElementById('analysis-progress-detail');
  if (title) title.textContent = stage.title;
  if (detail) detail.textContent = stage.detail;

  const list = document.getElementById('analysis-stage-list');
  if (!list) return;
  list.hidden = stageKey === 'demo';
  const items = [...list.querySelectorAll('li')];
  const activeIndex = items.findIndex(item => item.dataset.stage === stageKey);
  items.forEach((item, index) => {
    item.dataset.state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
    if (index === activeIndex) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

function showStreamPreview(text) {
  const preview = document.getElementById('analysis-stream-preview');
  if (!preview || ANALYSIS_STREAM_FAILURE.test(text.trimStart())) return;
  const visible = text.split('<!-- STRUCTURED_REPORT_START')[0];
  preview.hidden = !visible.trim();
  preview.textContent = visible;
  preview.scrollTop = preview.scrollHeight;
}

function showAnalysisAlert(message) {
  const alertCard = document.getElementById('analyzer-alert-card');
  if (!alertCard) return;
  alertCard.textContent = message;
  alertCard.style.display = 'block';
}

function hideAnalysisAlert() {
  const alertCard = document.getElementById('analyzer-alert-card');
  if (!alertCard) return;
  alertCard.textContent = '';
  alertCard.style.display = 'none';
}

const RESULTS_EMPTY_COPY = {
  'pane-diagnostic-report': {
    title: 'Your report will appear here',
    desc: 'Add a resume PDF and a job description, then run the analysis. The report covers the score components, matched and missing evidence, reference resumes from the corpus and suggested rewrites.'
  },
  'pane-executive-review': {
    title: 'The executive review comes with a report',
    desc: 'Run an analysis and this tab shows how the review lens you chose reads your resume. The lens changes the critique, never the score.'
  },
  'pane-interactive-tailoring': {
    title: 'Tailoring comes with a report',
    desc: 'Run an analysis and this tab shows your resume text with each suggested change marked, ready to apply, undo or export.'
  }
};

// The one place that decides what the results panel shows.
function renderResultsView() {
  const running = Boolean(appState.analyzer.activeRun);
  const hasReport = hasCommittedReport();
  const activeTab = document.querySelector('.results-tab-btn[aria-selected="true"]');
  const activePane = activeTab ? activeTab.getAttribute('aria-controls') : 'pane-diagnostic-report';
  // The coach works without a report; the other views have nothing to show until there is one.
  const showBody = hasReport || activePane === 'pane-career-coach';

  const placeholder = document.getElementById('results-placeholder');
  const resultsArea = document.getElementById('streaming-results-area');
  const progress = document.getElementById('analysis-progress-panel');
  const body = document.getElementById('analysis-report-body');
  const banner = document.getElementById('score-banner-box');
  const card = document.querySelector('.analyzer-results-card');

  if (placeholder) placeholder.style.display = !running && !showBody ? 'flex' : 'none';
  if (resultsArea) resultsArea.style.display = running || showBody ? 'flex' : 'none';
  if (progress) progress.hidden = !running;
  if (body) body.hidden = running;
  if (banner) banner.hidden = !hasReport;
  if (card) {
    if (running) card.setAttribute('aria-busy', 'true');
    else card.removeAttribute('aria-busy');
  }

  const copy = RESULTS_EMPTY_COPY[activePane];
  const emptyTitle = document.getElementById('results-empty-title');
  const emptyDesc = document.getElementById('results-empty-desc');
  if (copy && emptyTitle) emptyTitle.textContent = copy.title;
  if (copy && emptyDesc) emptyDesc.textContent = copy.desc;
}

function startAnalysisRun(stageKey) {
  const analyzer = appState.analyzer;
  if (analyzer.activeRun) {
    analyzer.activeRun.controller.abort();
    stopRunTimers(analyzer.activeRun);
  }
  const controller = new AbortController();
  const run = { controller, clock: null, demoTimer: null };
  analyzer.activeRun = run;
  analyzer.abortController = controller;
  analyzer.status = 'submitting';

  hideAnalysisAlert();
  setAnalysisStage(stageKey);
  showStreamPreview('');

  const elapsed = document.getElementById('analysis-progress-elapsed');
  if (elapsed) elapsed.textContent = '';
  if (stageKey !== 'demo') {
    const startedAt = performance.now();
    run.clock = setInterval(() => {
      if (elapsed) elapsed.textContent = `${Math.round((performance.now() - startedAt) / 1000)} s`;
    }, 1000);
  }

  const analyzeBtn = document.getElementById('btn-analyze-submit');
  const cancelBtn = document.getElementById('btn-cancel-request');
  const btnText = document.getElementById('btn-analyze-text');
  const hadFocus = document.activeElement === analyzeBtn;
  if (analyzeBtn) analyzeBtn.disabled = true;
  if (btnText) btnText.textContent = 'Analyzing…';
  if (cancelBtn) {
    cancelBtn.style.display = 'block';
    if (hadFocus) cancelBtn.focus({ preventScroll: true });
  }
  renderResultsView();

  // On narrow screens the panel can sit below the fold, where nothing would seem to happen.
  const card = document.querySelector('.analyzer-results-card');
  if (card && card.getBoundingClientRect().top >= window.innerHeight) {
    card.scrollIntoView({ block: 'nearest', behavior: appState.motionMode === 'reduced' ? 'auto' : 'smooth' });
  }
  return run;
}

function stopRunTimers(run) {
  clearInterval(run.clock);
  clearInterval(run.demoTimer);
  run.clock = null;
  run.demoTimer = null;
}

function endAnalysisRun(run, status, buttonLabel = 'Analyze resume') {
  stopRunTimers(run);
  const analyzer = appState.analyzer;
  analyzer.activeRun = null;
  analyzer.abortController = null;
  analyzer.status = status;

  const cancelBtn = document.getElementById('btn-cancel-request');
  const analyzeBtn = document.getElementById('btn-analyze-submit');
  const btnText = document.getElementById('btn-analyze-text');
  const focusWasOnCancel = document.activeElement === cancelBtn || document.activeElement === document.body;
  if (analyzeBtn) analyzeBtn.disabled = false;
  if (btnText) btnText.textContent = buttonLabel;
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (focusWasOnCancel && analyzeBtn) analyzeBtn.focus({ preventScroll: true });
  renderResultsView();
}

function cancelAnalysis() {
  const run = appState.analyzer.activeRun;
  if (!run) return;
  run.controller.abort();
  endAnalysisRun(run, 'cancelled');
  showToast(hasCommittedReport() ? 'Analysis cancelled. Your earlier report is unchanged.' : 'Analysis cancelled.');
}

function failAnalysisRun(run, failure) {
  console.warn('Analysis did not finish:', failure.message);
  endAnalysisRun(run, 'error', 'Try again');
  const message = failure.message + (hasCommittedReport() ? ' Your earlier report is unchanged.' : '');
  const fieldErrors = { file: ['file-error-msg', 'resume-file-input'], jd: ['jd-error-msg', 'jd-textarea'] };
  const fieldError = fieldErrors[failure.field];
  if (fieldError) {
    showFieldError(fieldError[0], message);
    const input = document.getElementById(fieldError[1]);
    if (input) input.focus();
  } else {
    showAnalysisAlert(message);
  }
}

// A new report shows on its own tab, without moving focus away from where the person is.
function completeAnalysisRun(run, toastMessage) {
  endAnalysisRun(run, 'complete');
  switchResultsTab('pane-diagnostic-report');
  showToast(toastMessage);
}

async function executeAnalysis({ demo = false } = {}) {
  const analyzer = appState.analyzer;
  const jdTextarea = document.getElementById('jd-textarea');
  const useDemo = demo || analyzer.demoMode;

  // 1. Validation: each problem appears beside its field, and focus goes to the first one.
  const jd = (jdTextarea ? jdTextarea.value : '').trim();
  const file = analyzer.selectedFile;
  const fileProblem = !file && !useDemo ? 'Add your resume PDF to begin.' : '';
  const jdProblem = jobDescriptionProblem(jd);

  hideFieldError('file-error-msg');
  hideFieldError('jd-error-msg');
  if (fileProblem) showFieldError('file-error-msg', fileProblem);
  if (jdProblem) showFieldError('jd-error-msg', jdProblem);
  if (fileProblem || jdProblem) {
    const firstInvalid = document.getElementById(fileProblem ? 'resume-file-input' : 'jd-textarea');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  // 2. Demo route: local only, nothing is sent.
  if (useDemo) {
    runDemoAnalysis(startAnalysisRun('demo'));
    return;
  }

  // 3. Live route.
  const run = startAnalysisRun('sending');
  let responded = false;
  try {
    const formData = new FormData();
    formData.append('resume_file', file);

    const url = new URL(apiUrl('/analyze'), window.location.href);
    url.searchParams.append('job_description', jd);

    const personaInput = document.querySelector('input[name="executive_persona"]:checked');
    const selectedPersona = personaInput ? personaInput.value : (appState.executiveReview.selectedPersonaId || 'auto');
    url.searchParams.append('selected_persona_id', selectedPersona);

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
      signal: run.controller.signal
    });
    if (!isCurrentRun(run)) return;
    responded = true;

    if (!response.ok) throw await analysisHttpFailure(response);

    analyzer.status = 'streaming';
    setAnalysisStage('analyzing');
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (!isCurrentRun(run)) {
        reader.cancel().catch(() => {});
        return;
      }
      if (done) break;
      buffer += value;
      showStreamPreview(buffer);
    }

    const streamed = buffer.trimStart();
    if (ANALYSIS_STREAM_FAILURE.test(streamed)) {
      throw safeAnalysisFailure(streamed, 'The analysis stopped because of a problem on the server. Try again in a moment.');
    }
    const report = readStructuredReport(buffer);
    if (!report) {
      throw analysisFailure('The server finished without sending a usable report. Try again in a moment.');
    }

    analyzer.streamBuffer = buffer;
    analyzer.reportJobDescription = jd;
    hydrateStructuredReport(report);
    renderSafeMarkdown(buffer, false);
    updateScoreRing();
    completeAnalysisRun(run, `Report ready. Alignment score ${analyzer.extractedScore} of 100.`);
  } catch (err) {
    // Cancelled or replaced: whoever did that has already updated the view.
    if (!isCurrentRun(run)) return;
    if (err.userFacing) {
      failAnalysisRun(run, err);
    } else if (responded) {
      failAnalysisRun(run, analysisFailure('The connection closed before the report finished. Try again.'));
    } else {
      failAnalysisRun(run, analysisFailure('The analysis server could not be reached. Check that it is running, then try again. The illustrative demo works without it.'));
    }
  }
}

// Plays the bundled report once. Demo mode itself stays as it was, so the next Analyze
// click cannot quietly play the sample over a real resume.
function enableDemoAndRun() {
  // One click must be enough: an empty JD gets the first sample role, through
  // the textarea's own input handling so the counter and validation stay in sync.
  const jdTextarea = document.getElementById('jd-textarea');
  if (jdTextarea && !jdTextarea.value.trim()) {
    const sample = companyDatabase.find(c => c.sampleJd);
    if (sample) {
      jdTextarea.value = sample.sampleJd;
      jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  executeAnalysis({ demo: true });
}

function runDemoAnalysis(run) {
  const demoText = `
**1. Overall Score (out of 100):** 86/100

**2. What's Good:**
* **Measured results:** The search project states a baseline and a result, reducing p95 latency from 240ms to 125ms across 100k documents, with the tools named.
* **Test evidence:** The unit test suite gives a count and a coverage figure, which is easier to check than a claim of quality.

**3. Actionable Recommendations:**
* **Replace the vague bullets:** "Worked on data loading" and "team player responsible for deployment" do not say what you did. Name the task, the tool and the result.
* **Remove the buzzword bullet:** The line about blockchain and quantum algorithms has no dataset, baseline or result behind it.
* **Name the cloud service:** "AWS cloud infrastructure" could mean many things. Say which service you used and what you configured.

**4. Key Skills to Add, If You Have Used Them:**
* **Kubernetes:** the sample job description asks for container orchestration.
* **Kafka:** preferred by the sample job description.
`;

  const finish = () => {
    if (!isCurrentRun(run)) return;
    appState.analyzer.streamBuffer = demoText;
    appState.analyzer.reportJobDescription = (document.getElementById('jd-textarea') || {}).value || '';
    hydrateDemoStructuredReport();
    renderSafeMarkdown(demoText, true);
    updateScoreRing();
    completeAnalysisRun(run, 'Illustrative demo report ready. Its score of 86 is a sample.');
  };

  // Calm mode gets the result straight away instead of watching it type.
  if (appState.motionMode === 'reduced') {
    setTimeout(finish, 0);
    return;
  }

  let idx = 0;
  run.demoTimer = setInterval(() => {
    if (!isCurrentRun(run)) return;
    if (idx < demoText.length) {
      idx += 5;
      showStreamPreview(demoText.slice(0, idx));
    } else {
      finish();
    }
  }, 20);
}

function renderSafeMarkdown(rawText, isDemo) {
  const markdownArea = document.getElementById('markdown-stream-output');
  const provenanceTag = document.getElementById('provenance-tag');
  appState.analyzer.reportIsDemo = !!isDemo;

  if (provenanceTag) {
    if (isDemo) {
      provenanceTag.className = 'provenance-tag provenance-demo';
      provenanceTag.textContent = 'Illustrative demo. Not generated from a resume.';
    } else {
      provenanceTag.className = 'provenance-tag provenance-live';
      const writer = activeEngine
        ? (activeEngine.isLocal ? 'feedback from the local engine, no language model' : `feedback written by ${activeEngine.name}`)
        : '';
      provenanceTag.textContent = `Live analysis, compared with the alumni reference corpus${writer ? `; ${writer}` : ''}`;
    }
  }

  if (!markdownArea) return;

  // Strip internal structured report JSON comment so it does not appear in human-readable markdown
  const cleanMarkdown = (rawText || '').replace(/<!-- STRUCTURED_REPORT_START -->[\s\S]*?<!-- STRUCTURED_REPORT_END -->/g, '').trim();

  markdownArea.innerHTML = markdownToSafeHtml(cleanMarkdown);
  updateCoachContextNote();
}

// If marked or DOMPurify is missing, the text is shown escaped: a weaker filter is never used.
function markdownToSafeHtml(text) {
  if (typeof marked !== 'undefined') {
    try {
      return sanitizeHtmlSafe(marked.parse(text));
    } catch (err) {
      console.warn('Markdown could not be parsed; showing plain text.');
    }
  }
  return escapeHtml(text);
}

// Client-side DOM Sanitizer against scripts, iframes, inline event handlers, and data/javascript URIs
// Markdown output only needs these. Forms, inputs and buttons (phishing),
// images (tracking pixels) and SVG/MathML (mutation-XSS surface) are excluded.
const SAFE_MARKDOWN_CONFIG = {
  ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
                 'code', 'pre', 'blockquote', 'a', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th',
                 'td', 'del', 'span', 'div', 'sup', 'sub'],
  ALLOWED_ATTR: ['href', 'title', 'align', 'class']
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sanitize model/report HTML before it reaches innerHTML. DOMPurify is an
// allowlist sanitizer: it normalizes URLs before checking them, which defeats
// tab/newline-split "java\tscript:" links that the old blocklist let through.
// If DOMPurify failed to load (CDN blocked, SRI mismatch) the content is shown
// as plain text: a weaker filter is never used instead.
function sanitizeHtmlSafe(dirtyHtml) {
  if (!dirtyHtml) return '';
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
    return window.DOMPurify.sanitize(dirtyHtml, SAFE_MARKDOWN_CONFIG);
  }
  return escapeHtml(dirtyHtml);
}

// The ring shows only the structured report's overall_score (models.PlacementBenchmarkingReport).
// Numbers in the narrative text are never parsed: a provider can write any "N/100" in prose.
function updateScoreRing() {
  const score = appState.reportData ? appState.reportData.overall_score : null;
  if (typeof score === 'number' && score >= 0 && score <= 100) {
    updateScoreRingFromNumber(score);
  } else {
    clearScoreRing(); // never display an invented score
  }
}

function clearScoreRing() {
  appState.analyzer.extractedScore = null;
  const scoreElem = document.getElementById('mini-score-val');
  const ring = document.getElementById('mini-progress-ring');
  if (scoreElem) scoreElem.textContent = '—';
  if (ring) {
    const circumference = 2 * Math.PI * 38;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = circumference;
    ring.style.stroke = 'var(--text-muted)';
  }
}

function updateScoreRingFromNumber(score) {
  score = Math.max(0, Math.min(100, Math.round(score)));
  appState.analyzer.extractedScore = score;
  updateCoachContextNote();
  const scoreElem = document.getElementById('mini-score-val');
  const ring = document.getElementById('mini-progress-ring');

  if (scoreElem) {
    scoreElem.textContent = `${score}`;
  }

  if (ring) {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = 'var(--color-forest)';
  }
}

// ==============================================================================
// 10. CAREER GENOME & CROSS-ARCHETYPE COMPARISON
// ==============================================================================
// archetypesDatabase ids are the K-Means cluster ids, matching cluster_id in
// GET /api/corpus-summary. The corpus holds resumes only, so there is no
// per-archetype salary or placement-rate data to show.
let corpusSummaryPromise = null;

// Privacy-safe corpus facts: counts, dimensions and labels only — the full
// manifest (which lists degraded files by name) is never fetched client-side.
function loadCorpusSummary() {
  if (!corpusSummaryPromise) {
    corpusSummaryPromise = fetch(apiUrl('/api/corpus-summary'))
      .then(res => (res.ok ? res.json() : null))
      .then(summary => {
        if (summary) appState.corpusSummary = summary;
        return summary;
      })
      .catch(() => null);
  }
  return corpusSummaryPromise;
}

function getArchetypeCorpusCount(arch) {
  const summary = appState.corpusSummary;
  const entry = summary && Array.isArray(summary.archetypes)
    ? summary.archetypes.find(a => a.cluster_id === arch.id)
    : null;
  if (!entry || typeof entry.count !== 'number') return null;
  const total = summary.source_count;
  return { count: entry.count, total, pct: total ? ((entry.count / total) * 100).toFixed(1) : null };
}

function formatCorpusCount(arch, long) {
  const c = getArchetypeCorpusCount(arch);
  if (!c) return '—';
  return long ? `${c.count} of ${c.total} records (${c.pct}%)` : `${c.count} corpus records`;
}

// Official label from GET /api/corpus-summary when loaded, else the local name.
function getArchetypeLabel(arch) {
  const summary = appState.corpusSummary;
  const entry = summary && Array.isArray(summary.archetypes)
    ? summary.archetypes.find(a => a.cluster_id === arch.id)
    : null;
  return (entry && entry.label) || arch.name;
}

function initCareerGenome() {
  const selectorContainer = document.getElementById('archetypes-selector-grid');
  if (!selectorContainer) return;

  // Fetch once; re-render when the cluster sizes arrive.
  if (!appState.corpusSummary) {
    loadCorpusSummary().then(summary => {
      if (summary) initCareerGenome();
    });
  }

  const selected = appState.genome.selectedArchetypeId;
  selectorContainer.innerHTML = archetypesDatabase.map(arch => {
    const c = getArchetypeCorpusCount(arch);
    const isSelected = arch.id === selected;
    return `
    <button type="button" role="tab" id="archetype-tab-${arch.id}" class="archetype-tab${isSelected ? ' active' : ''}"
            data-arch-id="${arch.id}" aria-selected="${isSelected}" aria-controls="archetype-detail-panel" tabindex="${isSelected ? 0 : -1}">
      <span class="archetype-node" data-arch="${arch.id}" aria-hidden="true"></span>
      <span class="archetype-tab-cluster">Cluster ${arch.id}</span>
      <span class="archetype-tab-name">${escapeHTML(getArchetypeLabel(arch))}</span>
      <span class="archetype-tab-count">${c ? `${c.count} records · ${c.pct}%` : 'Corpus count loading'}</span>
    </button>`;
  }).join('');

  if (!selectorContainer.dataset.bound) {
    selectorContainer.dataset.bound = 'true';
    selectorContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.archetype-tab');
      if (tab) selectArchetype(parseInt(tab.getAttribute('data-arch-id'), 10));
    });
    // Tabs pattern: arrow keys, Home and End move the selection.
    selectorContainer.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      const ids = archetypesDatabase.map(a => a.id);
      const index = ids.indexOf(appState.genome.selectedArchetypeId);
      let next = null;
      if (e.key in keys) next = ids[(index + keys[e.key] + ids.length) % ids.length];
      if (e.key === 'Home') next = ids[0];
      if (e.key === 'End') next = ids[ids.length - 1];
      if (next === null) return;
      e.preventDefault();
      selectArchetype(next);
      const tab = document.getElementById(`archetype-tab-${next}`);
      if (tab) tab.focus();
    });
    const panel = document.getElementById('archetype-detail-panel');
    if (panel) {
      panel.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-genome-action]');
        if (!btn) return;
        const id = parseInt(btn.getAttribute('data-arch-id'), 10);
        if (btn.getAttribute('data-genome-action') === 'use-jd') populateSampleJdFromArchetype(id);
        else openArchetypeComparisonModal(id);
      });
    }
  }

  renderGenomeFieldStrip();
  renderArchetypeDetail(selected);
}

// One strip whose segments are each archetype's share of the corpus. Valid as a
// share-of-whole because K-Means places every record in exactly one cluster.
function renderGenomeFieldStrip() {
  const strip = document.getElementById('genome-field-strip');
  if (!strip) return;
  const counts = archetypesDatabase.map(arch => ({ arch, c: getArchetypeCorpusCount(arch) }));
  if (counts.some(x => !x.c)) {
    strip.hidden = true;
    return;
  }
  strip.hidden = false;
  strip.innerHTML = counts.map(({ arch, c }) => `
    <span class="genome-field-seg${arch.id === appState.genome.selectedArchetypeId ? ' active' : ''}" data-arch="${arch.id}" style="flex-grow:${c.count}">
      <b>${c.pct}%</b>
    </span>`).join('');
}

function selectArchetype(id) {
  appState.genome.selectedArchetypeId = id;
  if (typeof renderAtlasLegend === 'function') renderAtlasLegend();
  if (careerAtlas) careerAtlas.setSelected(id);
  syncAtlasFallbackSelection();
  renderAtlasEvidenceCard();
  document.querySelectorAll('.archetype-tab').forEach(tab => {
    const isSelected = parseInt(tab.getAttribute('data-arch-id'), 10) === id;
    tab.classList.toggle('active', isSelected);
    tab.setAttribute('aria-selected', String(isSelected));
    tab.setAttribute('tabindex', isSelected ? '0' : '-1');
  });
  document.querySelectorAll('.genome-field-seg').forEach(seg => {
    seg.classList.toggle('active', parseInt(seg.getAttribute('data-arch'), 10) === id);
  });
  renderArchetypeDetail(id);
}

function renderArchetypeDetail(id) {
  const arch = archetypesDatabase.find(a => a.id === id);
  const container = document.getElementById('archetype-detail-panel');
  if (!arch || !container) return;
  const c = getArchetypeCorpusCount(arch);
  container.setAttribute('aria-labelledby', `archetype-tab-${arch.id}`);

  container.innerHTML = `
    <div class="detail-panel-grid">
      <div class="detail-main">
        <p class="detail-kicker"><span class="archetype-node" data-arch="${arch.id}" aria-hidden="true"></span> Cluster ${arch.id} · archetype profile</p>
        <h3 class="detail-title">${escapeHTML(getArchetypeLabel(arch))}</h3>
        <p class="detail-summary">${escapeHTML(arch.summary)}</p>

        <p class="detail-label">Representative skills <span>curated</span></p>
        <ul class="skill-chips">
          ${arch.keySkills.map(s => `<li>${escapeHTML(s)}</li>`).join('')}
        </ul>

        <div class="detail-actions">
          <button type="button" class="btn-primary" data-genome-action="use-jd" data-arch-id="${arch.id}">
            <i data-lucide="file-input" style="width:16px;height:16px;"></i> Use this archetype's sample JD
          </button>
          <button type="button" class="btn-secondary" data-genome-action="compare" data-arch-id="${arch.id}">
            <i data-lucide="columns-2" style="width:16px;height:16px;"></i> Compare with another archetype
          </button>
        </div>
      </div>

      <aside class="detail-side" aria-label="Corpus facts for this archetype">
        <p class="detail-label">In the alumni corpus</p>
        <p class="detail-count">${c ? `<strong>${c.count}</strong> of ${c.total} records <span>(${c.pct}%)</span>` : '<strong>—</strong> records'}</p>
        ${c ? `<div class="share-bar" aria-hidden="true"><span data-arch="${arch.id}" style="width:${c.pct}%"></span></div>` : ''}
        <p class="detail-note">The corpus holds resumes only, so no salary or placement rate exists per archetype. For batch-level offers and CTC, see the 2026 snapshot.</p>

        <p class="detail-label">Typical roles <span>illustrative</span></p>
        <p class="detail-roles">${arch.typicalRoles.map(escapeHTML).join(' · ')}</p>

        <p class="detail-label">Project themes <span>suggested</span></p>
        <ul class="detail-themes">
          ${arch.projectThemes.map(t => `<li>${escapeHTML(t)}</li>`).join('')}
        </ul>
      </aside>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function populateSampleJdFromArchetype(id) {
  const arch = archetypesDatabase.find(a => a.id === id);
  const jdTextarea = document.getElementById('jd-textarea');
  if (arch && jdTextarea) {
    if (jdTextarea.value.trim().length > 0 && jdTextarea.value.trim() !== arch.sampleJd.trim()) {
      if (!confirm(`Replace your current Job Description with the sample JD for ${arch.name}?`)) {
        return;
      }
    }
    jdTextarea.value = arch.sampleJd;
    jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    showToast(`Loaded ${arch.name} sample Job Description.`);

    const analyzerSection = document.getElementById('analyzer');
    if (analyzerSection) analyzerSection.scrollIntoView({ behavior: appState.motionMode === 'reduced' ? 'auto' : 'smooth' });
  }
}

function openArchetypeComparisonModal(primaryId) {
  appState.genome.compareArchetypeA = primaryId;
  appState.genome.compareArchetypeB = (primaryId + 1) % archetypesDatabase.length;
  renderComparisonModalContent();
  openModal('compare-modal-backdrop');
}

function renderComparisonModalContent() {
  const body = document.getElementById('compare-modal-body');
  if (!body) return;

  const archA = archetypesDatabase.find(a => a.id === appState.genome.compareArchetypeA);
  const archB = archetypesDatabase.find(a => a.id === appState.genome.compareArchetypeB);
  if (!archA || !archB) return;

  const options = (selectedId) => archetypesDatabase
    .map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${escapeHTML(getArchetypeLabel(a))}</option>`)
    .join('');
  const head = (arch) => `<span class="archetype-node" data-arch="${arch.id}" aria-hidden="true"></span>${escapeHTML(getArchetypeLabel(arch))}`;

  body.innerHTML = `
    <div class="compare-pickers">
      <label>First archetype
        <select class="sort-select" data-compare-index="0">${options(archA.id)}</select>
      </label>
      <label>Second archetype
        <select class="sort-select" data-compare-index="1">${options(archB.id)}</select>
      </label>
    </div>
    ${archA.id === archB.id ? '<p class="compare-same" role="status">Both sides show the same archetype. Choose a different one to compare.</p>' : ''}

    <table class="comparison-table">
      <caption class="sr-only">Comparison of two career archetypes</caption>
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">Attribute</span></th>
          <th scope="col">${head(archA)}</th>
          <th scope="col">${head(archB)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Records in corpus</th>
          <td>${formatCorpusCount(archA, true)}</td>
          <td>${formatCorpusCount(archB, true)}</td>
        </tr>
        <tr>
          <th scope="row">Representative skills <span>curated</span></th>
          <td>${archA.keySkills.slice(0, 5).map(escapeHTML).join(', ')}</td>
          <td>${archB.keySkills.slice(0, 5).map(escapeHTML).join(', ')}</td>
        </tr>
        <tr>
          <th scope="row">Typical roles <span>illustrative</span></th>
          <td>${archA.typicalRoles.slice(0, 3).map(escapeHTML).join(', ')}</td>
          <td>${archB.typicalRoles.slice(0, 3).map(escapeHTML).join(', ')}</td>
        </tr>
      </tbody>
    </table>
  `;

  if (!body.dataset.bound) {
    body.dataset.bound = 'true';
    body.addEventListener('change', (e) => {
      const select = e.target.closest('[data-compare-index]');
      if (select) updateComparisonSelection(parseInt(select.getAttribute('data-compare-index'), 10), select.value);
    });
  }
}

function updateComparisonSelection(index, val) {
  if (index === 0) appState.genome.compareArchetypeA = parseInt(val, 10);
  else appState.genome.compareArchetypeB = parseInt(val, 10);
  renderComparisonModalContent();
  const select = document.querySelector(`#compare-modal-body [data-compare-index="${index}"]`);
  if (select) select.focus();
}

function closeCompareModal() {
  closeModal('compare-modal-backdrop');
}

// Dialogs: focus moves in on open, Tab stays inside, focus returns on close.
const modalReturnFocus = new Map();

function getFocusable(root) {
  return Array.from(root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter(el => el.offsetParent !== null);
}

function openModal(backdropId) {
  const backdrop = document.getElementById(backdropId);
  if (!backdrop) return;
  modalReturnFocus.set(backdropId, document.activeElement);
  backdrop.classList.add('open');
  const target = backdrop.querySelector('.modal-close-btn') || getFocusable(backdrop)[0];
  if (target) target.focus();
}

function closeModal(backdropId) {
  const backdrop = document.getElementById(backdropId);
  if (!backdrop || !backdrop.classList.contains('open')) return;
  backdrop.classList.remove('open');
  const previous = modalReturnFocus.get(backdropId);
  modalReturnFocus.delete(backdropId);
  if (previous && document.contains(previous) && typeof previous.focus === 'function') previous.focus();
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const open = document.querySelector('.modal-backdrop.open');
  if (!open) return;
  const items = getFocusable(open);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!open.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
});

// ==============================================================================
// 11. COMPANY INTELLIGENCE DIRECTORY CONTROLLER
// ==============================================================================
function initCompanyIntelligence() {
  const searchInput = document.getElementById('company-search-input');
  const sortSelect = document.getElementById('company-sort-select');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.companies.searchQuery = e.target.value.toLowerCase().trim();
      renderCompanyDirectory();
    });
  }

  if (sortSelect) {
    sortSelect.value = appState.companies.sortBy;
    sortSelect.addEventListener('change', (e) => {
      appState.companies.sortBy = e.target.value;
      renderCompanyDirectory();
    });
  }

  document.querySelectorAll('.btn-company-filter').forEach(btn => {
    btn.addEventListener('click', () => setCompanyFilter(btn.getAttribute('data-filter')));
  });

  const container = document.getElementById('companies-grid-container');
  if (container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-company-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-company-id');
      if (btn.getAttribute('data-company-action') === 'details') openCompanyModal(id);
      else if (btn.getAttribute('data-company-action') === 'use-jd') loadCompanyJd(id);
      else resetCompanyFilters();
    });
  }

  const modalBody = document.getElementById('company-modal-body');
  if (modalBody) {
    modalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-company-jd]');
      if (!btn) return;
      closeCompanyModal();
      loadCompanyJd(btn.getAttribute('data-company-jd'));
    });
  }

  renderCompanyDirectory();
}

// Filters use only attributes the 2026 snapshot actually reports.
function setCompanyFilter(filter) {
  appState.companies.activeFilter = filter;
  document.querySelectorAll('.btn-company-filter').forEach(b => {
    const active = b.getAttribute('data-filter') === filter;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  renderCompanyDirectory();
}

// Figures from the 2026 placement report for a curated company, or null when
// the company is not in the report excerpt (top recruiters + notable high-CTC).
// Matches on the leading word ("TCS (Digital / Prime)" -> "tcs"). The report
// counts offers, not distinct students.
function getReportFiguresFor(company) {
  const snap = appState.placementSnapshot;
  if (!snap) return null;
  const lead = name => name.toLowerCase().split(/[\s(]/)[0];
  const rows = [...(snap.top_recruiters || []), ...(snap.notable_high_ctc || [])];
  const row = rows.find(r => lead(r.company) === lead(company.name));
  return row ? { offers: row.offers, profiles: row.profiles, highestCtcLpa: row.highest_ctc_lpa } : null;
}

function renderCompanyDirectory() {
  const container = document.getElementById('companies-grid-container');
  if (!container) return;

  const { searchQuery, activeFilter, sortBy } = appState.companies;
  const snap = appState.placementSnapshot;
  const rows = companyDatabase.map(company => ({ company, fig: getReportFiguresFor(company) }));

  const filtered = rows.filter(({ company, fig }) => {
    const matchesSearch = !searchQuery || company.name.toLowerCase().includes(searchQuery);
    const matchesFilter = activeFilter === 'all'
      || (activeFilter === 'in-snapshot' && fig)
      || (activeFilter === 'ctc-20' && fig && fig.highestCtcLpa >= 20);
    return matchesSearch && matchesFilter;
  });

  const metric = { alumni: f => f.offers, ctc: f => f.highestCtcLpa, profiles: f => f.profiles || 0 };
  filtered.sort((a, b) => {
    if (sortBy === 'name') return a.company.name.localeCompare(b.company.name);
    const pick = metric[sortBy] || metric.alumni;
    return (b.fig ? pick(b.fig) : -1) - (a.fig ? pick(a.fig) : -1); // absent from the snapshot: last
  });

  const countEl = document.getElementById('company-results-count');
  if (countEl) {
    countEl.textContent = `${filtered.length} of ${companyDatabase.length} curated companies`
      + (snap ? '' : ' · snapshot figures loading');
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="directory-empty">
        <p><strong>No companies match.</strong> Try another name or clear the filters.</p>
        <button type="button" class="btn-secondary" data-company-action="reset">Clear filters</button>
      </div>`;
    return;
  }

  const sourceDate = snap && snap.source_snapshot_date ? formatSnapshotDate(snap.source_snapshot_date) : '';
  container.innerHTML = `
    <table class="company-table">
      <caption class="sr-only">Curated companies, with figures from the 2026 placement snapshot where the company appears in it</caption>
      <thead>
        <tr>
          <th scope="col">Company</th>
          <th scope="col" class="num">Offers</th>
          <th scope="col" class="num">Profiles</th>
          <th scope="col" class="num">Highest CTC</th>
          <th scope="col">Source</th>
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(({ company: c, fig }) => {
          const name = escapeHTML(c.name);
          return `
        <tr data-company-id="${escapeHTML(c.id)}">
          <th scope="row">
            <div class="company-cell">
              <span class="company-avatar-logo" aria-hidden="true">${escapeHTML(c.logoChar)}</span>
              <span><strong>${name}</strong><small>${escapeHTML(c.role)} · practice role</small></span>
            </div>
          </th>
          <td class="num" data-label="Offers">${fig ? Number(fig.offers).toLocaleString('en-IN') : '—'}</td>
          <td class="num" data-label="Profiles">${fig && fig.profiles ? fig.profiles : '—'}</td>
          <td class="num" data-label="Highest CTC">${fig ? `₹${escapeHTML(String(fig.highestCtcLpa))} LPA` : '—'}</td>
          <td data-label="Source">${fig
            ? `<span class="source-chip is-in">Snapshot${sourceDate ? ` · ${sourceDate}` : ''}</span>`
            : `<span class="source-chip is-out">${snap ? 'Not in this snapshot excerpt' : 'Loading snapshot…'}</span>`}</td>
          <td class="row-actions">
            <button type="button" class="btn-text-action" data-company-action="details" data-company-id="${escapeHTML(c.id)}" aria-label="Details for ${name}">Details</button>
            <button type="button" class="btn-secondary btn-sm" data-company-action="use-jd" data-company-id="${escapeHTML(c.id)}" aria-label="Use the sample job description for ${name}">Use sample JD</button>
          </td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function resetCompanyFilters() {
  appState.companies.searchQuery = '';
  const searchInput = document.getElementById('company-search-input');
  if (searchInput) searchInput.value = '';
  setCompanyFilter('all');
}

function loadCompanyJd(companyId) {
  const company = companyDatabase.find(c => c.id === companyId);
  const jdTextarea = document.getElementById('jd-textarea');
  if (company && jdTextarea) {
    if (jdTextarea.value.trim().length > 0 && jdTextarea.value.trim() !== company.sampleJd.trim()) {
      if (!confirm(`Replace your current Job Description with the sample JD for ${company.name}?`)) {
        return;
      }
    }
    jdTextarea.value = company.sampleJd;
    jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    showToast(`Loaded the sample job description for ${company.name}.`);

    const analyzerSection = document.getElementById('analyzer');
    if (analyzerSection) analyzerSection.scrollIntoView({ behavior: appState.motionMode === 'reduced' ? 'auto' : 'smooth' });
  }
}

// The dialog keeps two kinds of content apart: figures from the snapshot, and
// curated practice material that has not been verified with the employer.
function openCompanyModal(companyId) {
  const company = companyDatabase.find(c => c.id === companyId);
  const body = document.getElementById('company-modal-body');
  if (!company || !body) return;

  const fig = getReportFiguresFor(company);
  const snap = appState.placementSnapshot;
  const name = escapeHTML(company.name);

  let facts;
  if (fig && snap) {
    facts = `
      <dl class="fact-grid">
        <div><dt>Offers</dt><dd>${Number(fig.offers).toLocaleString('en-IN')}</dd></div>
        <div><dt>Job profiles</dt><dd>${fig.profiles || '—'}</dd></div>
        <div><dt>Highest CTC</dt><dd>₹${escapeHTML(String(fig.highestCtcLpa))} LPA</dd></div>
      </dl>
      <p class="fact-source">${escapeHTML(snap.source_name)} · batch ${escapeHTML(String(snap.batch))} · snapshot of ${formatSnapshotDate(snap.source_snapshot_date)}. Offers are not distinct students.</p>`;
  } else if (snap) {
    const listed = (snap.top_recruiters || []).length;
    const notable = (snap.notable_high_ctc || []).length;
    facts = `<p class="fact-missing">Not in this snapshot excerpt. The excerpt lists the top ${listed} recruiters by offers and ${notable} notable high-CTC offers, so no figures are shown for ${name}.</p>`;
  } else {
    facts = '<p class="fact-missing">The 2026 snapshot has not loaded, so no figures are shown.</p>';
  }

  body.innerHTML = `
    <div class="modal-company-head">
      <span class="company-avatar-logo" aria-hidden="true">${escapeHTML(company.logoChar)}</span>
      <div>
        <h3 class="modal-company-name">${name}</h3>
        <p class="modal-company-role">${escapeHTML(company.role)} <span class="unverified-tag">practice role</span></p>
      </div>
    </div>

    <section class="fact-block" aria-labelledby="company-facts-title">
      <h4 id="company-facts-title" class="block-title"><i data-lucide="badge-check" style="width:16px;height:16px;"></i> From the 2026 placement snapshot</h4>
      ${facts}
    </section>

    <section class="practice-block" aria-labelledby="company-practice-title">
      <h4 id="company-practice-title" class="block-title"><i data-lucide="notebook-pen" style="width:16px;height:16px;"></i> Practice material <span class="unverified-tag">unverified</span></h4>
      <p class="practice-note">${escapeHTML(company.provenance)}. Use it to rehearse, not as a description of the employer's real process.</p>
      <p class="detail-label">Skills to prepare</p>
      <ul class="skill-chips">${company.skills.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>
      <p class="detail-label">Sample interview rounds</p>
      <ol class="practice-rounds">
        ${company.interviewRounds.map(r => `<li><strong>${escapeHTML(r.name)}</strong><span>${escapeHTML(r.detail)}</span></li>`).join('')}
      </ol>
    </section>

    <div class="modal-actions">
      <button type="button" class="btn-primary" data-company-jd="${escapeHTML(company.id)}">Use the sample JD in the analyzer</button>
      <a class="btn-secondary" href="${escapeHTML(company.officialUrl)}" target="_blank" rel="noopener noreferrer">
        Official careers site <i data-lucide="external-link" style="width:14px;height:14px;"></i>
      </a>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  openModal('company-modal-backdrop');
}

function closeCompanyModal() {
  closeModal('company-modal-backdrop');
}

// ==============================================================================
// 12. PROMPT STUDIO (ALL 18 FRAMEWORKS CONTROLLER)
// ==============================================================================
function initPromptStudio() {
  const searchInput = document.getElementById('framework-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.promptStudio.searchQuery = e.target.value.toLowerCase().trim();
      renderFrameworksList();
    });
  }

  // Group filter: the registry's own two groups
  document.querySelectorAll('.btn-framework-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-framework-cat').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      appState.promptStudio.categoryFilter = btn.getAttribute('data-cat');
      renderFrameworksList();
    });
  });

  // Task scenario chips for transparent recommendation
  document.querySelectorAll('.btn-scenario-chip').forEach(chip => {
    chip.addEventListener('click', () => triggerFrameworkRecommendation(chip.getAttribute('data-scenario')));
  });

  const list = document.getElementById('frameworks-list-scroll');
  if (list) {
    list.addEventListener('click', (e) => {
      if (e.target.closest('.btn-registry-retry')) {
        startPromptStudio();
        return;
      }
      const item = e.target.closest('[data-framework-id]');
      if (item) selectFramework(item.getAttribute('data-framework-id'));
    });
  }
  const recBox = document.getElementById('recommendation-explanation-box');
  if (recBox) {
    recBox.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-load-framework]');
      if (btn) selectFramework(btn.getAttribute('data-load-framework'));
    });
  }
  const exampleBtn = document.getElementById('btn-fw-example');
  if (exampleBtn) exampleBtn.addEventListener('click', fillFrameworkExample);
  const resetBtn = document.getElementById('btn-fw-reset');
  if (resetBtn) resetBtn.addEventListener('click', resetFrameworkFields);
  const copyBtn = document.getElementById('btn-copy-prompt');
  if (copyBtn) copyBtn.addEventListener('click', copyPromptToClipboard);
  const coachBtn = document.getElementById('btn-prompt-to-coach');
  if (coachBtn) coachBtn.addEventListener('click', usePromptFrameworkInCoach);

  startPromptStudio();
}

const normalizeFieldKey = (name) => String(name).toLowerCase().replace(/[^a-z]/g, '');

// Registry entry + writing guide -> the shape the studio renders.
function buildStudioFramework(entry) {
  const guide = promptFrameworksRegistry.find(g => g.id === entry.id);
  const guideFields = guide ? guide.fields : [];
  return {
    id: entry.id,
    name: entry.name,
    group: entry.group,
    expansion: entry.acronym,
    bestUse: entry.best_use,
    scenarios: Array.isArray(entry.recommended_scenarios) ? entry.recommended_scenarios : [],
    fields: (entry.fields || []).map(name => {
      const g = guideFields.find(f => normalizeFieldKey(f.key) === normalizeFieldKey(name)) || {};
      return {
        key: name,
        label: name,
        letter: name.charAt(0).toUpperCase(),
        // Help stays visible beside the field. Where the guide only wrote one line of help,
        // it is the hint: a placeholder disappears as soon as someone starts typing.
        placeholder: g.hint ? g.placeholder : '',
        hint: g.hint || g.placeholder || `Write the ${name.toLowerCase()} for this prompt.`,
        example: guide && guide.sample && g.key ? (guide.sample[g.key] || '') : ''
      };
    })
  };
}

function loadFrameworkRegistry() {
  const note = document.getElementById('framework-registry-note');
  return fetch(apiUrl('/api/frameworks'))
    .then(res => {
      if (!res.ok) throw new Error('Framework registry returned ' + res.status);
      return res.json();
    })
    .then(data => {
      const entries = Array.isArray(data.frameworks) ? data.frameworks : [];
      if (!entries.length) throw new Error('Empty framework registry');
      appState.promptStudio.frameworks = entries.map(buildStudioFramework);
      appState.promptStudio.registrySource = 'api';
      if (note) note.textContent = `${entries.length} frameworks · registry v${data.version || '?'}`;
      populateCoachFrameworkOptions();
    })
    .catch(err => {
      console.warn('The framework registry could not be loaded:', err.message);
      appState.promptStudio.frameworks = [];
      appState.promptStudio.registrySource = 'unavailable';
      if (note) note.textContent = 'The framework registry could not be loaded.';
    });
}

function renderFrameworkRegistryError() {
  const list = document.getElementById('frameworks-list-scroll');
  const title = document.getElementById('builder-fw-title');
  const desc = document.getElementById('builder-fw-desc');
  const preview = document.getElementById('prompt-preview-code');
  if (list) {
    list.innerHTML = `<p class="frameworks-empty">The frameworks could not be loaded from the server.</p>
      <button type="button" class="btn-secondary btn-sm btn-registry-retry">Try again</button>`;
  }
  if (title) title.textContent = 'Frameworks unavailable';
  if (desc) desc.textContent = 'Prompt Studio reads its frameworks from the server. Check that it is running, then try again.';
  if (preview) preview.textContent = '';
  ['btn-fw-example', 'btn-fw-reset', 'btn-copy-prompt', 'btn-prompt-to-coach'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.hidden = true;
  });
}

function startPromptStudio() {
  return loadFrameworkRegistry().then(() => {
    if (!appState.promptStudio.frameworks.length) {
      renderFrameworkRegistryError();
      return;
    }
    ['btn-fw-reset', 'btn-copy-prompt', 'btn-prompt-to-coach'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.hidden = false;
    });
    renderFrameworksList();
    selectFramework(appState.promptStudio.selectedFrameworkId);
  });
}

// The coach's framework list is the registry's, in the registry's order.
function populateCoachFrameworkOptions() {
  const select = document.getElementById('coach-framework-select');
  if (!select) return;
  const current = select.value;
  [...select.options].forEach(option => { if (option.value) option.remove(); });
  appState.promptStudio.frameworks.forEach(fw => {
    select.add(new Option(`${fw.id}: ${fw.expansion}`, fw.id));
  });
  select.value = [...select.options].some(option => option.value === current) ? current : '';
}

function getStudioFramework(id) {
  return appState.promptStudio.frameworks.find(f => f.id === id);
}

const humanizeScenario = (s) => s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

function renderFrameworksList() {
  const listContainer = document.getElementById('frameworks-list-scroll');
  if (!listContainer) return;

  const { searchQuery, categoryFilter, selectedFrameworkId, frameworks } = appState.promptStudio;
  const filtered = frameworks.filter(fw => {
    const haystack = [fw.id, fw.name, fw.expansion, fw.bestUse, ...fw.scenarios].join(' ').toLowerCase().replace(/_/g, ' ');
    const matchesSearch = !searchQuery || haystack.includes(searchQuery);
    const matchesGroup = categoryFilter === 'all' || fw.group === categoryFilter;
    return matchesSearch && matchesGroup;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p class="frameworks-empty">No frameworks match. Try another word or show all groups.</p>';
    return;
  }

  const groups = [...new Set(filtered.map(fw => fw.group))];
  listContainer.innerHTML = groups.map(group => `
    <p class="framework-group-label">${escapeHTML(group)}</p>
    ${filtered.filter(fw => fw.group === group).map(fw => `
      <button type="button" class="framework-item-btn${fw.id === selectedFrameworkId ? ' active' : ''}"
              data-framework-id="${escapeHTML(fw.id)}" aria-pressed="${fw.id === selectedFrameworkId}">
        <span class="fw-acronym">${escapeHTML(fw.id)}</span>
        <span class="fw-expansion">${escapeHTML(fw.expansion)}</span>
      </button>`).join('')}
  `).join('');
}

// Switching keeps a draft per framework (in memory only), so nothing typed is lost.
function selectFramework(id) {
  const fw = getStudioFramework(id);
  if (!fw) return;
  const state = appState.promptStudio;
  if (state.selectedFrameworkId && state.selectedFrameworkId !== id) {
    state.drafts[state.selectedFrameworkId] = { ...state.formData };
  }
  state.selectedFrameworkId = id;
  state.formData = { ...(state.drafts[id] || {}) };

  document.querySelectorAll('.framework-item-btn').forEach(btn => {
    const isActive = btn.getAttribute('data-framework-id') === id;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  renderFrameworkBuilder(fw);
  updatePromptPreview(fw);
}

function renderFrameworkBuilder(fw) {
  const titleElem = document.getElementById('builder-fw-title');
  const descElem = document.getElementById('builder-fw-desc');
  const scenariosElem = document.getElementById('builder-fw-scenarios');
  const container = document.getElementById('builder-fields-container');
  const exampleBtn = document.getElementById('btn-fw-example');

  if (titleElem) titleElem.textContent = `${fw.name}`;
  if (descElem) descElem.innerHTML = `<strong>${escapeHTML(fw.expansion)}</strong><span>Best for: ${escapeHTML(fw.bestUse)}</span>`;
  if (scenariosElem) scenariosElem.innerHTML = fw.scenarios.map(s => `<li>${escapeHTML(humanizeScenario(s))}</li>`).join('');
  if (exampleBtn) exampleBtn.hidden = !fw.fields.some(f => f.example);
  if (!container) return;

  container.innerHTML = fw.fields.map((field, i) => {
    const id = `fw-field-${i}`;
    return `
    <div class="fw-field">
      <label class="fw-field-label" for="${id}"><span class="fw-letter" aria-hidden="true">${escapeHTML(field.letter)}</span>${escapeHTML(field.label)}</label>
      <textarea id="${id}" class="fw-field-input" rows="2" data-field-key="${escapeHTML(field.key)}"
                placeholder="${escapeHTML(field.placeholder)}"${field.hint ? ` aria-describedby="${id}-hint"` : ''}>${escapeHTML(appState.promptStudio.formData[field.key] || '')}</textarea>
      ${field.hint ? `<p class="fw-field-hint" id="${id}-hint">${escapeHTML(field.hint)}</p>` : ''}
    </div>`;
  }).join('');

  container.querySelectorAll('.fw-field-input').forEach(input => {
    input.addEventListener('input', (e) => {
      appState.promptStudio.formData[e.target.getAttribute('data-field-key')] = e.target.value;
      updatePromptPreview(fw);
    });
  });
}

function updatePromptPreview(fw) {
  const previewBox = document.getElementById('prompt-preview-code');
  const charCountElem = document.getElementById('prompt-char-count');
  const progress = document.getElementById('builder-progress');
  if (!previewBox) return;

  let generatedText = `# [${fw.id}] ${fw.name}\n# Purpose: ${fw.bestUse}\n\n`;
  let filled = 0;
  fw.fields.forEach(field => {
    const val = (appState.promptStudio.formData[field.key] || '').trim();
    if (val) filled++;
    generatedText += `[${field.key.toUpperCase()}]: ${val || '[Fill in ' + field.label + ']'}\n`;
  });

  previewBox.textContent = generatedText;
  if (charCountElem) charCountElem.textContent = `${generatedText.length.toLocaleString()} characters`;
  if (progress) progress.textContent = `${filled} of ${fw.fields.length} fields filled`;
}

function fillFrameworkExample() {
  const fw = getStudioFramework(appState.promptStudio.selectedFrameworkId);
  if (!fw) return;
  const hasText = Object.values(appState.promptStudio.formData).some(v => (v || '').trim());
  if (hasText && !confirm(`Replace what you have written for ${fw.id} with the example?`)) return;
  fw.fields.forEach(field => { appState.promptStudio.formData[field.key] = field.example; });
  renderFrameworkBuilder(fw);
  updatePromptPreview(fw);
  showToast(`Example loaded for ${fw.id}. Edit it to fit your situation.`);
}

// Resets only the selected framework's form and draft.
function resetFrameworkFields() {
  const fw = getStudioFramework(appState.promptStudio.selectedFrameworkId);
  if (!fw) return;
  appState.promptStudio.formData = {};
  delete appState.promptStudio.drafts[fw.id];
  document.querySelectorAll('.fw-field-input').forEach(input => { input.value = ''; });
  updatePromptPreview(fw);
  showToast(`${fw.id} fields cleared.`);
}

// Resolves true only when the text really reached the clipboard.
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

function copyPromptToClipboard() {
  const previewBox = document.getElementById('prompt-preview-code');
  if (!previewBox) return;
  const fw = getStudioFramework(appState.promptStudio.selectedFrameworkId);
  const blanks = fw ? fw.fields.filter(field => !(appState.promptStudio.formData[field.key] || '').trim()).length : 0;
  copyText(previewBox.textContent).then(ok => {
    if (!ok) {
      showToast('Copy failed. Select the preview text and copy it manually.');
      return;
    }
    showToast(blanks ? `Prompt copied, with ${blanks} ${blanks === 1 ? 'field' : 'fields'} still blank.` : 'Prompt copied to clipboard.');
  });
}

function fallbackCopy(text, successMessage = 'Copied to clipboard.') {
  copyText(text).then(ok => showToast(ok ? successMessage : 'Copy failed. Select the text and copy it manually.'));
}

// Human-readable report: the same transform renderSafeMarkdown applies before
// display, so copied/exported text never contains the internal JSON block.
function getAnalysisReportMarkdown() {
  return (appState.analyzer.streamBuffer || '')
    .replace(/<!-- STRUCTURED_REPORT_START -->[\s\S]*?<!-- STRUCTURED_REPORT_END -->/g, '')
    .trim();
}

function copyAnalysisToClipboard() {
  const text = getAnalysisReportMarkdown();
  if (!text) {
    showToast('No report yet. Run an analysis first.');
    return;
  }
  // Copied text travels without the page around it, so a sample has to say what it is.
  const labelled = appState.analyzer.reportIsDemo
    ? `Illustrative demo output, not generated from a resume.\n\n${text}`
    : text;
  fallbackCopy(labelled, appState.analyzer.reportIsDemo ? 'Demo report copied, labelled as illustrative.' : 'Report copied to clipboard.');
}

function exportAnalysisReport() {
  const text = getAnalysisReportMarkdown();
  if (!text) {
    showToast('No report yet. Run an analysis first.');
    return;
  }

  const score = appState.analyzer.extractedScore;
  const source = appState.analyzer.reportIsDemo
    ? 'Illustrative demo output — not generated from a live resume'
    : 'Live analysis of the uploaded resume';
  const scoreLine = typeof score === 'number'
    ? `Resume–JD alignment score: ${score}/100 (textual alignment, not a hiring probability)\n`
    : '';
  const mdContent = `# Hyperion Pathfinder — Analysis Report
Export Date: ${new Date().toLocaleString()}
Source: ${source}
${scoreLine}
================================================================================
${text}
================================================================================
`;

  const filename = `resume_analysis_report${appState.analyzer.reportIsDemo ? '_demo' : ''}.md`;
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Download started: ${filename}`);
}

// The fields someone has filled in, in registry order, with no header or placeholders.
function composeFrameworkQuestion(fw) {
  return fw.fields
    .map(field => [field.label, (appState.promptStudio.formData[field.key] || '').trim()])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

// Defined handoff: sets the coach's framework and places the draft in its question box.
// Nothing is sent until the person reviews it and presses Ask.
function usePromptFrameworkInCoach() {
  const fw = getStudioFramework(appState.promptStudio.selectedFrameworkId);
  const select = document.getElementById('coach-framework-select');
  const input = document.getElementById('coach-query-input');
  if (!fw || !select) return;
  if (![...select.options].some(o => o.value === fw.id)) {
    showToast(`The Career Coach has no ${fw.id} lens.`);
    return;
  }
  select.value = fw.id;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  switchResultsTab('pane-career-coach');
  const results = document.querySelector('.analyzer-results-card');
  if (results) results.scrollIntoView({ behavior: appState.motionMode === 'reduced' ? 'auto' : 'smooth', block: 'start' });

  const question = composeFrameworkQuestion(fw);
  if (input) {
    if (question) input.value = question;
    input.focus({ preventScroll: true });
  }
  if (!question) {
    showToast(`The coach will answer through ${fw.id}. Type your question and press Ask.`);
  } else if (question.length > COACH_MESSAGE_MAX) {
    showToast(`Your ${fw.id} draft is over the coach's ${COACH_MESSAGE_MAX.toLocaleString()} character limit. Shorten it, then press Ask.`);
  } else {
    showToast(`Your ${fw.id} draft is in the coach's question box. Review it, then press Ask.`);
  }
}

function triggerFrameworkRecommendation(scenarioKey) {
  const rec = scenarioRecommendations[scenarioKey];
  const box = document.getElementById('recommendation-explanation-box');
  if (!rec || !box) return;
  document.querySelectorAll('.btn-scenario-chip').forEach(chip => {
    const selected = chip.getAttribute('data-scenario') === scenarioKey;
    chip.classList.toggle('active', selected);
    chip.setAttribute('aria-pressed', String(selected));
  });
  const primary = getStudioFramework(rec.primaryId);
  const alt = getStudioFramework(rec.altId);

  box.innerHTML = `
    <p class="rec-line"><strong>Use ${escapeHTML(rec.primaryId)}</strong>${primary ? ` (${escapeHTML(primary.expansion)})` : ''}. ${escapeHTML(rec.reason)}</p>
    <p class="rec-alt">Alternative: <strong>${escapeHTML(rec.altId)}</strong>${alt ? `, best for ${escapeHTML(alt.bestUse.replace(/\.$/, '').toLowerCase())}` : ''}.</p>
    <div class="rec-actions">
      <button type="button" class="btn-secondary btn-sm" data-load-framework="${escapeHTML(rec.primaryId)}">Open ${escapeHTML(rec.primaryId)}</button>
      <button type="button" class="btn-text-action" data-load-framework="${escapeHTML(rec.altId)}">Open ${escapeHTML(rec.altId)} instead</button>
    </div>
  `;
  box.classList.add('visible');
  selectFramework(rec.primaryId);
}

// ==============================================================================
// 13. INTERACTION LAB & TOASTS
// ==============================================================================
function initInteractionLab() {
  // Wire sample filter pill in lab
  const samplePill = document.getElementById('lab-filter-pill');
  if (samplePill) {
    samplePill.addEventListener('click', () => {
      samplePill.classList.toggle('active');
      showToast(`Sample filter ${samplePill.classList.contains('active') ? 'on' : 'off'}. No data is filtered.`);
    });
  }

  // Preset chip in lab
  const samplePreset = document.getElementById('lab-preset-chip');
  if (samplePreset) {
    samplePreset.addEventListener('click', () => {
      showToast('Sample chip pressed. Nothing was loaded.');
    });
  }
}

let toastTimer = null;

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  const msgElem = document.getElementById('toast-message');
  if (!toast || !msgElem) return;

  msgElem.textContent = msg;
  toast.classList.add('show');

  // A new toast gets its full time on screen: the previous one's timer must not hide it.
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function triggerConfetti() {
  if (appState.motionMode === 'reduced') return;
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.65 },
      colors: getThemePalette().archetypes
    });
  }
}

// ==============================================================================
// 14. ACCESSIBILITY, MOTION TOGGLE & KEYBOARD NAVIGATION
// ==============================================================================
// ==============================================================================
// 14. ACCESSIBILITY, THEME SWITCHER & MOTION PREFERENCES
// ==============================================================================
const THEME_STORAGE_KEY = 'career_ui_theme_v2';
const THEME_LABELS = { terra: 'Terra Atelier', grove: 'Midnight Grove' };

// Resolve the saved theme, migrating the pre-redesign key once:
// ceramic -> terra, cyber -> grove. New visitors get Terra Atelier.
function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'terra' || saved === 'grove') return saved;
    const legacy = localStorage.getItem('resume_checker_theme');
    if (legacy) {
      const migrated = legacy === 'cyber' ? 'grove' : 'terra';
      localStorage.setItem(THEME_STORAGE_KEY, migrated);
      localStorage.removeItem('resume_checker_theme');
      return migrated;
    }
  } catch (err) { /* storage unavailable: fall through to the default */ }
  return 'terra';
}

function initThemeSwitcher() {
  const themeBtn = document.getElementById('btn-theme-toggle');
  setTheme(getSavedTheme(), { persist: false });

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'grove' ? 'terra' : 'grove';
      setTheme(next);
      showToast(`Theme: ${THEME_LABELS[next]}`);
    });
  }
}

function setTheme(theme, { persist = true } = {}) {
  const next = theme === 'grove' ? 'grove' : 'terra';
  const changed = document.documentElement.getAttribute('data-theme') !== next;
  document.documentElement.setAttribute('data-theme', next);

  const themeLabel = document.getElementById('theme-mode-label');
  if (themeLabel) themeLabel.textContent = THEME_LABELS[next];
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    const other = next === 'grove' ? 'terra' : 'grove';
    themeBtn.setAttribute('aria-label', `Switch to ${THEME_LABELS[other]} theme`);
    themeBtn.setAttribute('aria-pressed', String(next === 'grove'));
  }
  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch (err) { /* preference only */ }
  }

  // Canvas and WebGL colours come from the palette, so rebuild them on a real change.
  if (changed && scene && renderer && typeof update3DSceneAesthetic === 'function') {
    update3DSceneAesthetic();
  }
}

/* ==============================================================================
   Editorial reveal system
   One quiet entrance per discovery panel, the first time it scrolls into view.
   The hero copy and the working tools (analyzer, directories, Prompt Studio) never
   wait for an animation, and anything already on screen at load is left alone.
   The observer owns its elements: each is unhooked when revealed, and the observer
   disconnects with the last one. Reduced-motion readers get everything immediately.
   ==============================================================================
*/
const REVEAL_SELECTOR = '.section-head, .evidence-panel, .process-step, .story-panel, .faq-item';

function initEditorialRevealSystem() {
  if (appState.motionMode === 'reduced' || typeof IntersectionObserver === 'undefined') return;

  const targets = [...document.querySelectorAll(REVEAL_SELECTOR)]
    .filter(el => el.getBoundingClientRect().top > window.innerHeight);
  let remaining = targets.length;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('hp-reveal-visible');
      observer.unobserve(entry.target);
      remaining -= 1;
    });
    if (remaining <= 0) observer.disconnect();
  }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

  targets.forEach((el, index) => {
    el.classList.add('hp-reveal');
    el.style.setProperty('--hp-reveal-delay', `${(index % 3) * 50}ms`);
    observer.observe(el);
  });
}

// The one thing the preview controls change: the shadow of the sample card.
const sampleShadow = { depth: 8, degrees: 225 };

function renderSampleShadow() {
  const surface = document.getElementById('neu-preview-surface');
  if (!surface) return;
  // The shadow falls away from the light.
  const radians = ((sampleShadow.degrees + 180) * Math.PI) / 180;
  const x = Math.round(Math.cos(radians) * sampleShadow.depth);
  const y = Math.round(Math.sin(radians) * sampleShadow.depth);
  surface.style.boxShadow = `${x}px ${y}px ${Math.round(sampleShadow.depth * 2.2)}px var(--neu-shadow-dark)`;
}

function initNeumorphicWorkbench() {
  const depthSlider = document.getElementById('neu-depth-range');
  const depthValLabel = document.getElementById('neu-depth-val');
  const toggleWrapper = document.getElementById('neu-tactile-toggle');
  const toggleLabel = document.getElementById('neu-toggle-status-label');

  if (depthSlider && depthValLabel) {
    depthSlider.addEventListener('input', (e) => {
      const depth = parseInt(e.target.value, 10);
      depthValLabel.textContent = `${depth}px`;

      sampleShadow.depth = depth;
      renderSampleShadow();
    });
  }

  if (toggleWrapper) {
    toggleWrapper.addEventListener('click', () => {
      const isChecked = toggleWrapper.classList.toggle('checked');
      toggleWrapper.setAttribute('aria-checked', isChecked);
      if (toggleLabel) {
        toggleLabel.textContent = isChecked ? 'On' : 'Off';
      }
      showToast(`Sample switch ${isChecked ? 'on' : 'off'}. Nothing else changes.`);
    });

    toggleWrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleWrapper.click();
      }
    });
  }

  // Explicit listeners for Neumorphic shape previews
  document.getElementById('btn-neu-shape-raised')?.addEventListener('click', () => setNeuPreviewShape('raised'));
  document.getElementById('btn-neu-shape-inset')?.addEventListener('click', () => setNeuPreviewShape('inset'));
  document.getElementById('btn-neu-shape-convex')?.addEventListener('click', () => setNeuPreviewShape('convex'));
}

function setNeuPreviewShape(shape) {
  const surface = document.getElementById('neu-preview-surface');
  if (!surface) return;

  surface.classList.remove('neu-card-convex', 'neu-card-concave', 'neu-inset-panel');
  if (shape === 'inset') surface.classList.add('neu-inset-panel');
  if (shape === 'convex') surface.classList.add('neu-card-convex');

  const buttons = { raised: 'btn-neu-shape-raised', inset: 'btn-neu-shape-inset', convex: 'btn-neu-shape-convex' };
  Object.entries(buttons).forEach(([name, id]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('active', name === shape);
    btn.setAttribute('aria-pressed', String(name === shape));
  });
}

// Motion preference: System (follows prefers-reduced-motion), Calm or Full.
// appState.motionMode stays the effective value used everywhere ('reduced' = calm).
const MOTION_STORAGE_KEY = 'career_ui_motion_v1';
const systemMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const MOTION_LABELS = { system: 'System', calm: 'Calm', full: 'Full' };

function getSavedMotionSetting() {
  try {
    const saved = localStorage.getItem(MOTION_STORAGE_KEY);
    if (saved === 'system' || saved === 'calm' || saved === 'full') return saved;
  } catch (err) { /* storage unavailable: follow the system */ }
  return 'system';
}

function applyMotionSetting(setting, { persist = true, announce = false } = {}) {
  const calm = setting === 'calm' || (setting === 'system' && systemMotionQuery.matches);
  appState.motionSetting = setting;
  appState.motionMode = calm ? 'reduced' : 'full';
  document.body.setAttribute('data-motion', appState.motionMode);

  const label = document.getElementById('motion-mode-label');
  const text = setting === 'system' ? `System (${calm ? 'calm' : 'full'})` : MOTION_LABELS[setting];
  if (label) label.textContent = text;
  const btn = document.getElementById('btn-motion-toggle');
  if (btn) btn.setAttribute('aria-label', `Motion: ${text}. Activate to change.`);

  if (typeof careerAtlas !== 'undefined' && careerAtlas) careerAtlas.setReducedMotion(calm);
  if (calm) {
    // drop any tilt or magnetic offset already applied
    document.querySelectorAll('[data-tilt-bound]').forEach(el => { el.style.transform = ''; });
  } else {
    init3DCardTilt();
    initHoverButtons();
  }
  if (persist) {
    try { localStorage.setItem(MOTION_STORAGE_KEY, setting); } catch (err) { /* preference only */ }
  }
  if (announce) showToast(`Motion: ${text}`);
}

function initAccessibilityAndMotion() {
  const motionBtn = document.getElementById('btn-motion-toggle');
  const motionLabel = document.getElementById('motion-mode-label');

  applyMotionSetting(getSavedMotionSetting(), { persist: false });
  if (motionBtn) {
    motionBtn.addEventListener('click', () => {
      const order = ['system', 'calm', 'full'];
      const next = order[(order.indexOf(appState.motionSetting) + 1) % order.length];
      applyMotionSetting(next, { announce: true });
    });
  }
  // "System" follows the operating-system setting live.
  if (systemMotionQuery.addEventListener) {
    systemMotionQuery.addEventListener('change', () => {
      if (appState.motionSetting === 'system') applyMotionSetting('system', { persist: false });
    });
  }

  // Mobile menu toggle
  const mobileBtn = document.getElementById('btn-mobile-menu');
  const navLinks = document.getElementById('nav-links-menu');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-open');
      mobileBtn.setAttribute('aria-expanded', isOpen);
    });
  }

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCompanyModal();
      closeCompareModal();
      closeModal('modal-llm-control-hub');
    }
  });

  // The FAQ uses native <details> elements: no script needed.
}

// ==============================================================================
// 16. VOICE ASSISTANT, EXECUTIVE REVIEW & INTERACTIVE RESUME TAILORING MODULES
// ==============================================================================

// --- 16.1 RESULTS WORKSPACE TABS CONTROLLER ---
function selectResultsTab(btn, { focus = false } = {}) {
  const targetPaneId = btn.getAttribute('aria-controls');
  if (!targetPaneId) return;

  document.querySelectorAll('.results-tab-btn').forEach(tab => {
    const selected = tab === btn;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll('.results-tab-pane').forEach(pane => {
    const selected = pane.id === targetPaneId;
    pane.classList.toggle('active', selected);
    pane.style.display = selected ? 'block' : 'none';
  });
  renderResultsView();
  if (focus) btn.focus();
}

function initResultsWorkspaceTabs() {
  const tabBtns = [...document.querySelectorAll('.results-tab-btn')];
  tabBtns.forEach((btn, index) => {
    btn.tabIndex = btn.getAttribute('aria-selected') === 'true' ? 0 : -1;
    btn.addEventListener('click', () => selectResultsTab(btn));
    btn.addEventListener('keydown', (e) => {
      const targets = {
        ArrowRight: tabBtns[(index + 1) % tabBtns.length],
        ArrowLeft: tabBtns[(index - 1 + tabBtns.length) % tabBtns.length],
        Home: tabBtns[0],
        End: tabBtns[tabBtns.length - 1]
      };
      const target = targets[e.key];
      if (!target) return;
      e.preventDefault();
      selectResultsTab(target, { focus: true });
    });
  });
}

function switchResultsTab(paneId) {
  const btn = document.querySelector(`.results-tab-btn[aria-controls="${paneId}"]`);
  if (btn) selectResultsTab(btn);
}

// --- 16.2 EXECUTIVE PERSONA CONTROLLER ---
function initExecutivePersonaSelector() {
  // The radios are named "executive_persona" in index.html; the chip label
  // carries the visible selected state.
  document.querySelectorAll('input[name="executive_persona"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      appState.executiveReview.selectedPersonaId = e.target.value;
      document.querySelectorAll('.persona-chip').forEach(chip => {
        chip.classList.toggle('active', chip.contains(e.target));
      });
      const label = e.target.closest('.persona-chip')?.querySelector('strong')?.textContent || e.target.value;
      showToast(`Review lens: ${label}`);
    });
  });
}

function renderExecutiveReview(review) {
  if (!review) return;
  appState.executiveReview.review = review;

  const titleElem = document.getElementById('exec-persona-title');
  const roleElem = document.getElementById('exec-target-role-label');
  const verdictElem = document.getElementById('exec-verdict-badge');
  const reactionElem = document.getElementById('exec-reaction-summary');
  const attentionList = document.getElementById('exec-attention-list');
  const skepticismList = document.getElementById('exec-skepticism-list');
  const questionsList = document.getElementById('exec-questions-list');
  const prioritiesList = document.getElementById('exec-priorities-list');

  if (titleElem) titleElem.textContent = review.persona_title || 'Simulated reviewer';
  if (roleElem) roleElem.textContent = review.target_role ? `Target role: ${review.target_role}` : '';
  const lensNote = document.getElementById('exec-lens-note');
  if (lensNote) {
    // Only a real run inferred anything; the demo's lens is part of its fixture.
    const auto = appState.executiveReview.selectedPersonaId === 'auto' && !appState.analyzer.reportIsDemo;
    lensNote.hidden = !auto || !review.persona_title;
    lensNote.textContent = auto ? 'Auto chose this lens from keywords in the job description.' : '';
  }

  if (verdictElem) {
    verdictElem.className = 'verdict-badge';
    const v = (review.verdict || 'promising_with_gaps').toLowerCase();
    if (v.includes('strong')) {
      verdictElem.classList.add('verdict-strong');
    } else if (v.includes('promising')) {
      verdictElem.classList.add('verdict-promising');
    } else {
      verdictElem.classList.add('verdict-needs-proof');
    }
    verdictElem.textContent = (review.verdict || 'not stated').replace(/_/g, ' ');
  }

  if (reactionElem) {
    reactionElem.textContent = review.reaction_summary || 'Review generated based on submitted evidence.';
  }

  // Attention list
  if (attentionList) {
    const items = review.what_catches_attention || [];
    if (items.length === 0) {
      attentionList.innerHTML = '<p class="empty-hint">Nothing stood out in this review.</p>';
    } else {
      attentionList.innerHTML = items.map(obs => `
        <div class="exec-obs-item obs-positive">
          <div class="obs-bullet-title">${escapeHTML(obs.statement)}</div>
          <div class="obs-why-it-matters"><strong>Why it matters:</strong> ${escapeHTML(obs.why_it_matters || '')}</div>
        </div>
      `).join('');
    }
  }

  // Skepticism list
  if (skepticismList) {
    const items = review.skepticism_points || [];
    if (items.length === 0) {
      skepticismList.innerHTML = '<p class="empty-hint">This review raised no questions.</p>';
    } else {
      skepticismList.innerHTML = items.map(obs => `
        <div class="exec-obs-item obs-skeptical">
          <div class="obs-bullet-title">${escapeHTML(obs.statement)}</div>
          <div class="obs-why-it-matters"><strong>Why it would be questioned:</strong> ${escapeHTML(obs.why_it_matters || '')}</div>
        </div>
      `).join('');
    }
  }

  // Architecture questions list
  if (questionsList) {
    const questions = review.architecture_questions || [];
    if (questions.length === 0) {
      questionsList.innerHTML = '<li class="empty-hint">No technical questions recorded.</li>';
    } else {
      questionsList.innerHTML = questions.map(q => `<li>${escapeHTML(q)}</li>`).join('');
    }
  }

  // Strategic priorities list
  if (prioritiesList) {
    const priorities = review.strategic_priorities || [];
    if (priorities.length === 0) {
      prioritiesList.innerHTML = '<p class="empty-hint">No next actions specified.</p>';
    } else {
      prioritiesList.innerHTML = priorities.map((p, idx) => `
        <div class="exec-priority-card">
          <div class="priority-step-num">0${idx + 1}</div>
          <div class="priority-info">
            <div class="priority-action">${escapeHTML(p.action || p.priority || '')}</div>
            <div class="priority-meta">
              ${p.expected_improvement || p.impact ? `<span class="meta-tag tag-impact">${escapeHTML(p.expected_improvement || p.impact)}</span>` : ''}
              ${p.prerequisites ? `<span class="meta-tag tag-prereq">Prereq: ${escapeHTML(p.prerequisites)}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Update Coach Persona Title
  const coachTitle = document.getElementById('coach-active-persona-title');
  if (coachTitle) coachTitle.textContent = `${review.persona_title} (Career Coach)`;
}

// --- 16.3 IN-DOCUMENT RESUME TAILORING CONTROLLER ---
function initResumeTailoringController() {
  const undoBtn = document.getElementById('btn-draft-undo');
  const redoBtn = document.getElementById('btn-draft-redo');
  const diffToggleBtn = document.getElementById('btn-toggle-diff');
  const diffCloseBtn = document.getElementById('btn-close-diff');
  const recalcBtn = document.getElementById('btn-recalculate-draft');
  const exportBtn = document.getElementById('btn-export-draft');
  const popoverCloseBtn = document.getElementById('btn-close-popover');
  const popoverDismissBtn = document.getElementById('popover-dismiss-btn');
  const popoverApplyBtn = document.getElementById('popover-apply-btn');

  if (undoBtn) undoBtn.addEventListener('click', undoDraftEdit);
  if (redoBtn) redoBtn.addEventListener('click', redoDraftEdit);
  if (diffToggleBtn) diffToggleBtn.addEventListener('click', toggleDiffDrawer);
  if (diffCloseBtn) diffCloseBtn.addEventListener('click', () => {
    toggleDiffDrawer();
    if (diffToggleBtn) diffToggleBtn.focus();
  });
  const diffUndoBtn = document.getElementById('btn-diff-undo');
  if (diffUndoBtn) diffUndoBtn.addEventListener('click', undoDraftEdit);
  if (recalcBtn) recalcBtn.addEventListener('click', recalculateDraftFit);
  if (exportBtn) exportBtn.addEventListener('click', exportDraftAsMarkdown);
  if (popoverCloseBtn) popoverCloseBtn.addEventListener('click', () => closeMarkupPopover());
  if (popoverDismissBtn) popoverDismissBtn.addEventListener('click', () => closeMarkupPopover());
  if (popoverApplyBtn) popoverApplyBtn.addEventListener('click', applyMarkupReplacement);

  const rewriteInput = document.getElementById('popover-rewrite-input');
  if (rewriteInput) rewriteInput.addEventListener('input', () => hideInlineError('popover-error'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && markupPopoverOpen()) closeMarkupPopover();
  });
  // A press outside closes it, and a press on another mark goes on to open that one.
  document.addEventListener('pointerdown', (e) => {
    if (!markupPopoverOpen()) return;
    if (e.target.closest('#markup-detail-popover') || e.target.closest('.doc-markup-span')) return;
    closeMarkupPopover({ restoreFocus: false });
  });
}

function markupPopoverOpen() {
  const popover = document.getElementById('markup-detail-popover');
  return Boolean(popover) && popover.style.display !== 'none';
}

function showInlineError(id, message) {
  const elem = document.getElementById(id);
  if (!elem) return;
  elem.textContent = message;
  elem.classList.add('visible');
}

function hideInlineError(id) {
  const elem = document.getElementById(id);
  if (!elem) return;
  elem.textContent = '';
  elem.classList.remove('visible');
}

// Backend categories (services/markup.py) in the words the legend uses.
const MARKUP_CATEGORY_LABELS = {
  metric_highlight: 'Metric proof',
  passive_verb: 'Passive phrasing',
  buzzword_gap: 'Critical gap'
};

function markupCategoryLabel(item) {
  return MARKUP_CATEGORY_LABELS[item.category]
    || String(item.category || 'Suggestion').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

// A green mark praises evidence that is already good. Its text is advice, not replacement
// wording, so there is nothing to apply.
function markupIsReplaceable(item) {
  return item.color_tag !== 'green';
}

function hydrateResumeTailoring(report) {
  if (!report) return;
  const displayText = report.canonical_display_text || '';
  const markups = report.resume_markups || [];

  appState.resumeDraft.originalText = displayText;
  appState.resumeDraft.displayText = displayText;
  appState.resumeDraft.textHash = report.text_hash || '';
  appState.resumeDraft.sourceRevisionId = report.revision_id || 'rev_0';
  appState.resumeDraft.currentRevisionId = report.revision_id || 'rev_0';
  appState.resumeDraft.markupItems = markups;
  appState.resumeDraft.selectedMarkupId = null;
  appState.resumeDraft.documentId = report.document_id || '';
  appState.resumeDraft.draftHistory = [{
    revisionId: appState.resumeDraft.currentRevisionId,
    text: displayText,
    markups: markups,
    score: report.overall_score,
    breakdown: report.score_breakdown || null,
    evidence: report.evidence || null,
    scored: true,
    rescored: false,
    edits: []
  }];
  appState.resumeDraft.historyIndex = 0;
  appState.resumeDraft.lastRevisionNumber = 0;

  closeMarkupPopover({ restoreFocus: false });
  const drawer = document.getElementById('draft-diff-drawer');
  if (drawer && drawer.style.display !== 'none') toggleDiffDrawer();

  renderDraftStatus();
  renderDocumentViewer(displayText, markups);
}

function currentDraftEntry() {
  const draft = appState.resumeDraft;
  return draft.draftHistory[draft.historyIndex] || null;
}

// The badge, tab count, undo and redo all read the current revision, so they cannot disagree.
function renderDraftStatus() {
  const draft = appState.resumeDraft;
  const entry = currentDraftEntry();
  const revBadge = document.getElementById('draft-revision-badge');
  if (revBadge && entry) {
    if (!entry.scored) {
      revBadge.textContent = `Draft: ${entry.revisionId}, edited. Score not updated; recalculate to re-score.`;
    } else if (entry.rescored) {
      revBadge.textContent = `Draft: ${entry.revisionId}, re-scored ${entry.score} of 100`;
    } else {
      revBadge.textContent = `Draft: ${entry.revisionId}, original text`;
    }
  }
  const countBadge = document.getElementById('tab-markup-count-badge');
  if (countBadge) {
    countBadge.textContent = draft.markupItems.length;
    countBadge.style.display = draft.markupItems.length > 0 ? 'inline-block' : 'none';
  }
  updateUndoRedoButtons();
  renderDiffDrawer();
}

function renderDocumentViewer(text, markups) {
  const container = document.getElementById('document-text-container');
  if (!container) return;

  if (!text || text.trim().length === 0) {
    container.innerHTML = '<p class="empty-hint">No extracted resume text available for in-document tailoring.</p>';
    return;
  }

  // Linear segmentation algorithm with exact UTF-16 code unit slicing
  const sorted = [...markups].sort((a, b) => a.start_char - b.start_char);
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const item of sorted) {
    if (item.start_char < cursor || item.end_char > text.length || item.start_char >= item.end_char) {
      continue; // Skip invalid or overlapping spans
    }

    // Append preceding plain text
    if (item.start_char > cursor) {
      const slice = text.substring(cursor, item.start_char);
      fragment.appendChild(document.createTextNode(slice));
    }

    // Append highlighted markup element
    const markEl = document.createElement('mark');
    markEl.className = `doc-markup-span mark-${item.color_tag || 'yellow'}`;
    markEl.setAttribute('data-markup-id', item.markup_id);
    markEl.setAttribute('tabindex', '0');
    markEl.setAttribute('role', 'button');
    markEl.setAttribute('aria-haspopup', 'dialog');
    markEl.setAttribute('title', `${markupCategoryLabel(item)}: ${item.critique}`);
    markEl.textContent = text.substring(item.start_char, item.end_char);
    // The category is available as text: colour and underline style only repeat it.
    markEl.setAttribute('aria-label', `${markupCategoryLabel(item)}: ${markEl.textContent}. Open the suggestion.`);

    markEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openMarkupPopover(item.markup_id, markEl);
    });

    markEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        openMarkupPopover(item.markup_id, markEl);
      }
    });

    fragment.appendChild(markEl);
    cursor = item.end_char;
  }

  // Append remaining text
  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.substring(cursor)));
  }

  container.innerHTML = '';
  container.appendChild(fragment);
}

function openMarkupPopover(markupId, anchorEl) {
  const item = appState.resumeDraft.markupItems.find(m => m.markup_id === markupId);
  const popover = document.getElementById('markup-detail-popover');
  if (!item || !popover) return;

  document.querySelectorAll('.doc-markup-span.selected').forEach(el => el.classList.remove('selected'));
  if (anchorEl) anchorEl.classList.add('selected');
  appState.resumeDraft.selectedMarkupId = markupId;
  appState.resumeDraft.popoverAnchorId = markupId;
  hideInlineError('popover-error');

  const dot = document.getElementById('popover-color-dot');
  const catTag = document.getElementById('popover-category-tag');
  const sevTag = document.getElementById('popover-severity-tag');
  const quoteText = document.getElementById('popover-quoted-text');
  const critiqueText = document.getElementById('popover-critique-text');
  const rewriteInput = document.getElementById('popover-rewrite-input');
  const rewriteBox = document.getElementById('popover-rewrite-box');
  const applyBtn = document.getElementById('popover-apply-btn');
  const closeBtn = document.getElementById('popover-dismiss-btn');
  const replaceable = markupIsReplaceable(item);

  if (dot) dot.className = `legend-dot ${item.color_tag || 'yellow'}`;
  if (catTag) catTag.textContent = markupCategoryLabel(item);
  if (sevTag) sevTag.textContent = String(item.severity || 'Review').replace(/^\w/, c => c.toUpperCase());
  if (quoteText) quoteText.textContent = `"${item.original_text}"`;
  if (critiqueText) critiqueText.textContent = replaceable ? item.critique : `${item.critique} ${item.suggested_rewrite}`;
  if (rewriteInput) rewriteInput.value = replaceable ? item.suggested_rewrite : '';
  if (rewriteBox) rewriteBox.hidden = !replaceable;
  if (applyBtn) applyBtn.hidden = !replaceable;

  popover.style.display = 'flex';
  positionMarkupPopover(popover, anchorEl);
  if (replaceable && rewriteInput) rewriteInput.focus();
  else if (closeBtn) closeBtn.focus();
}

// Beside the span on wide screens; below 640 px the stylesheet makes it a bottom sheet.
function positionMarkupPopover(popover, anchorEl) {
  popover.style.top = '';
  popover.style.left = '';
  if (!anchorEl || window.matchMedia('(max-width: 640px)').matches) return;
  const parent = popover.offsetParent || document.body;
  const parentRect = parent.getBoundingClientRect();
  const anchorRect = anchorEl.getBoundingClientRect();
  const gap = 8;
  const left = Math.max(gap, Math.min(anchorRect.left - parentRect.left, parentRect.width - popover.offsetWidth - gap));
  const fitsBelow = anchorRect.bottom + gap + popover.offsetHeight <= window.innerHeight;
  const fitsAbove = anchorRect.top - gap - popover.offsetHeight >= 0;
  const top = !fitsBelow && fitsAbove
    ? anchorRect.top - parentRect.top - popover.offsetHeight - gap
    : anchorRect.bottom - parentRect.top + gap;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function closeMarkupPopover({ restoreFocus = true } = {}) {
  const popover = document.getElementById('markup-detail-popover');
  const wasOpen = markupPopoverOpen();
  if (popover) popover.style.display = 'none';
  const draft = appState.resumeDraft;
  const anchorId = draft.popoverAnchorId;
  draft.selectedMarkupId = null;
  draft.popoverAnchorId = null;
  document.querySelectorAll('.doc-markup-span.selected').forEach(el => el.classList.remove('selected'));
  if (wasOpen && restoreFocus && anchorId) {
    const anchor = document.querySelector(`.doc-markup-span[data-markup-id="${CSS.escape(anchorId)}"]`);
    if (anchor) anchor.focus();
  }
}

// Marks after the edit move with it; marks that touched the replaced span no longer apply.
function rebaseMarkups(markups, start, end, delta, appliedId) {
  return markups
    .filter(m => m.markup_id !== appliedId && (m.end_char <= start || m.start_char >= end))
    .map(m => (m.start_char >= end
      ? { ...m, start_char: m.start_char + delta, end_char: m.end_char + delta }
      : m));
}

function applyMarkupReplacement() {
  const draft = appState.resumeDraft;
  const item = draft.markupItems.find(m => m.markup_id === draft.selectedMarkupId);
  const rewriteInput = document.getElementById('popover-rewrite-input');
  if (!item || !rewriteInput) return;

  const currentText = draft.displayText;
  const newSegment = rewriteInput.value.trim();

  if (!newSegment) {
    showInlineError('popover-error', 'Enter the replacement text first. Nothing was changed.');
    rewriteInput.focus();
    return;
  }
  if (/\[insert\b/i.test(newSegment)) {
    showInlineError('popover-error', 'Replace the text in [brackets] with your own facts first, or remove it. Nothing was changed.');
    rewriteInput.focus();
    return;
  }
  // The exact span must still hold the text this suggestion was made for. Offsets are the
  // only way to find it: a similar phrase elsewhere is never touched.
  if (currentText.substring(item.start_char, item.end_char) !== item.original_text) {
    showInlineError('popover-error', 'This passage has changed since the suggestion was made, so nothing was applied. Recalculate to get fresh suggestions.');
    return;
  }

  const revisedText = currentText.substring(0, item.start_char) + newSegment + currentText.substring(item.end_char);
  const delta = newSegment.length - (item.end_char - item.start_char);
  const markups = rebaseMarkups(draft.markupItems, item.start_char, item.end_char, delta, item.markup_id);
  const previous = currentDraftEntry();
  draft.lastRevisionNumber += 1;
  const newRevisionId = `rev_${draft.lastRevisionNumber}`;

  draft.displayText = revisedText;
  draft.currentRevisionId = newRevisionId;
  draft.markupItems = markups;
  draft.draftHistory = draft.draftHistory.slice(0, draft.historyIndex + 1);
  draft.draftHistory.push({
    revisionId: newRevisionId,
    text: revisedText,
    markups,
    score: previous ? previous.score : null,
    breakdown: previous ? previous.breakdown : null,
    evidence: previous ? previous.evidence : null,
    scored: false,
    rescored: false,
    edits: [...(previous ? previous.edits : []), { before: item.original_text, after: newSegment }]
  });
  draft.historyIndex = draft.draftHistory.length - 1;

  closeMarkupPopover({ restoreFocus: false });
  renderDocumentViewer(revisedText, markups);
  renderDraftStatus();

  // Focus moves on to the next suggestion, or back to the document if none is left.
  const next = [...markups].sort((a, b) => a.start_char - b.start_char).find(m => m.start_char >= item.start_char);
  const nextEl = next && document.querySelector(`.doc-markup-span[data-markup-id="${CSS.escape(next.markup_id)}"]`);
  const viewport = document.getElementById('resume-document-viewport');
  if (nextEl) nextEl.focus();
  else if (viewport) viewport.focus();
  showToast(`Replacement applied as ${newRevisionId}. The score is not updated until you recalculate.`);
}

function restoreDraftRevision(index, verb) {
  const draft = appState.resumeDraft;
  draft.historyIndex = index;
  const entry = draft.draftHistory[index];
  draft.displayText = entry.text;
  draft.currentRevisionId = entry.revisionId;
  draft.markupItems = entry.markups || [];

  // The ring and rubric follow the revision they belong to.
  if (typeof entry.score === 'number') updateScoreRingFromNumber(entry.score);
  updateRubricBreakdown(entry.breakdown);
  renderSkillEvidence(entry.evidence);

  closeMarkupPopover({ restoreFocus: false });
  renderDocumentViewer(entry.text, draft.markupItems);
  renderDraftStatus();
  showToast(`${verb} to ${entry.revisionId}.`);
}

// The button that was used can become disabled at the end of the history.
function keepFocusAfterHistoryMove(usedId, otherId) {
  const used = document.getElementById(usedId);
  const other = document.getElementById(otherId);
  if (used && used.disabled && document.activeElement === used && other) other.focus();
}

function undoDraftEdit() {
  const draft = appState.resumeDraft;
  if (draft.historyIndex <= 0) return;
  const usedId = document.activeElement && document.activeElement.id;
  restoreDraftRevision(draft.historyIndex - 1, 'Undone');
  if (usedId === 'btn-draft-undo') {
    const undoBtn = document.getElementById('btn-draft-undo');
    const redoBtn = document.getElementById('btn-draft-redo');
    if (undoBtn && undoBtn.disabled && redoBtn) redoBtn.focus();
  } else if (usedId === 'btn-diff-undo') {
    const closeDiff = document.getElementById('btn-close-diff');
    const diffUndo = document.getElementById('btn-diff-undo');
    if (diffUndo && diffUndo.disabled && closeDiff) closeDiff.focus();
  }
}

function redoDraftEdit() {
  const draft = appState.resumeDraft;
  if (draft.historyIndex >= draft.draftHistory.length - 1) return;
  const usedRedo = document.activeElement && document.activeElement.id === 'btn-draft-redo';
  restoreDraftRevision(draft.historyIndex + 1, 'Redone');
  const redoBtn = document.getElementById('btn-draft-redo');
  const undoBtn = document.getElementById('btn-draft-undo');
  if (usedRedo && redoBtn && redoBtn.disabled && undoBtn) undoBtn.focus();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('btn-draft-undo');
  const redoBtn = document.getElementById('btn-draft-redo');

  if (undoBtn) undoBtn.disabled = appState.resumeDraft.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = appState.resumeDraft.historyIndex >= appState.resumeDraft.draftHistory.length - 1;
}

function toggleDiffDrawer() {
  const drawer = document.getElementById('draft-diff-drawer');
  const toggle = document.getElementById('btn-toggle-diff');
  if (!drawer) return;
  const open = drawer.style.display === 'none';
  drawer.style.display = open ? 'block' : 'none';
  appState.resumeDraft.diffOpen = open;
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
  if (open) renderDiffDrawer();
}

// Lists each applied change in words, beside the two full texts, and follows undo and redo.
function renderDiffDrawer() {
  const draft = appState.resumeDraft;
  const entry = currentDraftEntry();
  const edits = entry ? entry.edits : [];

  const undoBtn = document.getElementById('btn-diff-undo');
  if (undoBtn) undoBtn.disabled = draft.historyIndex <= 0;
  if (!draft.diffOpen) return;

  const summary = document.getElementById('diff-summary');
  if (summary) {
    summary.textContent = edits.length
      ? `${edits.length} ${edits.length === 1 ? 'change' : 'changes'} in this draft, held in this browser only. Your uploaded PDF is not changed.`
      : 'No changes yet. Apply a suggestion and it will be listed here. Your uploaded PDF is never changed.';
  }
  const list = document.getElementById('diff-change-list');
  if (list) {
    list.hidden = edits.length === 0;
    list.textContent = '';
    edits.forEach(edit => {
      const row = document.createElement('li');
      const before = document.createElement('del');
      before.className = 'diff-removal';
      before.textContent = edit.before;
      const after = document.createElement('ins');
      after.className = 'diff-addition';
      after.textContent = edit.after;
      row.append(before, ' became ', after);
      list.appendChild(row);
    });
  }
  const origBox = document.getElementById('diff-original-content');
  const editBox = document.getElementById('diff-edited-content');
  if (origBox) origBox.textContent = draft.originalText;
  if (editBox) editBox.textContent = draft.displayText;
}

async function recalculateDraftFit() {
  const recalcBtn = document.getElementById('btn-recalculate-draft');
  // Re-score against the job description this report was made for, not whatever the form holds now.
  const jd = (appState.analyzer.reportJobDescription || '').trim();
  const editedText = appState.resumeDraft.displayText;

  if (!editedText) {
    showToast('No active resume text to recalculate.');
    return;
  }

  if (recalcBtn) {
    recalcBtn.disabled = true;
    recalcBtn.innerHTML = '<i data-lucide="loader" class="spin" style="width:13px;height:13px;"></i> Recalculating...';
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const payload = {
      edited_text: editedText,
      job_description: jd,
      revision_id: appState.resumeDraft.currentRevisionId
    };
    if (appState.resumeDraft.documentId) payload.document_id = appState.resumeDraft.documentId;

    const response = await fetch(apiUrl('/api/markup/recalculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const snapshot = data.document_snapshot || {};
    // Markup offsets refer to the snapshot's canonical text, which may differ from the
    // edited text after normalization and redaction.
    const text = typeof snapshot.canonical_display_text === 'string' ? snapshot.canonical_display_text : editedText;
    const markups = data.resume_markups || [];
    appState.resumeDraft.textHash = snapshot.text_hash || '';
    appState.resumeDraft.displayText = text;
    appState.resumeDraft.markupItems = markups;

    // The score now belongs to this revision, so undo and redo can bring it back with the text.
    const entry = currentDraftEntry();
    if (entry) {
      entry.text = text;
      entry.markups = markups;
      entry.score = data.overall_score;
      entry.breakdown = data.score_breakdown;
      entry.evidence = skillEvidenceFrom(data);
      entry.scored = true;
      entry.rescored = true;
    }

    // The ring and the rubric follow the re-scored draft together, so the total matches its parts.
    updateScoreRingFromNumber(data.overall_score);
    updateRubricBreakdown(data.score_breakdown);
    renderSkillEvidence(entry ? entry.evidence : skillEvidenceFrom(data));

    closeMarkupPopover({ restoreFocus: false });
    renderDocumentViewer(text, markups);
    renderDraftStatus();
    showToast(`Draft re-scored: ${data.overall_score} of 100.`);

  } catch (err) {
    console.warn('The draft could not be re-scored:', err.message);
    showToast('The draft could not be re-scored. Your edits are kept. Try again in a moment.');
  } finally {
    if (recalcBtn) {
      recalcBtn.disabled = false;
      recalcBtn.innerHTML = '<i data-lucide="refresh-cw" style="width:13px;height:13px;"></i> Recalculate Fit';
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function exportDraftAsMarkdown() {
  const text = appState.resumeDraft.displayText;
  if (!text) {
    showToast('No resume draft to export.');
    return;
  }

  const entry = currentDraftEntry();
  const rev = appState.resumeDraft.currentRevisionId || 'rev_0';
  const scoreLine = entry && entry.scored && typeof entry.score === 'number'
    ? `Alignment score for this revision: ${entry.score}/100 (textual alignment, not a hiring probability)`
    : 'Alignment score: not updated since the last edit';
  const sourceLine = appState.analyzer.reportIsDemo
    ? 'Source: illustrative demo text, not a real resume'
    : 'Source: edited in this browser. Your uploaded PDF was not changed.';
  const mdContent = `# Hyperion Pathfinder — Tailored Resume Draft (${rev})
Export Date: ${new Date().toLocaleString()}
${scoreLine}
${sourceLine}

================================================================================
${text}
================================================================================
`;

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resume_tailored_${rev}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Download started: resume_tailored_${rev}.md`);
}

// --- 16.4 VOICE ASSISTANT CONTROLLER (STT & TTS) ---
function voiceEls() {
  const ids = {
    orb: 'voice-orb-btn',
    drawer: 'voice-assistant-drawer',
    record: 'voice-record-btn',
    recordText: 'voice-record-btn-text',
    apply: 'voice-apply-btn',
    preview: 'voice-transcript-preview',
    desc: 'voice-live-status-desc',
    dot: 'voice-status-dot',
    pill: 'voice-status-badge',
    surface: 'voice-pulse-surface',
    dest: 'voice-dest-select',
    source: 'voice-source-indicator'
  };
  return Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, document.getElementById(id)]));
}

// One place opens and closes the panel, so the button, the panel and the microphone cannot
// disagree: closing always stops listening.
function setVoiceDrawerOpen(open, { returnFocus = false } = {}) {
  const { orb, drawer, record } = voiceEls();
  if (!drawer) return;
  drawer.hidden = !open;
  drawer.classList.toggle('open', open);
  if (orb) {
    orb.setAttribute('aria-expanded', String(open));
    orb.setAttribute('aria-label', open ? 'Close dictation and spoken briefing' : 'Open dictation and spoken briefing');
  }
  if (!open) {
    stopVoiceRecognition();
    if (returnFocus && orb) orb.focus();
    return;
  }
  if (window.lucide) window.lucide.createIcons();
  if (record && !record.disabled) record.focus({ preventScroll: true });
}

function syncVoiceApplyButton() {
  const { apply, preview } = voiceEls();
  if (apply && preview) apply.disabled = !preview.value.trim();
}

function initVoiceAssistantController() {
  const { orb, drawer, record, apply, preview, dest, desc, source } = voiceEls();
  const closeBtn = document.getElementById('voice-drawer-close-btn');
  const discardBtn = document.getElementById('voice-discard-btn');
  const quickDictateBtn = document.getElementById('btn-quick-dictate-jd');
  const localeSelect = document.getElementById('voice-locale-select');

  if (orb && drawer) {
    orb.addEventListener('click', () => setVoiceDrawerOpen(drawer.hidden));
  }
  if (closeBtn) closeBtn.addEventListener('click', () => setVoiceDrawerOpen(false, { returnFocus: true }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && !drawer.hidden && !document.querySelector('.modal-backdrop.open')) {
      setVoiceDrawerOpen(false, { returnFocus: true });
    }
  });

  // Quick dictate from the job description field
  if (quickDictateBtn) {
    quickDictateBtn.addEventListener('click', () => {
      if (dest) dest.value = 'append_jd';
      setVoiceDrawerOpen(true);
      startVoiceRecognition();
    });
  }

  if (dest) dest.addEventListener('change', (e) => { appState.voice.destination = e.target.value; });
  if (localeSelect) {
    localeSelect.addEventListener('change', (e) => {
      appState.voice.locale = e.target.value;
      if (appState.voice.recognition) appState.voice.recognition.lang = e.target.value;
    });
  }

  if (record) {
    record.addEventListener('click', () => {
      if (appState.voice.status === 'listening') stopVoiceRecognition();
      else startVoiceRecognition();
    });
  }
  if (apply) apply.addEventListener('click', applyVoiceTranscript);
  if (discardBtn) discardBtn.addEventListener('click', discardVoiceTranscript);

  // Typing is always available, with or without a microphone.
  if (preview) {
    preview.addEventListener('input', () => {
      if (source) source.textContent = 'Typed or edited';
      syncVoiceApplyButton();
    });
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  appState.voice.sttSupport = SpeechRec ? 'supported' : 'unsupported';
  if (!SpeechRec) {
    if (record) record.disabled = true;
    if (desc) desc.textContent = 'This browser has no speech recognition. Type your text below, then press Insert.';
    if (source) source.textContent = 'Typing only';
  }
}

const VOICE_ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was refused. Allow it in your browser settings, or type below.',
  'service-not-allowed': 'Speech recognition is blocked in this browser. Type below instead.',
  'no-speech': 'No speech was heard. Check your microphone and try again, or type below.',
  'audio-capture': 'No microphone was found. Connect one and try again, or type below.',
  network: 'Speech recognition needs a network connection in this browser. Try again, or type below.',
  'language-not-supported': 'This language is not available here. Choose another, or type below.'
};

function startVoiceRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    updateVoiceUI('error', 'This browser has no speech recognition. Type your text below, then press Insert.');
    return;
  }
  if (appState.voice.status === 'listening') return;

  try {
    if (!appState.voice.recognition) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        appState.voice.status = 'listening';
        updateVoiceUI('listening', 'Listening. Your browser may be sending this audio to its speech service.');
      };

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            appState.voice.finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        appState.voice.interimTranscript = interim;
        const { preview, source } = voiceEls();
        if (preview) preview.value = (appState.voice.finalTranscript + ' ' + interim).trim();
        if (source) source.textContent = 'From browser speech recognition';
        syncVoiceApplyButton();
      };

      rec.onerror = (event) => {
        console.warn('Speech recognition stopped:', event.error);
        if (event.error === 'aborted') return;
        appState.voice.status = 'error';
        updateVoiceUI('error', VOICE_ERROR_MESSAGES[event.error] || 'Speech recognition stopped. Try again, or type below.');
      };

      rec.onend = () => {
        if (appState.voice.status === 'listening') {
          appState.voice.status = 'transcript_ready';
          updateVoiceUI('transcript_ready', 'Stopped listening. Review the text, then press Insert.');
        }
      };

      appState.voice.recognition = rec;
    }

    appState.voice.recognition.lang = appState.voice.locale || 'en-IN';
    appState.voice.recognition.start();
  } catch (err) {
    console.warn('Speech recognition could not start:', err.message);
    updateVoiceUI('error', 'The microphone could not start. Check its permission, or type below.');
  }
}

function stopVoiceRecognition() {
  if (appState.voice.recognition && appState.voice.status === 'listening') {
    appState.voice.status = 'transcript_ready';
    appState.voice.recognition.stop();
    updateVoiceUI('transcript_ready', 'Stopped listening. Review the text, then press Insert.');
  }
}

// Visible state, on the panel and on the button that stays on screen when the panel is closed.
function updateVoiceUI(status, label) {
  const { orb, record, recordText, desc, dot, pill, surface } = voiceEls();
  const listening = status === 'listening';
  const pillText = { listening: 'Listening', transcript_ready: 'Stopped', error: 'Stopped', idle: 'Ready' };

  if (desc) desc.textContent = label;
  if (recordText) recordText.textContent = listening ? 'Stop listening' : 'Start listening';
  if (record) record.classList.toggle('recording-active', listening);
  if (surface) surface.classList.toggle('listening', listening);
  if (orb) orb.classList.toggle('listening', listening);
  if (dot) dot.className = `voice-status-dot ${listening ? 'listening' : 'idle'}`;
  if (pill) pill.textContent = pillText[status] || 'Ready';
}

function applyVoiceTranscript() {
  const { preview, dest } = voiceEls();
  const transcriptText = (preview ? preview.value : appState.voice.finalTranscript).trim();
  if (!transcriptText) {
    showToast('There is no text to insert.');
    return;
  }

  const destination = dest ? dest.value : (appState.voice.destination || 'replace_jd');
  let focusTarget = null;

  if (destination === 'replace_jd' || destination === 'append_jd') {
    const jdTextarea = document.getElementById('jd-textarea');
    if (jdTextarea) {
      jdTextarea.value = destination === 'append_jd' && jdTextarea.value
        ? `${jdTextarea.value}\n\n${transcriptText}`
        : transcriptText;
      jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      focusTarget = jdTextarea;
      showToast(destination === 'append_jd' ? 'Text added to the job description.' : 'Text placed in the job description.');
    }
  } else if (destination === 'coach_message') {
    const coachInput = document.getElementById('coach-query-input');
    if (coachInput) {
      coachInput.value = transcriptText;
      switchResultsTab('pane-career-coach');
      focusTarget = coachInput;
      showToast('Text placed in the Career Coach question box. Press Ask to send it.');
    }
  }

  stopVoiceRecognition();
  discardVoiceTranscript();
  setVoiceDrawerOpen(false);
  if (focusTarget) {
    focusTarget.focus({ preventScroll: true });
    focusTarget.scrollIntoView({ block: 'center', behavior: appState.motionMode === 'reduced' ? 'auto' : 'smooth' });
  }
}

function discardVoiceTranscript() {
  appState.voice.finalTranscript = '';
  appState.voice.interimTranscript = '';
  const { preview, source } = voiceEls();
  if (preview) preview.value = '';
  if (source) source.textContent = appState.voice.sttSupport === 'unsupported' ? 'Typing only' : 'Typed or dictated';
  syncVoiceApplyButton();
  if (appState.voice.status !== 'listening') {
    appState.voice.status = 'idle';
    updateVoiceUI('idle', appState.voice.sttSupport === 'unsupported'
      ? 'This browser has no speech recognition. Type your text below, then press Insert.'
      : 'Press Start listening to dictate, or type below.');
  }
}

// --- 16.5 SPEECH SYNTHESIS (TTS) CONTROLLER ---
function initSpeechSynthesisController() {
  const quickTtsBtn = document.getElementById('btn-quick-play-tts');
  const drawerPlayBtn = document.getElementById('voice-tts-play-btn');
  const drawerPauseBtn = document.getElementById('voice-tts-pause-btn');
  const drawerStopBtn = document.getElementById('voice-tts-stop-btn');
  const speedBtns = document.querySelectorAll('.btn-tts-speed');

  if (quickTtsBtn) {
    quickTtsBtn.addEventListener('click', () => {
      toggleSpokenBriefing();
    });
  }

  if (drawerPlayBtn) drawerPlayBtn.addEventListener('click', toggleSpokenBriefing);
  if (drawerPauseBtn) drawerPauseBtn.addEventListener('click', pauseSpokenBriefing);
  if (drawerStopBtn) drawerStopBtn.addEventListener('click', stopSpokenBriefing);

  // Speech must not outlive the page, and a browser without it should not offer it.
  window.addEventListener('pagehide', () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  });
  if (!window.speechSynthesis) {
    const panel = document.querySelector('.voice-tts-panel');
    if (panel) panel.hidden = true;
    if (quickTtsBtn) quickTtsBtn.hidden = true;
  }

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const rate = parseFloat(btn.getAttribute('data-rate')) || 1.0;
      appState.voice.ttsRate = rate;
      showToast(`The briefing will play at ${rate}x.`);
    });
  });
}

function toggleSpokenBriefing() {
  if (!window.speechSynthesis) {
    showToast('This browser cannot read text aloud.');
    return;
  }

  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    pauseSpokenBriefing();
    return;
  }

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    appState.voice.ttsStatus = 'playing';
    updateTTSPlayButtons(true);
    return;
  }

  // Build spoken briefing text from current report
  const score = appState.analyzer.extractedScore;
  if (typeof score !== 'number') {
    showToast('No report yet. Run an analysis first.');
    return;
  }
  const review = appState.executiveReview.review;
  const personaTitle = review?.persona_title || 'Senior Engineering Reviewer';
  const reaction = review?.reaction_summary ? `Top impression: ${review.reaction_summary}.` : '';

  const spokenBriefingText = `
    Spoken briefing, written from the point of view of a simulated ${personaTitle}.
    Your resume's alignment score against this job description is ${score} out of 100.
    This measures how well the text matches. It is not a hiring probability.
    ${reaction}
    For suggested changes, open the Resume Tailoring tab.
  `;

  speakText(spokenBriefingText);
}

function speakText(rawText) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel(); // Stop any active playback

  // Normalize technical terms for natural speech
  let sanitized = (rawText || '')
    .replace(/\bC\+\+/g, 'C plus plus')
    .replace(/\b\.NET\b/g, 'dot net')
    .replace(/(\d+)\s*ms\b/gi, '$1 milliseconds')
    .replace(/(\d+)\s*%/g, '$1 percent')
    .replace(/p95/gi, 'p 95')
    .replace(/QPS/gi, 'queries per second');

  const utterance = new SpeechSynthesisUtterance(sanitized);
  utterance.rate = appState.voice.ttsRate || 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    appState.voice.ttsStatus = 'playing';
    updateTTSPlayButtons(true);
  };

  utterance.onend = () => {
    appState.voice.ttsStatus = 'idle';
    updateTTSPlayButtons(false);
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    appState.voice.ttsStatus = 'idle';
    updateTTSPlayButtons(false);
  };

  window.speechSynthesis.speak(utterance);
}

function pauseSpokenBriefing() {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    appState.voice.ttsStatus = 'paused';
    updateTTSPlayButtons(false, true);
  }
}

function stopSpokenBriefing() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    appState.voice.ttsStatus = 'idle';
    updateTTSPlayButtons(false);
  }
}

function updateTTSPlayButtons(isPlaying, isPaused = false) {
  const quickLabel = document.getElementById('tts-quick-btn-label');
  const drawerLabel = document.getElementById('tts-play-label');
  const pauseBtn = document.getElementById('voice-tts-pause-btn');
  const stopBtn = document.getElementById('voice-tts-stop-btn');

  if (quickLabel) quickLabel.textContent = isPlaying ? 'Pause briefing' : (isPaused ? 'Resume briefing' : 'Spoken briefing');
  if (drawerLabel) drawerLabel.textContent = isPlaying ? 'Pause' : (isPaused ? 'Resume' : 'Play briefing');
  if (pauseBtn) pauseBtn.disabled = !isPlaying && !isPaused;
  if (stopBtn) stopBtn.disabled = !isPlaying && !isPaused;
}

// --- 16.6 CAREER COACH CONTROLLER ---
function initCareerCoachController() {
  const sendBtn = document.getElementById('btn-send-coach-msg');
  const inputElem = document.getElementById('coach-query-input');
  const voiceBtn = document.getElementById('btn-coach-voice-input');
  const fwSelect = document.getElementById('coach-framework-select');
  const fwBadge = document.getElementById('coach-framework-badge');

  if (sendBtn && inputElem) {
    sendBtn.addEventListener('click', () => submitCoachQuery());
    // Enter asks; Shift+Enter starts a new line.
    inputElem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitCoachQuery();
      }
    });
  }
  updateCoachContextNote();

  if (fwSelect) {
    fwSelect.addEventListener('change', () => {
      const val = fwSelect.value;
      if (fwBadge) {
        fwBadge.textContent = val ? `Using ${val}` : 'Direct advice';
        fwBadge.classList.toggle('is-active', Boolean(val));
      }
      showToast(val ? `The coach will answer through ${val}.` : 'The coach will give direct advice.');
    });
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      const destSelect = document.getElementById('voice-dest-select');
      if (destSelect) destSelect.value = 'coach_message';
      setVoiceDrawerOpen(true);
      startVoiceRecognition();
    });
  }
}

// models.CoachChatRequest.message
const COACH_MESSAGE_MAX = 2000;

async function submitCoachQuery(overrideText) {
  const inputElem = document.getElementById('coach-query-input');
  const question = (overrideText || (inputElem ? inputElem.value : '')).trim();
  if (!question) return;
  if (question.length > COACH_MESSAGE_MAX) {
    showToast(`This question is over the ${COACH_MESSAGE_MAX.toLocaleString()} character limit. Shorten it, then press Ask.`);
    return;
  }

  if (inputElem) inputElem.value = '';

  const fwSelect = document.getElementById('coach-framework-select');
  const chosenFramework = fwSelect ? fwSelect.value : '';

  // 1. Render candidate user message
  appendCoachMessage('user', question);

  // 2. Render thinking indicator
  const thinkingId = 'thinking_' + Date.now();
  appendCoachThinking(thinkingId);

  try {
    // Only what the current report really contains: no default score, role or skills.
    const report = appState.reportData;
    const payload = {
      analysis_id: report?.analysis_id || ('coach_' + Date.now()),
      user_message: question,
      selected_persona_id: appState.executiveReview.selectedPersonaId || 'auto',
      relevant_markup_ids: [],
      matched_skills: (report?.matched_skills || []).map(skill => skill.canonical),
      missing_skills: report?.missing_required_skills || [],
      prompt_framework_id: chosenFramework,
      framework_id: chosenFramework
    };
    const score = appState.analyzer.extractedScore;
    if (typeof score === 'number') payload.current_score = score;
    const targetRole = report?.persona_review?.target_role;
    if (targetRole) payload.target_role = targetRole;

    const response = await fetch(apiUrl('/api/coach/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    removeCoachThinking(thinkingId);

    if (response.ok) {
      const data = await response.json();
      appendCoachMessage('assistant', data.answer, data.evidence_refs, data.spoken_briefing);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }

  } catch (err) {
    console.warn('The coach service did not answer:', err.message);
    removeCoachThinking(thinkingId);
    appendCoachMessage('assistant', coachFallbackReply(chosenFramework));
  }
}

// Tells the person what each answer can draw on.
function updateCoachContextNote() {
  const note = document.getElementById('coach-context-note');
  if (!note) return;
  const report = appState.reportData;
  const score = appState.analyzer.extractedScore;
  const engine = activeEngine && activeEngine.isLocal
    ? ' With no language model configured, answers come from templates.'
    : '';
  if (!report || typeof score !== 'number') {
    note.textContent = `No report yet, so answers are general guidance. Run an analysis to base them on your resume.${engine}`;
  } else if (appState.analyzer.reportIsDemo) {
    note.textContent = `Each question is sent with the illustrative demo report, not a real resume.${engine}`;
  } else {
    const matched = (report.matched_skills || []).length;
    const missing = (report.missing_required_skills || []).length;
    note.textContent = `Each question is sent with your latest report: ${score} of 100, ${matched} matched and ${missing} missing required skills.${engine}`;
  }
}

function askCoachPrompt(promptText) {
  switchResultsTab('pane-career-coach');
  submitCoachQuery(promptText);
}

function appendCoachMessage(sender, text, evidenceIds = [], spokenText = '') {
  const transcript = document.getElementById('coach-chat-transcript');
  if (!transcript) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `coach-msg coach-msg-${sender}`;

  if (sender === 'assistant') {
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = '<i data-lucide="bot" style="width:14px;height:14px;"></i>';
    msgDiv.appendChild(avatar);
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';

  if (sender === 'assistant') {
    // The coach answers in Markdown; it goes through the same sanitizer as the report.
    const body = document.createElement('div');
    body.className = 'coach-msg-body';
    body.innerHTML = markdownToSafeHtml(text);
    contentDiv.appendChild(body);
  } else {
    const p = document.createElement('p');
    p.textContent = text;
    contentDiv.appendChild(p);
  }

  // If coach message, add TTS audio button
  if (sender === 'assistant') {
    const actionsBar = document.createElement('div');
    actionsBar.className = 'coach-msg-actions';

    const speakBtn = document.createElement('button');
    speakBtn.type = 'button';
    speakBtn.className = 'btn-coach-action';
    speakBtn.innerHTML = '<i data-lucide="volume-2" style="width:12px;height:12px;"></i> Listen';
    speakBtn.onclick = () => speakText(spokenText || text);
    actionsBar.appendChild(speakBtn);

    if (evidenceIds && evidenceIds.length > 0) {
      const tag = document.createElement('span');
      tag.className = 'meta-tag';
      tag.textContent = `Evidence: ${evidenceIds.join(', ')}`;
      actionsBar.appendChild(tag);
    }

    contentDiv.appendChild(actionsBar);
  }

  msgDiv.appendChild(contentDiv);
  transcript.appendChild(msgDiv);
  transcript.scrollTop = transcript.scrollHeight;

  if (window.lucide) window.lucide.createIcons();
}

function appendCoachThinking(id) {
  const transcript = document.getElementById('coach-chat-transcript');
  if (!transcript) return;

  const div = document.createElement('div');
  div.id = id;
  div.className = 'coach-msg coach-msg-assistant';
  div.innerHTML = `
    <div class="msg-avatar"><i data-lucide="bot" style="width:14px;height:14px;"></i></div>
    <div class="msg-content"><p class="coach-thinking-dots">Preparing an answer<span>.</span><span>.</span><span>.</span></p></div>
  `;
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

function removeCoachThinking(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Shown only when the coach service fails. It says so, knows nothing about the resume, and
// contains no example figures that could be mistaken for the person's own results.
function coachFallbackReply(frameworkId) {
  const intro = 'The coach service did not respond, so this is general guidance, not an answer based on your resume.';
  const framework = frameworkId ? getStudioFramework(frameworkId) : null;
  if (framework) {
    const parts = framework.fields.map(field => `- **${field.label}**`).join('\n');
    return `${intro}\n\nTo answer through ${framework.id} (${framework.expansion}), cover each part with facts from your own work:\n\n${parts}`;
  }
  return `${intro}\n\nA strong resume bullet names the starting point, what you did, and the measured result. Use only numbers you can defend in an interview.`;
}


// Rubric meters, keyed by the component keys services/scoring.py emits. Caps come from
// each component's max_points; nothing is shown until a report supplies the values.
const RUBRIC_METERS = {
  required_skills: { id: 'skills', max: 35 },
  project_evidence: { id: 'projects', max: 25 },
  domain_responsibilities: { id: 'domain', max: 20 },
  metrics_density: { id: 'metrics', max: 10 },
  completeness_readability: { id: 'structure', max: 10 }
};

function formatRubricPoints(points) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

function setRubricMeter(meter, points, max, detail) {
  const valEl = document.getElementById(`meter-val-${meter.id}`);
  const fillEl = document.getElementById(`meter-fill-${meter.id}`);
  const detailEl = document.getElementById(`meter-detail-${meter.id}`);
  const known = typeof points === 'number';
  if (valEl) valEl.innerHTML = `${known ? formatRubricPoints(points) : '—'}<small>/${max}</small>`;
  if (fillEl) fillEl.style.width = known && max > 0 ? `${Math.min(100, (points / max) * 100)}%` : '0%';
  if (detailEl) detailEl.textContent = known && detail ? detail : '';
}

function resetRubricBreakdown() {
  Object.values(RUBRIC_METERS).forEach(meter => setRubricMeter(meter, null, meter.max, ''));
}

// Components missing from the report stay "—": a total is never split into invented parts.
function updateRubricBreakdown(breakdown) {
  resetRubricBreakdown();
  if (!Array.isArray(breakdown)) return;
  breakdown.forEach(item => {
    const meter = RUBRIC_METERS[item.key];
    if (!meter || typeof item.points_earned !== 'number') return;
    setRubricMeter(meter, item.points_earned, item.max_points || meter.max, item.detail);
  });
}

// What the server found per skill (models.SkillEvidenceItem). The wording keeps "not found in this
// document" apart from "does not have the skill", and nothing here affects the score.
const SKILL_EVIDENCE_GROUPS = [
  { status: 'demonstrated', label: 'Demonstrated with results' },
  { status: 'used', label: 'Used in projects' },
  { status: 'mentioned', label: 'Mentioned only' }
];

function skillEvidenceFrom(source) {
  return {
    matched: Array.isArray(source.matched_skills) ? source.matched_skills : [],
    missingRequired: Array.isArray(source.missing_required_skills) ? source.missing_required_skills : [],
    missingPreferred: Array.isArray(source.missing_preferred_skills) ? source.missing_preferred_skills : []
  };
}

function renderSkillEvidence(evidence) {
  const panel = document.getElementById('skill-evidence-panel');
  const groups = document.getElementById('skill-evidence-groups');
  const context = document.getElementById('skill-evidence-context');
  if (!panel || !groups) return;

  const hasAny = evidence && (evidence.matched.length || evidence.missingRequired.length || evidence.missingPreferred.length);
  panel.hidden = !hasAny;
  if (!hasAny) return;

  const row = (label, names, variant) => `
    <div class="skill-evidence-group${variant ? ` ${variant}` : ''}">
      <dt>${escapeHTML(label)} <span class="skill-evidence-count">${names.length}</span></dt>
      <dd><ul class="skill-chips">${names.map(name => `<li>${escapeHTML(String(name))}</li>`).join('')}</ul></dd>
    </div>`;
  const rows = SKILL_EVIDENCE_GROUPS
    .map(group => [group.label, evidence.matched.filter(s => s.evidence_status === group.status).map(s => s.canonical)])
    .filter(([, names]) => names.length)
    .map(([label, names]) => row(label, names));
  if (evidence.missingRequired.length) rows.push(row('Required, not found in this document', evidence.missingRequired, 'is-missing'));
  if (evidence.missingPreferred.length) rows.push(row('Preferred, not found in this document', evidence.missingPreferred, 'is-missing'));
  groups.innerHTML = rows.join('');

  if (context) {
    const report = appState.reportData || {};
    const parts = [];
    if (appState.analyzer.reportIsDemo) {
      parts.push('Illustrative sample, not computed from a resume.');
    } else {
      if (typeof report.alumni_precedents_used === 'number') parts.push(`Compared with ${report.alumni_precedents_used} alumni resumes for reference.`);
      if (report.detected_archetype) {
        parts.push(`Closest archetype: ${report.detected_archetype}${report.is_archetype_uncertain ? ' (uncertain)' : ''}.`);
      }
    }
    context.textContent = parts.join(' ');
    context.hidden = !parts.length;
  }
}

// The backend nests the canonical text and its revision in document_snapshot
// (models.ResumeDocumentSnapshot); markup offsets refer to that text.
function tailoringSourceFromReport(report) {
  const snapshot = report && report.document_snapshot;
  if (!snapshot || typeof snapshot.canonical_display_text !== 'string') return null;
  return {
    canonical_display_text: snapshot.canonical_display_text,
    revision_id: snapshot.revision_id,
    text_hash: snapshot.text_hash,
    document_id: snapshot.document_id,
    resume_markups: report.resume_markups || [],
    overall_score: report.overall_score,
    score_breakdown: report.score_breakdown,
    evidence: skillEvidenceFrom(report)
  };
}

// --- 16.7 STRUCTURED REPORT PARSING & DEMO HYDRATION ---
// Parsing has no side effects, so a response that fails it leaves the current report alone.
function readStructuredReport(streamBuffer) {
  const match = (streamBuffer || '').match(/<!-- STRUCTURED_REPORT_START -->([\s\S]*?)<!-- STRUCTURED_REPORT_END -->/);
  if (!match || !match[1]) return null;
  try {
    const report = JSON.parse(match[1]);
    return typeof report.overall_score === 'number' ? report : null;
  } catch (err) {
    console.warn('The structured report was not valid JSON.');
    return null;
  }
}

function hydrateStructuredReport(report) {
  appState.reportData = report;
  appState.analyzer.reportIsDemo = false;
  updateScoreRingFromNumber(report.overall_score);
  updateRubricBreakdown(report.score_breakdown);
  if (report.persona_review) renderExecutiveReview(report.persona_review);
  const tailoringSource = tailoringSourceFromReport(report);
  if (tailoringSource) hydrateResumeTailoring(tailoringSource);
  renderSkillEvidence(skillEvidenceFrom(report));
}

function hydrateDemoStructuredReport() {
  const demoResumeText = `INSTITUTE OF TECHNOLOGY
Kattankulathur, Chennai | B.Tech Computer Science & Engineering (2021-2025)

EXPERIENCE & PROJECTS

Distributed RAG & Embedding Search Engine
• Architected a high-throughput semantic search pipeline with FastAPI and FAISS IndexFlatL2, reducing p95 inference latency from 240ms to 125ms across 100k embedded documents.
• Worked on data loading and assisted with preprocessing pipelines using various technologies and Python scripts.
• Implemented batch matrix multiplication in PyTorch with mixed-precision FP16, measuring a 2.4x throughput speedup on benchmark splits.
• Team player responsible for deployment on AWS cloud infrastructure with Docker containers.
• Leveraged blockchain, quantum algorithms, and cutting-edge next-gen AI paradigms to maximize synergy and optimize holistic performance metrics.
• Created comprehensive unit test suite with 28 automated test cases achieving 92% code coverage.`;

  const demoMarkups = [
    {
      markup_id: 'm_demo_1',
      start_char: 226,
      end_char: 308,
      original_text: 'reducing p95 inference latency from 240ms to 125ms across 100k embedded documents.',
      category: 'metric_highlight',
      color_tag: 'green',
      severity: 'info',
      critique: 'High-impact quantified proof. Explicitly pairs benchmark scale (100k docs) with measured p95 latency reduction.',
      suggested_rewrite: 'maintaining p95 latency under 125ms at 100k document scale via FAISS IndexFlatL2'
    },
    {
      markup_id: 'm_demo_2',
      start_char: 311,
      end_char: 405,
      original_text: 'Worked on data loading and assisted with preprocessing pipelines using various technologies and',
      category: 'passive_verb',
      color_tag: 'yellow',
      severity: 'review',
      critique: 'Passive wording ("worked on", "assisted with", "various technologies") obscures direct contribution.',
      suggested_rewrite: 'Engineered an asynchronous multi-worker data ingestion pipeline in Python streaming [insert volume]'
    },
    {
      markup_id: 'm_demo_3',
      start_char: 423,
      end_char: 554,
      original_text: 'Implemented batch matrix multiplication in PyTorch with mixed-precision FP16, measuring a 2.4x throughput speedup on benchmark splits.',
      category: 'metric_highlight',
      color_tag: 'green',
      severity: 'info',
      critique: 'Concrete systems-level proof with framework specificity (PyTorch FP16) and relative performance benchmark.',
      suggested_rewrite: 'Implemented FP16 mixed-precision matrix operations in PyTorch, accelerating benchmark throughput by 2.4x'
    },
    {
      markup_id: 'm_demo_4',
      start_char: 557,
      end_char: 651,
      original_text: 'Team player responsible for deployment on AWS cloud infrastructure with Docker containers.',
      category: 'passive_verb',
      color_tag: 'yellow',
      severity: 'review',
      critique: 'Vague team clichés ("team player", "responsible for") without naming specific AWS services or deployment architecture.',
      suggested_rewrite: 'Configured multi-stage Docker build and deployed containerized service to AWS ECS with health-check endpoints'
    },
    {
      markup_id: 'm_demo_5',
      start_char: 654,
      end_char: 791,
      original_text: 'Leveraged blockchain, quantum algorithms, and cutting-edge next-gen AI paradigms to maximize synergy and optimize holistic performance metrics.',
      category: 'buzzword_gap',
      color_tag: 'red',
      severity: 'critical',
      critique: 'Dense buzzword overload with no verifiable technical implementation or measurable outcomes.',
      suggested_rewrite: 'Evaluated transformer attention heads and documented trade-offs between model size and [insert measured accuracy]'
    }
  ];

  // Derive offsets from the demo text itself. The hard-coded values drifted when
  // the first line was shortened, so every demo "Apply" failed its span check.
  demoMarkups.forEach(m => {
    const start = demoResumeText.indexOf(m.original_text);
    if (start >= 0) {
      m.start_char = start;
      m.end_char = start + m.original_text.length;
    }
  });

  const demoReview = {
    persona_id: 'director_ai_research',
    persona_title: 'Director of AI & Research',
    target_role: 'Data Science & AI/ML Engineer',
    verdict: 'promising_with_gaps',
    reaction_summary: 'Demonstrates genuine mathematical and systems foundations with PyTorch FP16 and latency benchmarking, but marred by vague project claims and buzzword overload that will attract scrutiny in research rounds.',
    what_catches_attention: [
      {
        statement: 'Measured p95 latency reduction from 240ms to 125ms with FAISS IndexFlatL2.',
        why_it_matters: 'Shows awareness of production retrieval limits and benchmarking rigor.'
      },
      {
        statement: 'Implemented PyTorch mixed-precision FP16 with 2.4x measured throughput speedup.',
        why_it_matters: 'Concrete proof of systems-level deep learning optimization.'
      }
    ],
    skepticism_points: [
      {
        statement: 'Claimed blockchain and quantum AI paradigms with no dataset, baseline, or evaluation splits.',
        why_it_matters: 'A research reviewer will question reproducibility and technical integrity.'
      },
      {
        statement: 'Vague data loading claim ("assisted with pipelines using various technologies").',
        why_it_matters: 'Conceals whether the candidate authored the data loader or merely executed an existing notebook.'
      }
    ],
    architecture_questions: [
      'What vector indexing strategy (IndexFlatIP vs HNSW) was chosen for FAISS, and what was the memory footprint at 100k embeddings?',
      'How did you prevent data leakage across train/validation splits during data preprocessing?',
      'What was the baseline model and error analysis for the 2.4x throughput test?'
    ],
    strategic_priorities: [
      {
        action: 'Replace buzzword bullet with concrete evaluation metrics and dataset split details',
        expected_improvement: 'High Impact — Eliminates red flags in senior interview panels',
        prerequisites: 'Identify actual test dataset and metric'
      },
      {
        action: 'Specify AWS service (ECS/EKS/Lambda) and Docker containerization parameters',
        expected_improvement: 'Medium Impact — Solidifies cloud engineering credibility',
        prerequisites: 'Review actual deployment configuration'
      }
    ]
  };

  // Same shape as the backend report. The breakdown is an illustrative fixture whose
  // components add up to the demo score; nothing here is computed from a resume.
  const demoDetail = 'Illustrative demo value, not computed from a resume.';
  const mockReport = {
    analysis_id: 'demo_analysis_' + Date.now(),
    overall_score: 86,
    score_breakdown: [
      { key: 'required_skills', name: 'Required Skills Coverage', points_earned: 30, max_points: 35, detail: demoDetail },
      { key: 'project_evidence', name: 'Practical Project Evidence', points_earned: 22, max_points: 25, detail: demoDetail },
      { key: 'domain_responsibilities', name: 'Role Domain Responsibilities', points_earned: 17, max_points: 20, detail: demoDetail },
      { key: 'metrics_density', name: 'Quantified Achievement Metrics', points_earned: 9, max_points: 10, detail: demoDetail },
      { key: 'completeness_readability', name: 'Completeness & Readability', points_earned: 8, max_points: 10, detail: demoDetail }
    ],
    document_snapshot: {
      document_id: 'demo_document',
      revision_id: 'rev_0',
      text_hash: 'demo_sha256_hash',
      canonical_display_text: demoResumeText
    },
    resume_markups: demoMarkups,
    persona_review: demoReview,
    matched_skills: [
      { canonical: 'FastAPI', evidence_status: 'demonstrated' },
      { canonical: 'FAISS', evidence_status: 'demonstrated' },
      { canonical: 'PyTorch', evidence_status: 'demonstrated' },
      { canonical: 'Docker', evidence_status: 'used' },
      { canonical: 'AWS', evidence_status: 'mentioned' }
    ],
    missing_required_skills: ['Kubernetes'],
    missing_preferred_skills: ['Kafka']
  };

  appState.reportData = mockReport;
  appState.analyzer.reportIsDemo = true;
  updateRubricBreakdown(mockReport.score_breakdown);
  renderExecutiveReview(demoReview);
  hydrateResumeTailoring(tailoringSourceFromReport(mockReport));
  renderSkillEvidence(skillEvidenceFrom(mockReport));
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==============================================================================
// 14. DESIGNHEAD AESTHETIC CONTROLLER (MINIMALIST ZEN VS MAXIMALIST CYBERPUNK)
// ==============================================================================
function initDesignheadController() {
  const btnMin = document.getElementById('btn-designhead-minimalist');
  const btnMax = document.getElementById('btn-designhead-maximalist');
  if (!btnMin || !btnMax) return;

  let savedMode = 'maximalist';
  try { savedMode = localStorage.getItem('resume_checker_mode') || 'maximalist'; } catch (err) { /* storage blocked */ }
  setDesignheadMode(savedMode, false);

  btnMin.addEventListener('click', () => setDesignheadMode('minimalist', true));
  btnMax.addEventListener('click', () => setDesignheadMode('maximalist', true));
}

function setDesignheadMode(mode, triggerToast = true) {
  const btnMin = document.getElementById('btn-designhead-minimalist');
  const btnMax = document.getElementById('btn-designhead-maximalist');

  if (mode === 'minimalist') {
    document.body.classList.remove('designhead-maximalist');
    document.body.classList.add('designhead-minimalist');
    if (btnMin) { btnMin.classList.add('active'); btnMin.setAttribute('aria-checked', 'true'); }
    if (btnMax) { btnMax.classList.remove('active'); btnMax.setAttribute('aria-checked', 'false'); }
    if (triggerToast) showToast('3D detail: Low', 'info');
  } else {
    document.body.classList.remove('designhead-minimalist');
    document.body.classList.add('designhead-maximalist');
    if (btnMax) { btnMax.classList.add('active'); btnMax.setAttribute('aria-checked', 'true'); }
    if (btnMin) { btnMin.classList.remove('active'); btnMin.setAttribute('aria-checked', 'false'); }
    if (triggerToast) showToast('3D detail: High', 'info');
  }

  try { localStorage.setItem('resume_checker_mode', mode); } catch (err) { /* preference only */ }

  if (typeof update3DSceneAesthetic === 'function') {
    update3DSceneAesthetic(mode);
  }
}

// ==============================================================================
// 15. LLM SERVICE RUNTIME MANAGEMENT & TELEMETRY HUB
// ==============================================================================
let cachedLLMProviders = [];
let activeEngine = null; // { name, isLocal } from GET /api/llm/providers

function initLLMControlHub() {
  const openBtn = document.getElementById('btn-llm-control-hub');
  const closeBtn = document.getElementById('btn-close-llm-modal');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (prefsDisclosure) prefsDisclosure.setOpen(false);
      refreshLLMProvidersList();
      openModal('modal-llm-control-hub');
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('modal-llm-control-hub'));
  refreshLLMProvidersList();
}

// Read-only view of GET /api/llm/providers. Switching engines is a server
// configuration task; the browser never sends or stores provider credentials.
async function refreshLLMProvidersList() {
  try {
    const res = await fetch(apiUrl('/api/llm/providers'));
    if (!res.ok) return;
    const data = await res.json();
    cachedLLMProviders = data.providers || [];

    // The local provider is deterministic template synthesis, not a language
    // model; say so instead of showing a model name. Detect it by its stable
    // model id rather than by a display string.
    const isLocalEngine = data.active_model === 'deterministic-fallback';
    activeEngine = { name: data.active_provider, isLocal: isLocalEngine };
    updateCoachContextNote();
    const navLabel = document.getElementById('nav-active-llm-label');
    const activeName = document.getElementById('llm-active-name');
    const activeModel = document.getElementById('llm-active-model-tag');
    const activeNote = document.getElementById('llm-active-note');
    if (navLabel) navLabel.textContent = isLocalEngine ? 'Local engine (no LLM)' : data.active_provider;
    if (activeName) activeName.textContent = data.active_provider;
    if (activeModel) activeModel.textContent = data.active_model;
    if (activeNote) {
      activeNote.textContent = isLocalEngine
        ? 'No language model is configured, so reports come from the deterministic local engine.'
        : 'Reports are written by this model; the score itself always comes from the fixed rubric.';
    }

    const list = document.getElementById('llm-provider-list');
    if (list) {
      list.innerHTML = cachedLLMProviders.map(p => {
        const isActive = p.name === data.active_provider;
        // Only claim what the backend reports: whether a key is set, not whether a service is up.
        const status = isActive ? 'Active'
          : p.requires_key ? (p.is_ready ? 'Key set on the server' : 'Not configured')
          : 'No key needed';
        return `
          <li class="engine-item${isActive ? ' is-active' : ''}">
            <div>
              <strong>${escapeHTML(p.name)}</strong>
              <p>${escapeHTML(p.description || '')}</p>
            </div>
            <span class="engine-status ${isActive ? 'is-active' : (p.requires_key && p.is_ready ? 'is-ready' : 'is-off')}">${status}</span>
          </li>`;
      }).join('');
    }
  } catch (err) {
    console.warn('Unable to query /api/llm/providers:', err);
  }
}




// ==============================================================================

// ==============================================================================
// 17. PLACEMENT SNAPSHOT CONTROLLER (17-SEP-2026 HAVELOC DATASET)
// ==============================================================================
// Every figure in the snapshot section comes from placement_snapshot_2026.json;
// nothing is duplicated in markup. If the file cannot be loaded, the section says so.
function initPlacementSnapshot() {
  const tableBody = document.getElementById('snapshot-table-body');
  if (!tableBody) return;

  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-use-context');
    if (btn) useCompanyAsAnalyzerTarget(btn.getAttribute('data-company'), btn.getAttribute('data-highest'));
  });

  const searchInput = document.getElementById('snapshot-company-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterSnapshotTable(searchInput.value));
  }

  fetch(apiUrl('/placement_snapshot_2026.json'))
    .then(res => {
      if (!res.ok) throw new Error('Snapshot endpoint returned ' + res.status);
      return res.json();
    })
    .then(data => {
      if (!data || !Array.isArray(data.top_recruiters)) throw new Error('Unexpected snapshot schema');
      appState.placementSnapshot = data;
      renderPlacementSnapshot(data);
      renderCompanyDirectory(); // swap the directory's dashes for report figures
      renderEvidenceStrip();
    })
    .catch(err => {
      console.warn('Placement snapshot unavailable:', err);
      const status = document.getElementById('snapshot-status');
      if (status) {
        status.hidden = false;
        status.textContent = 'The 2026 snapshot file could not be loaded, so no placement figures are shown. Reload the page to try again.';
      }
    });
}

function filterSnapshotTable(query) {
  const q = (query || '').toLowerCase().trim();
  let shown = 0;
  document.querySelectorAll('#snapshot-table-body tr').forEach(row => {
    row.hidden = q !== '' && !(row.getAttribute('data-company') || '').toLowerCase().includes(q);
    if (!row.hidden) shown += 1;
  });
  const empty = document.getElementById('snapshot-empty');
  if (empty) empty.hidden = shown > 0;
}

// Hand a recruiter from the snapshot to the analyzer as the target context.
function useCompanyAsAnalyzerTarget(company, highest) {
  const jdInput = document.getElementById('jd-textarea');
  if (!jdInput || !company) return;
  const contextNote = `Target company: ${company} (2026 snapshot: highest listed CTC ₹${highest} LPA)\nRole expectations:\n`;
  if (!jdInput.value.trim()) {
    jdInput.value = contextNote;
  } else if (!jdInput.value.includes(company)) {
    jdInput.value = contextNote + jdInput.value;
  }
  jdInput.dispatchEvent(new Event('input', { bubbles: true }));
  showToast(`Added ${company} as the target. Paste the job description and upload your resume.`);
  const analyzerSec = document.getElementById('analyzer');
  if (analyzerSec) analyzerSec.scrollIntoView({ behavior: appState.motionMode === 'reduced' ? 'auto' : 'smooth' });
}

function renderPlacementSnapshot(data) {
  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const el = byId(id);
    if (el && value !== undefined && value !== null) el.textContent = String(value);
  };
  const lpa = (value) => `₹${escapeHTML(String(value))}<span class="unit">LPA</span>`;
  const count = (value) => Number(value).toLocaleString('en-IN');

  setText('kpi-total-offers', count(data.total_offers));
  setText('kpi-unique-employers', count(data.unique_employers));
  setText('kpi-job-profiles', count(data.job_profiles));
  [['kpi-avg-ctc', data.average_ctc_lpa], ['kpi-median-ctc', data.median_ctc_lpa], ['kpi-highest-ctc', data.highest_ctc_lpa]]
    .forEach(([id, value]) => { if (byId(id) && typeof value === 'number') byId(id).innerHTML = lpa(value); });
  if (data.highest_ctc_company) setText('kpi-note-highest', `${data.highest_ctc_company}, the single highest offer`);

  const meta = {
    source_name: data.source_name,
    source_snapshot_date: data.source_snapshot_date ? formatSnapshotDate(data.source_snapshot_date) : null,
    batch: data.batch
  };
  document.querySelectorAll('[data-snapshot]').forEach(el => {
    const value = meta[el.getAttribute('data-snapshot')];
    if (value) el.textContent = value;
  });

  // Offer bands: horizontal bars scaled to the top band, value always printed.
  const bands = Array.isArray(data.top_offer_bands) ? data.top_offer_bands : [];
  const bandList = byId('offer-bands-list');
  if (bandList && bands.length) {
    const max = Math.max(...bands.map(b => b.average_ctc_lpa));
    bandList.innerHTML = bands.map(b => `
      <li class="band-row">
        <span class="band-label">${escapeHTML(String(b.band))}</span>
        <span class="band-track" aria-hidden="true"><span class="band-fill" style="--w:${(b.average_ctc_lpa / max * 100).toFixed(1)}%"></span></span>
        <span class="band-value">₹${Number(b.average_ctc_lpa).toFixed(2)} LPA</span>
      </li>`).join('');
    const first = bands[0];
    const last = bands[bands.length - 1];
    setText('bands-summary', `The ${first.band.toLowerCase()} offers averaged ₹${first.average_ctc_lpa} LPA. Across the ${last.band.toLowerCase()} the average falls to ₹${last.average_ctc_lpa} LPA, against a median offer of ₹${data.median_ctc_lpa} LPA.`);
    animateOnFirstView(bandList);
  }

  // Categories: a ranked list of counts, never a share-of-whole chart.
  const catList = byId('category-rank-list');
  if (catList && Array.isArray(data.categories)) {
    catList.innerHTML = [...data.categories]
      .sort((a, b) => b.count - a.count)
      .map(c => `<li><span class="cat-name">${escapeHTML(String(c.category))}</span><span class="cat-count">${count(c.count)}</span></li>`)
      .join('');
  }

  // Recruiters table; a small bar sits beside each offer count, which stays visible.
  const tableBody = byId('snapshot-table-body');
  if (tableBody) {
    const maxOffers = Math.max(...data.top_recruiters.map(r => r.offers));
    tableBody.innerHTML = data.top_recruiters.map(r => {
      const company = escapeHTML(String(r.company));
      return `
        <tr data-company="${company}">
          <td class="num">${r.rank}</td>
          <td><strong>${company}</strong></td>
          <td class="num"><span class="offer-cell"><span class="offer-spark" aria-hidden="true"><i style="--w:${(r.offers / maxOffers * 100).toFixed(1)}%"></i></span>${count(r.offers)}</span></td>
          <td class="num">${count(r.profiles)}</td>
          <td class="num">₹${escapeHTML(String(r.highest_ctc_lpa))} LPA</td>
          <td><button type="button" class="btn-use-context" data-company="${company}" data-highest="${escapeHTML(String(r.highest_ctc_lpa))}" aria-label="Use ${company} as the analyzer target">Target</button></td>
        </tr>`;
    }).join('');
    const searchInput = byId('snapshot-company-search');
    if (searchInput && searchInput.value) filterSnapshotTable(searchInput.value);
  }

  setText('caveat-students', data.students_placed_note);
  setText('caveat-categories', data.category_sum_caveat);
  if (typeof data.offers_without_ctc === 'number') setText('caveat-no-ctc-count', count(data.offers_without_ctc));
}

// Adds .animate the first time an element scrolls into view (never again).
function animateOnFirstView(el) {
  if (appState.motionMode === 'reduced' || typeof IntersectionObserver === 'undefined') return;
  const observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      el.classList.add('animate');
      observer.disconnect();
    }
  }, { threshold: 0.3 });
  observer.observe(el);
}


// 16. INITIALIZE ON DOM READY
// ==============================================================================
// ==============================================================================
// MASTHEAD, CAREER ATLAS LEGEND & EVIDENCE STRIP
// ==============================================================================

// A small disclosure (button + panel) that closes on Escape or an outside click
// and returns focus to its trigger.
function initDisclosure(triggerId, panelId, { useHidden = false, onToggle } = {}) {
  const trigger = document.getElementById(triggerId);
  const panel = document.getElementById(panelId);
  if (!trigger || !panel) return null;

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';
  const setOpen = (open, { restoreFocus = false } = {}) => {
    trigger.setAttribute('aria-expanded', String(open));
    if (useHidden) panel.hidden = !open;
    else panel.classList.toggle('open', open);
    if (onToggle) onToggle(open);
    if (!open && restoreFocus) trigger.focus();
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!isOpen());
  });
  document.addEventListener('click', (e) => {
    if (isOpen() && !panel.contains(e.target) && !trigger.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false, { restoreFocus: true });
  });
  return { setOpen, isOpen };
}

let prefsDisclosure = null;

function initMasthead() {
  prefsDisclosure = initDisclosure('btn-prefs', 'prefs-panel', { useHidden: true });

  // "Open preferences" in the interaction section opens the same panel.
  const openPrefs = document.getElementById('btn-open-prefs');
  if (openPrefs) {
    openPrefs.addEventListener('click', (e) => {
      e.stopPropagation(); // otherwise the outside-click handler closes it again
      if (!prefsDisclosure) return;
      prefsDisclosure.setOpen(true);
      const first = document.querySelector('#prefs-panel button');
      if (first) first.focus();
    });
  }
  const more = initDisclosure('btn-nav-more', 'nav-more-menu');

  // The mobile drawer reuses #nav-links-menu; close it after navigating.
  const navLinks = document.getElementById('nav-links-menu');
  const mobileBtn = document.getElementById('btn-mobile-menu');
  const closeDrawer = () => {
    if (navLinks) navLinks.classList.remove('mobile-open');
    if (mobileBtn) {
      mobileBtn.setAttribute('aria-expanded', 'false');
      mobileBtn.setAttribute('aria-label', 'Open navigation menu');
    }
    if (more) more.setOpen(false);
  };
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeDrawer));
  }
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      const open = mobileBtn.getAttribute('aria-expanded') === 'true';
      mobileBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks && navLinks.classList.contains('mobile-open')) {
      closeDrawer();
      if (mobileBtn) mobileBtn.focus();
    }
  });

  initSectionScrollSpy();
}

// Marks the nav link of the section currently in view (aria-current + .active).
function initSectionScrollSpy() {
  if (typeof IntersectionObserver === 'undefined') return;
  const links = Array.from(document.querySelectorAll('#nav-links-menu a.nav-link-btn[href^="#"]'));
  const byId = new Map(links.map(link => [link.getAttribute('href').slice(1), link]));
  const sections = Array.from(byId.keys()).map(id => document.getElementById(id)).filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      });
      const link = byId.get(entry.target.id);
      if (link) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(section => observer.observe(section));
}

// Legend of the five archetypes beside the 3D stage. Labels and counts come
// from GET /api/corpus-summary, keyed by cluster id.
function renderAtlasLegend() {
  const summary = appState.corpusSummary;
  if (summary && Array.isArray(summary.archetypes)) {
    summary.archetypes.forEach(entry => {
      const item = document.querySelector(`.atlas-legend-item[data-archetype-id="${entry.cluster_id}"]`);
      if (!item) return;
      const name = item.querySelector('.legend-name');
      const count = item.querySelector('.legend-count');
      if (name && entry.label) name.textContent = entry.label;
      if (count) {
        count.textContent = String(entry.count);
        count.setAttribute('aria-label', `${entry.count} records`);
      }
      // The bar shows the cluster's share of the corpus, from the same summary as the count.
      if (typeof entry.count === 'number' && summary.total_indexed_vectors) {
        item.style.setProperty('--legend-share', `${(entry.count / summary.total_indexed_vectors) * 100}%`);
      }
    });
  }
  document.querySelectorAll('.atlas-legend-item').forEach(item => {
    const id = parseInt(item.getAttribute('data-archetype-id'), 10);
    const selected = id === appState.genome.selectedArchetypeId;
    item.classList.toggle('is-selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
}

function initAtlasLegend() {
  document.querySelectorAll('.atlas-legend-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.getAttribute('data-archetype-id'), 10);
      if (!Number.isNaN(id) && typeof selectArchetype === 'function') selectArchetype(id);
      renderAtlasLegend();
      const arch = archetypesDatabase.find(a => a.id === id);
      if (arch) {
        const c = getArchetypeCorpusCount(arch);
        announceAtlasStatus(`Selected ${getArchetypeLabel(arch)}${c ? `: ${c.count} resumes, ${c.pct}% of the corpus` : ''}.`);
      }
    });
  });
  renderAtlasLegend();
  loadCorpusSummary().then(() => {
    renderAtlasLegend();
    renderEvidenceStrip();
  });
}

function formatSnapshotDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Fills [data-evidence] slots from the two sources, which stay separate:
// the alumni corpus summary (panel A) and the 2026 placement snapshot (panel B).
function renderEvidenceStrip() {
  const values = {};
  const corpus = appState.corpusSummary;
  if (corpus) {
    values.source_count = corpus.source_count;
    values.archetype_count = Array.isArray(corpus.archetypes) ? corpus.archetypes.length : undefined;
    values.embedding_dimension = corpus.embedding_dimension;
    values.valid_document_count = corpus.valid_document_count;
    values.degraded_document_count = corpus.degraded_document_count;
    if (corpus.dataset_version) values.dataset_version = `v${corpus.dataset_version}`;
  }
  const snap = appState.placementSnapshot;
  if (snap) {
    if (typeof snap.total_offers === 'number') values.total_offers = snap.total_offers.toLocaleString('en-IN');
    values.unique_employers = snap.unique_employers;
    values.job_profiles = snap.job_profiles;
    if (typeof snap.average_ctc_lpa === 'number') values.average_ctc_lpa = `₹${snap.average_ctc_lpa}`;
    if (typeof snap.median_ctc_lpa === 'number') values.median_ctc_lpa = `₹${snap.median_ctc_lpa}`;
    values.source_name = snap.source_name;
    if (snap.source_snapshot_date) values.source_snapshot_date = formatSnapshotDate(snap.source_snapshot_date);
  }
  document.querySelectorAll('[data-evidence]').forEach(el => {
    const value = values[el.getAttribute('data-evidence')];
    if (value !== undefined && value !== null && value !== '') el.textContent = String(value);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  // 1. Accessibility, Motion & Theme Setup
  initAccessibilityAndMotion();
  initMasthead();
  initThemeSwitcher();
  initDesignheadController();

  // 2. 3D WebGL Constellation & Spatial Engine
  init3DScene();

  // 3. Card Parallax Tilt & Specular Glare Physics
  init3DCardTilt();
  initHoverButtons();
  initEditorialRevealSystem();

  // 4. Backend Health Check & LLM Hub
  checkBackendHealth();
  initLLMControlHub();

  // 4.5 Placement Snapshot (17-Sep-2026 SRMIST)
  initPlacementSnapshot();

  // 5. Resume Analyzer Workspace
  initResumeAnalyzer();

  // 6. Career Genome & Archetypes
  initCareerGenome();
  initAtlasLegend();

  // 7. Company Intelligence Directory
  initCompanyIntelligence();

  // 8. Prompt Studio with 18 Frameworks
  initPromptStudio();

  // 9. Interaction Lab & Neumorphic Studio
  initInteractionLab();
  initNeumorphicWorkbench();
  initNeumorphicLightingPuck();

  // 10. Voice Assistant, Senior Executive Review & In-Doc Tailoring Setup
  initResultsWorkspaceTabs();
  initExecutivePersonaSelector();
  initResumeTailoringController();
  initVoiceAssistantController();
  initSpeechSynthesisController();
  initCareerCoachController();
  initSpatialAudioController();

});

// Explicit Global Window Exports for Inline & External Triggers
window.setTheme = setTheme;
window.setDesignheadMode = setDesignheadMode;
window.reset3DCamera = reset3DCamera;
window.setNeuPreviewShape = setNeuPreviewShape;
window.switchResultsTab = switchResultsTab;
window.askCoachPrompt = askCoachPrompt;
window.openMarkupPopover = openMarkupPopover;
window.closeMarkupPopover = closeMarkupPopover;
window.enableDemoAndRun = enableDemoAndRun;



