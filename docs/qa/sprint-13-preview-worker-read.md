# Preview pre-claim worker read failure

Affected deployment: thefatkiller-i6szkjyzf-projects-tam.vercel.app, commit 1fa7914c2947400a240c3ad42dd5e4d242e31c09. Failed request 5zs9c-1789410330146-0c1faf7c7391 returned HTTP 400 from POST /nutrition/photo/analyze.

Verified blocking defect: hosted service_role had no SELECT on public.food_photo_analyses. The configured staging credential successfully read the private bucket but its table read returned HTTP 403 / PostgreSQL 42501 (permission denied). cleanupFoodPhotos performs this read before claim_food_photo; it throws before a row, allowance reservation, upload or provider request can be created. Local default table grants had masked the missing explicit hosted grant.

The old catch logged no failure stage. Therefore historical evidence cannot prove whether this particular JPEG passed decoding before it reached the deterministic permission blocker; the missing privilege is conclusively reproduced, not a reconstructed exception trace. New diagnostics record only the stage (multipart, image_validation, analysis_worker), leaving the safe public error unchanged.

Checks:
- Authentication/feature gate: failed POST returned 400 from inside the guarded handler, rather than the outer authentication/entitlement 401/403 branches.
- Allowance: no analysis rows, hence no persisted attempts consumed.
- Storage: no food-analysis objects; upload occurs only after successful claim.
- OpenAI: not reached, because no analysis row exists. No provider HTTP response, structured output or timeout to inspect. No real request retried. Configured model remains the model previously validated locally; this failure provides no new evidence about provider/model quality.
- Signed retrieval: not part of this pipeline; validated image bytes are sent in memory, never as a signed URL.
- Cleanup: no failed object/row residue to remove; no scheduler activation.

Fix: additive 20260914182844_sprint_13_food_photo_worker_read.sql grants only SELECT to service_role. Existing applied migrations unchanged; ordinary user/anonymous privileges remain unchanged. Mutation paths continue through fenced RPCs. The grant also supports the trusted pre-claim expiry read without weakening authentication, entitlements, image validation, or quotas.

Validation: rollback-only focused reproduction denied the read after revocation and passed after executing the actual new migration (2/2). Local DB/security 478/478, app/shared 209/209, lint/typecheck/build/diff checks passed. New worker read/anonymous/user-write regression 4/4 passed on staging; schema lint clean. Privileged staging REST read now returns 200 and zero rows. No new AI analysis was performed.
