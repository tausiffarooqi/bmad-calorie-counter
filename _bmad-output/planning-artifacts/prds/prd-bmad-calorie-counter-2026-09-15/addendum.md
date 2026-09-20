# Addendum: Calorie Tracker MVP

Supporting context that doesn't belong in the PRD narrative but is useful for downstream architecture/design work.

## Market grounding: photo-based calorie estimation (2026)

Gathered during PRD discovery to ground FR-2/FR-4 and the Non-Goals accuracy framing.

- **UX pattern:** camera-first, single-tap flow — snap → 1–3 sec AI estimate → editable breakdown → confirm. Nearly every comparable app treats photo recognition as a shortcut into an editable/confirmable entry, not a standalone oracle — barcode scan and text search are common fallback/refinement paths.
- **Accuracy:** real-world mean absolute % error runs ~11–20% even for the best-regarded apps (vs. marketing claims of 90-95%). Manual entry can still beat AI photo recognition by ~12% on average. Photo estimation systematically underestimates mixed/complex meals (curries, thalis, salads, smoothies) — aggregate under-logging of ~250–345 kcal per meal (~750–1,000 kcal/day) has been observed.
- **Differentiators between leaders and also-rans:** logging speed/friction removal is the single biggest lever; portion-size handling (depth sensors, reference objects, human-in-loop review) improves accuracy meaningfully over pure image classification; personalized coaching/recommendations and engagement mechanics matter for retention, since industry-wide retention is brutal (~3% at day-30 in some studies).
- **Pitfall to avoid:** overpromising accuracy erodes trust once users notice systematic misses on real (non-staged) meals — transparent uncertainty + fast correction (this PRD's FR-4 retry flow) beats hiding it. Also noted: genuinely time-of-day-adaptive meal recommendations are rare in the current landscape — a plausible point of differentiation for this product (see FR-9–FR-12).

*(Sources gathered by research subagent during PRD discovery: openhealth.blog, calorierankings.com, clinicalnutritionreport.com, PMC food-image-recognition validation studies, techcrunch.com, imaginovation.net, mindster.com.)*

## Food-recognition & calorie-estimation options (Node.js, cost-conscious)

Gathered to answer Open Question 8.1 (FR-2's technical approach). This is architecture input, not a PRD decision.

**Free / open-source:** OSS food-classifier models (Food-101-style, ~101 categories) runnable via `onnxruntime-node` or `@tensorflow/tfjs-node`, paired with a free nutrition DB for calorie lookup — USDA FoodData Central API (free key, 1,000 req/hr) or Open Food Facts API (no key, ~10-15 req/min). Caveat: narrow category set, no reliable portion-size estimation, accuracy trails commercial/LLM options — usable for a demo, not production-grade.

**Paid/hosted:**
- General multimodal LLMs (identify + estimate calories in one call): Gemini Flash (~$0.04-0.15/image), GPT-4o-mini ($0.15/$0.60 per 1M in/out tokens, images billed as tokens).
- Specialized food APIs: LogMeal (credit-based, food recognition + nutrition, contact-sales pricing); Edamam (Food DB + Vision API, **10,000 free image-recognition calls**, Nutrition Analysis free tier then ~$49/mo+); Nutritionix (nutrition DB only, no image recognition, free dev tier ~500 req/day); Clarifai (general "food" model, free Community tier 1,000 ops/mo).
- Google Cloud Vision: generic labels only (no food/calorie specificity), 1,000 free units/mo then $1.50/1,000.

**Recommendation for this prototype (superseded — see below):** a single multimodal LLM call (Gemini Flash or GPT-4o-mini) to identify food, estimate portion, and estimate calories in one round trip — no second network hop, no DB fuzzy-matching. Trade-off: calorie figures are model-reasoned estimates, not authoritative DB values. A two-stage hybrid (vision → structured label → USDA/Edamam DB lookup) could improve accuracy later but adds latency risk and matching complexity — reasonable as a v2 upgrade, not needed for MVP.

**Cost-conscious callout (historical, at time of PRD discovery):** Gemini Flash had the cheapest capable multimodal tier for prototyping; Edamam's 10,000 free image-recognition calls is a solid non-LLM fallback.

*(Sources: Gemini/GPT-4o-mini/Cloud Vision pricing pages, Edamam/Nutritionix/Clarifai/LogMeal pricing pages, USDA FoodData Central & Open Food Facts API docs, TensorFlow.js food-classification writeups — gathered by research subagent during PRD discovery.)*

**Resolved in architecture (2026-09-16):** the model landscape moved between this research and the architecture pass — the current model is `gemini-3.8-flash` (pricing: $0.75/1M input tokens, $3.75/1M output tokens through 2026-12-31, doubling thereafter), not the older "Gemini Flash" priced above. Chosen as the `EstimationProvider` adapter, pinned to `thinking_level: "low"` — verified higher thinking levels benchmark ~13s time-to-first-token, which would blow past a hard latency target. SM-1 was subsequently softened from a hard <5s requirement to an aspirational target for exactly this reason (real vision-model latency can exceed it; the UI shows an in-progress indicator instead — see PRD FR-9, and `ARCHITECTURE-SPINE.md` AD-2/AD-9). See `_bmad-output/planning-artifacts/architecture/architecture-bmad-calorie-counter-2026-09-16/ARCHITECTURE-SPINE.md` for the binding decision.

## Other deferred technical decisions (belong in architecture, not PRD)

- Confidence-threshold logic for triggering the FR-4 retry prompt.
- Password hashing / auth implementation details for FR-20 (Could-have).
