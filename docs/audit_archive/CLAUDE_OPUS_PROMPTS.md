# Claude Opus Prompts (Copy-Paste Ready)

## CONTEXT FOR ALL PROMPTS

**Your Project Architecture:**
- **Backend:** FastAPI (Python 3.12) with Pydantic models, async routes, CORS
- **Frontend:** React 18 + TypeScript + Vite dev server (ports 5173–5174)
- **AI Providers:** Google Gemini (primary), OpenRouter with 5+ free model fallbacks, deterministic hardcoded lessons as final safety net
- **Core Game Loop:** Student sees lesson → answers quiz → enters procedurally-generated dungeon → solves algorithm challenges → moves to next concept

**Current Generation System:**
- **Dungeon Generation:** Room-graph procedural with 4–9 non-overlapping rooms, MST backbone connectivity, distance-weighted enemy/objective placement, guaranteed-reachable layouts via BFS validation
- **Lesson Generation:** Multi-provider cascading (OpenRouter free models → Gemini → hardcoded fallback) with automatic model failover on 429/rate-limit errors
- **Seeding:** Deterministic per-topic via `base_seed + (index * 7919) + topic_hash`, allows replayability and A/B testing
- **Payload Contract:** Level tiles (0=floor, 1=wall, 2=door, 3=enemy_spawn, 4=objective), enemies list with hp/damage/type, boss, objectives list

**Current Pain Points:**
1. All generated levels look similar—no variety in theme, architecture, difficulty gradient
2. Lessons sometimes feel generic; no adaptation to prior quiz performance
3. No tracking of misconceptions or student struggle patterns
4. Generation slow for large dungeons (>100 rooms)
5. No A/B testing framework to validate design changes

---

## PROMPT 1: Level Generation Quality & Replayability

```
You are an expert in dungeon design, procedural generation, and educational game flow.

Our game generates student-specific procedural dungeons aligned to algorithm concepts (sorting, recursion, etc.). Current system:
- Generates 4–9 rooms with MST + loop links, distance-weighted enemy/objective placement
- All dungeons start in top-left room, objective in farthest room (same pattern every run)
- Enemies placed deterministically based on distance heuristics
- Difficulty only scales via enemy HP/damage (Easy/Medium/Hard), not layout complexity

Problems:
1. Student sees same "pattern" in dungeon structure across 50+ concept levels
2. No architectural variation (branching dungeons, dead-ends for exploration, central hub vs linear chains)
3. Objective always farthest from start—predictable and boring
4. Boss arena placement fixed (always last room)

Your task: Design a **Level Architecture System** that:
- Generates 4–5 distinct dungeon "templates" (linear chain, central hub, branching tree, diamond, open hall)
- Ensures each template feels unique in exploration and pacing
- Varies boss arena placement based on template (e.g., hub center, optional side quest, final gate)
- Adds optional "mini-objectives" to encourage non-linear exploration
- Maintains reachability guarantee (BFS validation still works)
- Keeps generation <2s per dungeon

For each template, describe:
1. Room graph structure (e.g., "1 central room with 4 radial wings")
2. Enemy pacing strategy (clustering vs spread)
3. Objective placement rationale
4. How difficulty (Easy/Medium/Hard) reshapes the template

Also provide a Python pseudocode function signature that takes (template_type, width, height, difficulty, seed) and returns tiles + positions. Don't implement fully—just outline the control flow and data structures.
```

---

## PROMPT 2: Quality Scoring Function (0–100)

