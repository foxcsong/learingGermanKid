
import React, { useState, useEffect } from 'react';
import { Message, Achievement, SessionData, GermanLevel } from './types';
import { gemini } from './services/geminiService';
import HackerTerminal from './components/HackerTerminal';
import ContentInput from './components/ContentInput';
import Achievements from './components/Achievements';
import AudioPlayer from './components/AudioPlayer';
import StudyAssistant from './components/StudyAssistant';
import LoginGate from './components/LoginGate';

import ConversationHistory from './components/ConversationHistory';
import { api } from './services/apiService';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_hack', title: '初次入侵', description: '第一次成功用德语进行交流。', unlockedAt: null, icon: '🔓' },
  { id: 'spell_caster', title: '咒语师', description: '利用“秘密咒语”修正并提升了德语技能。', unlockedAt: null, icon: '🪄' },
  { id: 'visual_analyzer', title: '视觉分析官', description: '成功分析了图片或文档资料。', unlockedAt: null, icon: '👁️' },
  { id: 'level_5', title: '代码跑者', description: '黑客等级达到了 5 级。', unlockedAt: null, icon: '🏃' },
  { id: 'shadow_master', title: '影子大师', description: '在学习助手中完成了一次高质量跟读。', unlockedAt: null, icon: '🎤' },
];

