
import React, { useState, useEffect, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { GermanLevel } from '../types';

interface WordIntelCardProps {
  selection: string;
  context: string;
  level: GermanLevel;
  position: { x: number; y: number };
  onClose: () => void;
  onPlayAudio: (base64: string) => void;
}

const WordIntelCard: React.FC<WordIntelCardProps> = ({ selection, context, level, position, onClose, onPlayAudio }) => {
  const [intel, setIntel] = useState<{ meaning: string; tip: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState<{ score: number; tip: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchIntel = async () => {
      setIsLoading(true);
      try {
        const data = await gemini.explainSelection(selection, context, level);
        setIntel(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntel();
  }, [selection, context, level]);

  const handleSpeak = async () => {
    const audio = await gemini.generateTTS(selection);
    if (audio) onPlayAudio(audio);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result?.toString().split(',')[1];
          if (base64) {
            setIsEvaluating(true);
            try {
              const res = await gemini.evaluatePronunciation(selection, base64);
              setEvaluation(res);
            } catch (e) {
              console.error(e);
            } finally {
              setIsEvaluating(false);
            }
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("跟读录音失败:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  };

  return (
    <div 
      className="fixed z-[100] w-72 bg-black border border-green-500 rounded shadow-[0_0_30px_rgba(0,255,65,0.2)] animate-in zoom-in-95"
      style={{ left: Math.min(window.innerWidth - 300, position.x), top: position.y + 20 }}
    >
      <div className="bg-green-950/40 px-3 py-1.5 border-b border-green-900/50 flex justify-between items-center">
        <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> 情报中心_INTEL
        </span>
        <button onClick={onClose} className="text-green-900 hover:text-green-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs text-green-900 mb-1">选中的片段:</div>
          <div className="text-sm text-green-100 font-bold border-l-2 border-green-500 pl-2">{selection}</div>
        </div>

        {isLoading ? (
          <div className="text-[10px] text-green-700 animate-pulse font-mono">[ 正在访问深度词库... ]</div>
        ) : intel ? (
          <div className="space-y-3">
            <div className="bg-green-900/10 p-2 rounded">
              <div className="text-[10px] text-green-700 uppercase mb-1">含义解析</div>
              <div className="text-xs text-green-200">{intel.meaning}</div>
            </div>
            <div className="bg-blue-900/10 p-2 rounded border-l-2 border-blue-500">
              <div className="text-[10px] text-blue-700 uppercase mb-1">黑客提示</div>
              <div className="text-xs text-blue-200 italic">{intel.tip}</div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 border-t border-green-900/30 pt-3">
          <button 
            onClick={handleSpeak}
            className="flex-1 bg-green-900/20 border border-green-900/50 text-green-500 py-1.5 rounded flex items-center justify-center gap-2 hover:bg-green-500 hover:text-black transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            <span className="text-[10px] font-bold">发音</span>
          </button>
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className={`flex-[1.5] py-1.5 rounded border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${
              isRecording 
              ? 'bg-red-900/40 border-red-500 text-red-500 animate-pulse' 
              : 'bg-blue-900/20 border-blue-900/50 text-blue-400 hover:bg-blue-900/40'
            }`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            {isRecording ? '录音中...' : '按住跟读'}
          </button>
        </div>

        {evaluation && (
          <div className="mt-2 bg-black/60 border border-blue-900/40 p-2 rounded animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-blue-500 font-bold uppercase">跟读同步率</span>
              <span className="text-xs font-black text-blue-400">{evaluation.score}%</span>
            </div>
            <div className="text-[9px] text-blue-300 leading-tight italic">
              <span className="text-blue-500 font-bold not-italic">建议:</span> {evaluation.tip}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordIntelCard;
