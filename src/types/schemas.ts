import { z } from 'zod';

// ==========================================
// Basic and Shared Schemas
// ==========================================

export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const ProductAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  width: z.number(),
  height: z.number(),
  hasAlpha: z.boolean(),
  persistedAssetRef: z.string(),
  createdAt: z.string(),
});
export type ProductAsset = z.infer<typeof ProductAssetSchema>;

// ==========================================
// Product Profile Schemas
// ==========================================

export const ProductTypeSchema = z.enum([
  'desk_calendar',
  'wall_calendar',
  'packaging',
  'combination',
  'unknown'
]);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const BracketTypeSchema = z.enum([
  'paper_base',
  'metal_frame',
  'acrylic_frame',
  'wood_base',
  'other',
  'unknown'
]);
export type BracketType = z.infer<typeof BracketTypeSchema>;

export const SubjectBoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const ContactRegionSchema = z.object({
  xStart: z.number(),
  xEnd: z.number(),
  y: z.number(),
  confidence: ConfidenceSchema,
});

export const ProductViewSchema = z.object({
  class: z.enum(['front', 'front_left', 'front_right', 'slight_top', 'high_top', 'unknown']),
  visibleTop: z.enum(['none', 'low', 'medium', 'high', 'unknown']),
  visibleSide: z.enum(['none', 'left', 'right', 'both', 'unknown']),
  perspectiveStrength: z.enum(['low', 'medium', 'high', 'unknown']),
});

export const MaterialSchema = z.object({
  name: z.enum(['paper', 'metal', 'acrylic', 'wood', 'plastic', 'fabric', 'other']),
  reflectivity: z.enum(['low', 'medium', 'high']),
});

export const PaletteSchema = z.object({
  dominant: z.array(z.string()),
  edgeBrightness: z.enum(['dark', 'mid', 'light', 'mixed']),
});

export const ExistingLightingSchema = z.object({
  direction: z.enum(['upper_left', 'upper_right', 'front', 'top', 'diffuse', 'unknown']),
  temperature: z.enum(['cool', 'neutral', 'neutral_warm', 'warm', 'unknown']),
  softness: z.enum(['hard', 'medium', 'soft', 'unknown']),
  contrast: z.enum(['low', 'medium', 'high', 'unknown']),
});

export const UncertaintySchema = z.object({
  field: z.string(),
  reason: z.string().refine(
    (val) => {
      // Must contain at least one Chinese character to reject complete English sentences
      // and ensure the response is in Simplified Chinese, but allows technical words like PNG, JSON, etc.
      return /[\u4e00-\u9fa5]/.test(val);
    },
    {
      message: '不确定性原因(reason)必须使用简体中文进行简练说明，不能是纯英文或完整英文句子。'
    }
  ),
  confidence: ConfidenceSchema,
});

export const ProductProfileSchema = z.object({
  schemaVersion: z.literal('1.0'),
  productAssetId: z.string(),
  productType: ProductTypeSchema,
  bracketType: BracketTypeSchema,
  subjectBounds: SubjectBoundsSchema,
  contactRegion: ContactRegionSchema,
  view: ProductViewSchema,
  materials: z.array(MaterialSchema),
  palette: PaletteSchema,
  existingLighting: ExistingLightingSchema,
  uncertainties: z.array(UncertaintySchema),
  overallConfidence: ConfidenceSchema,
  analyzedAt: z.string(),
});
export type ProductProfile = z.infer<typeof ProductProfileSchema>;

// ==========================================
// Guided Question and Answers
// ==========================================

export const GuidedAnswerSchema = z.object({
  questionId: z.string(),
  optionId: z.string(),
  answeredAt: z.string(),
});
export type GuidedAnswer = z.infer<typeof GuidedAnswerSchema>;

export const GuidedQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    recommendationReason: z.string().optional(),
  })),
  recommendedOptionId: z.string().optional(),
  category: z.enum(['purpose', 'style', 'background_density', 'negative_space', 'inheritance']),
});
export type GuidedQuestion = z.infer<typeof GuidedQuestionSchema>;

