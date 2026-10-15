'use client';
import {useState} from 'react';
import type {Card} from '../lib/schema';
import type {Speak} from '../lib/audio';
import LearningCard from './LearningCard';
import {useInstructions} from './Instructions';
export default function Flashcards({cards,favorites,onSave,onSpeak}:{cards:Card[];favorites:Card[];onSave:(card:Card)=>void;onSpeak:Speak}){
 const {t}=useInstructions();const [order,setOrder]=useState(()=>cards.map((_,i)=>i));const [index,setIndex]=useState(0);const [flipped,setFlipped]=useState(false);
 if(!cards.length)return <p>{t('Save some vocabulary to start studying.','收藏词汇后即可开始学习。')}</p>;
 const card=cards[order[index]];
 function move(step:number){setIndex((index+step+cards.length)%cards.length);setFlipped(false);}
 function shuffle(){const next=cards.map((_,i)=>i);for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}setOrder(next);setIndex(0);setFlipped(false);}
 return <section className="panel flashcards" aria-label={t('Flashcard study','闪卡学习')} onKeyDown={e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextArea)return;if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}}>
 <div className="flex items-center justify-between gap-2"><h2>{t('Flashcards','闪卡练习')}</h2><span role="status">{index+1} / {cards.length}</span></div>
 <p className="hint">{t('Recall the meaning, then flip to check. Use the arrows to cycle through your cards.','先回想意思，再翻面查看。点击箭头切换卡片。')}</p>
 <div key={`${index}-${flipped}`} className="flash-face">{flipped?<><LearningCard card={card} saved={favorites.some(f=>f.english.toLowerCase()===card.english.toLowerCase())} onSave={onSave} onSpeak={onSpeak}/><button className="secondary" onClick={()=>setFlipped(false)}>{t('↶ Show front','↶ 返回正面')}</button></>:<button className="flash-front" onClick={()=>setFlipped(true)} aria-label={t('Flip card to reveal answer','翻面查看答案')}><span className="english">{card.english}</span><span className="hint">{t('Tap to flip','点击翻面')}</span></button>}</div>
 <div className="actions flash-controls"><button className="secondary" disabled={cards.length<2} onClick={()=>move(-1)} aria-label={t('Previous card','上一张')}>←</button><button className="secondary" disabled={cards.length<2} onClick={shuffle}>{t('Shuffle','打乱顺序')}</button><button className="primary" disabled={cards.length<2} onClick={()=>move(1)} aria-label={t('Next card','下一张')}>→</button></div>
 </section>;
}
