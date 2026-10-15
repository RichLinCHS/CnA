'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '../lib/supabase';
import LoginForm from './LoginForm';
import { InstructionProvider, InstructionToggle, useInstructions } from './Instructions';
function Screen(){
 const {t}=useInstructions();const [recovery,setRecovery]=useState(false);
 useEffect(()=>{setRecovery(new URLSearchParams(window.location.search).get('recovery')==='1');const client=getSupabase();if(!client)return;const {data}=client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')setRecovery(true);});return()=>data.subscription.unsubscribe();},[]);
 return <main className="login-page"><Link className="logo" href="/">SoundBridge</Link><InstructionToggle/><section className="panel"><LoginForm recovery={recovery} onDone={()=>window.location.assign('/')}/></section><Link className="guest-link" href="/">{t('← Back to SoundBridge','← 返回 SoundBridge')}</Link></main>;
}
export default function LoginScreen(){return <InstructionProvider><Screen/></InstructionProvider>;}
