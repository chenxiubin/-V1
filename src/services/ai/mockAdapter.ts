import {
  ProductProfile,
  ProductProfileSchema,
  GuidedQuestion,
  GuidedQuestionSchema,
  SceneDirection,
  SceneDirectionSchema,
  SceneRecipe,
  SceneRecipeSchema,
  MatchReport,
  MatchReportSchema,
  RecipePatchOperation,
  RecipePatchOperationSchema
} from '../../types/schemas';
import {
  SceneIntelligenceAdapter,
  AnalyzeProductInput,
  GuidedQuestionInput,
  PlanDirectionsInput,
  CreateRecipeInput,
  AnalyzeMatchInput,
  ProposePatchInput,
  PlanNextShotInput,
  NextShotPlan
} from './sceneIntelligenceAdapter';

export class MockAdapter implements SceneIntelligenceAdapter {
  readonly mode = 'mock' as const;

  async analyzeProduct(input: AnalyzeProductInput): Promise<ProductProfile> {
    const profile: ProductProfile = {
      schemaVersion: '1.0',
      productAssetId: input.productAsset.id,
      productType: 'desk_calendar',
      bracketType: 'paper_base',
      subjectBounds: { x: 100, y: 150, width: 824, height: 600 },
      contactRegion: { xStart: 250, xEnd: 750, y: 750, confidence: 'high' },
      view: {
        class: 'front_left',
        visibleTop: 'low',
        visibleSide: 'left',
        perspectiveStrength: 'medium',
      },
      materials: [{ name: 'paper', reflectivity: 'low' }],
      palette: { dominant: ['#FAFAFA', '#ECEFF1'], edgeBrightness: 'light' },
      existingLighting: {
        direction: 'upper_left',
        temperature: 'neutral',
        softness: 'soft',
        contrast: 'low',
      },
      uncertainties: [],
      overallConfidence: 'high',
      analyzedAt: new Date().toISOString(),
    };

    // Strict validation check in MockAdapter to guarantee AC compliance
    ProductProfileSchema.parse(profile);
    return profile;
  }

  async generateGuidedQuestions(input: GuidedQuestionInput): Promise<GuidedQuestion[]> {
    const questions: GuidedQuestion[] = [
      {
        id: 'q-series-purpose',
        text: '该台历智能场景的主要应用场景是？',
        options: [
          { id: 'opt-commercial', text: '商业广告主图宣传', recommendationReason: '适合营造高端、富有品质感的商务空间背景' },
          { id: 'opt-editorial', text: '生活小红书日常风', recommendationReason: '采用柔和居家软装、温润木质桌面，更容易引起大众情感共鸣' },
        ],
        recommendedOptionId: 'opt-editorial',
        category: 'purpose',
      },
      {
        id: 'q-scene-density',
        text: '场景中除了台历，您期望装饰元素的饱满度是？',
        options: [
          { id: 'opt-minimal', text: '极简北欧（主张留白）', recommendationReason: '绝大多数台历设计的推荐，不干扰视线' },
          { id: 'opt-moderate', text: '适度生活气息（盆栽、小文具）', recommendationReason: '适合生活、办公等功能性更强的展示' },
        ],
        recommendedOptionId: 'opt-minimal',
        category: 'background_density',
      }
    ];

    questions.forEach((q) => GuidedQuestionSchema.parse(q));
    return questions;
  }

