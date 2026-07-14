import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Palette, Type as FontIcon, Image as ImageIcon } from 'lucide-react';
import { TemplateSuite } from '../types/schemas';

interface TemplateDetailViewProps {
  suite: TemplateSuite;
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
}

const sceneMapping: Record<string, { name: string; category: string; description: string }> = {
  'ts-business-office': {
    name: '商务办公空间',
    category: '现代极简',
    description: '专为高档写字楼、极简或极客桌面打造的高质感商务空间。主打深邃高雅的底色、金属质感与原木线条，突显专业、专注与静谧沉稳。',
  },
  'ts-holiday-gift': {
    name: '新中式生活空间',
    category: '人文东方',
    description: '融合传统东方美学与现代日常陈设的新中式写意空间。主打温润朱砂、雅致玄金、暖意麦香色调，传递优雅、厚重的人文与礼赠仪式感。',
  },
  'ts-young-lifestyle': {
    name: '家庭温暖场景',
    category: '温馨居家',
    description: '充满居家朝气、阳光与轻盈生活美学的家庭温暖空间。主打柔和的暖阳、亚克力质感与软装绿植，展现舒适、温馨与生活的日常呼吸感。',
  },
};

export const TemplateDetailView: React.FC<TemplateDetailViewProps> = ({
  suite,
  selectedVariantId,
  onSelectVariant
}) => {
  const selectedVariant = suite.variants.find(v => v.id === selectedVariantId) || suite.variants[0];
  const mapped = sceneMapping[suite.id] || { name: suite.name, category: suite.category, description: suite.description };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-8 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Visualization */}
        <div className="p-8 bg-slate-50 border-r border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              空间规划构图预览
            </h3>
            
            <div className="flex items-center justify-center">
              <div 
                className="relative rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden bg-gradient-to-tr from-slate-100 to-slate-200/50 flex flex-col items-center justify-center p-6 gap-3 transition-all duration-300"
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  aspectRatio: selectedVariant.aspectRatio.replace(':', '/'),
                }}
              >
                {/* Visual Representation of the Scene Atmosphere */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at center, ${suite.styleSystem.colors[1] || '#4f46e5'} 0%, transparent 70%)`
                  }}
                />
                <div className="p-4 rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-indigo-600">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="text-center z-10">
                  <p className="text-sm font-bold text-slate-800">
                    {mapped.name} ({selectedVariant.aspectRatio})
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    AI 自动执行空间规划与物理阴影校准
                  </p>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>智能空间锁焦</span>
                  <span>AI SHADOWS ON</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-xl bg-white border border-slate-100 shadow-xs">
              <div className="text-[10px] text-slate-400 font-medium">规划参考尺寸</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5 font-mono">
                {selectedVariant.canvasSize.width} × {selectedVariant.canvasSize.height} px
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white border border-slate-100 shadow-xs">
              <div className="text-[10px] text-slate-400 font-medium">规划画幅比例</div>
              <div className="text-sm font-bold text-indigo-600 mt-0.5 font-mono">
                {selectedVariant.aspectRatio}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Scheme Genes Info */}
        <div className="p-8 space-y-8">
          {/* Variants Selection */}
          <section>
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              选择规划画幅比例
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {suite.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelectVariant(v.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedVariantId === v.id
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  {v.aspectRatio}
                </button>
              ))}
            </div>
          </section>

          {/* AI Generation Guide */}
          <section className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI 智能场景规划演练机制
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              无需复杂的繁琐参数。大模型多模态空间配方将自动融合台历结构、边缘和反光，进行立体场景建模：
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside pl-1">
              <li>物理级阴影与接触面暗角自动计算与投影</li>
              <li>基于材质反射率进行高光与环境冷暖光融合</li>
              <li>场景智能景深控制，确保主体在空间中的透视感与呼吸感</li>
            </ul>
          </section>

          {/* Style Info */}
          <section className="pt-6 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  色彩规划体系
                </h5>
                <div className="flex gap-1.5">
                  {suite.styleSystem.colors.map((c, i) => (
                    <div 
                      key={i} 
                      className="w-6 h-6 rounded-lg border border-slate-200 shadow-inner" 
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <FontIcon className="w-3.5 h-3.5 text-slate-400" />
                  建议排版字体方案
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {suite.styleSystem.fonts.map((f, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
