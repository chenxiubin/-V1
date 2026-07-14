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
  schemaVersion: '1.0',
  version: 1,
  productAssetId: 'asset-123',
  selectedDirectionId: 'dir-nordic',
  task: {
    operation: 'generate_empty_scene_background',
    productRole: 'analysis_and_spatial_reference_only',
    backgroundOnly: true
  },
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

describe('Phase 4-A: SceneRecipe Server-side Creation', () => {
  let mockClient: MockGeminiClient;
  
  beforeEach(() => {
    mockClient = new MockGeminiClient();
    const service = new GeminiScenePlannerService(mockClient as any);
    app.set('scenePlannerService', service);
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks(); mockClient.generateContent.mockReset();
  });

  it('1. selectedDirectionId 不存在时被拒绝', async () => {
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE,
      guidedAnswers: VALID_ANSWERS,
      sceneDirections: VALID_DIRECTIONS,
      selectedDirectionId: 'dir-non-existent'
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SELECTED_ID');
  });

  it('2. sceneDirections 不是 3 个时被拒绝', async () => {
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE,
      guidedAnswers: VALID_ANSWERS,
      sceneDirections: VALID_DIRECTIONS.slice(0, 2),
      selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_DIRECTIONS_COUNT');
  });

  it('3. 方向 ID 重复时被拒绝', async () => {
    const badDirections = [...VALID_DIRECTIONS];
    badDirections[1] = { ...badDirections[0] };
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE,
      guidedAnswers: VALID_ANSWERS,
      sceneDirections: badDirections,
      selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_DIRECTION_ID');
  });

  it('4. recommended 不是严格一个时被拒绝', async () => {
    const badDirections = VALID_DIRECTIONS.map(d => ({ ...d, recommended: true }));
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE,
      guidedAnswers: VALID_ANSWERS,
      sceneDirections: badDirections,
      selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_RECOMMENDED');
  });

  it('11. 第一次非法、第二次合法时成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, productCount: -1 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });

    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE,
      guidedAnswers: VALID_ANSWERS,
      sceneDirections: VALID_DIRECTIONS,
      selectedDirectionId: 'dir-nordic'
    });
    
    expect(res.status).toBe(200);
    expect(res.body.recipeId).toBeDefined();
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('12. 连续两次非法时返回安全解析错误', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify({ invalid: 'yes' }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE,
      guidedAnswers: VALID_ANSWERS,
      sceneDirections: VALID_DIRECTIONS,
      selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_PARSE_FAILED');
  });

  it('13. RealAdapter 执行客户端 Zod 二次校验', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...VALID_MOCK_RECIPE, schemaVersion: '2.0' }) // Invalid schemaVersion
    });
    global.fetch = fetchMock;

    const adapter = new RealAdapter();
    await expect(adapter.createSceneRecipe({
      productAssetId: VALID_PROFILE.productAssetId,
      productProfileSnapshot: VALID_PROFILE as any,
      guidedQuestions: [],
      guidedAnswers: VALID_ANSWERS as any,
      sceneDirections: VALID_DIRECTIONS as any,
      selectedDirectionId: 'dir-nordic'
    })).rejects.toThrow('服务端创建 SceneRecipe 校验失败');

    global.fetch = originalFetch;
  });

  it('14. RealAdapter 失败时不回退 Mock', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network Error'));
    global.fetch = fetchMock;

    const adapter = new RealAdapter();
    await expect(adapter.createSceneRecipe({
      productAssetId: VALID_PROFILE.productAssetId,
      productProfileSnapshot: VALID_PROFILE as any,
      guidedQuestions: [],
      guidedAnswers: VALID_ANSWERS as any,
      sceneDirections: VALID_DIRECTIONS as any,
      selectedDirectionId: 'dir-nordic'
    })).rejects.toThrow('Network Error');

    global.fetch = originalFetch;
  });

  it('15. 创建 Recipe 不调用 analyzeProduct', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
         const d = { ...VALID_MOCK_RECIPE };
         return {
           schemaVersion: '1.0',
           recipeId: 'rec-1',
           version: 1,
           productAssetId: 'asset-123',
           productProfileSnapshot: VALID_PROFILE,
           guidedAnswers: VALID_ANSWERS,
           selectedDirectionId: 'dir-nordic',
           task: {
             operation: 'generate_empty_scene_background',
             productRole: 'analysis_and_spatial_reference_only',
             backgroundOnly: true,
           },
           scene: d.scene,
           composition: d.composition,
           lighting: d.lighting,
           decoration: { ...d.decoration, foregroundOcclusion: false },
           output: { ...d.output, realism: 'real_commercial_interior_photography' },
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
         }
      }
    });
    global.fetch = fetchMock;

    const adapter = new RealAdapter();
    await adapter.createSceneRecipe({
      productAssetId: VALID_PROFILE.productAssetId,
      productProfileSnapshot: VALID_PROFILE as any,
      guidedQuestions: [],
      guidedAnswers: VALID_ANSWERS as any,
      sceneDirections: VALID_DIRECTIONS as any,
      selectedDirectionId: 'dir-nordic'
    });

    // analyzeProduct URL should not be called
    expect(fetchMock.mock.calls.some((c: any) => c[0] === '/api/ai/analyze-product')).toBe(false);
    expect(fetchMock.mock.calls.some((c: any) => c[0] === '/api/ai/guided-questions')).toBe(false);
    expect(fetchMock.mock.calls.some((c: any) => c[0] === '/api/ai/scene-directions')).toBe(false);

    global.fetch = originalFetch;
  });

});

