'use client';
import { useId, useState } from 'react';
import type { Card } from '../lib/schema';
export default function LearningCard({ card, saved, onSave, onSpeak }: { card: Card; saved: boolean; onSave: (card: Card) => void; onSpeak: (text: string, rate?: number) => void }) {
  const [rate, setRate] = useState(1);
  const speedId = useId();
  return <article className="item">
    <h3 className="english">{card.english}</h3>
    <p className="hint !mb-0">Chinese sound-alike · 谐音辅助</p><p className="sound" lang="zh-Hans">{card.soundAlike}</p>
    <p className="hint !mb-0">Meaning · 中文意思</p><p className="meaning" lang="zh-Hans">{card.translation}</p>
    <p className="ipa"><span className="sr-only">American English IPA: </span>{card.ipa}</p>
    <div className="actions"><label htmlFor={speedId} className="!mb-0 text-sm">Audio speed</label><select id={speedId} aria-label={`Audio speed for ${card.english}`} value={rate} onChange={e => setRate(Number(e.target.value))}><option value={0.7}>Slow · 0.7×</option><option value={1}>Normal · 1.0×</option><option value={1.2}>Fast · 1.2×</option></select><button className="secondary" onClick={() => onSpeak(card.english, rate)} aria-label={`Listen to ${card.english}`}>🔊 Listen</button><button className="secondary" aria-pressed={saved} onClick={() => onSave(card)} aria-label={`${saved ? 'Remove' : 'Save'} favorite ${card.english}`}>{saved ? '★ Saved' : '☆ Save'}</button></div>
    <details className="hint"><summary className="cursor-pointer">Pronunciation limitations</summary><ul className="mt-2 list-disc pl-5" lang="zh-Hans">{card.limitations.map((note, i) => <li key={i}>{note}</li>)}</ul></details>
  </article>;
}
