import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Check, Sparkles, Loader2, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
import { GuidedQuestion, GuidedAnswer } from '../types/schemas';

interface GuidedQuestionsPanelProps {
  questions: GuidedQuestion[];
  answers: GuidedAnswer[];
  onAnswerSelect: (questionId: string, optionId: string) => void;
  onAdoptRecommendations: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  sceneDirectionsError?: string | null;
  onRetry: () => void;
  onBackToReview: () => void;
}

export function GuidedQuestionsPanel({
  questions,
  answers,
  onAnswerSelect,
  onAdoptRecommendations,
  onSubmit,
  loading,
  error,
  sceneDirectionsError,
  onRetry,
  onBackToReview
}: GuidedQuestionsPanelProps) {
  const answeredCount = answers.length;
  const isAllAnswered = questions.length > 0 && answeredCount === questions.length;

  return (
    <div id="guided-questions-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 id="guided-questions-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            智能引导问答
          </h2>
          {questions.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              完成以下 {questions.length} 个场景偏好与设计维度问题，以定制最贴合您台历产品的场景方向。
            </p>
          )}
        </div>
        
        {questions.length > 0 && (
          <button
            id="btn-adopt-recommendations"
            onClick={onAdoptRecommendations}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-lg transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            采用推荐方案
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div id="questions-error-alert" className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">生成引导问题失败</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              id="btn-back-to-review-from-error"
              onClick={onBackToReview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
            >
              返回产品分析报告
            </button>
            <button
              id="btn-retry-questions"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              稍后重试
            </button>
          </div>
        </div>
      )}

      {/* Scene Directions Error Alert */}
      {sceneDirectionsError && (
        <div id="directions-error-alert" className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">生成场景方向失败</p>
              <p className="mt-0.5 opacity-90">{sceneDirectionsError}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              id="btn-back-to-review-from-directions-error"
              onClick={onBackToReview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
            >
              返回产品分析报告
            </button>
            <button
              id="btn-retry-directions"
              onClick={onSubmit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重新生成场景方向
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && questions.length === 0 && (
        <div id="questions-loading-spinner" className="py-12 text-center flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">正在根据产品特征生成引导问题……</p>
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="flex flex-col gap-6">
          {questions.map((q, qIdx) => {
            const currentAnswer = answers.find(a => a.questionId === q.id);
            
            // Render options in their original order as returned by the server
            const sortedOptions = q.options;

            return (
              <div
                key={q.id}
                id={`question-card-${q.id}`}
                className="border border-slate-100 bg-slate-50/30 rounded-xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 shrink-0 mt-0.5">
                    {qIdx + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 leading-relaxed">
                    {q.text}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-7">
                  {sortedOptions.map(opt => {
                    const isSelected = currentAnswer?.optionId === opt.id;
                    const isRecommended = q.recommendedOptionId === opt.id;

                    return (
                      <button
                        key={opt.id}
                        id={`option-${q.id}-${opt.id}`}
                        onClick={() => onAnswerSelect(q.id, opt.id)}
                        disabled={loading}
                        className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 ${
                          loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-slate-50'
                        } ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="text-xs font-medium text-slate-800">
                            {opt.text}
                          </span>
                          {isRecommended && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-200 shrink-0 font-mono">
                              推荐
                            </span>
                          )}
                        </div>

                        {isRecommended && opt.recommendationReason && (
                          <p className="text-[11px] text-amber-800 leading-relaxed opacity-90">
                            理由: {opt.recommendationReason}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Bar and Actions Footer */}
      {questions.length > 0 && (
        <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span id="answered-progress-text">答题进度：{answeredCount} / {questions.length}</span>
            <div className="w-1/2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-350"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center gap-4">
            <button
              id="btn-back-to-review"
              onClick={onBackToReview}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              返回分析报告
            </button>

            <button
              id="btn-view-directions"
              onClick={onSubmit}
              disabled={!isAllAnswered || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  正在规划...
                  <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  查看场景方向
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
