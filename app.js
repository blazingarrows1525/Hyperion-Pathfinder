
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
    if (label) label.textContent = this.enabled ? 'Sound: On' : 'Sound: Off';
    if (this.enabled) this.click();
    showToast(this.enabled ? 'Spatial Audio Synthesizer: Active' : 'Spatial Audio: Muted');
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

// Full-Page Ambient Spatial Canvas with Cosmic Dust Parallax
function initAmbientSpatialCanvas() {
  const canvas = document.getElementById('ambient-spatial-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }, { passive: true });

  const particleCount = 65;
  const stars = [];
  const colors = ['#00F2FE', '#9D4EDD', '#00F5D4', '#FFB703', '#FFFFFF'];

  for (let i = 0; i < particleCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.8 + 0.2,
      r: Math.random() * 1.8 + 0.6,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  let mouseShiftX = 0;
  let mouseShiftY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseShiftX = (e.clientX / width - 0.5) * 35;
    mouseShiftY = (e.clientY / height - 0.5) * 35;
  }, { passive: true });

  function renderAmbient() {
    if (appState.motionMode === 'reduced') {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    ctx.clearRect(0, 0, width, height);
    const scrollY = window.scrollY || 0;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += s.vx;
      s.y += s.vy;

      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;

      const px = s.x + mouseShiftX * s.z;
      const py = ((s.y - scrollY * s.z * 0.12) % height + height) % height;

      ctx.beginPath();
      ctx.arc(px, py, s.r * s.z, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha * s.z;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    requestAnimationFrame(renderAmbient);
  }
  requestAnimationFrame(renderAmbient);
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
  backendBaseUrl: 'http://127.0.0.1:8000',

  // Analyzer State
  analyzer: {
    selectedFile: null,
    jobDescription: '',
    status: 'idle', // 'idle' | 'validating' | 'uploading' | 'analyzing' | 'streaming' | 'complete' | 'error'
    abortController: null,
    streamBuffer: '',
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
    sortBy: 'alumni', // 'alumni' | 'name' | 'tier'
    selectedCompanyId: null
  },

  // Prompt Studio State (All 18 Frameworks)
  promptStudio: {
    selectedFrameworkId: 'CLEAR',
    categoryFilter: 'all',
    searchQuery: '',
    formData: {},
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
    draftHistory: [], // [{ revisionId, text, markups, score }]
    historyIndex: -1,
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
// 2. THE 18 PROMPT FRAMEWORKS REGISTRY (POSTER A & POSTER B)
// ==============================================================================
const promptFrameworksRegistry = [
  // --- POSTER A: RESEARCH & STRUCTURED WORK ---
  {
    id: 'CLEAR',
    name: 'CLEAR Framework',
    acronym: 'CLEAR',
    category: 'research',
    expansion: 'Context, Logic, Expectations, Action, Restriction',
    bestFor: 'Detailed, structured research with fewer ambiguities.',
    sample: {
      Context: 'Senior year CSE student targeting Tier-1 AI Research/ML Engineer campus placements.',
      Logic: 'Need to isolate metric-driven project bullet points that distinguish academic prototypes from production-ready systems.',
      Expectations: 'Provide a structured tabular breakdown contrasting weak vs strong achievement statements.',
      Action: 'Audit my computer vision and LLM project descriptions.',
      Restriction: 'Do not use buzzwords like "spearheaded" or "passionate". Focus strictly on measurable throughput, latency, or accuracy.'
    },
    fields: [
      { key: 'Context', label: 'C — Context', placeholder: 'Describe your background, domain, and objective...', hint: 'Who are you and what is the situation?' },
      { key: 'Logic', label: 'L — Logic', placeholder: 'Explain the reasoning, rationale, or necessity...', hint: 'Why are you seeking this specific output?' },
      { key: 'Expectations', label: 'E — Expectations', placeholder: 'Detail the format, depth, and output structure...', hint: 'What exactly must the result look like?' },
      { key: 'Action', label: 'A — Action', placeholder: 'Specify the direct task for the AI to execute...', hint: 'What command or analysis should be run?' },
      { key: 'Restriction', label: 'R — Restriction', placeholder: 'List constraints, taboos, or negative rules...', hint: 'What should be avoided or excluded?' }
    ]
  },
  {
    id: 'SMART',
    name: 'SMART Framework',
    acronym: 'SMART',
    category: 'goal',
    expansion: 'Specific, Measurable, Achievable, Relevant, Time-bound',
    bestFor: 'Focused, measurable placement and learning objectives.',
    sample: {
      Specific: 'Upskill in Distributed Systems and System Design for Microsoft SDE-1 placement rounds.',
      Measurable: 'Implement an in-memory Redis-compatible distributed cache and complete 40 LeetCode Medium graph problems.',
      Achievable: 'Dedicate 2 hours daily alongside 7th-semester coursework.',
      Relevant: 'Directly aligns with Microsoft and Amazon interview bar requirements.',
      TimeBound: 'Complete within 4 weeks before campus hiring drives begin.'
    },
    fields: [
      { key: 'Specific', label: 'S — Specific', placeholder: 'What precise goal are you setting?' },
      { key: 'Measurable', label: 'M — Measurable', placeholder: 'How will success and completion be quantified?' },
      { key: 'Achievable', label: 'A — Achievable', placeholder: 'Is this realistic within your current bandwidth?' },
      { key: 'Relevant', label: 'R — Relevant', placeholder: 'Why does this matter to your placement trajectory?' },
      { key: 'TimeBound', label: 'T — Time-bound', placeholder: 'What is the strict deadline or schedule?' }
    ]
  },
  {
    id: 'QUEST',
    name: 'QUEST Framework',
    acronym: 'QUEST',
    category: 'research',
    expansion: 'Question, Understanding, Expectation, Scope, Time',
    bestFor: 'Narrowing a broad technical topic into manageable focus.',
    sample: {
      Question: 'How does FAISS IndexFlatL2 compare with HNSW indexing for 100k resume embeddings on memory-constrained servers?',
      Understanding: 'I understand cosine similarity and basic Euclidean distance search.',
      Expectation: 'A technical trade-off matrix covering RAM consumption, query QPS, and recall accuracy.',
      Scope: 'Focus on CPU inference in Python microservices; exclude GPU clustering.',
      Time: 'Evaluate for deployment in the current sprint.'
    },
    fields: [
      { key: 'Question', label: 'Q — Question', placeholder: 'What core question are you investigating?' },
      { key: 'Understanding', label: 'U — Understanding', placeholder: 'What is your current level of knowledge?' },
      { key: 'Expectation', label: 'E — Expectation', placeholder: 'What deliverable are you expecting?' },
      { key: 'Scope', label: 'S — Scope', placeholder: 'What boundaries, technologies, or limits apply?' },
      { key: 'Time', label: 'T — Time', placeholder: 'What time horizon or timeframe is relevant?' }
    ]
  },
  {
    id: 'GUIDE',
    name: 'GUIDE Framework',
    acronym: 'GUIDE',
    category: 'planning',
    expansion: 'Goal, Understanding, Information, Direction, Evaluation',
    bestFor: 'Step-by-step research breakdown and curriculum planning.',
    sample: {
      Goal: 'Master Spring Boot microservices architecture for Goldman Sachs technical interviews.',
      Understanding: 'Proficient in Core Java, basic SQL, and REST principles.',
      Information: 'Need references covering JPA/Hibernate, Spring Security, and transaction isolation.',
      Direction: 'Provide a structured 5-milestone roadmap with hands-on deliverables.',
      Evaluation: 'Include self-check verification questions at each milestone.'
    },
    fields: [
      { key: 'Goal', label: 'G — Goal', placeholder: 'State the primary end objective...' },
      { key: 'Understanding', label: 'U — Understanding', placeholder: 'Current familiarity and prerequisites...' },
      { key: 'Information', label: 'I — Information', placeholder: 'What knowledge components are needed?' },
      { key: 'Direction', label: 'D — Direction', placeholder: 'How should the instruction proceed?' },
      { key: 'Evaluation', label: 'E — Evaluation', placeholder: 'How will comprehension be validated?' }
    ]
  },
  {
    id: 'FOCUS',
    name: 'FOCUS Framework',
    acronym: 'FOCUS',
    category: 'research',
    expansion: 'Function, Outcome, Criteria, Underlying Assumptions, Strategy',
    bestFor: 'Cutting unnecessary details to build high-efficiency prompts.',
    sample: {
      Function: 'Technical resume bullet points optimization.',
      Outcome: 'A set of 5 concise, high-impact bullet points for a Cloud/DevOps internship.',
      Criteria: 'Must fit 1-2 lines each; must include specific metric deltas (e.g., % reduction, latency).',
      UnderlyingAssumptions: 'The reviewer has 15 seconds to scan before deciding.',
      Strategy: 'Use Google XYZ formula: Accomplished [X] as measured by [Y], by doing [Z].'
    },
    fields: [
      { key: 'Function', label: 'F — Function', placeholder: 'What is the operational function?' },
      { key: 'Outcome', label: 'O — Outcome', placeholder: 'What is the desired end outcome?' },
      { key: 'Criteria', label: 'C — Criteria', placeholder: 'What mandatory criteria must be met?' },
      { key: 'UnderlyingAssumptions', label: 'U — Underlying Assumptions', placeholder: 'What assumptions are in play?' },
      { key: 'Strategy', label: 'S — Strategy', placeholder: 'What execution strategy should be followed?' }
    ]
  },
  {
    id: 'IDEA',
    name: 'IDEA Framework',
    acronym: 'IDEA',
    category: 'writing',
    expansion: 'Intent, Details, Examples, Adjustments',
    bestFor: 'Iterative refinement and stylistic fine-tuning.',
    sample: {
      Intent: 'Rewrite a bland capstone project summary into an industry-grade portfolio description.',
      Details: 'Full-stack e-commerce project with Next.js, Stripe, Redis, and PostgreSQL.',
      Examples: 'Bad: "Made an e-commerce website with cart." Good: "Architected high-concurrency checkout with Redis rate-limiting and idempotent Stripe webhooks."',
      Adjustments: 'Keep tone technical, authoritative, and concise.'
    },
    fields: [
      { key: 'Intent', label: 'I — Intent', placeholder: 'What are you trying to accomplish?' },
      { key: 'Details', label: 'D — Details', placeholder: 'Provide the raw facts, components, and tools...' },
      { key: 'Examples', label: 'E — Examples', placeholder: 'Supply positive or negative reference examples...' },
      { key: 'Adjustments', label: 'A — Adjustments', placeholder: 'What stylistic tweaks should be applied?' }
    ]
  },
  {
    id: 'RISEN',
    name: 'RISEN Framework',
    acronym: 'RISEN',
    category: 'research',
    expansion: 'Requirement, Information, Strategy, Evaluation, Negotiation',
    bestFor: 'Complex multi-criteria planning with trade-off negotiation.',
    sample: {
      Requirement: 'Choose between accepting a ₹12 LPA Fintech offer or continuing into Super Dream hiring drives.',
      Information: 'Have strong algorithmic foundation (400+ LC), CGPA 8.9, 2 top-tier internships.',
      Strategy: 'Compare long-term engineering mentorship vs immediate brand prestige.',
      Evaluation: 'Assess risk profile and hiring market liquidity.',
      Negotiation: 'Determine possible start-date deferral or competing offer negotiation strategies.'
    },
    fields: [
      { key: 'Requirement', label: 'R — Requirement', placeholder: 'What is the core decision requirement?' },
      { key: 'Information', label: 'I — Information', placeholder: 'What background data and facts are known?' },
      { key: 'Strategy', label: 'S — Strategy', placeholder: 'What evaluation strategy should be used?' },
      { key: 'Evaluation', label: 'E — Evaluation', placeholder: 'How should outcomes be judged?' },
      { key: 'Negotiation', label: 'N — Negotiation', placeholder: 'What trade-offs or negotiation room exist?' }
    ]
  },
  {
    id: 'RHODES',
    name: 'RHODES Framework',
    acronym: 'RHODES',
    category: 'experiment',
    expansion: 'Research, Hypothesis, Objectives, Development, Execution, Synthesis',
    bestFor: 'Hypothesis-based technical research and experiment design.',
    sample: {
      Research: 'Investigating impact of fine-tuning small LLMs (Llama 3 8B) for automated resume skill gap extraction.',
      Hypothesis: 'LoRA fine-tuning will outperform zero-shot GPT-4o-mini on proprietary university resume phrasing by >15% F1.',
      Objectives: 'Benchmark token efficiency, latency, and extraction precision.',
      Development: 'Construct 500 labeled benchmark resume-JD pairs with verified ground truth.',
      Execution: 'Train with HuggingFace TRL and evaluate with ROUGE/BERTScore.',
      Synthesis: 'Summarize deployment trade-offs in an academic conference format.'
    },
    fields: [
      { key: 'Research', label: 'R — Research', placeholder: 'What domain or phenomenon is being studied?' },
      { key: 'Hypothesis', label: 'H — Hypothesis', placeholder: 'What testable hypothesis is proposed?' },
      { key: 'Objectives', label: 'O — Objectives', placeholder: 'What specific targets define success?' },
      { key: 'Development', label: 'D — Development', placeholder: 'What dataset, methodology, or pipeline is built?' },
      { key: 'Execution', label: 'E — Execution', placeholder: 'How will the trial be executed?' },
      { key: 'Synthesis', label: 'S — Synthesis', placeholder: 'How should findings be reported?' }
    ]
  },
  {
    id: 'CREATE',
    name: 'CREATE Framework',
    acronym: 'CREATE',
    category: 'experiment',
    expansion: 'Conceptualize, Research, Experiment, Analyze, Transform, Evaluate',
    bestFor: 'End-to-end project ideation and prototype development.',
    sample: {
      Conceptualize: 'A real-time voice interview simulator for technical campus interviews.',
      Research: 'Inspect WebRTC, Whisper speech-to-text, and low-latency LLM streaming.',
      Experiment: 'Build a prototype testing audio streaming latency under 500ms.',
      Analyze: 'Evaluate latency bottlenecks between transcription and response generation.',
      Transform: 'Refactor sequential HTTP calls into full-duplex WebSockets.',
      Evaluate: 'Validate candidate stress levels and feedback quality against real mock interviews.'
    },
    fields: [
      { key: 'Conceptualize', label: 'C — Conceptualize', placeholder: 'Initial concept or idea...' },
      { key: 'Research', label: 'R — Research', placeholder: 'Technical references and prior art...' },
      { key: 'Experiment', label: 'E — Experiment', placeholder: 'Test scenario or prototype...' },
      { key: 'Analyze', label: 'A — Analyze', placeholder: 'Metrics and bottlenecks to observe...' },
      { key: 'Transform', label: 'T — Transform', placeholder: 'How the prototype is optimized...' },
      { key: 'Evaluate', label: 'E — Evaluate', placeholder: 'Final validation against success criteria...' }
    ]
  },

  // --- POSTER B: TASK & RESPONSE STRUCTURE ---
  {
    id: 'RACE',
    name: 'RACE Framework',
    acronym: 'RACE',
    category: 'task',
    expansion: 'Role, Action, Context, Expectation',
    bestFor: 'Clear role-guided instruction with bounded output expectations.',
    sample: {
      Role: 'Principal Software Architect at a Big Tech company conducting candidate screening.',
      Action: 'Critique my system design project (Scalable Distributed Log Aggregator).',
      Context: 'I am preparing for an Amazon SDE-2 bar raiser round.',
      Expectation: 'List 3 critical failure points in high-concurrency partitions and recommend resilient patterns.'
    },
    fields: [
      { key: 'Role', label: 'R — Role', placeholder: 'Who should the AI act as?' },
      { key: 'Action', label: 'A — Action', placeholder: 'What specific task must be executed?' },
      { key: 'Context', label: 'C — Context', placeholder: 'What is the background or situation?' },
      { key: 'Expectation', label: 'E — Expectation', placeholder: 'What is the expected deliverable?' }
    ]
  },
  {
    id: 'TAG',
    name: 'TAG Framework',
    acronym: 'TAG',
    category: 'task',
    expansion: 'Task, Action, Goal',
    bestFor: 'Quick, ultra-concise operational assignments.',
    sample: {
      Task: 'Extract required technical keywords from a Google Cloud Architect JD.',
      Action: 'Categorize keywords into Infrastructure, Networking, Databases, and CI/CD.',
      Goal: 'Identify missing competencies in my resume before applying.'
    },
    fields: [
      { key: 'Task', label: 'T — Task', placeholder: 'What is the primary task?' },
      { key: 'Action', label: 'A — Action', placeholder: 'What action should be performed?' },
      { key: 'Goal', label: 'G — Goal', placeholder: 'What is the ultimate goal?' }
    ]
  },
  {
    id: 'TRACE',
    name: 'TRACE Framework',
    acronym: 'TRACE',
    category: 'task',
    expansion: 'Task, Request, Action, Context, Example',
    bestFor: 'Comprehensive task definition with grounding reference examples.',
    sample: {
      Task: 'Draft cold outreach LinkedIn messages to industry engineers at Microsoft.',
      Request: 'Write 3 personalized message variants under 300 characters each.',
      Action: 'Emphasize engineering background and interest in Azure Core Systems.',
      Context: 'Applying for campus off-campus referral for SDE-1.',
      Example: 'Reference example: "Hi [Name], inspired by your work on Azure networking..."'
    },
    fields: [
      { key: 'Task', label: 'T — Task', placeholder: 'What task is being tackled?' },
      { key: 'Request', label: 'R — Request', placeholder: 'What exact output are you requesting?' },
      { key: 'Action', label: 'A — Action', placeholder: 'What specific direction must be followed?' },
      { key: 'Context', label: 'C — Context', placeholder: 'What context informs the request?' },
      { key: 'Example', label: 'E — Example', placeholder: 'Provide a sample format or style reference...' }
    ]
  },
  {
    id: 'CARE',
    name: 'CARE Framework',
    acronym: 'CARE',
    category: 'story',
    expansion: 'Context, Action, Result, Example',
    bestFor: 'Framing impactful professional experiences and case stories.',
    sample: {
      Context: 'During my backend internship, database query spikes were causing 504 gateway timeouts on customer dashboards.',
      Action: 'Profiled slow queries using EXPLAIN ANALYZE, added composite indexes, and implemented a 60-second Redis cache.',
      Result: 'Reduced p99 query latency from 1,800ms to 45ms and dropped CPU utilization by 42%.',
      Example: 'Translate this into 2 resume bullet points and 1 behavioral interview talking point.'
    },
    fields: [
      { key: 'Context', label: 'C — Context', placeholder: 'Describe the problem setting...' },
      { key: 'Action', label: 'A — Action', placeholder: 'What specific actions did you take?' },
      { key: 'Result', label: 'R — Result', placeholder: 'What quantifiable results were achieved?' },
      { key: 'Example', label: 'E — Example', placeholder: 'How should this be packaged or formulated?' }
    ]
  },
  {
    id: 'PAR',
    name: 'PAR Framework',
    acronym: 'PAR',
    category: 'story',
    expansion: 'Problem, Action, Result',
    bestFor: 'High-density, metric-driven technical resume bullet points.',
    sample: {
      Problem: 'Manual PDF invoice parsing was error-prone and took 12 human hours weekly.',
      Action: 'Engineered an asynchronous Celery pipeline using OpenCV and Tesseract OCR with automated schema validation.',
      Result: 'Processed 5,000+ monthly documents with 99.2% extraction accuracy, saving 10+ hours per week.'
    },
    fields: [
      { key: 'Problem', label: 'P — Problem', placeholder: 'What friction, bottleneck, or bug existed?' },
      { key: 'Action', label: 'A — Action', placeholder: 'What engineering steps did you implement?' },
      { key: 'Result', label: 'R — Result', placeholder: 'What measurable business/system delta occurred?' }
    ]
  },
  {
    id: 'STAR',
    name: 'STAR Framework',
    acronym: 'STAR',
    category: 'story',
    expansion: 'Situation, Task, Action, Result',
    bestFor: 'Behavioral placement interviews (Amazon Leadership, Googleyness).',
    sample: {
      Situation: 'Two weeks before hackathon finals, our team lead left the project, leaving authentication incomplete.',
      Task: 'Step in as technical coordinator to finish JWT auth and ensure deployment on AWS.',
      Action: 'Re-scoped features using MoSCoW prioritization, pair-programmed with junior peers, and wrote automated smoke tests.',
      Result: 'Shipped on schedule, handled 2,000 concurrent demo users, and won 2nd place overall.'
    },
    fields: [
      { key: 'Situation', label: 'S — Situation', placeholder: 'Set the scene and background...' },
      { key: 'Task', label: 'T — Task', placeholder: 'What responsibility were you assigned?' },
      { key: 'Action', label: 'A — Action', placeholder: 'What specific steps did you champion?' },
      { key: 'Result', label: 'R — Result', placeholder: 'What outcome was achieved?' }
    ]
  },
  {
    id: 'APE',
    name: 'APE Framework',
    acronym: 'APE',
    category: 'task',
    expansion: 'Action, Purpose, Expectation',
    bestFor: 'Direct, unambiguous single-shot generation prompts.',
    sample: {
      Action: 'Summarize the Top 10 Dynamic Programming patterns for tech placement interviews.',
      Purpose: 'Enable quick revision 24 hours prior to an online coding assessment.',
      Expectation: 'Provide pattern name, time complexity, and one classic LeetCode problem link.'
    },
    fields: [
      { key: 'Action', label: 'A — Action', placeholder: 'What must be performed?' },
      { key: 'Purpose', label: 'P — Purpose', placeholder: 'Why is this being done?' },
      { key: 'Expectation', label: 'E — Expectation', placeholder: 'What are the strict output bounds?' }
    ]
  },
  {
    id: 'CRISPE',
    name: 'CRISPE Framework',
    acronym: 'CRISPE',
    category: 'experiment',
    expansion: 'Capacity, Insight, Statement, Personality, Experiment',
    bestFor: 'Multi-perspective persona prompting and exploratory tests.',
    sample: {
      Capacity: 'Senior Staff Engineer and Placement Hiring Committee Chair at Cisco.',
      Insight: 'Students frequently list too many shallow tools without deep networking fundamentals.',
      Statement: 'Evaluate my resume project: "Distributed SDN Controller with OpenFlow".',
      Personality: 'Rigorous, pragmatic, skeptical of buzzwords, supportive of deep foundational knowledge.',
      Experiment: 'Provide 3 tough technical interview questions that would instantly expose shallow knowledge.'
    },
    fields: [
      { key: 'Capacity', label: 'C — Capacity', placeholder: 'What role capacity does the model adopt?' },
      { key: 'Insight', label: 'I — Insight', placeholder: 'What context or insider perspective informs this?' },
      { key: 'Statement', label: 'S — Statement', placeholder: 'What statement or item is under review?' },
      { key: 'Personality', label: 'P — Personality', placeholder: 'What tone or demeanor should be used?' },
      { key: 'Experiment', label: 'E — Experiment', placeholder: 'What test or simulation should be performed?' }
    ]
  },
  {
    id: 'RTF',
    name: 'RTF Framework',
    acronym: 'RTF',
    category: 'task',
    expansion: 'Role, Task, Finish',
    bestFor: 'Fast-paced, formatted task delivery with explicit finish criteria.',
    sample: {
      Role: 'Expert ATS Resume Screener.',
      Task: 'Extract 5 missing hard skills by comparing my resume against the target Amazon SDE-1 JD.',
      Finish: 'Return a bulleted list where each bullet starts with the skill in bold, followed by a 1-sentence explanation of where it appears in the JD.'
    },
    fields: [
      { key: 'Role', label: 'R — Role', placeholder: 'Define persona or position...' },
      { key: 'Task', label: 'T — Task', placeholder: 'Define the explicit task...' },
      { key: 'Finish', label: 'F — Finish', placeholder: 'Define the strict delivery format and style...' }
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
    medianCtc: '₹9.8 LPA',
    placementRate: '88%',
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
    medianCtc: '₹18.5 LPA',
    placementRate: '94%',
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
    medianCtc: '₹16.0 LPA',
    placementRate: '95%',
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
    medianCtc: '₹14.2 LPA',
    placementRate: '96%',
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
    medianCtc: '₹8.2 LPA',
    placementRate: '84%',
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
    highestCtc: '₹54.8 LPA',
    medianCtc: '₹32.0 LPA',
    alumniCount: 42,
    difficulty: '4.8 / 5.0',
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
    highestCtc: '₹51.0 LPA',
    medianCtc: '₹28.5 LPA',
    alumniCount: 68,
    difficulty: '4.5 / 5.0',
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
    highestCtc: '₹45.0 LPA',
    medianCtc: '₹26.0 LPA',
    alumniCount: 114,
    difficulty: '4.4 / 5.0',
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
    highestCtc: '₹24.0 LPA',
    medianCtc: '₹17.5 LPA',
    alumniCount: 53,
    difficulty: '3.9 / 5.0',
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
    highestCtc: '₹34.0 LPA',
    medianCtc: '₹22.0 LPA',
    alumniCount: 39,
    difficulty: '4.6 / 5.0',
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
    highestCtc: '₹11.5 LPA',
    medianCtc: '₹8.0 LPA',
    alumniCount: 420,
    difficulty: '3.4 / 5.0',
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
    highestCtc: '₹14.0 LPA',
    medianCtc: '₹8.5 LPA',
    alumniCount: 165,
    difficulty: '3.6 / 5.0',
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
    highestCtc: '₹36.0 LPA',
    medianCtc: '₹24.0 LPA',
    alumniCount: 31,
    difficulty: '4.4 / 5.0',
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
    highestCtc: '₹48.0 LPA',
    medianCtc: '₹30.0 LPA',
    alumniCount: 18,
    difficulty: '4.7 / 5.0',
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
    highestCtc: '₹12.0 LPA',
    medianCtc: '₹7.5 LPA',
    alumniCount: 94,
    difficulty: '3.8 / 5.0',
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
// ==============================================================================
// 6. SPATIAL 3D CONSTELLATION & QUANTUM ENGINE (THREE.JS R128)
// ==============================================================================
let scene, camera, renderer;
let particlesMesh, linesMesh, spatialNodes = [];
let globeMesh, radarMesh;
let centralCoreGroup = null;
let animFrameId = null;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
let cameraZ = 520, targetCameraZ = 520;
let isRenderingActive = true;
let current3DMode = 'constellation';
let orbitSpeedMultiplier = 1.0;
let currentFocusNodeIdx = -1;
let raycaster = null;
let mouseVec = null;
let shockwaveParticles = [];

// Interactive 3D Orbit Drag State
let isOrbitDragging = false;
let prevPointerPos = { x: 0, y: 0 };
let orbitRotation = { x: 0, y: 0 };
let orbitVelocity = { x: 0, y: 0 };

// Curated 25 High-Value Placement Skills organized across 5 Career Archetypes
const PLACEMENT_SKILLS_3D = [
  // Cluster 0: Software Architecture (0x00F2FE - Electric Cyan)
  { name: "Distributed Systems", tier: "Super Dream", match: "97.8%", companies: "Google, Microsoft, Amazon", archetypeId: 0, archetype: "Software Architecture", color: 0x00F2FE, radius: 24, pos: [-180, 80, -30] },
  { name: "System Design & Scalability", tier: "Super Dream", match: "99.1%", companies: "Google, Amazon, Goldman Sachs", archetypeId: 0, archetype: "Software Architecture", color: 0x00F2FE, radius: 28, pos: [-150, -110, 30] },
  { name: "Redis Distributed Cache", tier: "Super Dream", match: "96.9%", companies: "Amazon, PayPal, Google", archetypeId: 0, archetype: "Software Architecture", color: 0x00F2FE, radius: 20, pos: [-240, -20, 50] },
  { name: "Kafka Event Streams", tier: "Super Dream", match: "97.2%", companies: "Goldman Sachs, Cisco, Amazon", archetypeId: 0, archetype: "Software Architecture", color: 0x00F2FE, radius: 22, pos: [-160, 160, -50] },
  { name: "High-Concurrency Go", tier: "Super Dream", match: "96.4%", companies: "Google, Cisco, Uber", archetypeId: 0, archetype: "Software Architecture", color: 0x00F2FE, radius: 21, pos: [-120, -50, -80] },

  // Cluster 1: AI/ML Systems (0x9D4EDD - Neon Violet)
  { name: "PyTorch & Transformers", tier: "Super Dream", match: "98.4%", companies: "NVIDIA, Google DeepMind, Adobe", archetypeId: 1, archetype: "AI/ML Systems", color: 0x9D4EDD, radius: 26, pos: [190, 110, 40] },
  { name: "LangGraph Agent Workflows", tier: "Super Dream", match: "98.6%", companies: "Microsoft, Adobe, Google", archetypeId: 1, archetype: "AI/ML Systems", color: 0x9D4EDD, radius: 24, pos: [80, -150, 40] },
  { name: "FAISS Neural Indexing", tier: "Super Dream", match: "98.0%", companies: "Google, Adobe, Microsoft", archetypeId: 1, archetype: "AI/ML Systems", color: 0x9D4EDD, radius: 22, pos: [50, 60, 90] },
  { name: "RAG Pipeline Engineering", tier: "Super Dream", match: "97.6%", companies: "Microsoft, Amazon, Adobe", archetypeId: 1, archetype: "AI/ML Systems", color: 0x9D4EDD, radius: 23, pos: [150, 190, 20] },
  { name: "MLOps & Model Deployment", tier: "Super Dream", match: "97.5%", companies: "NVIDIA, Google, Cisco", archetypeId: 1, archetype: "AI/ML Systems", color: 0x9D4EDD, radius: 22, pos: [-30, 110, 60] },

  // Cluster 2: Cloud & DevOps (0x00F5D4 - Mint Emerald)
  { name: "Kubernetes & Cloud Native", tier: "Super Dream", match: "96.2%", companies: "Cisco, Microsoft, Amazon", archetypeId: 2, archetype: "Cloud & DevOps", color: 0x00F5D4, radius: 24, pos: [0, -40, 70] },
  { name: "Docker & Containerization", tier: "Dream", match: "93.8%", companies: "Microsoft, Intel, PayPal", archetypeId: 2, archetype: "Cloud & DevOps", color: 0x00F5D4, radius: 18, pos: [100, 160, -20] },
  { name: "Terraform & AWS Infra", tier: "Super Dream", match: "95.5%", companies: "Amazon, Cisco, Intel", archetypeId: 2, archetype: "Cloud & DevOps", color: 0x00F5D4, radius: 20, pos: [0, 190, -40] },
  { name: "CI/CD & GitHub Actions", tier: "Dream", match: "93.1%", companies: "Cisco, Microsoft, Oracle", archetypeId: 2, archetype: "Cloud & DevOps", color: 0x00F5D4, radius: 18, pos: [220, 180, 30] },
  { name: "Linux Observability & eBPF", tier: "Super Dream", match: "95.9%", companies: "Google, Cisco, Intel", archetypeId: 2, archetype: "Cloud & DevOps", color: 0x00F5D4, radius: 19, pos: [90, 40, -70] },

  // Cluster 3: Product Strategy & FinTech (0xFFB703 - Solar Amber)
  { name: "Low-Latency C++ Engine", tier: "Super Dream", match: "95.7%", companies: "Goldman Sachs, Morgan Stanley, Qualcomm", archetypeId: 3, archetype: "Core Engineering", color: 0xFFB703, radius: 24, pos: [180, -90, -40] },
  { name: "Quantitative Risk Modeling", tier: "Super Dream", match: "96.5%", companies: "Goldman Sachs, JP Morgan, Morgan Stanley", archetypeId: 3, archetype: "Core Engineering", color: 0xFFB703, radius: 22, pos: [240, -40, 20] },
  { name: "High-Frequency Algorithmic Systems", tier: "Super Dream", match: "97.1%", companies: "Tower Research, DE Shaw, Graviton", archetypeId: 3, archetype: "Core Engineering", color: 0xFFB703, radius: 25, pos: [150, -180, -20] },
  { name: "Product Growth & Unit Economics", tier: "Dream", match: "94.2%", companies: "PayPal, Amazon, Flipkart", archetypeId: 3, archetype: "Core Engineering", color: 0xFFB703, radius: 18, pos: [200, 50, -60] },
  { name: "Financial Derivatives Architecture", tier: "Super Dream", match: "96.0%", companies: "Morgan Stanley, Barclays, Citi", archetypeId: 3, archetype: "Core Engineering", color: 0xFFB703, radius: 21, pos: [260, -120, 10] },

  // Cluster 4: Cybersecurity & Zero-Trust (0xFF007F - Vibrant Coral)
  { name: "Zero-Trust IAM & OAuth2", tier: "Super Dream", match: "96.8%", companies: "Cisco, Microsoft, Palo Alto Networks", archetypeId: 4, archetype: "Cyber & Security", color: 0xFF007F, radius: 23, pos: [-80, -90, 80] },
  { name: "Penetration Testing & Red Team", tier: "Super Dream", match: "95.4%", companies: "Palo Alto Networks, CrowdStrike, Cisco", archetypeId: 4, archetype: "Cyber & Security", color: 0xFF007F, radius: 22, pos: [-190, -160, 40] },
  { name: "Cloud Security Posture (CSPM)", tier: "Super Dream", match: "96.1%", companies: "Amazon, Microsoft, Google", archetypeId: 4, archetype: "Cyber & Security", color: 0xFF007F, radius: 21, pos: [-110, 40, 100] },
  { name: "Cryptographic Protocols & TLS", tier: "Super Dream", match: "97.0%", companies: "Qualcomm, Apple, Google", archetypeId: 4, archetype: "Cyber & Security", color: 0xFF007F, radius: 20, pos: [-70, 200, -20] },
  { name: "Threat Modeling & SIEM", tier: "Dream", match: "93.9%", companies: "Cisco, Fortinet, Oracle", archetypeId: 4, archetype: "Cyber & Security", color: 0xFF007F, radius: 19, pos: [-170, -70, -60] }
];

// Central Three.js Scene Controller Contract
const sceneController = {
  pauseReasons: new Set(),
  isLifecycleBound: false,
  resizeObserver: null,

  init(canvas, wrapper) {
    if (!this.isLifecycleBound && wrapper) {
      this.bindLifecycle(canvas, wrapper);
    }
    init3DScene();
  },

  bindLifecycle(canvas, wrapper) {
    this.isLifecycleBound = true;

    // 1. Tab visibility listener
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause('hidden');
      } else {
        this.resume('hidden');
      }
    });

    // 2. Offscreen scroll observer
    if ('IntersectionObserver' in window && wrapper) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.resume('offscreen');
          } else {
            this.pause('offscreen');
          }
        });
      }, { threshold: 0.05 });
      observer.observe(wrapper);
    }

    // 3. WebGL Context lost / restored
    if (canvas) {
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('WebGL Context Lost: pausing 3D engine');
        this.pause('context_lost');
      });
      canvas.addEventListener('webglcontextrestored', () => {
        console.log('WebGL Context Restored: rebuilding 3D constellation');
        this.resume('context_lost');
        init3DScene();
      });
    }

    // 4. ResizeObserver on wrapper
    if ('ResizeObserver' in window && wrapper) {
      let rTimer = null;
      this.resizeObserver = new ResizeObserver(() => {
        if (rTimer) clearTimeout(rTimer);
        rTimer = setTimeout(() => {
          onCanvasResize();
        }, 80);
      });
      this.resizeObserver.observe(wrapper);
    }
  },

  pause(reason) {
    this.pauseReasons.add(reason);
    isRenderingActive = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  },

  resume(reason) {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size === 0 && appState.motionMode !== 'reduced') {
      isRenderingActive = true;
      if (typeof window._sceneAnimate === 'function' && !animFrameId) {
        window._sceneAnimate();
      }
    }
  },

  dispose() {
    this.pause('disposed');
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    cleanup3DScene();
  }
};
window.sceneController = sceneController;

