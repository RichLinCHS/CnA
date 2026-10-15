export type AudioLanguage = 'en-US' | 'zh-CN';
export type Speak = (text: string, rate?: number, language?: AudioLanguage) => void;
export function chooseVoice<T extends {lang:string}>(voices:T[], language:AudioLanguage):T|undefined {
 const normalized=(v:T)=>v.lang.replaceAll('_','-').toLowerCase();
 const exact=voices.find(v=>normalized(v)===language.toLowerCase());
 if(exact)return exact;
 return voices.find(v=>language==='en-US'?/^en(?:-|$)/.test(normalized(v)):/^(?:cmn(?:-|$)|zh(?:$|-tw$|-sg$|-hans(?:-|$)|-hant(?:-|$)))/.test(normalized(v)));
}
