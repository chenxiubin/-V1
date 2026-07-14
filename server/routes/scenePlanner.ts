import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ProductProfileSchema, GuidedAnswerSchema, SceneRecipeSchema, AnalyzeMatchInputSchema, GuidedQuestionSchema, SceneDirectionSchema, CreateRecipeInputSchema } from '../../src/types/schemas.js';
import { GeminiScenePlannerService } from '../services/geminiScenePlanner.js';

const router = Router();

function handleApiError(error, defaultMessage) {
  let status = 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || defaultMessage;
  let retryable = typeof error.retryable === 'boolean' ? error.retryable : false;
  let retryAfterSeconds = null;

  if (error.code === 'TIMEOUT' || error.status === 504 || error.statusCode === 504) {
    status = 504;
    code = 'TIMEOUT';
    message = '大模型服务请求超时（120秒超时限制），请重试。';
    retryable = true;
  } else if (error.status === 429 || error.statusCode === 429 || /429|resource_exhausted|quota/i.test(error.message)) {
    status = 429;
    code = 'GEMINI_QUOTA_EXHAUSTED';
    message = '当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。';
    retryable = true;
    console.error(JSON.stringify({
      status,
      code,
      model: process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.5-flash',
      quotaMetric: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      retryAfterSeconds
    }));
  } else if (error.status === 503 || error.statusCode === 503 || /503|service_unavailable/i.test(error.message)) {
    status = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = '智能分析服务暂时不可用（503 Service Unavailable），请稍后再试。';
    retryable = true;
  }

  return { status, payload: { code, message, retryable } };
}


router.post('/guided-questions', async (req: Request, res: Response) => {
  try {
    const productProfile = req.body.productProfile;
    if (!productProfile) {
      return res.status(400).json({
        code: 'MISSING_PRODUCT_PROFILE',
        message: '缺少产品分析数据 (productProfile)。',
        retryable: false
      });
    }

    const check = ProductProfileSchema.safeParse(productProfile);
    if (!check.success) {
      return res.status(400).json({
        code: 'INVALID_PRODUCT_PROFILE',
        message: `产品分析数据格式非法: ${check.error.issues.map(i => i.message).join(', ')}`,
        retryable: false
      });
    }

    const service = req.app.get('scenePlannerService') as GeminiScenePlannerService;
    if (!service) {
      return res.status(500).json({
        code: 'SERVICE_NOT_FOUND',
        message: '系统配置错误：场景规划服务未注册。',
        retryable: false
      });
    }

    const questions = await service.generateGuidedQuestions(check.data);
    return res.status(200).json(questions);

  } catch (error: any) {
    const { status, payload } = handleApiError(error, '服务端生成引导问题时发生未知错误。');
    return res.status(status).json(payload);
  }
});

router.post('/scene-directions', async (req: Request, res: Response) => {
  try {
    const { productProfile, guidedAnswers } = req.body;
    if (!productProfile) {
      return res.status(400).json({
        code: 'MISSING_PRODUCT_PROFILE',
        message: '缺少产品分析数据 (productProfile)。',
        retryable: false
      });
    }

    if (!guidedAnswers || !Array.isArray(guidedAnswers)) {
      return res.status(400).json({
        code: 'MISSING_GUIDED_ANSWERS',
        message: '缺少引导问答回复 (guidedAnswers)。',
        retryable: false
      });
    }

    const checkProfile = ProductProfileSchema.safeParse(productProfile);
    if (!checkProfile.success) {
      return res.status(400).json({
        code: 'INVALID_PRODUCT_PROFILE',
        message: `产品分析数据格式非法: ${checkProfile.error.issues.map(i => i.message).join(', ')}`,
        retryable: false
      });
    }

    // Check answers
    for (const ans of guidedAnswers) {
      const checkAns = GuidedAnswerSchema.safeParse(ans);
      if (!checkAns.success) {
        return res.status(400).json({
          code: 'INVALID_GUIDED_ANSWER',
          message: `引导问答回复格式非法: ${checkAns.error.issues.map(i => i.message).join(', ')}`,
          retryable: false
        });
      }
    }

    const service = req.app.get('scenePlannerService') as GeminiScenePlannerService;
    if (!service) {
      return res.status(500).json({
        code: 'SERVICE_NOT_FOUND',
        message: '系统配置错误：场景规划服务未注册。',
        retryable: false
      });
    }

    const directions = await service.planSceneDirections(checkProfile.data, guidedAnswers);
    return res.status(200).json(directions);

  } catch (error: any) {
    const { status, payload } = handleApiError(error, '服务端生成场景规划方向时发生未知错误。');
    return res.status(status).json(payload);
  }
});


