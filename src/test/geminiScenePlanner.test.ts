import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiScenePlannerService } from '../../server/services/geminiScenePlanner.js';
import { GeminiClient } from '../../server/services/geminiProductAnalyzer.js';
import { RealAdapter } from '../../src/services/ai/realAdapter.js';

// Wrap prototype methods for unit tests to inject modelId where missing
const originalGenerateGuidedQuestions = GeminiScenePlannerService.prototype.generateGuidedQuestions;
GeminiScenePlannerService.prototype.generateGuidedQuestions = function(profile: any, modelId?: string) {
  return originalGenerateGuidedQuestions.call(this, profile, modelId || 'gemini-3.5-flash');
};

const originalPlanSceneDirections = GeminiScenePlannerService.prototype.planSceneDirections;
GeminiScenePlannerService.prototype.planSceneDirections = function(profile: any, guidedAnswers: any[], modelId?: string) {
  return originalPlanSceneDirections.call(this, profile, guidedAnswers, modelId || 'gemini-3.5-flash');
};

class MockGeminiClient implements GeminiClient {
  public generateContent = vi.fn();
}

const VALID_MOCK_PROFILE = {
  schemaVersion: '1.0' as const,
  productAssetId: 'asset-123',
  productType: 'desk_calendar' as const,
  bracketType: 'paper_base' as const,
  subjectBounds: { x: 50, y: 50, width: 300, height: 400 },
  contactRegion: { xStart: 100, xEnd: 300, y: 440, confidence: 'high' as const },
  view: {
    class: 'front_left' as const,
    visibleTop: 'none' as const,
    visibleSide: 'left' as const,
    perspectiveStrength: 'medium' as const
  },
  materials: [
    { name: 'paper' as const, reflectivity: 'low' as const }
  ],
  palette: {
    dominant: ['#FFFFFF', '#2C3E50'],
    edgeBrightness: 'light' as const
  },
  existingLighting: {
    direction: 'upper_left' as const,
    temperature: 'neutral_warm' as const,
    softness: 'soft' as const,
    contrast: 'medium' as const
  },
  uncertainties: [],
  overallConfidence: 'high' as const,
  analyzedAt: '2026-07-10T20:17:43-07:00'
};

