import React, { useState } from 'react';
import { MatchReport, MatchIssue } from '../types/schemas';
import { 
  AlertTriangle, 
  Check, 
  EyeOff, 
  Eye, 
  Award, 
  Sparkles, 
  ArrowLeft, 
  History, 
  Compass, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle,
  Clock
} from 'lucide-react';

interface MatchReportPanelProps {
  report: MatchReport | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  ignoredMatchIssueIds: string[];
  activeVersion: number | null;
  onIgnoreIssue: (issueId: string) => void;
  onUnignoreIssue: (issueId: string) => void;
  onApplyConfirmedPatch: (params: { issueIds: string[]; confirmed: boolean }) => void;
  onShowHistory: () => void;
  onBackToPreview: () => void;
  onChangeDirection: () => void;
}

const issueTypeTranslations: Record<string, string> = {
  perspective: '透视偏离',
  contact: '接触面异常/悬空',
  composition: '构图比例失调',
  copy_space: '文案留白不足',
  lighting_direction: '光源方向不一致',
  lighting_temperature: '光源色温不匹配',
  contrast: '对比度失调',
  color_separation: '色彩分离度低',
  scene_semantics: '场景语义冲突',
  decoration_competition: '摆件竞争视觉',
  series_style: '系列风格偏离',
  series_space: '系列空间冲突',
};

const severityTranslations: Record<string, string> = {
  low: '低度 (建议)',
  medium: '中度 (建议微调)',
  high: '高度 (不匹配/严重问题)',
};

