> Historical initial implementation report. Current retention design and activation instructions: [Sprint 13 retention](sprint-13-retention.md). Subsequent local real-model QA passed; Preview provider configuration is branch-scoped. Authenticated Preview QA remains manual.

# Sprint 13 — AI food photo logging

Status: local implementation/QA passed; **real-model QA is mandatory and pending**. No OpenAI key is available. Keep the PR draft/open/unmerged. Staging migration application is pending explicit approval requested after automatic approval review rejected authorization from the attached brief.

## Audit and architecture

Main baseline `625e70175e729c6732365bd76adcd7c6ff477497`: 21 migrations, 420 DB tests and 175 app/shared tests. Sprint 4 already provides owner-scoped foods, immutable-at-log-time `food_logs` snapshots, saved meals, quick add, water and timezone-aware daily totals. Confirmed photo items reuse that snapshot model with `food_id=null`, one serving and the reviewed portion/macros; no parallel nutrition system or automatic permanent saved food is created. Existing food-log editing remains available.

Progress-photo storage patterns were inspected. Food analysis uses a separate private bucket and tighter server-only upload processing. Entitlement resolution reuses the existing private feature resolver and authenticated access helpers. Paused Sprint 10's provider/service boundaries were inspected read-only for architectural patterns; no Sprint 10 code or schema was copied or imported.

## Data and security

The additive `sprint_13_food_photo` migration adds `ai_food_photo` (Free disabled, Premium/Coach enabled), `food_photo_analyses`, a private `food-analysis` bucket and narrowly scoped RPCs. UI checks feature access rather than plan names. Analysis upload and database claim/confirmation enforce entitlement independently.

Analysis fields include owner, status, exact storage path, provider/model/prompt version, structured result, safe error code, attempt count, timestamps/expiry and confirmed log IDs. Statuses: pending/completed/failed/confirmed/expired. Ordinary clients have owner-only unexpired SELECT, no arbitrary INSERT/UPDATE. Worker mutation RPCs are service-role only, with empty search paths. The authenticated confirmation RPC derives `auth.uid()`, locks the analysis, validates edited items/time, writes all food snapshots atomically, and stores their IDs. Repeated confirmations return those IDs without reinserting—even if a user later edits/deletes a log.

Coach relationships grant no photo, analysis, confidence or raw-output access. Existing nutrition-summary sharing continues through existing code. No GLP-1 details, medication names/doses, private notes or unrelated health records enter the provider request.

## Images and retention

Input: JPG/PNG/WebP, maximum 3 MB (also enforced on the private bucket), maximum 16 million decoded pixels, minimum 32px dimensions, no animation. Server `sharp` decoding verifies format, corrects orientation, resizes within 1600×1600 and re-encodes JPEG at quality 85 without EXIF/location metadata. The multipart request is bounded before decoding. Server-generated paths are `<owner>/<analysis>-<attempt>.jpg`; browser-provided storage paths are never accepted. Owner reads require an exact linked, unexpired analysis; public URLs and cross-owner signed access are denied.

Normal flow uploads the normalized image then deletes the stored copy **before** the provider call; provider bytes exist only in request memory. No retained photo preview is displayed on review. Failed uploads/processing use cleanup in `finally`. On abnormal termination, access to linked photos and analysis results expires after 24 hours. The next explicit owner upload sweeps stale owner paths. `node scripts/cleanup-food-photos.mjs` provides a bounded 100-record expiry sweep using the Storage API, followed by clearing structured details. `--local` restricts it to Docker credentials.

Operational limitation: physical deletion after a process crash requires that cleanup command to run. It does not install a scheduler, and no staging/Production scheduler was enabled. A trusted recurring cleanup runner must be configured before live activation; access expiry is automatic but physical deletion is not guaranteed at exactly 24 hours without that runner. Minimal expired analysis metadata remains for quota/audit bookkeeping.

## Provider, contract and safety

`analyzeFoodPhoto` is server-only; provider transport has explicit config and injectable fetch for isolated tests. The real adapter uses the Responses API with one image, `store:false`, strict JSON schema, bounded output and a 25-second timeout. Model is supplied only by `AI_FOOD_MODEL`; no default/outdated model is hard-coded. Server-only `OPENAI_API_KEY` is required. No real model has been called or validated.

