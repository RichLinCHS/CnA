import { z } from 'zod';
import { cardSchema, validatePronunciation } from './schema';
import { categories } from './topics';
import { learnerSchema, memorySchema } from './learner';
const chinese = z.string().min(1).max(1200); // Legacy field name; explanations follow the selected instruction language.
export const settingsSchema = z.object({ category: z.enum(categories), scenario: z.string().trim().min(1).max(200), difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']), mode: z.enum(['learn', 'practice']), sentenceCount: z.number().int().min(1).max(20) }).strict();
export const messageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(3000) }).strict();
export const chatRequestSchema = settingsSchema.extend({ instructionLanguage: z.enum(['en', 'zh']).optional(), message: z.string().max(1000).trim().min(1), history: z.array(messageSchema).max(12), learner: learnerSchema.optional(), learningMemory: memorySchema.optional(), conversationGoal: z.string().max(1000).optional() }).strict().superRefine((data, ctx) => {
  if (data.history.length % 2 || data.history.some((m, i) => m.role !== (i % 2 ? 'assistant' : 'user'))) ctx.addIssue({ code: 'custom', message: 'History must contain complete user/assistant turn pairs.' });
  if (data.history.reduce((n, m) => n + m.content.length, 0) > 18000) ctx.addIssue({ code: 'custom', message: 'Conversation context is too long.' });
});
const dialogueSchema = z.object({ title: z.string().min(1).max(120), exchanges: z.array(z.object({ speaker: z.string().min(1).max(60), card: cardSchema }).strict()).min(2).max(8) }).strict();
export const lessonSchema = z.object({ title: z.string().min(1).max(120), sentences: z.array(cardSchema).min(1).max(20), dialogues: z.array(dialogueSchema).min(1).max(10) }).strict();
export const chatResponseSchema = z.object({ kind: z.enum(['lesson', 'roleplay']), explanationChinese: chinese, lesson: lessonSchema.nullable(), correction: z.object({ original: z.string().min(1).max(1000), improved: cardSchema, explanationChinese: chinese }).strict().nullable(), reply: z.object({ speaker: z.string().min(1).max(60), card: cardSchema }).strict().nullable() }).strict();
export type Settings = z.infer<typeof settingsSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Message = z.infer<typeof messageSchema>;
export const defaultSettings: Settings = { category: 'Nail Salon', scenario: 'Greetings & walk-ins', difficulty: 'Beginner', mode: 'learn', sentenceCount: 6 };
export function lessonCounts(message: string, defaultCount: number) {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const match = message.toLowerCase().match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\s+(?:common\s+|practical\s+|everyday\s+)?(?:[a-z]+\s+)?(sentences?|phrases?|conversations?|dialogues?)\b|([\d一二三四五六七八九十]+)\s*(?:个|句|段)?\s*(句子|对话)/);
  if (!match) return { sentences: defaultCount, dialogues: 1 };
  const number = Number(match[1] ?? match[3]) || words[match[1] ?? match[3]];
  const dialogue = /conversation|dialogue|对话/.test(match[2] ?? match[4]);
  if (!number || number < 1 || number > (dialogue ? 10 : 20)) throw new Error(dialogue ? 'Request 1–10 conversations at a time.' : 'Request 1–20 sentences at a time.');
  return { sentences: dialogue ? defaultCount : number, dialogues: dialogue ? number : 1 };
}
export function validateChat(value: unknown, request: ChatRequest): ChatResponse {
  const data = chatResponseSchema.parse(value);
  data.lesson?.sentences.forEach(validatePronunciation);
  data.lesson?.dialogues.forEach(d => d.exchanges.forEach(e => validatePronunciation(e.card)));
  if (data.reply) validatePronunciation(data.reply.card);
  if (data.correction) validatePronunciation(data.correction.improved);
  if (request.mode === 'learn') {
    const counts = lessonCounts(request.message, request.sentenceCount);
    if (data.kind !== 'lesson' || !data.lesson || data.reply || data.correction || data.lesson.sentences.length !== counts.sentences || data.lesson.dialogues.length !== counts.dialogues) throw new Error('Lesson shape or count mismatch');
  } else {
    if (data.kind !== 'roleplay' || !data.reply || data.lesson) throw new Error('Expected a roleplay turn');
    if (request.history.length && (!data.correction || data.correction.original !== request.message)) throw new Error('Missing correction for the current student response');
    if (!request.history.length && data.correction) throw new Error('Do not correct a setup request');
  }
  return data;
}
export function summarizeResponse(data: ChatResponse): string {
  return JSON.stringify({ explanation: data.explanationChinese, reply: data.reply && { speaker: data.reply.speaker, english: data.reply.card.english }, correction: data.correction && { original: data.correction.original, improved: data.correction.improved.english, explanation: data.correction.explanationChinese }, lesson: data.lesson && { title: data.lesson.title, sentences: data.lesson.sentences.map(c => c.english), dialogues: data.lesson.dialogues.map(d => ({ title: d.title, lines: d.exchanges.map(e => `${e.speaker}: ${e.card.english}`) })) } }).slice(0, 3000);
}
