import React, { useState, useEffect, useRef } from 'react';
import { Layers, Eye, EyeOff, Maximize2, Minimize2, Upload, ArrowLeft } from 'lucide-react';
import { ProjectState } from '../types/schemas';

interface Props {
  productAsset: NonNullable<ProjectState['productAsset']>;
  sceneAsset: NonNullable<ProjectState['sceneAsset']>;
  recipe: NonNullable<ProjectState['sceneRecipe']>;
  onReplaceScene: () => void;
  onBackToGeneration: () => void;
  onOverlayGenerated?: (dataUrl: string) => void;
}

export const ProductScenePreview: React.FC<Props> = ({
  productAsset,
  sceneAsset,
  recipe,
  onReplaceScene,
  onBackToGeneration,
  onOverlayGenerated
}) => {
  const [productVisible, setProductVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'fit' | 'original'>('fit');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Recipe-driven composition
  const { composition } = recipe;
  
  // Calculate preview position based on composition constraints
  const getPositionStyles = () => {
    switch (composition.productPosition) {
      case 'center_left': return { left: '10%', top: '50%', transform: 'translate(0, -50%)' };
      case 'center_right': return { right: '10%', top: '50%', transform: 'translate(0, -50%)' };
      case 'lower_left': return { left: '10%', bottom: '10%' };
      case 'lower_right': return { right: '10%', bottom: '10%' };
      case 'center':
      default: return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  useEffect(() => {
    // Generate actual overlay canvas for analysis
    if (!onOverlayGenerated) return;

    const generateOverlay = async () => {
      const sceneImg = new Image();
      const productImg = new Image();
      
      const loadImg = (img: HTMLImageElement, src: string) => 
        new Promise((resolve, reject) => {
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });

      try {
        await Promise.all([
          loadImg(sceneImg, sceneAsset.persistedAssetRef),
          loadImg(productImg, productAsset.persistedAssetRef)
        ]);

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = sceneImg.width;
        canvas.height = sceneImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw scene
        ctx.drawImage(sceneImg, 0, 0, canvas.width, canvas.height);

        // Draw product based on composition
        const productWidth = canvas.width * (composition.productWidthPercent / 100);
        const productHeight = productWidth * (productImg.height / productImg.width);

        let dx = 0, dy = 0;
        switch (composition.productPosition) {
          case 'center_left':
            dx = canvas.width * 0.1;
            dy = (canvas.height - productHeight) / 2;
            break;
          case 'center_right':
            dx = canvas.width * 0.9 - productWidth;
            dy = (canvas.height - productHeight) / 2;
            break;
          case 'lower_left':
            dx = canvas.width * 0.1;
            dy = canvas.height * 0.9 - productHeight;
            break;
          case 'lower_right':
            dx = canvas.width * 0.9 - productWidth;
            dy = canvas.height * 0.9 - productHeight;
            break;
          case 'center':
          default:
            dx = (canvas.width - productWidth) / 2;
            dy = (canvas.height - productHeight) / 2;
            break;
        }

        ctx.drawImage(productImg, dx, dy, productWidth, productHeight);
        
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        onOverlayGenerated(dataUrl);

      } catch (e) {
        console.error('Failed to generate overlay preview', e);
      }
    };

    generateOverlay();
  }, [productAsset, sceneAsset, composition.productPosition, composition.productWidthPercent, onOverlayGenerated]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-none bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <h2 className="text-lg font-bold">产品场景预览</h2>
        <div className="flex gap-2">
           <button onClick={() => setProductVisible(!productVisible)} className="p-2 hover:bg-slate-100 rounded-lg">
             {productVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
           </button>
           <button onClick={() => setViewMode(prev => prev === 'fit' ? 'original' : 'fit')} className="p-2 hover:bg-slate-100 rounded-lg">
             {viewMode === 'fit' ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
           </button>
           <button onClick={onReplaceScene} className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg font-semibold">替换场景</button>
           <button onClick={onBackToGeneration} className="px-3 py-2 text-sm bg-slate-100 rounded-lg font-semibold">返回说明</button>
        </div>
      </div>

      <div className="flex-grow relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
        {/* Hidden canvas for generating the exact overlay for backend analysis */}
        <canvas ref={canvasRef} className="hidden" />

        <div className={`relative ${viewMode === 'fit' ? 'w-full h-full flex items-center justify-center' : ''}`}>
          <div className="relative" style={{ width: viewMode === 'fit' ? '100%' : sceneAsset.width, height: viewMode === 'fit' ? '100%' : sceneAsset.height }}>
            {/* Background Scene */}
            <img 
              src={sceneAsset.persistedAssetRef} 
              alt="Scene" 
              className={`w-full h-full ${viewMode === 'fit' ? 'object-contain' : 'object-cover'}`}
            />
            {/* Product Overlay */}
            {productVisible && (
              <div 
                className="absolute z-10 transition-all duration-300 pointer-events-none"
                style={{
                    ...getPositionStyles(),
                    width: `${composition.productWidthPercent}%`,
                }}
              >
                <img 
                  src={productAsset.persistedAssetRef} 
                  alt="Product" 
                  className="w-full h-auto object-contain"
                  style={{ aspectRatio: `${productAsset.width}/${productAsset.height}` }}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Fixed Label */}
        <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm z-20">
          构图匹配预览，未做光影融合
        </div>
      </div>
    </div>
  );
};
