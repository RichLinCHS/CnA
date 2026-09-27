import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SoundBridge — English through Chinese', description: 'Learn English with Chinese sound-alikes, meanings, IPA and device audio.' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
