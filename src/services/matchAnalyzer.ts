import {
  ProductAsset,
  SceneRecipe,
  PromptDocument,
  SceneMatchReport,
  SceneMatchReportSchema,
  ImportedSceneImage
} from '../types/schemas';
import { getAsset } from '../lib/db';

export interface AnalyzeSceneMatchInput {
  productAsset: ProductAsset;
  sceneImage: ImportedSceneImage;
  recipe: SceneRecipe;
  promptDocument: PromptDocument;
}

/**
 * Executes multi-modal match analysis between reference ProductAsset and
 * externally generated SceneImage, based on the SceneRecipe and PromptDocument.
 * Supports both client-side Mock and server-side Real Gemini Adapter.
 */
export async function analyzeSceneMatch(
  input: AnalyzeSceneMatchInput,
  mode: 'mock' | 'real' = 'mock'
): Promise<SceneMatchReport> {
  if (mode === 'mock') {
    // Determine overall score and features based on inputs to support testing requirements
    const isProductInconsistent =
      input.productAsset.name.includes('inconsistent') ||
      input.productAsset.id === 'inconsistent-id';

    const isLowScoreRequested =
      input.sceneImage.fileName.includes('low-score') ||
      input.sceneImage.fileName.includes('low_score');

    let overallScore = 88;
    let productScore = 92;
    let sceneScore = 87;
    let compositionScore = 85;
    let lightingScore = 90;

    let productPassed = !isProductInconsistent;
    const productIssues: string[] = [];
    const sceneIssues: string[] = [];
    const compositionIssues: string[] = [];
    const lightingIssues: string[] = [];
    const improvementSuggestions: Array<{
      id: string;
      category: 'product' | 'scene' | 'composition' | 'lighting';
      priority: 'high' | 'medium' | 'low';
      suggestion: string;
    }> = [];

    if (isProductInconsistent) {
      productScore = 45;
      overallScore = 55;
      productIssues.push('检测到生成图中的产品主体与上传的产品资产在包装和标识上存在明显差异：图案部分缺失。');
      improvementSuggestions.push({
        id: 's-prod-1',
        category: 'product',
        priority: 'high',
        suggestion: '请检查生图工具的 ControlNet 设定，确保产品贴图和 Logo 结构完整保留，或使用更高清晰度的原始产品图进行引导。'
      });
    }

    if (isLowScoreRequested) {
      overallScore = 65;
      sceneScore = 60;
      compositionScore = 65;
      lightingScore = 70;
      sceneIssues.push('场景元素过于杂乱，不符合 SceneRecipe 中的极简北欧风格描述。');
      compositionIssues.push('产品在画面中所占比例偏小，且放置位置过于偏右，导致视觉重心失衡。');
      lightingIssues.push('光影融合度较低，未检测到台历底部与桌面接触面产生的软阴影，产生明显的“悬浮感”。');
      
      improvementSuggestions.push({
        id: 's-scene-1',
        category: 'scene',
        priority: 'high',
        suggestion: '精简背景装饰物，移除杂乱的文具，保留斜射窗光和极简小绿植。'
      }, {
        id: 's-comp-1',
        category: 'composition',
        priority: 'medium',
        suggestion: '调整生成比例，让台历主体在画面中占比扩大约 15%，并水平向左移动以居中。'
      }, {
        id: 's-light-1',
        category: 'lighting',
        priority: 'medium',
        suggestion: '增加接触面遮挡阴影（Ambient Occlusion），让台历自然稳固地融入浅橡木桌面。'
      });
    }

    const report: SceneMatchReport = {
      id: `match-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipeId: input.recipe.recipeId,
      sourceImageId: input.sceneImage.id,
      createdAt: new Date().toISOString(),
      overallScore,
      summary: isProductInconsistent
        ? '匹配度分析完成。由于检测到生成产品存在不一致（Logo/主体图案缺失），评分为低。请针对产品细节一致性进行重新生成。'
        : (isLowScoreRequested
          ? '匹配度分析完成。检测到场景风格偏离极简北欧、构图偏右且主体比例偏小，整体评分较低，建议针对光影和构图进行修正。'
          : '场景匹配分析完成。生成的场景完美符合 SceneRecipe 设计规范，产品细节、光线方向以及构图比例均达到商业级水准。'),
      productMatch: {
        score: productScore,
        passed: productPassed,
        issues: productIssues
      },
      sceneMatch: {
        score: sceneScore,
        passed: sceneScore >= 75,
        issues: sceneIssues
      },
      compositionMatch: {
        score: compositionScore,
        passed: compositionScore >= 75,
        issues: compositionIssues
      },
      lightingMatch: {
        score: lightingScore,
        passed: lightingScore >= 75,
        issues: lightingIssues
      },
      improvementSuggestions
    };

    // Validate using Zod schema
    SceneMatchReportSchema.parse(report);
    return report;
  } else {
    // Real Gemini Adapter
    const productBlob = await getAsset(input.productAsset.persistedAssetRef);
    const sceneBlob = await getAsset(input.sceneImage.persistedAssetRef);

    if (!productBlob || !sceneBlob) {
      throw new Error('未在本地数据库中找到必要的产品或场景图片资产');
    }

    const formData = new FormData();
    formData.append('productImage', productBlob, 'product.png');
    formData.append('sceneImage', sceneBlob, 'scene.png');
    formData.append('data', JSON.stringify({
      productAsset: input.productAsset,
      sceneImage: input.sceneImage,
      recipe: input.recipe,
      promptDocument: input.promptDocument
    }));

    const response = await fetch('/api/ai/analyze-scene-match', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Real Gemini Adapter analysis failed: ${errText}`);
    }

    const data = await response.json();
    const parseResult = SceneMatchReportSchema.safeParse(data);
    if (!parseResult.success) {
      console.error('Real Gemini Adapter output validation failed:', parseResult.error);
      throw new Error('服务端返回的匹配度报告不符合 Zod 强契约规范');
    }

    return parseResult.data;
  }
}
