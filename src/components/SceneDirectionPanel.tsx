import React from 'react';
import { Compass, Sparkles, AlertTriangle, RotateCw, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { SceneDirection } from '../types/schemas';

interface SceneDirectionPanelProps {
  directions: SceneDirection[];
  selectedDirectionId: string | null;
  onDirectionSelect: (directionId: string) => void;
  onConfirmDirection: () => void;
  onRefreshDirections: () => void;
  onBackToQuestions: () => void;
  loading: boolean;
  error: string | null;
}

export function SceneDirectionPanel({
  directions,
  selectedDirectionId,
  onDirectionSelect,
  onConfirmDirection,
  onRefreshDirections,
  onBackToQuestions,
  loading,
  error
}: SceneDirectionPanelProps) {
  const selectedDirection = directions.find(d => d.id === selectedDirectionId);

  return (
    <div id="scene-directions-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 id="scene-directions-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-500" />
            推荐场景方向
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            大模型根据您的台历特征与问答结果，定制规划了以下 3 个高水准场景拍摄方向。
          </p>
        </div>

        <button
          id="btn-refresh-directions"
          onClick={onRefreshDirections}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-all cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCw className="w-3.5 h-3.5" />
          )}
          换一批方向
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div id="directions-error-alert" className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">场景规划失败</p>
            <p className="mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <div className="relative">
        {/* Loading Overlay */}
        {loading && (
          <div id="directions-loading-spinner" className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">正在规划三个场景方向……</p>
          </div>
        )}

        {directions.length === 0 && !loading ? (
          <div className="py-12 text-center text-slate-400">
            暂无推荐场景方向数据。
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {directions.map(dir => {
              const isSelected = selectedDirectionId === dir.id;
              const isRecommended = dir.recommended;

              return (
                <div
                  key={dir.id}
                  id={`direction-card-${dir.id}`}
                  onClick={() => onDirectionSelect(dir.id)}
                  className={`border-2 rounded-xl p-5 transition-all flex flex-col gap-4 cursor-pointer relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/10 ring-1 ring-indigo-600'
                      : isRecommended
                      ? 'border-slate-200 hover:border-indigo-300 bg-slate-50/40'
                      : 'border-slate-100 hover:border-indigo-200 bg-white'
                  }`}
                >
                  {/* Recommended Badge / Selected Indicator */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-bold text-slate-900 font-display">
                        {dir.name}
                      </h3>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800 font-sans shadow-xs">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          官方首推
                        </span>
                      )}
                    </div>
                    
                    {/* Radio selection circle */}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-600 text-white' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                    </div>
                  </div>

                  {/* Recommendation reason if recommended */}
                  {isRecommended && dir.recommendationReason && (
                    <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg text-xs text-amber-900 leading-relaxed font-sans">
                      <span className="font-bold">推荐理由：</span>
                      {dir.recommendationReason}
                    </div>
                  )}

                  {/* Summary / description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">效果摘要：</span>
                    {dir.summary}
                  </p>

                  {/* Core Dimensions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs">
                      <span className="text-slate-400 block mb-1">空间类型</span>
                      <span className="font-semibold text-slate-800">{dir.spaceType}</span>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-400 block mb-1">台面说明</span>
                      <span className="font-semibold text-slate-800">{dir.desktop}</span>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-400 block mb-1">光线氛围</span>
                      <span className="font-semibold text-slate-800">{dir.lightingSummary}</span>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-400 block mb-1">构图方式</span>
                      <span className="font-semibold text-slate-800">{dir.compositionSummary}</span>
                    </div>

                    <div className="text-xs col-span-1 sm:col-span-2">
                      <span className="text-slate-400 block mb-1">色调特征 (Palette)</span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {dir.palette.map((color, cIdx) => (
                          <div key={cIdx} className="inline-flex items-center gap-1 bg-white border border-slate-200/50 px-1.5 py-0.5 rounded-md text-[10px]">
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
                            <span className="font-mono text-slate-500 font-semibold">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Decoration Details */}
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">装饰元素：</span>
                    <span className="text-slate-600">{dir.decorationSummary}</span>
                  </div>

                  {/* Risks Alert box */}
                  {dir.risks && dir.risks.length > 0 && (
                    <div className="border border-rose-100/50 bg-rose-50/20 p-3.5 rounded-lg text-xs text-rose-900/90 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-950">创意落地风险及避免策略：</span>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          {dir.risks.map((risk, rIdx) => (
                            <li key={rIdx}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="border-t border-slate-100 pt-5 flex flex-wrap justify-between items-center gap-4 mt-2">
        <button
          id="btn-back-to-questions"
          onClick={onBackToQuestions}
          className="inline-flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          返回修改答案
        </button>

        <button
          id="btn-confirm-direction"
          onClick={onConfirmDirection}
          disabled={!selectedDirectionId || loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          确认这个方向
        </button>
      </div>
    </div>
  );
}
