import { SceneRecipeSchema, PromptDocument, SceneRecipe } from '../../types/schemas.js';

function scanForSensitiveStrings(obj: any): void {
  if (typeof obj === 'string') {
    const s = obj.toLowerCase();
    if (s.includes('data:image/') || s.includes(';base64')) throw new Error('Sensitive data: Base64 data URI detected');
    if (s.startsWith('blob:')) throw new Error('Sensitive data: blob URI detected');
    if (s.includes('file://')) throw new Error('Sensitive data: file:// URI detected');
    if (/^[a-z]:\\[\w\\]/i.test(obj)) throw new Error('Sensitive data: Windows absolute path detected');
    if (/(^|\s)\/(mnt|home|tmp|var)\//.test(s)) throw new Error('Sensitive data: Unix internal path detected');
    if (s.includes('localhost') || s.includes('127.0.0.1')) throw new Error('Sensitive data: local network address detected');
    
    if (/AIza[a-zA-Z0-9_-]{35}/.test(obj)) throw new Error('Sensitive data: Google API Key detected');
    if (/sk-[a-zA-Z0-9_-]{32,}/.test(obj)) throw new Error('Sensitive data: Secret Token detected');
    if (/(?:api_key|apikey|api key)\s*[:=]\s*[a-zA-Z0-9_-]{15,}/i.test(obj)) throw new Error('Sensitive data: API Key detected');
    if (/(?:secret|client_secret)\s*[:=]\s*[a-zA-Z0-9_-]{15,}/i.test(obj)) throw new Error('Sensitive data: Secret detected');
    if (/Authorization:\s*Bearer\s+[a-zA-Z0-9_.-]{15,}/i.test(obj)) throw new Error('Sensitive data: Bearer Token detected');
  } else if (Array.isArray(obj)) {
    obj.forEach(scanForSensitiveStrings);
  } else if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      scanForSensitiveStrings(obj[key]);
    }
  }
}

function getSortedKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(getSortedKeys);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
      result[key] = getSortedKeys(val);
    }
  }
  return result;
}

export function compileStableJson(obj: any): string {
  const sorted = getSortedKeys(obj);
  return JSON.stringify(sorted, null, 2);
}

export function compileTopLevelJsonObjects(recipe: SceneRecipe): Record<string, string> {
  const parseResult = SceneRecipeSchema.safeParse(recipe);
  if (!parseResult.success) {
    throw new Error('Invalid SceneRecipe schema');
  }
  scanForSensitiveStrings(recipe);

  const result: Record<string, string> = {};
  const keys = ['task', 'scene', 'composition', 'lighting', 'decoration', 'output', 'inheritance'];
  
  for (const key of keys) {
    if (key in recipe && (recipe as any)[key] !== undefined && (recipe as any)[key] !== null) {
      result[key] = compileStableJson({ [key]: (recipe as any)[key] });
    }
  }
  
  return result;
}

export function compilePromptDocument(recipe: SceneRecipe): PromptDocument {
  const parseResult = SceneRecipeSchema.safeParse(recipe);
  if (!parseResult.success) {
    throw new Error('Invalid SceneRecipe schema');
  }
  scanForSensitiveStrings(recipe);

  const sections = {
    taskAndReferences: `本任务是基于提供的参考图和分析，生成一张匹配的空场景背景图。\n特别注意：产品图片仅用于分析和空间参考，输出结果不得包含该产品本身，不要求在最终图像中生成真实产品。`,
    productMatching: `基于所给产品的形态（${recipe.productProfileSnapshot?.productType || '未知'}）和尺寸进行空间预留。\n注意：不要复述产品表面的具体图案和文字。`,
    sceneAndStyle: `空间类型：${recipe.scene.spaceType}\n墙面材质：${recipe.scene.wallMaterial}\n桌面材质：${recipe.scene.desktopMaterial}\n桌面色调：${recipe.scene.desktopTone}\n背景亮度：${recipe.scene.backgroundBrightness}\n整体风格：${recipe.scene.style}\n色彩方案：${recipe.scene.palette ? recipe.scene.palette.join(', ') : '无'}\n家具密度：${recipe.scene.furnitureDensity}`,
    cameraAndComposition: `构图意图：${recipe.composition.purpose}\n预期放置的产品数量：${recipe.composition.productCount}\n相对位置：${recipe.composition.productPosition}\n产品宽度占比：${recipe.composition.productWidthPercent}%\n留白区域：${recipe.composition.copySpace}\n摄像机视角：${recipe.composition.cameraView}\n摄像机高度：${recipe.composition.cameraHeight}\n景别：${recipe.composition.framing}\n透视强度：${recipe.composition.perspectiveStrength}\n桌面可见比例：${recipe.composition.desktopVisiblePercent}%`,
    lightingAndDecoration: `光源类型：${recipe.lighting.sourceType}\n光源位置：${recipe.lighting.sourcePosition}\n色温：${recipe.lighting.temperature}\n光线柔和度：${recipe.lighting.softness}\n对比度：${recipe.lighting.contrast}\n阴影方向：${recipe.lighting.shadowDirection}\n装饰物密度：${recipe.decoration?.density || '无'}\n允许的装饰物：${recipe.decoration?.allowed ? recipe.decoration.allowed.join('、') : '无'}\n产品附近禁止出现的装饰物：${recipe.decoration?.forbiddenNearProduct ? recipe.decoration.forbiddenNearProduct.join('、') : '无'}`,
    outputConstraints: `画幅比例：${recipe.output.aspectRatio}\n分辨率标签：${recipe.output.resolutionLabel}\n绝对不允许出现：产品、人物、手部、文字、Logo、水印。技术词汇如 PNG, JSON, Nano Banana 等可以保留。`
  };

  const fullPrompt = `【1. 任务与参考关系】
${sections.taskAndReferences}

【2. 产品匹配依据】
${sections.productMatching}

【3. 场景与风格】
${sections.sceneAndStyle}

【4. 镜头与构图】
${sections.cameraAndComposition}

【5. 光线与装饰】
${sections.lightingAndDecoration}

【6. 输出限制】
${sections.outputConstraints}`;

  const fullJson = compileStableJson(recipe);

  return {
    recipeId: recipe.recipeId,
    recipeVersion: recipe.version,
    compilerVersion: 'prompt-compiler-1.0',
    sections,
    fullPrompt,
    fullJson,
    createdAt: recipe.updatedAt || new Date(0).toISOString()
  };
}
