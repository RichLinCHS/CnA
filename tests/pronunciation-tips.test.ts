import {expect,it} from 'vitest';
import {pronunciationTips} from '../lib/pronunciation-tips';
import {anchorCard} from '../lib/phonetic-anchors';
it('explains the vowel, voiced consonant and ending in have not',()=>{
 const tips=pronunciationTips('/hæv nɑt/');
 expect(tips).toHaveLength(3);
 expect(tips.map(t=>t.en).join(' ')).toContain('vibrate');
 expect(tips.every(t=>t.zh)).toBe(true);
});
it('does not invent difficulties for an open syllable',()=>expect(pronunciationTips('/miː/')).toEqual([]));
it('preserves an alternative IPA and its approximation instead of forcing dictionary anchors',()=>{
 const card={english:'have',ipa:'/həv/',soundAlike:'赫夫',translation:'有',limitations:[]};
 expect(anchorCard(card)).toEqual(card);
});
