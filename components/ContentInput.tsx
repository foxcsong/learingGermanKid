
import React, { useState } from 'react';

interface ContentInputProps {
  onUpload: (text: string, image?: string, mimeType?: string) => void;
  isDisabled: boolean;
}

const ContentInput: React.FC<ContentInputProps> = ({ onUpload, isDisabled }) => {
  const [url, setUrl] = useState('');

  const compressAndSend = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const mimeType = file.type;

      if (mimeType === 'application/pdf') {
        onUpload("黑客伙伴，帮我分析这份文档。我能从中学习到什么？", result, mimeType);
      } else if (mimeType.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 保持更高的兼容性，将最大分辨率降至 1024px，进一步减小体积
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 降低质量至 0.7 以确保顺利通过网络传输和存储
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          onUpload("黑客伙伴，帮我分析这张图。我能从中学习到什么？", compressedBase64, 'image/jpeg');
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressAndSend(file);
    e.target.value = ''; // Reset input
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onUpload(`让我们聊聊这个视频：${url}`);
      setUrl('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] text-green-700 uppercase font-bold mb-2 tracking-widest">
          上传视觉情报 (图片/PDF)
        </label>
        <div className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors group ${isDisabled ? 'border-green-900/10 cursor-not-allowed opacity-50' : 'border-green-900/30 hover:border-green-500 cursor-pointer'}`}>
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            onChange={handleFileChange}
            disabled={isDisabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="text-green-800 text-xs group-hover:text-green-500 transition-colors">
            {isDisabled ? '正在注入情报...' : '拖拽文件或点击此处上传'}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-green-900/10">
        <label className="block text-[10px] text-green-700 uppercase font-bold mb-2 tracking-widest">
          注入目标链接 (YOUTUBE/文章)
        </label>
        <form onSubmit={handleLinkSubmit} className="flex gap-2">
          <input 
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            disabled={isDisabled}
            className="flex-1 bg-black border border-green-900/30 rounded px-3 py-2 text-xs text-green-400 outline-none focus:border-green-500 placeholder:opacity-30 disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={isDisabled || !url}
            className="bg-green-900/20 text-green-500 border border-green-900/50 px-3 py-1 rounded text-xs hover:bg-green-500 hover:text-black transition-all font-bold uppercase disabled:opacity-30"
          >
            注入
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContentInput;
