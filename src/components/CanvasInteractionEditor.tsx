import React, { useRef, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Move, 
  Maximize2, 
  Layers, 
  Box, 
  Type, 
  Tag, 
  Sparkles, 
  Image as ImageIcon,
  MousePointer,
  AlertCircle
} from 'lucide-react';
import { CanvasDocument, CanvasLayer, ProjectState } from '../types/schemas';

interface Props {
  canvasDocument: CanvasDocument | null | undefined;
  selectedLayerId: string | null;
  canvasEditingMode: 'select' | 'move' | 'scale';
  productAsset?: ProjectState['productAsset'] | null;
  sceneAsset?: ProjectState['sceneAsset'] | null;
  templateInstance?: ProjectState['templateInstance'] | null;
  onSelectLayer: (layerId: string | null) => void;
  onSetEditingMode: (mode: 'select' | 'move' | 'scale') => void;
  onUpdateLayerTransform: (layerId: string, transform: { x?: number; y?: number; scale?: number; rotate?: number }) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
}

export const CanvasInteractionEditor: React.FC<Props> = ({
  canvasDocument,
  selectedLayerId,
  canvasEditingMode,
  productAsset,
  sceneAsset,
  templateInstance,
  onSelectLayer,
  onSetEditingMode,
  onUpdateLayerTransform,
  onToggleLayerVisibility,
  onToggleLayerLock,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
    startScale: number;
    layerId: string;
    isScaling: boolean;
  } | null>(null);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!canvasDocument || !Array.isArray(canvasDocument.layers)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl min-h-[300px]" id="canvas-error-fallback">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
        <h3 className="text-slate-700 font-semibold text-sm">画布数据未就绪</h3>
        <p className="text-slate-400 text-xs mt-1">请先选择并确认模板方案</p>
      </div>
    );
  }

  const { width, height, layers } = canvasDocument;

  // Render layers ordered by zIndex ascending
  const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // Layer list for panel: descending zIndex (highest on top)
  const layerListForPanel = [...layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const slots = templateInstance?.variantSnapshot?.slots || [];

  const handleLayerMouseDown = (e: React.MouseEvent, layer: CanvasLayer, isScaleHandle = false) => {
    if (layer.locked) return;
    e.stopPropagation();
    
    onSelectLayer(layer.id);

    if (layer.type === 'scene_background' && !isScaleHandle) {
      if (canvasEditingMode !== 'move') return;
    }

    const container = containerRef.current;
    if (!container) return;

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: layer.transform.x,
      startY: layer.transform.y,
      startScale: layer.transform.scale || 1.0,
      layerId: layer.id,
      isScaling: isScaleHandle || canvasEditingMode === 'scale',
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const dragInfo = dragStartRef.current;
    if (!dragInfo) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = e.clientX - dragInfo.clientX;
    const deltaY = e.clientY - dragInfo.clientY;

    if (dragInfo.isScaling) {
      const scaleDelta = (deltaX / rect.width) * 3;
      const newScale = Math.max(0.1, Math.min(5.0, dragInfo.startScale + scaleDelta));
      onUpdateLayerTransform(dragInfo.layerId, { scale: Number(newScale.toFixed(2)) });
    } else {
      const pctDeltaX = (deltaX / rect.width) * 100;
      const pctDeltaY = (deltaY / rect.height) * 100;
      
      const newX = dragInfo.startX + pctDeltaX;
      const newY = dragInfo.startY + pctDeltaY;

      onUpdateLayerTransform(dragInfo.layerId, { 
        x: Number(newX.toFixed(1)), 
        y: Number(newY.toFixed(1)) 
      });
    }
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'scene_background': return <ImageIcon className="w-4 h-4" />;
      case 'product': return <Box className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'selling_point': return <Tag className="w-4 h-4" />;
      case 'badge': return <Sparkles className="w-4 h-4" />;
      case 'logo': return <Layers className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  const getLayerName = (layer: CanvasLayer) => {
    const slot = slots.find((s: any) => layer.id.includes(s.id) || s.id === layer.source?.assetId);
    const label = layer.content || slot?.label || '';
    switch (layer.type) {
      case 'scene_background': return 'AI 场景背景';
      case 'product': return '产品主图';
      case 'text': return `文本: ${label || '未命名文本'}`;
      case 'selling_point': return `卖点: ${label || '未命名卖点'}`;
      case 'badge': return `徽章: ${label || 'HOT'}`;
      case 'logo': return `标志: ${label || 'BRAND LOGO'}`;
      default: return `元素: ${label || '自定义图层'}`;
    }
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-2xl border border-slate-800" id="canvas-interaction-editor">
      {/* Left Canvas Preview Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Mode Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-2">交互工具箱</span>
            <div className="h-4 w-[1px] bg-slate-700 mx-1" />
            
            <button
              onClick={() => onSetEditingMode('select')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                canvasEditingMode === 'select'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="选择图层"
              id="mode-btn-select"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>选择</span>
            </button>

            <button
              onClick={() => onSetEditingMode('move')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                canvasEditingMode === 'move'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="移动图层"
              id="mode-btn-move"
            >
              <Move className="w-3.5 h-3.5" />
              <span>移动</span>
            </button>

            <button
              onClick={() => onSetEditingMode('scale')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                canvasEditingMode === 'scale'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="等比缩放"
              id="mode-btn-scale"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>等比缩放</span>
            </button>
          </div>
          
          <div className="text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/30">
            画布尺寸: <span className="font-mono text-slate-300">{width} × {height} px</span>
          </div>
        </div>

        {/* The Interactive Canvas Document */}
        <div 
          ref={containerRef}
          className="relative bg-black shadow-inner rounded-2xl overflow-hidden border border-slate-800 mx-auto select-none w-full"
          style={{
            containerType: 'inline-size',
            aspectRatio: `${width} / ${height}`,
            maxHeight: '600px',
          }}
          onClick={() => onSelectLayer(null)}
        >
          {sortedLayers.map((layer) => {
            if (!layer.visible) return null;

            const slot = slots.find((s: any) => layer.id.includes(s.id) || s.id === layer.source?.assetId);
            const rect = slot?.rect || { x: layer.transform.x, y: layer.transform.y, width: 20, height: 10 };
            const isBg = layer.type === 'scene_background';
            
            const widthPercent = isBg ? (slot?.rect?.width ?? 100) : (rect.width ?? 20);
            const heightPercent = isBg ? (slot?.rect?.height ?? 100) : (rect.height ?? 10);

            const isSelected = layer.id === selectedLayerId;

            const layerStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${layer.transform.x}%`,
              top: `${layer.transform.y}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              zIndex: layer.zIndex,
              transform: `scale(${layer.transform.scale || 1}) rotate(${layer.transform.rotate || 0}deg)`,
              transformOrigin: 'center center',
              cursor: layer.locked ? 'not-allowed' : (canvasEditingMode === 'move' ? 'move' : (canvasEditingMode === 'scale' ? 'ne-resize' : 'pointer')),
            };

            const contentText = layer.content || slot?.label || '';

            return (
              <div
                key={layer.id}
                style={layerStyle}
                onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                className={`group transition-shadow duration-150 ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 z-50' : 'hover:ring-1 hover:ring-slate-400'
                }`}
                id={`canvas-layer-el-${layer.id}`}
              >
                {/* Content Renderers */}
                {layer.type === 'scene_background' && (
                  (layer.source?.persistedAssetRef || sceneAsset?.persistedAssetRef) ? (
                    <img 
                      src={layer.source?.persistedAssetRef || sceneAsset?.persistedAssetRef} 
                      referrerPolicy="no-referrer"
                      alt="Scene Background" 
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex flex-col items-center justify-center p-4 text-white pointer-events-none">
                      <ImageIcon className="w-[8cqw] h-[8cqw] text-slate-600 mb-1" />
                      <span className="text-[2.2cqw] font-semibold text-slate-400">AI 场景背景</span>
                    </div>
                  )
                )}

                {layer.type === 'product' && (
                  (() => {
                    const baseProductUrl = layer.source?.persistedAssetRef || productAsset?.persistedAssetRef;
                    const productUrl = baseProductUrl && layer.assetVersion ? `${baseProductUrl}?v=${layer.assetVersion}` : baseProductUrl;
                    if (productUrl) {
                      const shadowStyle = layer.shadow ? (typeof layer.shadow === 'string' ? layer.shadow : 'drop-shadow(0px 15px 15px rgba(0, 0, 0, 0.35))') : 'none';
                      return (
                        <img 
                          src={productUrl} 
                          referrerPolicy="no-referrer"
                          alt="Product" 
                          className="w-full h-full object-contain pointer-events-none"
                          style={{
                            filter: shadowStyle,
                            opacity: layer.opacity !== undefined ? layer.opacity : 1,
                            mixBlendMode: (layer.blendMode || 'normal') as any,
                          }}
                        />
                      );
                    }
                    return (
                      <div className="w-full h-full border-2 border-dashed border-slate-700 bg-slate-800/80 flex flex-col items-center justify-center rounded-xl p-2 pointer-events-none">
                        <Box className="w-[6cqw] h-[6cqw] text-slate-500 mb-1" />
                        <span className="text-[2cqw] font-medium text-slate-400">产品主图</span>
                      </div>
                    );
                  })()
                )}

                {layer.type === 'text' && (
                  <div className="w-full h-full flex items-center justify-center text-center font-bold text-white tracking-tight leading-tight px-1 pointer-events-none">
                    <span style={{ fontSize: '4.5cqw' }}>{contentText || '主标题文字'}</span>
                  </div>
                )}

                {layer.type === 'selling_point' && (
                  <div className="w-full h-full flex items-center justify-center text-center font-semibold text-indigo-100 bg-indigo-900/90 border border-indigo-700/80 rounded-lg px-2 shadow-lg backdrop-blur-sm pointer-events-none">
                    <span style={{ fontSize: '3cqw' }}>{contentText || '突出核心卖点'}</span>
                  </div>
                )}

                {layer.type === 'badge' && (
                  <div className="w-full h-full flex items-center justify-center text-center font-extrabold text-white bg-rose-600 rounded-full border-2 border-white shadow-lg aspect-square pointer-events-none">
                    <span className="uppercase tracking-wider" style={{ fontSize: '3cqw' }}>
                      {contentText || 'HOT'}
                    </span>
                  </div>
                )}

                {layer.type === 'logo' && (
                  <div className="w-full h-full flex items-center justify-center text-center font-mono border border-dashed border-slate-600 text-slate-300 rounded bg-slate-800/80 px-1.5 py-0.5 pointer-events-none">
                    <span style={{ fontSize: '2.5cqw' }}>{contentText || 'BRAND LOGO'}</span>
                  </div>
                )}

                {layer.type === 'decoration' && (
                  <div className="w-full h-full flex items-center justify-center border border-dashed border-amber-500/60 bg-amber-950/40 rounded p-1 pointer-events-none">
                    <Sparkles className="w-[3cqw] h-[3cqw] text-amber-400 mr-1" />
                    <span className="font-medium text-amber-200" style={{ fontSize: '2cqw' }}>
                      {contentText || '装饰元素'}
                    </span>
                  </div>
                )}

                {/* Selected Layer Outline with Drag Handles */}
                {isSelected && !layer.locked && (
                  <>
                    {/* Scale corner handle */}
                    <div 
                      className="absolute bottom-[-6px] right-[-6px] w-4 h-4 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center cursor-se-resize shadow-md z-50 hover:bg-blue-400 active:scale-95"
                      onMouseDown={(e) => handleLayerMouseDown(e, layer, true)}
                      title="等比缩放"
                      id={`scale-handle-${layer.id}`}
                    >
                      <Maximize2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Layer Management Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-6 bg-slate-800/50 p-5 rounded-2xl border border-slate-700/40">
        <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3">
          <Layers className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-sm tracking-wide">图层管理面板</h3>
          <span className="ml-auto text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {layers.length} 个图层
          </span>
        </div>

        {/* Layers List */}
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1" id="layers-list-panel">
          {layerListForPanel.map((layer) => {
            const isSelected = layer.id === selectedLayerId;
            return (
              <div 
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600/20 border-blue-500/80' 
                    : 'bg-slate-900/40 border-slate-700/40 hover:bg-slate-700/30'
                }`}
                id={`layer-list-item-${layer.id}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                    {getLayerIcon(layer.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate text-slate-200">
                      {getLayerName(layer)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      z-index: {layer.zIndex}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pl-2">
                  {/* Visibility Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLayerVisibility(layer.id);
                    }}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      layer.visible ? 'text-slate-300 hover:bg-slate-700/80' : 'text-slate-600 bg-slate-950/20'
                    }`}
                    title={layer.visible ? "隐藏图层" : "显示图层"}
                    id={`layer-visibility-btn-${layer.id}`}
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Lock Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLayerLock(layer.id);
                    }}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      layer.locked ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 hover:bg-slate-700/80'
                    }`}
                    title={layer.locked ? "解锁图层" : "锁定图层"}
                    id={`layer-lock-btn-${layer.id}`}
                  >
                    {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Layer Info Detail Block */}
        {selectedLayer ? (
          <div className="border-t border-slate-700/60 pt-4 mt-auto" id="selected-layer-detail-info">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <span>图层详细数据 (Zod Verified)</span>
            </h4>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 space-y-2 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">图层标识:</span>
                <span className="truncate max-w-[150px] text-slate-400">{selectedLayer.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">坐标 X:</span>
                <span className="text-slate-200">{selectedLayer.transform.x}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">坐标 Y:</span>
                <span className="text-slate-200">{selectedLayer.transform.y}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">缩放比例:</span>
                <span className="text-blue-400 font-bold">{selectedLayer.transform.scale}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">锁状态:</span>
                <span>{selectedLayer.locked ? <span className="text-amber-400">已锁定</span> : <span className="text-green-400">可编辑</span>}</span>
              </div>
              {selectedLayer.source && (
                <div className="border-t border-slate-800 pt-2 mt-2 space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">资产源参照:</div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">源类别:</span>
                    <span className="text-slate-400">{selectedLayer.source.sourceType}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">资产ID:</span>
                    <span className="text-slate-400 truncate max-w-[150px]">{selectedLayer.source.assetId}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-700/60 pt-4 mt-auto text-center py-4 text-xs text-slate-500 italic">
            未选中任何图层，点击画布或列表项进行编辑
          </div>
        )}
      </div>
    </div>
  );
};
