import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Maximize2, Minimize2, Upload, ArrowLeft } from 'lucide-react';
import { ProjectState } from '../types/schemas';

interface Props {
  productAsset: NonNullable<ProjectState['productAsset']>;
  sceneAsset: NonNullable<ProjectState['sceneAsset']>;
  recipe: NonNullable<ProjectState['sceneRecipe']>;
  onReplaceScene: () => void;
  onBackToGeneration: () => void;
}

export const ProductScenePreview: React.FC<Props> = ({
  productAsset,
  sceneAsset,
  recipe,
  onReplaceScene,
  onBackToGeneration,
}) => {
  const [productVisible, setProductVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'fit' | 'original'>('fit');

  // Recipe-driven composition
  const { composition } = recipe;
  
  // Calculate preview position based on composition constraints
  // Mapping center, center_left, etc. to CSS/percentages
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

      <div className="flex-grow relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
        {/* Background Scene */}
        <img 
          src={sceneAsset.persistedAssetRef} 
          alt="Scene" 
          className={`w-full h-full ${viewMode === 'fit' ? 'object-contain' : 'object-cover'}`}
        />

        {/* Product Overlay */}
        {productVisible && (
          <div 
            className="absolute z-10 transition-all duration-300"
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
        
        {/* Fixed Label */}
        <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
          构图匹配预览，未做光影融合
        </div>
      </div>
    </div>
  );
};
