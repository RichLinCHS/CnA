'use client';
import { useEffect, useRef, useState } from 'react';
import { type Card, type Result, type Learning, validateLearning } from '../lib/schema';
import { fallback, vocabulary } from '../lib/vocabulary';
import { readFavorites, readHistory, saveHistory, toggleFavorite, HISTORY_KEY } from '../lib/storage';
import LearningCard from './LearningCard';
import Tutor from './Tutor';
import LessonView from './LessonView';
import { readLessons, saveLesson } from '../lib/chat-storage';
import type { Lesson } from '../lib/chat-schema';

export default function SoundBridge() {
  const [tab, setTab] = useState('generator');
  const [lessons, setLessons] = useState<Lesson[]>([]);
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
  function speak(value: string, playbackRate = rate) {
    if (!value.trim()) return;
    if (!('speechSynthesis' in window)) { setAudioNote('This browser does not support speech audio. Try Safari, Chrome, or Edge on a device with English voices.'); return; }
    const available = speechSynthesis.getVoices(); if (available.length) voices.current = available;
    const american = voices.current.find(v => /^en[-_]US$/i.test(v.lang));
    const english = american ?? voices.current.find(v => /^en([-_]|$)/i.test(v.lang));
    if (!english) { setAudioNote('No English voice is available yet. Enable or download an English voice in your device’s speech settings, then try again.'); return; }
    speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(value);
    speech.voice = english; speech.lang = 'en-US'; speech.rate = playbackRate; utterance.current = speech;
    setAudioNote(american ? '' : 'Using an available English voice; its accent may differ from American English.');
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
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Generation failed. Please try again.');
      const data = validateLearning(body.data, value);
      setResult({ data, source: ['ai', 'cache', 'fallback'].includes(body.source) ? body.source : 'ai', notice: typeof body.notice === 'string' ? body.notice : undefined }); remember(data);
    } catch (err) {
      const local = fallback(value);
      if (local) { setResult({ data: local, source: 'fallback', notice: 'AI is unavailable. Showing the original example vocabulary.' }); remember(local); }
      else setError(err instanceof Error && err.name !== 'AbortError' ? err.message : 'Generation timed out. Please try again.');
    } finally { clearTimeout(timer); setBusy(false); active.current = null; }
  }
  function example(value: string) { const data = fallback(value)!; setText(value); setError(''); setResult({ data, source: 'fallback', notice: 'Original example vocabulary. Generate for an AI learning card.' }); remember(data); }
  const renderCard = (card: Card, key: string) => <LearningCard key={key} card={card} saved={favorites.some(f => f.english.toLowerCase() === card.english.toLowerCase())} onSave={save} onSpeak={speak} />;
  return <main className="wrap">
    <header><div className="logo"><span>文 A</span> SoundBridge</div><h1>English that sounds familiar.</h1><p>Learn English using Chinese sound-alikes, meanings, and real pronunciation.</p></header>
    <nav className="main-tabs" aria-label="Main navigation">{[['generator','Pronunciation Generator'],['tutor','AI Tutor'],['vocabulary','My Vocabulary']].map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'primary' : 'secondary'} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <div className="audio-toolbar">      <div className="mt-5 flex flex-wrap items-center gap-3"><label htmlFor="speed" className="!mb-0 text-sm">Audio speed</label><select id="speed" value={rate} onChange={e => setRate(Number(e.target.value))}><option value={0.7}>Slow · 0.7×</option><option value={1}>Normal · 1.0×</option><option value={1.2}>Fast · 1.2×</option></select></div>
      {audioNote && <p role="status" className="notice">{audioNote}</p>}</div>
    <div hidden={tab !== 'tutor'}><Tutor favorites={favorites} onSave={save} onSpeak={speak} onSaveLesson={keepLesson} lessons={lessons}/></div>
    <div hidden={tab !== 'generator'}>
    <section className="panel"><form onSubmit={generate}><label htmlFor="phrase">Enter an English word or sentence</label><textarea id="phrase" value={text} maxLength={300} onChange={e => setText(e.target.value)} disabled={busy} placeholder="Try: beautiful, apple, How are you today?" aria-describedby="input-hint"/><p id="input-hint" className="text-right text-xs text-slate-500">{text.length} / 300</p><div className="actions"><button className="primary" type="submit" disabled={busy}>{busy ? <><span className="spinner" aria-hidden="true"/>Generating…</> : 'Generate pronunciation →'}</button><button type="button" className="secondary" onClick={() => speak(text)}>🔊 Listen</button></div></form>
