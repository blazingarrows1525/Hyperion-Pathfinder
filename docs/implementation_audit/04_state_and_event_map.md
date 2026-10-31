# 04. State Store & Event Architecture Map

### Central `appState` Store (`app.js`)
- `appState.motionMode`: `'system'` | `'calm'` | `'full'`
- `appState.apiStatus`: `'healthy'` | `'offline'` | `'degraded'`
- `appState.analyzer`: `{ status, file, jd, abortController, streamBuffer, extractedScore, isDemo, errorMessage }`
- `appState.genome`: `{ selectedArchetypeId: 0, compareIds: [] }`
- `appState.companies`: `{ query: '', filterTier: 'all', sortBy: 'offers', selectedCompany: null }`
- `appState.promptStudio`: `{ selectedFrameworkId: 'CLEAR', activeCategory: 'all', searchQuery: '', formValues: {} }`
- `appState.resumeDraft`: `{ revisionId: 'rev_0', hash, originalText, currentText, annotations: [], undoStack: [], redoStack: [] }`
- `appState.executiveReview`: `{ selectedPersona: 'ai_director', status: 'idle', critique: null }`
- `appState.voice`: `{ isListening: false, transcript: '', supported: bool }`
- `appState.coachChat`: `{ history: [], isThinking: false }`

### Key Event Pipelines
1. **Intake & Analysis:** `File Select / DragDrop` -> `Validate MIME & Size (<10MB)` -> `Analyze Click` -> `AbortController Init` -> `POST /analyze Stream` -> `Chunk Decoded & Sanitized` -> `Report Parse` -> `Deterministic Score Ring Hydration`.
2. **Career Atlas 3D Selection:** Canvas Pointer Move/Click -> `THREE.Raycaster` -> Hit Node ID -> `selectArchetype(id)` -> `appState.genome.selectedArchetypeId` -> DOM Card Focus + Camera Ease + Detail Drawer Sync.
3. **In-Document Markup:** Click highlighted text span -> `openMarkupPopover(spanId)` -> View STAR rewrite suggestion -> `Apply Rewrite` -> New immutable `rev_n` created -> Offsets invalidated -> `POST /api/markup/recalculate` -> Re-score.
