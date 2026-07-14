import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Check, RotateCcw, Eye, X, BookOpen, AlertCircle } from 'lucide-react';
import { SceneRecipe, PromptDocument } from '../types/schemas';

interface RecipeVersionHistoryPanelProps {
  recipeVersions: {
    recipe: SceneRecipe;
    promptDocument: PromptDocument;
    sourceMatchReportId?: string;
    createdAt: string;
  }[];
  activeVersion: number | null;
  sceneDirections: { id: string; name: string }[] | null;
  onRollback: (version: number) => void;
  onClose: () => void;
}

export const RecipeVersionHistoryPanel: React.FC<RecipeVersionHistoryPanelProps> = ({
  recipeVersions,
  activeVersion,
  sceneDirections,
  onRollback,
  onClose,
}) => {
  const [selectedSummaryVersion, setSelectedSummaryVersion] = useState<number | null>(null);
  const [rollbackConfirmVersion, setRollbackConfirmVersion] = useState<number | null>(null);

  // Sort versions descending by version number
  const sortedVersions = [...recipeVersions].sort((a, b) => b.recipe.version - a.recipe.version);

  const handleRollbackConfirm = (version: number) => {
    onRollback(version);
    setRollbackConfirmVersion(null);
  };

  const getDirectionName = (recipe: SceneRecipe) => {
    const dirId = recipe.selectedDirectionId;
    const matched = sceneDirections?.find(d => d.id === dirId);
    return matched ? matched.name : `方向 ID: ${dirId}`;
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div id="version-history-panel" className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            Recipe 版本历史
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            查看、比对和恢复当前场景规划项目的所有历史修改版本
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          title="关闭历史版本"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {sortedVersions.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          暂无历史版本记录
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedVersions.map((entry) => {
            const ver = entry.recipe.version;
            const isCurrent = ver === activeVersion;
            const dirName = getDirectionName(entry.recipe);

            return (
              <div
                key={ver}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50/30 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Recipe 版本 V{ver}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                          <Check className="w-3 h-3" /> 当前活动版本
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <p>创建时间: {formatTime(entry.createdAt)}</p>
                      <p>对应方向: <span className="font-medium text-slate-700">{dirName}</span></p>
                      {entry.sourceMatchReportId && (
                        <p className="text-slate-400">来源报告: {entry.sourceMatchReportId}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSummaryVersion(selectedSummaryVersion === ver ? null : ver)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {selectedSummaryVersion === ver ? '收起摘要' : '查看版本摘要'}
                    </button>
                    
                    {!isCurrent && (
                      <button
                        onClick={() => setRollbackConfirmVersion(ver)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        恢复此版本
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Summary Details */}
                <AnimatePresence>
                  {selectedSummaryVersion === ver && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4 pt-4 border-t border-slate-100"
                    >
                      <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-600 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-semibold text-slate-800">空间与风格：</span>
                            <p className="mt-0.5">类型: {entry.recipe.scene.spaceType || '未指定'}</p>
                            <p>风格: {entry.recipe.scene.style || '未指定'}</p>
                            <p>墙体: {entry.recipe.scene.wallMaterial || '未指定'}</p>
                            <p>桌面: {entry.recipe.scene.desktopMaterial || '未指定'}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">构图与相机：</span>
                            <p className="mt-0.5">用途: {entry.recipe.composition.purpose || '未指定'}</p>
                            <p>相机视角: {entry.recipe.composition.cameraView || '未指定'}</p>
                            <p>相机高度: {entry.recipe.composition.cameraHeight || '未指定'}</p>
                            <p>画幅比例: {entry.recipe.output.aspectRatio || '未指定'}</p>
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-800">光照配置：</span>
                          <p className="mt-0.5">
                            光源: {entry.recipe.lighting.sourceType} ({entry.recipe.lighting.sourcePosition})
                          </p>
                          <p>
                            色温: {entry.recipe.lighting.temperature} | 质地: {entry.recipe.lighting.softness} | 对比: {entry.recipe.lighting.contrast}
                          </p>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-800">配饰与摆件：</span>
                          <p className="mt-0.5">密度: {entry.recipe.decoration.density || '未指定'}</p>
                          {entry.recipe.decoration.allowed.length > 0 && (
                            <p>允许摆放: {entry.recipe.decoration.allowed.join('、')}</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            提示词预览
                          </span>
                          <pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap bg-slate-100 p-2 rounded text-[10px] font-mono text-slate-700">
                            {entry.promptDocument.fullPrompt || '（空白）'}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rollback Confirm Dialog inside card */}
                <AnimatePresence>
                  {rollbackConfirmVersion === ver && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">确认恢复到 V{ver} 吗？</p>
                          <p className="text-xs text-amber-700 mt-1">
                            恢复到 Recipe V{ver} 后，当前场景、预览和匹配报告将被清除。是否继续？
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleRollbackConfirm(ver)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors cursor-pointer"
                            >
                              确认恢复
                            </button>
                            <button
                              onClick={() => setRollbackConfirmVersion(null)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
