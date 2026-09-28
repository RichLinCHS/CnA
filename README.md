# SoundBridge

## AI Conversation Tutor

Three navigation tabs separate the original Pronunciation Generator, AI Tutor, and My Vocabulary. All tabs share favorites and the same pronunciation cards and audio speed controls.

- Select one of nine categories and a scenario, or enter a Custom Topic. Nail Salon includes greetings, colors, shapes, manicure/pedicure services, polish types, prices, appointments, complaints, and checkout.
- Create a lesson by describing what you want in English or Chinese. Choose 1–20 sentence cards; requests such as “Generate 10 sentences for nail technicians” override the selector. Ask for up to 10 conversations to receive multiple sample dialogues. Each dialogue includes full pronunciation cards for both speakers.
- Choose Practice Conversation and Beginner, Intermediate, or Advanced. Start the roleplay, then reply in English. Each subsequent turn contains your original response, a natural version, Chinese feedback, and the counterpart's next line. A natural-language practice request can also start roleplay from an empty conversation.
- Save individual cards or choose Save Lesson. Review favorites, generator history, and saved lessons in My Vocabulary. These remain after starting a new conversation.
- New conversation archives the current chat and unlocks mode/scenario settings. All conversation turns and drafts persist locally up to browser storage capacity; at most six recent pairs plus the original goal are sent as context. Older details may be forgotten. This MVP does not provide cloud accounts or cross-device sync.

`POST /api/chat` accepts `message` (1–1000 characters), `history` (up to 12 alternating user/assistant messages, complete pairs, 3000 characters per message and 18000 total), `category`, `scenario` (1–200 characters), `difficulty`, `mode` (`learn` or `practice`), and `sentenceCount` (1–20). The response is `{data: {kind, explanationChinese, lesson, correction, reply}}`, with unused branches explicitly null. Lessons contain sentence cards and dialogues; roleplay contains a counterpart reply and, after the opening, a correction tied to the student's exact message. Both endpoints share the provider transport, pronunciation policy, card schema, HTTP validation, client rate bucket and global generation budget. Chat is not shared-cached because it is conversation-specific. Chat request bodies are bounded to 100000 bytes, including optional learner profile, past learning requests and conversation goal.

No new environment variables are required. The tutor uses the same server-side key, model, provider URL and per-instance usage limits described below. Without a key, it explains the configuration requirement; it does not present a scripted conversation as AI. The original generator's fallback examples remain available. Professional and healthcare scenarios are prompted to teach communication, not diagnose, prescribe or invent professional advice; AI output still requires judgment.

Local storage keys: `soundbridge:conversations:v2` for the conversation library and profile (the former `soundbridge:chat:v1` session is migrated on first use), and `soundbridge:lessons:v1` for up to 20 saved lessons. Storage is validated before reading and write errors are shown to the user. Lesson/dialogue text is escaped by React. Recent chat context is transmitted only when you send a tutor message.

A working Next.js + TypeScript pronunciation app migrated from the supplied `soundbridge.html`. The original typography, colors, rounded panels, six example buttons and all 14 dictionary entries are preserved. Tailwind utilities handle additional layout, spacing and responsive behavior. React renders all text with escaping; no AI HTML is rendered.

## Local setup

Requires Node.js 20.9+ and npm. In this directory:

```powershell
npm ci
Copy-Item .env.example .env.local
# Edit .env.local with your server credentials.
npm run dev
```

