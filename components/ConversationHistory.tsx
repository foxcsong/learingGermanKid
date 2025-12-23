import React from 'react';
import { Conversation } from '../types';

interface ConversationHistoryProps {
    conversations: Conversation[];
    activeId: string;
    onSwitch: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
    conversations,
    activeId,
    onSwitch,
    onNew,
    onDelete
}) => {
    return (
        <div className="flex flex-col h-full space-y-4">
            <button
                onClick={onNew}
                className="w-full py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400 transition-all uppercase tracking-tighter"
            >
                + 开启新任务 (New Session)
            </button>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt).map((conv) => (
                    <div
                        key={conv.id}
                        className={`group relative p-3 border cursor-pointer transition-all rounded ${activeId === conv.id
                                ? 'bg-green-950/40 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                : 'bg-black/20 border-green-900/30 hover:border-green-700'
                            }`}
                        onClick={() => onSwitch(conv.id)}
                    >
                        <div className={`text-xs font-mono truncate ${activeId === conv.id ? 'text-green-400' : 'text-green-800'}`}>
                            <span className="opacity-50 mr-2">#{conv.id.slice(-4)}</span>
                            {conv.title || "未命名情报"}
                        </div>
                        <div className="text-[10px] text-green-900 mt-1 flex justify-between items-center">
                            <span>{new Date(conv.updatedAt).toLocaleTimeString()}</span>
                            <span>{conv.messages.length} pkts</span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('确认销毁此项情报记录？')) onDelete(conv.id);
                            }}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-red-900 hover:text-red-500 transition-all text-[10px]"
                        >
                            [销毁]
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConversationHistory;
