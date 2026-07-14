# AI Studio技术架构、AI编排与数据契约

## 1. Google AI Studio目标架构

```text
React客户端
├─ 产品上传与透明预览
├─ 引导问题和场景方向
├─ 提示词/JSON复制
├─ 场景图粘贴
└─ 产品叠加预览

Node.js服务端
├─ Gemini服务端适配层
├─ ProductProfile结构化分析
├─ SceneDirection与SceneRecipe规划
├─ MatchReport分析
├─ RecipePatch规划
└─ Schema验证与错误处理

共享纯逻辑
├─ Schema和类型
├─ PromptCompiler
├─ RecipePatch校验
└─ 版本迁移
```

## 2. 强制技术规则

- Gemini API只从Node.js服务端调用。
- 使用AI Studio Secrets注入`GEMINI_API_KEY`。
- 客户端代码、可复制JSON、日志和错误信息不得出现Key。
- 使用官方`@google/genai` SDK的当前稳定能力；新项目优先采用Interactions API，但必须封装适配层，业务代码不直接依赖具体端点。
- V1不调用图像生成API，只调用图像理解和文本/结构化规划能力。
- 所有模型输出必须经过运行时Schema验证。
- AI返回结果不能直接修改客户端Store。
- PromptCompiler使用确定性代码，不用AI自由重写全文。
- V1不自动添加Firebase、登录或数据库；图片优先用IndexedDB，文本项目使用现有持久化或IndexedDB。

## 3. 服务接口

```ts
interface SceneIntelligenceAdapter {
  analyzeProduct(input: AnalyzeProductInput): Promise<ProductProfile>;
  generateGuidedQuestions(input: GuidedQuestionInput): Promise<GuidedQuestion[]>;
  planSceneDirections(input: PlanDirectionsInput): Promise<SceneDirection[]>;
  createSceneRecipe(input: CreateRecipeInput): Promise<SceneRecipe>;
  analyzeMatch(input: AnalyzeMatchInput): Promise<MatchReport>;
  proposeRecipePatch(input: ProposePatchInput): Promise<RecipePatchOperation[]>;
  planNextSeriesShot(input: PlanNextShotInput): Promise<NextShotPlan>;
}
```

建议服务端路由：

```text
POST /api/ai/analyze-product
POST /api/ai/guided-questions
POST /api/ai/scene-directions
POST /api/ai/scene-recipe
POST /api/ai/analyze-match
POST /api/ai/recipe-patch
POST /api/ai/series/plan-next
```

## 4. 核心类型

```ts
type Confidence = "high" | "medium" | "low";

interface ProductAsset {
  id: string;
  name: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  hasAlpha: boolean;
  persistedAssetRef: string;
  createdAt: string;
}

interface ProductProfile {
  schemaVersion: "1.0";
  productAssetId: string;
  productType: "desk_calendar" | "wall_calendar" | "packaging" | "combination" | "unknown";
  bracketType: "paper_base" | "metal_frame" | "acrylic_frame" | "wood_base" | "other" | "unknown";
  subjectBounds: { x: number; y: number; width: number; height: number };
  contactRegion: { xStart: number; xEnd: number; y: number; confidence: Confidence };
  view: {
    class: "front" | "front_left" | "front_right" | "slight_top" | "high_top" | "unknown";
    visibleTop: "none" | "low" | "medium" | "high" | "unknown";
    visibleSide: "none" | "left" | "right" | "both" | "unknown";
    perspectiveStrength: "low" | "medium" | "high" | "unknown";
  };
  materials: Array<{
    name: "paper" | "metal" | "acrylic" | "wood" | "plastic" | "fabric" | "other";
    reflectivity: "low" | "medium" | "high";
  }>;
  palette: { dominant: string[]; edgeBrightness: "dark" | "mid" | "light" | "mixed" };
  existingLighting: {
    direction: "upper_left" | "upper_right" | "front" | "top" | "diffuse" | "unknown";
    temperature: "cool" | "neutral" | "neutral_warm" | "warm" | "unknown";
    softness: "hard" | "medium" | "soft" | "unknown";
    contrast: "low" | "medium" | "high" | "unknown";
  };
  uncertainties: Array<{ field: string; reason: string; confidence: Confidence }>;
  overallConfidence: Confidence;
  analyzedAt: string;
}

interface GuidedAnswer {
  questionId: string;
  optionId: string;
  answeredAt: string;
}

interface SceneDirection {
  id: string;
  name: string;
  summary: string;
  recommended: boolean;
  recommendationReason: string;
  spaceType: string;
  desktop: string;
  palette: string[];
  lightingSummary: string;
  compositionSummary: string;
  decorationSummary: string;
  risks: string[];
}
```

## 5. SceneRecipe唯一事实源

