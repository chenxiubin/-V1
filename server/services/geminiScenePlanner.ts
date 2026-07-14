import { Type } from '@google/genai';
import {
  ProductProfile,
  GuidedQuestion,
  GuidedQuestionSchema,
  GuidedAnswer,
  SceneDirection,
  SceneDirectionSchema,
  AnalyzeMatchInput,
  MatchReport
} from '../../src/types/schemas.js';
import { GeminiClient, DefaultGeminiClient } from './geminiProductAnalyzer.js';

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

const QUESTIONS_SYSTEM_PROMPT = `
你是一个专业的电商场景规划专家。基于输入的产品分析数据（ProductProfile），生成 2 到 5 个后续场景规划的引导问题，用于探索用户期望的拍摄场景。

请遵循以下硬性约束：
1. 数量限制：必须生成 2 到 5 个问题。
2. 选项限制：每个问题必须提供 2 到 3 个互斥的选项。
3. 推荐项置前：推荐选项必须放在 options 数组的首位（索引为 0），并提供 recommendationReason（关联当前产品物理属性/颜色/材质的推荐理由）。
4. 避免重复提问：千万不要重复询问 ProductProfile 中已经明确、且置信度为 'high' 的已知事实。例如，如果产品已经是透明材质，不要问“需要什么材质的底座”；如果颜色已确定，不要再问“产品是什么颜色”。
5. 类别约束：每个问题的 category 必须是 'purpose'、'style'、'background_density'、'negative_space'、'inheritance' 之一，且不能重复使用相同的 category。
6. 语言要求：所有面向用户的文本（包括问题文本、选项文本、推荐理由）必须使用简体中文，严禁使用纯英文或完整英文句子（必要的技术英文词汇除外，如 PNG, RGB 等）。

请输出严格符合 JSON 结构的响应。
`;

const QUESTIONS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                recommendationReason: { type: Type.STRING }
              },
              required: ["id", "text"]
            }
          },
          recommendedOptionId: { type: Type.STRING },
          category: { type: Type.STRING, description: "Must be one of: 'purpose', 'style', 'background_density', 'negative_space', 'inheritance'" }
        },
        required: ["id", "text", "options", "category"]
      }
    }
  },
  required: ["questions"]
};

const DIRECTIONS_SYSTEM_PROMPT = `
你是一个专业的视觉艺术指导和电商场景规划专家。基于产品分析数据（ProductProfile）和用户的引导问答回复（GuidedAnswers），规划 3 个具体的场景渲染方向。

请遵循以下硬性约束：
1. 数量限制：必须且只能规划 3 个场景方向。
2. ID 唯一性：每个场景方向的 id 必须是唯一的、不易重复的字符串。
3. 推荐限制：必须有且仅有 1 个场景方向的 recommended 字段为 true，其余为 false。
4. 差异化特征：这 3 个场景方向必须在空间（spaceType）、色调底色/桌面（desktop/palette）、构图（compositionSummary）或装饰（decorationSummary）上存在明显且可验证的差异，让用户有不同的视觉选择。
5. 关联特征推荐：recommended=true 的那个方向，其推荐理由（recommendationReason）深度结合当前产品的核心特征（例如台历的支架材质、主体色调、接触面特性等），给出专业且有说服力的物理搭配原因。
6. 语言要求：所有面向用户的文本（包括方向名称、摘要、推荐理由、桌面、空间类型、各项设计概述及风险提示）必须使用简体中文，严禁使用纯英文或完整英文句子（必要的技术词汇除外）。

请输出严格符合 JSON 结构的响应。
`;

const DIRECTIONS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    directions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          summary: { type: Type.STRING },
          recommended: { type: Type.BOOLEAN },
          recommendationReason: { type: Type.STRING },
          spaceType: { type: Type.STRING },
          desktop: { type: Type.STRING },
          palette: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          lightingSummary: { type: Type.STRING },
          compositionSummary: { type: Type.STRING },
          decorationSummary: { type: Type.STRING },
          risks: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: [
          "id", "name", "summary", "recommended", "recommendationReason",
          "spaceType", "desktop", "palette", "lightingSummary",
          "compositionSummary", "decorationSummary", "risks"
        ]
      }
    }
  },
  required: ["directions"]
};


