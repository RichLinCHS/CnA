import {expect,it} from 'vitest';
import {anchorCard} from '../lib/phonetic-anchors';
import {fallback} from '../lib/vocabulary';
it('corrects translated negatives and keeps contraction consonants',()=>{const card={...fallback('hello')!.sentence,english:"I'm not in tomorrow",soundAlike:'爱 没 特 得玛罗'};expect(anchorCard(card).soundAlike).toBe('艾姆 纳特 因 特玛柔');expect(anchorCard({...card,english:'I’m'}).soundAlike).toBe('艾姆');});
it('preserves unknown pronunciations instead of guessing',()=>{const card={...fallback('hello')!.sentence,english:'unlisted name'};expect(anchorCard(card)).toBe(card);});
