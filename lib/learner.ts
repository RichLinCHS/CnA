import { z } from 'zod';
export const learnerSchema = z.object({ goals: z.string().max(1000), situation: z.string().max(500), preferences: z.string().max(500) }).strict();
export const memorySchema = z.array(z.object({ topic: z.string().max(260), request: z.string().max(1000) }).strict()).max(5);
export const emptyLearner = { goals: '', situation: '', preferences: '' };
export type Learner = z.infer<typeof learnerSchema>;
