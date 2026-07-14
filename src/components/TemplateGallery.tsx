import React from 'react';
import { motion } from 'motion/react';
import { Check, ChevronRight, Compass } from 'lucide-react';
import { TemplateSuite } from '../types/schemas';

interface TemplateGalleryProps {
  templates: TemplateSuite[];
  selectedSuiteId: string | null;
  onSelectSuite: (id: string) => void;
  onConfirm: () => void;
}

// Map technical IDs to the newly recalibrated scene directions
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

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  selectedSuiteId,
  onSelectSuite,
  onConfirm
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">智能规划场景方向选择</h2>
          <p className="text-sm text-slate-500 mt-1">
            选择最适合您台历调性的空间规划方向，AI 将基于本方案在后台自动演算自适应大图配方。
          </p>
        </div>
        <button
          onClick={onConfirm}
          disabled={!selectedSuiteId}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm ${
            selectedSuiteId
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          确认规划方向
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((suite) => {
          const isSelected = selectedSuiteId === suite.id;
          const mapped = sceneMapping[suite.id] || {
            name: suite.name,
            category: suite.category,
            description: suite.description,
          };

          return (
            <motion.div
              key={suite.id}
              whileHover={{ y: -4 }}
              onClick={() => onSelectSuite(suite.id)}
              className={`relative cursor-pointer rounded-2xl border p-5 transition-all flex flex-col justify-between min-h-[220px] ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/20 shadow-sm ring-1 ring-indigo-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div>
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-indigo-600 text-white rounded-full p-0.5">
                     <Check className="w-4 h-4" />
                  </div>
                )}
                
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <Compass className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                </div>

                <div className="mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {mapped.category}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-900 text-base">{mapped.name}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{mapped.description}</p>
              </div>
              
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">AI 智能空间推荐</span>
                <span>•</span>
                <span>支持全比例自适应规划</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
