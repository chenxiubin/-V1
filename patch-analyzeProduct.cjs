const fs = require('fs');
const file = 'server/routes/analyzeProduct.ts';
let code = fs.readFileSync(file, 'utf-8');

const targetCatch = `    } catch (error: any) {
      let status = 500;
      let code = error.code || 'INTERNAL_ERROR';
      let message = error.message || '服务端分析产品时发生未知错误。';
      let retryable = typeof error.retryable === 'boolean' ? error.retryable : false;

      // Handle custom TIMEOUT or gateway timeout (504)
      if (error.code === 'TIMEOUT' || error.status === 504 || error.statusCode === 504) {
        status = 504;
        code = 'TIMEOUT';
        message = '分析产品大模型服务请求超时（120秒超时限制），请重试。';
        retryable = true;
      } 
      // Handle rate limits (429)
      else if (error.status === 429 || error.statusCode === 429 || /429|resource_exhausted|quota/i.test(error.message)) {
        status = 429;
        code = 'RATE_LIMIT';
        message = '大模型服务请求过于频繁，服务限流中（429 Resource Exhausted），请稍后再试。';
        retryable = true;
      } 
      // Handle service unavailable (503)
      else if (error.status === 503 || error.statusCode === 503 || /503|service_unavailable/i.test(error.message)) {
        status = 503;
        code = 'SERVICE_UNAVAILABLE';
        message = '智能分析服务暂时不可用（503 Service Unavailable），请稍后再试。';
        retryable = true;
      }`;

const replacement = `    } catch (error: any) {
      let status = 500;
      let code = error.code || 'INTERNAL_ERROR';
      let message = error.message || '服务端分析产品时发生未知错误。';
      let retryable = typeof error.retryable === 'boolean' ? error.retryable : false;
      let retryAfterSeconds = null;

      // Handle custom TIMEOUT or gateway timeout (504)
      if (error.code === 'TIMEOUT' || error.status === 504 || error.statusCode === 504) {
        status = 504;
        code = 'TIMEOUT';
        message = '分析产品大模型服务请求超时（120秒超时限制），请重试。';
        retryable = true;
      } 
      // Handle rate limits (429)
      else if (error.status === 429 || error.statusCode === 429 || /429|resource_exhausted|quota/i.test(error.message)) {
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
      } 
      // Handle service unavailable (503)
      else if (error.status === 503 || error.statusCode === 503 || /503|service_unavailable/i.test(error.message)) {
        status = 503;
        code = 'SERVICE_UNAVAILABLE';
        message = '智能分析服务暂时不可用（503 Service Unavailable），请稍后再试。';
        retryable = true;
      }`;

if (code.includes(targetCatch)) {
  code = code.replace(targetCatch, replacement);
  fs.writeFileSync(file, code, 'utf-8');
  console.log("Patched analyzeProduct.ts successfully.");
} else {
  console.error("Target not found in analyzeProduct.ts");
}