const VALID_QUESTIONS_MOCK_RESPONSE = {
  questions: [
    {
      id: 'q-1',
      text: '您期望的拍摄风格是什么？',
      options: [
        { id: 'opt-minimal', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' },
        { id: 'opt-dark', text: '暗黑商务风' }
      ],
      recommendedOptionId: 'opt-minimal',
      category: 'style'
    },
    {
      id: 'q-2',
      text: '背景元素的丰富度要求如何？',
      options: [
        { id: 'opt-low', text: '留白较多', recommendationReason: '可预留排版空间' },
        { id: 'opt-high', text: '道具丰富' }
      ],
      recommendedOptionId: 'opt-low',
      category: 'background_density'
    }
  ]
};

const VALID_DIRECTIONS_MOCK_RESPONSE = {
  directions: [
    {
      id: 'dir-nordic',
      name: '北欧暖阳书房',
      summary: '柔和视窗斜射光配合浅橡木桌面。',
      recommended: true,
      recommendationReason: '与淡色底座及纸质本色视觉高度契合。',
      spaceType: '书房',
      desktop: '浅橡木桌面',
      palette: ['#F5F5F7', '#E5E5EA'],
      lightingSummary: '左侧窗户斜光。',
      compositionSummary: '三分法产品偏右。',
      decorationSummary: '背景摆放一盆多肉。',
      risks: ['浅色桌面可能反光较强。']
    },
    {
      id: 'dir-industrial',
      name: '极简水泥灰',
      summary: '暗调微水泥墙面。',
      recommended: false,
      recommendationReason: '冷色调氛围。',
      spaceType: '办公区',
      desktop: '微水泥台面',
      palette: ['#3A3A3C', '#2C2C2E'],
      lightingSummary: '顶部灯条。',
      compositionSummary: '居中透视。',
      decorationSummary: '无冗余背景。',
      risks: ['阴影稍微沉闷。']
    },
    {
      id: 'dir-retro',
      name: '复古咖啡厅',
      summary: '暗胡桃木配暖色台灯。',
      recommended: false,
      recommendationReason: '温暖质感。',
      spaceType: '咖啡厅',
      desktop: '深色胡桃木桌面',
      palette: ['#4A3B32', '#8B5A2B'],
      lightingSummary: '台灯点光源。',
      compositionSummary: '对角线。',
      decorationSummary: '虚化远景。',
      risks: ['胡桃木偏暗。']
    }
  ]
};

describe('GeminiScenePlannerService Unit Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.GEMINI_API_KEY = 'mock-key-123';
    process.env.GEMINI_ANALYSIS_MODEL = 'gemini-3.5-flash';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('1. Succeeds with valid guided questions', async () => {
    const client = new MockGeminiClient();
    client.generateContent.mockResolvedValue({
      text: JSON.stringify(VALID_QUESTIONS_MOCK_RESPONSE)
    });

    const planner = new GeminiScenePlannerService(client);
    const result = await planner.generateGuidedQuestions(VALID_MOCK_PROFILE);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('q-1');
    expect(result[0].category).toBe('style');
    expect(client.generateContent).toHaveBeenCalledTimes(1);
  });

  it('2. Guided questions count > 5 gets intercepted and triggers retry/fails', async () => {
    const client = new MockGeminiClient();
    // Too many questions
    const badResponse = {
      questions: Array.from({ length: 6 }, (_, idx) => ({
        id: `q-${idx}`,
        text: '中文提问',
        options: [
          { id: 'opt-1', text: '选项一' },
          { id: 'opt-2', text: '选项二' }
        ],
        category: 'style'
      }))
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.generateGuidedQuestions(VALID_MOCK_PROFILE))
      .rejects
      .toThrowError('生成引导问题大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('3. Options count < 2 gets intercepted', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      questions: [
        {
          id: 'q-1',
          text: '少于两个选项提问',
          options: [
            { id: 'opt-1', text: '独家选项' }
          ],
          category: 'style'
        },
        {
          id: 'q-2',
          text: '正常问题',
          options: [
            { id: 'opt-1', text: '正常一' },
            { id: 'opt-2', text: '正常二' }
          ],
          category: 'purpose'
        }
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.generateGuidedQuestions(VALID_MOCK_PROFILE))
      .rejects
      .toThrowError('生成引导问题大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('4. Directions count !== 3 gets intercepted', async () => {
    const client = new MockGeminiClient();
    // Only 2 directions
    const badResponse = {
      directions: [
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[1]
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('5. Direction recommended count !== 1 gets intercepted', async () => {
    const client = new MockGeminiClient();
    // Two recommended
    const badResponse = {
      directions: [
        { ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0], recommended: true },
        { ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[1], recommended: true },
        { ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[2], recommended: false }
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('6. Duplicate direction IDs gets intercepted', async () => {
    const client = new MockGeminiClient();
    // Duplicate IDs
    const badResponse = {
      directions: [
        { ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0], id: 'duplicate-id' },
        { ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[1], id: 'duplicate-id' },
        { ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[2], id: 'other-id' }
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('7. English user visible text triggers repair once and succeeds', async () => {
    const client = new MockGeminiClient();
    const englishResponse = {
      questions: [
        {
          id: 'q-1',
          text: 'What is the desired style?', // English!
          options: [
            { id: 'opt-minimal', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' },
            { id: 'opt-dark', text: '暗黑商务风' }
          ],
          category: 'style'
        },
        {
          id: 'q-2',
          text: '背景元素的丰富度要求如何？',
          options: [
            { id: 'opt-low', text: '留白较多', recommendationReason: '可预留排版空间' },
            { id: 'opt-high', text: '道具丰富' }
          ],
          category: 'background_density'
        }
      ]
    };

    client.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(englishResponse) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_QUESTIONS_MOCK_RESPONSE) });

    const planner = new GeminiScenePlannerService(client);
    const result = await planner.generateGuidedQuestions(VALID_MOCK_PROFILE);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('您期望的拍摄风格是什么？');
    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('8. Two consecutive failures return standard parse error', async () => {
    const client = new MockGeminiClient();
    client.generateContent.mockResolvedValue({
      text: 'Malformed JSON completely'
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.generateGuidedQuestions(VALID_MOCK_PROFILE))
      .rejects
      .toThrowError('生成引导问题大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('9. RealAdapter does not fall back to Mock when HTTP request fails', async () => {
    // Stub global fetch to simulate network error
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const adapter = new RealAdapter();
    await expect(adapter.generateGuidedQuestions({ productProfile: VALID_MOCK_PROFILE }))
      .rejects
      .toThrowError('Network offline');

    global.fetch = originalFetch;
  });

  it('10. Planning directions request does not call analyzeProduct', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => VALID_DIRECTIONS_MOCK_RESPONSE.directions
    });
    global.fetch = fetchMock;

    const adapter = new RealAdapter();
    const result = await adapter.planSceneDirections({
      productProfile: VALID_MOCK_PROFILE,
      guidedAnswers: []
    });

    expect(result).toHaveLength(3);
    // Verifying that our RealAdapter planSceneDirections calls /api/ai/scene-directions directly
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/scene-directions');

    global.fetch = originalFetch;
  });

  it('11. Question: recommended option not at index 0 is intercepted and triggers repair once and succeeds', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      questions: [
        {
          id: 'q-1',
          text: '您期望的拍摄风格是什么？',
          options: [
            { id: 'opt-dark', text: '暗黑商务风' }, // index 0 is not the recommended one
            { id: 'opt-minimal', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' }
          ],
          recommendedOptionId: 'opt-minimal',
          category: 'style'
        },
        VALID_QUESTIONS_MOCK_RESPONSE.questions[1]
      ]
    };

    const goodResponse = {
      questions: [
        {
          id: 'q-1',
          text: '您期望的拍摄风格是什么？',
          options: [
            { id: 'opt-minimal', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' },
            { id: 'opt-dark', text: '暗黑商务风' }
          ],
          recommendedOptionId: 'opt-minimal',
          category: 'style'
        },
        VALID_QUESTIONS_MOCK_RESPONSE.questions[1]
      ]
    };

    client.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(badResponse) })
      .mockResolvedValueOnce({ text: JSON.stringify(goodResponse) });

    const planner = new GeminiScenePlannerService(client);
    const result = await planner.generateGuidedQuestions(VALID_MOCK_PROFILE);

    expect(result).toHaveLength(2);
    expect(result[0].options[0].id).toBe('opt-minimal');
    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('12. Question: recommendedOptionId pointing to non-existent option is intercepted', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      questions: [
        {
          id: 'q-1',
          text: '您期望的拍摄风格是什么？',
          options: [
            { id: 'opt-minimal', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' },
            { id: 'opt-dark', text: '暗黑商务风' }
          ],
          recommendedOptionId: 'opt-nonexistent', // nonexistent option ID
          category: 'style'
        },
        VALID_QUESTIONS_MOCK_RESPONSE.questions[1]
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.generateGuidedQuestions(VALID_MOCK_PROFILE))
      .rejects
      .toThrowError('生成引导问题大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('13. Question: duplicate option IDs is intercepted', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      questions: [
        {
          id: 'q-1',
          text: '您期望的拍摄风格是什么？',
          options: [
            { id: 'opt-dup', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' },
            { id: 'opt-dup', text: '暗黑商务风' }
          ],
          recommendedOptionId: 'opt-dup',
          category: 'style'
        },
        VALID_QUESTIONS_MOCK_RESPONSE.questions[1]
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.generateGuidedQuestions(VALID_MOCK_PROFILE))
      .rejects
      .toThrowError('生成引导问题大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('14. Question: consecutive failures of recommended option check throws parsing error', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      questions: [
        {
          id: 'q-1',
          text: '您期望的拍摄风格是什么？',
          options: [
            { id: 'opt-dark', text: '暗黑商务风' },
            { id: 'opt-minimal', text: '极简北欧风', recommendationReason: '与您的纸质底座非常契合' }
          ],
          recommendedOptionId: 'opt-minimal',
          category: 'style'
        },
        VALID_QUESTIONS_MOCK_RESPONSE.questions[1]
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.generateGuidedQuestions(VALID_MOCK_PROFILE))
      .rejects
      .toThrowError('生成引导问题大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('15. Directions: three identical directions gets intercepted', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      directions: [
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0]
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('16. Directions: only modifying non-core fields gets intercepted', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      directions: [
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        {
          ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
          id: 'dir-diff-id-1',
          name: 'Different Name 1',
          summary: 'Different summary 1',
          recommendationReason: 'Different reason 1',
          recommended: false
        },
        {
          ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
          id: 'dir-diff-id-2',
          name: 'Different Name 2',
          summary: 'Different summary 2',
          recommendationReason: 'Different reason 2',
          recommended: false
        }
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('17. Directions: only modifying whitespace, punctuation, or palette order is treated as duplicate', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      directions: [
        {
          ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
          palette: ['#F5F5F7', '#E5E5EA']
        },
        {
          ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
          id: 'dir-diff-id-1',
          palette: ['#E5E5EA', '#F5F5F7'], // palette order change
          desktop: '  浅橡木桌面  \n', // extra spaces
          recommended: false
        },
        {
          ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
          id: 'dir-diff-id-2',
          recommended: false
        }
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('18. Directions: any pairwise duplication of core fields is intercepted', async () => {
    const client = new MockGeminiClient();
    // A and B are identical in core fields, C is different
    const badResponse = {
      directions: [
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        {
          ...VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
          id: 'dir-diff-id-1',
          recommended: false
        },
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[1]
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('19. Directions: having changes in at least two core dimensions passes', async () => {
    const client = new MockGeminiClient();
    // VALID_DIRECTIONS_MOCK_RESPONSE.directions has differences in Space, Tone, Light, Composition, and Decoration.
    client.generateContent.mockResolvedValue({
      text: JSON.stringify(VALID_DIRECTIONS_MOCK_RESPONSE)
    });

    const planner = new GeminiScenePlannerService(client);
    const result = await planner.planSceneDirections(VALID_MOCK_PROFILE, []);

    expect(result).toHaveLength(3);
    expect(client.generateContent).toHaveBeenCalledTimes(1);
  });

  it('20. Directions: first attempt illegal core differences, second attempt legal succeeds', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      directions: [
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0]
      ]
    };

    client.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(badResponse) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_DIRECTIONS_MOCK_RESPONSE) });

    const planner = new GeminiScenePlannerService(client);
    const result = await planner.planSceneDirections(VALID_MOCK_PROFILE, []);

    expect(result).toHaveLength(3);
    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });

  it('21. Directions: consecutive core difference failures return standard parse error', async () => {
    const client = new MockGeminiClient();
    const badResponse = {
      directions: [
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0],
        VALID_DIRECTIONS_MOCK_RESPONSE.directions[0]
      ]
    };

    client.generateContent.mockResolvedValue({
      text: JSON.stringify(badResponse)
    });

    const planner = new GeminiScenePlannerService(client);
    await expect(planner.planSceneDirections(VALID_MOCK_PROFILE, []))
      .rejects
      .toThrowError('规划场景方向大模型响应解析及校验失败');

    expect(client.generateContent).toHaveBeenCalledTimes(2);
  });
});
