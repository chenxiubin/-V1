import { GuidedQuestion } from '../../types/schemas';

export function validateGuidedQuestionsSemanticContract(questions: GuidedQuestion[]) {
  for (const question of questions) {
    if (
      !question.recommendedOptionId ||
      typeof question.recommendedOptionId !== 'string' ||
      question.recommendedOptionId.trim() === ''
    ) {
      throw new Error('引导问题数据不符合约定，请重新生成。');
    }
    if (question.options.length < 2 || question.options.length > 3) {
      throw new Error('引导问题数据不符合约定，请重新生成。');
    }
    const hasRecommended = question.options.some(opt => opt.id === question.recommendedOptionId);
    if (!hasRecommended) {
      throw new Error('引导问题数据不符合约定，请重新生成。');
    }
    if (question.options[0].id !== question.recommendedOptionId) {
      throw new Error('引导问题数据不符合约定，请重新生成。');
    }
    const uniqueIds = new Set(question.options.map(opt => opt.id));
    if (uniqueIds.size !== question.options.length) {
      throw new Error('引导问题数据不符合约定，请重新生成。');
    }
  }
}
