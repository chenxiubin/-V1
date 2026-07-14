import React from 'react';
import { 
  Box, 
  Type, 
  Tag, 
  Sparkles, 
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { RenderSnapshot, CanvasLayer } from '../types/schemas';

interface Props {
  snapshot: RenderSnapshot | null | undefined;
  productAsset?: { id: string; persistedAssetRef?: string | null } | null;
  sceneAsset?: { id: string; persistedAssetRef?: string | null } | null;
}

export const RenderSnapshotRenderer: React.FC<Props> = ({
  snapshot,
  productAsset,
  sceneAsset,
}) => {
  if (!snapshot || !snapshot.canvasDocumentSnapshot) {
    return (
      <div 
        className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-dashed border-slate-700 rounded-2xl min-h-[300px]" 
        id="snapshot-error-fallback"
      >
        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
        <h3 className="text-slate-200 font-semibold text-sm">快照数据非法或不存在</h3>
        <p className="text-slate-400 text-xs mt-1">请传入有效的渲染快照数据进行展现</p>
      </div>
    );
  }

  const { width, height, layers } = snapshot.canvasDocumentSnapshot;

  if (!Array.isArray(layers)) {
    return (
      <div 
        className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-dashed border-slate-700 rounded-2xl min-h-[300px]" 
        id="snapshot-corrupt-fallback"
      >
        <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
        <h3 className="text-slate-200 font-semibold text-sm">快照图层数据损坏</h3>
        <p className="text-slate-400 text-xs mt-1">快照中的图层数组格式不正确</p>
      </div>
    );
  }

  // Use slots from the frozen templateInstanceSnapshot
  const slots = snapshot.templateInstanceSnapshot?.variantSnapshot?.slots || [];

  // Render layers ordered by zIndex ascending (highest zIndex on top)
  const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <div className="w-full flex flex-col gap-4 bg-slate-950 text-slate-100 p-6 rounded-3xl shadow-2xl border border-slate-800" id="render-snapshot-renderer">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">生产只读静态快照预览</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
            ID: {snapshot.id.substring(0, 15)}...
          </span>
        </div>
        <div className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
          冻结尺寸: {width} × {height} px
        </div>
      </div>

      {/* The Frozen Static Canvas Container */}
      <div 
        className="relative bg-black shadow-inner rounded-2xl overflow-hidden border border-slate-900 mx-auto select-none w-full"
        style={{
          containerType: 'inline-size',
          aspectRatio: `${width} / ${height}`,
          maxHeight: '600px',
        }}
        id="snapshot-canvas-viewport"
      >
        {sortedLayers.map((layer) => {
          // If layer is marked invisible, we do not render it
          if (!layer.visible) return null;

          const slot = slots.find((s: any) => layer.id.includes(s.id) || s.id === layer.source?.assetId);
          const rect = slot?.rect || { x: layer.transform.x, y: layer.transform.y, width: 20, height: 10 };
          const isBg = layer.type === 'scene_background';
          
          const widthPercent = isBg ? (slot?.rect?.width ?? 100) : (rect.width ?? 20);
          const heightPercent = isBg ? (slot?.rect?.height ?? 100) : (rect.height ?? 10);

          const layerStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${layer.transform.x}%`,
            top: `${layer.transform.y}%`,
            width: `${widthPercent}%`,
            height: `${heightPercent}%`,
            zIndex: layer.zIndex,
            transform: `scale(${layer.transform.scale || 1}) rotate(${layer.transform.rotate || 0}deg)`,
            transformOrigin: 'center center',
          };

          const contentText = layer.content || slot?.label || '';

          return (
            <div
              key={layer.id}
              style={layerStyle}
              className="absolute pointer-events-none select-none overflow-hidden"
              id={`snapshot-layer-${layer.id}`}
            >
              {/* Scene Background Layer */}
              {layer.type === 'scene_background' && (
                sceneAsset && sceneAsset.persistedAssetRef && layer.source?.assetId === sceneAsset.id ? (
                  <img 
                    src={sceneAsset.persistedAssetRef} 
                    referrerPolicy="no-referrer"
                    alt="Snapshot Background" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 text-slate-500">
                    <ImageIcon className="w-[8cqw] h-[8cqw] text-slate-700 mb-1" />
                    <span className="text-[2.2cqw] font-semibold text-slate-500">场景背景 (占位降级)</span>
                  </div>
                )
              )}

              {/* Product Layer */}
              {layer.type === 'product' && (
                productAsset && productAsset.persistedAssetRef && layer.source?.assetId === productAsset.id ? (
                  <img 
                    src={productAsset.persistedAssetRef} 
                    referrerPolicy="no-referrer"
                    alt="Snapshot Product" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center rounded-xl p-2 text-slate-500">
                    <Box className="w-[6cqw] h-[6cqw] text-slate-700 mb-1" />
                    <span className="text-[2cqw] font-medium text-slate-500">产品主图 (占位降级)</span>
                  </div>
                )
              )}

              {/* Text Layer */}
              {layer.type === 'text' && (
                <div className="w-full h-full flex items-center justify-center text-center font-bold text-white tracking-tight leading-tight px-1">
                  <span style={{ fontSize: '4.5cqw' }}>{contentText || '文本文字'}</span>
                </div>
              )}

              {/* Selling Point Layer */}
              {layer.type === 'selling_point' && (
                <div className="w-full h-full flex items-center justify-center text-center font-semibold text-indigo-100 bg-indigo-950/90 border border-indigo-900/40 rounded-lg px-2 shadow-lg backdrop-blur-sm">
                  <span style={{ fontSize: '3cqw' }}>{contentText || '卖点文字'}</span>
                </div>
              )}

              {/* Badge Layer */}
              {layer.type === 'badge' && (
                <div className="w-full h-full flex items-center justify-center text-center font-extrabold text-white bg-rose-700 rounded-full border-2 border-white shadow-lg aspect-square">
                  <span className="uppercase tracking-wider" style={{ fontSize: '3cqw' }}>
                    {contentText || 'HOT'}
                  </span>
                </div>
              )}

              {/* Logo Layer */}
              {layer.type === 'logo' && (
                <div className="w-full h-full flex items-center justify-center text-center font-mono border border-dashed border-slate-700 text-slate-400 rounded bg-slate-900/90 px-1.5 py-0.5">
                  <span style={{ fontSize: '2.5cqw' }}>{contentText || 'BRAND LOGO'}</span>
                </div>
              )}

              {/* Decoration Layer */}
              {layer.type === 'decoration' && (
                <div className="w-full h-full flex items-center justify-center border border-dashed border-amber-600/40 bg-amber-950/20 rounded p-1">
                  <Sparkles className="w-[3cqw] h-[3cqw] text-amber-500 mr-1" />
                  <span className="font-medium text-amber-300" style={{ fontSize: '2cqw' }}>
                    {contentText || '装饰元素'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Snapshot Information Footer Metadata */}
      <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 space-y-2.5 font-mono text-[11px] text-slate-400">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-slate-500 block mb-0.5">场景配方引用 / 版本:</span>
            <span className="text-slate-300 font-bold">{snapshot.recipeId || '无'} (v{snapshot.recipeVersion ?? '-'})</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">产品资产引用 / 版本:</span>
            <span className="text-slate-300 font-bold">{snapshot.productAssetId || '无'} (v{snapshot.productAssetVersion ?? '-'})</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">模板套件引用 / 版本:</span>
            <span className="text-slate-300 font-bold">{snapshot.templateSuiteId || '无'} (v{snapshot.templateSuiteVersion ?? '-'})</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">模板变体快照:</span>
            <span className="text-slate-300">{snapshot.templateInstanceSnapshot?.variantId || '无'} ({snapshot.templateInstanceSnapshot?.variantSnapshot?.aspectRatio || '1:1'})</span>
          </div>
        </div>
        <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-[10px] text-slate-500">
          <span>层数数量: {sortedLayers.length}</span>
          <span>创建时间: {new Date(snapshot.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