Open http://localhost:3000. Without an API key, all original examples work, including individual word cards for the original phrases. Arbitrary new text requires AI. The app does not invent fallback translations for unknown sentences. Offline/network errors can use the bundled examples after the page has loaded; this is not an installable offline PWA.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-only provider key; required for arbitrary generation. |
| `OPENAI_BASE_URL` | Defaults to `https://api.openai.com/v1`. Use the API root of a compatible provider, without `/chat/completions`. HTTPS required in production. |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` for OpenAI, or `deepseek-ai/deepseek-v4.1-flash` for the NVIDIA endpoint when unset. Strict JSON schema is requested and independently validated. |
| `AI_TIMEOUT_MS` | Default 20000 ms for OpenAI or 45000 ms for NVIDIA when unset; upper bound 45000 ms. |
| `DAILY_GENERATION_LIMIT` | Default 200 uncached generations per 24-hour window per server instance; hard maximum 1000. Failed upstream attempts count. |

Never prefix secrets with `NEXT_PUBLIC_`. Never commit `.env.local`. No browser requests contain the provider key. Compatible providers must implement Chat Completions strict JSON Schema, not only JSON mode; there is intentionally no unvalidated downgrade. See [official OpenAI structured outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

## Vercel deployment

1. Push this directory as a Git repository, or select it as the Vercel Root Directory in a larger repository.
2. Import the repository into Vercel using the Next.js preset. Default build command: `npm run build`.
3. Add your server-side AI variables in Vercel Project Settings → Environment Variables for the relevant Preview/Production environments. No database service is required.
4. Deploy, then verify an original example and a new sentence such as `How are you today?`.

The route uses the Node.js runtime and allows 60 seconds. Both local production builds and Vercel can generate AI responses using only the provider credentials; no Redis service is required.

## API contract and behavior

`POST /api/generate`, `Content-Type: application/json`:

```json
{"text":"How are you today?"}
```

Returns `{ "data": { "originalText": "...", "sentence": CARD, "words": [CARD] }, "source": "ai|cache|fallback", "notice": "optional" }`. Each card contains `english`, `soundAlike`, `translation`, `ipa`, and a nonempty `limitations` array. Invalid requests return `{ "error": "..." }` with an appropriate HTTP error status. Text is limited to 300 UTF-16 code units before trimming; streamed request bodies to 4096 bytes. Input must contain an English letter. Apostrophes within words are retained; hyphens and other punctuation separate word tokens. Original sentence text and punctuation are retained. Duplicates remain in word order. Numbers are tokenized and pronounced in context.

Both strict provider schema and independent Zod validation are used. The server rejects missing fields, extra fields, non-Chinese sound/translation fields, invalid IPA delimiters, omitted words, reordered words, refusals and truncated responses. Schema validation cannot guarantee linguistic accuracy: Chinese sound-alikes remain approximate and AI translations/IPA should be checked for important learning material. Original fallback entries are preserved verbatim, including their pre-existing approximations and IPA notation.

## Cost, security and privacy

- 10 requests per client per minute before cache lookup; per-instance daily uncached-generation cap; at most 12000 output tokens per generation; no automatic paid retries.
- In-memory counters enforce limits per server instance. They reset on cold starts and are not shared across Vercel instances. On Vercel, client identity uses the platform-overwritten `x-vercel-forwarded-for`; elsewhere requests share one bucket.
- A bounded 200-entry in-memory cache retains successful pronunciation responses for up to 24 hours while the instance lives. Identical in-flight requests on one instance are deduplicated. Instances do not share cache entries.
- Rate-limit responses use HTTP 429. These best-effort limits are not a site-wide or dollar-denominated budget guarantee.
- Input is sent to the configured AI provider. Cached results stay temporarily in server memory; no external cache is used.
- Favorites (up to 100) and history (last 20) stay in localStorage on the current browser. Clear history in the UI; remove favorites with Saved. Storage failures show a message. Data is not synced between devices.

## Audio

Browser SpeechSynthesis uses `en-US`, preferring a US English voice; another English voice can be used with a visible accent notice. No English voice produces an actionable settings message. Three speeds: 0.7, 1.0 and 1.2. Voices may load asynchronously. Listen is triggered by user interaction for mobile browser compatibility. Audio quality and offline availability depend on installed device voices. Test on physical iPhone Safari for final device-specific voice behavior.

## Verification

```powershell
npm test
npm run typecheck
npm run build
npm start
```

Tests cover single words, sentences, input limits, word order, malformed/truncated AI output, failures, timeouts, missing keys, caching, concurrent deduplication, rate limits, HTTP validation and favorite/history persistence. Provider responses are mocked; a live provider call is a separate integration check requiring credentials. See `VERIFICATION.md` for the actual verification performed on delivery.

## Saved conversations and learner memory

Every completed turn and draft is auto-saved in the browser. New conversation keeps previous chats. Search, rename and reopen them in AI Tutor; My Vocabulary links to the library. Only the last 12 turns are initially rendered; Show older messages reveals the retained transcript. There is no application-level conversation eviction. Browser storage is finite: failed writes show a Not saved status and sending is blocked until draft saving succeeds. Export backups regularly. The export includes conversations, drafts and the learner profile; Restore a backup validates and merges them, keeping differing versions as separate copies.

What the tutor remembers contains editable goals, situation and preferences, a personalization switch, and the exact past learning requests used as interests. Each conversation can be excluded. Enabled memory sends the profile and up to five other chats' opening requests; it never infers personal facts from roleplay replies. Recent context is bounded to six turn pairs while the original conversation goal is retained separately. The legacy session's available turns migrate without deleting its original storage key; turns already discarded by the old version cannot be recovered. Data stays local and is not synced across devices or from localhost to your Vercel domain. Export/import can move it between browsers or domains. Revision checks reject stale writes from another tab.

## NVIDIA DeepSeek V4.1 on Vercel

In the connected Vercel project's Settings → Environment Variables, set these server-only values for Production (and Preview if wanted), then redeploy:

| Name | Value |
| --- | --- |
| OPENAI_API_KEY | Your NVIDIA API key, entered privately in Vercel |
| OPENAI_BASE_URL | https://integrate.api.nvidia.com/v1 |
| OPENAI_MODEL | deepseek-ai/deepseek-v4.1-flash |
| AI_TIMEOUT_MS | 45000 |

The OpenAI-prefixed variable names are the app's generic compatible-provider settings. NVIDIA calls use max_tokens rather than max_completion_tokens. Strict json_schema remains enabled, with Zod validation after generation; no silent downgrade to unvalidated output. The exact hosted model's schema support, account access and latency require a live credentialed test. No NVIDIA key or Vercel credentials were supplied during implementation. NVIDIA's [model endpoint reference](https://docs.api.nvidia.com/nim/reference/nvidia-deepseek-v4_1-flash-infer) documents the model ID, URL and max_tokens parameter.

Use the repository root as Vercel's Root Directory and the Next.js preset. The configured Git integration should deploy new main-branch commits automatically; check its deployment log. Upstash is no longer required; old Upstash environment variables can be removed. Never use NEXT_PUBLIC_ for keys or commit secrets. After setting variables, redeploy and test a new sentence and a short tutor lesson.