// ==========================================
// Scene Direction Schemas
// ==========================================

export const SceneDirectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  recommended: z.boolean(),
  recommendationReason: z.string(),
  spaceType: z.string(),
  desktop: z.string(),
  palette: z.array(z.string()),
  lightingSummary: z.string(),
  compositionSummary: z.string(),
  decorationSummary: z.string(),
  risks: z.array(z.string()),
});
export type SceneDirection = z.infer<typeof SceneDirectionSchema>;

// ==========================================
// Scene Recipe Unique Fact Source
// ==========================================

export const RecipeTaskSchema = z.object({
  operation: z.literal('generate_empty_scene_background'),
  productRole: z.literal('analysis_and_spatial_reference_only'),
  backgroundOnly: z.literal(true),
});

export const RecipeSceneSchema = z.object({
  spaceType: z.string(),
  wallMaterial: z.string(),
  desktopMaterial: z.string(),
  desktopTone: z.string(),
  backgroundBrightness: z.enum(['dark', 'medium_dark', 'medium', 'medium_light', 'light']),
  style: z.string(),
  palette: z.array(z.string()),
  furnitureDensity: z.enum(['low', 'medium', 'high']),
});

export const RecipeCompositionSchema = z.object({
  purpose: z.enum([
    'hero',
    'side_structure',
    'multi_product',
    'product_packaging',
    'detail',
    'usage_scene',
    'copy_space'
  ]),
  productCount: z.number().int().min(1),
  productPosition: z.enum(['center', 'center_left', 'center_right', 'lower_left', 'lower_right']),
  productWidthPercent: z.number().finite().min(1).max(100),
  copySpace: z.enum(['none', 'left', 'right', 'top', 'upper_half']),
  cameraView: z.enum(['front', 'front_left', 'front_right', 'slight_top', 'high_top']),
  cameraHeight: z.enum(['low', 'near_eye_level', 'slightly_high', 'high']),
  framing: z.enum(['close', 'medium', 'wide']),
  perspectiveStrength: z.enum(['low', 'medium', 'high']),
  desktopVisiblePercent: z.number().finite().min(0).max(100),
});

export const RecipeLightingSchema = z.object({
  sourceType: z.enum(['window', 'large_softbox', 'diffuse_interior']),
  sourcePosition: z.enum(['upper_left', 'upper_right', 'front', 'top']),
  temperature: z.enum(['cool', 'neutral', 'neutral_warm', 'warm']),
  softness: z.enum(['hard', 'medium', 'soft']),
  contrast: z.enum(['low', 'medium', 'high']),
  shadowDirection: z.enum(['rear_left', 'rear_right', 'behind', 'soft_diffuse']),
});

export const RecipeDecorationSchema = z.object({
  density: z.enum(['minimal', 'moderate', 'rich']),
  allowed: z.array(z.string()),
  forbiddenNearProduct: z.array(z.string()),
  foregroundOcclusion: z.literal(false),
});

export const RecipeOutputSchema = z.object({
  aspectRatio: z.enum(['1:1', '3:4', '4:3', '2:3', '16:9']),
  resolutionLabel: z.enum(['1K', '2K', '4K']),
  realism: z.literal('real_commercial_interior_photography'),
  exclude: z.array(z.string()),
});

export const RecipeInheritanceSchema = z.object({
  seriesId: z.string(),
  sceneGroupId: z.string().optional(),
  mode: z.enum(['same_space', 'same_style']),
  lockedSeriesVersion: z.number(),
});

