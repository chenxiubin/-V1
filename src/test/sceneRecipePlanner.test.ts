import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app';
import { GeminiScenePlannerService } from '../../server/services/geminiScenePlanner';
import { RealAdapter } from '../services/ai/realAdapter';

class MockGeminiClient {
  public generateContent = vi.fn();
}

const VALID_PROFILE = {
  schemaVersion: '1.0',
  productAssetId: 'asset-123',
  productType: 'desk_calendar',
  bracketType: 'paper_base',
  subjectBounds: { x: 50, y: 50, width: 300, height: 400 },
  contactRegion: { xStart: 100, xEnd: 300, y: 440, confidence: 'high' },
  view: { class: 'front_left', visibleTop: 'none', visibleSide: 'left', perspectiveStrength: 'medium' },
  materials: [{ name: 'paper', reflectivity: 'low' }],
  palette: { dominant: ['#FFFFFF', '#2C3E50'], edgeBrightness: 'light' },
  existingLighting: { direction: 'upper_left', temperature: 'neutral_warm', softness: 'soft', contrast: 'medium' },
  uncertainties: [],
  overallConfidence: 'high',
  analyzedAt: '2026-07-10T20:17:43-07:00'
};

const VALID_GUIDED_QUESTIONS = [
  {
    id: 'q-1',
    text: '您的日历是什么尺寸？',
    options: [
      { id: 'opt-minimal', text: '迷你尺寸' },
      { id: 'opt-standard', text: '标准尺寸' }
    ],
    recommendedOptionId: 'opt-minimal',
    category: 'purpose'
  },
  {
    id: 'q-2',
    text: '放置在什么高度？',
    options: [
      { id: 'opt-low', text: '较低高度' },
      { id: 'opt-high', text: '较高高度' }
    ],
    recommendedOptionId: 'opt-low',
    category: 'style'
  }
];

const VALID_ANSWERS = [
  { questionId: 'q-1', optionId: 'opt-minimal', answeredAt: new Date().toISOString() },
  { questionId: 'q-2', optionId: 'opt-low', answeredAt: new Date().toISOString() }
];

const VALID_DIRECTIONS = [
  {
    id: 'dir-nordic', name: '北欧暖阳书房', summary: '柔和视窗斜射光配合浅橡木桌面。', recommended: true,
    recommendationReason: '与淡色底座及纸质本色视觉高度契合。', spaceType: '书房', desktop: '浅橡木桌面',
    palette: ['#F5F5F7', '#E5E5EA'], lightingSummary: '左侧窗户斜光。', compositionSummary: '三分法产品偏右。',
    decorationSummary: '背景摆放一盆多肉。', risks: ['浅色桌面可能反光较强。']
  },
  {
    id: 'dir-industrial', name: '极简水泥灰', summary: '暗调微水泥墙面。', recommended: false,
    recommendationReason: '冷色调氛围。', spaceType: '办公区', desktop: '微水泥台面',
    palette: ['#3A3A3C', '#2C2C2E'], lightingSummary: '顶部灯条。', compositionSummary: '居中透视。',
    decorationSummary: '无冗余背景。', risks: ['阴影稍微沉闷。']
  },
  {
    id: 'dir-retro', name: '复古咖啡厅', summary: '暗胡桃木配暖色台灯。', recommended: false,
    recommendationReason: '温暖质感。', spaceType: '咖啡厅', desktop: '深色胡桃木桌面',
    palette: ['#4A3B32', '#8B5A2B'], lightingSummary: '台灯点光源。', compositionSummary: '对角线。',
    decorationSummary: '虚化远景。', risks: ['胡桃木偏暗。']
  }
];