function init3DScene() {
  const canvas = document.getElementById('spatial-hero-canvas');
  const wrapper = document.getElementById('spatial-canvas-wrapper');
  if (!canvas || !wrapper) return;

  if (!sceneController.isLifecycleBound) {
    sceneController.bindLifecycle(canvas, wrapper);
  }

  // Handle Reduced Motion
  if (appState.motionMode === 'reduced') {
    canvas.style.display = 'none';
    const badge = document.getElementById('canvas-engine-badge');
    if (badge) badge.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';

  // Initialize Three.js objects or Fallback
  if (typeof THREE === 'undefined') {
    init2DFallbackConstellation(canvas, wrapper);
    return;
  }

  cleanup3DScene();

  if (!raycaster) raycaster = new THREE.Raycaster();
  if (!mouseVec) mouseVec = new THREE.Vector2(-999, -999);

  const isCeramicTheme = document.documentElement.getAttribute('data-theme') === 'ceramic';
  const isMinimalist = document.body.classList.contains('designhead-minimalist');
  const width = wrapper.clientWidth || 600;
  const height = wrapper.clientHeight || 520;

  scene = new THREE.Scene();
  const fogColor = isCeramicTheme ? 0xF8F9FA : (isMinimalist ? 0x0A0B10 : 0x07080E);
  scene.fog = new THREE.FogExp2(fogColor, 0.0011);

  camera = new THREE.PerspectiveCamera(52, width / height, 1, 3000);
  camera.position.z = cameraZ;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    console.warn('WebGL init failed, using 2D fallback:', err);
    init2DFallbackConstellation(canvas, wrapper);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  renderer.setClearColor(fogColor, isCeramicTheme ? 0.2 : 0.0);

  // 1. Central Holographic Quantum Core (Dual Icosahedron + Octahedron + Gimbal Rings)
  centralCoreGroup = new THREE.Group();

  const coreWireGeo = new THREE.IcosahedronGeometry(42, 1);
  const coreWireMat = new THREE.MeshBasicMaterial({
    color: isCeramicTheme ? 0x2563EB : 0x00F2FE,
    wireframe: true,
    transparent: true,
    opacity: isCeramicTheme ? 0.35 : 0.65
  });
  const coreWireMesh = new THREE.Mesh(coreWireGeo, coreWireMat);
  centralCoreGroup.add(coreWireMesh);

  const coreInnerGeo = new THREE.OctahedronGeometry(22, 0);
  const coreInnerMat = new THREE.MeshBasicMaterial({
    color: isCeramicTheme ? 0x3B82F6 : 0xFF007F,
    transparent: true,
    opacity: 0.85
  });
  const coreInnerMesh = new THREE.Mesh(coreInnerGeo, coreInnerMat);
  centralCoreGroup.add(coreInnerMesh);

  // Gimbal Torus Ring 1 (Cyan)
  const ring1Geo = new THREE.TorusGeometry(72, 1.4, 16, 64);
  const ring1Mat = new THREE.MeshBasicMaterial({
    color: isCeramicTheme ? 0x0284C7 : 0x00F2FE,
    transparent: true,
    opacity: 0.45
  });
  const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
  ring1Mesh.rotation.x = Math.PI / 3;
  centralCoreGroup.add(ring1Mesh);

  // Gimbal Torus Ring 2 (Magenta / Violet)
  const ring2Geo = new THREE.TorusGeometry(84, 1.4, 16, 64);
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: isCeramicTheme ? 0x7C3AED : 0x9D4EDD,
    transparent: true,
    opacity: 0.35
  });
  const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2Mesh.rotation.y = Math.PI / 4;
  centralCoreGroup.add(ring2Mesh);

  scene.add(centralCoreGroup);

  // 2. Quantum Background Particles Cloud (350+ particles)
  const particleCount = isMinimalist ? 100 : 350;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const neonColors = [
    new THREE.Color(0x00F2FE), // Electric Cyan
    new THREE.Color(0x9D4EDD), // Neon Violet
    new THREE.Color(0x00F5D4), // Mint Emerald
    new THREE.Color(0xFFB703), // Solar Amber
    new THREE.Color(0xFF007F)  // Vibrant Coral
  ];
  const ceramicColors = [
    new THREE.Color(0x2563EB),
    new THREE.Color(0x7C3AED),
    new THREE.Color(0x059669),
    new THREE.Color(0xD97706),
    new THREE.Color(0xDC2626)
  ];
  const activePalette = isCeramicTheme ? ceramicColors : neonColors;

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1250;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 900;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 950;

    const c = activePalette[i % activePalette.length];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 32;
  spriteCanvas.height = 32;
  const sCtx = spriteCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.7, 'rgba(0,242,254,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 32, 32);

  const spriteTex = new THREE.CanvasTexture(spriteCanvas);
  const particleMat = new THREE.PointsMaterial({
    size: isMinimalist ? 12 : 18,
    vertexColors: true,
    map: spriteTex,
    transparent: true,
    blending: isCeramicTheme ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false
  });

  particlesMesh = new THREE.Points(particleGeo, particleMat);
  scene.add(particlesMesh);

  // 3. Synaptic Neural Connecting Lines
  const lineMat = new THREE.LineBasicMaterial({
    color: isCeramicTheme ? 0x94A3B8 : (isMinimalist ? 0x64748B : 0x00F2FE),
    transparent: true,
    opacity: isMinimalist ? 0.15 : 0.32,
    blending: isCeramicTheme ? THREE.NormalBlending : THREE.AdditiveBlending
  });

  const lineGeo = new THREE.BufferGeometry();
  const linePos = [];
  PLACEMENT_SKILLS_3D.forEach((n1, i) => {
    PLACEMENT_SKILLS_3D.slice(i + 1).forEach(n2 => {
      const dx = n1.pos[0] - n2.pos[0];
      const dy = n1.pos[1] - n2.pos[1];
      const dz = n1.pos[2] - n2.pos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 210) {
        linePos.push(n1.pos[0], n1.pos[1], n1.pos[2]);
        linePos.push(n2.pos[0], n2.pos[1], n2.pos[2]);
      }
    });
  });

  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  linesMesh = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(linesMesh);

  // 4. Placement Skill Nodes (Interactive Meshes)
  spatialNodes = [];
  PLACEMENT_SKILLS_3D.forEach((skill, idx) => {
    const group = new THREE.Group();
    group.position.set(skill.pos[0], skill.pos[1], skill.pos[2]);

    const nodeColor = isMinimalist ? 0xFFFFFF : skill.color;

    const wireGeo = new THREE.IcosahedronGeometry(skill.radius * 0.9, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: nodeColor,
      wireframe: true,
      transparent: true,
      opacity: isMinimalist ? 0.35 : 0.72
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireMesh);

    const coreGeo = new THREE.SphereGeometry(skill.radius * 0.45, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: nodeColor,
      transparent: true,
      opacity: isMinimalist ? 0.8 : 0.95
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    const ringGeo = new THREE.RingGeometry(skill.radius * 1.25, skill.radius * 1.38, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: nodeColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isMinimalist ? 0.22 : 0.45
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3 + idx * 0.25;
    group.add(ringMesh);

    const phi = Math.acos(-1 + (2 * idx) / PLACEMENT_SKILLS_3D.length);
    const theta = Math.sqrt(PLACEMENT_SKILLS_3D.length * Math.PI) * phi;
    const globeR = 210;
    const globePos = [
      globeR * Math.cos(theta) * Math.sin(phi),
      globeR * Math.sin(theta) * Math.sin(phi),
      globeR * Math.cos(phi)
    ];

    const tierRadii = [80, 130, 185, 230];
    const ringRadius = tierRadii[idx % tierRadii.length];
    const angle = (idx / PLACEMENT_SKILLS_3D.length) * Math.PI * 2;
    const radarPos = [
      Math.cos(angle) * ringRadius,
      Math.sin(angle) * ringRadius * 0.45 - 20,
      Math.sin(angle) * ringRadius * 0.8
    ];

    const warpPos = [
      skill.pos[0] * 1.8,
      skill.pos[1] * 1.8,
      (idx * 35) - 300
    ];

    group.userData = {
      skill: skill,
      wireMesh: wireMesh,
      coreMesh: coreMesh,
      ringMesh: ringMesh,
      constellationPos: [...skill.pos],
      globePos: globePos,
      radarPos: radarPos,
      warpPos: warpPos,
      targetPos: [...skill.pos],
      baseRadius: skill.radius
    };

    spatialNodes.push(group);
    scene.add(group);
  });

  // 5. Mode Overlays
  create3DModeOverlays(scene, isMinimalist);

  // Wire canvas interactive drag & wheel controls
  canvas.addEventListener('mousedown', onCanvasPointerDown);
  window.addEventListener('mousemove', onCanvasPointerMove);
  window.addEventListener('mouseup', onCanvasPointerUp);

  canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
  window.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
  window.addEventListener('touchend', onCanvasTouchEnd);

  canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('mouseleave', onCanvasMouseLeave);
  window.addEventListener('resize', onCanvasResize);

  // Wire 3D Mode Toolbar Buttons
  init3DModeButtons();

  // Update Diagnostics Badge
  updateDiagnosticsBadge(width, height);

  // Animation Loop
  function animate() {
    window._sceneAnimate = animate;
    if (!isRenderingActive) return;
    animFrameId = requestAnimationFrame(animate);

    if (!isOrbitDragging) {
      orbitVelocity.x *= 0.94;
      orbitVelocity.y *= 0.94;
      orbitRotation.y += orbitVelocity.y;
      orbitRotation.x += orbitVelocity.x;
    }

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;
    cameraZ += (targetCameraZ - cameraZ) * 0.08;

    camera.position.x = targetX + Math.sin(orbitRotation.y) * 40;
    camera.position.y = -targetY + Math.sin(orbitRotation.x) * 30;
    camera.position.z = cameraZ;
    camera.lookAt(0, 0, 0);

    const speed = (isMinimalist ? 0.0004 : 0.001) * orbitSpeedMultiplier;

    if (centralCoreGroup) {
      centralCoreGroup.rotation.y += speed * 1.5;
      centralCoreGroup.rotation.x += speed * 0.8;
      const breathe = 1.0 + Math.sin(Date.now() * 0.002) * 0.06;
      centralCoreGroup.scale.set(breathe, breathe, breathe);
    }

    particlesMesh.rotation.y += speed;
    particlesMesh.rotation.x += speed * 0.4;
    linesMesh.rotation.y += speed;
    linesMesh.rotation.x += speed * 0.4;

    if (radarMesh && radarMesh.visible) {
      radarMesh.rotation.z += 0.028;
    }

    if (globeMesh && globeMesh.visible) {
      globeMesh.rotation.y += 0.006;
    }

    const now = Date.now() * 0.0018;
    spatialNodes.forEach((node, idx) => {
      node.position.x += (node.userData.targetPos[0] - node.position.x) * 0.065;
      node.position.y += (node.userData.targetPos[1] - node.position.y) * 0.065;
      node.position.z += (node.userData.targetPos[2] - node.position.z) * 0.065;

      node.userData.wireMesh.rotation.y += 0.014 * (idx % 2 === 0 ? 1 : -1);
      node.userData.wireMesh.rotation.x += 0.009;
      node.userData.ringMesh.rotation.z += 0.018;

      if (current3DMode === 'constellation') {
        node.position.y += Math.sin(now + idx) * 0.4;
      } else if (current3DMode === 'warp') {
        node.position.z += 3.5;
        if (node.position.z > 350) node.position.z = -350;
      }
    });

    if (shockwaveParticles.length > 0) {
      for (let i = shockwaveParticles.length - 1; i >= 0; i--) {
        const p = shockwaveParticles[i];
        p.position.add(p.userData.velocity);
        p.userData.life -= 0.025;
        p.material.opacity = p.userData.life;
        if (p.userData.life <= 0) {
          scene.remove(p);
          if (p.geometry) p.geometry.dispose();
          if (p.material) p.material.dispose();
          shockwaveParticles.splice(i, 1);
        }
      }
    }

    if (raycaster && mouseVec && mouseVec.x !== -999 && !isOrbitDragging) {
      raycaster.setFromCamera(mouseVec, camera);
      const interactiveTargets = spatialNodes.map(n => n.userData.wireMesh);
      const intersects = raycaster.intersectObjects(interactiveTargets);

      const tooltip = document.getElementById('canvas-3d-tooltip');

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const parentNode = spatialNodes.find(n => n.userData.wireMesh === hitMesh);
        if (parentNode) {
          parentNode.scale.lerp(new THREE.Vector3(1.4, 1.4, 1.4), 0.25);
          show3DNodeTooltip(parentNode.userData.skill, intersects[0].point);
        }
      } else {
        spatialNodes.forEach(node => {
          node.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.12);
        });
        if (tooltip && tooltip.style.display !== 'none') {
          tooltip.style.display = 'none';
        }
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}

function onCanvasPointerDown(e) {
  isOrbitDragging = true;
  prevPointerPos = { x: e.clientX, y: e.clientY };
}

function onCanvasPointerMove(e) {
  const canvas = document.getElementById('spatial-hero-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  mouseX = (x - rect.width / 2) * 0.4;
  mouseY = (y - rect.height / 2) * 0.4;

  if (mouseVec) {
    mouseVec.x = (x / rect.width) * 2 - 1;
    mouseVec.y = -(y / rect.height) * 2 + 1;
  }

  if (isOrbitDragging) {
    const deltaX = e.clientX - prevPointerPos.x;
    const deltaY = e.clientY - prevPointerPos.y;
    prevPointerPos = { x: e.clientX, y: e.clientY };

    orbitVelocity.y = deltaX * 0.005;
    orbitVelocity.x = deltaY * 0.005;
    orbitRotation.y += orbitVelocity.y;
    orbitRotation.x += orbitVelocity.x;
  }
}

function onCanvasPointerUp() {
  isOrbitDragging = false;
}

function onCanvasTouchStart(e) {
  if (e.touches.length === 1) {
    isOrbitDragging = true;
    prevPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}

function onCanvasTouchMove(e) {
  if (e.touches.length === 1 && isOrbitDragging) {
    const deltaX = e.touches[0].clientX - prevPointerPos.x;
    const deltaY = e.touches[0].clientY - prevPointerPos.y;
    prevPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    orbitVelocity.y = deltaX * 0.006;
    orbitVelocity.x = deltaY * 0.006;
    orbitRotation.y += orbitVelocity.y;
    orbitRotation.x += orbitVelocity.x;
    e.preventDefault();
  }
}

function onCanvasTouchEnd() {
  isOrbitDragging = false;
}

function onCanvasWheel(e) {
  e.preventDefault();
  targetCameraZ = Math.max(260, Math.min(880, targetCameraZ + e.deltaY * 0.45));
}

function onCanvasClick(e) {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const clickVec = new THREE.Vector2(
    (x / rect.width) * 2 - 1,
    -(y / rect.height) * 2 + 1
  );

  if (raycaster && camera) {
    raycaster.setFromCamera(clickVec, camera);
    const interactiveTargets = spatialNodes.map(n => n.userData.wireMesh);
    const intersects = raycaster.intersectObjects(interactiveTargets);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const parentNode = spatialNodes.find(n => n.userData.wireMesh === hitMesh);
      if (parentNode) {
        const skill = parentNode.userData.skill;
        targetCameraZ = 340;
        targetX = parentNode.position.x * 0.6;
        targetY = -parentNode.position.y * 0.6;

        trigger3DShockwave(parentNode.position.x, parentNode.position.y, parentNode.position.z, skill.color);
        show3DNodeTooltip(skill, intersects[0].point);

        if (typeof skill.archetypeId === 'number' && typeof selectArchetype === 'function') {
          selectArchetype(skill.archetypeId);
        }

        if (window.spatialAudio) window.spatialAudio.nodeSelect();
        showToast(`Targeted Cluster Node: ${skill.name} (${skill.tier})`);
        return;
      }
    }
  }

  trigger3DShockwave();
  if (window.spatialAudio) window.spatialAudio.burst();
}

function show3DNodeTooltip(skill, hitPoint) {
  const tooltip = document.getElementById('canvas-3d-tooltip');
  const wrapper = document.getElementById('spatial-canvas-wrapper');
  if (!tooltip || !wrapper) return;

  const titleEl = document.getElementById('tooltip-node-title');
  const tierEl = document.getElementById('tooltip-node-tier');
  const matchEl = document.getElementById('tooltip-node-match');
  const compEl = document.getElementById('tooltip-node-companies');

  if (titleEl) titleEl.textContent = skill.name;
  if (tierEl) tierEl.textContent = skill.tier;
  if (matchEl) matchEl.textContent = skill.match;
  if (compEl) compEl.textContent = skill.companies;

  tooltip.style.display = 'block';

  const rect = wrapper.getBoundingClientRect();
  const screenX = ((mouseVec.x + 1) / 2) * rect.width;
  const screenY = ((-mouseVec.y + 1) / 2) * rect.height;

  tooltip.style.left = `${Math.min(screenX + 15, rect.width - 230)}px`;
  tooltip.style.top = `${Math.min(screenY + 15, rect.height - 120)}px`;
}

function onCanvasMouseLeave() {
  if (mouseVec) {
    mouseVec.x = -999;
    mouseVec.y = -999;
  }
  const tooltip = document.getElementById('canvas-3d-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function onCanvasResize() {
  const wrapper = document.getElementById('spatial-canvas-wrapper');
  if (!wrapper || !camera || !renderer) return;
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  if (w <= 0 || h <= 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h);
  updateDiagnosticsBadge(w, h);
}

function updateDiagnosticsBadge(w, h) {
  const badgeText = document.getElementById('canvas-engine-text');
  if (badgeText) {
    badgeText.textContent = `WebGL Engine • ${w}x${h} • ${PLACEMENT_SKILLS_3D.length} Nodes • ${current3DMode.toUpperCase()}`;
  }
}

function set3DVisualizerMode(mode) {
  current3DMode = mode;
  const wrapper = document.getElementById('spatial-canvas-wrapper');

  if (wrapper) {
    wrapper.classList.toggle('warp-streak-active', mode === 'warp');
  }

  spatialNodes.forEach(node => {
    if (mode === 'constellation') {
      node.userData.targetPos = [...node.userData.constellationPos];
    } else if (mode === 'globe') {
      node.userData.targetPos = [...node.userData.globePos];
    } else if (mode === 'radar') {
      node.userData.targetPos = [...node.userData.radarPos];
    } else if (mode === 'warp') {
      node.userData.targetPos = [...node.userData.warpPos];
    }
  });

  if (globeMesh) globeMesh.visible = (mode === 'globe');
  if (radarMesh) radarMesh.visible = (mode === 'radar');
  if (linesMesh) linesMesh.visible = (mode === 'constellation');

  if (window.spatialAudio) window.spatialAudio.modeSwitch();

  const modeNames = {
    constellation: 'Quantum Constellation Web',
    globe: '3D Spherical Hologram Globe',
    radar: 'Placement Range Sonar Radar',
    warp: 'Hyper-Warp Speed Starfield'
  };
  showToast(`Switched 3D Mode: ${modeNames[mode] || mode}`);

  if (wrapper) {
    updateDiagnosticsBadge(wrapper.clientWidth, wrapper.clientHeight);
  }
}

function trigger3DShockwave(cx = 0, cy = 0, cz = 0, colorHex = 0x00F2FE) {
  if (appState.motionMode === 'reduced' || !scene) return;

  const count = 42;
  for (let i = 0; i < count; i++) {
    const pGeo = new THREE.SphereGeometry(2.5, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(pGeo, pMat);
    mesh.position.set(cx, cy, cz);

    const angle = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 4 + Math.random() * 8;

    mesh.userData = {
      velocity: new THREE.Vector3(
        Math.sin(phi) * Math.cos(angle) * speed,
        Math.sin(phi) * Math.sin(angle) * speed,
        Math.cos(phi) * speed
      ),
      life: 1.0
    };

    shockwaveParticles.push(mesh);
    scene.add(mesh);
  }
}

function create3DModeOverlays(targetScene, isMinimalist) {
  const globeGroup = new THREE.Group();
  const sphereGeo = new THREE.SphereGeometry(210, 24, 24);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: isMinimalist ? 0x94A3B8 : 0x00F2FE,
    wireframe: true,
    transparent: true,
    opacity: 0.16
  });
  globeGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

  const eqGeo = new THREE.RingGeometry(212, 214, 48);
  const eqMat = new THREE.MeshBasicMaterial({ color: 0x9D4EDD, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
  const eqMesh = new THREE.Mesh(eqGeo, eqMat);
  eqMesh.rotation.x = Math.PI / 2;
  globeGroup.add(eqMesh);

  globeMesh = globeGroup;
  globeMesh.visible = false;
  targetScene.add(globeMesh);

  const radarGroup = new THREE.Group();
  const ringGeo1 = new THREE.RingGeometry(78, 80, 48);
  const ringGeo2 = new THREE.RingGeometry(128, 130, 48);
  const ringGeo3 = new THREE.RingGeometry(183, 185, 48);
  const ringGeo4 = new THREE.RingGeometry(228, 230, 48);
  const rMat = new THREE.MeshBasicMaterial({
    color: isMinimalist ? 0xCBD5E1 : 0x00F5D4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.26
  });
  radarGroup.add(new THREE.Mesh(ringGeo1, rMat));
  radarGroup.add(new THREE.Mesh(ringGeo2, rMat));
  radarGroup.add(new THREE.Mesh(ringGeo3, rMat));
  radarGroup.add(new THREE.Mesh(ringGeo4, rMat));

  const sweepGeo = new THREE.RingGeometry(0, 230, 36, 1, 0, Math.PI / 3.5);
  const sweepMat = new THREE.MeshBasicMaterial({
    color: isMinimalist ? 0xE2E8F0 : 0x00F5D4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.28
  });
  const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
  radarGroup.add(sweepMesh);
  radarGroup.rotation.x = Math.PI / 2.7;
  radarGroup.position.y = -30;
  radarGroup.visible = false;

  radarMesh = radarGroup;
  targetScene.add(radarMesh);
}

function init3DModeButtons() {
  const modeButtons = document.querySelectorAll('.btn-3d-mode');
  modeButtons.forEach(btn => {
    btn.onclick = () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      set3DVisualizerMode(mode);
    };
  });

  const burstBtn = document.getElementById('btn-3d-burst');
  if (burstBtn) {
    burstBtn.onclick = () => {
      trigger3DShockwave();
      if (window.spatialAudio) window.spatialAudio.burst();
      showToast('Detonated Quantum 3D Shockwave!');
    };
  }

  const zoomInBtn = document.getElementById('btn-3d-zoom-in');
  const zoomOutBtn = document.getElementById('btn-3d-zoom-out');
  const resetCamBtn = document.getElementById('btn-3d-reset-cam-stage');

  if (zoomInBtn) {
    zoomInBtn.onclick = () => {
      targetCameraZ = Math.max(260, targetCameraZ - 90);
      if (window.spatialAudio) window.spatialAudio.click();
    };
  }
  if (zoomOutBtn) {
    zoomOutBtn.onclick = () => {
      targetCameraZ = Math.min(880, targetCameraZ + 90);
      if (window.spatialAudio) window.spatialAudio.click();
    };
  }
  if (resetCamBtn) {
    resetCamBtn.onclick = () => {
      reset3DCamera();
    };
  }
}

function reset3DCamera() {
  targetX = 0;
  targetY = 0;
  mouseX = 0;
  mouseY = 0;
  targetCameraZ = 520;
  orbitRotation = { x: 0, y: 0 };
  orbitVelocity = { x: 0, y: 0 };
  currentFocusNodeIdx = -1;
  orbitSpeedMultiplier = 1.0;

  if (camera) {
    camera.position.set(0, 0, 520);
    camera.lookAt(0, 0, 0);
  }

  spatialNodes.forEach(n => n.scale.set(1.0, 1.0, 1.0));
  const tooltip = document.getElementById('canvas-3d-tooltip');
  if (tooltip) tooltip.style.display = 'none';

  if (window.spatialAudio) window.spatialAudio.click();
  showToast('Reset 3D Constellation Camera to Origin');
}

function toggle3DAcceleration() {
  if (appState.motionMode === 'reduced') {
    showToast('Orbit acceleration disabled in reduced motion mode.');
    return;
  }
  orbitSpeedMultiplier = orbitSpeedMultiplier === 1.0 ? 3.5 : 1.0;
  const isAccelerated = orbitSpeedMultiplier > 1.0;
  const btn = document.getElementById('btn-3d-accelerate');
  if (btn) {
    btn.classList.toggle('active', isAccelerated);
    btn.setAttribute('aria-pressed', String(isAccelerated));
  }
  if (window.spatialAudio) window.spatialAudio.click();
  showToast(isAccelerated ? '3D Orbit Warp Activated (3.5x Speed)' : '3D Orbit Normal Speed (1.0x)');
}

function focusNextArchetypeNode() {
  if (!spatialNodes || spatialNodes.length === 0) return;
  currentFocusNodeIdx = (currentFocusNodeIdx + 1) % spatialNodes.length;
  const targetNode = spatialNodes[currentFocusNodeIdx];
  if (!targetNode) return;

  const pos = targetNode.userData.targetPos || [targetNode.position.x, targetNode.position.y, targetNode.position.z];
  targetX = pos[0] * 0.6;
  targetY = -pos[1] * 0.6;
  targetCameraZ = 380;

  spatialNodes.forEach((n, idx) => {
    if (idx === currentFocusNodeIdx) {
      n.scale.set(1.4, 1.4, 1.4);
      show3DNodeTooltip(n.userData.skill, pos);
    } else {
      n.scale.set(1.0, 1.0, 1.0);
    }
  });

  const skill = targetNode.userData.skill;
  if (skill && typeof skill.archetypeId === 'number' && typeof selectArchetype === 'function') {
    selectArchetype(skill.archetypeId);
  }

  if (window.spatialAudio) window.spatialAudio.nodeSelect();
  showToast(`Focused Cluster Node: ${skill?.name || 'Skill Node'}`);
}

function update3DSceneAesthetic(designheadMode) {
  cleanup3DScene();
  init3DScene();
}

function cleanup3DScene() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  const canvas = document.getElementById('spatial-hero-canvas');
  if (canvas) {
    canvas.removeEventListener('mousedown', onCanvasPointerDown);
    canvas.removeEventListener('wheel', onCanvasWheel);
    canvas.removeEventListener('click', onCanvasClick);
    canvas.removeEventListener('mouseleave', onCanvasMouseLeave);
  }
  window.removeEventListener('mousemove', onCanvasPointerMove);
  window.removeEventListener('mouseup', onCanvasPointerUp);
  window.removeEventListener('resize', onCanvasResize);

  if (particlesMesh) {
    if (particlesMesh.geometry) particlesMesh.geometry.dispose();
    if (particlesMesh.material) particlesMesh.material.dispose();
  }
  if (linesMesh) {
    if (linesMesh.geometry) linesMesh.geometry.dispose();
    if (linesMesh.material) linesMesh.material.dispose();
  }
  if (centralCoreGroup) {
    centralCoreGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  if (spatialNodes) {
    spatialNodes.forEach(node => {
      node.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    spatialNodes = [];
  }
  if (shockwaveParticles) {
    shockwaveParticles.forEach(p => {
      if (p.geometry) p.geometry.dispose();
      if (p.material) p.material.dispose();
    });
    shockwaveParticles = [];
  }
  if (renderer) renderer.dispose();
}

function init2DFallbackConstellation(canvas, wrapper) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = (canvas.width = wrapper.clientWidth || 600);
  const h = (canvas.height = wrapper.clientHeight || 500);

  const dots = [];
  for (let i = 0; i < 35; i++) {
    dots.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      r: 2 + Math.random() * 3,
      name: PLACEMENT_SKILLS_3D[i % PLACEMENT_SKILLS_3D.length].name
    });
  }

  function render2D() {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.fillStyle = '#00F2FE';

    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 85) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.stroke();
        }
      }
    }

    dots.forEach(d => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(render2D);
  }
  render2D();
}

