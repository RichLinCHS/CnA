import {anchorCard} from './phonetic-anchors';
import type {Learning} from './schema';
// Called after word-order validation. A sentence cannot silently lose a word's phonetic group.
export function alignPronunciation(data:Learning):Learning {
 const words=data.words.map(anchorCard);
 return {...data,words,sentence:anchorCard({...data.sentence,soundAlike:words.map(word=>word.soundAlike.trim()).join(' ')})};
}