Official contracts consulted: [image inputs](https://developers.openai.com/api/docs/guides/images-vision) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Model compatibility, grounding and nutrition plausibility still require real QA with the selected account/model.

Local mock mode requires `AI_FOOD_LOCAL_MOCK=true`, a loopback Supabase URL, and no Vercel environment. It is visibly labeled on upload and review and never masquerades as image recognition. Preview analysis is disabled with manual fallback while credentials are missing. No provider call occurs on render, build, refresh or review reload.

Strict Zod contracts bound item count (1–20), text, portion/unit, nonnegative macros, confidence 0–1 and uncertainties; totals must match items. Both provider and orchestration validate output. Shared types cover analysis/status/result/items/portions/macros/confidence/review input. Confirmation also validates required numeric fields in SQL. Provider failures/refusals/malformed output use safe errors; raw response bodies, images, prompts, credentials and private notes are not logged.

The safety prompt requires visible-food estimates, approximate portions, explicit uncertainty for oils/sauces/mixed dishes, no invented hidden ingredients as fact, no diagnosis/calorie-restriction advice/medication changes/GLP-1 dose inference, and ignoring instructions embedded in images.

## UX and reliability

Nutrition prominently offers Log from photo and Log manually. Browser camera/file input uses `accept="image/*"` and `capture="environment"`; unsupported formats receive a safe error. Uploading/Analyzing/Saving statuses and error alerts are accessible. Review permits changing names, portions (scaling estimates), units, individual macros, removing items, adding missing items, selecting meal type/time and notes. Totals recompute from edits; uncertainty and confidence are textual. A mixed dish can be consolidated by editing one item and removing components. Saving requires an explicit click and at least one item.

Analysis IDs are stable across a double submit/interrupted request, with stored results reused on reload. Claim uses an owner lock and fresh clock, at most 10 attempts per rolling 24 hours, max 3 attempts per analysis; retries require explicit action. Active pending attempts cannot be reclaimed for two minutes. Attempt fencing prevents late results overwriting newer retries. Fixed-snapshot claim transactions fail closed. Confirmation locking makes concurrent saves idempotent.

## Local verification

- Clean baseline reset: 420/420 DB/security.
- Final clean reset and complete DB/security: **462/462** (42 new food-photo checks). Existing entitlement catalog assertions updated from 13/33 to 14/36 for the new feature and three matrix rows.
- Real multi-connection claim/confirmation/quota tests: **3/3**, `python3 scripts/test-food-photo-concurrency.py`.
- Real local Storage API: **10/10**, `python3 scripts/test-food-photo-storage.py`: private access, cross-owner denial, signed-link expiration, MIME and size limits, direct upload denial, expired-photo denial and physical cleanup. Fixtures removed.
- App/shared: **200/200** (25 new provider/image/validation/review cases; web 114, validation 47, API 19, scoring 14, access 6).
- Lint/typecheck/build/diff check passed. Local schema lint clean after explicit UUID-array initialization.
- Both S10→S13 and S13→S10 migration orders passed in disposable schema clones, which were removed. No history repair/revert/marking.

Browser QA used synthetic images and local mock output only. Verified upload → review, edited 300-kcal meal + added 100-kcal item → explicit Save meal → two snapshots and existing 400-kcal Nutrition total. No logs before confirmation; image gone before review. Removing the last item disables Save. Associated labels, textual confidence/status, keyboard confirmation and 390px viewport with no page overflow passed. Free direct analyze POST returned 403 and its UI was disabled.

Manual regression smoke passed: create food, quick add, favorite/recent food, saved meal creation/logging, log scaling (50→100 kcal), deletion, water, date navigation and Today totals. Original Nutrition actions were not modified. The initial local upload origin mismatch was corrected while preserving exact scheme+host validation; a rejected host-only alternative was not applied. Subsequent photo upload/review/save succeeded without a photo-path runtime error. A dashboard weight-loading error was logged during local QA/reset activity; local browser smoke is not a claim that all historical runtime logs are empty.

## Staging, delivery and remaining work

Before Sprint 13: main 21, branch 22, staging 22 (staging includes paused Sprint 10 `20260914123542`). Captured all 24 existing-data fingerprints; verified linked project `nxppfepdgvevlmthzacc` is TFH Staging and `cron.job` absent. Only this new migration is proposed. Staging application and rollback/security/fingerprint verification await explicit approval following automatic approval rejection; no staging mutations occurred from those rejected calls.

No AI credentials were configured in staging/Preview/Production. Production was not verified, deployed or modified. Mobile, marketing website, Stripe and TFK Score code remain unchanged. Sprint 10 branch/PR #12 remain paused and untouched. No Sprint 14 started.

Before merge: obtain a local OpenAI key and compatible `AI_FOOD_MODEL`; run at least one real image analysis (prefer simple plate, mixed dish and ambiguous meal), assess grounding/portions/macros/uncertainty, and verify user corrections. Also finish authorized staging/Preview checks and configure the retention runner before live activation. Keep the PR draft/open/unmerged; mock QA is not final AI acceptance.
