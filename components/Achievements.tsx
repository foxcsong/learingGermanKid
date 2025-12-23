
import React from 'react';
import { Achievement } from '../types';

interface AchievementsProps {
  achievements: Achievement[];
}

const Achievements: React.FC<AchievementsProps> = ({ achievements }) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {achievements.map((a) => (
        <div 
          key={a.id} 
          className={`p-3 border rounded flex items-center gap-3 transition-all ${
            a.unlockedAt 
            ? 'bg-green-950/30 border-green-500/50 shadow-[0_0_10px_rgba(0,255,65,0.1)]' 
            : 'bg-black/40 border-green-900/20 opacity-50 grayscale'
          }`}
        >
          <div className="text-2xl">{a.icon}</div>
          <div className="flex-1 overflow-hidden">
            <div className={`text-xs font-bold truncate ${a.unlockedAt ? 'text-green-400' : 'text-green-900'}`}>
              {a.title}
            </div>
            <div className="text-[10px] text-green-700 leading-tight">
              {a.description}
            </div>
            {a.unlockedAt && (
              <div className="text-[8px] text-green-500 mt-1 uppercase tracking-tighter">
                已解锁于 {new Date(a.unlockedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Achievements;
