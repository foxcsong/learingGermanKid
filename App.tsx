
import React, { useState, useEffect } from 'react';
import { Message, Achievement, SessionData, GermanLevel } from './types';
import { gemini } from './services/geminiService';
import HackerTerminal from './components/HackerTerminal';
import ContentInput from './components/ContentInput';
import Achievements from './components/Achievements';
import AudioPlayer from './components/AudioPlayer';
import StudyAssistant from './components/StudyAssistant';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_hack', title: '初次入侵', description: '第一次成功用德语进行交流。', unlockedAt: null, icon: '🔓' },
  { id: 'spell_caster', title: '咒语师', description: '利用“秘密咒语”修正并提升了德语技能。', unlockedAt: null, icon: '🪄' },
  { id: 'visual_analyzer', title: '视觉分析官', description: '成功分析了图片或文档资料。', unlockedAt: null, icon: '👁️' },
  { id: 'level_5', title: '代码跑者', description: '黑客等级达到了 5 级。', unlockedAt: null, icon: '🏃' },
  { id: 'shadow_master', title: '影子大师', description: '在学习助手中完成了一次高质量跟读。', unlockedAt: null, icon: '🎤' },
];

const GERMAN_LEVELS: GermanLevel[] = ['A1', 'A2', 'B1', 'B2'];

const App: React.FC = () => {
  const [session, setSession] = useState<SessionData>(() => {
    const saved = localStorage.getItem('hacker_kid_session');
    return saved ? JSON.parse(saved) : { 
      messages: [], 
      xp: 0, 
      level: 1, 
      germanLevel: 'A1',
      unlockedAchievements: [] 
    };
  });
  
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('hacker_kid_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('hacker_kid_session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem('hacker_kid_achievements', JSON.stringify(achievements));
  }, [achievements]);

  const unlockAchievement = (id: string) => {
    if (session.unlockedAchievements.includes(id)) return;
    
    setAchievements(prev => prev.map(a => a.id === id ? { ...a, unlockedAt: Date.now() } : a));
    setSession(prev => ({
      ...prev,
      unlockedAchievements: [...prev.unlockedAchievements, id],
      xp: prev.xp + 50
    }));
  };

  const setGermanLevel = (level: GermanLevel) => {
    setSession(prev => ({ ...prev, germanLevel: level }));
  };

  const handleSendMessage = async (text: string, image?: string) => {
    setIsLoading(true);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };

    const newMessages = [...session.messages, userMsg];
    setSession(prev => ({ ...prev, messages: newMessages }));

    try {
      const history = newMessages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const result = await gemini.processInput(text, history, session.germanLevel, image);
      
      if (image) unlockAchievement('visual_analyzer');
      if (result.intentSuccess) unlockAchievement('first_hack');
      if (result.geheimzauber) unlockAchievement('spell_caster');

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: result.response,
        translation: result.translation,
        geheimzauber: result.geheimzauber,
        timestamp: Date.now()
      };

      const audioData = await gemini.generateTTS(result.response);
      if (audioData) {
        aiMsg.audioData = audioData;
        setCurrentAudio(audioData);
      }

      const updatedMessages = [...newMessages, aiMsg];
      const newXp = session.xp + (result.intentSuccess ? 20 : 5);
      const newLevel = Math.floor(newXp / 100) + 1;

      if (newLevel >= 5) unlockAchievement('level_5');

      setSession(prev => ({
        ...prev,
        messages: updatedMessages,
        xp: newXp,
        level: newLevel
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header / HUD */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-green-900/50 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-2xl animate-pulse">
            HK
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-green-400">德语小黑客 <span className="text-xs font-normal border border-green-800 px-1 rounded text-green-600">V2.0</span></h1>
            <p className="text-xs text-green-700">状态: 已加密 // 连接: 稳定</p>
          </div>
        </div>

        <div className="flex bg-green-950/20 border border-green-900/50 rounded p-1">
          {GERMAN_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => setGermanLevel(level)}
              className={`px-3 py-1 text-xs font-bold transition-all ${
                session.germanLevel === level 
                ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.5)]' 
                : 'text-green-700 hover:text-green-400'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        
        <div className="flex gap-6 items-center">
          <div className="text-right">
            <div className="text-xs text-green-600 font-bold">经验 / 等级</div>
            <div className="text-xl font-bold text-green-400">{session.xp} <span className="text-sm text-green-700">级.{session.level}</span></div>
            <div className="w-32 h-1 bg-green-900 mt-1">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${session.xp % 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Panel: Terminal */}
        <div className="lg:col-span-2 flex flex-col h-[60vh] lg:h-full min-h-[500px]">
          <HackerTerminal 
            messages={session.messages} 
            isLoading={isLoading} 
            onSend={handleSendMessage}
            currentLevel={session.level}
            germanLevel={session.germanLevel}
            onPlayAudio={setCurrentAudio}
          />
        </div>

        {/* Right Panel: Tools & Assistant */}
        <div className="space-y-6 flex flex-col overflow-y-auto pr-1">
          <section className="bg-black/50 border border-blue-900/30 p-4 rounded-lg shadow-inner">
            <h2 className="text-sm font-bold text-blue-500 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> 学习助手：影子实验室
            </h2>
            <StudyAssistant level={session.germanLevel} onPlayAudio={setCurrentAudio} />
          </section>

          <section className="bg-black/50 border border-green-900/30 p-4 rounded-lg">
            <h2 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> 外部情报注入
            </h2>
            <ContentInput onUpload={handleSendMessage} isDisabled={isLoading} />
          </section>

          <section className="bg-black/50 border border-green-900/30 p-4 rounded-lg flex-1">
            <h2 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> 成就勋章
            </h2>
            <Achievements achievements={achievements} />
          </section>
        </div>
      </main>

      <AudioPlayer audioData={currentAudio} onEnded={() => setCurrentAudio(null)} />
      
      <footer className="text-center text-[10px] text-green-900 mt-4 opacity-50">
        &copy; 2024 DEUTSCH HACKER PROJECT // 泰山模式已开启 // 选词侦测系统已就绪
      </footer>
    </div>
  );
};

export default App;
