
import React, { useState, useRef, useEffect } from 'react';
import { Message, GermanLevel } from '../types';
import WordIntelCard from './WordIntelCard';
import { gemini } from '../services/geminiService';

interface HackerTerminalProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string, image?: string, mimeType?: string) => void;
  currentLevel: number;
  germanLevel: GermanLevel;
  onPlayAudio: (base64: string) => void;
}

const HackerTerminal: React.FC<HackerTerminalProps> = ({
  messages,
  isLoading,
  onSend,
  currentLevel,
  germanLevel,
  onPlayAudio
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selection, setSelection] = useState<{ text: string, context: string, x: number, y: number } | null>(null);
  const [quickIntel, setQuickIntel] = useState<string | null>(null);
  const [isQuickIntelLoading, setIsQuickIntelLoading] = useState(false);
  const [showIntelCard, setShowIntelCard] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleMouseUp = async (e: React.MouseEvent, msgContext: string) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text && text.length > 0) {
      const rect = sel?.getRangeAt(0).getBoundingClientRect();
      if (rect) {
        setSelection({ text, context: msgContext, x: rect.left, y: rect.top + window.scrollY });
        setQuickIntel(null); setShowIntelCard(false);
        setIsQuickIntelLoading(true);
        try {
          const intel = await gemini.getQuickIntel(text);
          setQuickIntel(intel);
        } catch { setQuickIntel("分析失败"); } finally { setIsQuickIntelLoading(false); }
      }
    } else { setSelection(null); setQuickIntel(null); }
  };

  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Use audio/mp4 for Safari/iOS compatibility, fallback to audio/webm
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result?.toString();
            if (base64) {
              // Send back to App.tsx with audio mime type
              onSend("", base64, mimeType);
            }
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsListening(true);
      } catch (err) {
        console.error("麦克风启动失败:", err);
        alert("无法访问麦克风，请检查权限。");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) { onSend(input.trim()); setInput(''); }
  };

  return (
    <div className="flex flex-col flex-1 bg-black border border-green-900/50 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,65,0.05)] relative font-mono">
      {selection && !showIntelCard && (
        <button onClick={() => setShowIntelCard(true)} className="fixed z-[99] bg-green-500 text-black px-3 py-1.5 text-[10px] font-bold rounded shadow-[0_0_15px_rgba(0,255,65,0.6)] uppercase tracking-tighter flex items-center gap-2" style={{ left: Math.min(window.innerWidth - 150, selection.x), top: selection.y - 45 }}>
          {isQuickIntelLoading ? '扫描中...' : quickIntel || "[点击解析]"}
        </button>
      )}

      {showIntelCard && selection && (
        <WordIntelCard selection={selection.text} context={selection.context} level={germanLevel} position={{ x: selection.x, y: selection.y }} onClose={() => { setSelection(null); setShowIntelCard(false); }} onPlayAudio={onPlayAudio} />
      )}

      <div className="bg-green-900/10 px-4 py-2 border-b border-green-900/30 flex justify-between items-center text-[10px] text-green-700 font-bold uppercase tracking-widest">
        <span>终端核心_SEC_HUB</span>
        <span className={isListening ? 'text-red-500 animate-pulse' : ''}>{isListening ? '监听中' : '就绪'}</span>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-6 text-sm">
        <div className="text-green-800 text-xs italic text-center border-b border-green-900/10 pb-4">[ 系统核心已就绪，等待注入... ]</div>
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`text-[10px] uppercase mb-1 ${m.role === 'user' ? 'text-green-600' : 'text-blue-500'}`}>{m.role === 'user' ? 'USER_NODE' : 'AI_CORE'}</div>
              <div className={`p-3 rounded border ${m.role === 'user' ? 'bg-green-950/20 border-green-900/50 text-green-100' : 'bg-blue-950/20 border-blue-900/50 text-blue-100'}`}>
                {m.image && (
                  <div className="mb-3 border border-green-500/30 rounded overflow-hidden relative group bg-black min-h-[100px] flex items-center justify-center">
                    {m.imageMimeType === 'application/pdf' ? (
                      <div className="flex flex-col items-center gap-2 p-6 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        <span className="text-[10px] font-bold">PDF_INTEL_INJECTED</span>
                      </div>
                    ) : (
                      <>
                        <img src={m.image} alt="Injected Intel" className="w-full max-h-60 object-contain block" />
                        <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay group-hover:bg-transparent transition-all pointer-events-none"></div>
                      </>
                    )}
                    <div className="absolute top-0 left-0 bg-green-500 text-black text-[8px] px-1 font-bold">DATA_CAPTURE</div>
                  </div>
                )}
                <div onMouseUp={(e) => handleMouseUp(e, m.text)} className="font-semibold leading-relaxed whitespace-pre-wrap">{m.text}</div>
                {m.translation && <div className="mt-2 pt-2 border-t border-blue-900/20 text-blue-300/70 text-xs italic">{m.translation}</div>}
              </div>
              {m.geheimzauber && <div onMouseUp={(e) => handleMouseUp(e, m.geheimzauber!)} className="mt-2 p-2 bg-yellow-950/20 border border-yellow-900/50 rounded text-xs text-yellow-400 text-left"><span className="font-bold">✨ SPELL:</span> {m.geheimzauber}</div>}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-blue-500 text-xs animate-pulse font-mono">[ 数据包解析中... 正在访问神经网络 ]</div>}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-green-900/30 bg-green-950/10 flex items-center gap-3">
        <button type="button" onClick={toggleListening} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${isListening ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-green-900/20 border-green-900 text-green-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
        </button>
        <div className="flex-1 flex gap-2 items-center bg-black/40 px-3 py-1 rounded border border-green-900/30">
          <span className="text-green-900 font-bold">&gt;</span>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} placeholder={isListening ? "捕获中..." : "输入德语指令..."} className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-green-900 text-sm py-2" />
        </div>
        <button type="submit" disabled={isLoading || !input.trim()} className="bg-green-900/50 hover:bg-green-500 hover:text-black transition-all px-4 py-2 rounded text-xs font-bold uppercase disabled:opacity-50">发送</button>
      </form>
    </div>
  );
};

export default HackerTerminal;
