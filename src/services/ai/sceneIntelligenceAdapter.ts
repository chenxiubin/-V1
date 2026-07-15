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
  CreateRecipeInput,
  AnalyzeMatchInput
} from '../../types/schemas';

export type { CreateRecipeInput, AnalyzeMatchInput };

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