// ==============================================================================
// 7. DEEP 3D CARD PARALLAX TILT & SPECULAR GLARE PHYSICS (ACROSS ALL CARDS)
// ==============================================================================
function init3DCardTilt() {
  if (appState.motionMode === 'reduced') return;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover) return;

  const cardSelector = '.kpi-card, .archetype-card, .company-card, .prompt-card, .btn-lab-item, .step-card, .analyzer-form-card, .report-workspace-card, .snapshot-band-card, .faq-item, .card-3d-tilt, .spatial-tilt-card, #hero-diagnostic-card';
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
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (((y - centerY) / centerY) * -9.5).toFixed(2);
      const rotateY = (((x - centerX) / centerX) * 9.5).toFixed(2);

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.025, 1.025, 1.025)`;

      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;
      glare.style.opacity = '1';
      glare.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 65%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      glare.style.opacity = '0';
    });
  });
}

function initHoverButtons() {
  if (appState.motionMode === 'reduced') return;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover) return;

  const magneticBtns = document.querySelectorAll('.btn-magnetic-glow, .btn-icon-circle');
  magneticBtns.forEach(btn => {
    if (btn.dataset.magneticBound) return;
    btn.dataset.magneticBound = 'true';

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const clampedX = Math.max(-5.0, Math.min(5.0, x * 0.15));
      const clampedY = Math.max(-5.0, Math.min(5.0, y * 0.15));
      btn.style.transform = `translate(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px) scale(1.02)`;
    }, { passive: true });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px) scale(1)';
    });

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

  let isPuckDragging = false;

  function updatePuck(clientX, clientY) {
    const rect = well.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxR = rect.width / 2 - 18;

    const distance = Math.min(maxR, Math.sqrt(dx * dx + dy * dy));
    const angleRad = Math.atan2(dy, dx);

    const px = Math.cos(angleRad) * distance;
    const py = Math.sin(angleRad) * distance;

    puck.style.transform = `translate(${px}px, ${py}px)`;

    let degrees = Math.round((angleRad * 180) / Math.PI);
    if (degrees < 0) degrees += 360;

    const shadowDist = Math.max(3, Math.round((distance / maxR) * 14));
    const shadowX = Math.round(Math.cos(angleRad) * shadowDist);
    const shadowY = Math.round(Math.sin(angleRad) * shadowDist);

    document.documentElement.style.setProperty('--neu-shadow-x', `${shadowX}px`);
    document.documentElement.style.setProperty('--neu-shadow-y', `${shadowY}px`);

    const compass = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const compassIdx = Math.round(degrees / 45) % 8;
    if (angleLabel) {
      angleLabel.textContent = `${degrees}° (${compass[compassIdx]})`;
    }
  }

  well.addEventListener('mousedown', (e) => {
    isPuckDragging = true;
    updatePuck(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (isPuckDragging) {
      updatePuck(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isPuckDragging) {
      isPuckDragging = false;
      if (window.spatialAudio) window.spatialAudio.click();
    }
  });

  well.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPuckDragging = true;
      updatePuck(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isPuckDragging && e.touches.length === 1) {
      updatePuck(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    isPuckDragging = false;
  });
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
    label.textContent = 'Demo Mode (Offline)';
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${appState.backendBaseUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      appState.apiStatus = 'connected';
      badge.className = 'engine-status-badge status-connected';
      label.textContent = 'API Connected (FastAPI)';
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    appState.apiStatus = 'offline';
    badge.className = 'engine-status-badge status-offline';
    label.textContent = 'API Offline (Demo Available)';
  }
}

// ==============================================================================
// 9. RESUME ANALYZER WORKSPACE CONTROLLER
// ==============================================================================
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

  // Clear file
  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetFileSelection();
    });
  }

  // Character counter
  if (jdTextarea && charCounter) {
    jdTextarea.addEventListener('input', () => {
      const len = jdTextarea.value.length;
      charCounter.textContent = `${len.toLocaleString()} characters`;
      appState.analyzer.jobDescription = jdTextarea.value;
      hideFieldError('jd-error-msg');
    });
  }

  // Clear JD action
  if (clearJdBtn && jdTextarea) {
    clearJdBtn.addEventListener('click', () => {
      jdTextarea.value = '';
      charCounter.textContent = '0 characters';
      appState.analyzer.jobDescription = '';
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
        appState.analyzer.jobDescription = company.sampleJd;
        charCounter.textContent = `${company.sampleJd.length.toLocaleString()} characters`;
        hideFieldError('jd-error-msg');
        showToast(`Loaded ${company.name} job description.`);
      }
    });
  });

  // Demo Mode Switch
  if (demoToggle) {
    demoToggle.addEventListener('change', (e) => {
      appState.analyzer.demoMode = e.target.checked;
      checkBackendHealth();
      showToast(appState.analyzer.demoMode ? 'Explicit Demo Mode Enabled' : 'Live Backend Mode Enabled');
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
    cancelBtn.addEventListener('click', () => {
      if (appState.analyzer.abortController) {
        appState.analyzer.abortController.abort();
        appState.analyzer.abortController = null;
        showToast('Analysis request cancelled.');
        resetAnalyzerState();
      }
    });
  }
}

function validateAndSetFile(file) {
  const errorElem = document.getElementById('file-error-msg');
  const selectedPill = document.getElementById('selected-file-pill');
  const fileNameDisplay = document.getElementById('selected-filename');

  hideFieldError('file-error-msg');

  // Validate PDF extension/mime
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    showFieldError('file-error-msg', 'Please upload a valid PDF document (.pdf format only).');
    return;
  }

  // Validate size (10 MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showFieldError('file-error-msg', 'File size exceeds 10 MB limit. Please upload a smaller PDF.');
    return;
  }

  appState.analyzer.selectedFile = file;
  fileNameDisplay.textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
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

function showFieldError(id, msg) {
  const elem = document.getElementById(id);
  if (elem) {
    elem.textContent = msg;
    elem.classList.add('visible');
  }
}

function hideFieldError(id) {
  const elem = document.getElementById(id);
  if (elem) {
    elem.classList.remove('visible');
    elem.textContent = '';
  }
}

async function executeAnalysis() {
  const jdTextarea = document.getElementById('jd-textarea');
  const analyzeBtn = document.getElementById('btn-analyze-submit');
  const cancelBtn = document.getElementById('btn-cancel-request');
  const btnText = document.getElementById('btn-analyze-text');
  const placeholder = document.getElementById('results-placeholder');
  const resultsArea = document.getElementById('streaming-results-area');
  const markdownArea = document.getElementById('markdown-stream-output');
  const alertCard = document.getElementById('analyzer-alert-card');

  // 1. Validation
  let hasError = false;
  const jd = (jdTextarea ? jdTextarea.value : '').trim();
  const file = appState.analyzer.selectedFile;

  if (!jd) {
    showFieldError('jd-error-msg', 'Please enter or select a target Job Description.');
    hasError = true;
  }
  if (!file && !appState.analyzer.demoMode) {
    showFieldError('file-error-msg', 'Please upload your resume PDF to begin.');
    hasError = true;
  }

  if (hasError) return;

  // 2. State setup
  appState.analyzer.status = 'analyzing';
  appState.analyzer.streamBuffer = '';
  appState.analyzer.abortController = new AbortController();

  if (alertCard) alertCard.style.display = 'none';
  if (placeholder) placeholder.style.display = 'none';
  if (resultsArea) resultsArea.style.display = 'flex';
  if (markdownArea) markdownArea.textContent = 'Connecting to inference engine...';

  analyzeBtn.disabled = true;
  btnText.textContent = 'Comparing with Placed Alumni...';
  if (cancelBtn) cancelBtn.style.display = 'block';

  // 3. Demo Mode Route
  if (appState.analyzer.demoMode) {
    runDemoAnalysis();
    return;
  }

  // 4. Live API Streaming Route
  try {
    const formData = new FormData();
    formData.append('resume_file', file);

    const url = new URL(`${appState.backendBaseUrl}/analyze`);
    url.searchParams.append('job_description', jd);

    const personaInput = document.querySelector('input[name="persona_option"]:checked');
    const selectedPersona = personaInput ? personaInput.value : (appState.executiveReview.selectedPersonaId || 'auto');
    url.searchParams.append('selected_persona_id', selectedPersona);

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
      signal: appState.analyzer.abortController.signal
    });

    if (!response.ok) {
      let errDetail = `Server returned status ${response.status} (${response.statusText})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch (e) {}
      throw new Error(errDetail);
    }

    markdownArea.textContent = 'Synthesizing placement patterns...';
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      appState.analyzer.streamBuffer += value;
      // Show plain text stream (without raw structured comment if present)
      const cleanStream = appState.analyzer.streamBuffer.replace(/<!-- STRUCTURED_REPORT_START -->[\s\S]*?<!-- STRUCTURED_REPORT_END -->/g, '');
      markdownArea.textContent = cleanStream + ' ...';
    }

    // Finished streaming: Parse structured report and safe render Markdown
    parseAndHydrateStructuredReport(appState.analyzer.streamBuffer);
    renderSafeMarkdown(appState.analyzer.streamBuffer, false);
    updateScoreRing(appState.analyzer.streamBuffer);
    showToast('Analysis completed successfully!');
    triggerConfetti();

  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('User cancelled request.');
      return;
    }
    console.error('Analysis failed:', err);
    if (alertCard) {
      alertCard.textContent = `Live analysis error: ${err.message}. You can switch to Demo Mode below to test the interface without a running backend.`;
      alertCard.style.display = 'block';
    }
    // Offer demo option in results area
    markdownArea.innerHTML = `
      <div style="padding:16px;background:rgba(251,113,133,0.1);border-radius:8px;border:1px solid rgba(251,113,133,0.3);">
        <strong style="color:var(--accent-coral);">Connection to Backend Failed</strong>
        <p style="margin-top:6px;font-size:0.88rem;">Ensure the backend is running at <code>http://127.0.0.1:8000</code> or toggle <strong>Demo Mode</strong> to preview the report layout.</p>
        <button class="btn-preset-chip" style="margin-top:10px;" onclick="enableDemoAndRun()">Run Illustrative Demo Analysis</button>
      </div>
    `;
  } finally {
    resetAnalyzerButtons();
  }
}