const VALID_MOCK_RECIPE = {
  scene: {
    spaceType: 'study', wallMaterial: 'concrete', desktopMaterial: 'wood',
    desktopTone: 'light oak', backgroundBrightness: 'medium_light',
    style: 'nordic minimalist', palette: ['#FFFFFF', '#ECEFF1'], furnitureDensity: 'low'
  },
  composition: {
    purpose: 'hero', productCount: 1, productPosition: 'center', productWidthPercent: 50,
    copySpace: 'none', cameraView: 'front_left', cameraHeight: 'near_eye_level',
    framing: 'medium', perspectiveStrength: 'low', desktopVisiblePercent: 30
  },
  lighting: {
    sourceType: 'window', sourcePosition: 'upper_left', temperature: 'neutral',
    softness: 'soft', contrast: 'low', shadowDirection: 'rear_right'
  },
  decoration: {
    density: 'minimal', allowed: ['small succulent'], forbiddenNearProduct: []
  },
  output: {
    aspectRatio: '1:1', resolutionLabel: '2K', exclude: ['product', 'person', 'hands', 'text', 'logo', 'watermark']
  }
};

const VALID_PAYLOAD = {
  productAssetId: 'asset-123',
  productProfileSnapshot: VALID_PROFILE,
  guidedQuestions: VALID_GUIDED_QUESTIONS,
  guidedAnswers: VALID_ANSWERS,
  sceneDirections: VALID_DIRECTIONS,
  selectedDirectionId: 'dir-nordic'
};