const confidenceTranslations: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const MatchReportPanel: React.FC<MatchReportPanelProps> = ({
  report,
  status,
  error,
  ignoredMatchIssueIds,
  activeVersion,
  onIgnoreIssue,
  onUnignoreIssue,
  onApplyConfirmedPatch,
  onShowHistory,
  onBackToPreview,
  onChangeDirection,
}) => {
  const [pendingIssueId, setPendingIssueId] = useState<string | null>(null);
  const [pendingAll, setPendingAll] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">智能匹配分析中，正在校验产品与场景空间的一致性...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center shadow-sm">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-bold">分析出错</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center">
        <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-600 font-medium">尚未生成匹配度分析报告</p>
        <p className="text-slate-400 text-xs mt-1">请先上传实景图预览并执行智能一致性校验</p>
      </div>
    );
  }

  if (report.productSceneStatus === 'uncertain') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-800">无法确定匹配状态</h3>
            <p className="text-xs text-amber-700 mt-1">
              AI 无法绝对确定产品与生成场景的融合程度。建议您返回审查，检查视角和光影选项，或换一个场景方向。
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={onBackToPreview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回预览
              </button>
              <button
                onClick={onChangeDirection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                换一个场景方向
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter issues based on suggestions presence and ignore state
  const issuesWithPatches = report.issues.filter(i => i.suggestedPatch && i.suggestedPatch.length > 0);
  const unignoredIssuesWithPatches = issuesWithPatches.filter(i => !ignoredMatchIssueIds.includes(i.id));

  const handleAdoptSingle = (issueId: string) => {
    setPendingIssueId(issueId);
  };

  const handleConfirmSingle = () => {
    if (!pendingIssueId) return;
    try {
      setErrorMessage(null);
      onApplyConfirmedPatch({
        issueIds: [pendingIssueId],
        confirmed: true
      });
      setPendingIssueId(null);
    } catch (err: any) {
      setErrorMessage(err.message || '采纳 Patch 失败');
    }
  };

  const handleAdoptAll = () => {
    if (unignoredIssuesWithPatches.length === 0) return;
    setPendingAll(true);
  };

  const handleConfirmAll = () => {
    try {
      setErrorMessage(null);
      const issueIds = unignoredIssuesWithPatches.map(i => i.id);
      onApplyConfirmedPatch({
        issueIds,
        confirmed: true
      });
      setPendingAll(false);
    } catch (err: any) {
      setErrorMessage(err.message || '采纳 Patch 失败');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      
      {/* 顶部控制栏 */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            一致性验证与匹配分析
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            当前处于 Recipe V{activeVersion}，智能分析结果：
            <span className={`font-semibold ml-1 ${
              report.productSceneStatus === 'pass' ? 'text-green-600' : 'text-amber-600'
            }`}>
              {report.productSceneStatus === 'pass' ? '验证通过 (Pass)' : '建议优化 (Needs Adjustment)'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回预览
          </button>
          
          <button
            onClick={onShowHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            查看版本历史
          </button>

          <button
            onClick={onChangeDirection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            换方向
          </button>

          {report.productSceneStatus !== 'pass' && (
            <button
              onClick={handleAdoptAll}
              disabled={unignoredIssuesWithPatches.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all cursor-pointer ${
                unignoredIssuesWithPatches.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              title={unignoredIssuesWithPatches.length === 0 ? "没有未忽略的、包含合法建议的 Issue" : "一键采纳所有未忽略建议"}
            >
              <Check className="w-3.5 h-3.5" />
              全部采纳
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 优势 Strengths */}
      {report.strengths.length > 0 && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-emerald-500" />
            画面一致性优势
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {report.strengths.map((strength, idx) => (
              <li key={idx} className="text-xs text-emerald-700 flex items-start gap-1.5">
                <span className="text-emerald-500">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 问题 Issues */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          需优化或不匹配项目 ({report.issues.length})
        </h3>

        {report.issues.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-xl bg-slate-50">
            暂无需要优化的项目，画面完美契合！
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {report.issues.map((issue) => {
              const isIgnored = ignoredMatchIssueIds.includes(issue.id);
              const hasPatch = issue.suggestedPatch && issue.suggestedPatch.length > 0;

              return (
                <div
                  key={issue.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isIgnored
                      ? 'border-slate-200 bg-slate-50/50 opacity-60'
                      : issue.severity === 'high'
                      ? 'border-red-200 bg-red-50/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isIgnored 
                          ? 'bg-slate-200 text-slate-500'
                          : issue.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {issueTypeTranslations[issue.type] || issue.type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        严重度: {severityTranslations[issue.severity] || issue.severity} | 置信度: {confidenceTranslations[issue.confidence] || issue.confidence}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isIgnored ? (
                        <button
                          onClick={() => onUnignoreIssue(issue.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          撤销忽略
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onIgnoreIssue(issue.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="忽略此建议，该项目将不计入全部采纳"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            忽略此项
                          </button>

                          {hasPatch && (
                            <button
                              onClick={() => handleAdoptSingle(issue.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer"
                            >
                              采纳此项
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5">
                    <p>
                      <strong className="text-slate-800">问题说明：</strong>
                      {issue.description}
                    </p>
                    <p>
                      <strong className="text-slate-800">场景证据：</strong>
                      <span className="italic text-slate-500">{issue.evidence}</span>
                    </p>

                    {hasPatch && (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                          建议摘要 (JSON-Patch 操作)：
                        </p>
                        <div className="mt-1 space-y-1 text-[11px] text-slate-500 font-mono pl-4 list-disc">
                          {issue.suggestedPatch.map((op, idx) => (
                            <div key={idx}>
                              • 将 <span className="font-semibold text-slate-700">{op.path}</span> 修改为{' '}
                              <span className="font-semibold text-slate-700">{JSON.stringify(op.value)}</span>{' '}
                              ({op.reason})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      {/* 1. Single Issue Confirmation */}
      {pendingIssueId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认采纳此项修改？</h3>
            <p className="text-xs text-slate-600 mb-6">
              确认采纳这项修改并创建新的 Recipe 版本吗？此操作将立即修改 SceneRecipe 和 Prompt。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingIssueId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSingle}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                确认采纳并创建 V{activeVersion ? activeVersion + 1 : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. All Issues Confirmation */}
      {pendingAll && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认全部采纳未忽略建议？</h3>
            <p className="text-xs text-slate-600 mb-6">
              确认合并采纳当前所有 {unignoredIssuesWithPatches.length} 项未忽略的修改并创建新的 Recipe 版本吗？这将一次性生成新版提示词。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingAll(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAll}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                合并确认采纳并创建 V{activeVersion ? activeVersion + 1 : ''}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