function enableDemoAndRun() {
  const demoToggle = document.getElementById('demo-mode-toggle');
  if (demoToggle) demoToggle.checked = true;
  appState.analyzer.demoMode = true;
  checkBackendHealth();
  executeAnalysis();
}

function runDemoAnalysis() {
  const markdownArea = document.getElementById('markdown-stream-output');
  const demoText = `
**1. Overall Score (out of 100):** 86/100

**2. What's Good:**
* **Strong Algorithmic & Systems Foundation:** Your demonstrated experience in backend API development (FastAPI/Python) and containerization mirrors top-tier placement profiles in the **General CS & Software Development** alumni archetype.
* **Quantifiable Metrics:** Including achievements like *"reduced response latency by 35%"* directly parallels successful candidates placed at **Microsoft** and **Amazon**.

**3. Actionable Recommendations:**
* **Highlight High-Throughput & Distributed Cache Patterns:** Placed engineers in this cluster heavily emphasize distributed memory caching (Redis, Memcached) and message broker decoupling (Kafka / RabbitMQ). Add these to your primary project descriptions.
* **Deepen Cloud Infrastructure Context:** Emphasize container orchestration (Kubernetes or AWS ECS) rather than basic Docker standalone usage, reflecting the target role's production deployment requirements.
* **Quantify Architectural Impact:** Explicitly link system architectural choices to business throughput (e.g., *"Scaled database queries to 10k+ QPS with read-replicas"*).

**4. Key Skills to Add:**
* **Distributed Systems Concurrency & Goroutines/AsyncIO Patterns**
* **Kafka Event-Driven Architecture & Message Streaming**
* **CI/CD Automated Deployment Pipelines (GitHub Actions / Terraform)**
`;

  let idx = 0;
  const interval = setInterval(() => {
    if (idx < demoText.length) {
      appState.analyzer.streamBuffer += demoText.charAt(idx);
      markdownArea.textContent = appState.analyzer.streamBuffer + ' ...';
      idx += 5;
    } else {
      clearInterval(interval);
      appState.analyzer.streamBuffer = demoText;
      hydrateDemoStructuredReport();
      renderSafeMarkdown(demoText, true);
      updateScoreRing(demoText);
      showToast('Illustrative Demo Analysis complete.');
      triggerConfetti();
      resetAnalyzerButtons();
    }
  }, 20);
}

