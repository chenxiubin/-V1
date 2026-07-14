import React from 'react';
import { Image as ImageIcon, Box, Type, Tag, HelpCircle, Sparkles, AlertCircle } from 'lucide-react';
import { CanvasDocument, ProjectState } from '../types/schemas';

interface Props {
  canvasDocument: CanvasDocument | null | undefined;
  productAsset?: ProjectState['productAsset'] | null;
  sceneAsset?: ProjectState['sceneAsset'] | null;
  templateInstance?: ProjectState['templateInstance'] | null;
}

export const CanvasPreviewRenderer: React.FC<Props> = ({
  canvasDocument,
  productAsset,
  sceneAsset,
  templateInstance,
}) => {
  // Safe degradation check for invalid/null CanvasDocument
  if (!canvasDocument || !Array.isArray(canvasDocument.layers)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl min-h-[300px]">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
        <h3 className="text-slate-700 font-semibold text-sm">画布数据不可用或格式损坏</h3>
        <p className="text-slate-400 text-xs mt-1">已进行降级容错，请重新生成或选择模板</p>
      </div>
    );
  }

  const { width, height, layers } = canvasDocument;
  
  // Sort layers by zIndex ascending to guarantee correct rendering order
  const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // Extract slots from template instance snapshot to retrieve original design dimensions (rect width/height)
  const slots = templateInstance?.variantSnapshot?.slots || [];

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div 
        className="relative bg-white shadow-lg rounded-2xl overflow-hidden border border-slate-200/80 mx-auto select-none"
        style={{
          containerType: 'inline-size',
          aspectRatio: `${width} / ${height}`,
          width: '100%',
          maxWidth: `${width}px`,
        }}
      >
        {sortedLayers.map((layer) => {
          if (!layer.visible) return null;

          // Resolve slot mapping to get layout percentage bounds
          const slot = slots.find((s: any) => layer.id.includes(s.id) || s.id === layer.source?.assetId);
          
          // Default bounds fallback
          const rect = slot?.rect || { x: layer.transform.x, y: layer.transform.y, width: 20, height: 10 };
          const isBg = layer.type === 'scene_background';
          
          const widthPercent = isBg ? (slot?.rect?.width ?? 100) : (rect.width ?? 20);
          const heightPercent = isBg ? (slot?.rect?.height ?? 100) : (rect.height ?? 10);

          // Combined transform styles
          const layerStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${layer.transform.x}%`,
            top: `${layer.transform.y}%`,
            width: `${widthPercent}%`,
            height: `${heightPercent}%`,
            zIndex: layer.zIndex,
            transform: `scale(${layer.transform.scale || 1}) rotate(${layer.transform.rotate || 0}deg)`,
            transformOrigin: 'center center',
            transition: 'all 0.2s ease-out',
          };

          const contentText = layer.content || slot?.label || '';

          // Render Layer Types
          switch (layer.type) {
            case 'scene_background': {
              const bgUrl = layer.source?.persistedAssetRef || sceneAsset?.persistedAssetRef;
              if (bgUrl) {
                return (
                  <div key={layer.id} style={layerStyle} className="pointer-events-none">
                    <img 
                      src={bgUrl} 
                      referrerPolicy="no-referrer"
                      alt="Scene Background" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              }
              return (
                <div 
                  key={layer.id} 
                  style={layerStyle}
                  className="bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex flex-col items-center justify-center p-4 text-white pointer-events-none"
                >
                  <ImageIcon className="w-[8cqw] h-[8cqw] text-slate-500 mb-2" />
                  <span className="text-[2.5cqw] font-semibold text-slate-400">AI 场景背景（待生成）</span>
                </div>
              );
            }

            case 'product': {
              const baseProductUrl = layer.source?.persistedAssetRef || productAsset?.persistedAssetRef;
              const productUrl = baseProductUrl && layer.assetVersion ? `${baseProductUrl}?v=${layer.assetVersion}` : baseProductUrl;
              if (productUrl) {
                const shadowStyle = layer.shadow ? (typeof layer.shadow === 'string' ? layer.shadow : 'drop-shadow(0px 15px 15px rgba(0, 0, 0, 0.35))') : 'none';
                return (
                  <div key={layer.id} style={layerStyle} className="pointer-events-none">
                    <img 
                      src={productUrl} 
                      referrerPolicy="no-referrer"
                      alt="Product" 
                      className="w-full h-full object-contain"
                      style={{
                        filter: shadowStyle,
                        opacity: layer.opacity !== undefined ? layer.opacity : 1,
                        mixBlendMode: (layer.blendMode || 'normal') as any,
                      }}
                    />
                  </div>
                );
              }
              return (
                <div 
                  key={layer.id} 
                  style={layerStyle}
                  className="border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center rounded-xl p-2 pointer-events-none"
                >
                  <Box className="w-[6cqw] h-[6cqw] text-slate-400 mb-1" />
                  <span className="text-[2cqw] font-medium text-slate-500">产品PNG（未加载）</span>
                </div>
              );
            }

            case 'text': {
              return (
                <div 
                  key={layer.id} 
                  style={layerStyle}
                  className="flex items-center justify-center text-center font-bold text-slate-800 tracking-tight leading-tight px-2"
                >
                  <span style={{ fontSize: '4.5cqw' }}>{contentText || '主标题文字'}</span>
                </div>
              );
            }

            case 'selling_point': {
              return (
                <div 
                  key={layer.id} 
                  style={layerStyle}
                  className="flex items-center justify-center text-center font-semibold text-indigo-900 bg-indigo-50/90 hover:bg-indigo-50 border border-indigo-200/80 rounded-lg px-2 py-1 shadow-sm backdrop-blur-sm"
                >
                  <span style={{ fontSize: '3cqw' }}>{contentText || '突出核心卖点'}</span>
                </div>
              );
            }

            case 'badge': {
              return (
                <div 
                  key={layer.id} 
                  style={layerStyle}
                  className="flex items-center justify-center text-center font-extrabold text-white bg-rose-500 rounded-full border-2 border-white shadow-md aspect-square"
                >
                  <span className="uppercase tracking-wider" style={{ fontSize: '3cqw' }}>
                    {contentText || 'HOT'}
                  </span>
                </div>
              );
            }

            case 'logo': {
              return (
                <div 
                  key={layer.id} 
                  style={layerStyle}
                  className="flex items-center justify-center text-center font-mono border border-dashed border-slate-300 text-slate-400 rounded bg-slate-50/60 px-1.5 py-0.5"
                >
                  <span style={{ fontSize: '2.5cqw' }}>{contentText || 'BRAND LOGO'}</span>
                </div>
              );
            }

            case 'decoration':
            default: {
              return (
                <div 
                  key={layer.id} 
                  style={layerStyle}
                  className="flex items-center justify-center border border-dashed border-amber-300/60 bg-amber-50/40 rounded p-1"
                >
                  <Sparkles className="w-[3cqw] h-[3cqw] text-amber-500 mr-1" />
                  <span className="font-medium text-amber-800" style={{ fontSize: '2cqw' }}>
                    {contentText || '装饰元素'}
                  </span>
                </div>
              );
            }
          }
        })}
      </div>
    </div>
  );
};
