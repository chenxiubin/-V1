import { SceneRecipeSchema, PromptDocument, SceneRecipe } from '../../types/schemas.js';

export const PROMPT_COMPILER_VERSION = 'prompt-compiler-1.0';

function scanForSensitiveStrings(obj: any): void {
  if (typeof obj === 'string') {
    const s = obj.toLowerCase();
    if (s.includes('data:image/') || s.includes(';base64')) {
      throw new Error('Sensitive data: Base64 data URI detected');
    }
    if (s.includes('blob:')) {
      throw new Error('Sensitive data: blob URI detected');
    }
    if (s.includes('file://')) {
      throw new Error('Sensitive data: file:// URI detected');
    }
    if (/^[a-zA-Z]:\\/.test(obj) || /^[a-zA-Z]:\//.test(obj)) {
      throw new Error('Sensitive data: Windows absolute path detected');
    }
    if (s.includes('/mnt/') || s.includes('/home/') || s.includes('/tmp/') || s.includes('/var/')) {
      throw new Error('Sensitive data: Unix internal path detected');
    }
    if (s.includes('localhost') || s.includes('127.0.0.1')) {
      throw new Error('Sensitive data: local network address detected');
    }
    
    if (/AIza[a-zA-Z0-9_-]{35}/.test(obj)) {
      throw new Error('Sensitive data: Google API Key detected');
    }
    if (/sk-[a-zA-Z0-9_-]{32,}/.test(obj)) {
      throw new Error('Sensitive data: Secret Token detected');
    }
    if (/(?:api_key|apikey|api key)\s*[:=]\s*[a-zA-Z0-9_-]{15,}/i.test(obj)) {
      throw new Error('Sensitive data: API Key detected');
    }
    if (/(?:secret|client_secret)\s*[:=]\s*[a-zA-Z0-9_-]{15,}/i.test(obj)) {
      throw new Error('Sensitive data: Secret detected');
    }
    if (/Authorization:\s*Bearer\s+[a-zA-Z0-9_.-]{15,}/i.test(obj)) {
      throw new Error('Sensitive data: Bearer Token detected');
    }
    if (/bearer\s+[a-zA-Z0-9_.-]{15,}/i.test(obj)) {
      throw new Error('Sensitive data: Bearer Token detected');
    }
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
  // First scan input recipe
  scanForSensitiveStrings(recipe);

  const sections = {
    taskAndReferences: `任务：生成高品质的、写实商业摄影级别的【空场景背景图】。
说明：提供的前景产品参考图仅作为结构、视角、比例、透视、材质和光线的技术参考依据。
限制：在生图结果中【绝对不得生成该产品本身】，也不要求在最终图像中生成任何真实产品。`.trim(),

    productMatching: `基于所给前景产品的物理形态、尺寸与对位参考，进行合理的空间预留：
- 产品类型：${recipe.productProfileSnapshot.productType || '未知'}
- 支架底座：${recipe.productProfileSnapshot.bracketType || '未知'}
- 产品视角：${recipe.productProfileSnapshot.view.class || '未知'}
- 顶部可见：${recipe.productProfileSnapshot.view.visibleTop || '未知'}
- 侧面可见：${recipe.productProfileSnapshot.view.visibleSide || '未知'}
- 产品材质：${recipe.productProfileSnapshot.materials ? recipe.productProfileSnapshot.materials.map(m => `${m.name}(反射率:${m.reflectivity})`).join('、') : '未知'}
- 已有光线：${recipe.productProfileSnapshot.existingLighting ? `方向:${recipe.productProfileSnapshot.existingLighting.direction}, 色温:${recipe.productProfileSnapshot.existingLighting.temperature}, 柔和度:${recipe.productProfileSnapshot.existingLighting.softness}, 对比度:${recipe.productProfileSnapshot.existingLighting.contrast}` : '未知'}
- 接触区域：${recipe.productProfileSnapshot.contactRegion ? `X轴范围:${recipe.productProfileSnapshot.contactRegion.xStart}至${recipe.productProfileSnapshot.contactRegion.xEnd}, Y轴高度:${recipe.productProfileSnapshot.contactRegion.y}, 置信度:${recipe.productProfileSnapshot.contactRegion.confidence}` : '未知'}
- 主体边界：${recipe.productProfileSnapshot.subjectBounds ? `x:${recipe.productProfileSnapshot.subjectBounds.x}, y:${recipe.productProfileSnapshot.subjectBounds.y}, w:${recipe.productProfileSnapshot.subjectBounds.width}, h:${recipe.productProfileSnapshot.subjectBounds.height}` : '未知'}
注意：绝对不能复述或生成任何产品表面的具体图案、文字、商号、品牌名称或任何特定标识。`.trim(),

    sceneAndStyle: `空间类型：${recipe.scene.spaceType}
墙面材质：${recipe.scene.wallMaterial}
桌面材质：${recipe.scene.desktopMaterial}
桌面色调：${recipe.scene.desktopTone}
背景亮度：${recipe.scene.backgroundBrightness}
整体风格：${recipe.scene.style}
色彩方案：${recipe.scene.palette ? recipe.scene.palette.join('、') : '无'}
家具密度：${recipe.scene.furnitureDensity}`.trim(),

    cameraAndComposition: `构图意图：${recipe.composition.purpose}
产品数量：${recipe.composition.productCount}
相对位置：“为空场景后续叠加真实产品预留的位置与空间关系。” (当前预留放置在: ${recipe.composition.productPosition})
宽度占比：${recipe.composition.productWidthPercent}%
留白区域：${recipe.composition.copySpace}
相机视角：${recipe.composition.cameraView}
相机高度：${recipe.composition.cameraHeight}
镜头景别：${recipe.composition.framing}
透视强度：${recipe.composition.perspectiveStrength}
桌面可见比例：${recipe.composition.desktopVisiblePercent}%
说明：严禁在背景图中直接绘制、生成任何产品主体，所有构图及机位均为了空场景对位和透视配合使用。`.trim(),

    lightingAndDecoration: `光源类型：${recipe.lighting.sourceType}
光源位置：${recipe.lighting.sourcePosition}
色温表现：${recipe.lighting.temperature}
光线柔和度：${recipe.lighting.softness}
对比度：${recipe.lighting.contrast}
阴影方向：${recipe.lighting.shadowDirection}
装饰物密度：${recipe.decoration?.density || '无'}
允许的装饰物：${recipe.decoration?.allowed ? recipe.decoration.allowed.join('、') : '无'}
产品附近禁止出现的装饰物：${recipe.decoration?.forbiddenNearProduct ? recipe.decoration.forbiddenNearProduct.join('、') : '无'}
前景遮挡：foregroundOcclusion=false (不启用前景遮挡，保持干净的视觉空间)`.trim(),

    outputConstraints: `宽高比：${recipe.output.aspectRatio}
分辨率标签：${recipe.output.resolutionLabel}
摄影类型：写实商业室内摄影 (real_commercial_interior_photography)
排除内容：${recipe.output.exclude ? recipe.output.exclude.join('、') : '产品、人物、手部、文字、Logo、水印'}
核心限制：绝对不允许在画面中生成任何产品主体、人物、手部、文字、Logo、水印、签名、侵权或无关的设计元素。`.trim(),
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

  const fullJsonObject: any = {};
  const topLevelKeys = ['task', 'scene', 'composition', 'lighting', 'decoration', 'output'];
  for (const key of topLevelKeys) {
    fullJsonObject[key] = getSortedKeys((recipe as any)[key]);
  }
  if (recipe.inheritance !== undefined && recipe.inheritance !== null) {
    fullJsonObject.inheritance = getSortedKeys(recipe.inheritance);
  }
  const fullJson = JSON.stringify(fullJsonObject, null, 2);

  const objectJson: any = {
    task: compileStableJson({ task: recipe.task }),
    scene: compileStableJson({ scene: recipe.scene }),
    composition: compileStableJson({ composition: recipe.composition }),
    lighting: compileStableJson({ lighting: recipe.lighting }),
    decoration: compileStableJson({ decoration: recipe.decoration }),
    output: compileStableJson({ output: recipe.output }),
  };
  if (recipe.inheritance !== undefined && recipe.inheritance !== null) {
    objectJson.inheritance = compileStableJson({ inheritance: recipe.inheritance });
  }

  const promptDoc: PromptDocument = {
    recipeId: recipe.recipeId,
    recipeVersion: recipe.version,
    compilerVersion: PROMPT_COMPILER_VERSION,
    sections,
    fullPrompt,
    fullJson,
    objectJson,
    createdAt: recipe.updatedAt
  };

  // Scan final prompt document
  scanForSensitiveStrings(promptDoc);

  return promptDoc;
}