function resetAnalyzerButtons() {
  const analyzeBtn = document.getElementById('btn-analyze-submit');
  const cancelBtn = document.getElementById('btn-cancel-request');
  const btnText = document.getElementById('btn-analyze-text');

  if (analyzeBtn) {
    analyzeBtn.disabled = false;
  }
  if (btnText) {
    btnText.textContent = 'Analyze My Placement Fit';
  }
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
  appState.analyzer.status = 'idle';
}

function resetAnalyzerState() {
  resetAnalyzerButtons();
  const placeholder = document.getElementById('results-placeholder');
  const resultsArea = document.getElementById('streaming-results-area');
  const markdownArea = document.getElementById('markdown-stream-output');

  if (placeholder) placeholder.style.display = 'flex';
  if (resultsArea) resultsArea.style.display = 'none';
  if (markdownArea) markdownArea.textContent = '';
}

function renderSafeMarkdown(rawText, isDemo) {
  const markdownArea = document.getElementById('markdown-stream-output');
  const provenanceTag = document.getElementById('provenance-tag');
  appState.analyzer.reportIsDemo = !!isDemo;

  if (provenanceTag) {
    if (isDemo) {
      provenanceTag.className = 'provenance-tag provenance-demo';
      provenanceTag.textContent = 'Illustrative Demo Output — Not Generated from Live Resume';
    } else {
      provenanceTag.className = 'provenance-tag provenance-live';
      provenanceTag.textContent = 'Live Session Analysis — Verified with Placed Alumni FAISS Store';
    }
  }

  if (!markdownArea) return;

  // Strip internal structured report JSON comment so it does not appear in human-readable markdown
  const cleanMarkdown = (rawText || '').replace(/<!-- STRUCTURED_REPORT_START -->[\s\S]*?<!-- STRUCTURED_REPORT_END -->/g, '').trim();

  if (typeof marked !== 'undefined') {
    try {
      const parsed = marked.parse(cleanMarkdown);
      markdownArea.innerHTML = sanitizeHtmlSafe(parsed);
    } catch (e) {
      markdownArea.textContent = cleanMarkdown;
    }
  } else {
    markdownArea.textContent = cleanMarkdown;
  }
}

// Client-side DOM Sanitizer against scripts, iframes, inline event handlers, and data/javascript URIs
function sanitizeHtmlSafe(dirtyHtml) {
  if (!dirtyHtml) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, 'text/html');

  // Strip dangerous executable elements
  const dangerousTags = ['script', 'style', 'object', 'embed', 'iframe', 'frame', 'link', 'meta'];
  dangerousTags.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Strip on* event attributes and javascript: URLs
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const val = attr.value.toLowerCase();
      if (name.startsWith('on') || val.includes('javascript:') || val.includes('vbscript:') || val.includes('data:text/html')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

function updateScoreRing(text) {
  if (appState.reportData && typeof appState.reportData.deterministic_score === 'number') {
    return updateScoreRingFromNumber(appState.reportData.deterministic_score);
  }
  // Fallback when the structured report has no deterministic_score. Match the
  // "N/100" form: a bare "Score…N" pattern captures the denominator in
  // "Overall Score (out of 100): 86/100" and reports 100.
  const match = text.match(/Overall Score[^\n]*?(\d{1,3})\s*\/\s*100/i) ||
                text.match(/\b(\d{1,3})\s*\/\s*100\b/);
  const score = match ? parseInt(match[1], 10) : NaN;
  if (Number.isFinite(score) && score >= 0 && score <= 100) {
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

    if (score >= 80) ring.style.stroke = 'var(--accent-emerald)';
    else if (score >= 65) ring.style.stroke = 'var(--accent-cyan)';
    else if (score >= 50) ring.style.stroke = 'var(--accent-amber)';
    else ring.style.stroke = 'var(--accent-coral)';
  }
}

// ==============================================================================
// 10. CAREER GENOME & CROSS-ARCHETYPE COMPARISON
// ==============================================================================
function initCareerGenome() {
  const selectorContainer = document.getElementById('archetypes-selector-grid');
  if (!selectorContainer) return;

  selectorContainer.innerHTML = archetypesDatabase.map(arch => `
    <div class="archetype-chip-card ${arch.id === appState.genome.selectedArchetypeId ? 'active' : ''}" 
         data-arch-id="${arch.id}" onclick="selectArchetype(${arch.id})">
      <div class="archetype-chip-header">
        <span class="arch-id-pill" style="color:${arch.accentColor};">${arch.clusterLabel}</span>
      </div>
      <h4 class="arch-title">${arch.name}</h4>
      <div class="arch-stats-row">Avg ${arch.medianCtc} • ${arch.placementRate} Placed</div>
    </div>
  `).join('');

  renderArchetypeDetail(appState.genome.selectedArchetypeId);
}

function selectArchetype(id) {
  appState.genome.selectedArchetypeId = id;
  document.querySelectorAll('.archetype-chip-card').forEach(card => {
    const cardId = parseInt(card.getAttribute('data-arch-id'), 10);
    card.classList.toggle('active', cardId === id);
  });
  renderArchetypeDetail(id);
}

function renderArchetypeDetail(id) {
  const arch = archetypesDatabase.find(a => a.id === id);
  const container = document.getElementById('archetype-detail-panel');
  if (!arch || !container) return;

  container.innerHTML = `
    <div class="detail-panel-grid">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.75rem;color:${arch.accentColor};margin-bottom:6px;font-weight:700;">
          ${arch.clusterLabel} ARCHETYPE PROFILE
        </div>
        <h3 style="font-family:var(--font-display);font-size:1.8rem;color:#fff;margin-bottom:12px;">${arch.name}</h3>
        <p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.7;margin-bottom:20px;">${arch.summary}</p>
        
        <strong style="font-size:0.85rem;color:var(--text-primary);display:block;margin-bottom:8px;">Distinguishing Technical Competencies (TF-IDF Grounded):</strong>
        <div class="archetype-keywords-cluster">
          ${arch.keySkills.map(s => `<span class="arch-keyword-pill">${s}</span>`).join('')}
        </div>

        <div style="display:flex;gap:12px;margin-top:24px;">
          <button class="btn-magnetic-glow" onclick="populateSampleJdFromArchetype(${arch.id})">
            Use This Path in Resume Matcher
          </button>
          <button class="btn-glass-shimmer" onclick="openArchetypeComparisonModal(${arch.id})">
            Compare with Another Path
          </button>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:var(--border-subtle);border-radius:var(--radius-lg);padding:24px;">
        <h4 style="font-family:var(--font-display);font-size:1.15rem;color:#fff;margin-bottom:16px;">Verified Placement Benchmarks</h4>
        
        <div style="margin-bottom:14px;">
          <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Median Compensation</span>
          <strong style="font-size:1.3rem;color:var(--accent-emerald);">${arch.medianCtc}</strong>
        </div>

        <div style="margin-bottom:14px;">
          <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Placement Conversion</span>
          <strong style="font-size:1.3rem;color:var(--accent-cyan);">${arch.placementRate}</strong>
        </div>

        <div style="margin-bottom:16px;">
          <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Representative Placements</span>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin-top:4px;">${arch.typicalRoles.join(' • ')}</p>
        </div>

        <div>
          <span style="font-size:0.75rem;color:var(--text-muted);display:block;">High-Conversion Capstone Themes</span>
          <ul style="font-size:0.82rem;color:var(--text-secondary);margin-top:6px;padding-left:18px;">
            ${arch.projectThemes.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      </div>
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
    appState.analyzer.jobDescription = arch.sampleJd;
    const charCounter = document.getElementById('jd-char-count');
    if (charCounter) charCounter.textContent = `${arch.sampleJd.length.toLocaleString()} characters`;
    showToast(`Loaded ${arch.name} sample Job Description.`);

    const analyzerSection = document.getElementById('analyzer');
    if (analyzerSection) analyzerSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function openArchetypeComparisonModal(primaryId) {
  appState.genome.compareArchetypeA = primaryId;
  const compareWithId = (primaryId + 1) % archetypesDatabase.length;
  appState.genome.compareArchetypeB = compareWithId;

  const modalBackdrop = document.getElementById('compare-modal-backdrop');
  renderComparisonModalContent();
  if (modalBackdrop) modalBackdrop.classList.add('open');
}

function renderComparisonModalContent() {
  const body = document.getElementById('compare-modal-body');
  if (!body) return;

  const archA = archetypesDatabase.find(a => a.id === appState.genome.compareArchetypeA);
  const archB = archetypesDatabase.find(a => a.id === appState.genome.compareArchetypeB);
  if (!archA || !archB) return;

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 style="font-family:var(--font-display);font-size:1.4rem;color:#fff;">Archetype Head-to-Head Comparison</h3>
      <div style="font-size:0.8rem;color:var(--text-muted);">TF-IDF Grounded Analysis</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div>
        <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Primary Path:</label>
        <select class="sort-select" style="width:100%;" onchange="updateComparisonSelection(0, this.value)">
          ${archetypesDatabase.map(a => `<option value="${a.id}" ${a.id === archA.id ? 'selected' : ''}>${a.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Comparison Path:</label>
        <select class="sort-select" style="width:100%;" onchange="updateComparisonSelection(1, this.value)">
          ${archetypesDatabase.map(a => `<option value="${a.id}" ${a.id === archB.id ? 'selected' : ''}>${a.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <table class="comparison-table">
      <thead>
        <tr>
          <th>Attribute</th>
          <th style="color:${archA.accentColor};">${archA.name}</th>
          <th style="color:${archB.accentColor};">${archB.name}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Median CTC</strong></td>
          <td>${archA.medianCtc}</td>
          <td>${archB.medianCtc}</td>
        </tr>
        <tr>
          <td><strong>Placement Rate</strong></td>
          <td>${archA.placementRate}</td>
          <td>${archB.placementRate}</td>
        </tr>
        <tr>
          <td><strong>Core Tech Stack</strong></td>
          <td>${archA.keySkills.slice(0, 4).join(', ')}</td>
          <td>${archB.keySkills.slice(0, 4).join(', ')}</td>
        </tr>
        <tr>
          <td><strong>Key Differentiator</strong></td>
          <td>${archA.typicalRoles[0]}</td>
          <td>${archB.typicalRoles[0]}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function updateComparisonSelection(index, val) {
  if (index === 0) appState.genome.compareArchetypeA = parseInt(val, 10);
  else appState.genome.compareArchetypeB = parseInt(val, 10);
  renderComparisonModalContent();
}

function closeCompareModal() {
  const modal = document.getElementById('compare-modal-backdrop');
  if (modal) modal.classList.remove('open');
}

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
    sortSelect.addEventListener('change', (e) => {
      appState.companies.sortBy = e.target.value;
      renderCompanyDirectory();
    });
  }

  document.querySelectorAll('.btn-company-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-company-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.companies.activeFilter = btn.getAttribute('data-filter');
      renderCompanyDirectory();
    });
  });

  renderCompanyDirectory();
}

function renderCompanyDirectory() {
  const container = document.getElementById('companies-grid-container');
  if (!container) return;

  const { searchQuery, activeFilter, sortBy } = appState.companies;

  let filtered = companyDatabase.filter(company => {
    const matchesSearch = !searchQuery || 
      company.name.toLowerCase().includes(searchQuery) ||
      company.skills.some(s => s.toLowerCase().includes(searchQuery)) ||
      company.role.toLowerCase().includes(searchQuery);

    const matchesFilter = activeFilter === 'all' || 
      company.tier === activeFilter || 
      company.category.toLowerCase().includes(activeFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'alumni') return b.alumniCount - a.alumniCount;
    if (sortBy === 'tier') return a.tier.localeCompare(b.tier);
    return 0;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: var(--bg-card); border-radius: var(--radius-lg); border: var(--border-subtle);">
        <i data-lucide="search-x" style="width: 42px; height: 42px; color: var(--text-muted); margin-bottom: 12px;"></i>
        <h4 style="font-family: var(--font-display); font-size: 1.2rem; color: #fff; margin-bottom: 6px;">No Matching Companies Found</h4>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">Try adjusting your search query or tier filters.</p>
        <button class="btn-preset-chip" onclick="resetCompanyFilters()">Reset Filters</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(c => `
    <div class="company-card" data-company-id="${c.id}">
      <div class="company-header">
        <div class="company-identity">
          <div class="company-avatar-logo" style="background:${c.logoColor};">${c.logoChar}</div>
          <div>
            <h4 style="font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:#fff;">${c.name}</h4>
            <span style="font-size:0.75rem;color:var(--text-muted);">${c.category}</span>
          </div>
        </div>
        <span class="tier-tag tier-${c.tier}">${c.tierLabel}</span>
      </div>

      <div class="company-stats-box">
        <div>
          <div class="c-stat-val">${c.highestCtc}</div>
          <div class="c-stat-label">Highest Package</div>
        </div>
        <div>
          <div class="c-stat-val">${c.alumniCount} Placed</div>
          <div class="c-stat-label">Placed Alumni</div>
        </div>
      </div>

      <div class="company-skills-tags">
        ${c.skills.slice(0, 4).map(s => `<span class="c-skill-pill">${s}</span>`).join('')}
      </div>

      <div class="company-footer-actions">
        <button class="btn-preset-chip" style="flex:1;padding:9px;" onclick="loadCompanyJd('${c.id}')">
          Match My Resume
        </button>
        <button class="btn-icon-circle" onclick="openCompanyModal('${c.id}')" title="View Interview Intel">
          <i data-lucide="info" style="width:16px;height:16px;"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
  init3DCardTilt();
}

function resetCompanyFilters() {
  appState.companies.searchQuery = '';
  appState.companies.activeFilter = 'all';
  const searchInput = document.getElementById('company-search-input');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.btn-company-filter').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
  });
  renderCompanyDirectory();
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
    appState.analyzer.jobDescription = company.sampleJd;
    const charCounter = document.getElementById('jd-char-count');
    if (charCounter) charCounter.textContent = `${company.sampleJd.length.toLocaleString()} characters`;
    showToast(`Loaded ${company.name} job description.`);

    const analyzerSection = document.getElementById('analyzer');
    if (analyzerSection) analyzerSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function openCompanyModal(companyId) {
  const company = companyDatabase.find(c => c.id === companyId);
  const modal = document.getElementById('company-modal-backdrop');
  const body = document.getElementById('company-modal-body');
  if (!company || !modal || !body) return;

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
      <div class="company-avatar-logo" style="background:${company.logoColor};width:54px;height:54px;font-size:1.3rem;">
        ${company.logoChar}
      </div>
      <div>
        <h3 style="font-family:var(--font-display);font-size:1.6rem;color:#fff;">${company.name}</h3>
        <p style="font-size:0.86rem;color:var(--text-muted);">${company.role} • ${company.tierLabel} Tier</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:20px;background:rgba(255,255,255,0.03);padding:14px;border-radius:var(--radius-md);">
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Highest Package</span>
        <strong style="color:var(--accent-cyan);font-size:1.15rem;">${company.highestCtc}</strong>
      </div>
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Median CTC</span>
        <strong style="color:var(--accent-emerald);font-size:1.15rem;">${company.medianCtc}</strong>
      </div>
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Interview Rating</span>
        <strong style="color:var(--accent-amber);font-size:1.15rem;">${company.difficulty}</strong>
      </div>
    </div>

    <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:18px;font-style:italic;">
      Provenance: ${company.provenance}
    </div>

    <h4 style="font-family:var(--font-display);font-size:1.15rem;color:#fff;margin-bottom:12px;">Verified Interview Rounds</h4>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">
      ${company.interviewRounds.map((r, i) => `
        <div style="background:rgba(255,255,255,0.04);border:var(--border-subtle);border-radius:var(--radius-sm);padding:12px 14px;">
          <strong style="color:var(--accent-blue-light);font-size:0.88rem;">Round ${i + 1}: ${r.name}</strong>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">${r.detail}</p>
        </div>
      `).join('')}
    </div>

    <div style="display:flex;gap:12px;">
      <button class="btn-magnetic-glow" style="flex:1;" onclick="loadCompanyJd('${company.id}'); closeCompanyModal();">
        Match My Resume with ${company.name}
      </button>
      <a href="${company.officialUrl}" target="_blank" rel="noopener noreferrer" class="btn-glass-shimmer" style="text-decoration:none;">
        Official Portal
      </a>
    </div>
  `;

  modal.classList.add('open');
  if (window.lucide) window.lucide.createIcons();
}

function closeCompanyModal() {
  const modal = document.getElementById('company-modal-backdrop');
  if (modal) modal.classList.remove('open');
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

  // Category filter buttons
  document.querySelectorAll('.btn-framework-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-framework-cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.promptStudio.categoryFilter = btn.getAttribute('data-cat');
      renderFrameworksList();
    });
  });

  // Task scenario chips for transparent recommendation
  document.querySelectorAll('.btn-scenario-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const scenarioKey = chip.getAttribute('data-scenario');
      triggerFrameworkRecommendation(scenarioKey);
    });
  });

  renderFrameworksList();
  selectFramework(appState.promptStudio.selectedFrameworkId);
}

function renderFrameworksList() {
  const listContainer = document.getElementById('frameworks-list-scroll');
  if (!listContainer) return;

  const { searchQuery, categoryFilter, selectedFrameworkId } = appState.promptStudio;

  const filtered = promptFrameworksRegistry.filter(fw => {
    const matchesSearch = !searchQuery || 
      fw.id.toLowerCase().includes(searchQuery) ||
      fw.name.toLowerCase().includes(searchQuery) ||
      fw.expansion.toLowerCase().includes(searchQuery) ||
      fw.bestFor.toLowerCase().includes(searchQuery);

    const matchesCat = categoryFilter === 'all' || fw.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;">
        No frameworks match your filter.
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(fw => `
    <button class="framework-item-btn ${fw.id === selectedFrameworkId ? 'active' : ''}" 
            onclick="selectFramework('${fw.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="fw-acronym">${fw.acronym}</span>
        <span style="font-size:0.68rem;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.06);color:var(--text-muted);text-transform:uppercase;">
          ${fw.category}
        </span>
      </div>
      <div class="fw-expansion">${fw.expansion}</div>
    </button>
  `).join('');
}

function selectFramework(id) {
  const fw = promptFrameworksRegistry.find(f => f.id === id);
  if (!fw) return;

  appState.promptStudio.selectedFrameworkId = id;
  appState.promptStudio.formData = { ...fw.sample };

  // Update list active states
  document.querySelectorAll('.framework-item-btn').forEach(btn => {
    const acronym = btn.querySelector('.fw-acronym');
    btn.classList.toggle('active', acronym && acronym.textContent.trim() === id);
  });

  renderFrameworkBuilder(fw);
  updatePromptPreview(fw);
}

function renderFrameworkBuilder(fw) {
  const titleElem = document.getElementById('builder-fw-title');
  const descElem = document.getElementById('builder-fw-desc');
  const container = document.getElementById('builder-fields-container');

  if (titleElem) titleElem.textContent = `${fw.name} (${fw.acronym})`;
  if (descElem) descElem.textContent = `${fw.expansion} — ${fw.bestFor}`;
  if (!container) return;

  container.innerHTML = fw.fields.map(field => `
    <div>
      <label class="fw-field-label">
        <span>${field.label}</span>
      </label>
      <input type="text" class="fw-field-input" data-field-key="${field.key}" 
             value="${appState.promptStudio.formData[field.key] || ''}" 
             placeholder="${field.placeholder || ''}">
    </div>
  `).join('');

  // Attach live input listeners
  container.querySelectorAll('.fw-field-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-field-key');
      appState.promptStudio.formData[key] = e.target.value;
      updatePromptPreview(fw);
    });
  });
}

function updatePromptPreview(fw) {
  const previewBox = document.getElementById('prompt-preview-code');
  const charCountElem = document.getElementById('prompt-char-count');
  if (!previewBox) return;

  let generatedText = `# [${fw.acronym}] ${fw.name}\n# Purpose: ${fw.bestFor}\n\n`;

  fw.fields.forEach(field => {
    const val = (appState.promptStudio.formData[field.key] || '').trim();
    generatedText += `[${field.key.toUpperCase()}]: ${val || '[Fill in ' + field.label + ']'}\n`;
  });

  previewBox.textContent = generatedText;
  if (charCountElem) {
    charCountElem.textContent = `${generatedText.length.toLocaleString()} characters`;
  }
}

function resetFrameworkFields() {
  const fw = promptFrameworksRegistry.find(f => f.id === appState.promptStudio.selectedFrameworkId);
  if (!fw) return;

  appState.promptStudio.formData = {};
  document.querySelectorAll('.fw-field-input').forEach(input => {
    input.value = '';
  });
  updatePromptPreview(fw);
  showToast('Framework fields reset.');
}

function copyPromptToClipboard() {
  const previewBox = document.getElementById('prompt-preview-code');
  if (!previewBox) return;

  const text = previewBox.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Prompt copied to clipboard!');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text, successMessage = 'Prompt copied to clipboard!') {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast(successMessage);
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
    showToast('No report yet — run an analysis first.');
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Report copied to clipboard.');
    }).catch(() => {
      fallbackCopy(text, 'Report copied to clipboard.');
    });
  } else {
    fallbackCopy(text, 'Report copied to clipboard.');
  }
}

