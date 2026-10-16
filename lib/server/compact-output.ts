import {z} from 'zod';
import {chatResponseSchema,type ChatRequest} from '../chat-schema';
type Node={type?:string;properties?:Record<string,Node>;required?:string[];anyOf?:Node[];items?:Node;minItems?:number;maxItems?:number;enum?:string[];[key:string]:unknown};
export function compactSchema(schema:object):object {
 const copy=JSON.parse(JSON.stringify(schema));
 function visit(node:Node){if(!node||typeof node!=='object')return;if(node.properties?.english&&node.properties.soundAlike){delete node.properties.limitations;node.required=node.required?.filter(k=>k!=='limitations');}for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(v=>visit(v as Node));else if(value&&typeof value==='object')visit(value as Node);}}
 visit(copy);return copy;
}
export function restoreNotes(value:unknown,language='zh'):unknown {
 if(Array.isArray(value))return value.map(v=>restoreNotes(v,language));
 if(!value||typeof value!=='object')return value;
 const obj=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,restoreNotes(v,language)]));
 if(typeof obj.english==='string'&&typeof obj.soundAlike==='string'&&!('limitations' in obj))obj.limitations=[language==='en'?'Mandarin characters are approximate memory aids. Use English audio and IPA; avoid adding vowels after final consonants.':'汉字仅为近似记忆提示。请以英语音频和 IPA 为准，词尾辅音后不要添加完整元音。'];
 return obj;
}
export function tutorOutputSchema(request:ChatRequest,counts:{sentences:number;dialogues:number}):object {
 const schema=compactSchema(z.toJSONSchema(chatResponseSchema,{target:'draft-7'})) as Node;
 const p=schema.properties!;
 const object=(node:Node)=>node.anyOf?.find(n=>n.type==='object')??node;
 p.kind={type:'string',enum:[request.mode==='learn'?'lesson':'roleplay']};
 if(request.mode==='learn'){
  p.reply={type:'null'};p.correction={type:'null'};p.lesson=object(p.lesson);
  const lp=p.lesson.properties!;lp.sentences.minItems=lp.sentences.maxItems=counts.sentences;lp.dialogues.minItems=lp.dialogues.maxItems=counts.dialogues;
 }else{p.lesson={type:'null'};p.reply=object(p.reply);p.correction=request.history.length?object(p.correction):{type:'null'};if(request.history.length)p.correction.properties!.original={type:'string',enum:[request.message]};}
 return schema;
}
