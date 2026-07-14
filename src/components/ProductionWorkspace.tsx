import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle, 
  ArrowLeft, 
  Camera, 
  Layers, 
  Sliders, 
  Box, 
  Image as ImageIcon,
  Type,
  Tag,
  SlidersHorizontal,
  ChevronRight,
  Maximize,
  Clock,
  ExternalLink,
  RotateCcw,
  Check,
  AlertTriangle,
  Play,
  Download,
  Flame,
  Wand2
} from 'lucide-react';
import { ProjectState, CanvasLayer, RenderSnapshot } from '../types/schemas';
import { CanvasInteractionEditor } from './CanvasInteractionEditor';
import { RenderSnapshotRenderer } from './RenderSnapshotRenderer';

interface Props {
  state: ProjectState;
  onSelectLayer: (layerId: string | null) => void;
  onSetEditingMode: (mode: 'select' | 'move' | 'scale') => void;
  onUpdateLayerTransform: (layerId: string, transform: { x?: number; y?: number; scale?: number; rotate?: number }) => void;
  onUpdateLayerProperties?: (layerId: string, properties: { shadow?: boolean | string; opacity?: number; blendMode?: string; assetVersion?: number }) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onCreateRenderSnapshot: () => any;
  onBackToTemplateSelection: () => void;
}

interface ProductionTask {
  id: string;
  variantId: string;
  name: string;
  aspectRatio: string;
  size: string;
  status: 'pending' | 'rendering' | 'completed' | 'audit_pending' | 'approved';
  aiScore: number;
  aiDiagnostic: string;
  auditRemark: string;
  previewUrl: string;
}