function exportAnalysisReport() {
  const text = getAnalysisReportMarkdown();
  if (!text) {
    showToast('No report yet — run an analysis first.');
    return;
  }

  const score = appState.analyzer.extractedScore;
  const source = appState.analyzer.reportIsDemo
    ? 'Illustrative demo output — not generated from a live resume'
    : 'Live analysis of the uploaded resume';
  const scoreLine = typeof score === 'number'
    ? `Resume–JD alignment score: ${score}/100 (textual alignment, not a hiring probability)\n`
    : '';
  const mdContent = `# Resume Checker — Analysis Report
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
  showToast(`Downloaded ${filename}`);
}

function copyPromptAndOpenAnalyzer() {
  copyPromptToClipboard();
  const analyzer = document.getElementById('analyzer');
  if (analyzer) analyzer.scrollIntoView({ behavior: 'smooth' });
}

function triggerFrameworkRecommendation(scenarioKey) {
  const rec = scenarioRecommendations[scenarioKey];
  const box = document.getElementById('recommendation-explanation-box');
  if (!rec || !box) return;

  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <i data-lucide="check-circle" style="width:16px;height:16px;color:var(--accent-emerald);"></i>
      <strong style="color:#fff;">Recommended: ${rec.primaryId} (Alternative: ${rec.altId})</strong>
    </div>
    <p style="color:var(--text-secondary);font-size:0.85rem;line-height:1.6;">${rec.reason}</p>
    <div style="margin-top:8px;">
      <button class="btn-preset-chip" onclick="selectFramework('${rec.primaryId}')">Load ${rec.primaryId} Framework</button>
      <button class="btn-preset-chip" onclick="selectFramework('${rec.altId}')">Load Alternate: ${rec.altId}</button>
    </div>
  `;
  box.classList.add('visible');
  if (window.lucide) window.lucide.createIcons();

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
      showToast(samplePill.classList.contains('active') ? 'Filter Tag: Active' : 'Filter Tag: Inactive');
    });
  }

  // Preset chip in lab
  const samplePreset = document.getElementById('lab-preset-chip');
  if (samplePreset) {
    samplePreset.addEventListener('click', () => {
      showToast('Loaded preset template into buffer.');
    });
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  const msgElem = document.getElementById('toast-message');
  if (!toast || !msgElem) return;

  msgElem.textContent = msg;
  toast.classList.add('show');

  setTimeout(() => {
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
      colors: ['#FFFFFF', '#F4F4F5', '#E4E4E7', '#D4D4D8', '#A1A1AA']
    });
  }
}

// ==============================================================================
// 14. ACCESSIBILITY, MOTION TOGGLE & KEYBOARD NAVIGATION
// ==============================================================================
// ==============================================================================
// 14. ACCESSIBILITY, THEME SWITCHER & MOTION PREFERENCES
// ==============================================================================
function initThemeSwitcher() {
  const themeBtn = document.getElementById('btn-theme-toggle');
  const savedTheme = localStorage.getItem('resume_checker_theme') || 'cyber';
  setTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'cyber';
      const next = current === 'ceramic' ? 'cyber' : 'ceramic';
      setTheme(next);
      showToast(next === 'ceramic' ? 'Activated Soft Ceramic Neumorphism' : 'Activated Dark Velvet Neumorphism');
    });
  }
}

function setTheme(theme) {
  const themeLabel = document.getElementById('theme-mode-label');
  if (theme === 'ceramic') {
    document.documentElement.setAttribute('data-theme', 'ceramic');
    if (themeLabel) themeLabel.textContent = 'Theme: Minimalist Light';
    localStorage.setItem('resume_checker_theme', 'ceramic');
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeLabel) themeLabel.textContent = 'Theme: Minimalist Dark';
    localStorage.setItem('resume_checker_theme', 'cyber');
  }

  // Re-sync Three.js scene fog and clear colors if active
  if (scene && renderer) {
    const isCeramic = theme === 'ceramic';
    const fogColor = isCeramic ? 0xF8F9FA : 0x060608;
    if (scene.fog) scene.fog.color.setHex(fogColor);
    renderer.setClearColor(fogColor, isCeramic ? 0.35 : 0.0);
  }
}

function initSpatialScrollReveals() {
  if (typeof IntersectionObserver !== 'undefined') {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal-spatial, .step-card, .btn-lab-item, .recruiter-chip').forEach(el => {
      revealObserver.observe(el);
    });
  }

  // Recruiter Logo Fly-By Marquee interactive click interactions
  document.querySelectorAll('.recruiter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const companyName = chip.querySelector('strong')?.textContent || 'Company';
      showToast(`Selected ${companyName} Placement Intelligence`);
      const searchInput = document.getElementById('company-search-input');
      if (searchInput) {
        searchInput.value = companyName;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const intelSec = document.getElementById('company-intel');
      if (intelSec) intelSec.scrollIntoView({ behavior: 'smooth' });
    });
  });
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

      const darkBlur = Math.round(depth * 2.2);
      const lightOffset = Math.max(2, Math.round(depth * 0.75));
      const lightBlur = Math.round(depth * 1.8);

      const previewSurface = document.getElementById('neu-preview-surface');
      if (previewSurface) {
        previewSurface.style.boxShadow = `${depth}px ${depth}px ${darkBlur}px var(--neu-shadow-dark), -${lightOffset}px -${lightOffset}px ${lightBlur}px var(--neu-shadow-light)`;
      }
    });
  }

  if (toggleWrapper) {
    toggleWrapper.addEventListener('click', () => {
      const isChecked = toggleWrapper.classList.toggle('checked');
      toggleWrapper.setAttribute('aria-checked', isChecked);
      if (toggleLabel) {
        toggleLabel.textContent = isChecked ? 'State: Active (Glow)' : 'State: Inactive (Sunken)';
      }
      showToast(isChecked ? 'Tactile Switch: Active' : 'Tactile Switch: Inactive');
    });

    toggleWrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleWrapper.click();
      }
    });
  }

  // Explicit listeners for 3D constellation controls
  document.getElementById('btn-3d-accelerate')?.addEventListener('click', toggle3DAcceleration);
  document.getElementById('btn-3d-cluster-focus')?.addEventListener('click', focusNextArchetypeNode);
  document.getElementById('btn-3d-reset-cam')?.addEventListener('click', reset3DCamera);

  // Explicit listeners for Neumorphic shape previews
  document.getElementById('btn-neu-shape-raised')?.addEventListener('click', () => setNeuPreviewShape('raised'));
  document.getElementById('btn-neu-shape-inset')?.addEventListener('click', () => setNeuPreviewShape('inset'));
  document.getElementById('btn-neu-shape-convex')?.addEventListener('click', () => setNeuPreviewShape('convex'));
}

function setNeuPreviewShape(shape) {
  const surface = document.getElementById('neu-preview-surface');
  if (!surface) return;

  surface.classList.remove('neu-card-convex', 'neu-card-concave', 'neu-inset-panel');
  document.querySelectorAll('.neu-segmented-btn').forEach(b => b.classList.remove('active'));

  const btnRaised = document.getElementById('btn-neu-shape-raised');
  const btnInset = document.getElementById('btn-neu-shape-inset');
  const btnConvex = document.getElementById('btn-neu-shape-convex');

  if (shape === 'inset') {
    surface.classList.add('neu-inset-panel');
    if (btnInset) btnInset.classList.add('active');
    showToast('Applied Inset Recessed Surface');
  } else if (shape === 'convex') {
    surface.classList.add('neu-card-convex');
    if (btnConvex) btnConvex.classList.add('active');
    showToast('Applied Convex Extruded Surface');
  } else {
    if (btnRaised) btnRaised.classList.add('active');
    showToast('Applied Raised Pill Surface');
  }
}

function initAccessibilityAndMotion() {
  const motionBtn = document.getElementById('btn-motion-toggle');
  const motionLabel = document.getElementById('motion-mode-label');

  if (motionBtn && motionLabel) {
    motionBtn.addEventListener('click', () => {
      appState.motionMode = appState.motionMode === 'full' ? 'reduced' : 'full';
      document.body.setAttribute('data-motion', appState.motionMode);
      motionLabel.textContent = appState.motionMode === 'full' ? 'Motion: Full' : 'Motion: Reduced';

      if (appState.motionMode === 'reduced') {
        cleanup3DScene();
        showToast('Reduced Motion Enabled.');
      } else {
        init3DScene();
        init3DCardTilt();
        initHoverButtons();
        showToast('Full 3D Motion Enabled.');
      }
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
    }
  });

  // FAQ Accordion
  document.querySelectorAll('.faq-question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      }
    });
  });
}

// ==============================================================================
// 16. VOICE ASSISTANT, EXECUTIVE REVIEW & INTERACTIVE RESUME TAILORING MODULES
// ==============================================================================

// --- 16.1 RESULTS WORKSPACE TABS CONTROLLER ---
function initResultsWorkspaceTabs() {
  const tabBtns = document.querySelectorAll('.results-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPaneId = btn.getAttribute('aria-controls');
      if (!targetPaneId) return;

      // Update active states on tab buttons
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Update active states on tab panes
      document.querySelectorAll('.results-tab-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none';
      });

      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) {
        targetPane.classList.add('active');
        targetPane.style.display = 'block';
      }
    });
  });
}

function switchResultsTab(paneId) {
  const btn = document.querySelector(`.results-tab-btn[aria-controls="${paneId}"]`);
  if (btn) btn.click();
}