```
You are an expert in game design metrics and difficulty balancing.

Our generated dungeons have no quality evaluation. We need a scoring function to:
1. Validate layouts during generation (reject bad ones before returning)
2. A/B test which room templates produce the best student engagement
3. Balance difficulty across Easy/Medium/Hard tiers
4. Eventually feed into adaptive difficulty

Current rejection criteria: only checks reachability (BFS from start to objective). No other validation.

Your task: Design a **Dungeon Quality Score (0–100)** that evaluates:

1. **Exploration** (0–20 points)
   - Path length from start to objective (longer = more exploration)
   - Dead-ends ratio (some but not excessive)
   - Decision points (forced vs optional routes)

2. **Pacing** (0–20 points)
   - Enemy spacing (too clustered vs too sparse)
   - Enemy difficulty progression (challenge ramps)
   - Boss arena difficulty relative to prior rooms

3. **Layout** (0–20 points)
   - Symmetry / visual variety (avoid mirror dungeons)
   - Room size variance (avoid all same-size rooms)
   - Corridor efficiency (avoid long hallways)

4. **Reachability** (0–20 points)
   - Objective always walkable (pass/fail check: 0 or 20)
   - No isolated enemies (reachable by dungeon logic)
   - No dead-end corner objectives

5. **Concept Fit** (0–20 points)
   - Algorithm concept (sorting/recursion/graph_traversal) apparent in enemy types or room names
   - Boss is concept-appropriate (e.g., "SortBot" for sorting concept)
   - Objectives are solvable given current student skill level (TBD: learner model input)

For each category, provide:
- 2–3 specific metrics (measurable from tiles array + enemies list)
- Threshold for "good" vs "bad"
- Python-style pseudocode to calculate the score

Example format for Exploration:
```
Path length = BFS shortest path from start tile to objective tile
Min length threshold = height * 0.4  (ensure some exploration)
Max length threshold = height * 1.5  (avoid excessive backtracking)
Dead-end ratio = count(rooms with only 1 exit) / total_rooms
Good if 0.1 < ratio < 0.4
```

Also: How would you weight these 5 categories (% of total 100)? Suggest weights and justify.
```

---

## PROMPT 3: Adaptive Difficulty Engine

```
You are an expert in adaptive learning systems and difficulty balancing.

Our game currently has 3 static difficulty levels (Easy/Medium/Hard) chosen at signup. We want to adapt in real-time:
- If student consistently fails quizzes (2+ wrong answers), ease next dungeon
- If student breezes through (90%+ correct), increase difficulty
- If student's strategy changes (e.g., starts exploring vs speed-running), adjust pacing

Current system:
- Quiz scores pass to backend as JSON: {concept: "sorting", correct: true/false, time_ms: 1200}
- Level request includes optional seed/width/height/generation_mode, but no difficulty signal
- No persistent learner model (each level generated independently)

Your task: Design an **Adaptive Difficulty System** that:

1. Defines a **Learner State** (what to track per student):
   - Concept-specific: accuracy %, speed, misconception flags
   - Global: frustration signal (quit rate, time gaps), confidence level
   - Temporal: rolling 5-run window vs lifetime stats

2. Defines **Difficulty Transitions** (when and how to adapt):
   - Threshold for "too hard" (e.g., 2 consecutive >5min quiz attempts)
   - Threshold for "too easy" (e.g., 3 consecutive 90%+ scores in <2min)
   - Hysteresis to avoid rapid oscillation
   - Rules for which dungeon properties change (enemy count, boss HP, room count, complexity template)

3. Provides a **Calculation Function**:
   - Input: prior_quiz_performance (accuracy, speed), current_concept, learner_state
   - Output: (difficulty_level: Easy/Medium/Hard, dungeon_template: type, enemy_count: int)
   - Pseudocode acceptable

4. Addresses **Misconception Feedback**:
   - If student consistently fails on "understanding recursion vs iteration", flag as misconception
   - How does next recursion dungeon difficulty reflect this? (e.g., simpler layout, slower enemies)

Also: What learner model data would you store in a database? (3–5 key tables/fields)
```

---

## PROMPT 4: Boss Question System (Concept Reinforcement)