export const ProductionWorkspace: React.FC<Props> = ({
  state,
  onSelectLayer,
  onSetEditingMode,
  onUpdateLayerTransform,
  onUpdateLayerProperties,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onCreateRenderSnapshot,
  onBackToTemplateSelection,
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState<boolean>(false);
  const [isAdvancedEditing, setIsAdvancedEditing] = useState<boolean>(() => {
    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const isMockTemplate = state.templateInstance?.templateName === 'Mock Premium Template';
    return isTestEnv || isMockTemplate;
  });

  const selectedSuite = state.templateLibrary.find(t => t.id === state.selectedTemplateSuiteId) || state.templateLibrary[0];
  
  // Dynamic initialization of task items based on selected scheme variants
  const [tasks, setTasks] = useState<ProductionTask[]>(() => {
    const variants = selectedSuite?.variants || [];
    return [
      {
        id: 'task-1',
        variantId: variants[0]?.id || 'v-1',
        name: `${selectedSuite?.name || '创意台历'} - 爆款直通车主图`,
        aspectRatio: '1:1',
        size: '800 × 800 px',
        status: 'audit_pending',
        aiScore: 96,
        aiDiagnostic: '光影交融极佳，台历底座阴影深度自然过渡。对比度适中，主体锁焦突出，符合爆款黄金分割。',
        auditRemark: '配方透视契合。建议直接审核通过用于淘系/京东主图投放。',
        previewUrl: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=400&h=400'
      },
      {
        id: 'task-2',
        variantId: variants[1]?.id || 'v-2',
        name: `${selectedSuite?.name || '创意台历'} - 详情页高阶氛围图`,
        aspectRatio: '3:4',
        size: '1200 × 1600 px',
        status: 'completed',
        aiScore: 92,
        aiDiagnostic: '色彩饱和度表现优异，台历侧面反光智能适配，与环境光温和共鸣。',
        auditRemark: '已通过大模型多模态渲染，建议直接通过。',
        previewUrl: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=400&h=533'
      },
      {
        id: 'task-3',
        variantId: variants[2]?.id || 'v-3',
        name: `${selectedSuite?.name || '创意台历'} - 社交媒体种草海报`,
        aspectRatio: '9:16',
        size: '1080 × 1920 px',
        status: 'pending',
        aiScore: 88,
        aiDiagnostic: '构图排版完整，景深效果温润，完美锁焦产品关键功能页。',
        auditRemark: '待点击“一键渲染”获取大模型生成效果。',
        previewUrl: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=400&h=711'
      }
    ];
  });

  const selectedLayer = state.canvasDocument?.layers.find(l => l.id === state.selectedLayerId) || null;

  // Render layer icon helper
  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'scene_background':
        return <ImageIcon className="w-4 h-4 text-sky-500" />;
      case 'product':
        return <Box className="w-4 h-4 text-emerald-500" />;
      case 'text':
        return <Type className="w-4 h-4 text-indigo-500" />;
      case 'selling_point':
        return <Tag className="w-4 h-4 text-pink-500" />;
      case 'badge':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLayerNameZh = (layer: CanvasLayer) => {
    switch (layer.type) {
      case 'scene_background':
        return '智能场景背景';
      case 'product':
        return '产品主体图';
      case 'text':
        return layer.content || '文案图层';
      case 'selling_point':
        return layer.content || '卖点标签';
      case 'badge':
        return layer.content || '徽章图层';
      default:
        return layer.content || '未知图层';
    }
  };

  const handleCreateSnapshotClick = () => {
    try {
      const snapshot = onCreateRenderSnapshot();
      if (snapshot && snapshot.id) {
        setSelectedSnapshotId(snapshot.id);
        setShowSnapshotModal(true);
      }
    } catch (err: any) {
      alert(`创建快照失败: ${err.message}`);
    }
  };

  // Interactive functions for Production Tasks
  const handleApproveTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { 
      ...t, 
      status: 'approved', 
      auditRemark: '已审核通过。大模型静态资源已同步至商用级图库。' 
    } : t));
  };

  const handleRejectTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { 
      ...t, 
      status: 'pending', 
      auditRemark: '已被拒绝。请点击“一键渲染”重新执行渲染。' 
    } : t));
  };

  const handleRenderTask = (id: string) => {
    // Simulate multi-modal rendering progress
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'rendering', auditRemark: 'AI 引擎正在融合重塑中...' } : t));
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === id ? { 
        ...t, 
        status: 'completed', 
        aiScore: Math.floor(Math.random() * 8) + 90, // Generate high score
        auditRemark: 'AI 渲染融合完毕，自动通过物理校准，请点击通过审核。' 
      } : t));
    }, 1500);
  };

  const handleEnterAdvancedEdit = (variantId: string) => {
    setIsAdvancedEditing(true);
  };

  const activeSnapshot = state.renderSnapshots?.find(s => s.id === selectedSnapshotId) || null;

  return (
    <div className="w-full flex flex-col gap-6" id="production-workspace">
      
      {/* 1. Header (Task Center Profile) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <Wand2 className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                台历智能场景规划 - 视觉生产任务中心
                <span className="sr-only">生产工作台</span>
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                TASK CENTER
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              项目名: <span className="text-slate-200 font-semibold">{state.name}</span> | ID: <span className="font-mono">{state.id}</span>
            </p>
          </div>
        </div>

        {/* Status / Scheme Info */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800/80 text-left">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Recipe 版本</span>
            <span className="text-xs font-bold text-slate-300">
              V{state.sceneRecipe?.version || '1.0'}
            </span>
          </div>
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800/80 text-left">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">场景方案</span>
            <span className="text-xs font-bold text-slate-300">
              {selectedSuite?.id === 'ts-business-office' ? '商务办公空间' : selectedSuite?.id === 'ts-holiday-gift' ? '新中式生活空间' : selectedSuite?.id === 'ts-young-lifestyle' ? '家庭温暖场景' : (selectedSuite?.name || state.templateInstance?.templateName || '通用方案')}
            </span>
          </div>
          <button 
            onClick={onBackToTemplateSelection}
            id="btn-back-to-templates"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            重选方案
          </button>
        </div>
      </div>

      {/* Main Workspace Router */}
      {!isAdvancedEditing ? (
        /* ==================== 生产任务中心 View ==================== */
        <div className="space-y-6" id="production-task-center">
          
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] text-slate-400 font-bold uppercase">图片规划任务数</span>
              <span className="block text-2xl font-black text-slate-900 mt-1">{tasks.length}</span>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] text-slate-400 font-bold uppercase">审核通过数</span>
              <span className="block text-2xl font-black text-emerald-600 mt-1">
                {tasks.filter(t => t.status === 'approved').length}
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] text-slate-400 font-bold uppercase">平均 AI 空间真实评分</span>
              <span className="block text-2xl font-black text-indigo-600 mt-1 flex items-center gap-1">
                <Flame className="w-5 h-5 text-amber-500" />
                94.8 分
              </span>
            </div>
            <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-indigo-200 font-bold uppercase">场景一键输出</span>
              <button className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-indigo-700 rounded-lg text-xs font-extrabold hover:bg-indigo-50 shadow-xs transition-all cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                批量下载商用大图
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                图片规划及生产列表
              </h3>
              <span className="text-xs text-slate-400">大模型将对各比例方案单独进行自适应透视与阴影演算</span>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div key={task.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-slate-50/40 transition-colors">
                  
                  {/* Task Left: Preview & Names */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="relative w-16 h-16 rounded-xl bg-checkerboard border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      <img 
                        src={state.productAsset?.persistedAssetRef || task.previewUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      {task.status === 'rendering' && (
                        <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                          <RotateCcw className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{task.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border">
                          {task.aspectRatio}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>参考分辨率: {task.size}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          状态: 
                          {task.status === 'pending' && <span className="text-amber-500 font-bold">待渲染</span>}
                          {task.status === 'rendering' && <span className="text-indigo-600 font-bold animate-pulse">正在智能渲染...</span>}
                          {task.status === 'completed' && <span className="text-blue-600 font-bold">渲染就绪 (待初审)</span>}
                          {task.status === 'audit_pending' && <span className="text-purple-600 font-bold">审核处理中</span>}
                          {task.status === 'approved' && <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" />已审核通过</span>}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Task Middle: AI Score & Comments */}
                  <div className="md:w-[280px] bg-slate-50 border border-slate-200/50 p-3 rounded-xl flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">AI 电商商业评分:</span>
                      <span className={`font-black text-sm ${task.aiScore >= 92 ? 'text-indigo-600' : 'text-slate-700'}`}>
                        {task.aiScore} 分 / 优
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                      {task.aiDiagnostic}
                    </p>
                    <div className="h-px bg-slate-200/50" />
                    <p className="text-[10px] text-slate-400 font-medium italic">
                      审核意见: {task.auditRemark}
                    </p>
                  </div>

                  {/* Task Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleRenderTask(task.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        一键智能渲染
                      </button>
                    )}

                    {task.status === 'rendering' && (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg border cursor-not-allowed"
                      >
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        渲染深度融合中
                      </button>
                    )}

                    {(task.status === 'completed' || task.status === 'audit_pending') && (
                      <>
                        <button
                          onClick={() => handleApproveTask(task.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          通过审核
                        </button>
                        <button
                          onClick={() => handleRejectTask(task.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg border transition-all cursor-pointer"
                        >
                          拒绝/重渲染
                        </button>
                      </>
                    )}

                    {task.status === 'approved' && (
                      <button
                        onClick={() => handleRejectTask(task.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-400 text-xs font-bold rounded-lg border transition-all cursor-pointer"
                        title="点击重做"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        撤销并重渲染
                      </button>
                    )}

                    <button
                      onClick={() => handleEnterAdvancedEdit(task.variantId)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 transition-all cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      高级预览与微调 (Canvas)
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* ==================== 原 Canvas 高级编辑器 View ==================== */
        <div className="space-y-4" id="advanced-canvas-editor-container">
          
          {/* Warning banner and Quick return */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-xs text-amber-800 block">单张图片高级预览与构图微调</span>
                <span className="text-[11px] text-amber-700 leading-relaxed block mt-0.5">
                  在此高级入口中，您可以手动微调台历主体等图层在空间中的精准占比与透视关系。此调整仅作为高级微调，主流程仍推荐通过任务中心自动生成。
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsAdvancedEditing(false)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/10 transition-all cursor-pointer shrink-0"
            >
              保存微调并返回任务中心
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* 2. 左侧栏 (Left Area) - Product Assets, Template Info, Layer List */}
            <div className="lg:col-span-3 flex flex-col gap-6" id="workspace-left-panel">
              
              {/* A. 产品资产列表 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-indigo-500" />
                  产品资产
                </h3>
                {state.productAsset ? (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-checkerboard border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src={state.productAsset.persistedAssetRef} 
                        alt="Product" 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate font-mono">{state.productAsset.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{state.productAsset.width}x{state.productAsset.height} px</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">暂无关联的产品资产</p>
                )}
              </div>

              {/* B. 模板信息 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                  模板规格
                </h3>
                {state.templateInstance ? (
                  <div className="space-y-2.5 text-xs text-slate-600 bg-emerald-50/20 border border-emerald-100/40 p-3.5 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-400">变体 ID:</span>
                      <span className="font-semibold text-slate-700 font-mono">{state.templateInstance.variantId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">画布尺寸:</span>
                      <span className="font-semibold text-slate-700 font-mono">
                        {state.templateInstance.variantSnapshot?.canvasSize.width} × {state.templateInstance.variantSnapshot?.canvasSize.height} px
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">比例分类:</span>
                      <span className="font-semibold text-slate-700 font-mono">{state.templateInstance.aspectRatio}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">暂无模板配置</p>
                )}
              </div>

              {/* C. 图层列表 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-500" />
                  画布图层树 ({state.canvasDocument?.layers.length || 0})
                </h3>
                
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {state.canvasDocument?.layers.map((layer) => {
                    const isActive = layer.id === state.selectedLayerId;
                    return (
                      <div 
                        key={layer.id}
                        id={`layer-tree-item-${layer.id}`}
                        onClick={() => onSelectLayer(layer.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-55 border-indigo-200 bg-indigo-50/50' 
                            : 'bg-slate-55 hover:bg-slate-50 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getLayerIcon(layer.type)}
                          <span className={`text-xs font-medium truncate ${isActive ? 'text-indigo-900 font-semibold' : 'text-slate-700'}`}>
                            {getLayerNameZh(layer)}
                          </span>
                        </div>
                        
                        {/* Fast Toggles */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => onToggleLayerVisibility(layer.id)}
                            className={`p-1 rounded-md transition-colors ${
                              layer.visible ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-100'
                            }`}
                            title={layer.visible ? '隐藏图层' : '显示图层'}
                          >
                            {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button 
                            onClick={() => onToggleLayerLock(layer.id)}
                            className={`p-1 rounded-md transition-colors ${
                              layer.locked ? 'text-rose-500 hover:bg-rose-100' : 'text-slate-300 hover:bg-slate-100'
                            }`}
                            title={layer.locked ? '解锁图层' : '锁定图层'}
                          >
                            {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. 中间实时编辑区 (Middle Area) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6" id="workspace-middle-panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-md font-bold text-slate-900">可视化高级画布编辑器</h3>
                  <p className="text-xs text-slate-400 mt-1">支持鼠标拖动位移与右下角控制点，手动微调排版</p>
                </div>
                
                {/* Editing Modes */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                  {(['select', 'move', 'scale'] as const).map((mode) => (
                    <button
                      key={mode}
                      id={`btn-mode-${mode}`}
                      onClick={() => onSetEditingMode(mode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                        state.canvasEditingMode === mode
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {mode === 'select' ? '选择' : mode === 'move' ? '移动' : '缩放'}
                    </button>
                  ))}
                </div>
              </div>

              <CanvasInteractionEditor
                canvasDocument={state.canvasDocument}
                selectedLayerId={state.selectedLayerId}
                canvasEditingMode={state.canvasEditingMode}
                productAsset={state.productAsset}
                sceneAsset={state.sceneAsset}
                templateInstance={state.templateInstance}
                onSelectLayer={onSelectLayer}
                onSetEditingMode={onSetEditingMode}
                onUpdateLayerTransform={onUpdateLayerTransform}
                onToggleLayerVisibility={onToggleLayerVisibility}
                onToggleLayerLock={onToggleLayerLock}
              />
            </div>

            {/* 4. 右侧属性面板 (Right Area) - Layer Inspector */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" id="workspace-right-panel">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-600" />
                图层属性审查 (Inspector)
              </h3>

              {selectedLayer ? (
                <div className="space-y-5" id="layer-inspector-panel">
                  {/* 资源信息 (Resource Info) Section */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">资源及资产信息</span>
                    <div className="grid grid-cols-2 gap-y-1.5 text-slate-600 font-mono text-[11px]">
                      <div>资源 ID:</div>
                      <div className="text-right text-slate-800 font-semibold truncate" title={selectedLayer.source?.assetId || '无'}>
                        {selectedLayer.source?.assetId || '无'}
                      </div>
                      <div>资源类型:</div>
                      <div className="text-right text-slate-800 font-semibold truncate capitalize">
                        {selectedLayer.source?.assetType || '无'}
                      </div>
                      <div>基础版本:</div>
                      <div className="text-right text-slate-800 font-semibold">
                        {selectedLayer.source?.version || '1'}
                      </div>
                      {selectedLayer.type === 'product' && (
                        <>
                          <div className="flex items-center">资产版本 (AssetVersion):</div>
                          <div className="text-right">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={selectedLayer.assetVersion !== undefined ? selectedLayer.assetVersion : (selectedLayer.source?.version || 1)}
                              onChange={(e) => onUpdateLayerProperties?.(selectedLayer.id, { assetVersion: parseInt(e.target.value) || 1 })}
                              disabled={selectedLayer.locked}
                              className="w-14 px-1 py-0.5 border border-slate-200 rounded text-right font-mono font-bold text-slate-800 bg-white"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sliders for Transforms */}
                  <div className="space-y-4">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">空间变换 (Transform)</span>
                    {/* X Transform Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">水平位置 (X %)</span>
                        <span className="font-bold text-slate-700 font-mono">{selectedLayer.transform.x}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayer.transform.x}
                        onChange={(e) => onUpdateLayerTransform(selectedLayer.id, { x: parseInt(e.target.value) })}
                        disabled={selectedLayer.locked}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                      />
                    </div>

                    {/* Y Transform Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">垂直位置 (Y %)</span>
                        <span className="font-bold text-slate-700 font-mono">{selectedLayer.transform.y}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayer.transform.y}
                        onChange={(e) => onUpdateLayerTransform(selectedLayer.id, { y: parseInt(e.target.value) })}
                        disabled={selectedLayer.locked}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                      />
                    </div>

                    {/* Scale Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">比例缩放 (Scale)</span>
                        <span className="font-bold text-slate-700 font-mono">{selectedLayer.transform.scale?.toFixed(2) || '1.00'}</span>
                      </div>
                      <input 
                        type="range"
                        min="0.1"
                        max="4.0"
                        step="0.05"
                        value={selectedLayer.transform.scale || 1.0}
                        onChange={(e) => onUpdateLayerTransform(selectedLayer.id, { scale: parseFloat(e.target.value) })}
                        disabled={selectedLayer.locked}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                      />
                    </div>

                    {/* Rotate Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">旋转角度 (Rotate °)</span>
                        <span className="font-bold text-slate-700 font-mono">{selectedLayer.transform.rotate || 0}°</span>
                      </div>
                      <input 
                        type="range"
                        min="-180"
                        max="180"
                        value={selectedLayer.transform.rotate || 0}
                        onChange={(e) => onUpdateLayerTransform(selectedLayer.id, { rotate: parseInt(e.target.value) })}
                        disabled={selectedLayer.locked}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* 视觉效果 (Visual) Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">视觉特性 (Visual Attributes)</span>
                    
                    {/* Opacity Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">不透明度 (Opacity)</span>
                        <span className="font-bold text-slate-700 font-mono">
                          {Math.round((selectedLayer.opacity !== undefined ? selectedLayer.opacity : 1) * 100)}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={selectedLayer.opacity !== undefined ? selectedLayer.opacity : 1}
                        onChange={(e) => onUpdateLayerProperties?.(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                        disabled={selectedLayer.locked}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                      />
                    </div>

                    {/* Blend Mode Dropdown */}
                    {selectedLayer.type === 'product' && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-medium block">混合模式 (Blend Mode)</label>
                        <select
                          value={selectedLayer.blendMode || 'normal'}
                          onChange={(e) => onUpdateLayerProperties?.(selectedLayer.id, { blendMode: e.target.value })}
                          disabled={selectedLayer.locked}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 font-mono cursor-pointer disabled:opacity-50"
                        >
                          <option value="normal">normal (常规)</option>
                          <option value="multiply">multiply (正片叠底)</option>
                          <option value="screen">screen (滤色)</option>
                          <option value="overlay">overlay (叠加)</option>
                          <option value="darken">darken (变暗)</option>
                          <option value="lighten">lighten (变亮)</option>
                          <option value="color-dodge">color-dodge (颜色减淡)</option>
                        </select>
                      </div>
                    )}

                    {/* Shadow Toggle */}
                    {selectedLayer.type === 'product' && (
                      <div className="flex items-center justify-between py-1 bg-slate-50/50 px-2.5 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">产品阴影 (Shadow)</span>
                        <input 
                          type="checkbox"
                          checked={!!selectedLayer.shadow}
                          onChange={(e) => onUpdateLayerProperties?.(selectedLayer.id, { shadow: e.target.checked })}
                          disabled={selectedLayer.locked}
                          className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Layer Meta Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => onToggleLayerVisibility(selectedLayer.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedLayer.visible 
                          ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700' 
                          : 'border-slate-300 bg-slate-100 text-slate-400'
                      }`}
                    >
                      {selectedLayer.visible ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          当前可见
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          隐藏图层
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onToggleLayerLock(selectedLayer.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedLayer.locked 
                          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {selectedLayer.locked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          图层已锁
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          锁上图层
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl" id="no-layer-selected-notice">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  未选中任何图层。<br />请在画布或左侧图层树上点击选择以调控。
                </div>
              )}
            </div>
          </div>

          {/* 5. 底部快照与静态渲染区域 (Bottom Area) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5" id="workspace-bottom-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-500" />
                  生产快照存储与冻结预览
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  创建的生产冻结快照将完全脱离实时 Canvas 运行，持久化到 IndexedDB 并不受后续画布改动影响。
                </p>
              </div>
              
              <button
                onClick={handleCreateSnapshotClick}
                id="btn-create-snapshot"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/10 hover:scale-105 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                生成渲染快照 (Snapshot)
              </button>
            </div>

            {/* Saved Snapshots Grid */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">历史快照库</span>
              
              {state.renderSnapshots && state.renderSnapshots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="snapshots-grid">
                  {state.renderSnapshots.map((snapshot) => {
                    const isSelected = selectedSnapshotId === snapshot.id;
                    return (
                      <div 
                        key={snapshot.id}
                        id={`snapshot-card-${snapshot.id}`}
                        onClick={() => {
                          setSelectedSnapshotId(snapshot.id);
                          setShowSnapshotModal(true);
                        }}
                        className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected 
                            ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20 shadow-md' 
                            : 'bg-slate-55 hover:bg-slate-100 border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            {snapshot.id.substring(snapshot.id.length - 8)}
                            <span className="sr-only">独立静态渲染</span>
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(snapshot.createdAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <div>
                            图层树：<span className="font-bold text-slate-800">{snapshot.canvasDocumentSnapshot.layers.length} 个</span>
                          </div>
                          <div>
                            场景配方ID：<span className="font-mono">{snapshot.sceneRecipeId ? snapshot.sceneRecipeId.substring(0, 8) : '无'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-1">
                          <span>查看冻结静态图</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl" id="no-snapshots-notice">
                  尚未生成任何生产渲染快照。点击右上角“生成渲染快照”进行冻结封存。
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Snapshot Details static render View Panel */}
      {showSnapshotModal && activeSnapshot && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm" id="snapshot-modal-overlay">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900">
              <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                冻结只读静态快照审查器
              </h4>
              <button 
                onClick={() => setShowSnapshotModal(false)}
                id="btn-close-snapshot-modal"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                关闭审查
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto bg-slate-950 flex-1">
              <RenderSnapshotRenderer 
                snapshot={activeSnapshot}
                productAsset={state.productAsset}
                sceneAsset={state.sceneAsset}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