// --- 16.2 EXECUTIVE PERSONA CONTROLLER ---
function initExecutivePersonaSelector() {
  document.querySelectorAll('input[name="persona_option"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      appState.executiveReview.selectedPersonaId = e.target.value;
      const label = e.target.closest('.persona-option-card')?.querySelector('.persona-name')?.textContent || e.target.value;
      showToast(`Selected Senior Lens: ${label}`);
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

  if (titleElem) titleElem.textContent = review.persona_title || 'Executive Reviewer';
  if (roleElem) roleElem.textContent = `Target Role: ${review.target_role || 'Software Engineer'}`;

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
    verdictElem.textContent = (review.verdict || 'EVALUATING').replace(/_/g, ' ').toUpperCase();
  }

  if (reactionElem) {
    reactionElem.textContent = review.reaction_summary || 'Review generated based on submitted evidence.';
  }

  // Attention list
  if (attentionList) {
    const items = review.what_catches_attention || [];
    if (items.length === 0) {
      attentionList.innerHTML = '<p class="empty-hint">No high-impact metrics verified yet.</p>';
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
      skepticismList.innerHTML = '<p class="empty-hint">No major red-flag evidence gaps flagged.</p>';
    } else {
      skepticismList.innerHTML = items.map(obs => `
        <div class="exec-obs-item obs-skeptical">
          <div class="obs-bullet-title">${escapeHTML(obs.statement)}</div>
          <div class="obs-why-it-matters"><strong>Senior scrutiny:</strong> ${escapeHTML(obs.why_it_matters || '')}</div>
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
              <span class="meta-tag tag-impact">${escapeHTML(p.expected_improvement || p.impact || 'High Impact')}</span>
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
  if (diffCloseBtn) diffCloseBtn.addEventListener('click', toggleDiffDrawer);
  if (recalcBtn) recalcBtn.addEventListener('click', recalculateDraftFit);
  if (exportBtn) exportBtn.addEventListener('click', exportDraftAsMarkdown);
  if (popoverCloseBtn) popoverCloseBtn.addEventListener('click', closeMarkupPopover);
  if (popoverDismissBtn) popoverDismissBtn.addEventListener('click', closeMarkupPopover);
  if (popoverApplyBtn) popoverApplyBtn.addEventListener('click', applyMarkupReplacement);

  // Close popover on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMarkupPopover();
  });
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
  appState.resumeDraft.draftHistory = [{
    revisionId: appState.resumeDraft.currentRevisionId,
    text: displayText,
    markups: markups,
    score: report.overall_score
  }];
  appState.resumeDraft.historyIndex = 0;

  // Update Badge
  const revBadge = document.getElementById('draft-revision-badge');
  if (revBadge) revBadge.textContent = `Draft: ${appState.resumeDraft.currentRevisionId} (Original)`;

  // Update tab badge count
  const countBadge = document.getElementById('tab-markup-count-badge');
  if (countBadge) {
    countBadge.textContent = markups.length;
    countBadge.style.display = markups.length > 0 ? 'inline-block' : 'none';
  }

  updateUndoRedoButtons();
  renderDocumentViewer(displayText, markups);
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
    markEl.setAttribute('title', `${item.category}: ${item.critique}`);
    markEl.textContent = text.substring(item.start_char, item.end_char);

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

  appState.resumeDraft.selectedMarkupId = markupId;

  // Populate data
  const dot = document.getElementById('popover-color-dot');
  const catTag = document.getElementById('popover-category-tag');
  const sevTag = document.getElementById('popover-severity-tag');
  const quoteText = document.getElementById('popover-quoted-text');
  const critiqueText = document.getElementById('popover-critique-text');
  const rewriteInput = document.getElementById('popover-rewrite-input');

  if (dot) dot.className = `legend-dot ${item.color_tag || 'yellow'}`;
  if (catTag) catTag.textContent = (item.category || 'Feedback').replace(/_/g, ' ').toUpperCase();
  if (sevTag) sevTag.textContent = (item.severity || 'Review').toUpperCase();
  if (quoteText) quoteText.textContent = `"${item.original_text}"`;
  if (critiqueText) critiqueText.textContent = item.critique;
  if (rewriteInput) rewriteInput.value = item.suggested_rewrite;

  // Position popover
  const viewport = document.getElementById('resume-document-viewport');
  if (viewport && anchorEl) {
    const vRect = viewport.getBoundingClientRect();
    const aRect = anchorEl.getBoundingClientRect();

    let top = (aRect.bottom - vRect.top) + viewport.scrollTop + 8;
    let left = (aRect.left - vRect.left) + viewport.scrollLeft;

    // Constrain within viewport width
    if (left + 360 > vRect.width) {
      left = Math.max(16, vRect.width - 380);
    }
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  popover.style.display = 'block';
  if (rewriteInput) rewriteInput.focus();
}

function closeMarkupPopover() {
  const popover = document.getElementById('markup-detail-popover');
  if (popover) popover.style.display = 'none';
  appState.resumeDraft.selectedMarkupId = null;
}

function applyMarkupReplacement() {
  const markupId = appState.resumeDraft.selectedMarkupId;
  const item = appState.resumeDraft.markupItems.find(m => m.markup_id === markupId);
  const rewriteInput = document.getElementById('popover-rewrite-input');
  if (!item || !rewriteInput) return;

  const currentText = appState.resumeDraft.displayText;
  const newSegment = rewriteInput.value.trim();

  // Validate that the target span still matches original_text
  const existingSlice = currentText.substring(item.start_char, item.end_char);
  if (existingSlice !== item.original_text) {
    showToast('Document text was modified since this suggestion was created. Please Recalculate Fit.');
    closeMarkupPopover();
    return;
  }

  // Exact surgical replacement in browser memory
  const revisedText = currentText.substring(0, item.start_char) + newSegment + currentText.substring(item.end_char);

  // Increment revision count
  const nextRevNum = appState.resumeDraft.draftHistory.length;
  const newRevisionId = `rev_${nextRevNum}`;

  appState.resumeDraft.displayText = revisedText;
  appState.resumeDraft.currentRevisionId = newRevisionId;
  appState.resumeDraft.markupItems = []; // Invalidate stale offsets until recalculation

  // Append snapshot to history
  appState.resumeDraft.draftHistory = appState.resumeDraft.draftHistory.slice(0, appState.resumeDraft.historyIndex + 1);
  appState.resumeDraft.draftHistory.push({
    revisionId: newRevisionId,
    text: revisedText,
    markups: [],
    score: appState.analyzer.extractedScore
  });
  appState.resumeDraft.historyIndex = appState.resumeDraft.draftHistory.length - 1;

  // Update UI revision badge
  const revBadge = document.getElementById('draft-revision-badge');
  if (revBadge) revBadge.textContent = `Draft: ${newRevisionId} (Unsaved edits — Recalculate recommended)`;

  closeMarkupPopover();
  renderDocumentViewer(revisedText, []);
  updateUndoRedoButtons();
  showToast(`Replacement applied. Revision updated to ${newRevisionId}.`);
}

function undoDraftEdit() {
  if (appState.resumeDraft.historyIndex <= 0) return;
  appState.resumeDraft.historyIndex -= 1;
  const snapshot = appState.resumeDraft.draftHistory[appState.resumeDraft.historyIndex];

  appState.resumeDraft.displayText = snapshot.text;
  appState.resumeDraft.currentRevisionId = snapshot.revisionId;
  appState.resumeDraft.markupItems = snapshot.markups || [];

  const revBadge = document.getElementById('draft-revision-badge');
  if (revBadge) revBadge.textContent = `Draft: ${snapshot.revisionId} (Restored via Undo)`;

  renderDocumentViewer(snapshot.text, snapshot.markups || []);
  updateUndoRedoButtons();
  closeMarkupPopover();
  showToast(`Undone to ${snapshot.revisionId}.`);
}

function redoDraftEdit() {
  if (appState.resumeDraft.historyIndex >= appState.resumeDraft.draftHistory.length - 1) return;
  appState.resumeDraft.historyIndex += 1;
  const snapshot = appState.resumeDraft.draftHistory[appState.resumeDraft.historyIndex];

  appState.resumeDraft.displayText = snapshot.text;
  appState.resumeDraft.currentRevisionId = snapshot.revisionId;
  appState.resumeDraft.markupItems = snapshot.markups || [];

  const revBadge = document.getElementById('draft-revision-badge');
  if (revBadge) revBadge.textContent = `Draft: ${snapshot.revisionId} (Restored via Redo)`;

  renderDocumentViewer(snapshot.text, snapshot.markups || []);
  updateUndoRedoButtons();
  closeMarkupPopover();
  showToast(`Redone to ${snapshot.revisionId}.`);
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('btn-draft-undo');
  const redoBtn = document.getElementById('btn-draft-redo');

  if (undoBtn) undoBtn.disabled = appState.resumeDraft.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = appState.resumeDraft.historyIndex >= appState.resumeDraft.draftHistory.length - 1;
}

function toggleDiffDrawer() {
  const drawer = document.getElementById('draft-diff-drawer');
  if (!drawer) return;

  const isVisible = drawer.style.display !== 'none';
  if (isVisible) {
    drawer.style.display = 'none';
    appState.resumeDraft.diffOpen = false;
  } else {
    // Populate diff
    const origBox = document.getElementById('diff-original-content');
    const editBox = document.getElementById('diff-edited-content');
    if (origBox) origBox.textContent = appState.resumeDraft.originalText;
    if (editBox) editBox.textContent = appState.resumeDraft.displayText;

    drawer.style.display = 'block';
    appState.resumeDraft.diffOpen = true;
    showToast('Opened Revision Diff Drawer');
  }
}

async function recalculateDraftFit() {
  const recalcBtn = document.getElementById('btn-recalculate-draft');
  const jd = (appState.analyzer.jobDescription || '').trim();
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
      analysis_id: appState.reportData?.analysis_id || ('rec_' + Date.now()),
      target_job_description: jd || 'Software Engineer',
      edited_text: editedText,
      base_revision_id: appState.resumeDraft.currentRevisionId
    };

    const response = await fetch(`${appState.backendBaseUrl}/api/markup/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    appState.resumeDraft.currentRevisionId = data.new_revision_id;
    appState.resumeDraft.textHash = data.text_hash;
    appState.resumeDraft.markupItems = data.active_markups || [];

    // Update revision badge
    const revBadge = document.getElementById('draft-revision-badge');
    if (revBadge) revBadge.textContent = `Draft: ${data.new_revision_id} (Re-scored: ${data.recalculated_score}/100)`;

    // Update score ring
    appState.analyzer.extractedScore = data.recalculated_score;
    const scoreVal = document.getElementById('mini-score-val');
    if (scoreVal) scoreVal.textContent = data.recalculated_score;

    // Update tailoring view
    renderDocumentViewer(editedText, data.active_markups || []);
    showToast(`Recalculation complete! Fit score: ${data.recalculated_score}/100.`);

  } catch (err) {
    console.error('Recalculation error:', err);
    showToast(`Recalculation note: ${err.message}. Showing local draft changes.`);
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

  const score = appState.analyzer.extractedScore || 'N/A';
  const rev = appState.resumeDraft.currentRevisionId || 'rev_0';
  const mdContent = `# Resume Checker — Tailored Resume Draft (${rev})
Export Date: ${new Date().toLocaleString()}
Placement Alignment Score: ${score}/100
Note: Exported from in-browser tailoring session. Original PDF layout is preserved separately.

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
  showToast(`Exported tailored draft as resume_tailored_${rev}.md`);
}

// --- 16.4 VOICE ASSISTANT CONTROLLER (STT & TTS) ---
function initVoiceAssistantController() {
  const orbBtn = document.getElementById('voice-orb-btn');
  const drawer = document.getElementById('voice-assistant-drawer');
  const closeBtn = document.getElementById('voice-drawer-close-btn');
  const recordBtn = document.getElementById('voice-record-btn');
  const applyBtn = document.getElementById('voice-apply-btn');
  const discardBtn = document.getElementById('voice-discard-btn');
  const quickDictateBtn = document.getElementById('btn-quick-dictate-jd');
  const destSelect = document.getElementById('voice-dest-select');
  const localeSelect = document.getElementById('voice-locale-select');

  // Toggle drawer
  if (orbBtn && drawer) {
    orbBtn.addEventListener('click', () => {
      drawer.classList.toggle('open');
      const isOpen = drawer.classList.contains('open');
      orbBtn.setAttribute('aria-expanded', isOpen);
    });
  }

  if (closeBtn && drawer) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
      if (orbBtn) orbBtn.setAttribute('aria-expanded', 'false');
      stopVoiceRecognition();
    });
  }

  // Quick Dictate from JD box
  if (quickDictateBtn && drawer) {
    quickDictateBtn.addEventListener('click', () => {
      drawer.classList.add('open');
      if (destSelect) destSelect.value = 'append_jd';
      if (orbBtn) orbBtn.setAttribute('aria-expanded', 'true');
      startVoiceRecognition();
    });
  }

  // Destination / Locale changes
  if (destSelect) {
    destSelect.addEventListener('change', (e) => {
      appState.voice.destination = e.target.value;
    });
  }
  if (localeSelect) {
    localeSelect.addEventListener('change', (e) => {
      appState.voice.locale = e.target.value;
      if (appState.voice.recognition) {
        appState.voice.recognition.lang = e.target.value;
      }
    });
  }

  // Recording controls
  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      if (appState.voice.status === 'listening') {
        stopVoiceRecognition();
      } else {
        startVoiceRecognition();
      }
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', applyVoiceTranscript);
  }

  if (discardBtn) {
    discardBtn.addEventListener('click', discardVoiceTranscript);
  }

  // Check Web Speech API Support
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    appState.voice.sttSupport = 'unsupported';
    const statusDesc = document.getElementById('voice-live-status-desc');
    if (statusDesc) {
      statusDesc.textContent = 'Browser SpeechRecognition unavailable. You can type or use server transcription.';
    }
  } else {
    appState.voice.sttSupport = 'supported';
  }
}

function startVoiceRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('SpeechRecognition is not supported in this browser. Please use text input.');
    return;
  }

  try {
    if (!appState.voice.recognition) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = appState.voice.locale || 'en-IN';

      rec.onstart = () => {
        appState.voice.status = 'listening';
        updateVoiceUI('listening', 'Listening... Speak clearly into your microphone.');
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

        const preview = document.getElementById('voice-transcript-preview');
        if (preview) {
          preview.value = (appState.voice.finalTranscript + ' ' + interim).trim();
        }

        const applyBtn = document.getElementById('voice-apply-btn');
        if (applyBtn) applyBtn.disabled = (appState.voice.finalTranscript.trim().length === 0 && interim.trim().length === 0);
      };

      rec.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        appState.voice.status = 'error';
        let msg = `Microphone error: ${event.error}`;
        if (event.error === 'not-allowed') {
          msg = 'Microphone permission was denied. Please allow microphone access in browser settings.';
        } else if (event.error === 'no-speech') {
          msg = 'No speech detected. Please check your microphone.';
        }
        updateVoiceUI('error', msg);
      };

      rec.onend = () => {
        if (appState.voice.status === 'listening') {
          appState.voice.status = 'transcript_ready';
          updateVoiceUI('transcript_ready', 'Microphone paused. Review and apply your transcript.');
        }
      };

      appState.voice.recognition = rec;
    }

    appState.voice.recognition.lang = appState.voice.locale || 'en-IN';
    appState.voice.recognition.start();

  } catch (err) {
    console.error('Failed to start speech recognition:', err);
    showToast('Unable to start microphone. Please check permissions.');
  }
}

function stopVoiceRecognition() {
  if (appState.voice.recognition && appState.voice.status === 'listening') {
    appState.voice.recognition.stop();
    appState.voice.status = 'transcript_ready';
    updateVoiceUI('transcript_ready', 'Listening stopped. Review transcript below.');
  }
}

function updateVoiceUI(status, label) {
  const statusDesc = document.getElementById('voice-live-status-desc');
  const btnText = document.getElementById('voice-record-btn-text');
  const recordBtn = document.getElementById('voice-record-btn');
  const pulseBars = document.querySelectorAll('.pulse-bar');
  const orb = document.getElementById('voice-orb-btn');

  if (statusDesc) statusDesc.textContent = label;

  if (status === 'listening') {
    if (btnText) btnText.textContent = 'Stop Listening';
    if (recordBtn) recordBtn.classList.add('recording-active');
    pulseBars.forEach(b => b.classList.add('live'));
    if (orb) orb.classList.add('orb-listening');
  } else {
    if (btnText) btnText.textContent = 'Start Listening';
    if (recordBtn) recordBtn.classList.remove('recording-active');
    pulseBars.forEach(b => b.classList.remove('live'));
    if (orb) orb.classList.remove('orb-listening');
  }
}

function applyVoiceTranscript() {
  const preview = document.getElementById('voice-transcript-preview');
  const transcriptText = (preview ? preview.value : appState.voice.finalTranscript).trim();
  if (!transcriptText) {
    showToast('No transcript text to insert.');
    return;
  }

  const destSelect = document.getElementById('voice-dest-select');
  const destination = destSelect ? destSelect.value : (appState.voice.destination || 'replace_jd');

  if (destination === 'replace_jd') {
    const jdTextarea = document.getElementById('jd-textarea');
    if (jdTextarea) {
      jdTextarea.value = transcriptText;
      jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      showToast('Inserted transcript into Job Description (Replaced).');
    }
  } else if (destination === 'append_jd') {
    const jdTextarea = document.getElementById('jd-textarea');
    if (jdTextarea) {
      jdTextarea.value = (jdTextarea.value ? jdTextarea.value + '\n\n' : '') + transcriptText;
      jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      showToast('Appended transcript to Job Description.');
    }
  } else if (destination === 'coach_message') {
    const coachInput = document.getElementById('coach-query-input');
    if (coachInput) {
      coachInput.value = transcriptText;
      switchResultsTab('pane-career-coach');
      showToast('Inserted transcript into Career Coach.');
    }
  }

  // Close drawer after successful apply
  const drawer = document.getElementById('voice-assistant-drawer');
  if (drawer) drawer.classList.remove('open');
  discardVoiceTranscript();
}

function discardVoiceTranscript() {
  appState.voice.finalTranscript = '';
  appState.voice.interimTranscript = '';
  const preview = document.getElementById('voice-transcript-preview');
  if (preview) preview.value = '';
  const applyBtn = document.getElementById('voice-apply-btn');
  if (applyBtn) applyBtn.disabled = true;
  updateVoiceUI('idle', 'Microphone ready. Click Start Listening to dictate.');
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

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const rate = parseFloat(btn.getAttribute('data-rate')) || 1.0;
      appState.voice.ttsRate = rate;
      showToast(`Spoken Briefing Speed: ${rate}x`);
    });
  });
}

function toggleSpokenBriefing() {
  if (!window.speechSynthesis) {
    showToast('Browser SpeechSynthesis is not supported on this device.');
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
  const score = appState.analyzer.extractedScore || 84;
  const review = appState.executiveReview.review;
  const personaTitle = review?.persona_title || 'Senior Engineering Reviewer';
  const reaction = review?.reaction_summary || 'Your resume demonstrates concrete technical capability with areas for improvement.';

  const spokenBriefingText = `
    Executive diagnostic briefing from your ${personaTitle}.
    Your resume-to-job evidence alignment score is ${score} out of 100.
    Please note: this is an evidence alignment score, not a guarantee of employment.
    Top impression: ${reaction}.
    For concrete improvements, open the In-Document Tailoring tab to review actionable replacements.
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

  if (quickLabel) quickLabel.textContent = isPlaying ? 'Pause Briefing' : (isPaused ? 'Resume Briefing' : 'Spoken Briefing');
  if (drawerLabel) drawerLabel.textContent = isPlaying ? 'Pause' : (isPaused ? 'Resume' : 'Play Briefing');
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
    inputElem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitCoachQuery();
    });
  }

  if (fwSelect) {
    fwSelect.addEventListener('change', () => {
      const val = fwSelect.value;
      if (fwBadge) {
        fwBadge.textContent = val ? `${val} Active` : 'Standard Mode';
        fwBadge.style.color = val ? 'var(--accent-cyan)' : 'var(--text-muted)';
      }
      showToast(val ? `Framework Lens set to: ${val}` : 'Framework Lens: Standard Advice');
    });
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      const drawer = document.getElementById('voice-assistant-drawer');
      const destSelect = document.getElementById('voice-dest-select');
      if (drawer) drawer.classList.add('open');
      if (destSelect) destSelect.value = 'coach_message';
      startVoiceRecognition();
    });
  }
}

