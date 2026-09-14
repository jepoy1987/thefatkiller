# Sprint 13 output safety fix

The provider previously validated JSON structure, numeric bounds and totals but accepted medical instructions inside otherwise valid text. The review then displayed those strings. Prompt instructions alone did not enforce the product's food-estimate-only policy.

`server/food-photo/safety.ts` now applies a deterministic, conservative text policy after strict schema validation. Both the OpenAI adapter and the generation orchestration enforce it before assigning a result for persistence. Alternate/mock providers therefore cannot bypass the boundary. Item names and uncertainty strings are checked individually and joined to detect instructions split across fields. Normalization handles case, compatibility characters, accents, invisible format characters and punctuation.

The policy rejects medication/dose/timing/prescribing language, diagnosis/treatment language, restriction/fasting, purging, compensatory exercise, and dangerous health instructions. It intentionally rejects some benign medical disclaimers too: these are outside the food-estimation domain. This is a bounded deterministic policy, not a guarantee of understanding every possible paraphrase, language or obfuscation. New observed variants should receive regression coverage and policy updates.

Rejected output raises the existing fixed `invalid_output` code without including provider text. Generation sends `result=null` and that code to `finish_food_photo`, which records a failed analysis. Its output cannot enter the completed review path. Photo deletion remains in the existing pipeline, confirmation cannot create logs from a failed analysis, and explicit retry remains subject to existing claim/allowance limits. No new provider calls occur on reload. There is no change to migrations, credentials, entitlements, scheduler configuration or manual logging.

Validation:

- Safety suite: 33/33, including 25 unsafe examples each checked in both item names and uncertainty text through the actual provider adapter; six safe estimates; split-field instruction; generation rejection/retry/reload.
- App/shared: 242/242 (web 156, shared packages 86).
- Local DB/security: 487/487, including nine new rollback tests for failed state, null result, fixed error, cleared path, blocked confirmation, no logs, and retry rules.
- Actual Storage: 10/10; concurrency: 3/3; retention Storage: 8/8.
- Lint, typecheck, build, git diff check: passed.
- Local schema lint: clean.
- No paid real-model analysis performed; deterministic stub transport used.

The prior real-model and authenticated Preview QA remain the food recognition/manual-flow evidence. This patch addresses the adversarial safety rejection defect. Remote cleanup scheduler activation remains a separate prerequisite for unattended/live use; staging scheduling stays disabled. No Production verification or Sprint 10 changes are included.
