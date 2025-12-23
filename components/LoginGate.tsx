
import React, { useState } from 'react';

interface LoginGateProps {
  onLoginSuccess: (username: string) => void;
}

const LoginGate: React.FC<LoginGateProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(false);

    // 解析环境变量 AUTH_USERS: "user1:pass1,user2:pass2"
    const rawUsers = process.env.AUTH_USERS || 'admin:hacker';
    const userMap = rawUsers.split(',').reduce((acc, curr) => {
      const [u, p] = curr.split(':');
      if (u && p) acc[u.trim()] = p.trim();
      return acc;
    }, {} as Record<string, string>);

    setTimeout(() => {
      if (userMap[username] === password) {
        onLoginSuccess(username);
      } else {
        setError(true);
        setIsProcessing(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-mono">
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="w-full max-w-md bg-black border border-green-900 p-8 rounded-lg shadow-[0_0_50px_rgba(0,255,65,0.1)] relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block w-16 h-16 border-2 border-green-500 rounded-full mb-4 flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-2xl font-black text-green-500 tracking-[0.2em] uppercase">多节点访问控制</h2>
          <p className="text-[10px] text-green-900 mt-2 tracking-widest uppercase">请输入您的黑客代号与密钥</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] text-green-700 font-bold uppercase tracking-widest ml-1">代号 (USER_ID)</label>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-900 text-sm">{'>'}</span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full bg-black border border-green-900 px-8 py-3 text-green-400 outline-none focus:border-green-500 transition-all placeholder:text-green-950"
                placeholder="ID_ALPHA"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-green-700 font-bold uppercase tracking-widest ml-1">密钥 (PASSKEY)</label>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-900 text-sm">#</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-black border border-green-900 px-8 py-3 text-green-400 outline-none focus:border-green-500 transition-all placeholder:text-green-950"
                placeholder="********"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/10 border border-red-900 p-3 rounded text-red-500 text-[10px] uppercase font-bold text-center animate-shake">
              [ 认证失败 ] : 数据库中无此节点或密钥错误
            </div>
          )}

          <button 
            type="submit"
            disabled={isProcessing || !username || !password}
            className={`w-full py-4 font-black uppercase tracking-[0.3em] transition-all relative overflow-hidden group ${
              isProcessing 
              ? 'bg-green-950/20 text-green-900 cursor-not-allowed' 
              : 'bg-green-500 text-black hover:bg-green-400'
            }`}
          >
            {isProcessing ? '正在同步链路...' : '接入节点'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginGate;