async function submitCoachQuery(overrideText) {
  const inputElem = document.getElementById('coach-query-input');
  const question = (overrideText || (inputElem ? inputElem.value : '')).trim();
  if (!question) return;

  if (inputElem) inputElem.value = '';

  const fwSelect = document.getElementById('coach-framework-select');
  const chosenFramework = fwSelect ? fwSelect.value : '';

  // 1. Render candidate user message
  appendCoachMessage('user', question);

  // 2. Render thinking indicator
  const thinkingId = 'thinking_' + Date.now();
  appendCoachThinking(thinkingId);

  try {
    const payload = {
      analysis_id: appState.reportData?.analysis_id || ('coach_' + Date.now()),
      user_message: question,
      selected_persona_id: appState.executiveReview.selectedPersonaId || 'auto',
      current_score: appState.analyzer.extractedScore || 84,
      target_role: 'Software Engineer',
      relevant_markup_ids: [],
      prompt_framework_id: chosenFramework,
      framework_id: chosenFramework
    };

    const response = await fetch(`${appState.backendBaseUrl}/api/coach/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    removeCoachThinking(thinkingId);

    if (response.ok) {
      const data = await response.json();
      appendCoachMessage('assistant', data.answer, data.referenced_evidence_ids, data.spoken_briefing);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }

  } catch (err) {
    removeCoachThinking(thinkingId);
    // Grounded offline/demo fallback with framework structure
    const fallbackAnswer = generateGroundedCoachReply(question, chosenFramework);
    appendCoachMessage('assistant', fallbackAnswer);
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

  const p = document.createElement('p');
  p.textContent = text;
  contentDiv.appendChild(p);

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
    <div class="msg-content"><p class="coach-thinking-dots">Consulting placement patterns<span>.</span><span>.</span><span>.</span></p></div>
  `;
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

function removeCoachThinking(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function generateGroundedCoachReply(question, framework = '') {
  const q = question.toLowerCase();
  const score = appState.analyzer.extractedScore || 84;
  const fw = (framework || '').toUpperCase().trim();

  if (fw === 'RACE') {
    return `As per the RACE (Role, Action, Context, Expectation) framework:
• Role: Executive Career Coach & Placement Evaluator.
• Action: Quantify your project metrics and define interface boundary ownership.
• Context: Technical campus placements evaluate distributed systems scale and concurrency handling.
• Expectation: Replace subjective phrasing with measurable latency improvements (e.g. from 240ms to 125ms).`;
  }
  if (fw === 'STAR') {
    return `As per the STAR (Situation, Task, Action, Result) framework:
• Situation: Target job descriptions expect demonstrable scale and performance tuning under production load.
• Task: Take architectural ownership of query caching and asynchronous batch processing.
• Action: Integrated FastAPI and Redis connection pooling with 92% automated unit test coverage.
• Result: Measured a 35% reduction in p95 latency while supporting 10,000 concurrent users.`;
  }
  if (fw === 'PAR') {
    return `As per the PAR (Problem, Action, Result) framework:
• Problem: Unoptimized database scans caused response degradation under peak placement traffic.
• Action: Restructured relational indexing and introduced Redis distributed caching.
• Result: Decreased p95 response time from 280ms to 65ms at 15k QPS.`;
  }
  if (fw === 'CLEAR') {
    return `As per the CLEAR (Context, Logic, Expectations, Action, Restriction) framework:
• Context: Technical Placement Preparation for Core SDE / AI Engineering roles.
• Logic: High-impact metrics establish authentic technical credibility over generic skill lists.
• Expectations: Provide measurable throughput and scale benchmarks.
• Action: Update your primary project descriptions to cite concrete testing depth.
• Restriction: Avoid unverified buzzwords; use verified metrics only.`;
  }
  if (fw === 'SMART') {
    return `As per the SMART (Specific, Measurable, Achievable, Relevant, Time-bound) framework:
• Specific: Target required skills in distributed caching, concurrency, and cloud deployment.
• Measurable: Aim for an alignment score above 85/100 by eliminating all passive phrasing.
• Achievable: Leverage your existing Python and algorithms coursework to build verified projects.
• Relevant: Directly maps to Super Dream placement expectations (₹20+ LPA).
• Time-bound: Complete bullet point revisions and draft recalculation within 48 hours.`;
  }
  if (fw) {
    return `As per the ${fw} framework:
• Guidance: Focus on measurable engineering throughput, test coverage, and clear component ownership.
• Structure: Format your project narratives using concrete technical benchmarks.`;
  }

  if (q.includes('quantif') || q.includes('metric')) {
    return `To quantify project impact effectively: state the baseline metric, the technical mechanism used, and the measured result. For example: "Reduced p95 search latency from 240ms to 125ms across 100k records by implementing FAISS IndexFlatL2." Avoid guessing unverified numbers.`;
  }
  if (q.includes('gap') || q.includes('skeptic')) {
    return `The senior review lens scrutinized vague responsibility claims (such as "assisted with pipelines") and buzzwords without implementation proof. Replace general statements with your specific code contributions.`;
  }
  if (q.includes('skill') || q.includes('missing')) {
    return `Review the Missing Required Skills section in your Diagnostic Report. If you have coursework or personal projects using those technologies, add a bullet detailing your implementation; never list isolated keywords without project evidence.`;
  }
  return `Based on your alignment score of ${score}/100, your systems and algorithmic projects are solid. Focus on eliminating passive phrasing in your secondary bullets and specifying exact cloud/framework versions.`;
}

// --- 16.7 STRUCTURED REPORT PARSING & DEMO HYDRATION ---
function parseAndHydrateStructuredReport(streamBuffer) {
  if (!streamBuffer) return;
  const match = streamBuffer.match(/<!-- STRUCTURED_REPORT_START -->([\s\S]*?)<!-- STRUCTURED_REPORT_END -->/);
  if (!match || !match[1]) return;

  try {
    const report = JSON.parse(match[1]);
    appState.reportData = report;

    if (typeof report.deterministic_score === 'number') {
      updateScoreRingFromNumber(report.deterministic_score);
    }

    if (report.persona_review) {
      renderExecutiveReview(report.persona_review);
    }
    if (report.canonical_display_text) {
      hydrateResumeTailoring(report);
    }
  } catch (err) {
    console.error('Failed to parse structured report JSON:', err);
  }
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

  const mockReport = {
    analysis_id: 'demo_analysis_' + Date.now(),
    overall_score: 86,
    canonical_display_text: demoResumeText,
    resume_markups: demoMarkups,
    persona_review: demoReview,
    revision_id: 'rev_0',
    text_hash: 'demo_sha256_hash'
  };

  appState.reportData = mockReport;
  renderExecutiveReview(demoReview);
  hydrateResumeTailoring(mockReport);
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

  const savedMode = localStorage.getItem('resume_checker_mode') || 'maximalist';
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
    if (btnMin) btnMin.classList.add('active');
    if (btnMax) btnMax.classList.remove('active');
    if (triggerToast) showToast('Designhead: Minimalist Zen Mode Activated', 'info');
  } else {
    document.body.classList.remove('designhead-minimalist');
    document.body.classList.add('designhead-maximalist');
    if (btnMax) btnMax.classList.add('active');
    if (btnMin) btnMin.classList.remove('active');
    if (triggerToast) showToast('Designhead: Maximalist Cyberpunk Mode Activated', 'success');
  }

  localStorage.setItem('resume_checker_mode', mode);

  if (typeof update3DSceneAesthetic === 'function') {
    update3DSceneAesthetic(mode);
  }
}

// ==============================================================================
// 15. LLM SERVICE RUNTIME MANAGEMENT & TELEMETRY HUB
// ==============================================================================
let cachedLLMProviders = [];
let selectedProviderTab = 'neural_local';

function initLLMControlHub() {
  const modal = document.getElementById('modal-llm-control-hub');
  const openBtn = document.getElementById('btn-llm-control-hub');
  const closeBtn = document.getElementById('btn-close-llm-modal');
  const testBtn = document.getElementById('btn-test-llm-ping');
  const activateBtn = document.getElementById('btn-activate-llm-provider');
  const keyToggleBtn = document.getElementById('btn-toggle-key-visibility');

  if (!modal || !openBtn) return;

  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    refreshLLMProvidersList();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  if (keyToggleBtn) {
    keyToggleBtn.addEventListener('click', () => {
      const input = document.getElementById('llm-input-api-key');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  }

  // Provider tabs switching
  document.querySelectorAll('.llm-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.llm-tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const provId = tab.getAttribute('data-provider');
      selectedProviderTab = provId;
      updateLLMProviderFormView(provId);
    });
  });

  // Test ping
  if (testBtn) {
    testBtn.addEventListener('click', handleTestLLMConnection);
  }

  // Activate provider
  if (activateBtn) {
    activateBtn.addEventListener('click', handleActivateLLMProvider);
  }

  // Initial boot fetch
  refreshLLMProvidersList();
}

async function refreshLLMProvidersList() {
  try {
    const res = await fetch('/api/llm/providers');
    if (!res.ok) return;
    const data = await res.json();

    cachedLLMProviders = data.providers || [];

    // Update active badges
    const navLabel = document.getElementById('nav-active-llm-label');
    const hudVal = document.getElementById('hud-llm-engine-val');
    const activeName = document.getElementById('llm-active-name');
    const activeModel = document.getElementById('llm-active-model-tag');

    const shortName = data.active_provider.includes('Neural') ? 'Neural Engine' : data.active_provider;
    if (navLabel) navLabel.textContent = `LLM: ${shortName}`;
    if (hudVal) hudVal.textContent = (data.active_model || 'NEURAL V2').toUpperCase();
    if (activeName) activeName.textContent = data.active_provider;
    if (activeModel) activeModel.textContent = data.active_model;

  } catch (err) {
    console.warn('Unable to query /api/llm/providers:', err);
  }
}

function updateLLMProviderFormView(providerId) {
  const keyGroup = document.getElementById('group-llm-api-key');
  const endpointGroup = document.getElementById('group-llm-endpoint');
  const modelInput = document.getElementById('llm-select-model');
  const descEl = document.getElementById('llm-provider-desc');
  const pingBox = document.getElementById('llm-ping-result-box');

  if (pingBox) pingBox.style.display = 'none';

  if (providerId === 'neural_local') {
    if (keyGroup) keyGroup.style.display = 'none';
    if (endpointGroup) endpointGroup.style.display = 'none';
    if (modelInput) modelInput.value = 'resume-checker-neural-v2';
    if (descEl) descEl.textContent = 'Zero-latency, zero-cost deterministic synthesis with all 18 prompt engineering frameworks. 100% offline & privacy-safe.';
  } else if (providerId === 'gemini') {
    if (keyGroup) keyGroup.style.display = 'block';
    if (endpointGroup) endpointGroup.style.display = 'none';
    if (modelInput) modelInput.value = 'gemini-2.0-flash';
    if (descEl) descEl.textContent = "Google's state-of-the-art Gemini 2.0 & 1.5 Flash models via the official OpenAI-compatible endpoint. Blazing sub-second inference.";
  } else if (providerId === 'openai') {
    if (keyGroup) keyGroup.style.display = 'block';
    if (endpointGroup) endpointGroup.style.display = 'none';
    if (modelInput) modelInput.value = 'gpt-4o-mini';
    if (descEl) descEl.textContent = 'OpenAI flagship GPT-4o, GPT-4o-mini, and o3-mini models for deep contextual engineering reasoning.';
  } else if (providerId === 'groq') {
    if (keyGroup) keyGroup.style.display = 'block';
    if (endpointGroup) endpointGroup.style.display = 'none';
    if (modelInput) modelInput.value = 'llama-3.3-70b-versatile';
    if (descEl) descEl.textContent = 'Groq LPU high-throughput hardware inference running Meta Llama-3.3-70B and DeepSeek-R1-distill at 500+ tokens/sec.';
  } else if (providerId === 'ollama') {
    if (keyGroup) keyGroup.style.display = 'none';
    if (endpointGroup) endpointGroup.style.display = 'block';
    if (modelInput) modelInput.value = 'llama3';
    if (descEl) descEl.textContent = 'Local privacy-first daemon running on http://localhost:11434/v1. Zero external network egress.';
  }
}

async function handleTestLLMConnection() {
  const pingBox = document.getElementById('llm-ping-result-box');
  const pingStatus = document.getElementById('llm-ping-status');
  const pingLatency = document.getElementById('llm-ping-latency');
  const pingReply = document.getElementById('llm-ping-reply');
  const apiKey = (document.getElementById('llm-input-api-key')?.value || '').trim();
  const model = (document.getElementById('llm-select-model')?.value || '').trim();
  const endpoint = (document.getElementById('llm-input-endpoint')?.value || '').trim();

  if (pingBox) {
    pingBox.style.display = 'block';
    pingStatus.textContent = 'Probing Provider Endpoint...';
    pingLatency.textContent = '...';
    pingReply.textContent = 'Sending test packet...';
  }

  try {
    const res = await fetch('/api/llm/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: selectedProviderTab,
        api_key: apiKey || null,
        model: model || null,
        base_url: endpoint || null
      })
    });

    const data = await res.json();
    if (data.success) {
      pingStatus.textContent = 'Connection Verified (Success)';
      pingStatus.style.color = '#10B981';
      pingLatency.textContent = `${data.latency_ms} ms`;
      pingReply.textContent = `Provider reply: "${data.reply}"`;
    } else {
      pingStatus.textContent = 'Probe Failed';
      pingStatus.style.color = '#EF4444';
      pingLatency.textContent = `${data.latency_ms || 0} ms`;
      pingReply.textContent = data.error || 'Check your credentials or network connectivity.';
    }
  } catch (err) {
    if (pingStatus) pingStatus.textContent = 'Network Error';
    if (pingReply) pingReply.textContent = String(err);
  }
}

async function handleActivateLLMProvider() {
  const modal = document.getElementById('modal-llm-control-hub');
  const apiKey = (document.getElementById('llm-input-api-key')?.value || '').trim();
  const model = (document.getElementById('llm-select-model')?.value || '').trim();
  const endpoint = (document.getElementById('llm-input-endpoint')?.value || '').trim();

  try {
    const res = await fetch('/api/llm/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: selectedProviderTab,
        api_key: apiKey || null,
        model: model || null,
        base_url: endpoint || null
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`LLM Activated: ${data.provider_name} (${data.model})`, 'success');
      if (modal) modal.style.display = 'none';
      refreshLLMProvidersList();
    } else {
      showToast(`Activation failed: ${data.error || 'Invalid configuration.'}`, 'error');
    }
  } catch (err) {
    showToast(`Error activating provider: ${err}`, 'error');
  }
}

// ==============================================================================

// ==============================================================================
// 17. PLACEMENT SNAPSHOT CONTROLLER (17-SEP-2026 HAVELOC DATASET)
// ==============================================================================
function initPlacementSnapshot() {
  const searchInput = document.getElementById('snapshot-company-search');
  const tableBody = document.getElementById('snapshot-table-body');
  if (!tableBody) return;

  function bindTargetButtons() {
    tableBody.querySelectorAll('.btn-use-context').forEach(btn => {
      btn.addEventListener('click', () => {
        const company = btn.getAttribute('data-company');
        const highest = btn.getAttribute('data-highest');
        const jdInput = document.getElementById('jd-textarea');
        if (jdInput) {
          const contextNote = `Target Company: ${company} (Placement Snapshot Benchmark: Highest listed CTC ₹${highest} LPA)\nRole Expectations:\n`;
          if (!jdInput.value.trim()) {
            jdInput.value = contextNote;
          } else if (!jdInput.value.includes(company)) {
            jdInput.value = contextNote + jdInput.value;
          }
          const charCount = document.getElementById('jd-char-count');
          if (charCount) charCount.textContent = `${jdInput.value.length} chars`;
          showToast(`Target context added for ${company}. Now upload your resume to analyze alignment.`);
          const analyzerSec = document.getElementById('analyzer');
          if (analyzerSec) analyzerSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Bind initial static rows
  bindTargetButtons();

  fetch('/placement_snapshot_2026.json')
    .then(res => {
      if (!res.ok) throw new Error('Snapshot endpoint returned ' + res.status);
      return res.json();
    })
    .then(data => {
      if (!data || !data.top_recruiters) return;

      const totalOffersEl = document.getElementById('kpi-total-offers');
      if (totalOffersEl && data.total_offers) totalOffersEl.textContent = Number(data.total_offers).toLocaleString();

      const employersEl = document.getElementById('kpi-unique-employers');
      if (employersEl && data.unique_employers) employersEl.textContent = data.unique_employers;

      const profilesEl = document.getElementById('kpi-job-profiles');
      if (profilesEl && data.job_profiles) profilesEl.textContent = data.job_profiles;

      const avgCtcEl = document.getElementById('kpi-avg-ctc');
      if (avgCtcEl && data.average_ctc_lpa) avgCtcEl.innerHTML = `₹${data.average_ctc_lpa} <span style="font-size:1rem;font-weight:600;">LPA</span>`;

      const medianCtcEl = document.getElementById('kpi-median-ctc');
      if (medianCtcEl && data.median_ctc_lpa) medianCtcEl.innerHTML = `₹${data.median_ctc_lpa} <span style="font-size:1rem;font-weight:600;">LPA</span>`;

      const highestCtcEl = document.getElementById('kpi-highest-ctc');
      if (highestCtcEl && data.highest_ctc_lpa) highestCtcEl.innerHTML = `₹${data.highest_ctc_lpa} <span style="font-size:1rem;font-weight:600;">LPA</span>`;

      tableBody.innerHTML = data.top_recruiters.map(r => `
        <tr>
          <td>${r.rank}</td>
          <td><strong>${r.company}</strong></td>
          <td style="text-align:right;">${r.offers}</td>
          <td style="text-align:right;">${r.profiles}</td>
          <td style="text-align:right;">₹${r.highest_ctc_lpa} LPA</td>
          <td style="text-align:center;">
            <button type="button" class="btn-use-context" data-company="${r.company}" data-highest="${r.highest_ctc_lpa}">Target</button>
          </td>
        </tr>
      `).join('');

      bindTargetButtons();
    })
    .catch(err => {
      console.warn('Placement snapshot using static fallback:', err);
    });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const rows = tableBody.querySelectorAll('tr');
      rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}


// 16. INITIALIZE ON DOM READY
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  // 1. Accessibility, Motion & Theme Setup
  initAccessibilityAndMotion();
  initThemeSwitcher();
  initDesignheadController();

  // 2. 3D WebGL Constellation & Spatial Engine
  init3DScene();

  // 3. Card Parallax Tilt & Specular Glare Physics
  init3DCardTilt();
  initHoverButtons();
  initSpatialScrollReveals();

  // 4. Backend Health Check & LLM Hub
  checkBackendHealth();
  initLLMControlHub();

  // 4.5 Placement Snapshot (17-Sep-2026 SRMIST)
  initPlacementSnapshot();

  // 5. Resume Analyzer Workspace
  initResumeAnalyzer();

  // 6. Career Genome & Archetypes
  initCareerGenome();

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

  // Hero Live Card Progress ring initial draw
  setTimeout(() => {
    const heroRing = document.getElementById('hero-gauge-ring');
    if (heroRing) {
      heroRing.style.strokeDashoffset = '75';
    }
  }, 600);
});

// Explicit Global Window Exports for Inline & External Triggers
window.setTheme = setTheme;
window.setDesignheadMode = setDesignheadMode;
window.toggle3DAcceleration = toggle3DAcceleration;
window.focusNextArchetypeNode = focusNextArchetypeNode;
window.reset3DCamera = reset3DCamera;
window.setNeuPreviewShape = setNeuPreviewShape;
window.switchResultsTab = switchResultsTab;
window.askCoachPrompt = askCoachPrompt;
window.openMarkupPopover = openMarkupPopover;
window.closeMarkupPopover = closeMarkupPopover;
window.enableDemoAndRun = enableDemoAndRun;