<p className="hint">Try an example</p><div className="examples mt-2">{['Apple','Beautiful','Thank you','Good morning','How are you','Water'].map(word => <button key={word} disabled={busy} onClick={() => example(word)}>{word}</button>)}</div><details className="hint"><summary className="cursor-pointer">All original vocabulary</summary><div className="examples mt-2">{Object.keys(vocabulary).map(word => <button key={word} disabled={busy} onClick={() => example(word)}>{word}</button>)}</div></details>
      {error && <p className="notice error" role="alert">{error} Your previous learning card is still below.</p>}
    </section>
    <section className="panel" aria-busy={busy}><div className="flex items-center justify-between gap-2"><h2 className="!mb-0">Your learning card</h2><span className="badge">{result.source === 'fallback' ? 'Example vocabulary' : result.source === 'cache' ? 'Cached AI' : result.source === 'history' ? 'Saved history' : 'AI generated'}</span></div><div aria-live="polite">{result.notice && <p className="notice">{result.notice}</p>}<p className="hint">{result.data.words.length > 1 ? 'Full sentence / phrase' : 'Word pronunciation'}</p>{renderCard(result.data.sentence, 'sentence')}</div><p className="hint">Chinese sound-alikes are approximate memory aids. Listen to the English audio to learn the actual pronunciation. AI can make mistakes; pronunciation and translation depend on context.</p></section>
    </div>
    {storageNote && <p role="status" className="notice">{storageNote}</p>}
    <div hidden={tab !== 'vocabulary'}>
    <section className="panel"><h2>Conversations & learning goals</h2><p className="muted text-sm">Reopen a saved chat or update what the tutor remembers about your learning goals.</p><button className="secondary mt-4" onClick={() => { setTab('tutor'); window.scrollTo({top:0}); }}>Review saved conversations →</button></section>
    <section className="panel"><h2>Favorite words & phrases <span className="muted font-normal">({favorites.length})</span></h2>{favorites.length ? favorites.map((card, i) => renderCard(card, `favorite-${i}`)) : <p className="muted text-sm">Tap ☆ Save on a card to keep it here.</p>}</section>
    <section className="panel"><div className="flex items-center justify-between"><h2 className="!mb-0">Learning history</h2>{history.length > 0 && <button className="secondary" onClick={() => { try { localStorage.setItem(HISTORY_KEY, '[]'); setHistory([]); } catch { setStorageNote('Could not clear browser history.'); } }}>Clear</button>}</div>{history.length ? <ul className="mt-3 space-y-2">{history.map((data, i) => <li key={i}><button disabled={busy} className="w-full bg-slate-50 text-left" onClick={() => { setTab('generator'); setText(data.originalText); setResult({ data, source: 'history', notice: 'Restored from your saved learning history.' }); setError(''); }}>{data.originalText}<span className="muted ml-2 text-sm" lang="zh-Hans">{data.sentence.translation}</span></button></li>)}</ul> : <p className="muted mt-3 text-sm">Your last 20 learning cards will appear here.</p>}</section>
    <section className="panel"><h2>Saved lessons ({lessons.length})</h2>{lessons.length ? lessons.map((lesson, i) => <details key={i} className="saved-lesson"><summary>{lesson.title} · {lesson.sentences.length} sentences</summary><div className="mt-4"><LessonView lesson={lesson} favorites={favorites} onSave={save} onSpeak={speak}/></div></details>) : <p className="muted text-sm">Choose Save Lesson in the tutor to review a lesson here.</p>}</section>
    </div>
    <footer>No account required · Audio uses your device’s voices<p className="mt-2">Favorites, saved lessons, and chat history stay in this browser. Generation requests and recent conversation context are sent to the configured AI provider.</p></footer>
  </main>;
}