export const SceneRecipeSchema = z.object({
  schemaVersion: z.literal('1.0'),
  recipeId: z.string(),
  version: z.number(),
  basedOnVersion: z.number().nullable().optional(),
  productAssetId: z.string(),
  productProfileSnapshot: ProductProfileSchema,
  guidedAnswers: z.array(GuidedAnswerSchema),
  selectedDirectionId: z.string(),
  task: RecipeTaskSchema,
  scene: RecipeSceneSchema,
  composition: RecipeCompositionSchema,
  lighting: RecipeLightingSchema,
  decoration: RecipeDecorationSchema,
  output: RecipeOutputSchema,
  inheritance: RecipeInheritanceSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SceneRecipe = z.infer<typeof SceneRecipeSchema>;

export const CreateRecipeInputSchema = z.object({
  productAssetId: z.string(),
  productProfileSnapshot: ProductProfileSchema,
  guidedQuestions: z.array(GuidedQuestionSchema),
  guidedAnswers: z.array(GuidedAnswerSchema),
  sceneDirections: z.array(SceneDirectionSchema),
  selectedDirectionId: z.string(),
});
export type CreateRecipeInput = z.infer<typeof CreateRecipeInputSchema>;

// ==========================================
// Prompt Document Schemas
// ==========================================

export const PromptDocumentSchema = z.object({
  recipeId: z.string(),
  recipeVersion: z.number(),
  compilerVersion: z.string(),
  sections: z.object({
    taskAndReferences: z.string(),
    productMatching: z.string(),
    sceneAndStyle: z.string(),
    cameraAndComposition: z.string(),
    lightingAndDecoration: z.string(),
    outputConstraints: z.string(),
  }),
  fullPrompt: z.string(),
  fullJson: z.string(),
  createdAt: z.string(),
});
export type PromptDocument = z.infer<typeof PromptDocumentSchema>;

// ==========================================
// Recipe Patch and Match Report
// ==========================================

export const IssueTypeSchema = z.enum([
  'perspective',
  'contact',
  'composition',
  'copy_space',
  'lighting_direction',
  'lighting_temperature',
  'contrast',
  'color_separation',
  'scene_semantics',
  'decoration_competition',
  'series_style',
  'series_space',
]);
export type IssueType = z.infer<typeof IssueTypeSchema>;

export const RecipePatchOperationSchema = z.object({
  op: z.enum(['replace', 'add', 'remove']),
  path: z.string(),
  value: z.unknown().optional(),
  reason: z.string(),
});
export type RecipePatchOperation = z.infer<typeof RecipePatchOperationSchema>;

export const MatchIssueSchema = z.object({
  id: z.string(),
  type: IssueTypeSchema,
  severity: z.enum(['low', 'medium', 'high']),
  confidence: ConfidenceSchema,
  evidence: z.string(),
  description: z.string(),
  suggestedPatch: z.array(RecipePatchOperationSchema),
});
export type MatchIssue = z.infer<typeof MatchIssueSchema>;

export const MatchReportSchema = z.object({
  id: z.string(),
  recipeVersion: z.number(),
  productSceneStatus: z.enum(['pass', 'needs_adjustment', 'uncertain']),
  seriesContinuityStatus: z.enum(['pass', 'needs_adjustment', 'uncertain']).optional(),
  issues: z.array(MatchIssueSchema),
  strengths: z.array(z.string()),
  analyzedAt: z.string(),
});
export type MatchReport = z.infer<typeof MatchReportSchema>;

// ==========================================
// Series Project Schemas
// ==========================================

export const StyleLockSchema = z.object({
  palette: z.array(z.string()),
  materialLanguage: z.array(z.string()),
  photographyStyle: z.string(),
  whiteBalance: z.string(),
  contrast: z.string(),
  depthOfField: z.string(),
  decorationLanguage: z.string(),
});

export const SceneGroupSchema = z.object({
  id: z.string(),
  referenceImageRef: z.string(),
  lock: z.object({
    spaceType: z.string(),
    wall: z.string(),
    desktop: z.string(),
    windowPosition: z.string(),
    mainFurniture: z.array(z.string()),
    lighting: RecipeLightingSchema,
  }),
  shotIds: z.array(z.string()),
});

export const SeriesProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  mode: z.enum(['same_space', 'same_style']),
  masterShotId: z.string(),
  masterReferenceImageRef: z.string(),
  styleLock: StyleLockSchema,
  sceneGroups: z.array(SceneGroupSchema),
  shotIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SeriesProject = z.infer<typeof SeriesProjectSchema>;

// ==========================================
// Application Status & State Schemas (Phase 1-B)
// ==========================================

export const AppStatusSchema = z.enum([
  'EMPTY',
  'PRODUCT_IMPORTED',
  'ANALYZING_PRODUCT',
  'PRODUCT_REVIEW',
  'GUIDED_QUESTIONS',
  'DIRECTION_SELECTION',
  'RECIPE_READY',
  'AWAITING_EXTERNAL_GENERATION',
  'PREVIEW_IMPORTED',
  'ANALYZING_MATCH',
  'NEEDS_REVISION',
  'APPROVED',
  'TEMPLATE_SELECTION',
  'PRODUCTION_READY',
  'SERIES_ACTIVE'
]);
export type AppStatus = z.infer<typeof AppStatusSchema>;

// ==========================================
// Phase 7: Template and Production Schemas
// ==========================================

export const SlotTypeSchema = z.enum([
  'product',
  'background',
  'title',
  'subtitle',
  'badge',
  'decoration',
  'logo',
  'other'
]);
export type SlotType = z.infer<typeof SlotTypeSchema>;

export const SlotSchema = z.object({
  id: z.string(),
  type: SlotTypeSchema,
  rect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  zIndex: z.number(),
  label: z.string(),
  isRequired: z.boolean(),
  allowAI: z.boolean(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const TemplateVariantSchema = z.object({
  id: z.string(),
  aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']),
  canvasSize: z.object({
    width: z.number(),
    height: z.number(),
  }),
  slots: z.array(SlotSchema),
  previewUrl: z.string(),
});
export type TemplateVariant = z.infer<typeof TemplateVariantSchema>;

export const TemplateSuiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  productType: z.array(z.string()),
  variants: z.array(TemplateVariantSchema),
  description: z.string(),
  styleSystem: z.object({
    colors: z.array(z.string()),
    fonts: z.array(z.string()),
  }),
});
export type TemplateSuite = z.infer<typeof TemplateSuiteSchema>;

export const SlotValueSchema = z.object({
  slotId: z.string(),
  type: SlotTypeSchema,
  content: z.string().optional(), // text or assetRef
  assetRef: z.string().optional(),
  transform: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
    rotate: z.number(),
  }).optional(),
});

export const TemplateInstanceSchema = z.object({
  id: z.string(),
  suiteId: z.string(),
  variantId: z.string(),
  variantSnapshot: TemplateVariantSchema,
  slotValues: z.array(SlotValueSchema),
  recipeId: z.string().optional(),
  recipeVersion: z.number().optional(),
  templateName: z.string().optional(),
  slots: z.array(SlotSchema).optional(),
  createdAt: z.string(),
});
export type TemplateInstance = z.infer<typeof TemplateInstanceSchema>;

export const AssetReferenceSchema = z.object({
  assetId: z.string(),
  assetType: z.string(),
  sourceType: z.string(),
  version: z.number(),
  persistedAssetRef: z.string().optional(),
});
export type AssetReference = z.infer<typeof AssetReferenceSchema>;

export const CanvasLayerSchema = z.object({
  id: z.string(),
  type: z.enum(['product', 'scene_background', 'text', 'selling_point', 'badge', 'logo', 'decoration']),
  source: AssetReferenceSchema.nullable().optional(),
  transform: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
    rotate: z.number(),
  }),
  visible: z.boolean(),
  locked: z.boolean(),
  zIndex: z.number(),
  content: z.string().optional(),
  shadow: z.union([z.boolean(), z.string()]).optional(),
  opacity: z.number().optional(),
  blendMode: z.string().optional(),
  assetVersion: z.number().optional(),
});
export type CanvasLayer = z.infer<typeof CanvasLayerSchema>;

