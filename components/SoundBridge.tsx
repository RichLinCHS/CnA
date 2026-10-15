'use client';
import { InstructionProvider, InstructionToggle, useInstructions } from './Instructions';
import { chooseVoice, type AudioLanguage } from '../lib/audio';
import { useEffect, useRef, useState } from 'react';
import { type Card, type Result, type Learning, validateLearning } from '../lib/schema';
import { fallback, vocabulary } from '../lib/vocabulary';
import { readFavorites, readHistory, saveHistory, toggleFavorite, HISTORY_KEY } from '../lib/storage';
import Dictation from './Dictation';
import LearningCard from './LearningCard';
import Account from './Account';
import Tutor from './Tutor';
import LessonView from './LessonView';
import { readLessons, saveLesson } from '../lib/chat-storage';
import type { Lesson } from '../lib/chat-schema';

export default function SoundBridge() { return <InstructionProvider><SoundBridgeContent/></InstructionProvider>; }
function SoundBridgeContent() {
  const { t, language } = useInstructions();
  const [tab, setTab] = useState('generator');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [inputLanguage, setInputLanguage] = useState<'en' | 'zh'>('en');
  const [text, setText] = useState('beautiful');
  const [result, setResult] = useState<Result>({ data: fallback('beautiful')!, source: 'fallback', notice: 'An original SoundBridge example. Generate to try AI.' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [audioNote, setAudioNote] = useState(''); const [storageNote, setStorageNote] = useState('');
  const [rate, setRate] = useState(1); const [favorites, setFavorites] = useState<Card[]>([]); const [history, setHistory] = useState<Learning[]>([]);
  const voices = useRef<SpeechSynthesisVoice[]>([]); const utterance = useRef<SpeechSynthesisUtterance | null>(null); const active = useRef<AbortController | null>(null);
  useEffect(() => {
    try { setFavorites(readFavorites(localStorage)); setHistory(readHistory(localStorage)); setLessons(readLessons(localStorage)); } catch { setStorageNote('Browser storage is unavailable; favorites and history cannot be saved.'); }
    if (!('speechSynthesis' in window)) { setAudioNote('This browser does not support speech audio.'); return; }
    const update = () => { voices.current = speechSynthesis.getVoices(); };
    update(); speechSynthesis.addEventListener('voiceschanged', update);
    return () => { speechSynthesis.removeEventListener('voiceschanged', update); speechSynthesis.cancel(); active.current?.abort(); };
  }, []);
  function speak(value: string, playbackRate = rate, audioLanguage: AudioLanguage = 'en-US') {
    if (!value.trim()) return;
    if (!('speechSynthesis' in window)) { setAudioNote('This browser does not support speech audio. Try Safari, Chrome, or Edge on a device with English voices.'); return; }
    const available = speechSynthesis.getVoices(); if (available.length) voices.current = available;
    const voice = chooseVoice(voices.current, audioLanguage);
    if (!voice) { setAudioNote(audioLanguage === 'zh-CN' ? t('No Mandarin voice is available. Enable or download a Mandarin Chinese voice in your device’s speech settings, then try again.','没有可用的普通话语音。请在设备语音设置中启用或下载普通话语音后重试。') : t('No English voice is available. Enable or download an English voice in your device’s speech settings, then try again.','没有可用的英语语音。请在设备语音设置中启用或下载英语语音后重试。')); return; }
    speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(value);
    speech.voice = voice; speech.lang = audioLanguage; speech.rate = playbackRate; utterance.current = speech;
    setAudioNote(audioLanguage === 'en-US' && !/^en[-_]US$/i.test(voice.lang) ? 'Using an available English voice; its accent may differ from American English.' : '');
    speech.onerror = event => { if (!['interrupted', 'canceled'].includes(event.error)) setAudioNote('Audio could not play. Check your device’s speech settings and try again.'); };
    speechSynthesis.speak(speech);
  }
  function keepLesson(lesson: Lesson) { try { setLessons(saveLesson(localStorage, lesson)); } catch { setStorageNote('Could not save lesson. Browser storage may be blocked or full.'); } }
  function remember(data: Learning) { try { setHistory(saveHistory(localStorage, data)); } catch { setStorageNote('Could not save history. Browser storage may be blocked or full.'); } }
  function save(card: Card) { try { setFavorites(toggleFavorite(localStorage, card)); } catch { setStorageNote('Could not save favorites. Browser storage may be blocked or full.'); } }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const value = text.trim(); if (!value) { setError('Enter an English word or sentence.'); return; }
    if (text.length > 300) { setError('Use at most 300 characters.'); return; }
    setBusy(true); setError(''); const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, inputLanguage }), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Generation failed. Please try again.');
      const data = validateLearning(body.data, value, inputLanguage);
      setResult({ data, source: ['ai', 'cache', 'fallback'].includes(body.source) ? body.source : 'ai', notice: typeof body.notice === 'string' ? body.notice : undefined }); remember(data);
    } catch (err) {
      const local = inputLanguage === 'en' ? fallback(value) : null;
      if (local) { setResult({ data: local, source: 'fallback', notice: 'AI is unavailable. Showing the original example vocabulary.' }); remember(local); }
      else setError(err instanceof Error && err.name !== 'AbortError' ? err.message : 'Generation timed out. Please try again.');
    } finally { clearTimeout(timer); setBusy(false); active.current = null; }
  }
  function example(value: string) { setInputLanguage('en'); const data = fallback(value)!; setText(value); setError(''); setResult({ data, source: 'fallback', notice: 'Original example vocabulary. Generate for an AI learning card.' }); remember(data); }
  const renderCard = (card: Card, key: string) => <LearningCard key={key} card={card} saved={favorites.some(f => f.english.toLowerCase() === card.english.toLowerCase())} onSave={save} onSpeak={speak} />;
  return <main className="wrap">
    <header><div className="logo"><span>文 A</span> SoundBridge</div><h1>{t("English that sounds familiar.","用熟悉的中文谐音学英语。")}</h1><p>{t("Learn English using Chinese sound-alikes, meanings, and real pronunciation.","通过中文谐音、释义和英语原声学习。")}</p><InstructionToggle/></header><Account/>
    <nav className="main-tabs" aria-label="Main navigation">{[['generator','Pronunciation Generator'],['tutor','AI Tutor'],['vocabulary','My Vocabulary']].map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'primary' : 'secondary'} onClick={() => setTab(id)}>{t(label, id === 'generator' ? '发音生成器' : id === 'tutor' ? 'AI 老师' : '我的词库')}</button>)}</nav>
    <div className="audio-toolbar">      <div className="mt-5 flex flex-wrap items-center gap-3"><label htmlFor="speed" className="!mb-0 text-sm">{t("Audio speed","播放速度")}</label><select id="speed" value={rate} onChange={e => setRate(Number(e.target.value))}><option value={0.7}>{t("Slow · 0.7×","慢速 · 0.7×")}</option><option value={1}>{t("Normal · 1.0×","正常 · 1.0×")}</option><option value={1.2}>{t("Fast · 1.2×","快速 · 1.2×")}</option></select></div>
      {audioNote && <p role="status" className="notice">{audioNote}</p>}</div>
    <div hidden={tab !== 'tutor'}><Tutor favorites={favorites} onSave={save} onSpeak={speak} onSaveLesson={keepLesson} lessons={lessons}/></div>
    <div hidden={tab !== 'generator'}>
    <section className="panel"><form onSubmit={generate}><label htmlFor="input-language">{t("Input language","输入语言")}</label><select id="input-language" value={inputLanguage} disabled={busy} onChange={e => setInputLanguage(e.target.value as 'en' | 'zh')}><option value="en">{t("English pronunciation","英语发音")}</option><option value="zh">中文 → English</option></select><label htmlFor="phrase">{inputLanguage === 'zh' ? t("输入中文 / Enter Chinese to translate","输入中文并翻译成英语") : t("Enter an English word or sentence","输入英语单词或句子")}</label><textarea id="phrase" value={text} maxLength={300} onChange={e => setText(e.target.value)} disabled={busy} placeholder={inputLanguage === 'zh' ? '例如：你今天过得怎么样？' : 'Try: How are you today?'} aria-describedby="input-hint"/><Dictation language={inputLanguage === 'zh' ? 'zh-CN' : 'en-US'} disabled={busy || tab !== 'generator'} onText={setText} maxLength={300}/><p id="input-hint" className="text-right text-xs text-slate-500">{text.length} / 300</p><div className="actions"><button className="primary" type="submit" disabled={busy}>{busy ? <><span className="spinner" aria-hidden="true"/>Generating…</> : inputLanguage === 'zh' ? t("Translate & generate →","翻译并生成 →") : t("Generate pronunciation →","生成发音 →")}</button><button type="button" className="secondary" disabled={inputLanguage === 'zh'} onClick={() => speak(text)}>{t("🔊 Listen","🔊 听发音")}</button></div></form>
