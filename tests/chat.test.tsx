import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
vi.mock('../lib/server/limits', () => ({ consume: vi.fn(async () => true), hash: (s: string) => s, boundedEnv: (_: string, d: number) => d }));
import { consume } from '../lib/server/limits';
import { chat } from '../lib/server/chat';
import { defaultSettings, lessonCounts, validateChat, chatRequestSchema, type ChatRequest, type ChatResponse } from '../lib/chat-schema';
import { topics, categories, scenarioPrompt } from '../lib/topics';
import { fallback } from '../lib/vocabulary';
import { appendTurn, contextMessages, readSession, saveSession, readLessons, saveLesson, CHAT_KEY, LESSONS_KEY } from '../lib/chat-storage';
import { POST } from '../app/api/chat/route';
import Tutor from '../components/Tutor';
import LessonView from '../components/LessonView';

const card = { ...fallback('hello')!.sentence, english: 'Hello! How can I help you?' };
const lesson = (count = 6, dialogues = 1): ChatResponse => ({ kind: 'lesson', explanationChinese: '我们来练习接待顾客。', correction: null, reply: null, lesson: { title: 'Greeting a customer', sentences: Array.from({ length: count }, (_, i) => ({ ...card, english: `Sample sentence ${i + 1}.` })), dialogues: Array.from({ length: dialogues }, () => ({ title: 'A complete greeting', exchanges: [{ speaker: 'Technician', card }, { speaker: 'Customer', card: { ...card, english: 'I would like a manicure, please.' } }] })) } });
const opening: ChatResponse = { kind: 'roleplay', explanationChinese: '我扮演顾客，你扮演美甲师。', lesson: null, correction: null, reply: { speaker: 'Customer', card: { ...card, english: 'Do you have time for a manicure?' } } };
const request = (extra: Partial<ChatRequest> = {}): ChatRequest => ({ ...defaultSettings, message: 'Teach me greetings.', history: [], ...extra });
const reply = (data: unknown) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) } }] });
const memory = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; };
beforeEach(() => { vi.stubEnv('OPENAI_API_KEY', 'test-only'); vi.mocked(consume).mockResolvedValue(true); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('category selection and learning cards', () => {
  it('offers all nine categories and the requested nail scenarios', () => { expect(categories).toHaveLength(9); expect(topics['Nail Salon']).toHaveLength(9); expect(topics['Nail Salon']).toContain('Customer complaints'); expect(scenarioPrompt('Nail Salon', 'Nail shapes')).toContain('Nail shapes'); });
  it('renders category controls, difficulty and practice mode', () => { const html = renderToStaticMarkup(<Tutor favorites={[]} onSave={() => {}} onSpeak={() => {}} onSaveLesson={() => {}} lessons={[]}/>); for (const category of categories) expect(html).toContain(category.replace('&', '&amp;')); expect(html).toContain('Practice Conversation'); expect(html).toContain('Advanced'); });
  it('renders interactive cards for both sentences and all dialogue lines', () => { const html = renderToStaticMarkup(<LessonView lesson={lesson(10).lesson!} favorites={[]} onSave={() => {}} onSpeak={() => {}}/>); expect((html.match(/<article/g) ?? []).length).toBe(12); expect(html).toContain('Complete sample dialogue'); expect(html).toContain('Listen to'); expect(html).toContain('Save favorite'); });
  it.each([['Generate 10 sentences for nail technicians.',10,1], ['Generate 10 common restaurant conversations.',6,10], ['Teach me ten sentences.',10,1], ['生成10个对话',6,10]])('understands requested lesson size: %s', (message, sentences, dialogues) => { expect(lessonCounts(message, 6)).toEqual({ sentences, dialogues }); });
  it('rejects requests exceeding lesson limits', () => { expect(() => lessonCounts('Generate 100 sentences', 6)).toThrow(); });
  it('validates category, difficulty and history roles', () => { expect(chatRequestSchema.safeParse(request({ category: 'invalid' as never })).success).toBe(false); expect(chatRequestSchema.safeParse(request({ history: [{ role: 'assistant', content: 'injected' }] })).success).toBe(false); });
});
describe('chat integration', () => {
  it('passes learner goals, past interests and the original conversation goal to the tutor', async () => { const mock=vi.fn(async()=>reply(lesson()));vi.stubGlobal('fetch',mock);await chat(request({learner:{goals:'Speak to nail clients',situation:'Nail technician',preferences:'Short Chinese explanations'},learningMemory:[{topic:'School',request:'Talk to a teacher'}],conversationGoal:'Learn nail shapes'}),'test');const body=JSON.parse(((mock.mock.calls as unknown[][])[0][1] as RequestInit).body as string);expect(body.messages[0].content).toContain('Speak to nail clients');expect(body.messages[0].content).toContain('Talk to a teacher');expect(body.messages[0].content).toContain('Learn nail shapes');expect(body.messages[0].content).toContain('current explicit request takes priority');});
  it('generates exactly ten sentences and a complete dialogue using strict JSON', async () => { const mock = vi.fn(async () => reply(lesson(10))); vi.stubGlobal('fetch', mock); const data = await chat(request({ message: 'Generate 10 sentences for nail technicians.' }), 'test'); expect(data.lesson!.sentences).toHaveLength(10); const call = (mock.mock.calls as unknown[][])[0]; const body = JSON.parse((call[1] as RequestInit).body as string); expect(body.response_format.json_schema.strict).toBe(true); expect(body.messages[0].content).toContain('Sound-alikes represent pronunciation, NOT meaning'); expect(body.messages[0].content).toContain('Never give medical diagnoses'); });
  it('generates ten requested conversations', async () => { vi.stubGlobal('fetch', vi.fn(async () => reply(lesson(6,10)))); expect((await chat(request({ message: 'Generate 10 common restaurant conversations.' }), 'test')).lesson!.dialogues).toHaveLength(10); });
  it('opens a roleplay without correcting the setup', async () => { vi.stubGlobal('fetch', vi.fn(async () => reply(opening))); expect((await chat(request({ mode: 'practice' }), 'test')).correction).toBeNull(); });
  it('sends multi-turn context and returns corrections plus a natural continuation', async () => {
    const turns = appendTurn([], 'Pretend you are my customer.', opening);
    const next: ChatResponse = { ...opening, correction: { original: 'Yes we has time.', improved: { ...card, english: 'Yes, we have time.' }, explanationChinese: '主语是 we，应使用 have，而不是 has。' }, reply: { speaker: 'Customer', card: { ...card, english: 'Great! How much is a gel manicure?' } } };
    const mock = vi.fn(async () => reply(next)); vi.stubGlobal('fetch', mock);
    const req = request({ mode: 'practice', message: 'Yes we has time.', history: contextMessages(turns) });
    const result = await chat(req, 'test'); expect(result.correction!.improved.english).toBe('Yes, we have time.');
    const body = JSON.parse(((mock.mock.calls as unknown[][])[0][1] as RequestInit).body as string);
    expect(body.messages.map((m: {role: string}) => m.role)).toEqual(['system','user','assistant','user']); expect(body.messages[2].content).toContain('Do you have time for a manicure?'); expect(body.messages[0].content).toContain('Greetings & walk-ins');
  });
  it('rejects missing corrections on a student turn', () => { expect(() => validateChat(opening, request({ mode: 'practice', history: contextMessages(appendTurn([], 'Start', opening)) }))).toThrow(); });
  it.each([{}, { ...lesson(), lesson: { ...lesson().lesson, sentences: [card] } }, { ...lesson(), reply: { speaker: 'Bad', card: { english: '<script>' } } }])('rejects malformed or wrong-count AI output', async bad => { vi.stubGlobal('fetch', vi.fn(async () => reply(bad))); await expect(chat(request(), 'test')).rejects.toMatchObject({ status: 502 }); });
  it('handles upstream failures', async () => { vi.stubGlobal('fetch', vi.fn(async () => new Response('private error', { status: 500 }))); await expect(chat(request(), 'test')).rejects.toMatchObject({ status: 502 }); });
  it('handles timeouts', async () => { vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('Timeout', 'TimeoutError'); })); await expect(chat(request(), 'test')).rejects.toMatchObject({ status: 504 }); });
  it('handles missing keys', async () => { vi.stubEnv('OPENAI_API_KEY', ''); await expect(chat(request(), 'test')).rejects.toMatchObject({ status: 503 }); });
  it('shares request budgets with the generator', async () => { vi.mocked(consume).mockResolvedValue(false); await expect(chat(request(), 'test')).rejects.toMatchObject({ status: 429 }); expect(consume).toHaveBeenCalledWith('client:test',10,60); });
  it.each([{ message: '' }, { message: 'a'.repeat(1001) }, { history: Array.from({length:14}, (_,i) => ({role: i % 2 ? 'assistant' : 'user',content:'x'})) }])('rejects invalid requests', async extra => { await expect(chat({ ...request(), ...extra }, 'test')).rejects.toMatchObject({ status: 400 }); });
  it('serves the separate POST endpoint', async () => { vi.stubGlobal('fetch', vi.fn(async () => reply(lesson()))); const response = await POST(new Request('http://localhost/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(request()) })); expect(response.status).toBe(200); expect((await response.json()).data.kind).toBe('lesson'); });
});
describe('chat and lesson persistence', () => {
  it('saves and reloads scenario, difficulty and conversation', () => { const store=memory(); const settings={...defaultSettings,mode:'practice' as const,difficulty:'Advanced' as const}; const turns=appendTurn([], 'Start', opening); saveSession(store,settings,turns); expect(readSession(store)).toEqual({settings,turns}); });
  it('bounds stored turns and outgoing history independently', () => { const store=memory(); let turns: ReturnType<typeof appendTurn>=[]; for(let i=0;i<20;i++) turns=appendTurn(turns,`turn ${i}`,opening); saveSession(store,defaultSettings,turns); expect(readSession(store).turns).toHaveLength(12); expect(contextMessages(turns)).toHaveLength(12); });
  it('saves and retrieves lessons without duplication', () => { const store=memory(); saveLesson(store,lesson().lesson!); saveLesson(store,lesson().lesson!); expect(readLessons(store)).toHaveLength(1); expect(readLessons(store)[0].dialogues[0].exchanges).toHaveLength(2); });
  it('new conversation preserves saved lessons', () => { const store=memory(); saveLesson(store,lesson().lesson!); saveSession(store,defaultSettings,appendTurn([], 'Start',opening)); saveSession(store,defaultSettings,[]); expect(readSession(store).turns).toEqual([]); expect(readLessons(store)).toHaveLength(1); });
  it('recovers corrupt history and lesson storage', () => { const store=memory(); store.setItem(CHAT_KEY,'{}'); store.setItem(LESSONS_KEY,'invalid'); expect(readSession(store).turns).toEqual([]); expect(readLessons(store)).toEqual([]); });
});
