const fs = require('fs');
const file = 'src/components/GuidedQuestionsPanel.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/<p className="text-xs text-slate-500 mt-1">\s*完成以下 \{questions\.length\} 个场景偏好与设计维度问题，以定制最贴合您台历产品的场景方向。\s*<\/p>/, 
`{questions.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              完成以下 {questions.length} 个场景偏好与设计维度问题，以定制最贴合您台历产品的场景方向。
            </p>
          )}`);

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched GuidedQuestionsPanel.tsx header");
