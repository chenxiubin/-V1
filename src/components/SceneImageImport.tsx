import React, { useState, useRef, useEffect } from 'react';
import { Upload, ImageIcon, AlertTriangle } from 'lucide-react';

interface Props {
  onImport: (asset: { id: string, name: string, mimeType: 'image/png' | 'image/jpeg' | 'image/webp', width: number, height: number, persistedAssetRef: string, createdAt: string }) => void;
  onError: (msg: string) => void;
}

export const SceneImageImport: React.FC<Props> = ({ onImport, onError }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastFileHash, setLastFileHash] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file) {
      onError('文件为空');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      onError('不支持的文件格式，请上传 PNG、JPEG 或 WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('文件大小超过 10MB 限制');
      return;
    }

    // Check duplicate using simple hash (name + size + lastModified)
    const hash = `${file.name}-${file.size}-${file.lastModified}`;
    if (hash === lastFileHash) {
      onError('检测到重复上传相同文件');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setLastFileHash(hash);
        onImport({
          id: `asset-${Date.now()}`,
          name: file.name,
          mimeType: file.type as any,
          width: img.width,
          height: img.height,
          persistedAssetRef: e.target?.result as string,
          createdAt: new Date().toISOString(),
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [lastFileHash]);

  return (
    <div
      data-testid="dropzone"
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${
        dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
      }`}
      onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input data-testid="file-input" ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleChange} />
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
        <Upload className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">
        点击上传、拖拽或按 Ctrl+V 粘贴图片
      </p>
      <p className="text-xs text-slate-500 text-center">
        支持 PNG, JPEG, WebP<br />最大 10MB
      </p>
    </div>
  );
};
