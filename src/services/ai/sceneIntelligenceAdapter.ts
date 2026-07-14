import {
  ProductAsset,
  ProductProfile,
  GuidedQuestion,
  GuidedAnswer,
  SceneDirection,
  SceneRecipe,
  MatchReport,
  RecipePatchOperation,
  SeriesProject,
  CreateRecipeInput
} from '../../types/schemas';

export type { CreateRecipeInput };

// ==========================================
// Input and Output Contracts for AI Methods
// ==========================================

export interface AnalyzeProductInput {
  productAsset: ProductAsset;
}

export interface GuidedQuestionInput {
  productProfile: ProductProfile;
}

export interface PlanDirectionsInput {
  productProfile: ProductProfile;
  guidedAnswers: GuidedAnswer[];
}

export interface AnalyzeMatchInput {
  productProfile: ProductProfile;
  productAsset: ProductAsset;
  sceneAsset: {
    id: string;
    name: string;
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
    width: number;
    height: number;
    persistedAssetRef: string;
    createdAt: string;
  };
  sceneRecipe: SceneRecipe;
  overlayPreviewRef: string;
  seriesProject?: SeriesProject | null;
}

export interface ProposePatchInput {
  sceneRecipe: SceneRecipe;
  matchReport: MatchReport;
}

export interface PlanNextShotInput {
  seriesProject: SeriesProject;
  activeRecipe: SceneRecipe;
}

export interface NextShotPlan {
  nextShotId: string;
  recommendedRecipe: Partial<SceneRecipe>;
  reasoning: string;
}

// ==========================================
// Core Adapter Interface definition
// ==========================================

export interface SceneIntelligenceAdapter {
  readonly mode: 'mock' | 'real';
  
  analyzeProduct(input: AnalyzeProductInput): Promise<ProductProfile>;
  generateGuidedQuestions(input: GuidedQuestionInput): Promise<GuidedQuestion[]>;
  planSceneDirections(input: PlanDirectionsInput): Promise<SceneDirection[]>;
  createSceneRecipe(input: CreateRecipeInput): Promise<SceneRecipe>;
  analyzeMatch(input: AnalyzeMatchInput): Promise<MatchReport>;
  proposeRecipePatch(input: ProposePatchInput): Promise<RecipePatchOperation[]>;
  planNextSeriesShot(input: PlanNextShotInput): Promise<NextShotPlan>;
}