<p className="hint">{t("Try an example","试试例词")}</p><div className="examples mt-2">{['Apple','Beautiful','Thank you','Good morning','How are you','Water'].map(word => <button key={word} disabled={busy} onClick={() => example(word)}>{word}</button>)}</div><details className="hint"><summary className="cursor-pointer">{t("All original vocabulary","全部例词")}</summary><div className="examples mt-2">{Object.keys(vocabulary).map(word => <button key={word} disabled={busy} onClick={() => example(word)}>{word}</button>)}</div></details>
      {error && <p className="notice error" role="alert">{error} Your previous learning card is still below.</p>}
    </section>
    <section className="panel" aria-busy={busy}><div className="flex items-center justify-between gap-2"><h2 className="!mb-0">{t("Your learning card","学习卡片")}</h2><span className="badge">{result.source === 'fallback' ? t("Example vocabulary","例词") : result.source === 'cache' ? t("Cached AI","已缓存") : result.source === 'history' ? t("Saved history","历史记录") : t("AI generated","AI 生成")}</span></div><div aria-live="polite">{result.notice && <p className="notice">{result.notice}</p>}<p className="hint">{result.data.words.length > 1 ? t("Full sentence / phrase","完整句子 / 短语") : t("Word pronunciation","单词发音")}</p>{renderCard(result.data.sentence, 'sentence')}</div><p className="hint">{t("Chinese sound-alikes are approximate memory aids. Listen to the English audio to learn the actual pronunciation. AI can make mistakes; pronunciation and translation depend on context.","中文谐音只是辅助记忆。请听英语原声学习真实发音。AI 可能出错，发音和翻译取决于语境。")}</p></section>
    </div>
    {storageNote && <p role="status" className="notice">{storageNote}</p>}
    <div hidden={tab !== 'vocabulary'}>
    <section className="panel"><h2>{t("Conversations & learning goals","对话与学习目标")}</h2><p className="muted text-sm">Reopen a saved chat or update what the tutor remembers about your learning goals.</p><button className="secondary mt-4" onClick={() => { setTab('tutor'); window.scrollTo({top:0}); }}>{t("Review saved conversations →","查看已保存的对话 →")}</button></section>
    <section className="panel"><h2>Favorite words & phrases <span className="muted font-normal">({favorites.length})</span></h2>{favorites.length ? favorites.map((card, i) => renderCard(card, `favorite-${i}`)) : <p className="muted text-sm">Tap ☆ Save on a card to keep it here.</p>}</section>
    <section className="panel"><div className="flex items-center justify-between"><h2 className="!mb-0">{t("Learning history","学习历史")}</h2>{history.length > 0 && <button className="secondary" onClick={() => { try { localStorage.setItem(HISTORY_KEY, '[]'); setHistory([]); } catch { setStorageNote('Could not clear browser history.'); } }}>{t("Clear","清空")}</button>}</div>{history.length ? <ul className="mt-3 space-y-2">{history.map((data, i) => <li key={i}><button disabled={busy} className="w-full bg-slate-50 text-left" onClick={() => { setTab('generator'); setInputLanguage(/[\u3400-\u9fff]/.test(data.originalText) ? 'zh' : 'en'); setText(data.originalText); setResult({ data, source: 'history', notice: 'Restored from your saved learning history.' }); setError(''); }}>{data.originalText}<span className="muted ml-2 text-sm" lang="zh-Hans">{data.sentence.translation}</span></button></li>)}</ul> : <p className="muted mt-3 text-sm">Your last 20 learning cards will appear here.</p>}</section>
    <section className="panel"><h2>Saved lessons ({lessons.length})</h2>{lessons.length ? lessons.map((lesson, i) => <details key={i} className="saved-lesson"><summary>{lesson.title} · {lesson.sentences.length} sentences</summary><div className="mt-4"><LessonView lesson={lesson} favorites={favorites} onSave={save} onSpeak={speak}/></div></details>) : <p className="muted text-sm">Choose Save Lesson in the tutor to review a lesson here.</p>}</section>
    </div>
    <footer>No account required · Audio uses your device’s voices<p className="mt-2">Favorites, saved lessons, and chat history stay in this browser. Generation requests and recent conversation context are sent to the configured AI provider.</p></footer>
  </main>;
}
