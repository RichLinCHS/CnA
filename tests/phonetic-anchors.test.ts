import {expect,it} from 'vitest';
import {anchorCard} from '../lib/phonetic-anchors';
import {fallback} from '../lib/vocabulary';
it('corrects translated negatives and keeps contraction consonants',()=>{const card={...fallback('hello')!.sentence,english:"I'm not in tomorrow",soundAlike:'爱 没 特 得玛罗'};expect(anchorCard(card).soundAlike).toBe('艾姆 纳特 因 特玛柔');expect(anchorCard({...card,english:'I’m'}).soundAlike).toBe('艾姆');});
it('preserves unknown pronunciations instead of guessing',()=>{const card={...fallback('hello')!.sentence,english:'unlisted name'};expect(anchorCard(card)).toBe(card);});
it('repairs the reported contraction and eaten without translating phonetics',()=>{const card={...fallback('hello')!.sentence,english:"I haven't eaten yet",soundAlike:'艾 艾特纳特 吃特 也特'};const fixed=anchorCard(card);expect(fixed.soundAlike).toBe('爱 哈文特 伊吞 耶特');expect(fixed.ipa).toBe('/aɪ ˈhævənt ˈiːtən jɛt/');expect(anchorCard({...card,english:'I haven’t eaten yet.'}).soundAlike).toBe(fixed.soundAlike);expect(anchorCard(fixed)).toEqual(fixed);});
it('corrects known groups in mixed sentences only when word boundaries align',()=>{const card={...fallback('hello')!.sentence,english:'I have pizza',soundAlike:'艾 具有 披萨'};expect(anchorCard(card).soundAlike).toBe('爱 哈夫 披萨');expect(anchorCard({...card,soundAlike:'艾 具 有 披萨'}).soundAlike).toBe('艾 具 有 披萨');});
