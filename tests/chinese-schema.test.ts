import { expect, it } from 'vitest';
import { outputJsonSchema } from '../lib/schema';
it('allows complete Chinese phrases even when provider patterns are full matched', () => {
 const schema = outputJsonSchema as any;
 for (const field of ['soundAlike', 'translation']) {
  const pattern = schema.properties.sentence.properties[field].pattern;
  const match = new RegExp(pattern).exec('你今天过得怎么样？');
  expect(match?.[0]).toBe('你今天过得怎么样？');
  expect(new RegExp(pattern).test('hello')).toBe(false);
 }
});
