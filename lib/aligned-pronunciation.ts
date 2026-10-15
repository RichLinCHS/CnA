import type {Learning} from './schema';
// Called after word-order validation. A sentence cannot silently lose a word's phonetic group.
export function alignPronunciation(data:Learning):Learning {
 return {...data,sentence:{...data.sentence,soundAlike:data.words.map(word=>word.soundAlike.trim()).join(' ')}};
}
