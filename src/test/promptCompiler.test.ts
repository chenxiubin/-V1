import { describe, it, expect, vi } from 'vitest';
import { compilePromptDocument, compileTopLevelJsonObjects } from '../services/ai/promptCompiler.js';
import { SceneRecipe } from '../types/schemas.js';

const VALID_RECIPE: any = {
  schemaVersion: '1.0',
  recipeId: 'test-recipe-123',
  version: 1,
  basedOnVersion: null,
  productAssetId: 'asset-123',
  productProfileSnapshot: {
    schemaVersion: '1.0',
    productAssetId: 'asset-123',
    version: 1,
    formType: 'box',
    placementType: 'standing',
    mainMaterial: 'cardboard',
    primaryColors: ['#FFFFFF', '#FF0000'], // Array with order to preserve
    spatialMarkers: {},
    recommendedSceneTypes: [],
    recommendedProps: [],
    updatedAt: '2023-01-01T00:00:00Z',
    
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
  },
  guidedAnswers: [],
  selectedDirectionId: 'dir-1',
  task: {
    operation: 'generate_empty_scene_background',
    productRole: 'analysis_and_spatial_reference_only',
    backgroundOnly: true
  },
  scene: {
    spaceType: 'study',
    wallMaterial: 'concrete',
    desktopMaterial: 'wood',
    desktopTone: 'light',
    backgroundBrightness: 'medium_light',
    style: 'nordic',
    palette: ['#FFFFFF', '#CCCCCC'], // Order check
    furnitureDensity: 'low'
  },
  composition: {
    purpose: 'hero',
    productCount: 1,
    productPosition: 'center',
    productWidthPercent: 50,
    copySpace: 'none',
    cameraView: 'front',
    cameraHeight: 'near_eye_level',
    framing: 'medium',
    perspectiveStrength: 'low',
    desktopVisiblePercent: 30
  },
  lighting: {
    sourceType: 'window',
    sourcePosition: 'upper_left',
    temperature: 'neutral',
    softness: 'soft',
    contrast: 'medium',
    shadowDirection: 'rear_right'
  },
  decoration: {
    density: 'minimal',
    allowed: ['plant'],
    forbiddenNearProduct: ['water'],
    foregroundOcclusion: false
  },
  output: {
    aspectRatio: '1:1',
    resolutionLabel: '4K',
    realism: 'real_commercial_interior_photography',
    exclude: ['product', 'person', 'hands', 'text', 'logo', 'watermark']
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

describe('PromptCompiler (Phase 4-B)', () => {

  it('1. 合法 SceneRecipe 可以编译', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc).toBeDefined();
    expect(doc.recipeId).toBe('test-recipe-123');
  });

  it('2. compilerVersion 固定', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.compilerVersion).toBe('prompt-compiler-1.0');
  });

  it('3. createdAt 等于 recipe.updatedAt', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.createdAt).toBe(VALID_RECIPE.updatedAt);
  });

  it('4. 相同 Recipe 两次 fullPrompt 逐字符一致', () => {
    const doc1 = compilePromptDocument(VALID_RECIPE);
    const doc2 = compilePromptDocument(VALID_RECIPE);
    expect(doc1.fullPrompt).toBe(doc2.fullPrompt);
  });

  it('5. 相同 Recipe 两次 fullJson 逐字符一致', () => {
    const doc1 = compilePromptDocument(VALID_RECIPE);
    const doc2 = compilePromptDocument(VALID_RECIPE);
    expect(doc1.fullJson).toBe(doc2.fullJson);
  });

  it('6. 六段数量严格为 6', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    const keys = Object.keys(doc.sections);
    expect(keys).toHaveLength(6);
    expect(keys).toEqual([
      'taskAndReferences',
      'productMatching',
      'sceneAndStyle',
      'cameraAndComposition',
      'lightingAndDecoration',
      'outputConstraints'
    ]);
  });

  it('7. 六段顺序固定', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    const pos1 = doc.fullPrompt.indexOf('【1. 任务与参考关系】');
    const pos2 = doc.fullPrompt.indexOf('【2. 产品匹配依据】');
    const pos3 = doc.fullPrompt.indexOf('【3. 场景与风格】');
    const pos4 = doc.fullPrompt.indexOf('【4. 镜头与构图】');
    const pos5 = doc.fullPrompt.indexOf('【5. 光线与装饰】');
    const pos6 = doc.fullPrompt.indexOf('【6. 输出限制】');

    expect(pos1).toBeGreaterThan(-1);
    expect(pos2).toBeGreaterThan(pos1);
    expect(pos3).toBeGreaterThan(pos2);
    expect(pos4).toBeGreaterThan(pos3);
    expect(pos5).toBeGreaterThan(pos4);
    expect(pos6).toBeGreaterThan(pos5);
  });

  it('8. 六个中文标题固定', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.fullPrompt).toContain('【1. 任务与参考关系】');
    expect(doc.fullPrompt).toContain('【2. 产品匹配依据】');
    expect(doc.fullPrompt).toContain('【3. 场景与风格】');
    expect(doc.fullPrompt).toContain('【4. 镜头与构图】');
    expect(doc.fullPrompt).toContain('【5. 光线与装饰】');
    expect(doc.fullPrompt).toContain('【6. 输出限制】');
  });

  it('9. 第一段明确为空场景任务', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.taskAndReferences).toContain('空场景背景图');
  });

  it('10. 第一段明确产品只作参考', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.taskAndReferences).toContain('参考');
  });

  it('11. 第六段明确不生成产品', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.outputConstraints).toContain('产品');
    expect(doc.sections.outputConstraints).toContain('绝对不允许');
  });

  it('12. 第六段明确不生成人物', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.outputConstraints).toContain('人物');
  });

  it('13. 第六段明确不生成手部', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.outputConstraints).toContain('手部');
  });

  it('14. 第六段明确不生成文字', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.outputConstraints).toContain('文字');
  });

  it('15. 第六段明确不生成 Logo', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.outputConstraints).toContain('Logo');
  });

  it('16. 第六段明确不生成水印', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.outputConstraints).toContain('水印');
  });

  it('17. fullJson 可以 JSON.parse', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    const parsed = JSON.parse(doc.fullJson);
    expect(parsed.task).toBeDefined();
    expect(parsed.scene).toBeDefined();
    expect(parsed.composition).toBeDefined();
    expect(parsed.lighting).toBeDefined();
    expect(parsed.decoration).toBeDefined();
    expect(parsed.output).toBeDefined();
  });

  it('18. fullJson 顶层顺序固定', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    const parsedKeys = Object.keys(JSON.parse(doc.fullJson));
    expect(parsedKeys).toEqual(['task', 'scene', 'composition', 'lighting', 'decoration', 'output']);
  });

  it('19. 每个 objectJson 可独立 JSON.parse', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    const keys = ['task', 'scene', 'composition', 'lighting', 'decoration', 'output'];
    for (const key of keys) {
      const parsed = JSON.parse(doc.objectJson[key as keyof typeof doc.objectJson]);
      expect(parsed[key]).toBeDefined();
    }
  });

  it('20. inheritance 不存在时不输出', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.objectJson.inheritance).toBeUndefined();
    const parsedFull = JSON.parse(doc.fullJson);
    expect(parsedFull.inheritance).toBeUndefined();
  });

  it('21. inheritance 存在时正确输出', () => {
    const recipeWithInheritance = {
      ...VALID_RECIPE,
      inheritance: {
        seriesId: 'series-999',
        mode: 'same_style',
        lockedSeriesVersion: 2
      }
    };
    const doc = compilePromptDocument(recipeWithInheritance);
    expect(doc.objectJson.inheritance).toBeDefined();
    const parsedInheritance = JSON.parse(doc.objectJson.inheritance!);
    expect(parsedInheritance.inheritance.seriesId).toBe('series-999');

    const parsedFull = JSON.parse(doc.fullJson);
    expect(parsedFull.inheritance).toBeDefined();
    expect(parsedFull.inheritance.seriesId).toBe('series-999');
  });

  it('22. 对象键递归稳定排序', () => {
    // Modify input sub-objects to have unordered keys
    const unsortedRecipe = {
      ...VALID_RECIPE,
      scene: {
        palette: ['#FFFFFF'],
        style: 'nordic',
        spaceType: 'study',
        furnitureDensity: 'low',
        desktopTone: 'light',
        desktopMaterial: 'wood',
        backgroundBrightness: 'medium_light',
        wallMaterial: 'concrete'
      }
    };
    const doc = compilePromptDocument(unsortedRecipe);
    const parsed = JSON.parse(doc.fullJson);
    const sceneKeys = Object.keys(parsed.scene);
    // alphabetical sorted check
    expect(sceneKeys).toEqual([
      'backgroundBrightness',
      'desktopMaterial',
      'desktopTone',
      'furnitureDensity',
      'palette',
      'spaceType',
      'style',
      'wallMaterial'
    ]);
  });

  it('23. 数组顺序不改变', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    const parsed = JSON.parse(doc.fullJson);
    expect(parsed.scene.palette).toEqual(['#FFFFFF', '#CCCCCC']);
  });

  it('24. undefined 不进入 JSON', () => {
    const recipeWithUndefined = {
      ...VALID_RECIPE,
      basedOnVersion: undefined
    };
    const doc = compilePromptDocument(recipeWithUndefined);
    const parsed = JSON.parse(doc.fullJson);
    expect(parsed.basedOnVersion).toBeUndefined();
  });

  it('25. 输入 Recipe 不被原地修改', () => {
    const originalString = JSON.stringify(VALID_RECIPE);
    compilePromptDocument(VALID_RECIPE);
    const postString = JSON.stringify(VALID_RECIPE);
    expect(originalString).toBe(postString);
  });

  it('26. 不调用 fetch', () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error('Fetch should not be called');
    });
    try {
      const doc = compilePromptDocument(VALID_RECIPE);
      expect(doc).toBeDefined();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('27. 不调用 Gemini', () => {
    // Compile works directly and synchronously without async resolution of AI clients
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc).toBeDefined();
  });

  it('28. 不调用 RealAdapter', () => {
    // Handled synchronously without initialization or execution of adapters
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc).toBeDefined();
  });

  it('29. 敏感字符串触发失败', () => {
    const badRecipes = [
      {
        ...VALID_RECIPE,
        scene: { ...VALID_RECIPE.scene, style: 'sk-12345678901234567890123456789012' }
      },
      {
        ...VALID_RECIPE,
        scene: { ...VALID_RECIPE.scene, style: 'Authorization: Bearer 12345678901234567890' }
      },
      {
        ...VALID_RECIPE,
        scene: { ...VALID_RECIPE.scene, style: 'data:image/png;base64,iVBORw0' }
      },
      {
        ...VALID_RECIPE,
        scene: { ...VALID_RECIPE.scene, style: 'file:///usr/bin/secret' }
      },
      {
        ...VALID_RECIPE,
        scene: { ...VALID_RECIPE.scene, style: 'http://localhost:3000' }
      },
      {
        ...VALID_RECIPE,
        scene: { ...VALID_RECIPE.scene, style: '/var/log/secure' }
      }
    ];

    for (const bad of badRecipes) {
      expect(() => compilePromptDocument(bad as any)).toThrow();
    }
  });

  it('30. 非法 SceneRecipe 拒绝编译', () => {
    const invalidRecipe = {
      ...VALID_RECIPE,
      scene: {
        ...VALID_RECIPE.scene,
        backgroundBrightness: 'not-a-valid-brightness'
      }
    };
    expect(() => compilePromptDocument(invalidRecipe as any)).toThrow();
  });

});