const GERMAN_LEVELS: GermanLevel[] = ['A1', 'A2', 'B1', 'B2'];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('hacker_current_user');
  });

  const [session, setSession] = useState<SessionData>(() => {
    const defaultConvId = Date.now().toString();
    return {
      conversations: [{
        id: defaultConvId,
        title: '新对话',
        messages: [],
        updatedAt: Date.now()
      }],
      activeConversationId: defaultConvId,
      xp: 0,
      level: 1,
      germanLevel: 'A1',
      unlockedAchievements: []
    };
  });

  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const activeConversation = session.conversations.find(c => c.id === session.activeConversationId) || session.conversations[0];

  useEffect(() => {
    if (currentUser) {
      const sessionKey = `hacker_session_${currentUser}`;
      const achievementsKey = `hacker_achievements_${currentUser}`;
      const savedSessionRaw = localStorage.getItem(sessionKey);
      const savedAchievements = localStorage.getItem(achievementsKey);

      setSyncStatus('syncing');
      console.log(`[Sync] Initiating cloud sync for user: ${currentUser}`);
      api.getSession(currentUser).then(cloudSession => {
        if (cloudSession) {
          console.log("[Sync] Cloud session retrieved successfully.");
          setSession(cloudSession);
          setSyncStatus('synced');
        } else {
          console.log("[Sync] No cloud session found, staying local.");
          // ... (keep current behavior)
          if (savedSessionRaw) {
            try {
              const savedSession = JSON.parse(savedSessionRaw);
              if (Array.isArray(savedSession.messages)) {
                // ... (迁移逻辑)
                const legacyConvId = 'legacy_' + Date.now();
                setSession({
                  conversations: [{ id: legacyConvId, title: '历史追踪', messages: savedSession.messages, updatedAt: Date.now() }],
                  activeConversationId: legacyConvId,
                  xp: savedSession.xp || 0, level: savedSession.level || 1, germanLevel: savedSession.germanLevel || 'A1', unlockedAchievements: savedSession.unlockedAchievements || []
                });
              } else {
                setSession(savedSession);
              }
            } catch (e) {
              console.error("Failed to parse session", e);
            }
          }
          setSyncStatus('local');
        }
      }).catch((err) => {
        setSyncStatus('error');
        setLastSyncError(err instanceof Error ? err.message : 'Unknown sync error');
      });

      if (savedAchievements) {
        try {
          setAchievements(JSON.parse(savedAchievements));
        } catch (e) {
          console.error("Failed to parse achievements", e);
        }
      }
    }
  }, [currentUser]);

  // 云端同步保存 (Debounced Cloud Save)
  useEffect(() => {
    if (!currentUser || syncStatus === 'syncing') return;

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      const success = await api.saveSession(currentUser, session);
      setSyncStatus(success ? 'synced' : 'error');
    }, 2000); // 延迟 2 秒保存以减少 API 调用

    return () => clearTimeout(timer);
  }, [session, currentUser]);

  useEffect(() => {
    if (currentUser) {
      // 优化存储：清理旧消息中的图片以防止 localStorage 溢出
      const sessionToSave: SessionData = {
        ...session,
        conversations: session.conversations.map(conv => {
          // 只保留每条对话中最后的 3 条包含图片的消息
          const messagesToSave = conv.messages.slice(-30).map((msg, index, array) => {
            const imageInRecent = index >= array.length - 3;
            if (msg.image && !imageInRecent) {
              return { ...msg, image: undefined };
            }
            return msg;
          });
          return { ...conv, messages: messagesToSave };
        })
      };

      try {
        localStorage.setItem(`hacker_session_${currentUser}`, JSON.stringify(sessionToSave));
        localStorage.setItem(`hacker_achievements_${currentUser}`, JSON.stringify(achievements));
      } catch (e) {
        console.warn("Storage quota approaching limit, cleaning up...");
        const emergencySave = {
          ...sessionToSave,
          conversations: sessionToSave.conversations.map(c => ({
            ...c,
            messages: c.messages.map(m => ({ ...m, image: undefined }))
          }))
        };
        localStorage.setItem(`hacker_session_${currentUser}`, JSON.stringify(emergencySave));
      }
    }
  }, [session, achievements, currentUser]);

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

  const handleNewConversation = () => {
    const id = Date.now().toString();
    const newConv = { id, title: '新任务', messages: [], updatedAt: Date.now() };
    setSession(prev => ({
      ...prev,
      conversations: [...prev.conversations, newConv],
      activeConversationId: id
    }));
  };

  const handleSwitchConversation = (id: string) => {
    setSession(prev => ({ ...prev, activeConversationId: id }));
  };

  const handleDeleteConversation = (id: string) => {
    setSession(prev => {
      const remaining = prev.conversations.filter(c => c.id !== id);
      if (remaining.length === 0) {
        const newId = Date.now().toString();
        return {
          ...prev,
          conversations: [{ id: newId, title: '新任务', messages: [], updatedAt: Date.now() }],
          activeConversationId: newId
        };
      }
      return {
        ...prev,
        conversations: remaining,
        activeConversationId: id === prev.activeConversationId ? remaining[0].id : prev.activeConversationId
      };
    });
  };

  const handleSendMessage = async (text: string, image?: string, mimeType?: string) => {
    setIsLoading(true);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      image,
      imageMimeType: mimeType,
      timestamp: Date.now()
    };

    const updatedMessages = [...activeConversation.messages, userMsg];

    // Update local state first for responsiveness
    setSession(prev => ({
      ...prev,
      conversations: prev.conversations.map(c =>
        c.id === prev.activeConversationId
          ? { ...c, messages: updatedMessages, updatedAt: Date.now(), title: c.title === '新对话' || c.title === '新任务' ? text.slice(0, 15) : c.title }
          : c
      )
    }));

    try {
      const history = updatedMessages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const result = await gemini.processInput(text, history, session.germanLevel, image, mimeType);

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

      setSession(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === prev.activeConversationId
            ? { ...c, messages: [...updatedMessages, aiMsg], updatedAt: Date.now() }
            : c
        ),
        xp: prev.xp + (result.intentSuccess ? 20 : 5),
        level: Math.floor((prev.xp + 20) / 100) + 1
      }));
    } catch (error) {
      console.error("AI 响应异常:", error);

      let errorText = "SEC_ERROR: 链路不稳定，情报解析中断。请尝试重新注入。 (可能是文件过大或网络超时)";

      if (error instanceof Error && error.message === "API_KEY_MISSING") {
        errorText = "SEC_ERROR: 身份验证失败。请检查 Cloudflare Pages 的 VITE_GEMINI_API_KEY 环境变量是否已设置，并重新部署项目。";
      }

      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'ai',
        text: errorText,
        timestamp: Date.now()
      };

      setSession(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === prev.activeConversationId
            ? { ...c, messages: [...updatedMessages, errorMsg], updatedAt: Date.now() }
            : c
        )
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return <LoginGate onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-green-900/50 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-2xl animate-pulse">
            {currentUser.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tighter text-green-400">德语小黑客 <span className="text-xs font-normal border border-green-800 px-1 rounded text-green-600">V2.0</span></h1>
              <button
                onClick={() => window.location.reload()}
                className="text-[8px] border border-green-900 px-1 text-green-800 rounded lg:hidden"
              >
                刷新链路 (Refresh)
              </button>
            </div>
            <p className="text-xs text-green-700 uppercase tracking-widest">用户: <span className="text-green-500 font-bold">{currentUser}</span> // 节点: 01</p>
          </div>
        </div>
        <div className="flex bg-green-950/20 border border-green-900/50 rounded p-1">
          {GERMAN_LEVELS.map(l => (
            <button key={l} onClick={() => setSession(s => ({ ...s, germanLevel: l }))} className={`px-3 py-1 text-xs font-bold transition-all ${session.germanLevel === l ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'text-green-700 hover:text-green-400'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-6 items-center">
          <div className="text-right flex items-center gap-2">
            <div>
              <div
                className="text-[10px] text-green-900 font-bold uppercase tracking-widest cursor-pointer hover:text-green-500 transition-colors"
                onClick={() => lastSyncError && alert(`同步错误详情:\n${lastSyncError}\n\n建议排查：\n1. Cloudflare Pages 绑定了 D1 吗？\n2. 绑定名是 DB 吗？\n3. 修改完绑定重新部署了吗？`)}
              >
                {syncStatus === 'synced' && '● 链路已加密同步'}
                {syncStatus === 'syncing' && <span className="animate-pulse">◌ 正在注入云端...</span>}
                {syncStatus === 'error' && (
                  <span className="text-red-900">
                    × 链路同步故障 (点击查看)
                  </span>
                )}
                {syncStatus === 'local' && '○ 仅本地节点'}
              </div>
              <div className="text-xs text-green-600 font-bold">经验 / 等级</div>
              <div className="text-xl font-bold text-green-400">{session.xp} <span className="text-sm text-green-700">级.{session.level}</span></div>
            </div>
            <button onClick={handleLogout} className="text-[10px] text-red-900 border border-red-900 px-2 py-1 rounded hover:bg-red-900 hover:text-white transition-all uppercase font-bold">退出链路</button>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden relative">
        {/* History Sidebar - Responsive */}
        <div className={`lg:col-span-1 ${showMobileHistory ? 'fixed inset-0 z-50 bg-black/95 p-6' : 'hidden'} lg:flex lg:relative lg:inset-auto lg:z-auto flex-col overflow-hidden bg-black/30 lg:border border-green-900/20 p-4 rounded-lg`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-green-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> 历史追踪节点
            </h2>
            {showMobileHistory && (
              <button onClick={() => setShowMobileHistory(false)} className="text-green-900 hover:text-green-500">[关闭]</button>
            )}
          </div>
          <ConversationHistory
            conversations={session.conversations}
            activeId={session.activeConversationId}
            onSwitch={(id) => {
              handleSwitchConversation(id);
              if (showMobileHistory) setShowMobileHistory(false);
            }}
            onNew={() => {
              handleNewConversation();
              if (showMobileHistory) setShowMobileHistory(false);
            }}
            onDelete={handleDeleteConversation}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col h-[60vh] lg:h-full min-h-[500px]">
          <HackerTerminal messages={activeConversation.messages} isLoading={isLoading} onSend={handleSendMessage} currentLevel={session.level} germanLevel={session.germanLevel} onPlayAudio={setCurrentAudio} />
        </div>

        <div className="lg:col-span-1 space-y-6 flex flex-col overflow-y-auto pr-1">
          <section className="bg-black/50 border border-blue-900/30 p-4 rounded-lg shadow-inner"><h2 className="text-sm font-bold text-blue-500 mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> 影子实验室</h2><StudyAssistant level={session.germanLevel} onPlayAudio={setCurrentAudio} /></section>
          <section className="bg-black/50 border border-green-900/30 p-4 rounded-lg"><h2 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> 外部情报注入</h2><ContentInput onUpload={handleSendMessage} isDisabled={isLoading} /></section>
          <section className="bg-black/50 border border-green-900/30 p-4 rounded-lg flex-1"><h2 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> 成就勋章</h2><Achievements achievements={achievements} /></section>
        </div>
      </main>
      <AudioPlayer audioData={currentAudio} onEnded={() => setCurrentAudio(null)} />

      {/* Mobile Floating History Button - Forced Visibility */}
      <button
        onClick={() => setShowMobileHistory(true)}
        style={{ zIndex: 9999, display: 'flex' }}
        className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-green-500 text-black rounded-full shadow-[0_0_20px_rgba(34,197,94,0.8)] items-center justify-center font-bold text-[10px] border-4 border-black active:scale-90 transition-all uppercase text-center leading-none"
      >
        HISTORY<br />PORTAL
      </button>
    </div>
  );
};

export default App;
