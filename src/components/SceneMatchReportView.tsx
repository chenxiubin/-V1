import React from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  FileText
} from 'lucide-react';
import { SceneMatchReport } from '../types/schemas';

interface Props {
  report: SceneMatchReport;
  onBackToRecipe?: () => void;
  isLoading?: boolean;
}

export const SceneMatchReportView: React.FC<Props> = ({
  report,
  onBackToRecipe,
  isLoading = false
}) => {
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const sortedSuggestions = [...(report.improvementSuggestions || [])].sort((a, b) => {
    return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
  });

  const getPriorityBadgeClass = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityLabel = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return '高优先级';
      case 'medium':
        return '中优先级';
      case 'low':
        return '低优先级';
      default:
        return '普通建议';
    }
  };

  const categories = [
    {
      title: '产品一致性',
      data: report.productMatch,
      desc: '检查主体图案、文字、结构变化',
      color: 'indigo'
    },
    {
      title: '场景符合度',
      data: report.sceneMatch,
      desc: '对比 SceneRecipe 空间、色调、氛围符合度',
      color: 'emerald'
    },
    {
      title: '构图合理性',
      data: report.compositionMatch,
      desc: '评估产品位置、比例、留白与镜头角度',
      color: 'amber'
    },
    {
      title: '光影融合度',
      data: report.lightingMatch,
      desc: '对比真实度、底部投影及明暗融合度',
      color: 'violet'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100" id="match-report-view-root">
      {/* Top Header & Score */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-white rounded-xl shadow-sm border border-slate-100" id="match-report-header">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-600 font-semibold text-sm">
            <Zap className="w-4 h-4 animate-pulse" />
            <span>多模态视觉对比完成</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">场景与产品匹配分析报告</h2>
          <p className="text-sm text-slate-500 max-w-md leading-relaxed">
            {report.summary || '基于多模态视觉模型对上传的生成图进行了深度审计，结果见下：'}
          </p>
        </div>

        {/* Dynamic Score Circle */}
        <div className="relative flex flex-col items-center justify-center shrink-0" id="match-report-score-widget">
          <div className="w-28 h-28 flex items-center justify-center rounded-full bg-indigo-50 border-4 border-indigo-500/20 shadow-inner">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-indigo-600" id="report-overall-score">{report.overallScore}</span>
              <span className="text-xs text-indigo-400 block font-medium">/ 100</span>
            </div>
          </div>
          <span className="mt-2 text-xs font-semibold text-indigo-600 px-2.5 py-1 bg-indigo-50 rounded-full">
            综合匹配得分
          </span>
        </div>
      </div>

      {/* Four Dimension Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="match-report-dimensions-grid">
        {categories.map((cat, idx) => (
          <div key={idx} className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm space-y-4 hover:border-slate-200 transition-all" id={`dimension-card-${idx}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{cat.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-800 bg-slate-50 px-2 py-1 rounded">
                  {cat.data.score}分
                </span>
                {cat.data.passed ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                )}
              </div>
            </div>

            {/* Issues List */}
            <div className="space-y-1.5" id={`issues-list-${idx}`}>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                审计详情 & 潜在偏差
              </span>
              {cat.data.issues && cat.data.issues.length > 0 ? (
                <ul className="space-y-1">
                  {cat.data.issues.map((issue, iIdx) => (
                    <li key={iIdx} className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>该项表现优异，完全符合设计契约规范</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Improvement Suggestions Block */}
      <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm space-y-4" id="match-report-suggestions">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Lightbulb className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-900 text-sm">场景深度优化与修正建议</h3>
        </div>

        {sortedSuggestions.length > 0 ? (
          <div className="divide-y divide-slate-100" id="suggestions-list-container">
            {sortedSuggestions.map((sug, sIdx) => (
              <div key={sug.id || sIdx} className="py-4 flex items-start justify-between gap-4 first:pt-0 last:pb-0" id={`suggestion-item-${sIdx}`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadgeClass(sug.priority)}`}>
                      {getPriorityLabel(sug.priority)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      归类：{sug.category === 'product' ? '产品' : sug.category === 'scene' ? '场景' : sug.category === 'composition' ? '构图' : '光影'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {sug.suggestion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">
            检测结果极佳，暂无推荐的优化建议。可以直接应用进行排版。
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {onBackToRecipe && (
        <div className="flex items-center justify-center pt-2" id="report-view-actions">
          <button
            onClick={onBackToRecipe}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-all shadow-sm flex items-center gap-2"
            id="btn-back-to-recipe"
          >
            <span>返回提示词配方</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
