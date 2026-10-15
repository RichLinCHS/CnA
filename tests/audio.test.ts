import {expect,it} from 'vitest';
import {chooseVoice} from '../lib/audio';
it('selects Mandarin for Chinese and American English for English',()=>{const voices=[{lang:'en-GB'},{lang:'zh-CN'},{lang:'en-US'}];expect(chooseVoice(voices,'zh-CN')).toBe(voices[1]);expect(chooseVoice(voices,'en-US')).toBe(voices[2]);});
it('allows Mandarin regional fallbacks but never Cantonese or English for Chinese',()=>{expect(chooseVoice([{lang:'zh-HK'},{lang:'yue-HK'},{lang:'en-US'}],'zh-CN')).toBeUndefined();expect(chooseVoice([{lang:'zh_TW'}],'zh-CN')?.lang).toBe('zh_TW');expect(chooseVoice([{lang:'cmn-CN'}],'zh-CN')?.lang).toBe('cmn-CN');});
it('handles missing voices and English fallback',()=>{expect(chooseVoice([],'zh-CN')).toBeUndefined();expect(chooseVoice([{lang:'en-GB'}],'en-US')?.lang).toBe('en-GB');});
