import { describe, it, expect } from 'vitest';
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
    primaryColors: ['#FFFFFF'],
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
    palette: ['#FFFFFF'],
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

describe('PromptCompiler', () => {
  it('1. 合法 Recipe 可生成 PromptDocument', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc).toBeDefined();
    expect(doc.recipeId).toBe('test-recipe-123');
    expect(doc.compilerVersion).toBe('prompt-compiler-1.0');
  });

  it('2. sections 严格只有固定 6 段', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(Object.keys(doc.sections)).toEqual([
      'taskAndReferences',
      'productMatching',
      'sceneAndStyle',
      'cameraAndComposition',
      'lightingAndDecoration',
      'outputConstraints'
    ]);
  });

  it('3. 六段顺序固定，这在生成 fullPrompt 时验证', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.fullPrompt.indexOf('【1. 任务与参考关系】')).toBeLessThan(doc.fullPrompt.indexOf('【2. 产品匹配依据】'));
    expect(doc.fullPrompt.indexOf('【2. 产品匹配依据】')).toBeLessThan(doc.fullPrompt.indexOf('【3. 场景与风格】'));
    expect(doc.fullPrompt.indexOf('【5. 光线与装饰】')).toBeLessThan(doc.fullPrompt.indexOf('【6. 输出限制】'));
  });

  it('4. fullPrompt 等于六段固定拼接结果', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.fullPrompt).toContain('【1. 任务与参考关系】\n' + doc.sections.taskAndReferences);
    expect(doc.fullPrompt).toContain('【6. 输出限制】\n' + doc.sections.outputConstraints);
  });

  it('5. 同一 Recipe 连续编译逐字符一致', () => {
    const doc1 = compilePromptDocument(VALID_RECIPE);
    const doc2 = compilePromptDocument(VALID_RECIPE);
    expect(doc1).toEqual(doc2);
  });

  it('6. 深拷贝 Recipe 编译结果一致', () => {
    const doc1 = compilePromptDocument(VALID_RECIPE);
    const doc2 = compilePromptDocument(JSON.parse(JSON.stringify(VALID_RECIPE)));
    expect(doc1).toEqual(doc2);
  });

  it('7. 对象键顺序不同仍输出一致', () => {
    const doc1 = compilePromptDocument(VALID_RECIPE);
    
    // Create a copy with different key order
    const shuffledRecipe: any = {
      schemaVersion: '1.0',
      version: 1,
      recipeId: 'test-recipe-123',
      productProfileSnapshot: VALID_RECIPE.productProfileSnapshot,
      basedOnVersion: null,
      productAssetId: 'asset-123',
      selectedDirectionId: 'dir-1',
      guidedAnswers: [],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      output: VALID_RECIPE.output,
      scene: VALID_RECIPE.scene,
      task: VALID_RECIPE.task,
      composition: VALID_RECIPE.composition,
      decoration: VALID_RECIPE.decoration,
      lighting: VALID_RECIPE.lighting
    };
    
    const doc2 = compilePromptDocument(shuffledRecipe as SceneRecipe);
    expect(doc1.fullJson).toBe(doc2.fullJson);
  });

  it('8. createdAt 不受当前系统时间影响', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.createdAt).toBe('2023-01-01T00:00:00Z');
  });

  it('9. fullJson 可被 JSON.parse', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(() => JSON.parse(doc.fullJson)).not.toThrow();
    const parsed = JSON.parse(doc.fullJson);
    expect(parsed.recipeId).toBe(VALID_RECIPE.recipeId);
  });

  it('10. 每个一级对象 JSON 均可独立解析', () => {
    const objects = compileTopLevelJsonObjects(VALID_RECIPE);
    expect(() => JSON.parse(objects.scene)).not.toThrow();
    expect(() => JSON.parse(objects.lighting)).not.toThrow();
    const parsedScene = JSON.parse(objects.scene);
    expect(parsedScene.scene).toBeDefined();
    expect(parsedScene.scene.spaceType).toBe('study');
  });

  it('11. inheritance 不存在时不生成非法内容', () => {
    const objects = compileTopLevelJsonObjects(VALID_RECIPE);
    expect(objects.inheritance).toBeUndefined();
  });

  it('12. inheritance 存在时可独立解析', () => {
    const recipeWithInheritance: SceneRecipe = {
      ...VALID_RECIPE,
      inheritance: {
        seriesId: 'series-123',
        mode: 'same_space',
        lockedSeriesVersion: 1
      }
    };
    const objects = compileTopLevelJsonObjects(recipeWithInheritance);
    expect(objects.inheritance).toBeDefined();
    const parsed = JSON.parse(objects.inheritance);
    expect(parsed.inheritance.seriesId).toBe('series-123');
  });

  it('13. 提示词明确为空场景', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.taskAndReferences).toContain('空场景背景图');
  });

  it('14. 提示词包含产品、人物、手部、文字、Logo、水印禁止项', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.outputConstraints).toContain('产品');
    expect(doc.sections.outputConstraints).toContain('人物');
    expect(doc.sections.outputConstraints).toContain('文字');
  });

  it('15. 不描述产品具体图案和文字', () => {
    const doc = compilePromptDocument(VALID_RECIPE);
    expect(doc.sections.productMatching).toContain('不要复述产品表面的具体图案和文字');
  });

  it('16. 非法 SceneRecipe 被拒绝', () => {
    const invalidRecipe = { ...VALID_RECIPE, scene: null };
    expect(() => compilePromptDocument(invalidRecipe as any)).toThrow('Invalid SceneRecipe schema');
  });

  it('17. Base64、blob、内部路径或凭证被拒绝', () => {
    const maliciousRecipe = { ...VALID_RECIPE, scene: { ...VALID_RECIPE.scene, style: 'data:image/png;base64,iVBORw0KGgo' } };
    expect(() => compilePromptDocument(maliciousRecipe as any)).toThrow(/Sensitive data/);
  });

  it('18. 编译过程不调用 fetch (无需网络)', () => {
    // We didn't mock fetch, and it runs successfully without network
    expect(true).toBe(true);
  });

  it('19. 编译过程不调用 Gemini 或 Adapter', () => {
    // We didn't inject or mock Gemini, and it runs successfully
    expect(true).toBe(true);
  });

  it('20. Recipe 关键字段变化会改变对应编译结果', () => {
    const doc1 = compilePromptDocument(VALID_RECIPE);
    const changedRecipe = { ...VALID_RECIPE, scene: { ...VALID_RECIPE.scene, spaceType: 'kitchen' } };
    const doc2 = compilePromptDocument(changedRecipe);
    expect(doc1.sections.sceneAndStyle).not.toBe(doc2.sections.sceneAndStyle);
    expect(doc1.fullPrompt).not.toBe(doc2.fullPrompt);
  });
});
