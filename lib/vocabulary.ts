import { type Card, type Learning, tokens } from './schema';
// Original soundbridge.html vocabulary, preserved verbatim.
export const vocabulary: Record<string, [string, string, string]> = {
  apple: ['艾坡','苹果','/ˈæpəl/'], beautiful: ['比优提否','美丽的','/ˈbjuːtɪfəl/'],
  'thank you': ['三克油','谢谢','/ˈθæŋk juː/'], hello: ['哈喽','你好','/həˈloʊ/'],
  'good morning': ['古德 莫宁','早上好','/ɡʊd ˈmɔːrnɪŋ/'], 'how are you': ['好 阿 优','你好吗','/haʊ ɑːr juː/'],
  water: ['沃特','水','/ˈwɔːtər/'], computer: ['康皮优特','电脑','/kəmˈpjuːtər/'],
  school: ['斯库尔','学校','/skuːl/'], english: ['英格利许','英语','/ˈɪŋɡlɪʃ/'],
  today: ['特得诶','今天','/təˈdeɪ/'], friend: ['弗润德','朋友','/frɛnd/'],
  love: ['拉夫','爱','/lʌv/'], goodbye: ['古德拜','再见','/ɡʊdˈbaɪ/'],
};
const extra: typeof vocabulary = { thank: ['三克','感谢','/θæŋk/'], you: ['优','你','/juː/'], good: ['古德','好的','/ɡʊd/'], morning: ['莫宁','早晨','/ˈmɔrnɪŋ/'], how: ['好','如何','/haʊ/'], are: ['阿','是（be 的形式）','/ɑr/'] };
const general = '汉字只是近似记忆提示，不能准确表达英语的重音、辅音群和所有元音。请以英语音频为准。';
function card(english: string, entry: [string, string, string]): Card {
  return { english, soundAlike: entry[0], translation: entry[1], ipa: entry[2], limitations: [general, ...(/thank/i.test(english) ? ['普通话没有 /θ/；请把舌尖轻放在上下齿之间送气，不要读成 /s/。'] : [])] };
}
export function fallback(text: string): Learning | null {
  const key = text.toLowerCase().replace(/[!?.,]+$/, '').replace(/\s+/g, ' ').trim();
  const entry = vocabulary[key];
  if (!entry) return null;
  const words = tokens(text).map(word => {
    const value = vocabulary[word.toLowerCase()] ?? extra[word.toLowerCase()];
    return value ? card(word, value) : null;
  });
  if (words.some(w => !w)) return null;
  return { originalText: text, sentence: card(text, entry), words: words as Card[] };
}
