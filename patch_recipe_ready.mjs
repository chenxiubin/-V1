import fs from 'fs';
let code = fs.readFileSync('src/components/RecipeReadyView.tsx', 'utf-8');

// Add props
code = code.replace(/selectedDirection\?: SceneDirection;\n}/, 'selectedDirection?: SceneDirection;\n  onGoToExternalGeneration: () => void;\n}');
code = code.replace(/selectedDirection,\n}\) => \{/, 'selectedDirection,\n  onGoToExternalGeneration,\n}) => {');

// Add button UI at the top
const buttonUI = `
      {/* External Generation Action Section */}
      <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <p className="text-indigo-800 font-semibold mb-1">准备好空场景背景了吗？</p>
          <p className="text-sm text-indigo-600/80 max-w-lg mx-auto">
            请将当前提示词复制到外部生图模型生成空场景背景，再把生成结果导回平台进行真实产品叠加与匹配检查。
          </p>
        </div>
        <button
          onClick={onGoToExternalGeneration}
          className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
        >
          导入外部生成的空场景图
        </button>
      </section>
`;

code = code.replace(/<div className="text-center space-y-3">/, buttonUI + '\n      <div className="text-center space-y-3">');

fs.writeFileSync('src/components/RecipeReadyView.tsx', code);
