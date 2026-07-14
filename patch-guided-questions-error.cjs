const fs = require('fs');
const file = 'src/components/GuidedQuestionsPanel.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/<div className="flex justify-end">\s*<button\s*id="btn-retry-questions"\s*onClick=\{onRetry\}\s*className="inline-flex items-center gap-1\.5 px-3 py-1\.5 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all cursor-pointer"\s*>\s*<RotateCcw className="w-3\.5 h-3\.5" \/>\s*重新生成问题\s*<\/button>\s*<\/div>/, 
`<div className="flex justify-end gap-3">
            <button
              id="btn-back-to-review-from-error"
              onClick={onBackToReview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
            >
              返回产品分析报告
            </button>
            <button
              id="btn-retry-questions"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              稍后重试
            </button>
          </div>`);

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched GuidedQuestionsPanel.tsx error footer");