export const CanvasDocumentSchema = z.object({
  width: z.number(),
  height: z.number(),
  templateInstanceId: z.string(),
  layers: z.array(CanvasLayerSchema),
  version: z.number(),
});
export type CanvasDocument = z.infer<typeof CanvasDocumentSchema>;

export const RenderSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  canvasDocumentSnapshot: CanvasDocumentSchema,
  templateInstanceSnapshot: TemplateInstanceSchema.nullable().optional(),
  templateInstanceId: z.string().nullable().optional(),
  templateInstanceVersion: z.number().nullable().optional(),
  templateSuiteId: z.string().nullable().optional(),
  templateSuiteVersion: z.number().nullable().optional(),
  sceneRecipeId: z.string().nullable().optional(),
  sceneRecipeVersion: z.number().nullable().optional(),
  recipeId: z.string().nullable().optional(),
  recipeVersion: z.number().nullable().optional(),
  productAssetId: z.string().nullable().optional(),
  productAssetVersion: z.number().nullable().optional(),
  layerAssetReferences: z.array(AssetReferenceSchema),
  createdAt: z.string(),
});
export type RenderSnapshot = z.infer<typeof RenderSnapshotSchema>;

export type ProjectState = z.infer<typeof ProjectStateSchema>;
export const ProjectStateSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string(),
  name: z.string(),
  status: AppStatusSchema,
  productAsset: ProductAssetSchema.nullable(),
  productProfile: ProductProfileSchema.nullable(),
  guidedQuestions: z.array(GuidedQuestionSchema).nullable(),
  guidedAnswers: z.array(GuidedAnswerSchema),
  sceneDirections: z.array(SceneDirectionSchema).nullable(),
  selectedDirectionId: z.string().nullable(),
  sceneRecipes: z.array(SceneRecipeSchema),
  recipeVersions: z.array(z.object({
    recipe: SceneRecipeSchema,
    promptDocument: PromptDocumentSchema,
    sourceMatchReportId: z.string().optional(),
    createdAt: z.string(),
  })).default([]),
  sceneRecipe: SceneRecipeSchema.nullable().optional(),
  promptDocument: PromptDocumentSchema.nullable().optional(),
  recipeRequestStatus: z.enum(['idle', 'loading', 'success', 'error']).optional().default('idle'),
  recipeError: z.string().nullable().optional(),
  activeVersion: z.number().nullable(),
  sceneAsset: z.object({
    id: z.string(),
    name: z.string(),
    mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    width: z.number(),
    height: z.number(),
    persistedAssetRef: z.string(),
    createdAt: z.string(),
    recipeId: z.string().optional(),
    recipeVersion: z.number().optional(),
  }).nullable(),
  matchReport: MatchReportSchema.nullable(),
  matchRequestStatus: z.enum(['idle', 'loading', 'success', 'error']).optional().default('idle'),
  matchError: z.string().nullable().optional(),
  matchRequestId: z.string().nullable().optional(),
  seriesProject: SeriesProjectSchema.nullable(),
  ignoredMatchIssueIds: z.array(z.string()).default([]),
  // Phase 7: Template State
  templateLibrary: z.array(TemplateSuiteSchema).default([]),
  selectedTemplateSuiteId: z.string().nullable().default(null),
  selectedTemplateVariantId: z.string().nullable().default(null),
  templateInstances: z.array(TemplateInstanceSchema).default([]),
  templateInstance: TemplateInstanceSchema.nullable().default(null),
  canvasDocument: CanvasDocumentSchema.nullable().default(null),
  selectedLayerId: z.string().nullable().default(null),
  canvasEditingMode: z.enum(['select', 'move', 'scale']).default('select'),
  renderSnapshots: z.array(RenderSnapshotSchema).default([]),
  activeRenderSnapshotId: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const AnalyzeMatchInputSchema = z.object({
  productProfile: ProductProfileSchema,
  sceneRecipe: SceneRecipeSchema,
  productAsset: ProductAssetSchema,
  sceneAsset: z.object({
    id: z.string(),
    name: z.string(),
    mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    width: z.number(),
    height: z.number(),
    persistedAssetRef: z.string(),
    createdAt: z.string(),
    recipeId: z.string().optional(),
    recipeVersion: z.number().optional(),
  }),
  overlayPreviewRef: z.string(),
});
export type AnalyzeMatchInput = z.infer<typeof AnalyzeMatchInputSchema>;

