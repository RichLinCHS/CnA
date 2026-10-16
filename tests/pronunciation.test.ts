import { expect, it } from 'vitest';
import { validatePronunciation } from '../lib/schema';
import { fallback } from '../lib/vocabulary';
it('rejects translated prose copied into the sound-alike field', () => {
 const card = {...fallback('how are you')!.sentence, english:'How are you?', translation:'你好吗？', soundAlike:'你 好 吗'};
 expect(() => validatePronunciation(card)).toThrow('repeats the translation');
 expect(() => validatePronunciation({...card,soundAlike:'好 阿 优'})).not.toThrow();
});
it('allows short legitimate overlaps such as hi', () => {
 expect(() => validatePronunciation({...fallback('how are you')!.sentence,english:'Hi!',translation:'嗨',soundAlike:'嗨'})).not.toThrow();
});
it('rejects non-Mandarin kana mixed into sound-alikes',()=>{expect(()=>validatePronunciation({...fallback('hello')!.sentence,english:'appointment',soundAlike:'艾 ポイン 特 メント'})).toThrow('Japanese kana');});