const RECIPE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scene: {
      type: Type.OBJECT,
      properties: {
        spaceType: { type: Type.STRING },
        wallMaterial: { type: Type.STRING },
        desktopMaterial: { type: Type.STRING },
        desktopTone: { type: Type.STRING },
        backgroundBrightness: { type: Type.STRING },
        style: { type: Type.STRING },
        palette: { type: Type.ARRAY, items: { type: Type.STRING } },
        furnitureDensity: { type: Type.STRING }
      },
      required: ["spaceType", "wallMaterial", "desktopMaterial", "desktopTone", "backgroundBrightness", "style", "palette", "furnitureDensity"]
    },
    composition: {
      type: Type.OBJECT,
      properties: {
        purpose: { type: Type.STRING },
        productCount: { type: Type.NUMBER },
        productPosition: { type: Type.STRING },
        productWidthPercent: { type: Type.NUMBER },
        copySpace: { type: Type.STRING },
        cameraView: { type: Type.STRING },
        cameraHeight: { type: Type.STRING },
        framing: { type: Type.STRING },
        perspectiveStrength: { type: Type.STRING },
        desktopVisiblePercent: { type: Type.NUMBER }
      },
      required: ["purpose", "productCount", "productPosition", "productWidthPercent", "copySpace", "cameraView", "cameraHeight", "framing", "perspectiveStrength", "desktopVisiblePercent"]
    },
    lighting: {
      type: Type.OBJECT,
      properties: {
        sourceType: { type: Type.STRING },
        sourcePosition: { type: Type.STRING },
        temperature: { type: Type.STRING },
        softness: { type: Type.STRING },
        contrast: { type: Type.STRING },
        shadowDirection: { type: Type.STRING }
      },
      required: ["sourceType", "sourcePosition", "temperature", "softness", "contrast", "shadowDirection"]
    },
    decoration: {
      type: Type.OBJECT,
      properties: {
        density: { type: Type.STRING },
        allowed: { type: Type.ARRAY, items: { type: Type.STRING } },
        forbiddenNearProduct: { type: Type.ARRAY, items: { type: Type.STRING } },
        foregroundOcclusion: { type: Type.BOOLEAN }
      },
      required: ["density", "allowed", "forbiddenNearProduct"]
    },
    output: {
      type: Type.OBJECT,
      properties: {
        aspectRatio: { type: Type.STRING },
        resolutionLabel: { type: Type.STRING },
        exclude: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["aspectRatio", "resolutionLabel", "exclude"]
    }
  },
  required: ["scene", "composition", "lighting", "decoration", "output"]
};

const RECIPE_SYSTEM_PROMPT = `You are an expert commercial product photography director.
Your task is to generate a comprehensive Scene Recipe for an EMPTY BACKGROUND that perfectly complements the user's product.
You are given the ProductProfile, the user's GuidedAnswers, and the selected SceneDirection.
You MUST output a valid JSON object matching the requested schema.

Important rules:
1. This is for an EMPTY BACKGROUND. DO NOT generate the product itself.
2. The output exclude array MUST contain things like product, person, hands, text, logo, watermark, humans.
3. The composition settings must leave space for the product.
`;

export class GeminiScenePlannerService {
  private client: GeminiClient | null = null;

  constructor(client?: GeminiClient) {
    if (client) {
      this.client = client;
    }
  }

  private getClient(): GeminiClient {
    if (this.client) {
      return this.client;
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const err = new Error('系统未配置大语言模型 API 密钥(GEMINI_API_KEY)。');
      (err as any).code = 'SERVICE_NOT_CONFIGURED';
      (err as any).retryable = false;
      throw err;
    }
    return new DefaultGeminiClient(key);
  }

