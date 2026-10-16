import {tokens,type Card} from './schema';
// Stable mnemonic anchors for common, unambiguous words. These are not exact Mandarin transcriptions.
const anchors:Record<string,string>={"i'm":'艾姆',not:'纳特',in:'因',tomorrow:'特玛柔',hello:'哈喽',welcome:'韦尔克姆',my:'麦',app:'艾普',you:'优',is:'伊兹',it:'伊特',we:'威',me:'米',no:'诺',yes:'耶斯'};
export function anchorCard(card:Card):Card {
 const words=tokens(card.english).map(w=>w.toLowerCase().replaceAll('’',"'"));
 if(!words.length||!words.every(w=>anchors[w]))return card;
 return {...card,soundAlike:words.map(w=>anchors[w]).join(' '),limitations:['汉字是近似记忆提示，不能准确表示英语元音和词尾辅音；不要把每个汉字都读成完整音节，请跟读英语音频。']};
}
