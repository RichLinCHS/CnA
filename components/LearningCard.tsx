import type { Card } from '../lib/schema';
export default function LearningCard({ card, saved, onSave, onSpeak }: { card: Card; saved: boolean; onSave: (card: Card) => void; onSpeak: (text: string) => void }) {
  return <article className="item">
    <h3 className="english">{card.english}</h3>
    <p className="sound" lang="zh-Hans">{card.soundAlike}</p>
    <p className="meaning" lang="zh-Hans">{card.translation}</p>
    <p className="ipa"><span className="sr-only">American English IPA: </span>{card.ipa}</p>
    <div className="actions"><button className="secondary" onClick={() => onSpeak(card.english)} aria-label={`Listen to ${card.english}`}>🔊 Listen</button><button className="secondary" aria-pressed={saved} onClick={() => onSave(card)} aria-label={`${saved ? 'Remove' : 'Save'} favorite ${card.english}`}>{saved ? '★ Saved' : '☆ Save'}</button></div>
    <details className="hint"><summary className="cursor-pointer">Pronunciation limitations</summary><ul className="mt-2 list-disc pl-5" lang="zh-Hans">{card.limitations.map((note, i) => <li key={i}>{note}</li>)}</ul></details>
  </article>;
}
