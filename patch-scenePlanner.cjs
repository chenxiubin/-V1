const fs = require('fs');
const file = 'server/routes/scenePlanner.ts';
let code = fs.readFileSync(file, 'utf-8');

const errorHandlerFunc = `
function handleApiError(error, defaultMessage) {
  let status = 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || defaultMessage;
  let retryable = typeof error.retryable === 'boolean' ? error.retryable : false;
  let retryAfterSeconds = null;

  if (error.code === 'TIMEOUT' || error.status === 504 || error.statusCode === 504) {
    status = 504;
    code = 'TIMEOUT';
    message = '大模型服务请求超时（120秒超时限制），请重试。';
    retryable = true;
  } else if (error.status === 429 || error.statusCode === 429 || /429|resource_exhausted|quota/i.test(error.message)) {
    status = 429;
    code = 'GEMINI_QUOTA_EXHAUSTED';
    message = '当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。';
    retryable = true;
    console.error(JSON.stringify({
      status,
      code,
      model: process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash',
      quotaMetric: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      retryAfterSeconds
    }));
  } else if (error.status === 503 || error.statusCode === 503 || /503|service_unavailable/i.test(error.message)) {
    status = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = '智能分析服务暂时不可用（503 Service Unavailable），请稍后再试。';
    retryable = true;
  }

  return { status, payload: { code, message, retryable } };
}
`;

// Insert the helper at the top
code = code.replace("const router = Router();", "const router = Router();\n" + errorHandlerFunc);

// Update catch block 1
code = code.replace(/} catch \(error: any\) {\s*const code = error\.code \|\| 'INTERNAL_ERROR';\s*const retryable = typeof error\.retryable === 'boolean' \? error\.retryable : false;\s*return res\.status\(500\)\.json\({\s*code,\s*message: error\.message \|\| '服务端生成引导问题时发生未知错误。',\s*retryable\s*}\);\s*}/, 
`} catch (error: any) {
    const { status, payload } = handleApiError(error, '服务端生成引导问题时发生未知错误。');
    return res.status(status).json(payload);
  }`);

// Update catch block 2
code = code.replace(/} catch \(error: any\) {\s*const code = error\.code \|\| 'INTERNAL_ERROR';\s*const retryable = typeof error\.retryable === 'boolean' \? error\.retryable : false;\s*return res\.status\(500\)\.json\({\s*code,\s*message: error\.message \|\| '服务端生成场景规划方向时发生未知错误。',\s*retryable\s*}\);\s*}/, 
`} catch (error: any) {
    const { status, payload } = handleApiError(error, '服务端生成场景规划方向时发生未知错误。');
    return res.status(status).json(payload);
  }`);

// Update catch block 3
code = code.replace(/} catch \(error: any\) {\s*const code = error\.code \|\| 'INTERNAL_ERROR';\s*const retryable = typeof error\.retryable === 'boolean' \? error\.retryable : false;\s*return res\.status\(500\)\.json\({\s*code,\s*message: error\.message \|\| '生成 Recipe 发生未知错误',\s*retryable\s*}\);\s*}/, 
`} catch (error: any) {
    const { status, payload } = handleApiError(error, '生成 Recipe 发生未知错误');
    return res.status(status).json(payload);
  }`);

// Update catch block 4
code = code.replace(/} catch \(error: any\) {\s*const code = error\.code \|\| 'INTERNAL_ERROR';\s*const retryable = typeof error\.retryable === 'boolean' \? error\.retryable : false;\s*return res\.status\(500\)\.json\(\{ code, message: error\.message \|\| '分析发生未知错误', retryable \}\);\s*}/, 
`} catch (error: any) {
    const { status, payload } = handleApiError(error, '分析发生未知错误');
    return res.status(status).json(payload);
  }`);

fs.writeFileSync(file, code, 'utf-8');
console.log("Patched scenePlanner.ts successfully.");