describe('Phase 4-A: SceneRecipe Server-side Creation (Additional validations)', () => {
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = { generateContent: vi.fn() };
    const service = new GeminiScenePlannerService(mockClient as any);
    app.set('scenePlannerService', service);
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks(); mockClient.generateContent.mockReset();
  });

  it('5. scene.spaceType 缺失时触发修复并重试（两次调用）', async () => {
    const invalidRecipe = {
      scene: { wallMaterial: 'concrete', desktopMaterial: 'wood', desktopTone: 'light oak', backgroundBrightness: 'medium_light', style: 'nordic minimalist', palette: ['#FFFFFF'], furnitureDensity: 'low' }, // spaceType is missing
      composition: { purpose: 'hero', productCount: 1, productPosition: 'center', productWidthPercent: 50, copySpace: 'none', cameraView: 'front_left', cameraHeight: 'near_eye_level', framing: 'medium', perspectiveStrength: 'low', desktopVisiblePercent: 30 },
      lighting: { sourceType: 'window', sourcePosition: 'upper_left', temperature: 'neutral', softness: 'soft', contrast: 'low', shadowDirection: 'rear_right' },
      decoration: { density: 'minimal', allowed: ['small succulent'], forbiddenNearProduct: [], foregroundOcclusion: false },
      output: { aspectRatio: '1:1', resolutionLabel: '2K', exclude: ['product', 'person', 'hands', 'text', 'logo', 'watermark'] }
    };

    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(invalidRecipe) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });

    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('6. RecipeBody 只有业务字段也能成功创建完整 SceneRecipe，服务端完成所有注入', async () => {
    const pureBusinessRecipe = {
      scene: { spaceType: 'study', wallMaterial: 'concrete', desktopMaterial: 'wood', desktopTone: 'light oak', backgroundBrightness: 'medium_light', style: 'nordic minimalist', palette: ['#FFFFFF', '#ECEFF1'], furnitureDensity: 'low' },
      composition: { purpose: 'hero', productCount: 1, productPosition: 'center', productWidthPercent: 50, copySpace: 'none', cameraView: 'front_left', cameraHeight: 'near_eye_level', framing: 'medium', perspectiveStrength: 'low', desktopVisiblePercent: 30 },
      lighting: { sourceType: 'window', sourcePosition: 'upper_left', temperature: 'neutral', softness: 'soft', contrast: 'low', shadowDirection: 'rear_right' },
      decoration: { density: 'minimal', allowed: ['small succulent'], forbiddenNearProduct: [] },
      output: { aspectRatio: '1:1', resolutionLabel: '2K', exclude: ['product', 'person', 'hands', 'text', 'logo', 'watermark'] }
    };

    mockClient.generateContent.mockResolvedValueOnce({ text: JSON.stringify(pureBusinessRecipe) });

    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });

    expect(res.status).toBe(200);
    // Verify server-side injection
    expect(res.body.schemaVersion).toBe('1.0');
    expect(res.body.version).toBe(1);
    expect(res.body.productAssetId).toBe(VALID_PROFILE.productAssetId);
    expect(res.body.selectedDirectionId).toBe('dir-nordic');
    expect(res.body.task).toEqual({
      operation: 'generate_empty_scene_background',
      productRole: 'analysis_and_spatial_reference_only',
      backgroundOnly: true
    });
    expect(res.body.recipeId).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
    expect(mockClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it('7. 模型额外返回 productAssetId 等固定字段时直接忽略/覆写，确保由服务端注入且防篡改', async () => {
    const pollutedRecipe = {
      schemaVersion: '9.9',
      version: 99,
      productAssetId: 'malicious-asset-id',
      selectedDirectionId: 'malicious-direction',
      task: { operation: 'malicious_op', productRole: 'malicious_role', backgroundOnly: false },
      scene: { spaceType: 'study', wallMaterial: 'concrete', desktopMaterial: 'wood', desktopTone: 'light oak', backgroundBrightness: 'medium_light', style: 'nordic minimalist', palette: ['#FFFFFF', '#ECEFF1'], furnitureDensity: 'low' },
      composition: { purpose: 'hero', productCount: 1, productPosition: 'center', productWidthPercent: 50, copySpace: 'none', cameraView: 'front_left', cameraHeight: 'near_eye_level', framing: 'medium', perspectiveStrength: 'low', desktopVisiblePercent: 30 },
      lighting: { sourceType: 'window', sourcePosition: 'upper_left', temperature: 'neutral', softness: 'soft', contrast: 'low', shadowDirection: 'rear_right' },
      decoration: { density: 'minimal', allowed: ['small succulent'], forbiddenNearProduct: [] },
      output: { aspectRatio: '1:1', resolutionLabel: '2K', exclude: ['product', 'person', 'hands', 'text', 'logo', 'watermark'] }
    };

    mockClient.generateContent.mockResolvedValueOnce({ text: JSON.stringify(pollutedRecipe) });

    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });

    expect(res.status).toBe(200);
    // Verify that model-tampered fields are ignored/overwritten by the server's authoritative ones
    expect(res.body.schemaVersion).toBe('1.0');
    expect(res.body.version).toBe(1);
    expect(res.body.productAssetId).toBe(VALID_PROFILE.productAssetId);
    expect(res.body.selectedDirectionId).toBe('dir-nordic');
    expect(res.body.task).toEqual({
      operation: 'generate_empty_scene_background',
      productRole: 'analysis_and_spatial_reference_only',
      backgroundOnly: true
    });
  });

  it('10. foregroundOcclusion=true 时被拒绝并触发修复', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, decoration: { ...VALID_MOCK_RECIPE.decoration, foregroundOcclusion: true } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });

    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });
  
  it('19. 相同输入不要求 recipeId 相同，但 Recipe 内容必须符合当前选择', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify(VALID_MOCK_RECIPE) });

    const res1 = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    const res2 = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    
    console.log('Error 19:', res1.body);
    expect(res1.body.recipeId).not.toBe(res2.body.recipeId);
    expect(res1.body.selectedDirectionId).toBe('dir-nordic');
    expect(res2.body.selectedDirectionId).toBe('dir-nordic');
  });

  it('20. 输出不含 Key、Base64、对象 URL 或内部路径', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify(VALID_MOCK_RECIPE) });

    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    
    const str = JSON.stringify(res.body);
    expect(str).not.toContain('GEMINI_API_KEY');
    expect(str).not.toContain('data:image/jpeg;base64');
    expect(str).not.toContain('blob:http');
    expect(str).not.toContain('/Users/');
    expect(str).not.toContain('/home/');
  });

  it('21. productWidthPercent 小于 1 被拒绝', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, productWidthPercent: 0 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('22. productWidthPercent 大于 100 被拒绝', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, productWidthPercent: 101 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('23. desktopVisiblePercent 小于 0 或大于 100 被拒绝', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, desktopVisiblePercent: -1 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, desktopVisiblePercent: 101 } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('24. productCount 为小数、0 或负数被拒绝', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, composition: { ...VALID_MOCK_RECIPE.composition, productCount: 1.5 } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('25. exclude 只包含 person 时被拒绝', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, output: { ...VALID_MOCK_RECIPE.output, exclude: ['person'] } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('26. exclude 缺少任意一个必选类别时被拒绝', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, output: { ...VALID_MOCK_RECIPE.output, exclude: ['product', 'person', 'hands', 'text', 'logo'] } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('27. exclude 六类完整时通过', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it('28. Base64 data URI 被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'data:image/png;base64,iVBORw0KGgo' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('29. blob: 被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'blob:http://localhost/123' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('30. file:// 或本地绝对路径被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'file:///etc/passwd' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'C:\\Windows\\System32' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(500);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('31. localhost 或 127.0.0.1 被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'http://127.0.0.1:3000' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('32. 第一次敏感内容非法、第二次合法时成功', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '/var/log/syslog' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('33. 连续两次敏感内容非法时返回 GEMINI_PARSE_FAILED', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '/var/log/syslog' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '/var/log/syslog' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('34. 合法普通中文、颜色值和非敏感文本不被误判', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: '原木质感，自然光，#FFFFFF' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it('35. AIza... 形式的 Google Key 被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'AIzaSyB-abcdefghijklmnopqrstuvwxyz1234567' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('36. sk-... Token 被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('37. api_key=真实长值被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'api_key=abcdefghijklmnopqrstuvwxyz1234' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('38. Authorization: Bearer Token 被拦截', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('39. 普通文字“API Key 仅存于服务端”不误判', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'API Key 仅存于服务端' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it('40. exclude 只有“不要出现手机”时，仍判定缺少手部类别', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, output: { ...VALID_MOCK_RECIPE.output, exclude: ['product', 'person', 'text', 'logo', 'watermark', '不要出现手机'] } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('41. exclude 包含“不要出现人物手部”时通过手部类别', async () => {
    mockClient.generateContent.mockResolvedValue({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, output: { ...VALID_MOCK_RECIPE.output, exclude: ['product', 'person', 'text', 'logo', 'watermark', '不要出现人物手部'] } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it('42. 第一次凭证非法、第二次合法时严格调用 2 次', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_MOCK_RECIPE) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(200);
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });

  it('43. 连续两次非法时严格调用 2 次并返回 GEMINI_PARSE_FAILED', async () => {
    mockClient.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef' } }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ ...VALID_MOCK_RECIPE, scene: { ...VALID_MOCK_RECIPE.scene, style: 'sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef' } }) });
    const res = await request(app).post('/api/ai/scene-recipe').send({
      productProfile: VALID_PROFILE, guidedAnswers: VALID_ANSWERS, sceneDirections: VALID_DIRECTIONS, selectedDirectionId: 'dir-nordic'
    });
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('GEMINI_PARSE_FAILED');
    expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
  });
});