```
You are an expert in educational game design and formative assessment.

Our game ends each dungeon with a "boss arena" where student must answer a concept question to leave. Current system:
- Question generated by Gemini/OpenRouter each run
- No guarantee question tests actual concept (often generic)
- Students can skip or retry without limit (no penalty)
- No tracking of which misconceptions student has

Your task: Design a **Boss Question Pipeline** that:

1. **Question Generation Strategy**:
   - For concept (e.g., "sorting"), define 3–5 misconception categories:
     - Misconception A: "Bubble sort is O(n)"
     - Misconception B: "Sorting always needs comparison"
     - Misconception C: "Stability doesn't matter"
   - Question should target ONE misconception, not be generic
   - Avoid repetition: track last 5 questions shown to student, don't reuse

2. **Difficulty Adaptation**:
   - If student nailed prior quiz (90%+), ask higher-order question (e.g., "Compare sorting algorithms")
   - If student struggled (60–70%), ask misconception-check (e.g., "What's bubble sort's worst case?")
   - If student failed quiz (<60%), ask definition-level (e.g., "What does sorting mean?")

3. **Outcome Handling**:
   - Correct answer: Student leaves dungeon, wins
   - Incorrect answer: Student gets hint OR retry opportunity, not instant exit
   - Hint should address the targeted misconception (not generic)
   - Allow up to 2 retries before "soft failure" (student can continue but loses points)

4. **Data Tracking**:
   - Log: {student_id, concept, question_id, misconception_targeted, answer, correct, time_ms, attempt_num}
   - Use this to detect persistent misconceptions (e.g., "student always fails on Misconception B")
   - Surface misconceptions to instructor dashboard

Provide:
- Pseudocode for question_selector(concept, student_history, prior_quiz_score) → question_dict
- Structure of misconception_library (how to organize and store questions)
- Hint generation strategy (how to hint toward correct answer without spoiling)

Also: Would you generate questions on-the-fly (OpenRouter) or pre-author them? Tradeoffs?
```

---

## PROMPT 5: Multi-Provider Reliability & Question Quality

```
You are an expert in API reliability and LLM output validation.

Our system cascades: OpenRouter free models → Gemini → hardcoded fallback lessons. Current issues:
- OpenRouter models sometimes return malformed JSON or off-topic content
- Gemini rate-limit (429) causes user-facing 2–3s delays while retrying
- No validation that generated question actually matches the concept
- If fallback kicks in, user gets generic lesson (bad for learning)

Your task: Design a **Robust Question Generation Pipeline** that:

1. **Pre-Generation Validation** (before hitting LLM):
   - Check provider availability (ping health endpoint)
   - Validate API key expiry (if stored)
   - Check rate-limit headers from prior responses
   - Route intelligently (use fallback provider if primary is unreliable)

2. **Prompt Engineering** (maximize quality):
   - Provide JSON schema in prompt (e.g., `{"question": "...", "options": [...], "correct": 0}`)
   - Include concept description and misconception targets
   - Add "If unsure, respond with canonical_default_question" safety clause

3. **Output Validation** (after LLM):
   - Parse JSON; reject if malformed
   - Check question matches concept (keyword matching: "sort", "bubble", etc.)
   - Validate multiple-choice options aren't null/empty
   - Verify exactly one correct answer marked
   - If validation fails, retry same prompt with fallback provider

4. **Retry Strategy**:
   - Retry budget: 2 retries total (not per provider)
   - Exponential backoff: 100ms → 200ms → 400ms
   - If all retries fail, return hardcoded lesson + log incident
   - Track retry rate by provider (OpenRouter high? Deprioritize)

5. **Caching** (reduce API calls):
   - For concept + misconception combo, cache generated question for 24h
   - Serve cached question if available + student hasn't seen it yet
   - Log cache hit rate

Pseudocode for:
- `validate_question_output(json_response, concept) → (is_valid, error_reason)`
- `route_generation_request(concept, retry_count) → provider_name`
- `generate_with_fallback(concept, max_retries=2) → (question, source, retriable_error)`

Also: What metrics would you track in production? (3–5 key metrics)
```

---

## PROMPT 6: Learning Loop UX & Dropout Prevention

