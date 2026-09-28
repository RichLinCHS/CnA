# Verification — 2026-09-27

## Conversation saving, learner memory and NVIDIA configuration

- Final run: **71 tests passed** in 6 files. Production build and its TypeScript check passed.
- Archive tests cover 40-turn retention, multiple chats/drafts, profile persistence, legacy migration, corruption protection, quota failures, stale-tab conflicts, backup merging and bounded opt-in memory. Backend tests verify that learner goals, past requests and the original conversation goal enter tutor context. NVIDIA transport tests verify the model ID, `max_tokens`, strict schema and malformed-output rejection.
- Browser checks against an isolated simulated provider confirmed two saved conversations, draft restoration after reload, profile restoration, opening an older chat and continuing it with a correction. These checks do not establish real model personalization quality.
- NVIDIA hosted schema compatibility and real generation remain unverified without a key. Vercel project status cannot be verified without a project/deployment URL or connected account access. No credentials are stored in the repository.

## AI Tutor extension — final verification

- `npm test`: **56 tests passed** across 4 test files (all original 26 tests plus 30 tutor tests).
- `npm run typecheck`: **passed**.
- `npm run build`: **passed**, emitting `/`, `/api/generate`, and the new `/api/chat` route.
- Added coverage for all categories/scenarios, exact lesson sizes and multiple dialogues, strict response validation, roleplay opening and corrections, complete context pairs, malformed output, input bounds, missing keys, upstream failures/timeouts, shared limits, chat/lesson persistence, and new-conversation behavior. Original generator tests continue to pass after extracting the shared provider client and pronunciation policy.
- Browser integration checks used a separate local development origin with an explicitly simulated provider, not a live AI service. Confirmed category switching (Nail Salon to Restaurant), choosing Nail shapes, generating 10 sentence cards and a sample dialogue, Save Lesson, shared favorites, persistence after reload, New conversation, Intermediate practice mode, a customer opening, correction of “Yes we has time.” and a subsequent customer question. Test processes were stopped and the simulated tab closed afterward. Test fixtures are outside the shipped project.
- Inspected the tutor roleplay at a 390×844 viewport: content width equaled viewport content width (375px after scrollbar), with no horizontal overflow. Physical iPhone Safari audio remains unverified.
- Live provider linguistic quality, live Redis and deployed Vercel behavior remain unverified because credentials/deployment were not supplied. Simulated browser responses verify the application flow, not AI accuracy.

## Original generator verification

- `npm test`: **26 tests passed**, 3 test files. No failures in the final run.
- `npm run typecheck`: **passed**. The final production build also completed its TypeScript check.
- `npm run build`: **passed**, Next.js 16.3.6 with Turbopack. `/` prerendered and `/api/generate` emitted as a dynamic Node.js route.
- Started the production server and tested in the Codex browser: original examples, full phrase and individual word cards, saving a favorite, favorites/history persistence after reload, fallback generation without an API key, and the friendly missing-key error for a new sentence.
- Selected slow playback and activated the audio button without an immediate UI error. Audible pronunciation quality was not independently verified.
- Visually checked desktop and a 390×844 viewport. Mobile content fit without horizontal overflow (375px content width excluding the scrollbar). This is viewport testing, not testing on physical iPhone Safari.
- Browser testing found a same-origin issue caused by Next normalizing the internal URL. Fixed it to use the request Host and added a regression test; reran tests, production build and browser generation successfully.

## Not verified

- Live OpenAI-compatible generation: no provider credentials were supplied. Automated generation/error tests use mocked provider responses. Real provider schema compatibility and pronunciation quality require a configured API key/model.
- Live shared Redis integration and deployed Vercel behavior: no Redis credentials or deployment supplied. Tests cover local expiration, production fail-closed behavior, and mocked shared-counter limits.
- Missing device voice and physical iPhone audio behavior: handled in code, not exercised on a physical device.

## Environment issues resolved

Initial installs failed due to sandbox network restrictions and a full C: drive. An alternate D: temporary build directory was not writable. Removed only task-created caches/partial dependencies, generated a lockfile, and successfully installed using `npm ci`. Final tests and build completed on C:. No unrelated user files were removed.
