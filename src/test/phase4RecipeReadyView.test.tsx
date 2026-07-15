// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecipeReadyView } from '../components/RecipeReadyView';
import { SceneRecipe, PromptDocument, SceneDirection, ProjectState } from '../types/schemas';
import { ProjectStore } from '../store/projectStore';

// Mock clipboard
const writeTextMock = vi.fn().mockResolvedValue(undefined);
const originalClipboard = navigator.clipboard;

describe('RecipeReadyView Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Setup clipboard mock
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });
    writeTextMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  const mockRecipe: SceneRecipe = {
    schemaVersion: '1.0',
    recipeId: 'recipe-1',
    version: 1,
    productAssetId: 'prod-asset-123',
    productProfileSnapshot: {
      schemaVersion: '1.0',
      productAssetId: 'prod-asset-123',
      productType: 'desk_calendar',
      bracketType: 'paper_base',
      subjectBounds: { x: 10, y: 10, width: 100, height: 100 },
      contactRegion: { xStart: 10, xEnd: 90, y: 95, confidence: 'high' },
      view: { class: 'front', visibleTop: 'medium', visibleSide: 'none', perspectiveStrength: 'medium' },
      materials: [{ name: 'paper', reflectivity: 'low' }],
      palette: { dominant: ['#FFFFFF'], edgeBrightness: 'light' },
      existingLighting: { direction: 'front', temperature: 'neutral', softness: 'medium', contrast: 'medium' },
      uncertainties: [],
      overallConfidence: 'high',
      analyzedAt: '2026-07-14T18:00:00Z',
    },
    guidedAnswers: [],
    selectedDirectionId: 'dir-1',
    task: {
      operation: 'generate_empty_scene_background',
      productRole: 'analysis_and_spatial_reference_only',
      backgroundOnly: true,
    },
    scene: {
      spaceType: 'office',
      wallMaterial: 'wood',
      desktopMaterial: 'wood',
      desktopTone: 'light',
      backgroundBrightness: 'medium',
      style: 'minimalist',
      palette: ['#EBEBEB'],
      furnitureDensity: 'low',
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
      perspectiveStrength: 'medium',
      desktopVisiblePercent: 50,
    },
    lighting: {
      sourceType: 'window',
      sourcePosition: 'front',
      temperature: 'neutral',
      softness: 'medium',
      contrast: 'medium',
      shadowDirection: 'soft_diffuse',
    },
    decoration: {
      density: 'minimal',
      allowed: ['cup', 'book'],
      forbiddenNearProduct: [],
      foregroundOcclusion: false,
    },
    output: {
      aspectRatio: '1:1',
      resolutionLabel: '1K',
      realism: 'real_commercial_interior_photography',
      exclude: [],
    },
    createdAt: '2026-07-14T18:00:00-07:00',
    updatedAt: '2026-07-14T18:00:00-07:00',
  };

  const mockPrompt: PromptDocument = {
    recipeId: 'recipe-1',
    recipeVersion: 1,
    compilerVersion: '1.0.0',
    sections: {
      taskAndReferences: '任务与参考图 提示词文本',
      productMatching: '产品匹配 提示词文本',
      sceneAndStyle: '场景与风格 提示词文本',
      cameraAndComposition: '镜头与构图 提示词文本',
      lightingAndDecoration: '光线与装饰 提示词文本',
      outputConstraints: '输出约束 提示词文本',
    },
    fullPrompt: '这是一家极简主义办公室的完整生图提示词...',
    fullJson: '{"key": "value"}',
    objectJson: {
      task: '{"operation": "generate"}',
      scene: '{"spaceType": "office"}',
      composition: '{"purpose": "hero"}',
      lighting: '{"sourceType": "window"}',
      decoration: '{"density": "minimal"}',
      output: '{"aspectRatio": "1:1"}',
    },
    createdAt: '2026-07-14T18:00:00-07:00',
  };

  const mockDirection: SceneDirection = {
    id: 'dir-1',
    name: '温馨木质办公桌面',
    summary: '高品质温馨质感办公场景',
    recommended: true,
    recommendationReason: '完美契合产品气质',
    spaceType: 'office',
    desktop: 'wood',
    palette: ['#EBEBEB'],
    lightingSummary: '柔和日光',
    compositionSummary: '中心构图',
    decorationSummary: '极简绿植',
    risks: [],
  };

  it('1. RecipeReady 正确展示六段 Prompt', () => {
    render(
      <RecipeReadyView
        recipe={mockRecipe}
        promptDocument={mockPrompt}
        selectedDirection={mockDirection}
      />
    );

    // Verify header and description
    expect(screen.getByText('场景方案已生成')).toBeDefined();
    expect(
      screen.getByText('AI 已根据产品信息、用户选择和场景方向生成完整生图方案。')
    ).toBeDefined();

    // Verify 6 sections exist and display correct content
    expect(screen.getByText('1. 任务与参考图')).toBeDefined();
    expect(screen.getByText('任务与参考图 提示词文本')).toBeDefined();

    expect(screen.getByText('2. 产品匹配')).toBeDefined();
    expect(screen.getByText('产品匹配 提示词文本')).toBeDefined();

    expect(screen.getByText('3. 场景与风格')).toBeDefined();
    expect(screen.getByText('场景与风格 提示词文本')).toBeDefined();

    expect(screen.getByText('4. 镜头与构图')).toBeDefined();
    expect(screen.getByText('镜头与构图 提示词文本')).toBeDefined();

    expect(screen.getByText('5. 光线与装饰')).toBeDefined();
    expect(screen.getByText('光线与装饰 提示词文本')).toBeDefined();

    expect(screen.getByText('6. 输出约束')).toBeDefined();
    expect(screen.getByText('输出约束 提示词文本')).toBeDefined();
  });

  it('2. 点击复制按钮调用 clipboard', async () => {
    render(
      <RecipeReadyView
        recipe={mockRecipe}
        promptDocument={mockPrompt}
        selectedDirection={mockDirection}
      />
    );

    const copyBtn = screen.getByLabelText('复制 1. 任务与参考图');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith('任务与参考图 提示词文本');
    expect(screen.getAllByText('复制成功').length).toBeGreaterThanOrEqual(1);

    // Verify toast disappears after 1.5s
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getAllByText('复制本段').length).toBeGreaterThanOrEqual(1);
  });

  it('3. 复制失败显示错误状态', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('Clipboard error'));

    render(
      <RecipeReadyView
        recipe={mockRecipe}
        promptDocument={mockPrompt}
        selectedDirection={mockDirection}
      />
    );

    const copyBtn = screen.getByLabelText('复制 1. 任务与参考图');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(screen.getByText('复制失败，请尝试手动选择复制')).toBeDefined();
  });

  it('4. 刷新恢复后仍显示 Recipe 且状态机制正常', async () => {
    const mockState = {
      schemaVersion: '1.0',
      id: 'default-project',
      name: '台历项目',
      status: 'RECIPE_READY',
      productAsset: {
        id: 'p1',
        name: 'cal.png',
        mimeType: 'image/png',
        width: 100,
        height: 100,
        hasAlpha: true,
        persistedAssetRef: 'ref-1',
        createdAt: 'now',
      },
      productProfile: {
        schemaVersion: '1.0',
        productAssetId: 'p1',
        productType: 'desk_calendar',
        bracketType: 'paper_base',
        subjectBounds: { x: 0, y: 0, width: 10, height: 10 },
        contactRegion: { xStart: 0, xEnd: 10, y: 10, confidence: 'high' },
        view: { class: 'front', visibleTop: 'medium', visibleSide: 'none', perspectiveStrength: 'medium' },
        materials: [{ name: 'paper', reflectivity: 'low' }],
        palette: { dominant: ['#FFF'], edgeBrightness: 'light' },
        existingLighting: { direction: 'front', temperature: 'neutral', softness: 'medium', contrast: 'medium' },
        uncertainties: [],
        overallConfidence: 'high',
        analyzedAt: 'now',
      },
      guidedQuestions: [],
      guidedAnswers: [],
      sceneDirections: [mockDirection],
      selectedDirectionId: 'dir-1',
      sceneRecipes: [mockRecipe],
      recipeVersions: [
        {
          recipe: mockRecipe,
          promptDocument: mockPrompt,
          createdAt: 'now',
        },
      ],
      sceneRecipe: mockRecipe,
      promptDocument: mockPrompt,
      activeVersion: 1,
      sceneAsset: null,
      matchReport: null,
      seriesProject: null,
      ignoredMatchIssueIds: [],
      templateLibrary: [],
      templateInstances: [],
      renderSnapshots: [],
      createdAt: 'now',
      updatedAt: 'now',
    };

    const restoredStore = new ProjectStore(mockState as any);
    const state = restoredStore.getState();

    expect(state.status).toBe('RECIPE_READY');
    expect(state.sceneRecipe).toEqual(mockRecipe);
    expect(state.promptDocument).toEqual(mockPrompt);
  });

  it('5. JSON 展示正确', () => {
    render(
      <RecipeReadyView
        recipe={mockRecipe}
        promptDocument={mockPrompt}
        selectedDirection={mockDirection}
      />
    );

    // Verify JSON elements are rendered properly formatted
    expect(screen.getByText(/"key":\s*"value"/)).toBeDefined();
  });

  it('6. 没有 Recipe 时不能进入 RECIPE_READY', () => {
    const store = new ProjectStore();
    const result = store.canTransitionTo('RECIPE_READY');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('必须存在已生成的SceneRecipe');
  });
});
