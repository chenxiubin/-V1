import React, { useState, useEffect } from 'react';
import { Layers, Eye, EyeOff, Maximize2, Minimize2, Upload, ArrowLeft } from 'lucide-react';
import { ProjectState } from '../types/schemas';
import { createProductSceneOverlay } from '../services/productSceneOverlay';
import { getAsset, saveAsset } from '../lib/db';

interface Props {
  productAsset: NonNullable<ProjectState['productAsset']>;
  sceneAsset: NonNullable<ProjectState['sceneAsset']>;
  recipe: NonNullable<ProjectState['sceneRecipe']>;
  onReplaceScene: () => void;
  onBackToGeneration: () => void;
  onOverlayGenerated?: (overlayRef: string) => void;
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
  const [localSceneUrl, setLocalSceneUrl] = useState<string>('');
  const [localProductUrl, setLocalProductUrl] = useState<string>('');

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
    let active = true;
    const urlsToRevoke: string[] = [];

    const loadImages = async () => {
      try {
        const [sceneBlob, productBlob] = await Promise.all([
          getAsset(sceneAsset.persistedAssetRef),
          getAsset(productAsset.persistedAssetRef)
        ]);

        if (!active || !sceneBlob || !productBlob) return;

        const sUrl = URL.createObjectURL(sceneBlob);
        const pUrl = URL.createObjectURL(productBlob);
        urlsToRevoke.push(sUrl, pUrl);

        setLocalSceneUrl(sUrl);
        setLocalProductUrl(pUrl);

        if (onOverlayGenerated) {
          const { blob: overlayBlob } = await createProductSceneOverlay({
            productBlob,
            sceneBlob,
            productAsset,
            sceneAsset,
            composition,
          });

          const overlayId = `overlay-${crypto.randomUUID()}`;
          await saveAsset(overlayId, overlayBlob);
          if (active) {
            onOverlayGenerated(overlayId);
          }
        }
      } catch (err) {
        console.error('Failed to generate overlay:', err);
      }
    };

    loadImages();

    return () => {
      active = false;
      urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
    };
  }, [productAsset, sceneAsset, composition, onOverlayGenerated]);

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
        <div className={`relative ${viewMode === 'fit' ? 'w-full h-full flex items-center justify-center' : ''}`}>
          {localSceneUrl && (
            <div className="relative" style={{ width: viewMode === 'fit' ? '100%' : sceneAsset.width, height: viewMode === 'fit' ? '100%' : sceneAsset.height }}>
              {/* Background Scene */}
              <img 
                src={localSceneUrl} 
                alt="Scene" 
                className={`w-full h-full ${viewMode === 'fit' ? 'object-contain' : 'object-cover'}`}
              />
              {/* Product Overlay */}
              {productVisible && localProductUrl && (
                <div 
                  className="absolute z-10 transition-all duration-300 pointer-events-none"
                  style={{
                      ...getPositionStyles(),
                      width: `${composition.productWidthPercent}%`,
                  }}
                >
                  <img 
                    src={localProductUrl} 
                    alt="Product" 
                    className="w-full h-auto object-contain"
                    style={{ aspectRatio: `${productAsset.width}/${productAsset.height}` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Fixed Label */}
        <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm z-20">
          构图匹配预览，未做光影融合
        </div>
      </div>
    </div>
  );
};

