'use client';
import { useEffect, useRef, useState } from 'react';
import { categories, scenarioPrompt, topics, type Category } from '../lib/topics';
import { defaultSettings, validateChat, type ChatRequest, type Lesson, type Settings } from '../lib/chat-schema';
import { appendTurn, contextMessages, readSession, saveSession, type Turn } from '../lib/chat-storage';
import LearningCard from './LearningCard';
import LessonView, { type CardActions } from './LessonView';

export default function Tutor({ favorites, onSave, onSpeak, onSaveLesson, lessons }: CardActions & { onSaveLesson: (lesson: Lesson) => void; lessons: Lesson[] }) {
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings });
  const [turns, setTurns] = useState<Turn[]>([]); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false); const [pending, setPending] = useState(''); const [error, setError] = useState(''); const [storageNote, setStorageNote] = useState('');
  const active = useRef<AbortController | null>(null); const latest = useRef<HTMLDivElement>(null); const ready = useRef(false);
  useEffect(() => { try { const saved = readSession(localStorage); setSettings(saved.settings); setTurns(saved.turns); } catch { setStorageNote('Chat storage is unavailable in this browser.'); } ready.current = true; return () => active.current?.abort(); }, []);
  function persist(nextSettings: Settings, nextTurns: Turn[]) { if (!ready.current) return; try { saveSession(localStorage, nextSettings, nextTurns); } catch { setStorageNote('Chat could not be saved. Browser storage may be full or blocked.'); } }
  function update(next: Settings) { setSettings(next); persist(next, turns); }
  function newConversation() { if (busy) return; setTurns([]); setMessage(''); setError(''); persist(settings, []); }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; const value = message.trim();
    if (!value) { setError('Describe what you want to learn, or write your reply.'); return; }
    // A natural-language practice request can start roleplay without changing a control first.
    const actual = !turns.length && /practice.*(?:with me|english)|pretend|role.?play|角色扮演|和我练习/i.test(value) ? { ...settings, mode: 'practice' as const } : settings;
    const request: ChatRequest = { ...actual, message: value, history: contextMessages(turns) };
    setSettings(actual); setBusy(true); setPending(value); setError('');
    const controller = new AbortController(); active.current = controller; const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Tutor unavailable. Please try again.');
      const data = validateChat(body.data, request); const next = appendTurn(turns, value, data);
      setTurns(next); setMessage(''); persist(actual, next);
      requestAnimationFrame(() => latest.current?.scrollIntoView({ behavior: 'auto', block: 'start' }));
    } catch (error) { setError(error instanceof Error && error.name === 'AbortError' ? 'The tutor timed out. Your message is kept so you can retry.' : error instanceof Error ? error.message : 'Tutor unavailable. Please try again.'); }
    finally { clearTimeout(timer); setBusy(false); setPending(''); active.current = null; }
  }
  const actions = { favorites, onSave, onSpeak };
  const renderCard = (card: Parameters<typeof onSave>[0]) => <LearningCard card={card} saved={favorites.some(f => f.english.toLowerCase() === card.english.toLowerCase())} onSave={onSave} onSpeak={onSpeak}/>;
  const locked = busy || turns.length > 0;
  return <div>
    <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="!mb-1">Your everyday English tutor</h2><p className="muted text-sm">实用英语，一起开口练习。</p></div><button className="secondary" disabled={busy} onClick={newConversation}>New conversation</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label htmlFor="tutor-mode">Learning mode</label><select id="tutor-mode" className="w-full" value={settings.mode} disabled={locked} onChange={e => update({ ...settings, mode: e.target.value as Settings['mode'] })}><option value="learn">Create a lesson</option><option value="practice">Practice Conversation</option></select></div><div><label htmlFor="difficulty">Difficulty</label><select id="difficulty" className="w-full" disabled={locked} value={settings.difficulty} onChange={e => update({ ...settings, difficulty: e.target.value as Settings['difficulty'] })}>{['Beginner', 'Intermediate', 'Advanced'].map(level => <option key={level}>{level}</option>)}</select></div></div>
      {turns.length > 0 ? <p className="notice">{settings.category} · {settings.scenario} · {settings.difficulty}<br/>Start a new conversation to change the scenario or mode.</p> : <><h3 className="mt-5 mb-3 font-bold">Choose a topic</h3><div className="topic-grid">{categories.map(category => <button key={category} className={settings.category === category ? 'primary' : 'secondary'} aria-pressed={settings.category === category} disabled={busy} onClick={() => { update({ ...settings, category, scenario: topics[category][0] }); setMessage(''); }}>{category}</button>)}</div><label className="mt-5" htmlFor="scenario">Common scenario</label>{settings.category === 'Custom Topic' ? <input id="scenario" maxLength={200} disabled={busy} value={settings.scenario} onChange={e => update({ ...settings, scenario: e.target.value })} placeholder="Describe your situation"/> : <select id="scenario" className="w-full" value={settings.scenario} disabled={busy} onChange={e => { update({ ...settings, scenario: e.target.value }); setMessage(''); }}>{topics[settings.category as Category].map(s => <option key={s}>{s}</option>)}</select>}
      {settings.mode === 'learn' && <div className="mt-4"><label htmlFor="sentence-count">Sentences per lesson (1–20)</label><select id="sentence-count" value={settings.sentenceCount} disabled={busy} onChange={e => update({ ...settings, sentenceCount: Number(e.target.value) })}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select><p className="hint">You can also request a number in your message, including up to 10 sample conversations.</p></div>}
      <div className="examples mt-4"><button disabled={busy} onClick={() => setMessage(settings.mode === 'practice' ? `Practice English with me for ${settings.category}: ${settings.scenario}. Pretend you are the person I am speaking with and begin.` : scenarioPrompt(settings.category, settings.scenario))}>{settings.mode === 'practice' ? 'Start this roleplay' : 'Teach me this scenario'}</button><button disabled={busy} onClick={() => { update({ ...settings, mode: 'learn' }); setMessage(`Generate 10 sentences for ${settings.category}: ${settings.scenario}.`); }}>10 useful sentences</button></div></>}
      <p className="hint">Mandarin sound-alikes are approximate memory aids. Use IPA and English audio to learn the actual sounds. Professional topics teach communication, not professional advice.</p>
    </section>
    <div className="chat-log" aria-label="Tutor conversation" aria-busy={busy}>
      {!turns.length && !busy && <div className="tutor-bubble"><strong>Hi, let’s practice real life.</strong><p lang="zh-Hans" className="mt-2">选择场景，或用中文、英文告诉我你想学什么。练习模式中，我会扮演对话伙伴并解释你的英语表达。</p></div>}
      {turns.map((turn, i) => <div key={i} ref={i === turns.length - 1 ? latest : undefined}><div className="student-bubble"><span className="speaker">You</span><p>{turn.user}</p></div><div className="tutor-bubble"><p className="speaker">SoundBridge Tutor</p><p lang="zh-Hans" className="my-3">{turn.response.explanationChinese}</p>{turn.response.lesson && <><LessonView lesson={turn.response.lesson} {...actions}/><button className="primary mt-4" disabled={lessons.some(l => JSON.stringify(l) === JSON.stringify(turn.response.lesson))} onClick={() => onSaveLesson(turn.response.lesson!)}>{lessons.some(l => JSON.stringify(l) === JSON.stringify(turn.response.lesson)) ? 'Lesson saved' : 'Save Lesson'}</button></>}{turn.response.correction && <section className="correction"><h3 className="font-bold">Your response · a natural version</h3><p className="hint">You wrote: {turn.response.correction.original}</p><p lang="zh-Hans" className="mt-3">{turn.response.correction.explanationChinese}</p>{renderCard(turn.response.correction.improved)}</section>}{turn.response.reply && <section className="mt-5"><h3 className="font-bold">AI {turn.response.reply.speaker}</h3>{renderCard(turn.response.reply.card)}</section>}</div></div>)}
      {busy && <><div className="student-bubble"><span className="speaker">You</span><p>{pending}</p></div><div className="tutor-bubble" role="status"><span className="typing-dots" aria-hidden="true">● ● ●</span> Tutor is thinking…</div></>}
    </div>
    <section className="panel"><form onSubmit={send}><label htmlFor="tutor-message">{settings.mode === 'practice' && turns.length ? 'Your reply in English' : 'What would you like to learn?'}</label><textarea id="tutor-message" maxLength={1000} value={message} disabled={busy} onChange={e => setMessage(e.target.value)} placeholder={settings.mode === 'practice' && turns.length ? 'Yes, we have time. What kind of manicure would you like?' : 'Teach me common English conversations for a nail technician.'}/><div className="flex flex-wrap items-center justify-between gap-3 mt-3"><span className="hint !mt-0">{message.length}/1000 · English or 中文</span><button className="primary" disabled={busy || !settings.scenario.trim()}>{busy ? 'Thinking…' : settings.mode === 'practice' && !turns.length ? 'Begin practice →' : 'Send →'}</button></div></form>{error && <p className="notice error" role="alert">{error}</p>}{storageNote && <p className="notice" role="status">{storageNote}</p>}<p className="hint">The latest 12 turns stay in this browser. The tutor receives up to 6 recent turns and your selected scenario. New conversation clears this chat; saved lessons and favorites remain.</p></section>
  </div>;
}
