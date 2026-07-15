import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, FileText, Code, Database, Sparkles, Award } from 'lucide-react';
import { SceneRecipe, PromptDocument, SceneDirection } from '../types/schemas';
import { copyText } from '../utils/clipboard';

interface Props {
  recipe: SceneRecipe;
  promptDocument: PromptDocument;
  selectedDirection?: SceneDirection;
  onGoToExternalGeneration: () => void;
}

export const RecipeReadyView: React.FC<Props> = ({
  recipe,
  promptDocument,
  selectedDirection,
  onGoToExternalGeneration,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCopyAction = async (id: string, text: string) => {
    const success = await copyText(text);
    if (success) {
      setCopiedId(id);
      setErrorMessage(null);
      setTimeout(() => {
        setCopiedId((curr) => (curr === id ? null : curr));
      }, 1500);
    } else {
      setErrorMessage('复制失败，请尝试手动选择复制');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Sections ordered according to PromptCompiler requirement
  const sectionKeys = [
    { key: 'taskAndReferences', label: '1. 任务与参考图' },
    { key: 'productMatching', label: '2. 产品匹配' },
    { key: 'sceneAndStyle', label: '3. 场景与风格' },
    { key: 'cameraAndComposition', label: '4. 镜头与构图' },
    { key: 'lightingAndDecoration', label: '5. 光线与装饰' },
    { key: 'outputConstraints', label: '6. 输出约束' },
  ] as const;

  const objectJsonKeys = [
    { key: 'task', label: 'Task' },
    { key: 'scene', label: 'Scene' },
    { key: 'composition', label: 'Composition' },
    { key: 'lighting', label: 'Lighting' },
    { key: 'decoration', label: 'Decoration' },
    { key: 'output', label: 'Output' },
    { key: 'inheritance', label: 'Inheritance' },
  ] as const;

  // Format JSON securely
  const formatJson = (jsonStr: string) => {
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 pb-12" id="recipe-ready-view">
      {/* Toast Alert for Feedback */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 font-sans text-sm"
            role="alert"
          >
            <Check className="w-4 h-4" />
            <span>复制成功</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-rose-500 font-sans text-sm"
            role="alert"
          >
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      
      {/* External Generation Action Section */}
      <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <p className="text-indigo-800 font-semibold mb-1">准备好空场景背景了吗？</p>
          <p className="text-sm text-indigo-600/80 max-w-lg mx-auto">
            请将当前提示词复制到外部生图模型生成空场景背景，再把生成结果导回平台进行真实产品叠加与匹配检查。
          </p>
        </div>
        <button
          onClick={onGoToExternalGeneration}
          className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
        >
          导入外部生成的空场景图
        </button>
      </section>

      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner mb-2">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
          场景方案已生成
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
          AI 已根据产品信息、用户选择和场景方向生成完整生图方案。
        </p>
      </div>

      {/* Part 1: Scene Direction Summary */}
      {selectedDirection && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            {selectedDirection.recommended ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Award className="w-3.5 h-3.5" />
                推荐方案
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                普通方案
              </span>
            )}
          </div>
          <div className="space-y-3 pr-24">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              场景方向摘要
            </h3>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedDirection.name}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {selectedDirection.summary}
            </p>
          </div>
        </section>
      )}

      {/* Part 2: Six-segment Prompt Display */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900">分段生图提示词</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionKeys.map(({ key, label }) => {
            const content = promptDocument.sections[key];
            const isCopied = copiedId === `section-${key}`;
            return (
              <div
                key={key}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-bold text-slate-800">{label}</h3>
                    <button
                      onClick={() => handleCopyAction(`section-${key}`, content)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                      aria-label={`复制 ${label}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>复制成功</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>复制本段</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Part 3: Complete Prompt */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900">完整生图提示词 (Full Prompt)</h2>
          </div>
          <button
            onClick={() => handleCopyAction('full-prompt', promptDocument.fullPrompt)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              copiedId === 'full-prompt'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copiedId === 'full-prompt' ? (
              <>
                <Check className="w-4 h-4" />
                <span>复制成功</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>复制完整提示词</span>
              </>
            )}
          </button>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
            {promptDocument.fullPrompt}
          </p>
        </div>
      </section>

      {/* Part 4: JSON Data */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900">完整 JSON 配置 (Full JSON)</h2>
          </div>
          <button
            onClick={() => handleCopyAction('full-json', promptDocument.fullJson)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              copiedId === 'full-json'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {copiedId === 'full-json' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>复制成功</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制 JSON</span>
              </>
            )}
          </button>
        </div>
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-x-auto max-h-[350px]">
          <pre className="text-xs text-indigo-200 font-mono leading-relaxed">
            {formatJson(promptDocument.fullJson)}
          </pre>
        </div>
      </section>

      {/* Part 5: Object JSON Segments */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900">JSON 配置分项 (Object JSON)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {objectJsonKeys.map(({ key, label }) => {
            const content = promptDocument.objectJson[key];
            if (!content) return null; // Skip optional undefined fields like inheritance
            const formatted = formatJson(content);
            const isCopied = copiedId === `object-${key}`;
            return (
              <div
                key={key}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {label}
                    </span>
                    <button
                      onClick={() => handleCopyAction(`object-${key}`, content)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>复制成功</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>复制</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 overflow-x-auto max-h-[160px]">
                    <pre className="text-[11px] text-emerald-300 font-mono leading-relaxed whitespace-pre">
                      {formatted}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
