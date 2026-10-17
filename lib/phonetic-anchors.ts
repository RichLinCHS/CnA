import {tokens,type Card} from './schema';
// Stable mnemonic anchors for common, unambiguous words. These are not exact Mandarin transcriptions.
const anchors:Record<string,string>={"i'm":'艾姆',not:'纳特',in:'因',tomorrow:'特玛柔',hello:'哈喽',welcome:'韦尔克姆',my:'麦',app:'艾普',you:'优',is:'伊兹',it:'伊特',we:'威',me:'米',no:'诺',yes:'耶斯',i:'爱',"haven't":'哈文特',"hasn't":'哈曾特',"didn't":'迪登特',have:'哈夫',has:'哈兹',had:'哈德',eat:'伊特',eaten:'伊吞',eating:'伊廷',yet:'耶特',already:'奥瑞迪',hungry:'亨格瑞',today:'特得诶'};
const referenceIpa:Record<string,string>={i:'aɪ',"haven't":'ˈhævənt',"hasn't":'ˈhæzənt',"didn't":'ˈdɪdənt',have:'hæv',has:'hæz',had:'hæd',eat:'iːt',eaten:'ˈiːtən',eating:'ˈiːtɪŋ',yet:'jɛt',already:'ɔlˈrɛdi',hungry:'ˈhʌŋɡri',today:'təˈdeɪ'};
export function anchorCard(card:Card):Card {
 const words=tokens(card.english).map(w=>w.toLowerCase().replaceAll('’',"'"));
 if(!words.length)return card;
 const groups=card.soundAlike.trim().split(/\s+/);
 const allKnown=words.every(w=>anchors[w]);
 // Only replace partial sentences when the provider preserved one group per word.
 if(!allKnown&&(groups.length!==words.length||!words.some(w=>anchors[w])))return card;
 const soundAlike=words.map((w,i)=>anchors[w]??groups[i]).join(' ');
 const ipa=words.every(w=>referenceIpa[w])?'/'+words.map(w=>referenceIpa[w]).join(' ')+'/':card.ipa;
 const notes=words.some(w=>["haven't",'have'].includes(w))?['have /hæv/ 和 haven’t /ˈhævənt/ 的 /æ/ 不是汉语的“哈”；/v/ 要上齿轻触下唇送气。词尾 /t/ 不要读成完整的“特”。']:[];
 if(words.includes('eaten'))notes.push('eaten /ˈiːtən/ 有两个音节，重音在前；“伊吞”仅为记忆提示，后半部分要轻短，不要读成中文“吃”。');
 return {...card,soundAlike,ipa,limitations:[...new Set([...notes,...(allKnown?[]:card.limitations),'汉字是近似记忆提示，不能准确表示英语元音和词尾辅音；不要把每个汉字都读成完整音节，请跟读英语音频。'])].slice(0,8)};
}