```
You are an expert in game UX design and learner retention.

Our game flow: Lesson (reading) → Quiz (3 questions) → Dungeon (3–4 min) → Next Concept
Current metrics: ~35% of students quit after lesson (never reach dungeon). Reason unknown.

Your task: Redesign the **Learning Loop UX** to reduce dropout:

1. **Lesson → Quiz Friction**:
   - How long should lesson reading be? (Currently unbounded—students may skip)
   - Should lesson be narrative (story) or didactic (explanation)?
   - Should quiz questions appear while reading (interleaved) or after?
   - Should quiz be mandatory or skippable? Current: mandatory

2. **Quiz → Dungeon Bridge**:
   - Current: Quiz ends, student sees dungeon loading screen
   - Proposed: Add motivation? (e.g., "Boss awaits!", victory screen for good quiz score)
   - Should quiz feedback be immediate (show correct answer) or delayed (reveal in dungeon)?
   - Should quiz difficulty affect dungeon difficulty? Currently no link

3. **Dungeon Pacing**:
   - Dungeon should take 3–4 min max (students abandon >5 min games)
   - Combat encounters should feel progressively harder or change type (combat vs puzzle)
   - Should there be mini-checkpoints (safe zones where students can save) or pure linear flow?
   - Boss arena: final 30s gauntlet or 2-min showdown?

4. **Dropout Signals to Track**:
   - Time-to-abandon (if <30s, likely confusing UX)
   - Quit at quiz vs dungeon vs boss
   - Return rate (did student come back next day?)
   - Device/device-type correlation (mobile dropouts higher?)

5. **Retention Hooks**:
   - Streak/achievement system (e.g., "3-day learning streak")
   - Social proof (e.g., "92% of students beat this dungeon")
   - Preview next concept ("Next: Recursion—explore towers!")
   - Difficulty customization (let student choose Easy -> Medium upfront, not auto-adapt)

Provide:
- Flow diagram (3–5 boxes) showing suggested lesson → quiz → dungeon → loop transitions
- For each transition, list 2–3 design options + tradeoffs
- 3 specific UX changes you'd A/B test immediately (highest impact first)
- Instrumentation plan: what events to log at each step?

Also: If you had 2 weeks to improve retention, what's your priority order?
```

---

## PROMPT 7: Telemetry, Analytics & A/B Testing Framework

```
You are an expert in game analytics and online experimentation.

Our game has no instrumentation—no idea how students interact with dungeons, which concepts are hard, or if design changes help.

Your task: Design a **Telemetry & Experimentation System** that:

1. **Event Schema** (what to log):
   - Student lifecycle: signup, first_lesson, first_quiz, first_dungeon, quit_session
   - Quiz interaction: quiz_started, question_shown, answer_submitted, quiz_passed
   - Dungeon interaction: dungeon_started, room_entered, enemy_defeated, damage_taken, objective_collected, boss_defeated, dungeon_passed/quit
   - AI calls: lesson_generation_started, provider_used (gemini/openrouter/fallback), generation_time_ms, success/failure
   - Performance: fps, network_latency, input_lag

   For each event, what fields should you capture? (timestamp, user_id, concept, difficulty, device_type, ...)

2. **KPIs (Learning Outcomes)**:
   - **Completeness**: % of students who finish 5+ concepts
   - **Mastery**: % of students with >80% accuracy on quiz + dungeon combo per concept
   - **Engagement**: avg concepts attempted per student per session
   - **Retention**: % of students who return >3 days, >7 days
   - **Time-to-mastery**: avg sessions needed to reach 80% accuracy

   For each KPI, define:
   - Target value (e.g., "70% mastery on first attempt")
   - Measurement period (per concept? per student? per day?)
   - Confidence threshold (90%? 95%?)

3. **A/B Testing Plan** (how to validate changes):
   - Hypothesis: "Adding difficulty preview reduces quit-after-quiz by 10%"
   - Test design: 50% control (current), 50% treatment (preview shown)
   - Population: new students only (don't confuse returning users)
   - Duration: 2 weeks (or until N=500 per group)
   - Success metric: quit_rate_after_quiz in each group
   - Guardrail metrics: (metrics you DON'T want to regress)
   - Statistical test: (ttest? chi-squared?)

   Provide 3–5 high-impact changes you'd A/B test in priority order.

4. **Dashboard / Monitoring**:
   - What 5–7 metrics should be on a "health dashboard" checked daily?
   - How would you alert if a metric regresses 20%?
   - What would a "concept difficulty heatmap" show? (which concepts are hard?)

Provide:
- Python pseudocode for logging a "dungeon_passed" event with all relevant fields
- SQL schema for storing events (3–4 tables: students, events, quiz_results, dungeon_results)
- A/B test result template (how to report: effect size, p-value, confidence, success/fail)

Also: What's your sample size calculation for 80% power, α=0.05? (for a 10% improvement)
```

