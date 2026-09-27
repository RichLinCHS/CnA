# SoundBridge

## AI Conversation Tutor

Three navigation tabs separate the original Pronunciation Generator, AI Tutor, and My Vocabulary. All tabs share favorites and the same pronunciation cards and audio speed controls.

- Select one of nine categories and a scenario, or enter a Custom Topic. Nail Salon includes greetings, colors, shapes, manicure/pedicure services, polish types, prices, appointments, complaints, and checkout.
- Create a lesson by describing what you want in English or Chinese. Choose 1–20 sentence cards; requests such as “Generate 10 sentences for nail technicians” override the selector. Ask for up to 10 conversations to receive multiple sample dialogues. Each dialogue includes full pronunciation cards for both speakers.
- Choose Practice Conversation and Beginner, Intermediate, or Advanced. Start the roleplay, then reply in English. Each subsequent turn contains your original response, a natural version, Chinese feedback, and the counterpart's next line. A natural-language practice request can also start roleplay from an empty conversation.
- Save individual cards or choose Save Lesson. Review favorites, generator history, and saved lessons in My Vocabulary. These remain after starting a new conversation.
- New conversation clears the current chat and unlocks mode/scenario settings. The latest 12 user/assistant turn pairs persist locally; at most six recent pairs are sent as condensed context. Older details may be forgotten. This MVP does not provide cloud accounts or cross-device sync.

`POST /api/chat` accepts `message` (1–1000 characters), `history` (up to 12 alternating user/assistant messages, complete pairs, 3000 characters per message and 18000 total), `category`, `scenario` (1–200 characters), `difficulty`, `mode` (`learn` or `practice`), and `sentenceCount` (1–20). The response is `{data: {kind, explanationChinese, lesson, correction, reply}}`, with unused branches explicitly null. Lessons contain sentence cards and dialogues; roleplay contains a counterpart reply and, after the opening, a correction tied to the student's exact message. Both endpoints share the provider transport, pronunciation policy, card schema, HTTP validation, client rate bucket and global generation budget. Chat is not shared-cached because it is conversation-specific. Chat request bodies are bounded to 80000 bytes.

No new environment variables are required. The tutor uses the same server-side key, model, provider URL and production Redis limits described below. Without a key, it explains the configuration requirement; it does not present a scripted conversation as AI. The original generator's fallback examples remain available. Professional and healthcare scenarios are prompted to teach communication, not diagnose, prescribe or invent professional advice; AI output still requires judgment.

Local storage keys: `soundbridge:chat:v1` for the current session and settings, and `soundbridge:lessons:v1` for up to 20 saved lessons. Storage is validated before reading and write errors are shown to the user. Lesson/dialogue text is escaped by React. Recent chat context is transmitted only when you send a tutor message.

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
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini`. Choose a model available to your account that supports strict `json_schema` and `max_completion_tokens`. |
| `UPSTASH_REDIS_REST_URL` | Shared Redis REST URL. Required with AI in production/Vercel. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only Redis REST token. Required with AI in production/Vercel. |
| `AI_TIMEOUT_MS` | Default 20000 ms; upper bound 25000 ms. |
| `DAILY_GENERATION_LIMIT` | Default 200 uncached generations per 24-hour window across the deployment; hard maximum 1000. Failed upstream attempts count. |

Never prefix secrets with `NEXT_PUBLIC_`. Never commit `.env.local`. No browser requests contain the provider key. Compatible providers must implement Chat Completions strict JSON Schema, not only JSON mode; there is intentionally no unvalidated downgrade. See [official OpenAI structured outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

## Vercel deployment

1. Push this directory as a Git repository, or select it as the Vercel Root Directory in a larger repository.
2. Import the repository into Vercel using the Next.js preset. Default build command: `npm run build`.
3. Create an Upstash Redis database and add its REST URL/token along with the AI variables in Vercel Project Settings → Environment Variables. Set them for the relevant Preview/Production environments.
4. Deploy, then verify an original example and a new sentence such as `How are you today?`.

No deployment has been created by this project generation. The route uses the Node.js runtime and allows 60 seconds, including provider and Redis operations. A production server without shared limits configured fails closed for AI, while original examples still work. For a local production build (`npm run build` then `npm start`), configure Redis if you want live AI. Development uses bounded in-memory counters when Redis is absent.

## API contract and behavior

`POST /api/generate`, `Content-Type: application/json`:

```json
{"text":"How are you today?"}
```

Returns `{ "data": { "originalText": "...", "sentence": CARD, "words": [CARD] }, "source": "ai|cache|fallback", "notice": "optional" }`. Each card contains `english`, `soundAlike`, `translation`, `ipa`, and a nonempty `limitations` array. Invalid requests return `{ "error": "..." }` with an appropriate HTTP error status. Text is limited to 300 UTF-16 code units before trimming; streamed request bodies to 4096 bytes. Input must contain an English letter. Apostrophes within words are retained; hyphens and other punctuation separate word tokens. Original sentence text and punctuation are retained. Duplicates remain in word order. Numbers are tokenized and pronounced in context.

Both strict provider schema and independent Zod validation are used. The server rejects missing fields, extra fields, non-Chinese sound/translation fields, invalid IPA delimiters, omitted words, reordered words, refusals and truncated responses. Schema validation cannot guarantee linguistic accuracy: Chinese sound-alikes remain approximate and AI translations/IPA should be checked for important learning material. Original fallback entries are preserved verbatim, including their pre-existing approximations and IPA notation.

## Cost, security and privacy

- 10 requests per client per minute before cache lookup; global daily uncached-generation cap; at most 12000 output tokens per generation; no automatic paid retries.
- Atomic Redis increments enforce shared limits. On Vercel, client identity uses its platform-overwritten `x-vercel-forwarded-for`; outside Vercel requests share one bucket unless a trusted proxy identity mechanism is implemented. Do not substitute arbitrary client-supplied forwarding headers.
- Cached AI results expire after 24 hours. A bounded 200-entry process cache supplements Redis; identical in-flight calls on one instance share a provider request. Across instances simultaneous cache misses may cause separate calls, each counted toward the shared budget.
- Production fails closed when Redis limits cannot be checked. Cache writes are best effort after successful generation. Rate-limit responses use HTTP 429. Public sites may additionally use Vercel Firewall rules and provider-enforced billing/usage limits. The request cap is not a dollar-denominated spend guarantee.
- Input is sent to the configured AI provider and successful results may be stored in Redis for 24 hours. Cache keys are hashed; cached content itself is not encrypted by this app. Use a private Redis database with appropriate access policies.
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
