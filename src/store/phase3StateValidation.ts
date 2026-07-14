import {
  ProjectState,
  GuidedQuestion,
  GuidedAnswer,
  SceneDirection,
} from '../types/schemas';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGuidedAnswerCoverage(
  questions: GuidedQuestion[],
  answers: GuidedAnswer[]
): ValidationResult {
  const errors: string[] = [];

  if (questions.length < 2 || questions.length > 5) {
    errors.push(`问题数量必须为 2～5 个，当前为 ${questions.length} 个`);
  }

  const questionIdSet = new Set<string>();
  for (const q of questions) {
    if (!q.id) {
      errors.push('问题 ID 不能为空');
    }
    if (questionIdSet.has(q.id)) {
      errors.push(`存在重复的问题 ID: ${q.id}`);
    }
    questionIdSet.add(q.id);

    if (q.options.length < 2 || q.options.length > 3) {
      errors.push(`问题 ${q.id} 的选项数量必须为 2～3 个`);
    }

    const optionIdSet = new Set<string>();
    let hasRecommended = false;
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      if (!opt.id) {
        errors.push(`问题 ${q.id} 的选项 ID 不能为空`);
      }
      if (optionIdSet.has(opt.id)) {
        errors.push(`问题 ${q.id} 存在重复的选项 ID: ${opt.id}`);
      }
      optionIdSet.add(opt.id);
      
      if (opt.id === q.recommendedOptionId) {
        hasRecommended = true;
        if (i !== 0) {
          errors.push(`问题 ${q.id} 的推荐项必须位于 options 的第一个`);
        }
      }
    }

    if (!hasRecommended) {
      errors.push(`问题 ${q.id} 的 recommendedOptionId 必须属于该问题`);
    }
  }

  if (answers.length !== questions.length) {
    errors.push(`答案数量 (${answers.length}) 与问题数量 (${questions.length}) 不匹配`);
  }

  const answeredQuestionIds = new Set<string>();
  for (const a of answers) {
    if (answeredQuestionIds.has(a.questionId)) {
      errors.push(`不允许重复回答问题: ${a.questionId}`);
    }
    answeredQuestionIds.add(a.questionId);

    const q = questions.find((qItem) => qItem.id === a.questionId);
    if (!q) {
      errors.push(`答案的问题 ID ${a.questionId} 不存在于当前问题集中`);
    } else {
      const isValidOption = q.options.some((o) => o.id === a.optionId);
      if (!isValidOption) {
        errors.push(`答案的选项 ID ${a.optionId} 不属于问题 ${a.questionId}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSceneDirectionSet(
  directions: SceneDirection[],
  selectedDirectionId: string | null
): ValidationResult {
  const errors: string[] = [];

  if (directions.length !== 3) {
    errors.push(`场景方向数量必须严格为 3 个，当前为 ${directions.length} 个`);
  }

  const idSet = new Set<string>();
  let recommendedCount = 0;

  for (const d of directions) {
    if (!d.id) {
      errors.push('方向 ID 不能为空');
    }
    if (idSet.has(d.id)) {
      errors.push(`存在重复的方向 ID: ${d.id}`);
    }
    idSet.add(d.id);

    if (d.recommended) {
      recommendedCount++;
    }
  }

  if (directions.length > 0 && recommendedCount !== 1) {
    errors.push(`严格只能有 1 个推荐方向，当前有 ${recommendedCount} 个`);
  }

  if (selectedDirectionId !== null) {
    if (!idSet.has(selectedDirectionId)) {
      errors.push(`选中的方向 ID ${selectedDirectionId} 不存在于当前方向列表中`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getSafeRecoveryState(state: ProjectState): ProjectState {
  const s = { ...state };

  if (s.status === 'TEMPLATE_SELECTION' || s.status === 'PRODUCTION_READY') {
    if (!s.productAsset || !s.productProfile || !s.sceneRecipe) {
      s.status = s.productAsset ? 'PRODUCT_IMPORTED' : 'EMPTY';
    }
    return s;
  }

  if (
    s.status === 'PRODUCT_REVIEW' ||
    s.status === 'GUIDED_QUESTIONS' || 
    s.status === 'DIRECTION_SELECTION' || 
    s.status === 'RECIPE_READY' ||
    s.status === 'AWAITING_EXTERNAL_GENERATION' ||
    s.status === 'PREVIEW_IMPORTED' ||
    s.status === 'ANALYZING_MATCH' ||
    s.status === 'NEEDS_REVISION' ||
    s.status === 'APPROVED' ||
    s.status === 'SERIES_ACTIVE'
  ) {
    if (!s.productAsset || !s.productProfile) {
      if (s.productAsset) {
        s.status = 'PRODUCT_IMPORTED';
      } else {
        s.status = 'EMPTY';
      }
      s.guidedQuestions = null;
      s.guidedAnswers = [];
      s.sceneDirections = null;
      s.selectedDirectionId = null;
      return s;
    }
  }

  if (
    s.status === 'PRODUCT_IMPORTED' ||
    s.status === 'PRODUCT_REVIEW' ||
    s.status === 'ANALYZING_PRODUCT' ||
    s.status === 'EMPTY'
  ) {
    return s;
  }

  if (!s.guidedQuestions) {
    s.status = 'PRODUCT_REVIEW';
    s.guidedAnswers = [];
    s.sceneDirections = null;
    s.selectedDirectionId = null;
    return s;
  }

  let qValid = true;
  if (s.guidedQuestions.length < 2 || s.guidedQuestions.length > 5) qValid = false;
  const qSet = new Set();
  for (const q of s.guidedQuestions) {
    if (!q.id || qSet.has(q.id)) qValid = false;
    qSet.add(q.id);
    if (q.options.length < 2 || q.options.length > 3) qValid = false;
    const oSet = new Set();
    let hasRec = false;
    for (let i = 0; i < q.options.length; i++) {
      if (oSet.has(q.options[i].id)) qValid = false;
      oSet.add(q.options[i].id);
      if (q.options[i].id === q.recommendedOptionId) {
        hasRec = true;
        if (i !== 0) qValid = false;
      }
    }
    if (!hasRec) qValid = false;
  }

  if (!qValid) {
    s.status = 'PRODUCT_REVIEW';
    s.guidedQuestions = null;
    s.guidedAnswers = [];
    s.sceneDirections = null;
    s.selectedDirectionId = null;
    return s;
  }

  const validAnswers: GuidedAnswer[] = [];
  const answeredQSet = new Set<string>();
  
  for (const a of s.guidedAnswers) {
    if (answeredQSet.has(a.questionId)) continue; 
    const q = s.guidedQuestions.find(qItem => qItem.id === a.questionId);
    if (q && q.options.some(o => o.id === a.optionId)) {
      validAnswers.push(a);
      answeredQSet.add(a.questionId);
    }
  }
  s.guidedAnswers = validAnswers;

  const isAnswersComplete = s.guidedAnswers.length === s.guidedQuestions.length;

  if (!isAnswersComplete || s.status === 'GUIDED_QUESTIONS') {
    s.status = 'GUIDED_QUESTIONS';
    s.sceneDirections = null;
    s.selectedDirectionId = null;
    return s;
  }

  if (!s.sceneDirections) {
    s.status = 'GUIDED_QUESTIONS';
    s.selectedDirectionId = null;
    return s;
  }

  const dValidation = validateSceneDirectionSet(s.sceneDirections, null);
  if (!dValidation.valid) {
    s.status = 'GUIDED_QUESTIONS';
    s.sceneDirections = null;
    s.selectedDirectionId = null;
    return s;
  }

  if (s.selectedDirectionId) {
    const dirExists = s.sceneDirections.some(d => d.id === s.selectedDirectionId);
    if (!dirExists) {
      s.selectedDirectionId = null;
      if (s.status !== 'DIRECTION_SELECTION') {
        s.status = 'DIRECTION_SELECTION';
      }
    }
  } else if (s.status !== 'DIRECTION_SELECTION') {
     s.status = 'DIRECTION_SELECTION';
  }

  return s;
}
