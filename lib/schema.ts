import { z } from 'zod';

export const inputSchema = z.object({ text: z.string().max(300, 'Use at most 300 characters.').trim().min(1, 'Enter an English word or sentence.').refine(t => /[A-Za-z]/.test(t), 'Include an English word.') }).strict();
const chinese = z.string().min(1).max(1200).regex(/^[\s\S]*[\u3400-\u9fff][\s\S]*$/, 'Expected Chinese characters');
export const cardSchema = z.object({ english: z.string().min(1).max(300), soundAlike: chinese, translation: chinese, ipa: z.string().min(3).max(1200).regex(/^\/[^/]+\/$/), limitations: z.array(z.string().min(1).max(400)).min(1).max(8) }).strict();
export const learningSchema = z.object({ originalText: z.string().min(1).max(300), sentence: cardSchema, words: z.array(cardSchema).min(1).max(150) }).strict();
export type Card = z.infer<typeof cardSchema>;
export type Learning = z.infer<typeof learningSchema>;
export type Result = { data: Learning; source: 'ai' | 'cache' | 'fallback' | 'history'; notice?: string };
export const tokens = (text: string) => text.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g) ?? [];
export function validateLearning(value: unknown, text: string): Learning {
  const data = learningSchema.parse(value);
  const expected = tokens(text);
  if (data.originalText !== text || data.sentence.english !== text || data.words.length !== expected.length || data.words.some((word, i) => word.english !== expected[i])) throw new Error('Response did not preserve the input and word order.');
  return data;
}
export const outputJsonSchema = z.toJSONSchema(learningSchema, { target: 'draft-7' });
