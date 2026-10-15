import {expect,it} from 'vitest';
import {alignPronunciation} from '../lib/aligned-pronunciation';
import {fallback} from '../lib/vocabulary';
it('rebuilds incomplete sentence phonetics from every ordered word, including repeats',()=>{const base=fallback('hello')!;const words=[['Hello','哈喽'],['Welcome','韦尔克姆'],['to','特'],['my','麦'],['App','艾普'],['App','艾普']].map(([english,soundAlike])=>({...base.sentence,english,soundAlike}));const data={...base,sentence:{...base.sentence,english:'Hello Welcome to my App App',soundAlike:'嗨 楼 优 迈 阿卜'},words};const result=alignPronunciation(data);expect(result.sentence.soundAlike).toBe('哈喽 韦尔克姆 特 麦 艾普 艾普');expect(result.sentence.translation).toBe(data.sentence.translation);expect(data.sentence.soundAlike).toBe('嗨 楼 优 迈 阿卜');});