  async analyzeMatch(input: AnalyzeMatchInput & { productBuffer: Buffer, sceneBuffer: Buffer, overlayBuffer: Buffer }): Promise<MatchReport> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const err = new Error('系统未配置大语言模型 API 密钥(GEMINI_API_KEY)。');
      (err as any).code = 'SERVICE_NOT_CONFIGURED';
      (err as any).retryable = false;
      throw err;
    }
    
    // 1. Consistency check before calling Gemini
    if (input.sceneAsset.recipeId !== input.sceneRecipe.recipeId || input.sceneAsset.recipeVersion !== input.sceneRecipe.version) {
       throw new Error('场景与Recipe版本不匹配');
    }
    if (input.sceneRecipe.productAssetId !== input.productAsset.id || input.productProfile.productAssetId !== input.productAsset.id) {
       throw new Error('产品不匹配');
    }

    const client = this.getClient();
    const modelName = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';
    const timeoutMs = 60000;

    let attempts = 0;
    let lastError: any = null;
    let feedbackPrompt = '';

    while (attempts < 2) {
      attempts++;
      try {
        const parts = [
          { inlineData: { mimeType: 'image/png', data: input.productBuffer.toString('base64') } },
          { inlineData: { mimeType: 'image/png', data: input.sceneBuffer.toString('base64') } },
          { inlineData: { mimeType: 'image/png', data: input.overlayBuffer.toString('base64') } },
          { text: feedbackPrompt ? `[Previous Attempt Failed with error: ${feedbackPrompt}]. Correct JSON.` : `分析产品与场景匹配。${JSON.stringify({profile: input.productProfile, recipe: input.sceneRecipe})}` }
        ];
        const apiCall = client.generateContent({
          model: modelName,
          contents: { parts },
          config: { responseMimeType: 'application/json' },
        });

        const response = await this.withTimeout(apiCall, timeoutMs, '超时');
        const parsed = JSON.parse(response.text);
        
        // 2. Determine-istic validation
        this.validateMatchReport(parsed, input);
        
        return parsed as MatchReport;
      } catch (err: any) { lastError = err; feedbackPrompt = err.message; }
    }
    throw lastError;
  }

  private validateMatchReport(report: any, input: AnalyzeMatchInput): void {
      if (report.recipeVersion !== input.sceneRecipe.version) {
          throw new Error('recipeVersion 与输入不一致');
      }
      
      const issueIds = new Set<string>();
      for (const issue of report.issues || []) {
          if (issueIds.has(issue.id)) throw new Error(`Issue ID 重复: ${issue.id}`);
          issueIds.add(issue.id);
          
          if (!this.hasChinese(issue.evidence)) throw new Error('Evidence 必须为中文');
          if (!this.hasChinese(issue.description)) throw new Error('Description 必须为中文');
          
          for (const patch of issue.suggestedPatch || []) {
              const allowedPrefixes = ['/scene/', '/composition/', '/lighting/', '/decoration/'];
              if (!allowedPrefixes.some(p => patch.path.startsWith(p))) {
                  throw new Error(`非法 Patch 路径: ${patch.path}`);
              }
          }
      }
      
      for (const strength of report.strengths || []) {
          if (!this.hasChinese(strength)) throw new Error('Strengths 必须为中文');
      }
  }

  // Simplified Chinese Check Helper
  private hasChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  private normalizeString(text: string): string {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizePalette(palette: string[]): string {
    if (!palette || !Array.isArray(palette)) return '';
    return palette
      .map(p => this.normalizeString(p))
      .filter(p => p !== '')
      .sort()
      .join(',');
  }

  async generateGuidedQuestions(profile: ProductProfile): Promise<GuidedQuestion[]> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const err = new Error('系统未配置大语言模型 API 密钥(GEMINI_API_KEY)。');
      (err as any).code = 'SERVICE_NOT_CONFIGURED';
      (err as any).retryable = false;
      throw err;
    }

    const client = this.getClient();
    const modelName = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';
    const timeoutMs = Number(process.env.GEMINI_ANALYSIS_TIMEOUT_MS) || 30000;

    let attempts = 0;
    let lastError: any = null;
    let feedbackPrompt = '';

    while (attempts < 2) {
      attempts++;
      try {
        const textPart = {
          text: feedbackPrompt
            ? `${QUESTIONS_SYSTEM_PROMPT}\n\n[Previous Attempt Failed with error: ${feedbackPrompt}]. Please correct the JSON output to strictly match requirements.`
            : `${QUESTIONS_SYSTEM_PROMPT}\n\nInput ProductProfile: ${JSON.stringify(profile)}`
        };

        const apiCall = client.generateContent({
          model: modelName,
          contents: { parts: [textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: QUESTIONS_RESPONSE_SCHEMA,
          },
        });

        const response = await this.withTimeout(
          apiCall,
          timeoutMs,
          'Gemini API 生成引导问题请求超时。'
        );

        if (!response || !response.text) {
          throw new Error('Gemini 模型返回了空响应');
        }

        const text = response.text.trim();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          feedbackPrompt = `JSON parsing failed: ${jsonErr.message}`;
          lastError = jsonErr;
          continue;
        }

        const questionsList = parsed.questions;
        if (!Array.isArray(questionsList)) {
          feedbackPrompt = 'Output JSON root "questions" must be an array';
          lastError = new Error(feedbackPrompt);
          continue;
        }

        // Limit validations
        if (questionsList.length < 2 || questionsList.length > 5) {
          feedbackPrompt = `Generated questions count must be between 2 and 5, got ${questionsList.length}`;
          lastError = new Error(feedbackPrompt);
          continue;
        }

        let validationPassed = true;
        const categoriesSeen = new Set<string>();

        for (const q of questionsList) {
          const zodCheck = GuidedQuestionSchema.safeParse(q);
          if (!zodCheck.success) {
            feedbackPrompt = `GuidedQuestion schema validation failed: ${zodCheck.error.issues.map(i => i.message).join(', ')}`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          if (q.options.length < 2 || q.options.length > 3) {
            feedbackPrompt = `Question ID ${q.id} options count must be between 2 and 3, got ${q.options.length}`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          // Simplified Chinese Check
          if (!this.hasChinese(q.text)) {
            feedbackPrompt = `Question text must be in Simplified Chinese: "${q.text}"`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          // 1. recommendedOptionId non-empty check
          if (!q.recommendedOptionId || typeof q.recommendedOptionId !== 'string' || q.recommendedOptionId.trim() === '') {
            feedbackPrompt = `Question ID ${q.id} recommendedOptionId is missing or empty.`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          // 2. unique options id check
          const optionIds = q.options.map((opt: any) => opt.id);
          const optionIdsSet = new Set(optionIds);
          if (optionIdsSet.size !== q.options.length) {
            feedbackPrompt = `Question ID ${q.id} has duplicate option IDs.`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          // 3. recommendedOptionId exists in option IDs
          if (!optionIdsSet.has(q.recommendedOptionId)) {
            feedbackPrompt = `Question ID ${q.id} recommendedOptionId "${q.recommendedOptionId}" does not exist in options.`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          // 4. recommended option must be at index 0 of options array
          if (q.options[0].id !== q.recommendedOptionId) {
            feedbackPrompt = `Question ID ${q.id} recommended option (id: ${q.recommendedOptionId}) must be at index 0 of options.`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          for (const opt of q.options) {
            if (!this.hasChinese(opt.text)) {
              feedbackPrompt = `Option text must be in Simplified Chinese: "${opt.text}"`;
              lastError = new Error(feedbackPrompt);
              validationPassed = false;
              break;
            }
            if (opt.recommendationReason && !this.hasChinese(opt.recommendationReason)) {
              feedbackPrompt = `Option recommendation reason must be in Simplified Chinese: "${opt.recommendationReason}"`;
              lastError = new Error(feedbackPrompt);
              validationPassed = false;
              break;
            }
          }

          if (!validationPassed) break;

          categoriesSeen.add(q.category);
        }

        if (!validationPassed) {
          continue;
        }

        return questionsList;

      } catch (err: any) {
        lastError = err;
        if (err.code === 'TIMEOUT') {
          throw err;
        }
        feedbackPrompt = err.message || '未知异常';
      }
    }

    const parseErr = new Error(`生成引导问题大模型响应解析及校验失败: ${lastError?.message || '未知错误'}`);
    (parseErr as any).code = 'GEMINI_PARSE_FAILED';
    (parseErr as any).retryable = false;
    throw parseErr;
  }

  async planSceneDirections(profile: ProductProfile, answers: GuidedAnswer[]): Promise<SceneDirection[]> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const err = new Error('系统未配置大语言模型 API 密钥(GEMINI_API_KEY)。');
      (err as any).code = 'SERVICE_NOT_CONFIGURED';
      (err as any).retryable = false;
      throw err;
    }

    const client = this.getClient();
    const modelName = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';
    const timeoutMs = Number(process.env.GEMINI_ANALYSIS_TIMEOUT_MS) || 30000;

    let attempts = 0;
    let lastError: any = null;
    let feedbackPrompt = '';

    while (attempts < 2) {
      attempts++;
      try {
        const textPart = {
          text: feedbackPrompt
            ? `${DIRECTIONS_SYSTEM_PROMPT}\n\n[Previous Attempt Failed with error: ${feedbackPrompt}]. Please correct the JSON output to strictly match requirements.`
            : `${DIRECTIONS_SYSTEM_PROMPT}\n\nInput ProductProfile: ${JSON.stringify(profile)}\nInput GuidedAnswers: ${JSON.stringify(answers)}`
        };

        const apiCall = client.generateContent({
          model: modelName,
          contents: { parts: [textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: DIRECTIONS_RESPONSE_SCHEMA,
          },
        });

        const response = await this.withTimeout(
          apiCall,
          timeoutMs,
          'Gemini API 规划场景方向请求超时。'
        );

        if (!response || !response.text) {
          throw new Error('Gemini 模型返回了空响应');
        }

        const text = response.text.trim();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          feedbackPrompt = `JSON parsing failed: ${jsonErr.message}`;
          lastError = jsonErr;
          continue;
        }

        const directionsList = parsed.directions;
        if (!Array.isArray(directionsList)) {
          feedbackPrompt = 'Output JSON root "directions" must be an array';
          lastError = new Error(feedbackPrompt);
          continue;
        }

        // Limit validations: strictly 3
        if (directionsList.length !== 3) {
          feedbackPrompt = `Scene directions count must be exactly 3, got ${directionsList.length}`;
          lastError = new Error(feedbackPrompt);
          continue;
        }

        // Unique ID check
        const ids = directionsList.map(d => d.id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== 3) {
          feedbackPrompt = `Scene directions must have unique IDs, got duplicate in [${ids.join(', ')}]`;
          lastError = new Error(feedbackPrompt);
          continue;
        }

        // Recommended check: exactly 1 recommended direction
        const recommendedCount = directionsList.filter(d => d.recommended === true).length;
        if (recommendedCount !== 1) {
          feedbackPrompt = `There must be exactly one recommended scene direction, got ${recommendedCount}`;
          lastError = new Error(feedbackPrompt);
          continue;
        }

        let validationPassed = true;
        for (const d of directionsList) {
          const zodCheck = SceneDirectionSchema.safeParse(d);
          if (!zodCheck.success) {
            feedbackPrompt = `SceneDirection schema validation failed: ${zodCheck.error.issues.map(i => i.message).join(', ')}`;
            lastError = new Error(feedbackPrompt);
            validationPassed = false;
            break;
          }

          // Simplified Chinese Check
          const fieldsToCheck = [
            d.name, d.summary, d.recommendationReason, d.spaceType, d.desktop,
            d.lightingSummary, d.compositionSummary, d.decorationSummary,
            ...(d.risks || [])
          ];

          for (const field of fieldsToCheck) {
            if (field && !this.hasChinese(field)) {
              feedbackPrompt = `Fields must be in Simplified Chinese: "${field}"`;
              lastError = new Error(feedbackPrompt);
              validationPassed = false;
              break;
            }
          }

          if (!validationPassed) break;
        }

        if (!validationPassed) {
          continue;
        }

        // --- NEW DETERMINISTIC DIFFERENCE CHECK ---
        const [A, B, C] = directionsList;
        const pairAB = {
          space: (this.normalizeString(A.spaceType) !== this.normalizeString(B.spaceType)) || (this.normalizeString(A.desktop) !== this.normalizeString(B.desktop)),
          tone: (this.normalizePalette(A.palette) !== this.normalizePalette(B.palette)),
          light: (this.normalizeString(A.lightingSummary) !== this.normalizeString(B.lightingSummary)),
          comp: (this.normalizeString(A.compositionSummary) !== this.normalizeString(B.compositionSummary)),
          dec: (this.normalizeString(A.decorationSummary) !== this.normalizeString(B.decorationSummary))
        };

        const pairBC = {
          space: (this.normalizeString(B.spaceType) !== this.normalizeString(C.spaceType)) || (this.normalizeString(B.desktop) !== this.normalizeString(C.desktop)),
          tone: (this.normalizePalette(B.palette) !== this.normalizePalette(C.palette)),
          light: (this.normalizeString(B.lightingSummary) !== this.normalizeString(C.lightingSummary)),
          comp: (this.normalizeString(B.compositionSummary) !== this.normalizeString(C.compositionSummary)),
          dec: (this.normalizeString(B.decorationSummary) !== this.normalizeString(C.decorationSummary))
        };

        const pairCA = {
          space: (this.normalizeString(C.spaceType) !== this.normalizeString(A.spaceType)) || (this.normalizeString(C.desktop) !== this.normalizeString(A.desktop)),
          tone: (this.normalizePalette(C.palette) !== this.normalizePalette(A.palette)),
          light: (this.normalizeString(C.lightingSummary) !== this.normalizeString(A.lightingSummary)),
          comp: (this.normalizeString(C.compositionSummary) !== this.normalizeString(A.compositionSummary)),
          dec: (this.normalizeString(C.decorationSummary) !== this.normalizeString(A.decorationSummary))
        };

        // 1. Pairwise check: at least one core difference dimension must differ between any two directions
        if (!pairAB.space && !pairAB.tone && !pairAB.light && !pairAB.comp && !pairAB.dec) {
          feedbackPrompt = `方向 "${A.name}" (ID: ${A.id}) 与 方向 "${B.name}" (ID: ${B.id}) 在空间、色调、光线、构图和装饰上完全没有实质性差异。`;
          lastError = new Error(feedbackPrompt);
          continue;
        } else if (!pairBC.space && !pairBC.tone && !pairBC.light && !pairBC.comp && !pairBC.dec) {
          feedbackPrompt = `方向 "${B.name}" (ID: ${B.id}) 与 方向 "${C.name}" (ID: ${C.id}) 在空间、色调、光线、构图和装饰上完全没有实质性差异。`;
          lastError = new Error(feedbackPrompt);
          continue;
        } else if (!pairCA.space && !pairCA.tone && !pairCA.light && !pairCA.comp && !pairCA.dec) {
          feedbackPrompt = `方向 "${C.name}" (ID: ${C.id}) 与 方向 "${A.name}" (ID: ${A.id}) 在空间、色调、光线、构图和装饰上完全没有实质性差异。`;
          lastError = new Error(feedbackPrompt);
          continue;
        }

        // 2. Groupwide check: across the three directions, there must be changes in at least 2 dimensions
        const hasSpaceChange = pairAB.space || pairBC.space || pairCA.space;
        const hasToneChange = pairAB.tone || pairBC.tone || pairCA.tone;
        const hasLightChange = pairAB.light || pairBC.light || pairCA.light;
        const hasCompositionChange = pairAB.comp || pairBC.comp || pairCA.comp;
        const hasDecorationChange = pairAB.dec || pairBC.dec || pairCA.dec;

        const variedCount = (hasSpaceChange ? 1 : 0) +
                            (hasToneChange ? 1 : 0) +
                            (hasLightChange ? 1 : 0) +
                            (hasCompositionChange ? 1 : 0) +
                            (hasDecorationChange ? 1 : 0);

        if (variedCount < 2) {
          feedbackPrompt = `三个方向作为一组，必须至少在两个核心差异维度（空间、色调、光线、构图、装饰）上存在变化。当前仅有 ${variedCount} 个维度发生变化。请丰富各个场景方向的特异性。`;
          lastError = new Error(feedbackPrompt);
          continue;
        }

        return directionsList;

      } catch (err: any) {
        lastError = err;
        if (err.code === 'TIMEOUT') {
          throw err;
        }
        feedbackPrompt = err.message || '未知异常';
      }
    }

    const parseErr = new Error(`规划场景方向大模型响应解析及校验失败: ${lastError?.message || '未知错误'}`);
    (parseErr as any).code = 'GEMINI_PARSE_FAILED';
    (parseErr as any).retryable = false;
    throw parseErr;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(errorMsg);
        (err as any).code = 'TIMEOUT';
        (err as any).retryable = true;
        reject(err);
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  }

  async createSceneRecipe(
    profile: ProductProfile,
    answers: GuidedAnswer[],
    directions: SceneDirection[],
    selectedDirectionId: string,
    productAsset?: any
  ): Promise<any> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const err = new Error('系统未配置大语言模型 API 密钥(GEMINI_API_KEY)。');
      (err as any).code = 'SERVICE_NOT_CONFIGURED';
      (err as any).retryable = false;
      throw err;
    }

    const currentProductAssetId = productAsset?.id || profile.productAssetId;
    const productProfileProductAssetId = profile.productAssetId;
    const createRecipeInputProductAssetId = profile.productAssetId;

    // Output desensitized ID diagnosis before calling Gemini
    console.log('[ID Diagnosis] Pre-Gemini Call Variables:', {
      currentProductAssetId,
      productProfileProductAssetId,
      createRecipeInputProductAssetId,
      selectedDirectionId
    });

    if (productAsset && productAsset.id !== profile.productAssetId) {
      console.warn(`[ID Diagnosis Mismatch] currentProductAssetId (${productAsset.id}) does not match productProfile.productAssetId (${profile.productAssetId})`);
      const err = new Error('当前产品与场景规划数据不一致，可能是产品被替换或历史状态已过期。请返回产品分析后重新规划。');
      (err as any).code = 'PRODUCT_ASSET_MISMATCH';
      (err as any).retryable = false;
      throw err;
    }

    const client = this.getClient();
    const modelName = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';
    const timeoutMs = Number(process.env.GEMINI_ANALYSIS_TIMEOUT_MS) || 30000;

    let attempts = 0;
    let lastError: any = null;
    let feedbackPrompt = '';
    
    const selectedDirection = directions.find(d => d.id === selectedDirectionId);
    if (!selectedDirection) {
      const err = new Error('selectedDirectionId not found in directions');
      (err as any).code = 'INVALID_DIRECTION';
      (err as any).retryable = false;
      throw err;
    }

    while (attempts < 2) {
      attempts++;
      try {
        const textPart = {
          text: feedbackPrompt
            ? `${RECIPE_SYSTEM_PROMPT}\n\n[Previous Attempt Failed with error: ${feedbackPrompt}]. Please correct the JSON output to strictly match requirements.`
            : `${RECIPE_SYSTEM_PROMPT}\n\nInput ProductProfile: ${JSON.stringify(profile)}\nInput GuidedAnswers: ${JSON.stringify(answers)}\nSelected SceneDirection: ${JSON.stringify(selectedDirection)}`
        };

        const apiCall = client.generateContent({
          model: modelName,
          contents: { parts: [textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: RECIPE_RESPONSE_SCHEMA,
          },
        });

        const response = await this.withTimeout(
          apiCall,
          timeoutMs,
          'Gemini API 创建 Recipe 请求超时。'
        );

        if (!response || !response.text) {
          throw new Error('Gemini 模型返回了空响应');
        }

        const text = response.text.trim();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          feedbackPrompt = `JSON parsing failed: ${jsonErr.message}`;
          lastError = jsonErr;
          continue;
        }

        if (!parsed.scene?.spaceType) {
          throw new Error('scene.spaceType is required');
        }

        if (typeof parsed.composition?.productCount !== 'number' || !Number.isInteger(parsed.composition.productCount) || parsed.composition.productCount < 1) {
          throw new Error('productCount must be a positive integer');
        }
        if (typeof parsed.composition?.productWidthPercent !== 'number' || parsed.composition.productWidthPercent < 1 || parsed.composition.productWidthPercent > 100 || !Number.isFinite(parsed.composition.productWidthPercent)) {
          throw new Error('productWidthPercent must be a finite number between 1 and 100');
        }
        if (typeof parsed.composition?.desktopVisiblePercent !== 'number' || parsed.composition.desktopVisiblePercent < 0 || parsed.composition.desktopVisiblePercent > 100 || !Number.isFinite(parsed.composition.desktopVisiblePercent)) {
          throw new Error('desktopVisiblePercent must be a finite number between 0 and 100');
        }
        if (parsed.decoration?.foregroundOcclusion === true) {
          throw new Error('foregroundOcclusion must be false');
        }

        // Output exclude categories validation on parsed.output FIRST to ensure retry/feedback triggers correctly on raw model output
        const rawExcludeStr = (parsed.output?.exclude || []).join(' ').toLowerCase();
        const rawMissingCategories = [];
        if (!/(product|产品|商品|台历)/.test(rawExcludeStr)) rawMissingCategories.push('product');
        if (!/(person|people|human|人物|人像)/.test(rawExcludeStr)) rawMissingCategories.push('person');
        if (!/(hand|hands|手部|双手|手掌|手指|人物手部|(?<![机册工])手(?![机册工]))/.test(rawExcludeStr)) rawMissingCategories.push('hands');
        if (!/(text|word|lettering|文字|文案|字符)/.test(rawExcludeStr)) rawMissingCategories.push('text');
        if (!/(logo|标志|品牌标识)/.test(rawExcludeStr)) rawMissingCategories.push('logo');
        if (!/(watermark|水印)/.test(rawExcludeStr)) rawMissingCategories.push('watermark');
        if (rawMissingCategories.length > 0) {
          throw new Error('output.exclude is missing required categories: ' + rawMissingCategories.join(', '));
        }

        // Auto-complete output.exclude categories (for absolute backend safety on successful validation path)
        const rawExclude = parsed.output?.exclude || [];
        const finalExclude = [...rawExclude];
        const excludeStr = finalExclude.join(' ').toLowerCase();
        
        if (!/(product|产品|商品|台历)/.test(excludeStr)) {
          finalExclude.push('product');
        }
        if (!/(person|people|human|人物|人像)/.test(excludeStr)) {
          finalExclude.push('person');
        }
        if (!/(hand|hands|手部|双手|手掌|手指|人物手部|(?<![机册工])手(?![机册工]))/.test(excludeStr)) {
          finalExclude.push('hands');
        }
        if (!/(text|word|lettering|文字|文案|字符)/.test(excludeStr)) {
          finalExclude.push('text');
        }
        if (!/(logo|标志|品牌标识)/.test(excludeStr)) {
          finalExclude.push('logo');
        }
        if (!/(watermark|水印)/.test(excludeStr)) {
          finalExclude.push('watermark');
        }

        const recipe = {
          schemaVersion: '1.0',
          recipeId: `rec-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
          version: 1,
          productAssetId: profile.productAssetId,
          productProfileSnapshot: JSON.parse(JSON.stringify(profile)),
          guidedAnswers: answers,
          selectedDirectionId: selectedDirectionId,
          task: {
            operation: 'generate_empty_scene_background',
            productRole: 'analysis_and_spatial_reference_only',
            backgroundOnly: true
          },
          scene: parsed.scene,
          composition: parsed.composition,
          lighting: parsed.lighting,
          decoration: {
            ...parsed.decoration,
            foregroundOcclusion: false
          },
          output: {
            ...parsed.output,
            exclude: finalExclude,
            realism: 'real_commercial_interior_photography'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Output exclude categories validation
        const checkExcludeStr = (recipe.output.exclude || []).join(' ').toLowerCase();
        const missingCategories = [];
        if (!/(product|产品|商品|台历)/.test(checkExcludeStr)) missingCategories.push('product');
        if (!/(person|people|human|人物|人像)/.test(checkExcludeStr)) missingCategories.push('person');
        if (!/(hand|hands|手部|双手|手掌|手指|人物手部|(?<![机册工])手(?![机册工]))/.test(checkExcludeStr)) missingCategories.push('hands');
        if (!/(text|word|lettering|文字|文案|字符)/.test(checkExcludeStr)) missingCategories.push('text');
        if (!/(logo|标志|品牌标识)/.test(checkExcludeStr)) missingCategories.push('logo');
        if (!/(watermark|水印)/.test(checkExcludeStr)) missingCategories.push('watermark');
        if (missingCategories.length > 0) {
          throw new Error('output.exclude is missing required categories: ' + missingCategories.join(', '));
        }

        // Recursive sensitive string scan
        scanForSensitiveStrings(recipe);

        return recipe;
      } catch (error: any) {
        lastError = error;
        const msg = error.message || '';
        if (msg.includes('Timeout') || msg.includes('超时')) {
          const err = new Error('模型请求超时，请稍后再试。');
          (err as any).code = 'GEMINI_TIMEOUT';
          (err as any).retryable = true;
          throw err;
        }
        feedbackPrompt = `Execution error: ${msg}`;
        console.error('LAST_ERROR:', error);
      }
    }

    const parseErr = new Error(`无法生成合法的 Recipe，多次尝试后失败: ${lastError?.message}`);
    (parseErr as any).code = 'GEMINI_PARSE_FAILED';
    (parseErr as any).retryable = false;
    throw parseErr;
  }

}