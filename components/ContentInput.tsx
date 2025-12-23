
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
        // For PDF, we send as is (Gemini supports it)
        onUpload("黑客伙伴，帮我分析这份文档。我能从中学习到什么？", result, mimeType);
      } else if (mimeType.startsWith('image/')) {
        // For images, we compress to ensure compatibility and speed
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max resolution for faster transmission and lower memory
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

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
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
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
        <div className="relative border-2 border-dashed border-green-900/30 rounded-lg p-4 text-center hover:border-green-500 transition-colors group">
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            onChange={handleFileChange}
            disabled={isDisabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="text-green-800 text-xs group-hover:text-green-500 transition-colors">
            {isDisabled ? '系统繁忙...' : '拖拽文件或点击此处上传'}
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
            className="flex-1 bg-black border border-green-900/30 rounded px-3 py-2 text-xs text-green-400 outline-none focus:border-green-500 placeholder:opacity-30"
          />
          <button 
            type="submit"
            disabled={isDisabled || !url}
            className="bg-green-900/20 text-green-500 border border-green-900/50 px-3 py-1 rounded text-xs hover:bg-green-500 hover:text-black transition-all font-bold uppercase"
          >
            注入
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContentInput;
