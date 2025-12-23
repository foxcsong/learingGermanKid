
import React, { useState, useEffect } from 'react';
import { Message, Achievement, SessionData, GermanLevel } from './types';
import { gemini } from './services/geminiService';
import HackerTerminal from './components/HackerTerminal';
import ContentInput from './components/ContentInput';
import Achievements from './components/Achievements';
import AudioPlayer from './components/AudioPlayer';
import StudyAssistant from './components/StudyAssistant';
import LoginGate from './components/LoginGate';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_hack', title: '初次入侵', description: '第一次成功用德语进行交流。', unlockedAt: null, icon: '🔓' },
  { id: 'spell_caster', title: '咒语师', description: '利用“秘密咒语”修正并提升了德语技能。', unlockedAt: null, icon: '🪄' },
  { id: 'visual_analyzer', title: '视觉分析官', description: '成功分析了图片或文档资料。', unlockedAt: null, icon: '👁️' },
  { id: 'level_5', title: '代码跑者', description: '黑客等级达到了 5 级。', unlockedAt: null, icon: '🏃' },
  { id: 'shadow_master', title: '影子大师', description: '在学习助手中完成了一次高质量跟读。', unlockedAt: null, icon: '🎤' },
];

const GERMAN_LEVELS: GermanLevel[] = ['A1', 'A2', 'B1', 'B2'];

const App: React.FC = () => {
  // 核心用户状态
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('hacker_current_user');
  });

  const [session, setSession] = useState<SessionData>({ 
    messages: [], 
    xp: 0, 
    level: 1, 
    germanLevel: 'A1',
    unlockedAchievements: [] 
  });
  
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  // 当用户切换或登录时，从该用户的专属存储空间加载数据
  useEffect(() => {
    if (currentUser) {
      const sessionKey = `hacker_session_${currentUser}`;
      const achievementsKey = `hacker_achievements_${currentUser}`;
      
      const savedSession = localStorage.getItem(sessionKey);
      const savedAchievements = localStorage.getItem(achievementsKey);

      if (savedSession) {
        setSession(JSON.parse(savedSession));
      } else {
        // 新用户初始化
        setSession({ 
          messages: [], 
          xp: 0, 
          level: 1, 
          germanLevel: 'A1',
          unlockedAchievements: [] 
        });
      }

      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      } else {
        setAchievements(INITIAL_ACHIEVEMENTS);
      }
    }
  }, [currentUser]);

  // 自动保存逻辑：始终保存到当前用户的专属 key
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`hacker_session_${currentUser}`, JSON.stringify(session));
    }
  }, [session, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`hacker_achievements_${currentUser}`, JSON.stringify(achievements));
    }
  }, [achievements, currentUser]);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('hacker_current_user', username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hacker_current_user');
    window.location.reload();
  };

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

  if (!currentUser) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-700">
      {/* Header / HUD */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-green-900/50 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-2xl animate-pulse">
            {currentUser.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-green-400">德语小黑客 <span className="text-xs font-normal border border-green-800 px-1 rounded text-green-600">V2.0</span></h1>
            <p className="text-xs text-green-700 uppercase tracking-widest">
              用户: <span className="text-green-500 font-bold">{currentUser}</span> // 状态: 已验证 // 节点: 01
            </p>
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
          <button 
            onClick={handleLogout}
            className="text-[10px] text-red-900 border border-red-900 px-2 py-1 rounded hover:bg-red-900 hover:text-white transition-all uppercase font-bold"
          >
            退出链路
          </button>
          <div className="text-right">
            <div className="text-xs text-green-600 font-bold">经验 / 等级</div>
            <div className="text-xl font-bold text-green-400">{session.xp} <span className="text-sm text-green-700">级.{session.level}</span></div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
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
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> 成就勋章 ({currentUser})
            </h2>
            <Achievements achievements={achievements} />
          </section>
        </div>
      </main>

      <AudioPlayer audioData={currentAudio} onEnded={() => setCurrentAudio(null)} />
      
      <footer className="text-center text-[10px] text-green-900 mt-4 opacity-50">
        &copy; 2024 DEUTSCH HACKER PROJECT // 系统安全受控 // 用户节点: {currentUser}
      </footer>
    </div>
  );
};

export default App;
