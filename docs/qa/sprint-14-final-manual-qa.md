# Sprint 14 final manual QA

Status: `MANUAL_AUTHENTICATED_QA_PASSED`

Prepared 2026-09-15 for PR #16 and finally reconfirmed against branch commit
`b10183bb82f4d29197e6220d70157a16f8ed0761`. Vercel reported deployment
`5TvXNJ7JUKjviFDghN6gmWLAa2fU` as Ready/Latest for that branch head. Use this exact
Preview origin:

`https://thefatkiller-web-git-feature-sprint-14-laun-9d09ee-projects-tam.vercel.app`

The immutable deployment URL is
`https://thefatkiller-4d6gcqwhy-projects-tam.vercel.app`. The stable origin was
confirmed against that deployment during final acceptance. Do not perform this
checklist against Production.

## Owner acceptance — 2026-09-15

The owner personally completed and accepted the important authenticated Sprint
14 flows. The original two-to-three-second navigation problem is materially
resolved, and immediate navigation feedback remains visible. This acceptance,
together with the automated evidence below, satisfies the authenticated manual
QA gate for PR #16.

The detailed matrices in this document remain useful regression checklists;
they are not a claim that every permutation was exercised. Firefox testing, an
exhaustive screen-reader matrix, and native mobile recovery on a physical
device are explicitly accepted/deferred for this merge and remain documented
launch risks. They must not be described as complete.

## Evidence already collected

- Both Preview URLs return from Vercel and redirect an unauthenticated root
  request to `/login`; the response was served from the requested `hnd1`
  region.
- An existing authenticated staging session loaded Today, Progress, Nutrition,
  AI Food Photo, Check-Ins, GLP-1 Journal, Training, Reports, Notifications,
  AI Weekly Insights, Coaching, Profile settings and Billing in Chromium. Each
  completed with its expected heading and controls; no blank or frozen route
  was observed during the current read-only pass. This is page-load evidence,
  not acceptance of the primary mutation/error paths in the checklist below.
- Real browser-window spot checks at 390 px, tablet size and desktop showed the
  intended mobile horizontal navigation below the desktop breakpoint and the
  fixed side navigation at desktop size. Today, Progress, Reports and
  Settings/Billing were visually inspected at 390 px; Reports at tablet size;
  and the requested route set at desktop size. No obvious page-level horizontal
  overflow was seen. The primary and settings nav rows intentionally scroll
  horizontally on narrow screens.
- Chromium keyboard automation reached an interactive report disclosure using
  Tab and displayed a visible focus ring. The accessibility tree exposed named
  primary/settings navigation, headings and labels. Report charts exposed
  accessible image descriptions, numeric summaries and expandable data-table
  equivalents. Route navigation visibly exposed `Loading page…`; the DOM
  regression asserts it is a `role=status` update before an unresolved route.
- Safari loaded the authenticated Today, Progress and Reports routes, including
  forms and report chart alternatives. Firefox is not installed in the current
  environment. The owner accepted the important authenticated flows; exhaustive
  cross-browser, keyboard and screen-reader permutations remain deferred.
- No staging data was changed, no paid AI generation was requested, and no
  email, scheduler, Production or deployment setting was touched.
- The current deployment log window showed zero warnings, errors or fatals and
  no visible 5xx. The stable Preview origin completed a TLS-verified request and
  returned the expected unauthenticated redirect to `/login`.
- Vercel contains `OPENAI_API_KEY`, `AI_FOOD_MODEL` and
  `SUPABASE_SERVICE_ROLE_KEY` as secret variables scoped to Preview and exactly
  `feature/sprint-14-launch-hardening`, matching the Sprint 13 branch's required
  variable-name inventory. No value was revealed or printed, and no additional
  variable was needed during this audit.
- A clean-cache Preview redeploy of the exact source commit above applied the
  latest project settings. In the existing Premium QA session,
  `/nutrition/photo` no longer showed the unavailable-configuration alert; its
  file chooser and Analyze control were enabled, and selecting a local image
  left Analyze enabled. The form was not submitted, so no paid provider call or
  Storage upload occurred.
- The Preview HTML and eight public JavaScript assets contained none of the
  three private variable names or recognized provider/service-secret patterns.
  Recent deployment logs showed zero warning/error/fatal entries, no 5xx, and
  six successful `/nutrition/photo` requests; log messages exposed no secrets.

Required automated gates passed during preparation: lint 10/10 workspaces,
typecheck 10/10 workspaces, unit tests 359/359, focused Auth/navigation/report/
AI tests 170/170, and production builds 2/2 applications. `git diff
--check` passed. Turbo reused valid local cache entries where available.

The final pre-merge reconfirmation against application HEAD
`b10183bb82f4d29197e6220d70157a16f8ed0761` passed 591/591
database/security tests, 170/170 focused Auth/navigation/AI tests, replay
10/10, account deletion 14/14,
Storage quota concurrency 2/2, notification concurrency 7/7, real Storage
10/10, food-photo concurrency 3/3, retention 8/8, and the real local cleanup
endpoint/scheduler 2/2. The scheduled test removed its temporary job, secret
and fixtures. Schema lint returned no errors. The owner confirms the previous
bounded staging scheduler soak passed; the current staging state has no
configured or active remote cron job. No scheduler was activated during final
acceptance.

At initial preparation, AI Food Photo said "Photo analysis is not available
yet" and disabled upload/analyze. The staging-only environment audit and fresh
Preview rebuild cleared that configuration blocker without an application-code
change. A paid staging analysis and result-review flow remain explicitly
unperformed and require separate approval.

## Desktop authenticated route checklist

