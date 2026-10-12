'use client';
import { useInstructions } from './Instructions';
import { useEffect, useRef, useState } from 'react';
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start(): void; stop(): void; abort(): void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export default function Dictation({ language, disabled, onText, maxLength }: { language: string; disabled: boolean; onText: (text: string) => void; maxLength: number }) {
  const { t } = useInstructions();
  const [supported, setSupported] = useState(false); const [listening, setListening] = useState(false); const [note, setNote] = useState('');
  const active = useRef<Recognition | null>(null);
  useEffect(() => { const w = window as SpeechWindow; setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)); }, []);
  useEffect(() => () => { const r = active.current; active.current = null; if (r) { r.onend = null; r.onresult = null; r.onerror = null; r.abort(); } }, []);
  useEffect(() => { const r = active.current; active.current = null; if (r) { r.onend = null; r.onresult = null; r.onerror = null; r.abort(); } setListening(false); }, [language, disabled]);
  function start() {
    if (active.current) { active.current.stop(); return; }
    const w = window as SpeechWindow; const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition; if (!Constructor) return;
    const r = new Constructor(); active.current = r; r.lang = language; r.continuous = false; r.interimResults = false; setNote('');
    r.onresult = event => { if (active.current !== r) return; const text = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' '); if (text) { onText(text.slice(0, maxLength)); setNote(text.length > maxLength ? `Kept the first ${maxLength} characters. Review before sending.` : t("Review the transcript before sending.","发送前请检查识别文字。")); } };
    r.onerror = event => { setNote(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone access was denied. Allow it in browser settings or type instead.' : event.error === 'no-speech' ? 'No speech detected. Try again or type instead.' : 'Speech recognition could not finish. Check your microphone and connection, or type instead.'); setListening(false); active.current = null; };
    r.onend = () => { if (active.current === r) active.current = null; setListening(false); };
    try { r.start(); setListening(true); } catch { active.current = null; setListening(false); setNote('Could not start the microphone. Try again or type instead.'); }
  }
  return <div className="mt-3"><button type="button" className="secondary" disabled={disabled || !supported} onClick={start}>{listening ? t("■ Stop listening","■ 停止听写") : t("🎤 Speak to type","🎤 语音输入")}</button><p className="hint" role="status">{listening ? t("Listening…","正在听…") : note || (supported ? t("Microphone input replaces this draft. Your browser’s speech service may process audio. Nothing is sent to the tutor until you submit.","语音输入会替换当前草稿。浏览器语音服务可能会处理录音，点击发送前不会提交给老师。") : t("Speech recognition is unavailable in this browser. You can still type or use your keyboard’s dictation.","此浏览器不支持语音识别。您可以打字或使用键盘的语音输入。"))}</p></div>;
}
