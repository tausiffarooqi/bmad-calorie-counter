# Adversarial Review — Calorie Tracker MVP PRD

**Scope:** `prd.md` + `addendum.md`, as written on disk 2026-09-17. Solo hobby/prototype stakes — findings below are real internal inconsistencies/gaps a solo builder would trip over, not enterprise-scale concerns.

## Findings

### 1. [HIGH] Contradiction: Day boundary stated two different ways
§6.1 MVP Scope literally reads: "Daily Target & Day Boundary (user-set target with default, **5am–12am** local-timezone Day)." This directly contradicts §3 Glossary and FR-14, both of which define a Day as running **5am to the next day's 5am** (with 12am–5am entries attributed to the still-open prior Day). "5am–12am" (i.e., midnight) is a different, shorter window and appears to be a stale/uncorrected phrase from before the Day definition was revised (per `.memlog.md` entry 15, FR-14 was revised mid-session). Concrete fix: change §6.1 to "5am-to-next-5am local-timezone Day."

### 2. [HIGH] FR-12's Over-Target override doesn't cover FR-16/FR-17
FR-12 states the Over-Target override "takes precedence over FR-10 and FR-11" and "stops issuing Recommendations entirely" — but it never mentions FR-16 (decline-path recommendations) or FR-17 (pre-10am breakfast offer). Concrete failure case: a user logs a large Entry at 6am that alone exceeds their Daily Calorie Target, then opens the app before 10am. FR-17 says the system "additionally asks whether the user wants a breakfast Recommendation," and FR-16 says a decline "still displays Recommendations for the remaining Meal Slots" — both of which contradict FR-12's "stops issuing Recommendations entirely... at any time of day" if FR-12 isn't read as silently overriding them too. As written, an implementer could reasonably build either behavior from the FRs as stated.

### 3. [MEDIUM] The post-10pm Recommendation (FR-11) is never tied to a named Meal Slot
FR-10 only defines slot counts for the 5am–12pm and 12pm–10pm windows. FR-11 governs the 10pm-to-Day-end window but talks only about "a Recommendation," never a Meal Slot — even though the Glossary defines "Recommendation" as "a suggested meal **for a given Meal Slot**." It's left ambiguous whether the after-10pm recommendation is specifically "dinner" (if dinner hasn't been logged yet) or some other/unnamed slot, which matters for FR-9's "one Recommendation per remaining Meal Slot" response contract.

### 4. [MEDIUM] SM-1 no longer functions as a testable success metric
Since the recent update, SM-1 reads as a soft target that's explicitly fine to miss "as long as the UI clearly communicates work in progress" — but showing a progress indicator is unconditional (per FR-9's consequence) regardless of how fast or slow the response is. As written, SM-1 can't actually be failed: any latency is acceptable provided FR-9's spinner behavior holds, which is really validating FR-9, not response time. If response time is still worth tracking (e.g. for future optimization), consider reframing SM-1 as an observability/monitoring note rather than a "success metric," since it no longer gates anything.

### 5. [LOW] FR-18's tone-adaptive message has no branch for "no Entries logged the previous Day"
FR-18 branches only on "stayed within target" vs. "exceeded" for the previous Day's performance message. A Day with zero logged Entries (user didn't open the app, or logged nothing) is neither — the congratulatory and supportive-but-not-shaming framings both technically apply since 0 ≤ target, which would produce a slightly odd "congratulations, you stayed within target" message on a day the user didn't actually use the app.

## Verdict
Substantively sound for a hobby-prototype PRD — one real contradiction (§6.1 vs. Glossary/FR-14) that should be a quick text fix, one genuine precedence gap (FR-12 vs. FR-16/FR-17) worth a one-line clarification, and three smaller ambiguities/edge cases worth a mention but not blocking.