  async planSceneDirections(input: PlanDirectionsInput): Promise<SceneDirection[]> {
    const directions: SceneDirection[] = [
      {
        id: 'dir-mock-nordic',
        name: '北欧暖阳书房',
        summary: '通透柔和的斜射窗光配合浅橡木桌面与极简主义绿植，营造舒适宁静的工作空间。',
        recommended: true,
        recommendationReason: '与淡色系纸质纸张及纸质底座视觉高度契合，光线方向完美适应原图光影。',
        spaceType: '书房',
        desktop: '浅色橡木桌面',
        palette: ['#F5F5F7', '#E5E5EA', '#E3D7C5'],
        lightingSummary: '左侧柔和视窗斜射光，中等色温偏暖。',
        compositionSummary: '经典三分法，产品略居中偏右偏置，预留左侧排版复制空间。',
        decorationSummary: '右侧背景后置一盆小型多肉植物，主体前侧无遮挡。',
        risks: ['浅橡木反光偏高需要适当降低反射度系数'],
      },
      {
        id: 'dir-mock-industrial',
        name: '现代极简水泥灰',
        summary: '暗调微水泥墙面、哑光深灰金属台面，打造深色商务与工业冷色调的对比张力。',
        recommended: false,
        recommendationReason: '质感偏高冷，可用于特种工艺台历，但常规台历可能会显得色彩沉闷。',
        spaceType: '现代办公区',
        desktop: '深灰哑光金属桌面',
        palette: ['#3A3A3C', '#2C2C2E', '#E5E5EA'],
        lightingSummary: '右上角顶灯条形柔光，高对比度。',
        compositionSummary: '居中透视法，极简视线聚集。',
        decorationSummary: '背景后置黑色磨砂金属卡片座，冷淡无冗余。',
        risks: ['暗部噪点增加，需加强漫反射控制'],
      },
      {
        id: 'dir-mock-retro',
        name: '复古暖调咖啡厅',
        summary: '暗调胡桃木、温暖台灯、复古黄铜装饰，配合温和背景咖啡器具，呈现经典优雅的人文格调。',
        recommended: false,
        recommendationReason: '色调温暖且历史质感浓厚，但在需要突出台历清爽本色时可能稍微过于厚重。',
        spaceType: '咖啡厅',
        desktop: '深色胡桃木桌面',
        palette: ['#4A3B32', '#D4AF37', '#8B5A2B'],
        lightingSummary: '右侧复古台灯偏暖局部照明，柔和泛光。',
        compositionSummary: '对角线构图，斜向透视延伸。',
        decorationSummary: '左侧远景摆放一个咖啡杯及黄铜漏斗，呈现精致虚化的复古感。',
        risks: ['暗调胡桃木可能吸光严重，需要微调边缘溢光'],
      }
    ];

    directions.forEach((d) => SceneDirectionSchema.parse(d));
    return directions;
  }

