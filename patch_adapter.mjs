import fs from 'fs';
let code = fs.readFileSync('src/services/ai/realAdapter.ts', 'utf-8');

const newParse = `
async function parseResponseSafe(response: Response, defaultMessage: string): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  
  // Read response body as text first to handle HTML intercepts safely
  let text = '';
  if (response && typeof response.text === 'function') {
    text = await response.text();
  } else if (response && typeof response.json === 'function') {
    try {
      const data = await response.json();
      text = typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      text = '';
    }
  }
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();

  // Log to console but do not display to user
  if (response.redirected || contentType.includes('text/html') || lowerText.substring(0, 100).includes('<html')) {
    console.error('[API_HTML_INTERCEPT]', {
      status: response.status,
      contentType,
      redirected: response.redirected,
      url: response.url,
      htmlPreview: trimmedText.substring(0, 60).replace(/\\n/g, '')
    });
  }

  if (response.redirected) {
    const err = new Error('智能分析服务未正常启动，请刷新页面后重试。');
    (err as any).code = 'API_REDIRECTED_TO_HTML';
    (err as any).retryable = false;
    throw err;
  }

  const firstChars = lowerText.substring(0, 100);
  if (contentType.includes('text/html') || firstChars.includes('<!doctype') || firstChars.includes('<html') || firstChars.includes('<body')) {
    const err = new Error('智能分析服务未正常启动，请刷新页面后重试。');
    (err as any).code = 'API_RETURNED_HTML';
    (err as any).retryable = false;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const err = new Error('服务端返回了无效的响应格式。');
    (err as any).code = 'INVALID_JSON';
    (err as any).retryable = false;
    throw err;
  }

  if (!response.ok) {
    const err = new Error(data.message || defaultMessage);
    (err as any).code = data.code || 'API_ERROR';
    (err as any).retryable = typeof data.retryable === 'boolean' ? data.retryable : true;
    (err as any).status = response.status;
    
    // Explicit mappings for API errors
    if (response.status === 404) {
      (err as any).code = data.code || 'API_ROUTE_NOT_FOUND';
    } else if (response.status === 429) {
      (err as any).code = data.code || 'RESOURCE_EXHAUSTED';
    } else if (response.status === 503) {
      (err as any).code = data.code || 'SERVICE_UNAVAILABLE';
    }
    
    throw err;
  }

  return data;
}
`;

code = code.replace(/async function parseResponseSafe[\s\S]*?return data;\n}/, newParse.trim());
fs.writeFileSync('src/services/ai/realAdapter.ts', code);
