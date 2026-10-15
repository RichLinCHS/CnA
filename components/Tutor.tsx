'use client';
import GenerationEta from './GenerationEta';
import { useInstructions } from './Instructions';
import { useEffect, useRef, useState } from 'react';
import { categories, scenarioPrompt, topics, type Category } from '../lib/topics';
import { defaultSettings, validateChat, type ChatRequest, type Lesson, type Settings } from '../lib/chat-schema';
import { contextMessages } from '../lib/chat-storage';
import { readLibrary, writeLibrary, learningMemory, newConversation as createConversation, type Library } from '../lib/conversations';
import ConversationLibrary from './ConversationLibrary';
import Dictation from './Dictation';
import LearningCard from './LearningCard';
import LessonView, { type CardActions } from './LessonView';

export default function Tutor({ favorites, onSave, onSpeak, onSaveLesson, lessons }: CardActions & { onSaveLesson: (lesson: Lesson) => void; lessons: Lesson[] }) {
  const { t, language } = useInstructions();
  const [dictationLanguage, setDictationLanguage] = useState('en-US');
  const [library, setLibrary] = useState<Library | null>(null);
  const libraryRef = useRef<Library | null>(null);
  const [sending, setSending] = useState(false); const [pending, setPending] = useState(''); const [error, setError] = useState(''); const [storageNote, setStorageNote] = useState(''); const [visibleTurns, setVisibleTurns] = useState(12);
  const active = useRef<AbortController | null>(null); const latest = useRef<HTMLDivElement>(null);
  const current = library?.conversations.find(c => c.id === library.activeId);
  const settings = current?.settings ?? defaultSettings; const turns = current?.turns ?? []; const message = current?.draft ?? '';
  const busy = sending || !library;
  function commit(next: Library) {
    try { const saved = writeLibrary(localStorage, next); libraryRef.current = saved; setLibrary(saved); setStorageNote('Saved in this browser.'); return true; }
    catch (error) { libraryRef.current = next; setLibrary(next); setStorageNote('Not saved: ' + (error instanceof Error ? error.message : 'Browser storage may be full or blocked.')); return false; }
  }
  useEffect(() => { try { const saved = readLibrary(localStorage); libraryRef.current = saved; setLibrary(saved); } catch { setStorageNote('Saved conversations could not be loaded. Existing browser data has not been changed. Check browser storage or restore a backup before continuing.'); } return () => active.current?.abort(); }, []);
  function patchCurrent(patch: Partial<NonNullable<typeof current>>) {
    const value = libraryRef.current; if (!value) return false;
    return commit({...value, conversations:value.conversations.map(c => c.id===value.activeId ? {...c,...patch,updatedAt:new Date().toISOString()} : c)});
  }
  function setMessage(draft: string) { patchCurrent({draft, ...(!turns.length && draft.trim() ? {title:draft.trim().slice(0,120)} : {})}); }
  function update(next: Settings) { patchCurrent({settings:next}); }
  function newConversation() {
    if (busy || !libraryRef.current) return;
    const next = createConversation(settings); const value=libraryRef.current;
    // Empty setup screens are not conversations; never discard a draft or completed turn.
    const conversations=value.conversations.filter(c => c.turns.length || c.draft.trim());
    commit({...value,activeId:next.id,conversations:[...conversations,next]}); setError(''); setVisibleTurns(12);
  }
  function openConversation(id: string) { if(busy || !libraryRef.current) return; commit({...libraryRef.current,activeId:id}); setError(''); setVisibleTurns(12); }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; const value = message.trim();
    if (!value) { setError('Describe what you want to learn, or write your reply.'); return; }
    // A natural-language practice request can start roleplay without changing a control first.
    const actual = !turns.length && /practice.*(?:with me|english)|pretend|role.?play|角色扮演|和我练习/i.test(value) ? { ...settings, mode: 'practice' as const } : settings;
    const request: ChatRequest = { ...actual, instructionLanguage: language, message: value, history: contextMessages(turns), conversationGoal: turns[0]?.user ?? value, ...(library?.memoryEnabled ? { learner: library.profile, learningMemory: learningMemory(library) } : {}) };
    if (!patchCurrent({settings:actual, title:turns.length ? current!.title : value.slice(0,120)})) { setError('Please resolve the saving error or export your conversations before sending.'); return; }
    setSending(true); setPending(value); setError('');
    const controller = new AbortController(); active.current = controller; const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Tutor unavailable. Please try again.');
      const data = validateChat(body.data, request); const next = [...turns, {user:value,response:data}];
      patchCurrent({settings:actual,turns:next,draft:''});
      requestAnimationFrame(() => latest.current?.scrollIntoView({ behavior: 'auto', block: 'start' }));
    } catch (error) { setError(error instanceof Error && error.name === 'AbortError' ? 'The tutor timed out. Your message is kept so you can retry.' : error instanceof Error ? error.message : 'Tutor unavailable. Please try again.'); }
    finally { clearTimeout(timer); setSending(false); setPending(''); active.current = null; }
  }
  const actions = { favorites, onSave, onSpeak };
  const renderCard = (card: Parameters<typeof onSave>[0]) => <LearningCard card={card} saved={favorites.some(f => f.english.toLowerCase() === card.english.toLowerCase())} onSave={onSave} onSpeak={onSpeak}/>;
  const locked = busy || turns.length > 0;
  return <div>
    {storageNote && <p role="status" className="notice">{storageNote}</p>}
    {library && <ConversationLibrary library={library} disabled={busy} onChange={commit} onOpen={openConversation}/>}
    <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="!mb-1">{t("Your everyday English tutor","日常英语老师")}</h2><p className="muted text-sm">{t("Practical English. Let’s practice together.","实用英语，一起开口练习。")}</p></div><button className="secondary" disabled={busy} onClick={newConversation}>{t("New conversation","新建对话")}</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label htmlFor="tutor-mode">{t("Learning mode","学习模式")}</label><select id="tutor-mode" className="w-full" value={settings.mode} disabled={locked} onChange={e => update({ ...settings, mode: e.target.value as Settings['mode'] })}><option value="learn">{t("Create a lesson","生成课程")}</option><option value="practice">{t("Practice Conversation","练习对话")}</option></select></div><div><label htmlFor="difficulty">{t("Difficulty","难度")}</label><select id="difficulty" className="w-full" disabled={locked} value={settings.difficulty} onChange={e => update({ ...settings, difficulty: e.target.value as Settings['difficulty'] })}>{['Beginner', 'Intermediate', 'Advanced'].map(level => <option key={level}>{level}</option>)}</select></div></div>
      {turns.length > 0 ? <p className="notice">{settings.category} · {settings.scenario} · {settings.difficulty}<br/>Start a new conversation to change the scenario or mode.</p> : <><h3 className="mt-5 mb-3 font-bold">{t("Choose a topic","选择主题")}</h3><div className="topic-grid">{categories.map(category => <button key={category} className={settings.category === category ? 'primary' : 'secondary'} aria-pressed={settings.category === category} disabled={busy} onClick={() => { update({ ...settings, category, scenario: topics[category][0] }); setMessage(''); }}>{category}</button>)}</div><label className="mt-5" htmlFor="scenario">{t("Common scenario","常见场景")}</label>{settings.category === 'Custom Topic' ? <input id="scenario" maxLength={200} disabled={busy} value={settings.scenario} onChange={e => update({ ...settings, scenario: e.target.value })} placeholder="Describe your situation"/> : <select id="scenario" className="w-full" value={settings.scenario} disabled={busy} onChange={e => { update({ ...settings, scenario: e.target.value }); setMessage(''); }}>{topics[settings.category as Category].map(s => <option key={s}>{s}</option>)}</select>}
      {settings.mode === 'learn' && <div className="mt-4"><label htmlFor="sentence-count">{t("Sentences per lesson (1–20)","每课句数（1–20）")}</label><select id="sentence-count" value={settings.sentenceCount} disabled={busy} onChange={e => update({ ...settings, sentenceCount: Number(e.target.value) })}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select><p className="hint">{t("You can also request a number in your message, including up to 10 sample conversations.","你也可以在消息中指定数量，最多生成 10 段示例对话。")}</p></div>}
      <div className="examples mt-4"><button disabled={busy} onClick={() => setMessage(settings.mode === 'practice' ? `Practice English with me for ${settings.category}: ${settings.scenario}. Pretend you are the person I am speaking with and begin.` : scenarioPrompt(settings.category, settings.scenario))}>{settings.mode === 'practice' ? t("Start this roleplay","开始角色扮演") : t("Teach me this scenario","学习这个场景")}</button><button disabled={busy} onClick={() => { update({ ...settings, mode: 'learn' }); setMessage(`Generate 10 sentences for ${settings.category}: ${settings.scenario}.`); }}>10 useful sentences</button></div></>}
      <p className="hint">{t("Mandarin sound-alikes are approximate memory aids. Use IPA and English audio to learn the actual sounds. Professional topics teach communication, not professional advice.","中文谐音只是辅助记忆。请结合音标和英语原声学习。专业场景只教授沟通用语，不提供专业建议。")}</p>
    </section>
    <div className="chat-log" aria-label="Tutor conversation" aria-busy={busy}>
      {!turns.length && !busy && <div className="tutor-bubble"><strong>Hi, let’s practice real life.</strong><p lang="zh-Hans" className="mt-2">选择场景，或用中文、英文告诉我你想学什么。练习模式中，我会扮演对话伙伴并解释你的英语表达。</p></div>}
      {turns.length > visibleTurns && <button className="secondary mb-4" onClick={() => setVisibleTurns(n => n + 12)}>Show older messages ({turns.length - visibleTurns})</button>}
      {turns.slice(-visibleTurns).map((turn, i, shown) => <div key={i} ref={i === shown.length - 1 ? latest : undefined}><div className="student-bubble"><span className="speaker">You</span><p>{turn.user}</p></div><div className="tutor-bubble"><p className="speaker">SoundBridge Tutor</p><p lang="zh-Hans" className="my-3">{turn.response.explanationChinese}</p>{turn.response.lesson && <><LessonView lesson={turn.response.lesson} {...actions}/><button className="primary mt-4" disabled={lessons.some(l => JSON.stringify(l) === JSON.stringify(turn.response.lesson))} onClick={() => onSaveLesson(turn.response.lesson!)}>{lessons.some(l => JSON.stringify(l) === JSON.stringify(turn.response.lesson)) ? t("Lesson saved","课程已保存") : 'Save Lesson'}</button></>}{turn.response.correction && <section className="correction"><h3 className="font-bold">Your response · a natural version</h3><p className="hint">You wrote: {turn.response.correction.original}</p><p lang="zh-Hans" className="mt-3">{turn.response.correction.explanationChinese}</p>{renderCard(turn.response.correction.improved)}</section>}{turn.response.reply && <section className="mt-5"><h3 className="font-bold">AI {turn.response.reply.speaker}</h3>{renderCard(turn.response.reply.card)}</section>}</div></div>)}
      {busy && <><div className="student-bubble"><span className="speaker">You</span><p>{pending}</p></div><div className="tutor-bubble" role="status"><span className="typing-dots" aria-hidden="true">● ● ●</span> Tutor is thinking…</div></>}
    </div>
    <section className="panel"><form onSubmit={send}><label htmlFor="dictation-language">{t("Speaking language","口述语言")}</label><select id="dictation-language" value={dictationLanguage} disabled={busy} onChange={e => setDictationLanguage(e.target.value)}><option value="en-US">English</option><option value="zh-CN">中文</option></select><Dictation language={dictationLanguage} disabled={busy} onText={setMessage} maxLength={1000}/><label htmlFor="tutor-message">{settings.mode === 'practice' && turns.length ? t("Your reply in English","用英语回答") : t("What would you like to learn?","你想学什么？")}</label><textarea id="tutor-message" maxLength={1000} value={message} disabled={busy} onChange={e => setMessage(e.target.value)} placeholder={settings.mode === 'practice' && turns.length ? 'Yes, we have time. What kind of manicure would you like?' : 'Teach me common English conversations for a nail technician.'}/><div className="flex flex-wrap items-center justify-between gap-3 mt-3"><span className="hint !mt-0">{message.length}/1000 · English or 中文</span><button className="primary" disabled={busy || !settings.scenario.trim()}>{busy ? t("Thinking…","思考中…") : settings.mode === 'practice' && !turns.length ? t("Begin practice →","开始练习 →") : t("Send →","发送 →")}</button></div></form>{sending&&<GenerationEta/>}{error && <p className="notice error" role="alert">{error}</p>}{storageNote && <p className="notice" role="status">{storageNote}</p>}<p className="hint">{t("Every turn and draft is saved in this browser until its storage is full. The tutor uses up to 6 recent turns, the original goal, and enabled learner memory. New conversation keeps previous chats in Saved conversations.","每轮对话和草稿会保存在此浏览器中，直到存储空间用完。老师使用最近 6 轮对话、最初目标和已启用的学习记忆。新建对话不会删除之前的聊天。")}</p></section>
  </div>;
}
