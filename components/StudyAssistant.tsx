
import React, { useState, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { GermanLevel } from '../types';

interface StudyAssistantProps {
  level: GermanLevel;
  onPlayAudio: (base64: string) => void;
}

const StudyAssistant: React.FC<StudyAssistantProps> = ({ level, onPlayAudio }) => {
  const [chineseInput, setChineseInput] = useState('');
  const [germanTranslation, setGermanTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState<{ score: number; tip: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleTranslate = async () => {
    if (!chineseInput.trim()) return;
    setIsTranslating(true);
    setEvaluation(null);
    try {
      const res = await gemini.translateForAssistant(chineseInput, level);
      setGermanTranslation(res.german);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = async () => {
    if (!germanTranslation) return;
    const audio = await gemini.generateTTS(germanTranslation);
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
              const res = await gemini.evaluatePronunciation(germanTranslation, base64);
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
      console.error("无法启动录音:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          type="text"
          value={chineseInput}
          onChange={(e) => setChineseInput(e.target.value)}
          placeholder="输入中文，练习德语表达..."
          className="flex-1 bg-black/60 border border-blue-900/40 rounded px-3 py-2 text-xs text-blue-100 outline-none focus:border-blue-500 placeholder:text-blue-900"
          onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
        />
        <button 
          onClick={handleTranslate}
          disabled={isTranslating || !chineseInput.trim()}
          className="bg-blue-900/30 text-blue-400 border border-blue-900/50 px-3 py-1 rounded text-[10px] hover:bg-blue-500 hover:text-white transition-all font-bold uppercase disabled:opacity-30"
        >
          {isTranslating ? '解密中...' : '翻译'}
        </button>
      </div>

      {germanTranslation && (
        <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-widest">目标短语</span>
            <button onClick={handleSpeak} className="text-blue-500 hover:text-blue-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
          </div>
          <div className="text-blue-100 font-medium mb-3">{germanTranslation}</div>
          
          <div className="flex items-center gap-3 border-t border-blue-900/20 pt-3">
            <button 
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={isRecording ? stopRecording : undefined}
              className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 transition-all ${
                isRecording 
                ? 'bg-red-900/40 border-red-500 text-red-500 animate-pulse' 
                : 'bg-blue-900/20 border-blue-900/50 text-blue-400 hover:bg-blue-900/40'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-blue-500'}`}></div>
              <span className="text-xs font-bold uppercase tracking-tighter">
                {isRecording ? '录音中 (松开结束)' : '按住开始跟读'}
              </span>
            </button>
          </div>
        </div>
      )}

      {isEvaluating && (
        <div className="text-center py-2 animate-pulse">
          <span className="text-[10px] text-blue-500 uppercase font-mono tracking-widest">正在运行生物特征比对分析...</span>
        </div>
      )}

      {evaluation && (
        <div className="bg-black/40 border border-blue-900/50 p-3 rounded-lg animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-blue-500 font-bold">影子跟读反馈</span>
            <span className={`text-lg font-black ${evaluation.score > 80 ? 'text-green-500' : 'text-blue-400'}`}>
              {evaluation.score} <span className="text-[10px]">SYNC</span>
            </span>
          </div>
          <div className="w-full h-1 bg-blue-900/30 rounded-full mb-3 overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000" 
              style={{ width: `${evaluation.score}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-200 leading-relaxed italic">
            <span className="text-blue-500 not-italic font-bold">专家指点:</span> {evaluation.tip}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyAssistant;
