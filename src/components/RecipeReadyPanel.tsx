import React, { useState } from 'react';
import { Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { SceneRecipe, PromptDocument } from '../types/schemas';
import { compileTopLevelJsonObjects } from '../services/ai/promptCompiler';

interface Props {
  recipe: SceneRecipe;
  prompt: PromptDocument;
  directionName: string;
  onGoToExternalGeneration: () => void;
}

export const RecipeReadyPanel: React.FC<Props> = ({ recipe, prompt, directionName, onGoToExternalGeneration }) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const topLevelJsons = compileTopLevelJsonObjects(recipe);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`已复制${label}`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('复制失败，请手动选择文本复制');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const renderSection = (title: string, content: string, label: string) => (
    <div key={title} className="mb-4 p-4 bg-slate-50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={() => handleCopy(content, label)} className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
          <Copy className="w-4 h-4" /> 复制本段
        </button>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-line">{content}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {copyFeedback && (
        <div className="fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg z-50">
          {copyFeedback}
        </div>
      )}
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500"/>
            Recipe 生成成功
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-4">
            <p>方向：<span className="font-medium text-slate-900">{directionName}</span></p>
            <p>版本：<span className="font-medium text-slate-900">{recipe.version}</span></p>
        </div>
        <div className="text-sm text-slate-600 space-y-2 p-4 bg-slate-50 rounded-lg">
            <p>空间：{recipe.scene.spaceType}</p>
            <p>台面：{recipe.scene.desktopMaterial} ({recipe.scene.desktopTone})</p>
            <p>风格：{recipe.scene.style}，调色：{recipe.scene.palette.join(', ')}</p>
            <p>构图：{recipe.composition.purpose}, {recipe.composition.cameraView}</p>
            <p>光线：{recipe.lighting.sourceType}, {recipe.lighting.temperature}, {recipe.lighting.softness}</p>
            <p>装饰：{recipe.decoration.density}</p>
            <p>输出：{recipe.output.aspectRatio}, {recipe.output.resolutionLabel}</p>
        </div>
        <p className="mt-4 text-xs text-slate-500 italic">
          当前目标为空场景背景；产品图片只用于分析和空间参考；平台不会在本页面生成图片。
        </p>
        <button
          onClick={onGoToExternalGeneration}
          className="mt-6 w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          前往外部生成空场景
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">提示词</h2>
            <button onClick={() => handleCopy(prompt.fullPrompt, '完整提示词')} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                <Copy className="w-4 h-4" /> 复制完整提示词
            </button>
        </div>
        {Object.entries(prompt.sections).map(([key, val]) => renderSection(key, val as string, key))}
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">JSON</h2>
            <button onClick={() => handleCopy(prompt.fullJson, '完整 JSON')} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                <Copy className="w-4 h-4" /> 复制完整 JSON
            </button>
        </div>
        <div className="space-y-4">
            {Object.entries(topLevelJsons).map(([key, val]) => (
                <div key={key} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">{key}</h3>
                        <button onClick={() => handleCopy(val as string, key)} className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                        <Copy className="w-4 h-4" /> 复制
                        </button>
                    </div>
                    <pre className="text-xs overflow-auto">{val as string}</pre>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
