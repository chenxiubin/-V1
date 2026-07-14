import React, { useState, useRef } from 'react';
import { Copy, Upload, ImageIcon, X } from 'lucide-react';
import { PromptDocument } from '../types/schemas';

interface Props {
  prompt: PromptDocument;
  onImport: (asset: { id: string, name: string, mimeType: 'image/png' | 'image/jpeg' | 'image/webp', width: number, height: number, persistedAssetRef: string, createdAt: string }) => void;
  onError: (msg: string) => void;
}

export const ExternalGenerationPanel: React.FC<Props> = ({ prompt, onImport, onError }) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.fullPrompt);
      setCopyFeedback('已复制完整提示词');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      onError('复制失败，请手动选择文本复制');
    }
  };

  const processFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      onError('不支持的文件格式，请上传 PNG、JPEG 或 WebP');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImport({
          id: `asset-${Date.now()}`,
          name: file.name,
          mimeType: file.type as any,
          width: img.width,
          height: img.height,
          persistedAssetRef: e.target?.result as string, // Simplification for now, as real persistence is mocked/handled by system
          createdAt: new Date().toISOString(),
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) processFile(file);
    } else {
      onError('剪贴板中没有图片');
    }
  };

  return (
    <div className="space-y-6" onPaste={handlePaste}>
      {copyFeedback && (
        <div className="fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg z-50">
          {copyFeedback}
        </div>
      )}
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">外部生成空场景说明</h2>
        <div className="text-sm text-slate-700 space-y-2">
            <p>1. 携带真实产品图作为分析和空间参考；</p>
            <p>2. 输出必须为空场景；</p>
            <p>3. 不生成产品、人物、手部、文字、Logo、水印；</p>
            <p>4. 生成完成后将场景图粘贴或上传回平台；</p>
        </div>
        <button
          onClick={handleCopy}
          className="mt-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          <Copy className="w-4 h-4" /> 复制完整提示词
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">导入场景图片</h2>
        <p className="text-sm text-slate-500 mb-4">点击区域上传，或直接在此页面按下 Ctrl+V 粘贴场景图。</p>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400"
        >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">点击选择场景图片</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} className="hidden" />
      </div>
    </div>
  );
};
