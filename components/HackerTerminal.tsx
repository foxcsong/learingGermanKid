
import React, { useState, useRef, useEffect } from 'react';
import { Message, GermanLevel } from '../types';
import WordIntelCard from './WordIntelCard';
import { gemini } from '../services/geminiService';

interface HackerTerminalProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string) => void;
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
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'de-DE';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const handleMouseUp = async (e: React.MouseEvent, msgContext: string) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    
    if (text && text.length > 0) {
      const range = sel?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setSelection({
          text,
          context: msgContext,
          x: rect.left,
          y: rect.top + window.scrollY
        });
        setQuickIntel(null);
        setShowIntelCard(false);
        
        // 触发快速解释获取
        setIsQuickIntelLoading(true);
        try {
          const intel = await gemini.getQuickIntel(text);
          setQuickIntel(intel);
        } catch (error) {
          setQuickIntel("分析失败");
        } finally {
          setIsQuickIntelLoading(false);
        }
      }
    } else {
      setSelection(null);
      setQuickIntel(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-black border border-green-900/50 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,65,0.05)] relative">
      {/* 悬浮探测标签 - 增强交互感 */}
      {selection && !showIntelCard && (
        <button 
          onClick={() => setShowIntelCard(true)}
          className="fixed z-[99] bg-green-500 text-black px-3 py-1.5 text-[10px] font-bold rounded shadow-[0_0_15px_rgba(0,255,65,0.6)] uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 flex items-center gap-2 overflow-hidden whitespace-nowrap"
          style={{ 
            left: Math.min(window.innerWidth - 150, selection.x), 
            top: selection.y - 45 
          }}
        >
          {isQuickIntelLoading ? (
            <span className="flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span>
              扫描中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="opacity-50">[DEUTSCH]</span>
              <span>{quickIntel || "[点击解析]"}</span>
              <span className="text-[8px] opacity-70">» 详情</span>
            </span>
          )}
        </button>
      )}

      {/* 深度详情卡片 */}
      {showIntelCard && selection && (
        <WordIntelCard 
          selection={selection.text}
          context={selection.context}
          level={germanLevel}
          position={{ x: selection.x, y: selection.y }}
          onClose={() => {
            setSelection(null);
            setShowIntelCard(false);
          }}
          onPlayAudio={onPlayAudio}
        />
      )}

      <div className="bg-green-900/10 px-4 py-2 border-b border-green-900/30 flex justify-between items-center">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-900/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-900/50"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-900'}`}></div>
          <div className="text-[10px] text-green-700 tracking-widest font-bold uppercase">
            终端_核心_V2.0 {isListening && '// 监听中'}
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-6 font-mono text-sm"
      >
        <div className="text-green-800 text-xs italic mb-4">
          [系统] 初始化等级: {germanLevel} <br/>
          [系统] 侦测系统: 已上线。选词即刻启动极速情报拦截。
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`text-[10px] uppercase mb-1 ${m.role === 'user' ? 'text-green-600' : 'text-blue-500'}`}>
                {m.role === 'user' ? '访客@小黑客' : 'AI伙伴_v2'}
              </div>
              <div 
                onMouseUp={(e) => handleMouseUp(e, m.text)}
                className={`p-3 rounded-md border selection:bg-green-500 selection:text-black ${
                m.role === 'user' 
                ? 'bg-green-950/20 border-green-900/50 text-green-100' 
                : 'bg-blue-950/20 border-blue-900/50 text-blue-100'
              }`}>
                <div className="font-semibold">{m.text}</div>
                {m.translation && (
                  <div className="mt-2 pt-2 border-t border-blue-900/20 text-blue-300/70 text-xs italic">
                    {m.translation}
                  </div>
                )}
              </div>
              {m.geheimzauber && (
                <div 
                  onMouseUp={(e) => handleMouseUp(e, m.geheimzauber!)}
                  className="mt-2 p-2 bg-yellow-950/20 border border-yellow-900/50 rounded text-xs text-yellow-400 text-left selection:bg-yellow-500 selection:text-black">
                  <span className="font-bold uppercase tracking-tighter">✨ 秘密咒语:</span> {m.geheimzauber}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="animate-pulse text-blue-500 text-xs font-mono tracking-tighter">
              [正在同步神经元数据包...]
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-green-900/30 bg-green-950/10 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleListening}
          className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
            isListening 
            ? 'bg-red-900/30 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
            : 'bg-green-900/20 border-green-900 text-green-500 hover:border-green-400'
          }`}
        >
          {isListening ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          )}
        </button>

        <div className="flex-1 flex gap-2 items-center bg-black/40 px-3 py-1 rounded border border-green-900/30">
          <span className="text-green-900 font-bold shrink-0">&gt;</span>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isListening ? "正在捕获语音流..." : "输入德语指令..."}
            className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-green-900 text-sm py-2"
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="bg-green-900/50 hover:bg-green-500 hover:text-black transition-all px-4 py-2 rounded text-xs font-bold uppercase disabled:opacity-50 shrink-0"
        >
          发送
        </button>
      </form>
    </div>
  );
};

export default HackerTerminal;