For every row, first click the primary navigation link and confirm immediate
`Loading page…` feedback, then confirm the page replaces it without a blank or
frozen state. Use disposable QA data, verify visible success and safe error
feedback, and remove or restore the fixture afterward.

| Area | Route and primary manual check |
| --- | --- |
| Today | `/dashboard`: open a next-action card and return; confirm target, score, coaching, training and journal summaries remain consistent with their source pages. |
| Progress | `/progress`: log a disposable weight or measurement, verify success and trend/history update, exercise a validation error, then delete the fixture. If testing a photo, use a non-sensitive QA image and remove it. |
| Nutrition | `/nutrition`: quick-add a disposable food or water entry, verify totals and success feedback, exercise a required/range error, then delete it. |
| AI Food Photo | `/nutrition/photo`: after the blocker is cleared, upload a non-sensitive supported QA image, observe Uploading/Analyzing, review estimates, confirm only after review, and verify failure/retry with a safe invalid file. Confirm no duplicate log or retained original. |
| Check-Ins | `/check-ins`: save or update a disposable daily check-in or toggle a QA habit, verify score/history feedback, exercise an invalid value, then restore prior state. |
| GLP-1 Journal | `/glp1`: use explicitly fictional QA values only; save/update/delete one medication or symptom entry, verify timeline/trend and validation feedback, then restore the prior profile/state. Do not enter real health information. |
| Training | `/training`: use a disposable workout to start a session, save a set/notes, confirm unsaved-state fencing and success/error feedback, complete or abandon it, then archive/remove the fixture as supported. |
| Reports | `/reports`: apply 7-, 30- and 90-day presets plus one valid custom range; verify summaries and expand every chart's textual values. Submit an invalid/reversed range and confirm the error is understandable. |
| Notifications | `/notifications`: open Reminder settings and save a disposable preference change, verify feedback, then restore it. If a disposable notification exists, test read/unread/all-read behavior. Do not activate the scheduler. |
| AI Weekly Insights | `/insights`: open the existing completed insight and verify its facts/safety framing. Do not request a new paid generation unless that exact staging call is separately approved; if approved, verify consent, pending, success/error and explicit retry behavior. |
| Coaching | `/coaching`: inspect relationship/goals/notes, change one sharing toggle and restore it, verifying success/error feedback and that GLP-1 sharing remains off unless deliberately selected. A coach-role cross-check still requires the corresponding disposable coach session. |
| Settings/Billing | `/settings/profile` and `/settings/billing`: update one reversible profile field and restore it, verify validation/success feedback, inspect notification/goals tabs, and confirm Billing shows the expected database-controlled plan/provider without offering live payment actions. Do not open account deletion QA with a valued account. |

For each row record: browser, viewport, start/end time, PASS/FAIL, primary action,
success/error result, layout observation, cleanup performed, and screenshot or
issue link. Do not mark a row PASS from page-load evidence alone.

## Responsive matrix

Repeat the complete route checklist at:

- 390 px CSS viewport: verify the horizontal primary/settings navigation can be
  reached without trapping focus; headings, cards, forms, charts, tables and
  buttons remain within the page; fixed tooling does not obscure actions.
- Tablet, approximately 768–820 px CSS viewport: verify form grids, report
  filters/charts, training editors and Settings layout do not clip or overlap.
- Desktop, at least 1280 px CSS viewport: verify the side navigation remains
  fixed and readable, main content does not sit underneath it, and wide grids
  retain sensible reading order.

Rotate/reload once at each size and repeat one mutation after resizing when
running this checklist again. The window-size spot checks above are preparation
evidence, not a claim of an exhaustive responsive permutation matrix.

## Keyboard and accessibility matrix

On every route, use the keyboard without a mouse:

1. Tab from the top through brand, primary navigation, Settings, page actions
   and forms; use Shift+Tab to reverse. Confirm every focus indicator is visible
   and nothing is skipped or trapped.
2. Activate links/details with Enter and buttons/checkboxes with Enter or Space
   as appropriate. Confirm the narrow horizontal nav scrolls the focused item
   into view.
3. Complete each form, including selects and native date/time/file controls;
   confirm labels and instructions remain associated and validation identifies
   the failing field.
4. Confirm success/loading text is announced as status and errors as alerts
   with a screen reader where practical. Do not infer announcement behavior
   solely from visible text or the accessibility tree.
5. For Reports, expand each chart's data table and compare it with the numeric
   summary. For Progress and GLP-1 charts, confirm the visible text/history
   communicates the critical values without relying on color.
6. Confirm score states, completion states, warnings and errors always include
   text or an icon/label in addition to color.

No application modal or ARIA dialog was found in the requested route set. If a
native file/date picker or browser confirmation appears, verify focus returns
to the invoking control after it closes.

## Browser matrix

- Chromium: repeat the complete route, responsive, keyboard and accessibility
  matrices. The automated preparation pass covered authenticated page loads,
  responsive spot checks and one visible-focus traversal only.
- Firefox: install/use an approved current version and repeat the complete
  matrices; it was unavailable for this preparation pass.
- Safari/WebKit: repeat the complete matrices. The preparation pass covered
  authenticated Today, Progress and Reports at desktop size only.

The owner accepted the important authenticated flows for Sprint 14. Firefox
and exhaustive screen-reader coverage above are deferred follow-up risk, not a
PR #16 code-merge blocker.

Stop and file a blocker for any failed primary action, inaccessible control,
unannounced critical error, focus loss/trap, page-level horizontal overflow,
persistent loading state, blank page, cross-user data, duplicate mutation or
unexpected paid/provider action. Preserve console/network evidence without
copying tokens, signed URLs or personal data.