  async createSceneRecipe(input: CreateRecipeInput): Promise<SceneRecipe> {
    const finalProductProfileSnapshot = input.productProfileSnapshot || (input as any).productProfile;
    const finalProductAssetId = input.productAssetId || finalProductProfileSnapshot?.productAssetId || '';

    const recipe: SceneRecipe = {
      schemaVersion: '1.0',
      recipeId: `recipe-mock-${Date.now()}`,
      version: 1,
      basedOnVersion: null,
      productAssetId: finalProductAssetId,
      productProfileSnapshot: finalProductProfileSnapshot,
      guidedAnswers: input.guidedAnswers,
      selectedDirectionId: input.selectedDirectionId,
      task: {
        operation: 'generate_empty_scene_background',
        productRole: 'analysis_and_spatial_reference_only',
        backgroundOnly: true,
      },
      scene: {
        spaceType: 'study',
        wallMaterial: 'concrete',
        desktopMaterial: 'wood',
        desktopTone: 'light oak',
        backgroundBrightness: 'medium_light',
        style: 'nordic minimalist',
        palette: ['#F5F5F7', '#E5E5EA'],
        furnitureDensity: 'low',
      },
      composition: {
        purpose: 'hero',
        productCount: 1,
        productPosition: 'center',
        productWidthPercent: 50,
        copySpace: 'none',
        cameraView: 'front_left',
        cameraHeight: 'near_eye_level',
        framing: 'medium',
        perspectiveStrength: 'low',
        desktopVisiblePercent: 30,
      },
      lighting: {
        sourceType: 'window',
        sourcePosition: 'upper_left',
        temperature: 'neutral',
        softness: 'soft',
        contrast: 'low',
        shadowDirection: 'rear_right',
      },
      decoration: {
        density: 'minimal',
        allowed: ['small succulent'],
        forbiddenNearProduct: [],
        foregroundOcclusion: false,
      },
      output: {
        aspectRatio: '1:1',
        resolutionLabel: '2K',
        realism: 'real_commercial_interior_photography',
        exclude: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    SceneRecipeSchema.parse(recipe);
    return recipe;
  }

  async analyzeMatch(input: AnalyzeMatchInput): Promise<MatchReport> {
    const report: MatchReport = {
      id: `report-mock-${Date.now()}`,
      recipeVersion: input.sceneRecipe.version,
      productSceneStatus: 'pass',
      issues: [],
      strengths: [
        '物体底部视觉接触贴合度高，无悬空或透视穿模。',
        '光影投射方向与原本透视参数一致，过渡平滑细腻。',
        '色调和谐，白平衡分布均衡，符合极简暖阳设计要求。'
      ],
      analyzedAt: new Date().toISOString(),
    };

    MatchReportSchema.parse(report);
    return report;
  }

  async proposeRecipePatch(input: ProposePatchInput): Promise<RecipePatchOperation[]> {
    const patches: RecipePatchOperation[] = [
      {
        op: 'replace',
        path: 'scene.desktopTone',
        value: 'slightly warm beige oak',
        reason: '根据阴影偏暖色特征，建议将浅橡木色调整为偏暖的燕麦黄橡木，以改善色系匹配一致性。',
      },
      {
        op: 'replace',
        path: 'lighting.softness',
        value: 'soft',
        reason: '匹配报告指出背景过渡稍有硬边缘，调整为更软的羽化光源散射可以强化真实感。',
      }
    ];

    patches.forEach((p) => RecipePatchOperationSchema.parse(p));
    return patches;
  }

  async planNextSeriesShot(input: PlanNextShotInput): Promise<NextShotPlan> {
    const nextShotPlan: NextShotPlan = {
      nextShotId: `recipe-next-series-${Date.now()}`,
      recommendedRecipe: {
        schemaVersion: '1.0',
        recipeId: `recipe-next-${Date.now()}`,
        version: 1,
        basedOnVersion: null,
        productAssetId: input.activeRecipe.productAssetId,
        productProfileSnapshot: input.activeRecipe.productProfileSnapshot,
        guidedAnswers: input.activeRecipe.guidedAnswers,
        selectedDirectionId: input.activeRecipe.selectedDirectionId,
        task: {
          operation: 'generate_empty_scene_background',
          productRole: 'analysis_and_spatial_reference_only',
          backgroundOnly: true,
        },
        scene: {
          ...input.activeRecipe.scene,
          furnitureDensity: 'low',
        },
        composition: {
          ...input.activeRecipe.composition,
          productPosition: 'center_right', // Move slightly to create series layout variation
        },
        lighting: {
          ...input.activeRecipe.lighting,
        },
        decoration: {
          ...input.activeRecipe.decoration,
          allowed: [...input.activeRecipe.decoration.allowed, 'ceramic tea mug'], // Add a slight variation asset
        },
        output: {
          ...input.activeRecipe.output,
        },
        inheritance: {
          seriesId: input.seriesProject.id,
          mode: input.seriesProject.mode,
          lockedSeriesVersion: input.seriesProject.version,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      reasoning: '在保持系列化“同一视觉风格”的基调下，建议将下一张台历放置在略偏右的视觉落点，并引入一个精致的陶瓷茶杯作为点缀物，丰富系列的叙事连贯性与生活气息。'
    };

    // Parse the inner recommendedRecipe to make sure it complies with Zod
    SceneRecipeSchema.parse(nextShotPlan.recommendedRecipe);

    return nextShotPlan;
  }
}
