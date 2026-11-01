// Explain sounds that Han-character mnemonics cannot encode, using the card's IPA.
export function pronunciationTips(ipa:string):{en:string;zh:string}[] {
 const tips=[];
 if(ipa.includes('æ'))tips.push({en:'For /æ/, open your mouth wider than “诶”; keep your tongue toward the front. “艾” is only a reminder.',zh:'/æ/：嘴张得比“诶”大，舌头靠前；“艾”只是提示，不要读成 /aɪ/。'});
 if(ipa.includes('v'))tips.push({en:'For /v/, touch your lower lip with your upper teeth and vibrate your voice. Do not pronounce it as /f/ or /w/.',zh:'/v/：上齿轻触下唇，声带振动；不要读成“夫”的 /f/ 或 /w/。'});
 if(/[θð]/.test(ipa))tips.push({en:'For /θ/ and /ð/, place your tongue tip lightly between your teeth; these are not /s/ or /z/.',zh:'/θ/、/ð/：舌尖轻放在上下齿之间；不是“斯”或“兹”。/ð/ 需要声带振动。'});
 if(/[ptkbdɡg](?=[\s/ˈˌ]|$)/.test(ipa))tips.push({en:'Final /p t k b d g/ are consonants, not extra syllables: do not add the vowel of “普、特、克、德”.',zh:'词尾 /p t k b d g/ 只收尾，不增加音节：不要把“普、特、克、德”读成完整汉语音节。'});
 return tips.slice(0,3);
}
