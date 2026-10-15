import { useInstructions } from './Instructions';
import type { Speak } from '../lib/audio';
import type { Card } from '../lib/schema';
import type { Lesson } from '../lib/chat-schema';
import LearningCard from './LearningCard';
export type CardActions = { favorites: Card[]; onSave: (card: Card) => void; onSpeak: Speak };
export default function LessonView({ lesson, favorites, onSave, onSpeak }: CardActions & { lesson: Lesson }) {
  const { t, language } = useInstructions();
  const card = (value: Card, key: string) => <LearningCard key={key} card={value} saved={favorites.some(f => f.english.toLowerCase() === value.english.toLowerCase())} onSave={onSave} onSpeak={onSpeak}/>;
  return <div><h3 className="text-lg font-bold">{lesson.title}</h3><p className="hint">{lesson.sentences.length} practical sentences</p>{lesson.sentences.map((s, i) => card(s, `sentence-${i}`))}<h3 className="mt-6 text-lg font-bold">Complete sample dialogue{lesson.dialogues.length > 1 ? 's' : ''}</h3>{lesson.dialogues.map((dialogue, i) => <section key={i} className="mt-5"><h4 className="font-bold">{dialogue.title}</h4>{dialogue.exchanges.map((line, j) => <div key={j} className="mt-4"><p className="speaker">{line.speaker}</p>{card(line.card, `dialogue-${i}-${j}`)}</div>)}</section>)}</div>;
}
