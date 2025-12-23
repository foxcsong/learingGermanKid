
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
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<{ score: number; tip: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // 这里的清理逻辑确保组件卸载或 URL 更新时释放内存
  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

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
      // 每次开始新录音前清理旧数据
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
      }
      setEvaluation(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000 // 16kbps compression for human speech
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);

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

        // 停止所有轨道以关闭麦克风占用指示灯
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("跟读录音失败:", err);
      alert("无法访问麦克风，请检查权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playMyRecording = () => {
    if (audioPlaybackRef.current && recordedUrl) {
      audioPlaybackRef.current.src = recordedUrl;
      audioPlaybackRef.current.play().catch(e => {
        console.error("回放失败:", e);
        alert("回放失败，可能是浏览器不支持该音频格式。");
      });
    }
  };

  const isInLowerHalf = position.y > window.innerHeight / 2;
  const cardStyle: React.CSSProperties = {
    left: Math.min(window.innerWidth - 300, position.x),
  };

  if (isInLowerHalf) {
    cardStyle.bottom = window.innerHeight - position.y + 10;
  } else {
    cardStyle.top = position.y + 20;
  }
  return (
    <div
      className="fixed z-[100] w-72 bg-black border border-green-500 rounded shadow-[0_0_30px_rgba(0,255,65,0.2)] flex flex-col max-h-[85vh] animate-in zoom-in-95 overflow-hidden"
      style={cardStyle}
    >
      <audio ref={audioPlaybackRef} className="hidden" />
      <div className="bg-green-950/40 px-3 py-1.5 border-b border-green-900/50 flex justify-between items-center shrink-0">
        <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> 情报中心_INTEL
        </span>
        <button onClick={onClose} className="text-green-900 hover:text-green-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
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

        <div className="space-y-2 border-t border-green-900/30 pt-3">
          <div className="flex gap-2">
            <button
              onClick={handleSpeak}
              className="flex-1 bg-green-900/20 border border-green-900/50 text-green-500 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-500 hover:text-black transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
              <span className="text-[10px] font-bold">听原音</span>
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-[1.5] py-2 rounded border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${isRecording
                ? 'bg-red-900/40 border-red-500 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-blue-900/20 border-blue-900/50 text-blue-400 hover:bg-blue-900/40'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isRecording ? (
                  <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                ) : (
                  <circle cx="12" cy="12" r="6" fill="currentColor" className="opacity-50" />
                )}
              </svg>
              {isRecording ? '点击停止并分析' : recordedUrl ? '重新录制' : '点击跟读'}
            </button>
          </div>

          {recordedUrl && !isRecording && (
            <button
              onClick={playMyRecording}
              className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-400 py-1.5 rounded flex items-center justify-center gap-2 hover:bg-blue-500/20 text-[10px] font-bold uppercase transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              回放我的发音
            </button>
          )}
        </div>

        {(isEvaluating || evaluation) && (
          <div className="mt-2 bg-black/60 border border-blue-900/40 p-3 rounded animate-in fade-in zoom-in-95">
            {isEvaluating ? (
              <div className="text-[10px] text-blue-500 animate-pulse font-mono flex items-center gap-2">
                <span className="w-1 h-1 bg-blue-500 rounded-full animate-ping"></span>
                正在进行生物特征比对...
              </div>
            ) : evaluation ? (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">跟读同步率</span>
                  <span className={`text-xs font-black ${evaluation.score > 80 ? 'text-green-500' : 'text-blue-400'}`}>
                    {evaluation.score}%
                  </span>
                </div>
                <div className="w-full h-1 bg-blue-900/20 rounded-full mb-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${evaluation.score > 80 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${evaluation.score}%` }}
                  ></div>
                </div>
                <div className="text-[9px] text-blue-300 leading-tight italic">
                  <span className="text-blue-500 font-bold not-italic">解析意见:</span> {evaluation.tip}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div >
  );
};

export default WordIntelCard;
