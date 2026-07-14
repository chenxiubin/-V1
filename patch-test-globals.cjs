const fs = require('fs');
const file = 'src/test/phase3ClientFlow.test.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/vi\.spyOn\(RealAdapter\.prototype, 'generateGuidedQuestions'\)\.mockImplementation\(async \(\) => \{\n\s*callCount\+\+;\n\s*const err = new Error\('当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。'\);\n\s*\(err as any\)\.code = 'GEMINI_QUOTA_EXHAUSTED';\n\s*throw err;\n\s*\}\);/g, 
  "callCount++;\n    const err = new Error('当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。');\n    (err as any).code = 'GEMINI_QUOTA_EXHAUSTED';\n    mockQuestionsError = err;");

code = code.replace(/vi\.spyOn\(RealAdapter\.prototype, 'generateGuidedQuestions'\)\.mockImplementation\(async \(\) => \{\n\s*callCount\+\+;\n\s*return getValidMockQuestions\(\);\n\s*\}\);/g, 
  "callCount++;\n    mockQuestionsError = null;\n    mockQuestionsResponse = getValidMockQuestions();");

code = code.replace(/vi\.spyOn\(RealAdapter\.prototype, 'generateGuidedQuestions'\)\.mockImplementation\(async \(\) => \{\n\s*const err = new Error\('智能分析服务暂时不可用（503 Service Unavailable），可能是大模型服务临时故障，请稍后重试。'\);\n\s*\(err as any\)\.code = 'SERVICE_UNAVAILABLE';\n\s*throw err;\n\s*\}\);/g, 
  "const err = new Error('智能分析服务暂时不可用（503 Service Unavailable），可能是大模型服务临时故障，请稍后重试。');\n    (err as any).code = 'SERVICE_UNAVAILABLE';\n    mockQuestionsError = err;");

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched test globals successfully");
