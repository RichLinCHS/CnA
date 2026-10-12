'use client';
import { useEffect, useRef, useState } from 'react';
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start(): void; stop(): void; abort(): void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export default function Dictation({ language, disabled, onText, maxLength }: { language: string; disabled: boolean; onText: (text: string) => void; maxLength: number }) {
  const [supported, setSupported] = useState(false); const [listening, setListening] = useState(false); const [note, setNote] = useState('');
  const active = useRef<Recognition | null>(null);
  useEffect(() => { const w = window as SpeechWindow; setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)); }, []);
  useEffect(() => () => { const r = active.current; active.current = null; if (r) { r.onend = null; r.onresult = null; r.onerror = null; r.abort(); } }, []);
  useEffect(() => { const r = active.current; active.current = null; if (r) { r.onend = null; r.onresult = null; r.onerror = null; r.abort(); } setListening(false); }, [language, disabled]);
  function start() {
    if (active.current) { active.current.stop(); return; }
    const w = window as SpeechWindow; const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition; if (!Constructor) return;
    const r = new Constructor(); active.current = r; r.lang = language; r.continuous = false; r.interimResults = false; setNote('');
    r.onresult = event => { if (active.current !== r) return; const text = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' '); if (text) { onText(text.slice(0, maxLength)); setNote(text.length > maxLength ? `Kept the first ${maxLength} characters. Review before sending.` : 'Review the transcript before sending.'); } };
    r.onerror = event => { setNote(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone access was denied. Allow it in browser settings or type instead.' : event.error === 'no-speech' ? 'No speech detected. Try again or type instead.' : 'Speech recognition could not finish. Check your microphone and connection, or type instead.'); setListening(false); active.current = null; };
    r.onend = () => { if (active.current === r) active.current = null; setListening(false); };
    try { r.start(); setListening(true); } catch { active.current = null; setListening(false); setNote('Could not start the microphone. Try again or type instead.'); }
  }
  return <div className="mt-3"><button type="button" className="secondary" disabled={disabled || !supported} onClick={start}>{listening ? '■ Stop listening' : '🎤 Speak to type'}</button><p className="hint" role="status">{listening ? 'Listening…' : note || (supported ? 'Microphone input replaces this draft. Your browser’s speech service may process audio. Nothing is sent to the tutor until you submit.' : 'Speech recognition is unavailable in this browser. You can still type or use your keyboard’s dictation.')}</p></div>;
}
