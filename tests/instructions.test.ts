import { expect, it } from 'vitest';
import { chatRequestSchema, chatResponseSchema, defaultSettings } from '../lib/chat-schema';
it('accepts both instruction languages and rejects unsupported languages', () => {
 for (const instructionLanguage of ['en','zh']) expect(chatRequestSchema.safeParse({...defaultSettings, message:'Hello', history:[], instructionLanguage}).success).toBe(true);
 expect(chatRequestSchema.safeParse({...defaultSettings,message:'Hello',history:[],instructionLanguage:'invalid'}).success).toBe(false);
});
it('allows English explanatory text without changing Chinese card requirements', () => {
 expect(chatResponseSchema.shape.explanationChinese.safeParse('Let us practice greeting a customer.').success).toBe(true);
 expect(chatResponseSchema.shape.explanationChinese.safeParse('').success).toBe(false);
});
