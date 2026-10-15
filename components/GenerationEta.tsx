'use client';
import {useEffect,useState} from 'react';
import {useInstructions} from './Instructions';
export default function GenerationEta(){
 const {t}=useInstructions();const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const started=Date.now();const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer);},[]);
 return <div className="notice"><p role="status">{elapsed<30?t('AI is working. Estimated wait: about 30 seconds.','AI 正在处理，预计等待约 30 秒。'):t('Taking longer than estimated. Still waiting for the AI…','比预计时间更久，仍在等待 AI 回复…')}</p><p aria-live="off">{elapsed<30?t(`About ${30-elapsed}s remaining · ${elapsed}s elapsed`,`预计还需 ${30-elapsed} 秒 · 已等待 ${elapsed} 秒`):t(`${elapsed}s elapsed`, `已等待 ${elapsed} 秒`)}</p><p className="hint">{t('Estimate only; longer lessons and provider traffic can take more time.','仅为估计；较长课程或服务繁忙时可能需要更久。')}</p></div>;
}