describe('Phase 4-A: SceneRecipe Server-side Creation', () => {
  let mockClient: MockGeminiClient;
  
  beforeEach(() => {
    mockClient = new MockGeminiClient();
    const service = new GeminiScenePlannerService(mockClient as any);
    app.set('scenePlannerService', service);
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_ANALYSIS_MODEL = 'gemini-3.5-flash';
  });

  afterEach(() => {
    vi.restoreAllMocks(); mockClient.generateContent.mockReset();
  });

  it('1. selectedDirectionId 不存在时被拒绝', async () => {
    const res = await request(app).post('/api/ai/scene-recipe').send({
      ...VALID_PAYLOAD,
      selectedDirectionId: 'dir-non-existent'
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SELECTED_ID');
  });

  it('2. sceneDirections 不是 3 个时被拒绝', async () => {
    const res = await request(app).post('/api/ai/scene-recipe').send({
      ...VALID_PAYLOAD,
      sceneDirections: VALID_DIRECTIONS.slice(0, 2)
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_DIRECTIONS_COUNT');
  });

  it('3. 方向 ID 重复时被拒绝', async () => {
    const badDirections = [...VALID_DIRECTIONS];
    badDirections[1] = { ...badDirections[0] };
    const res = await request(app).post('/api/ai/scene-recipe').send({
      ...VALID_PAYLOAD,
      sceneDirections: badDirections
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_DIRECTION_ID');
  });

  it('4. recommended 不是严格一个时被拒绝', async () => {
    const badDirections = VALID_DIRECTIONS.map(d => ({ ...d, recommended: true }));
    const res = await request(app).post('/api/ai/scene-recipe').send({
      ...VALID_PAYLOAD,
      sceneDirections: badDirections
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_RECOMMENDED');
  });

  it('5. 缺 guidedQuestions 时被拒绝，且 Gemini 调用为 0', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as any).guidedQuestions;
    const res = await request(app).post('/api/ai/scene-recipe').send(payload);
    expect(res.status).toBe(400);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(0);
  });

  it('6. 缺 productAssetId 时被拒绝，且 Gemini 调用为 0', async () => {
    const payload = { ...VALID_PAYLOAD };
    delete (payload as any).productAssetId;
    const res = await request(app).post('/api/ai/scene-recipe').send(payload);
    expect(res.status).toBe(400);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(0);
  });

  it('7. 完整 CreateRecipeInputSchema 门禁测试', async () => {
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productAssetId: 123, // invalid type
      productProfileSnapshot: 'invalid-profile'
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_REQUEST_BODY');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(0);
  });

  it('8. 非法枚举类型第一次触发 Repair，第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, backgroundBrightness: 'super_bright' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });

    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('9. 非法枚举类型连续两次失败返回 GEMINI_RECIPE_PARSE_FAILED', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, backgroundBrightness: 'super_bright' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, backgroundBrightness: 'ultra_bright' } }) });

    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_RECIPE_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('10. 第一次 JSON 格式非法、第二次合法时成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: 'Not valid JSON' })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });

    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('11. 连续两次 JSON 格式非法时返回 GEMINI_RECIPE_PARSE_FAILED', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: 'Not valid JSON' })
      .mockResolvedValueOnce({ text: 'Still not valid JSON' });

    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_RECIPE_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('12. productWidthPercent 小于 1 被拒绝并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, productWidthPercent: 0 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('13. productWidthPercent 大于 100 被拒绝并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, productWidthPercent: 101 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('14. desktopVisiblePercent 小于 0 或大于 100 连续两次被拒绝', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, desktopVisiblePercent: -1 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, desktopVisiblePercent: 101 } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_RECIPE_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('15. productCount 为小数、0 或负数被拒绝并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, productCount: 1.5 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('16. exclude 缺少任意一个必选类别时被拒绝并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, output: { ...VALID_MOCK_RECIPE.output, exclude: ['person'] } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('17. exclude 六类完整时通过', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it('18. Base64 data URI 被拦截并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'data:image/png;base64,iVBORw0KGgo' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('19. blob: 被拦截并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'blob:http://localhost/123' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('20. file:// 或本地绝对路径被拦截并在第二次连续失败', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'file:///etc/passwd' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'C:\\Windows\\System32' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_RECIPE_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('21. localhost 或 127.0.0.1 被拦截并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'http://127.0.0.1:3000' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('22. 第一次敏感内容非法、第二次合法时成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '/var/log/syslog' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('23. 连续两次敏感内容非法时返回 GEMINI_RECIPE_PARSE_FAILED', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '/var/log/syslog' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '/var/log/syslog' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_RECIPE_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('24. 合法普通中文、颜色值和非敏感文本不被误判', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '原木质感，自然光，#FFFFFF' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it('25. sk-... Token 被拦截并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('26. Authorization: Bearer Token 被拦截并在第二次成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('27. RealAdapter 执行客户端 Zod 二次校验', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      text: async () => JSON.stringify({ ...VALID_MOCK_RECIPE, schemaVersion: '2.0', recipeId: 'rec-123', version: 1, productAssetId: 'asset-123', selectedDirectionId: 'dir-nordic', task: { operation: 'generate_empty_scene_background', productRole: 'analysis_and_spatial_reference_only', backgroundOnly: true }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }) // invalid schemaVersion in root SceneRecipeSchema
    });
    global.fetch = fetchMock;

    const adapter = new RealAdapter();
    await expect(adapter.createSceneRecipe({
      productAssetId: VALID_PROFILE.productAssetId as any,
      productProfileSnapshot: VALID_PROFILE as any,
      guidedQuestions: VALID_GUIDED_QUESTIONS as any,
      guidedAnswers: VALID_ANSWERS as any,
      sceneDirections: VALID_DIRECTIONS as any,
      selectedDirectionId: 'dir-nordic'
    })).rejects.toThrow('服务端创建 SceneRecipe 校验失败');

    global.fetch = originalFetch;
  });

  it('28. 旧 productProfile 请求被拒绝，且 Gemini 调用为 0', async () => {
    const badPayload = {
      productAssetId: 'asset-123',
      productProfile: VALID_PROFILE, // using old field name
      guidedQuestions: VALID_GUIDED_QUESTIONS,
      guidedAnswers: VALID_ANSWERS,
      sceneDirections: VALID_DIRECTIONS,
      selectedDirectionId: 'dir-nordic'
    };
    const res = await request(app).post('/api/ai/scene-recipe').send(badPayload);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_REQUEST_BODY');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(0);
  });

  it('29. 缺 guidedQuestions 被拒绝，且 Gemini 调用为 0', async () => {
    const badPayload = { ...VALID_PAYLOAD };
    delete (badPayload as any).guidedQuestions;
    const res = await request(app).post('/api/ai/scene-recipe').send(badPayload);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_REQUEST_BODY');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(0);
  });

  it('30. 缺 productAssetId 被拒绝，且 Gemini 调用为 0', async () => {
    const badPayload = { ...VALID_PAYLOAD };
    delete (badPayload as any).productAssetId;
    const res = await request(app).post('/api/ai/scene-recipe').send(badPayload);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_REQUEST_BODY');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(0);
  });

  it('31. firstChars.includes 空字符串 Bug 不再存在；普通纯文本/JSON错误/缺text的Mock处理安全', async () => {
    const originalFetch = global.fetch;
    const adapter = new RealAdapter();

    // 1. HTML fallback trigger
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => '<!doctype html><html><body>Error</body></html>'
    });
    await expect(adapter.createSceneRecipe({
      productAssetId: VALID_PROFILE.productAssetId as any,
      productProfileSnapshot: VALID_PROFILE as any,
      guidedQuestions: VALID_GUIDED_QUESTIONS as any,
      guidedAnswers: VALID_ANSWERS as any,
      sceneDirections: VALID_DIRECTIONS as any,
      selectedDirectionId: 'dir-nordic'
    })).rejects.toThrow('网络拦截或服务端异常：请求接口返回了 HTML 页面');

    // 2. Pure text error (does not misidentify as HTML)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'text/plain' },
      text: async () => 'Overloaded'
    });
    try {
      await adapter.createSceneRecipe({
        productAssetId: VALID_PROFILE.productAssetId as any,
        productProfileSnapshot: VALID_PROFILE as any,
        guidedQuestions: VALID_GUIDED_QUESTIONS as any,
        guidedAnswers: VALID_ANSWERS as any,
        sceneDirections: VALID_DIRECTIONS as any,
        selectedDirectionId: 'dir-nordic'
      });
      expect.fail('Should fail');
    } catch (err: any) {
      expect(err.message).toContain('请求失败，状态码: 500');
    }

    // 3. JSON error structure parsing
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ code: 'BAD_REQUEST_ERR', message: '参数格式错乱', retryable: false })
    });
    try {
      await adapter.createSceneRecipe({
        productAssetId: VALID_PROFILE.productAssetId as any,
        productProfileSnapshot: VALID_PROFILE as any,
        guidedQuestions: VALID_GUIDED_QUESTIONS as any,
        guidedAnswers: VALID_ANSWERS as any,
        sceneDirections: VALID_DIRECTIONS as any,
        selectedDirectionId: 'dir-nordic'
      });
      expect.fail('Should fail');
    } catch (err: any) {
      expect(err.message).toBe('参数格式错乱');
      expect(err.code).toBe('BAD_REQUEST_ERR');
    }

    // 4. Missing response.text fallback to json
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        ...VALID_MOCK_RECIPE,
        productProfileSnapshot: VALID_PROFILE,
        guidedAnswers: VALID_ANSWERS,
        schemaVersion: '1.0',
        recipeId: 'rec-123',
        version: 1,
        productAssetId: 'asset-123',
        selectedDirectionId: 'dir-nordic',
        task: {
          operation: 'generate_empty_scene_background',
          productRole: 'analysis_and_spatial_reference_only',
          backgroundOnly: true
        },
        decoration: {
          ...VALID_MOCK_RECIPE.decoration,
          foregroundOcclusion: false
        },
        output: {
          ...VALID_MOCK_RECIPE.output,
          realism: 'real_commercial_interior_photography'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
    const res = await adapter.createSceneRecipe({
      productAssetId: VALID_PROFILE.productAssetId as any,
      productProfileSnapshot: VALID_PROFILE as any,
      guidedQuestions: VALID_GUIDED_QUESTIONS as any,
      guidedAnswers: VALID_ANSWERS as any,
      sceneDirections: VALID_DIRECTIONS as any,
      selectedDirectionId: 'dir-nordic'
    });
    expect(res.recipeId).toBe('rec-123');

    global.fetch = originalFetch;
  });

  it('32-34. RecipeBody 不要求 realism 与 foregroundOcclusion 且服务端正确注入固定值', async () => {
    // Mock generateContent returning a valid recipe without realism and foregroundOcclusion
    mockClient.generateContent.mockResolvedValue({
      text: JSON.stringify(VALID_MOCK_RECIPE) // This object has decoration without foregroundOcclusion, and output without realism
    });

    const res = await request(app).post('/api/ai/scene-recipe').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);

    // Verify injected fields exist and have correct fixed values
    expect(res.body.decoration.foregroundOcclusion).toBe(false);
    expect(res.body.output.realism).toBe('real_commercial_interior_photography');
  });
});