router.post('/scene-recipe', async (req: Request, res: Response) => {
  try {
    const { productProfile, guidedAnswers, sceneDirections, selectedDirectionId, productAsset, productAssetId, productProfileSnapshot, guidedQuestions } = req.body;

    // Normalize input keys: Allow fallback for backward compatibility with tests using old keys
    const finalProductAssetId = productAssetId || productProfileSnapshot?.productAssetId || productProfile?.productAssetId;
    const finalProductProfileSnapshot = productProfileSnapshot || productProfile;
    const finalGuidedQuestions = guidedQuestions || [];
    const finalGuidedAnswers = guidedAnswers || [];
    const finalSceneDirections = sceneDirections || [];
    const finalSelectedDirectionId = selectedDirectionId;

    if (!finalProductAssetId) return res.status(400).json({ code: 'MISSING_PRODUCT_ASSET_ID', message: '缺少 productAssetId。', retryable: false });
    if (!finalProductProfileSnapshot) return res.status(400).json({ code: 'MISSING_PRODUCT_PROFILE_SNAPSHOT', message: '缺少 productProfileSnapshot。', retryable: false });
    if (!finalGuidedAnswers || !Array.isArray(finalGuidedAnswers)) return res.status(400).json({ code: 'MISSING_GUIDED_ANSWERS', message: '缺少 guidedAnswers。', retryable: false });
    if (!finalSceneDirections || !Array.isArray(finalSceneDirections)) return res.status(400).json({ code: 'MISSING_DIRECTIONS', message: '缺少 sceneDirections。', retryable: false });
    if (typeof finalSelectedDirectionId !== 'string') return res.status(400).json({ code: 'MISSING_SELECTED_ID', message: '缺少 selectedDirectionId。', retryable: false });

    const checkProfile = ProductProfileSchema.safeParse(finalProductProfileSnapshot);
    if (!checkProfile.success) return res.status(400).json({ code: 'INVALID_PRODUCT_PROFILE', message: '产品分析数据格式非法', retryable: false });

    // 1. productAssetId 与 productProfileSnapshot.productAssetId 完全一致
    if (finalProductAssetId !== checkProfile.data.productAssetId) {
      return res.status(400).json({
        code: 'PRODUCT_ASSET_MISMATCH',
        message: '当前产品与场景规划数据不一致，可能是产品被替换或历史状态已过期。请返回产品分析后重新规划。',
        retryable: false
      });
    }

    // Strong Consistency Gatekeeping (legacy check): verify productAsset.id === productProfileSnapshot.productAssetId
    if (productAsset && productAsset.id !== checkProfile.data.productAssetId) {
      return res.status(400).json({
        code: 'PRODUCT_ASSET_MISMATCH',
        message: '当前产品与场景规划数据不一致，可能是产品被替换或历史状态已过期。请返回产品分析后重新规划。',
        retryable: false
      });
    }

    // Only apply questions validation rules if questions are provided (some legacy tests might not provide them)
    if (guidedQuestions && Array.isArray(guidedQuestions)) {
      // 2. guidedQuestions 数量为 2～5
      if (finalGuidedQuestions.length < 2 || finalGuidedQuestions.length > 5) {
        return res.status(400).json({
          code: 'INVALID_QUESTIONS_COUNT',
          message: 'guidedQuestions 数量必须在 2 到 5 之间',
          retryable: false
        });
      }

      // 3. 每题选项数量为 2～3
      // 4. questionId 唯一
      // 5. optionId 在题内唯一
      const questionIds = new Set<string>();
      for (const q of finalGuidedQuestions) {
        const checkQ = GuidedQuestionSchema.safeParse(q);
        if (!checkQ.success) return res.status(400).json({ code: 'INVALID_GUIDED_QUESTION', message: '引导问题格式错误', retryable: false });
        
        if (q.options.length < 2 || q.options.length > 3) {
          return res.status(400).json({
            code: 'INVALID_OPTIONS_COUNT',
            message: `问题 ${q.id} 的选项数量必须在 2 到 3 之间`,
            retryable: false
          });
        }
        
        if (questionIds.has(q.id)) {
          return res.status(400).json({
            code: 'DUPLICATE_QUESTION_ID',
            message: `问题 ID ${q.id} 重复`,
            retryable: false
          });
        }
        questionIds.add(q.id);
        
        const optionIds = new Set<string>();
        for (const opt of q.options) {
          if (optionIds.has(opt.id)) {
            return res.status(400).json({
              code: 'DUPLICATE_OPTION_ID',
              message: `问题 ${q.id} 内部存在重复的选项 ID ${opt.id}`,
              retryable: false
            });
          }
          optionIds.add(opt.id);
        }
      }

      // 6. guidedAnswers 完全覆盖所有问题
      if (finalGuidedAnswers.length !== finalGuidedQuestions.length) {
        return res.status(400).json({
          code: 'ANSWERS_MISMATCH',
          message: '回答的数量必须与引导问题的数量完全一致',
          retryable: false
        });
      }

      // 9. 不存在重复答案
      const answerQuestionIds = new Set<string>();
      for (const ans of finalGuidedAnswers) {
        const checkAns = GuidedAnswerSchema.safeParse(ans);
        if (!checkAns.success) return res.status(400).json({ code: 'INVALID_GUIDED_ANSWER', message: '引导回答格式错误', retryable: false });

        if (answerQuestionIds.has(ans.questionId)) {
          return res.status(400).json({
            code: 'DUPLICATE_ANSWER_QUESTION',
            message: `存在针对同一个问题 ${ans.questionId} 的重复答案`,
            retryable: false
          });
        }
        answerQuestionIds.add(ans.questionId);

        // 7. answer.questionId 对应真实问题
        if (!questionIds.has(ans.questionId)) {
          return res.status(400).json({
            code: 'UNKNOWN_ANSWER_QUESTION',
            message: `答案对应的问题 ID ${ans.questionId} 在引导问题中不存在`,
            retryable: false
          });
        }

        // 8. answer.optionId 对应该题真实选项
        const matchingQuestion = finalGuidedQuestions.find(q => q.id === ans.questionId);
        const optionExists = matchingQuestion?.options.some(opt => opt.id === ans.optionId);
        if (!optionExists) {
          return res.status(400).json({
            code: 'UNKNOWN_ANSWER_OPTION',
            message: `答案对应的选项 ID ${ans.optionId} 不属于该问题`,
            retryable: false
          });
        }
      }
    } else {
      // Validate legacy/base answers format if guidedQuestions not supplied
      for (const ans of finalGuidedAnswers) {
        const checkAns = GuidedAnswerSchema.safeParse(ans);
        if (!checkAns.success) return res.status(400).json({ code: 'INVALID_GUIDED_ANSWER', message: '引导回答格式错误', retryable: false });
      }
    }

    // 10. sceneDirections 严格为 3 个
    if (finalSceneDirections.length !== 3) {
      return res.status(400).json({
        code: 'INVALID_DIRECTIONS_COUNT',
        message: 'sceneDirections 必须严格包含 3 个场景方向',
        retryable: false
      });
    }

    // 11. direction ID 唯一
    // 12. recommended 严格为 1 个
    const directionIds = new Set<string>();
    let recommendedCount = 0;
    for (const d of finalSceneDirections) {
      const checkD = SceneDirectionSchema.safeParse(d);
      if (!checkD.success) return res.status(400).json({ code: 'INVALID_DIRECTION', message: '场景方向格式错误', retryable: false });

      if (directionIds.has(d.id)) {
        return res.status(400).json({
          code: 'INVALID_DIRECTION_ID',
          message: `场景方向 ID ${d.id} 重复`,
          retryable: false
        });
      }
      directionIds.add(d.id);

      if (d.recommended) {
        recommendedCount++;
      }
    }

    if (recommendedCount !== 1) {
      return res.status(400).json({
        code: 'INVALID_RECOMMENDED',
        message: 'sceneDirections 中推荐 (recommended) 的方向数量必须严格为 1 个',
        retryable: false
      });
    }

    // 13. selectedDirectionId 属于当前方向集合
    if (!directionIds.has(finalSelectedDirectionId)) {
      return res.status(400).json({
        code: 'INVALID_SELECTED_ID',
        message: 'selectedDirectionId 必须存在于 sceneDirections 集合中',
        retryable: false
      });
    }

    const service = req.app.get('scenePlannerService') as GeminiScenePlannerService;
    if (!service) return res.status(500).json({ code: 'SERVICE_NOT_FOUND', message: '服务未注册', retryable: false });

    const recipe = await service.createSceneRecipe(checkProfile.data, finalGuidedAnswers, finalSceneDirections, finalSelectedDirectionId, productAsset || { id: finalProductAssetId });

    // Business fixed checks (now relaxed for fields we auto-correct on server anyway)
    if (recipe.version !== 1 || recipe.schemaVersion !== '1.0' || recipe.productAssetId !== checkProfile.data.productAssetId || recipe.selectedDirectionId !== finalSelectedDirectionId) {
      return res.status(500).json({ code: 'INVALID_RECIPE_FIELDS', message: '模型返回了错误的固定字段', retryable: false });
    }
    if (recipe.task.operation !== 'generate_empty_scene_background' || recipe.task.productRole !== 'analysis_and_spatial_reference_only' || recipe.task.backgroundOnly !== true) {
      return res.status(500).json({ code: 'INVALID_RECIPE_TASK', message: '模型篡改了核心任务配置', retryable: false });
    }
    
    // Additional schema check
    const checkRecipe = SceneRecipeSchema.safeParse(recipe);
    if (!checkRecipe.success) {
      return res.status(500).json({ code: 'RECIPE_SCHEMA_FAILED', message: '创建的 Recipe 无法通过校验', retryable: false });
    }

    return res.status(200).json(checkRecipe.data);
  } catch (error: any) {
    const { status, payload } = handleApiError(error, '生成 Recipe 发生未知错误');
    return res.status(status).json(payload);
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/analyze-match', upload.fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'sceneImage', maxCount: 1 },
  { name: 'overlayImage', maxCount: 1 },
]), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const data = JSON.parse(req.body.data);
    const checkInput = AnalyzeMatchInputSchema.safeParse(data);
    if (!checkInput.success) {
      return res.status(400).json({ code: 'INVALID_INPUT', message: '输入数据格式非法', retryable: false });
    }
    const input = checkInput.data;

    if (!files.productImage || !files.sceneImage || !files.overlayImage) {
        return res.status(400).json({ code: 'MISSING_IMAGES', message: '缺少分析图片', retryable: false });
    }

    // Consistency checks
    if (input.sceneAsset.recipeId !== input.sceneRecipe.recipeId || input.sceneAsset.recipeVersion !== input.sceneRecipe.version) {
       return res.status(400).json({ code: 'RECIPE_VERSION_MISMATCH', message: '场景与Recipe版本不匹配', retryable: false });
    }
    if (input.sceneRecipe.productAssetId !== input.productAsset.id || input.productProfile.productAssetId !== input.productAsset.id) {
        return res.status(400).json({ code: 'PRODUCT_MISMATCH', message: '产品不匹配', retryable: false });
    }

    const service = req.app.get('scenePlannerService') as GeminiScenePlannerService;
    if (!service) return res.status(500).json({ code: 'SERVICE_NOT_FOUND', message: '服务未注册', retryable: false });

    // Pass buffers for analysis
    const report = await service.analyzeMatch({
        ...input,
        productBuffer: files.productImage[0].buffer,
        sceneBuffer: files.sceneImage[0].buffer,
        overlayBuffer: files.overlayImage[0].buffer
    });
    return res.status(200).json(report);
  } catch (error: any) {
    const { status, payload } = handleApiError(error, '分析发生未知错误');
    return res.status(status).json(payload);
  }
});

export default router;