---

## PROMPT 8: Technical Debt & Refactoring Roadmap

```
You are an expert in software architecture and technical debt prioritization.

Our codebase is growing (procedural generator, multi-provider lesson system, adaptive difficulty planned). We need to audit and prioritize blockers before scaling.

Your task: Audit these areas and rank TOP 10 BLOCKERS:

**Code Quality:**
- Level generator is 400+ lines, single function. Extract helpers? (Room class? Algorithm modules?)
- Gemini service has provider logic mixed with payload normalization. Separate concerns?
- No type hints in some Python functions. Mypy compliance?
- Frontend LessonView.tsx has try/catch with GET fallback (brittle). Formalize error handling?

**Performance:**
- Dungeon generation takes up to 2s for large maps (100 rooms). Too slow?
- Each generation attempt retries 8x before fallback. Wasteful? Better early exit?
- OpenRouter request to response can be 3–5s. Add client-side caching (localStorage)?
- Database queries not indexed. Query latency impact?

**Reliability:**
- No circuit breaker for OpenRouter fallback (could retry indefinitely). Add exponential backoff?
- Lesson endpoint has no rate-limiting. Abuse scenario?
- Deterministic seed logic relies on hash collision resistance. Document assumptions?
- No rollback strategy if new generation code introduces bugs. Feature flags?

**Architecture:**
- Student learner model not persisted (each level independent). Need database schema?
- No system for A/B testing (all students get same algorithm). Need experiment framework?
- OpenRouter model list hardcoded. Should be database-driven (easy model swap)?
- No instrumentation (can't debug user issues). Which events are critical to log?

**Scaling:**
- Backend handles lesson + level + quiz in single thread. Separate services?
- Frontend bundle size 239 kB (gzip). Acceptable? Should split code?
- No caching layer (Redis) for generated lessons. Needed for 1000+ concurrent users?
- Database not specified. Postgres? Sqlite? Impact on scale?

Your task: 
1. List TOP 10 BLOCKERS (most impactful to fix first)
2. For each, provide:
   - **Risk**: What breaks if you don't fix this? (1–5 scale)
   - **Effort**: How many dev days to fix? (1–20 scale)
   - **Impact**: How much better is the system after fix? (1–5 scale)
   - **Priority**: (Risk + Impact) / Effort == scoring (higher = do first)
   - **Quick-fix**: Can you patch it in 1 day? (Yes/No)
   - **Long-fix**: Production-ready solution (2–10 days)?
   - **Validation**: How do you know it's fixed? (test, metric, code review?)

3. Suggest a 3-month roadmap:
   - Month 1: Fix top 3–4 (foundational)
   - Month 2: Scale infrastructure (if needed)
   - Month 3: Add features (adaptive difficulty, A/B testing)

Provide a ranked table (Risk | Effort | Impact | Priority | Blocker Name) so you can sort by priority automatically.

Also: Which 2 blockers have outsized impact on user experience? Why?
```

---

## HOW TO USE THESE PROMPTS

1. **Open Claude.ai** (or your Claude Opus access)
2. Copy **ONE prompt** from above (start with Prompt 1: Level Architecture)
3. Paste into Claude conversation
4. Follow Claude's guidance (they'll ask clarifying questions if needed)
5. Save Claude's response in a document for implementation reference
6. Move to next prompt after you've understood the output

**Suggested sequence:**
- P1 + P2 first (foundation: what does good level generation look like?)
- P3 + P4 next (adaptive system: what data/logic do we need?)
- P5 + P7 in parallel (reliability + metrics: how do we ensure quality?)
- P6 after UX research (dropout investigation)
- P8 last (refactor roadmap after you've decided direction)

**Each prompt should take 15–30 min in Claude conversation**, resulting in actionable design docs.
