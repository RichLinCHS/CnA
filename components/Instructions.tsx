'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
type Language = 'en' | 'zh';
const Context = createContext({ language: 'en' as Language, setLanguage: (_: Language) => {}, t: (en: string, zh: string) => en });
export function InstructionProvider({children}: {children: ReactNode}) {
 const [language,setValue]=useState<Language>('en');
 useEffect(()=>{try {if(localStorage.getItem('soundbridge:instructions')==='zh') setValue('zh');}catch{}},[]);
 const setLanguage=(next: Language)=>{setValue(next);try{localStorage.setItem('soundbridge:instructions',next);}catch{}};
 return <Context.Provider value={{language,setLanguage,t:(en,zh)=>language==='zh'?zh:en}}>{children}</Context.Provider>;
}
export const useInstructions=()=>useContext(Context);
export function InstructionToggle(){const {language,setLanguage}=useInstructions();return <div className="mt-4"><label htmlFor="instructions">Instructions / 界面说明</label><select id="instructions" value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="en">English</option><option value="zh">中文</option></select></div>;}
