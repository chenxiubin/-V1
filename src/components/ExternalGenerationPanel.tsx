import React, { useState } from 'react';
import { Copy, Upload, ImageIcon, X } from 'lucide-react';
import { PromptDocument, SceneAsset } from '../types/schemas';
import { SceneImageImport } from './SceneImageImport';
import { saveAsset } from '../lib/db';

interface Props {
  prompt: PromptDocument;
  recipeId: string;
  recipeVersion: number;
  productAssetId: string;
  onImport: (asset: SceneAsset) => void;
  onError: (msg: string) => void;
}

export const ExternalGenerationPanel: React.FC<Props> = ({ prompt, recipeId, recipeVersion, productAssetId, onImport, onError }) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.fullPrompt);
      setCopyFeedback('已复制完整提示词');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      onError('复制失败，请手动选择文本复制');
    }
  };

  const handleImport = async (assetData: { 
    blob: Blob,
    name: string, 
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp', 
    width: number, 
    height: number, 
    size: number,
    contentHash: string,
  }) => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const assetId = `scene-${crypto.randomUUID()}`;
      await saveAsset(assetId, assetData.blob);

      const sceneAsset: SceneAsset = {
        id: assetId,
        productAssetId,
        recipeId,
        recipeVersion,
        name: assetData.name,
        mimeType: assetData.mimeType,
        width: assetData.width,
        height: assetData.height,
        size: assetData.size,
        contentHash: assetData.contentHash,
        persistedAssetRef: assetId,
        createdAt: new Date().toISOString(),
      };

      onImport(sceneAsset);
    } catch (err) {
      onError('保存场景资产失败');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
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
        <SceneImageImport onImport={handleImport} onError={onError} />
      </div>
    </div>
  );
};
