import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, AlertCircle, Info, Check, Image as ImageIcon, FileJson, Server, Activity, ArrowRight, Database } from 'lucide-react';
import { ModelDiscoveryClient } from '../services/modelDiscoveryClient';
import type { ModelDiscoveryResult, DiscoveredModel } from '../../shared/aiModelContracts';
import { useModelSettings } from '../context/ModelSettingsContext';

interface ModelCenterPanelProps {
  onClose: () => void;
}

export function ModelCenterPanel({ onClose }: ModelCenterPanelProps) {
  const { currentModelId } = useModelSettings();
  const [data, setData] = useState<ModelDiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string; retryable?: boolean } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchModels = async (refresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await ModelDiscoveryClient.fetchModels(refresh);
      setData(result);
    } catch (err: any) {
      setError({
        message: err.message,
        code: err.code,
        retryable: err.retryable
      });
    } finally {
      setLoading(false);
    }
  };

  // Init fetch - run ONCE
  useEffect(() => {
    fetchModels();
  }, []); // Empty dependency array to ensure it only runs once on mount

  // Keydown listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!data && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-center-title">
        <div ref={panelRef} className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600">正在加载模型列表...</p>
        </div>
      </div>
    );
  }

  const activeModelId = currentModelId || data?.currentConfiguredModelId || 'gemini-3.5-flash';
  const currentModel = data?.models.find(m => m.id === activeModelId);
  const eligibleModels = data?.models.filter(m => m.compatibility !== 'incompatible' && m.id !== activeModelId) || [];
  const stableModels = eligibleModels.filter(m => m.compatibility === 'compatible' && m.releaseChannel === 'stable');
  const previewModels = eligibleModels.filter(m => m.compatibility === 'compatible' && (m.releaseChannel === 'preview' || m.releaseChannel === 'experimental'));
  const unknownModels = eligibleModels.filter(m => m.compatibility === 'unknown');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="model-center-title" onClick={onClose}>
      <div ref={panelRef} className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 id="model-center-title" className="text-lg font-semibold text-slate-800">模型中心</h2>
            <p className="text-sm text-slate-500 mt-0.5">根据当前项目的 Gemini API Key 获取可访问的多模态模型。</p>
          </div>
          <button onClick={onClose} aria-label="关闭模型中心" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* Status Bar */}
          <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">API Key:</span>
                {data?.apiKeyConfigured ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <Check className="w-4 h-4" /> 已配置
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                    <AlertCircle className="w-4 h-4" /> 未配置
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">当前运行模型:</span>
                <span className="font-mono text-slate-700 font-medium">{activeModelId}</span>
              </div>
              {data?.fetchedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">更新时间:</span>
                  <span className="text-slate-700">{new Date(data.fetchedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
            <button 
              aria-label="刷新模型列表"
              onClick={() => fetchModels(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新列表
            </button>
          </div>

          {/* Stale Cache Notice */}
          {data?.stale && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">数据可能已过期</h4>
                <p className="text-sm mt-1 opacity-90">由于上游服务暂时不可用，当前显示的是缓存数据。({data.refreshError})</p>
              </div>
            </div>
          )}

          {/* Quota Notice */}
          <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
            <div>
              <h4 className="font-medium text-indigo-900">官方今日剩余额度无法通过接口获取</h4>
              <p className="text-sm mt-1 text-indigo-700">请前往 Google AI Studio 查看项目的实际 RPM、TPM 和每日限额。</p>
            </div>
          </div>

          {/* Error Message if no data */}
          {error && !data && (
            <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-rose-800">{error.message}</h3>
              {error.code && <p className="text-sm text-rose-600 mt-1 font-mono">{error.code}</p>}
              {error.retryable && (
                <button 
                  onClick={() => fetchModels(true)}
                  className="mt-4 px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-lg text-sm font-medium hover:bg-rose-50"
                >
                  重试
                </button>
              )}
            </div>
          )}

          {/* Models List */}
          {data && (
            <div className="space-y-8">
              {currentModel && (
                <ModelSection 
                  title="当前运行模型" 
                  models={[currentModel]} 
                  isCurrent={true}
                />
              )}
              
              {stableModels.length > 0 && (
                <ModelSection 
                  title="其他稳定多模态模型 (Stable)" 
                  models={stableModels} 
                />
              )}

              {previewModels.length > 0 && (
                <ModelSection 
                  title="预览/实验性多模态模型 (Preview & Experimental)" 
                  models={previewModels} 
                />
              )}

              {unknownModels.length > 0 && (
                <details className="group border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <summary className="px-5 py-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between list-none">
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-slate-400" />
                      能力待确认模型 ({unknownModels.length})
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full group-open:hidden">点击展开</span>
                  </summary>
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                    <div className="grid gap-3">
                      {unknownModels.map(model => (
                        <ModelCard key={model.id} model={model} />
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelSection({ title, models, isCurrent = false }: { key?: React.Key, title: string, models: DiscoveredModel[], isCurrent?: boolean }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        {isCurrent ? <Activity className="w-4 h-4 text-emerald-500" /> : <Server className="w-4 h-4" />}
        {title}
      </h3>
      <div className="grid gap-3">
        {models.map(model => (
          <ModelCard key={model.id} model={model} isCurrent={isCurrent} />
        ))}
      </div>
    </section>
  );
}

function ModelCard({ model, isCurrent = false }: { key?: React.Key, model: DiscoveredModel, isCurrent?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${isCurrent ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-800">{model.displayName}</h4>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{model.id}</span>
            {isCurrent && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                当前运行中
              </span>
            )}
            {!isCurrent && model.releaseChannel === 'preview' && (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Preview</span>
            )}
            {!isCurrent && model.releaseChannel === 'experimental' && (
              <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Experimental</span>
            )}
            {!isCurrent && model.releaseChannel === 'stable' && (
              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Stable</span>
            )}
          </div>
          {model.description && (
            <p className="text-sm text-slate-600 line-clamp-1 max-w-2xl" title={model.description}>{model.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {model.capabilities.imageInput && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs" title="支持图片理解">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> 图片理解
            </span>
          )}
          {model.capabilities.structuredOutput && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs" title="支持结构化 JSON 输出">
              <FileJson className="w-3.5 h-3.5 text-slate-400" /> 结构化 JSON
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 border border-slate-100 rounded text-xs font-mono">
            {(model.inputTokenLimit / 1000).toFixed(0)}k <ArrowRight className="w-3 h-3" /> {(model.outputTokenLimit / 1000).toFixed(0)}k
          </span>
        </div>
      </div>
      {model.capabilities.multimodalStatus === 'unknown' && (
        <p className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 inline-block">
          该模型的多模态能力待确认，可能不支持直接分析图片。
        </p>
      )}
    </div>
  );
}
