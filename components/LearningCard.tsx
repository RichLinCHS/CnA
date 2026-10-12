'use client';
import { useInstructions } from './Instructions';
import { useId, useState } from 'react';
import type { Card } from '../lib/schema';
export default function LearningCard({ card, saved, onSave, onSpeak }: { card: Card; saved: boolean; onSave: (card: Card) => void; onSpeak: (text: string, rate?: number) => void }) {
  const { t, language } = useInstructions();
  const [rate, setRate] = useState(1);
  const speedId = useId();
  return <article className="item">
    <h3 className="english">{card.english}</h3>
    <p className="hint !mb-0">{t("Chinese sound-alike · 谐音辅助","中文谐音辅助（不是翻译）")}</p><p className="sound" lang="zh-Hans">{card.soundAlike}</p>
    <p className="hint !mb-0">{t("Meaning · 中文意思","中文意思")}</p><p className="meaning" lang="zh-Hans">{card.translation}</p>
    <p className="ipa"><span className="sr-only">American English IPA: </span>{card.ipa}</p>
    <div className="actions"><label htmlFor={speedId} className="!mb-0 text-sm">{t("Audio speed","播放速度")}</label><select id={speedId} aria-label={`Audio speed for ${card.english}`} value={rate} onChange={e => setRate(Number(e.target.value))}><option value={0.7}>{t("Slow · 0.7×","慢速 · 0.7×")}</option><option value={1}>{t("Normal · 1.0×","正常 · 1.0×")}</option><option value={1.2}>{t("Fast · 1.2×","快速 · 1.2×")}</option></select><button className="secondary" onClick={() => onSpeak(card.english, rate)} aria-label={`Listen to ${card.english}`}>{t("🔊 Listen","🔊 听发音")}</button><button className="secondary" aria-pressed={saved} onClick={() => onSave(card)} aria-label={`${saved ? 'Remove' : 'Save'} favorite ${card.english}`}>{saved ? t("★ Saved","★ 已收藏") : t("☆ Save","☆ 收藏")}</button></div>
    <details className="hint"><summary className="cursor-pointer">{t("Pronunciation limitations","发音局限说明")}</summary><ul className="mt-2 list-disc pl-5" lang="zh-Hans">{card.limitations.map((note, i) => <li key={i}>{note}</li>)}</ul></details>
  </article>;
}
