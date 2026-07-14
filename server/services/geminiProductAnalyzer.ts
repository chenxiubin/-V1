import { GoogleGenAI, Type } from '@google/genai';
import { ProductProfile, ProductProfileSchema } from '../../src/types/schemas.js';
import { ProductAnalysisService } from './productAnalysisService.js';

// Centralized configurations as required by Phase 2-B2
export const GEMINI_ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';
export const GEMINI_ANALYSIS_TIMEOUT_MS = Number(process.env.GEMINI_ANALYSIS_TIMEOUT_MS) || 120000;

export interface GeminiClient {
  generateContent(params: any): Promise<any>;
}

export class DefaultGeminiClient implements GeminiClient {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  async generateContent(params: any): Promise<any> {
    return this.ai.models.generateContent(params);
  }
}

const SYSTEM_PROMPT = `
你是一个专业的台历多模态分析助手。请通过图像进行客观的物理和视觉属性分析，遵循以下硬性约束：
1. 只分析可观察的产品类型、支架类型、主体边界、接触区域（底部接触面）、视角、材质、颜色和已有光线。
2. 绝对不输出或识别产品（台历等）上的具体任何文字内容或语言。
3. 绝对不推测图像中看不到、被遮挡或无法观测的物理结构。
4. 无法判断或不确定任何属性时，请对应字段填入 "unknown"，并将相关置信度字段设为 "low"。
5. 绝对不输出任何具体的、精确的物理角度或度数。
6. 绝对不声明或得出“高保真”、“100%准确”或“物理无瑕疵”等夸大或不可靠的绝对结论。
7. 以客观、中性、纯粹的物理属性描述为主。
8. uncertainties 数组中每个对象的 reason 字段必须使用简体中文进行简练说明，严禁使用完整英文句子，但允许中文内容中包含必要的英文技术词汇（例如 PNG、JSON、Alpha等）。

请按指定 schema 结构输出 JSON 响应，除 Zod 强校验要求填充的内容外，保持极简和客观。
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    schemaVersion: {
      type: Type.STRING,
      description: "Must be '1.0'"
    },
    productType: {
      type: Type.STRING,
      description: "Product category. Must be one of: 'desk_calendar', 'wall_calendar', 'packaging', 'combination', 'unknown'"
    },
    bracketType: {
      type: Type.STRING,
      description: "Bracket/support type. Must be one of: 'paper_base', 'metal_frame', 'acrylic_frame', 'wood_base', 'other', 'unknown'"
    },
    subjectBounds: {
      type: Type.OBJECT,
      description: "Subject bounding box in pixels",
      properties: {
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER }
      },
      required: ["x", "y", "width", "height"]
    },
    contactRegion: {
      type: Type.OBJECT,
      description: "Contact interface on the supporting plane",
      properties: {
        xStart: { type: Type.NUMBER },
        xEnd: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        confidence: { type: Type.STRING, description: "'high', 'medium', or 'low'" }
      },
      required: ["xStart", "xEnd", "y", "confidence"]
    },
    view: {
      type: Type.OBJECT,
      description: "Perspective and viewpoint details",
      properties: {
        class: { type: Type.STRING, description: "'front', 'front_left', 'front_right', 'slight_top', 'high_top', or 'unknown'" },
        visibleTop: { type: Type.STRING, description: "'none', 'low', 'medium', 'high', or 'unknown'" },
        visibleSide: { type: Type.STRING, description: "'none', 'left', 'right', 'both', or 'unknown'" },
        perspectiveStrength: { type: Type.STRING, description: "'low', 'medium', 'high', or 'unknown'" }
      },
      required: ["class", "visibleTop", "visibleSide", "perspectiveStrength"]
    },
    materials: {
      type: Type.ARRAY,
      description: "Detected physical materials list",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "'paper', 'metal', 'acrylic', 'wood', 'plastic', 'fabric', or 'other'" },
          reflectivity: { type: Type.STRING, description: "'low', 'medium', or 'high'" }
        },
        required: ["name", "reflectivity"]
      }
    },
    palette: {
      type: Type.OBJECT,
      description: "Color palette parameters",
      properties: {
        dominant: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Dominant color hex strings (e.g., #2C3E50)"
        },
        edgeBrightness: { type: Type.STRING, description: "'dark', 'mid', 'light', or 'mixed'" }
      },
      required: ["dominant", "edgeBrightness"]
    },
    existingLighting: {
      type: Type.OBJECT,
      description: "Identified natural environment light parameters",
      properties: {
        direction: { type: Type.STRING, description: "'upper_left', 'upper_right', 'front', 'top', 'diffuse', or 'unknown'" },
        temperature: { type: Type.STRING, description: "'cool', 'neutral', 'neutral_warm', 'warm', or 'unknown'" },
        softness: { type: Type.STRING, description: "'hard', 'medium', 'soft', or 'unknown'" },
        contrast: { type: Type.STRING, description: "'low', 'medium', 'high', or 'unknown'" }
      },
      required: ["direction", "temperature", "softness", "contrast"]
    },
    uncertainties: {
      type: Type.ARRAY,
      description: "List of uncertain properties or parameters",
      items: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING, description: "Name of the target property" },
          reason: { type: Type.STRING, description: "使用简体中文简练说明不确定性或模糊性的原因，严禁使用英文整句" },
          confidence: { type: Type.STRING, description: "'high', 'medium', or 'low'" }
        },
        required: ["field", "reason", "confidence"]
      }
    },
    overallConfidence: { type: Type.STRING, description: "'high', 'medium', or 'low'" }
  },
  required: [
    "schemaVersion",
    "productType",
    "bracketType",
    "subjectBounds",
    "contactRegion",
    "view",
    "materials",
    "palette",
    "existingLighting",
    "uncertainties",
    "overallConfidence"
  ]
};

export class GeminiProductAnalysisService implements ProductAnalysisService {
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

  async analyze(fileBuffer: Buffer, mimeType: string, productAssetId: string): Promise<ProductProfile> {
    // 1. Force key validation at invocation time
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const err = new Error('系统未配置大语言模型 API 密钥(GEMINI_API_KEY)。');
      (err as any).code = 'SERVICE_NOT_CONFIGURED';
      (err as any).retryable = false;
      throw err;
    }

    const client = this.getClient();

    if (!productAssetId) {
      const err = new Error('缺少可信产品资产关联标识(productAssetId)');
      (err as any).code = 'MISSING_ASSET_ID';
      (err as any).retryable = false;
      throw err;
    }

    const base64Data = fileBuffer.toString('base64');
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const analyzedAt = new Date().toISOString();
    const modelName = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash';
    const timeoutMs = Number(process.env.GEMINI_ANALYSIS_TIMEOUT_MS) || 120000;

    let attempts = 0;
    let lastError: any = null;
    let feedbackPrompt = '';

    while (attempts < 2) {
      attempts++;
      try {
        const textPart = {
          text: feedbackPrompt 
            ? `${SYSTEM_PROMPT}\n\n[Previous Attempt Failed with validation error: ${feedbackPrompt}]. Please fix it and output exactly compliant JSON conforming to the schema.`
            : SYSTEM_PROMPT
        };

        // Promise with configurable timeout
        const apiCall = client.generateContent({
          model: modelName,
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        });

        const response = await this.withTimeout(
          apiCall,
          timeoutMs,
          'Gemini API 分析产品请求超时。'
        );

        if (!response || !response.text) {
          throw new Error('Gemini 模型返回了空响应');
        }

        const text = response.text.trim();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          lastError = new Error(`JSON解析失败: ${jsonErr.message}`);
          feedbackPrompt = `Invalid JSON response: ${jsonErr.message}`;
          continue; // Retry once
        }

        // Force injection of trusted server-side properties (cannot be overridden by model)
        parsed.productAssetId = productAssetId;
        parsed.analyzedAt = analyzedAt;
        if (!parsed.schemaVersion) {
          parsed.schemaVersion = '1.0';
        }

        // Validate structure against the official Zod schema contract
        const check = ProductProfileSchema.safeParse(parsed);
        if (!check.success) {
          const errMsg = check.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          lastError = new Error(`Zod 强契约校验失败: ${errMsg}`);
          feedbackPrompt = `Response JSON does not match ProductProfile Schema: ${errMsg}`;
          continue; // Retry once
        }

        return check.data; // Successfully validated, return it!

      } catch (err: any) {
        lastError = err;
        if (err.code === 'TIMEOUT') {
          // Timeout should fail fast or retry depending on preference, but we propagate
          throw err;
        }
        feedbackPrompt = err.message || '未知异常';
      }
    }

    // If both attempts failed, return standard GEMINI_PARSE_FAILED error without leaking internals/API keys/Base64
    const parseErr = new Error(`分析产品大模型响应解析及校验失败: ${lastError?.message || '未知错误'}`);
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
        (err as any).retryable = true; // Timeout can typically be retried
        reject(err);
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  }
}