```ts
interface SceneRecipe {
  schemaVersion: "1.0";
  recipeId: string;
  version: number;
  productAssetId: string;
  productProfileSnapshot: ProductProfile;
  guidedAnswers: GuidedAnswer[];
  selectedDirectionId: string;
  task: {
    operation: "generate_empty_scene_background";
    productRole: "analysis_and_spatial_reference_only";
    backgroundOnly: true;
  };
  scene: {
    spaceType: string;
    wallMaterial: string;
    desktopMaterial: string;
    desktopTone: string;
    backgroundBrightness: "dark" | "medium_dark" | "medium" | "medium_light" | "light";
    style: string;
    palette: string[];
    furnitureDensity: "low" | "medium" | "high";
  };
  composition: {
    purpose: "hero" | "side_structure" | "multi_product" | "product_packaging" | "detail" | "usage_scene" | "copy_space";
    productCount: number;
    productPosition: "center" | "center_left" | "center_right" | "lower_left" | "lower_right";
    productWidthPercent: number;
    copySpace: "none" | "left" | "right" | "top" | "upper_half";
    cameraView: "front" | "front_left" | "front_right" | "slight_top" | "high_top";
    cameraHeight: "low" | "near_eye_level" | "slightly_high" | "high";
    framing: "close" | "medium" | "wide";
    perspectiveStrength: "low" | "medium" | "high";
    desktopVisiblePercent: number;
  };
  lighting: {
    sourceType: "window" | "large_softbox" | "diffuse_interior";
    sourcePosition: "upper_left" | "upper_right" | "front" | "top";
    temperature: "cool" | "neutral" | "neutral_warm" | "warm";
    softness: "hard" | "medium" | "soft";
    contrast: "low" | "medium" | "high";
    shadowDirection: "rear_left" | "rear_right" | "behind" | "soft_diffuse";
  };
  decoration: {
    density: "minimal" | "moderate" | "rich";
    allowed: string[];
    forbiddenNearProduct: string[];
    foregroundOcclusion: false;
  };
  output: {
    aspectRatio: "1:1" | "3:4" | "4:3" | "2:3" | "16:9";
    resolutionLabel: "1K" | "2K" | "4K";
    realism: "real_commercial_interior_photography";
    exclude: string[];
  };
  inheritance?: {
    seriesId: string;
    sceneGroupId?: string;
    mode: "same_space" | "same_style";
    lockedSeriesVersion: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

规则：

- Prompt、JSON、预览定位和分析基准全部绑定Recipe版本。
- 替换产品后旧Recipe过期。
- 采纳补丁创建新版本，不覆盖旧版本。
- 同一Recipe版本编译结果逐字符一致。

## 6. PromptDocument

```ts
interface PromptDocument {
  recipeId: string;
  recipeVersion: number;
  compilerVersion: string;
  sections: {
    taskAndReferences: string;
    productMatching: string;
    sceneAndStyle: string;
    cameraAndComposition: string;
    lightingAndDecoration: string;
    outputConstraints: string;
  };
  fullPrompt: string;
  fullJson: string;
  createdAt: string;
}
```

PromptCompiler规则：

- 固定顺序拼接6段。
- 使用集中枚举映射表。
- 不同段落不得冲突。
- 禁止项集中到输出限制。
- 不描述产品图案和文字的具体内容。
- 不要求模型生成真实产品。
- 使用快照测试确保稳定。

## 7. MatchReport与RecipePatch

```ts
type IssueType =
  | "perspective"
  | "contact"
  | "composition"
  | "copy_space"
  | "lighting_direction"
  | "lighting_temperature"
  | "contrast"
  | "color_separation"
  | "scene_semantics"
  | "decoration_competition"
  | "series_style"
  | "series_space";

interface MatchIssue {
  id: string;
  type: IssueType;
  severity: "low" | "medium" | "high";
  confidence: Confidence;
  evidence: string;
  description: string;
  suggestedPatch: RecipePatchOperation[];
}

interface MatchReport {
  id: string;
  recipeVersion: number;
  productSceneStatus: "pass" | "needs_adjustment" | "uncertain";
  seriesContinuityStatus?: "pass" | "needs_adjustment" | "uncertain";
  issues: MatchIssue[];
  strengths: string[];
  analyzedAt: string;
}

interface RecipePatchOperation {
  op: "replace" | "add" | "remove";
  path: string;
  value?: unknown;
  reason: string;
}
```

Patch只允许修改单张场景、构图、光线和装饰字段。禁止修改ProductProfile、ProductAsset、锁定系列版本和系列母版。应用前必须验证允许路径、字段值、变化摘要和用户确认。

## 8. 系列结构

```ts
interface SeriesProject {
  id: string;
  name: string;
  version: number;
  mode: "same_space" | "same_style";
  masterShotId: string;
  masterReferenceImageRef: string;
  styleLock: {
    palette: string[];
    materialLanguage: string[];
    photographyStyle: string;
    whiteBalance: string;
    contrast: string;
    depthOfField: string;
    decorationLanguage: string;
  };
  sceneGroups: Array<{
    id: string;
    referenceImageRef: string;
    lock: {
      spaceType: string;
      wall: string;
      desktop: string;
      windowPosition: string;
      mainFurniture: string[];
      lighting: SceneRecipe["lighting"];
    };
    shotIds: string[];
  }>;
  shotIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

- 系列母版只能从已通过的真实场景创建。
- 单张修正不得自动修改母版。
- 更新系列标准创建新系列版本。
- 后续图片数量动态增加。

## 9. AI任务规则

### 产品分析

- 只报告可观察信息。
- 不确定使用unknown。
- 不识别或复述产品上的具体文案。

### 引导问题

- 不重复询问高置信度事实。
- 每轮最多5个问题。

### 场景方向

- 返回3个确有差异的方向。
- 至少一个稳妥方向。
- 不生成虚构台历或人物。

### 匹配分析

- 输入产品、场景、叠加预览和Recipe。
- 系列模式额外输入母版和锁。
- 返回证据，不只返回总分。
- 不确定时返回uncertain。

### 错误策略

- JSON解析失败只自动进行一次结构修复重试。
- Schema失败不进入下一步。
- 模型超时保留页面数据并允许重试。
- Mock必须显式标识。
- 任何失败不得创建“完成”版本。

