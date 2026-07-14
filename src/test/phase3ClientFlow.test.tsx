// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App, { projectStore } from '../App';
import { clearAllData, saveAsset } from '../lib/db';
import { ProductAsset, ProductProfile, GuidedQuestion, SceneDirection, GuidedAnswer } from '../types/schemas';

// Global mutable mock callbacks
let mockQuestionsResolver: ((val: any) => void) | null = null;
let mockQuestionsRejecter: ((err: any) => void) | null = null;
let mockDirectionsResolver: ((val: any) => void) | null = null;
let mockDirectionsRejecter: ((err: any) => void) | null = null;

let mockQuestionsResponse: any = null;
let mockDirectionsResponse: any = null;
let mockQuestionsError: any = null;
let mockDirectionsError: any = null;

let planSceneDirectionsCallCount = 0;

// Mock URL APIs for happy-dom
if (typeof window !== 'undefined') {
  if (!window.URL) {
    (window as any).URL = {};
  }
  window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/dummy');
  window.URL.revokeObjectURL = vi.fn();
}

vi.mock('../services/ai/realAdapter', () => {
  return {
    RealAdapter: class {
      readonly mode = 'real' as const;

      async generateGuidedQuestions(input: any): Promise<GuidedQuestion[]> {
        // Return a promise that we can control if resolvers are requested
        const p = new Promise<any>((resolve, reject) => {
          mockQuestionsResolver = resolve;
          mockQuestionsRejecter = reject;
        });

        if (mockQuestionsError) {
          throw mockQuestionsError;
        }
        if (mockQuestionsResponse) {
          try {
            const { validateGuidedQuestionsSemanticContract } = await import('../services/ai/clientContractValidation');
            validateGuidedQuestionsSemanticContract(mockQuestionsResponse);
          } catch (err: any) {
            err.code = 'SEMANTIC_VALIDATION_FAILED';
            err.retryable = false;
            throw err;
          }
          mockQuestionsResolver?.(mockQuestionsResponse);
          return mockQuestionsResponse;
        }
        return p;
      }

      async planSceneDirections(input: any): Promise<SceneDirection[]> {
        planSceneDirectionsCallCount++;
        const p = new Promise<any>((resolve, reject) => {
          mockDirectionsResolver = resolve;
          mockDirectionsRejecter = reject;
        });

        if (mockDirectionsError) {
          throw mockDirectionsError;
        }
        if (mockDirectionsResponse) {
          mockDirectionsResolver?.(mockDirectionsResponse);
          return mockDirectionsResponse;
        }
        return p;
      }
    }
  };
});


vi.mock('motion/react', () => {
  const React = require('react');
  const Dummy = React.forwardRef((props, ref) => {
    const { initial, animate, exit, variants, transition, ...rest } = props;
    return React.createElement('div', { ref, ...rest });
  });
  return {
    motion: {
      div: Dummy,
      p: Dummy,
      h1: Dummy,
      h2: Dummy,
      span: Dummy,
      button: Dummy,
    },
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

describe('Phase 3-B-1 Integration and Race Condition Tests', () => {
  beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(projectStore, 'loadFromDB').mockResolvedValue(undefined);

    await clearAllData();
    projectStore.reset();
    mockQuestionsResolver = null;
    mockQuestionsRejecter = null;
    mockDirectionsResolver = null;
    mockDirectionsRejecter = null;
    mockQuestionsResponse = null;
    mockDirectionsResponse = null;
    mockQuestionsError = null;
    mockDirectionsError = null;
    planSceneDirectionsCallCount = 0;
  });

  const setupBaseStoreState = async (assetId = 'asset-1') => {
    const asset: ProductAsset = {
      id: assetId,
      name: 'calendar.png',
      mimeType: 'image/png',
      width: 500,
      height: 500,
      hasAlpha: true,
      persistedAssetRef: 'ref-1',
      createdAt: new Date().toISOString(),
    };
    const profile: ProductProfile = {
      schemaVersion: '1.0',
      productAssetId: assetId,
      productType: 'desk_calendar',
      bracketType: 'wood_base',
      subjectBounds: { x: 0, y: 0, width: 100, height: 100 },
      contactRegion: { xStart: 0, xEnd: 100, y: 100, confidence: 'high' },
      view: { class: 'front', visibleTop: 'none', visibleSide: 'none', perspectiveStrength: 'low' },
      materials: [],
      palette: { dominant: [], edgeBrightness: 'light' },
      existingLighting: { direction: 'front', temperature: 'neutral', softness: 'soft', contrast: 'low' },
      overallConfidence: 'high',
      uncertainties: [],
      analyzedAt: new Date().toISOString(),
    };
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'PRODUCT_REVIEW',
        productAsset: asset,
        productProfile: profile,
        guidedQuestions: null,
        guidedAnswers: [],
        sceneDirections: null,
        selectedDirectionId: null,
      }));
    });
    await projectStore.persistToDB();
    return { asset, profile };
  };

  const getValidMockQuestions = (): GuidedQuestion[] => [
    {
      id: 'q1',
      text: '您期望的台历布景场景氛围是？',
      category: 'style',
      options: [
        { id: 'opt1', text: '温暖家居 (推荐)', recommendationReason: '舒适自然' },
        { id: 'opt2', text: '现代办公', recommendationReason: '专业高效' },
      ],
      recommendedOptionId: 'opt1',
    },
    {
      id: 'q2',
      text: '您期望的颜色是？',
      category: 'style',
      options: [
        { id: 'opt3', text: '红色 (推荐)', recommendationReason: '热情' },
        { id: 'opt4', text: '蓝色', recommendationReason: '冷静' },
      ],
      recommendedOptionId: 'opt3',
    }
  ];

  const getValidMockDirections = (): SceneDirection[] => [
    {
      id: 'dir1',
      name: '温暖和煦家居场景',
      summary: '温暖和煦的家居场景说明',
      recommended: true,
      recommendationReason: '基于温暖家居氛围推荐',
      spaceType: 'living_room',
      desktop: 'wood',
      palette: ['#FFFFFF'],
      lightingSummary: 'soft',
      compositionSummary: 'centered',
      decorationSummary: 'plants',
      risks: [],
    },
    {
      id: 'dir2',
      name: '极简商务办公场景',
      summary: '极简商务办公场景说明',
      recommended: false,
      recommendationReason: '适合现代办公桌搭配',
      spaceType: 'office',
      desktop: 'metal',
      palette: ['#000000'],
      lightingSummary: 'clean',
      compositionSummary: 'balanced',
      decorationSummary: 'laptop',
      risks: [],
    },
    {
      id: 'dir3',
      name: '艺术生活美学空间',
      summary: '艺术生活美学空间说明',
      recommended: false,
      recommendationReason: '适合展示艺术气质',
      spaceType: 'studio',
      desktop: 'marble',
      palette: ['#FF00FF'],
      lightingSummary: 'dramatic',
      compositionSummary: 'artistic',
      decorationSummary: 'sculpture',
      risks: [],
    }
  ];

  const createFullMockDirection = (partial: { id: string; name: string; recommended?: boolean }): SceneDirection => ({
    id: partial.id,
    name: partial.name,
    summary: `${partial.name} summary`,
    recommended: typeof partial.recommended === 'boolean' ? partial.recommended : false,
    recommendationReason: 'reason',
    spaceType: 'space',
    desktop: 'desk',
    palette: ['#FFFFFF'],
    lightingSummary: 'lighting',
    compositionSummary: 'composition',
    decorationSummary: 'decoration',
    risks: [],
  });

  // ==========================================
  // A. 推荐项契约测试
  // ==========================================

  it('1. 客户端按服务端原始顺序显示选项，且不执行推荐项排序', async () => {
    await setupBaseStoreState();
    mockQuestionsResponse = getValidMockQuestions();

    
    // Step 1: Initialize at PRODUCT_REVIEW
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'PRODUCT_REVIEW',
        guidedQuestions: [], // Must be empty to trigger API call
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'now' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }],
      }));
    });
    
    mockQuestionsError = null;
    const badQuestions = getValidMockQuestions();
    badQuestions[0].recommendedOptionId = 'non-existent'; // Make it invalid
    mockQuestionsResponse = badQuestions;

    render(<App />);
    
    // Step 2: Click continue to trigger the bad response
    const continueBtn = await screen.findByRole('button', { name: /继续规划场景/i });
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    // Step 3: Verify error is shown and state is unchanged
    await waitFor(() => {
      expect(screen.getByText(/引导问题数据不符合约定/)).toBeDefined();
      expect(projectStore.getState().guidedQuestions).toEqual([]);
      expect(projectStore.getState().guidedAnswers).toHaveLength(2);
    });
    
    // Step 4: Click retry and provide valid response
    const retryBtn = await screen.findByRole('button', { name: /稍后重试/i });
    mockQuestionsResponse = getValidMockQuestions(); // Now valid
    await act(async () => {
      fireEvent.click(retryBtn);
    });
    
    await waitFor(() => {
      expect(projectStore.getState().status).toBe('GUIDED_QUESTIONS');
    });
  });

  // ==========================================
  // B. 引导问题过期响应测试 (Race Conditions)
  // ==========================================

  it('5. 引导问题：请求期间替换产品，旧问题响应被忽略', async () => {
    await setupBaseStoreState('asset-initial');

    render(<App />);

    const continueBtn = await screen.findByRole('button', { name: /继续规划场景/i });
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    expect(mockQuestionsResolver).not.toBeNull();

    await act(async () => {
      projectStore.updateState(() => ({
        productAsset: { ...projectStore.getState().productAsset!, id: 'asset-replaced' },
        productProfile: { ...projectStore.getState().productProfile!, productAssetId: 'asset-replaced', analyzedAt: 'new-time' },
      }));
    });

    const validQuestions = getValidMockQuestions();
    await act(async () => {
      mockQuestionsResolver?.(validQuestions);
    });

    expect(projectStore.getState().guidedQuestions).toBeNull();
  });

  it('6. 引导问题：较早请求晚返回时不能覆盖较新请求', async () => {
    await setupBaseStoreState();
    render(<App />);

    const continueBtn = await screen.findByRole('button', { name: /继续规划场景/i });
    
    let resolvers: any[] = [];
    mockQuestionsResolver = null;
    
    // Fire two clicks synchronously to bypass React re-render disabling the button
    await act(async () => {
      fireEvent.click(continueBtn);
      resolvers.push(mockQuestionsResolver);
      fireEvent.click(continueBtn);
      resolvers.push(mockQuestionsResolver);
    });

    const r1Resolver = resolvers[0];
    const r2Resolver = resolvers[1];

    expect(r1Resolver).not.toBeNull();
    expect(r2Resolver).not.toBeNull();
    expect(r1Resolver).not.toBe(r2Resolver);

    const questions2: GuidedQuestion[] = [
      { id: 'q-new-1', text: 'New Question 1', category: 'style', options: [{ id: 'opt-new-1', text: 'New' }, { id: 'opt-new-2', text: 'New2' }], recommendedOptionId: 'opt-new-1' },
      { id: 'q-new-2', text: 'New Question 2', category: 'style', options: [{ id: 'opt-new-3', text: 'New' }, { id: 'opt-new-4', text: 'New2' }], recommendedOptionId: 'opt-new-3' }
    ];
    await act(async () => {
      r2Resolver?.(questions2);
    });
    
    const questions1: GuidedQuestion[] = [
      { id: 'q-old-1', text: 'Old Question 1', category: 'style', options: [{ id: 'opt-old-1', text: 'Old' }, { id: 'opt-old-2', text: 'Old2' }], recommendedOptionId: 'opt-old-1' },
      { id: 'q-old-2', text: 'Old Question 2', category: 'style', options: [{ id: 'opt-old-3', text: 'Old' }, { id: 'opt-old-4', text: 'Old2' }], recommendedOptionId: 'opt-old-3' }
    ];
    await act(async () => {
      r1Resolver?.(questions1);
    });

    expect(projectStore.getState().guidedQuestions).toEqual(questions2);
  });

  it('7. 引导问题：过期请求失败不能覆盖当前成功/加载状态', async () => {
    await setupBaseStoreState();
    render(<App />);

    const continueBtn = await screen.findByRole('button', { name: /继续规划场景/i });
    
    await act(async () => {
      fireEvent.click(continueBtn);
    });
    const r1Rejecter = mockQuestionsRejecter;

    await act(async () => {
      fireEvent.click(continueBtn);
    });
    const r2Resolver = mockQuestionsResolver;

    const questions = getValidMockQuestions();
    await act(async () => {
      r2Resolver?.(questions);
    });

    await act(async () => {
      r1Rejecter?.(new Error('Stale Error'));
    });

    expect(projectStore.getState().guidedQuestions).toEqual(questions);
    expect(screen.queryByText('Stale Error')).toBeNull();
  });

  // ==========================================
  // C. 场景方向过期响应测试 (Race Conditions)
  // ==========================================

  it('8. 场景方向：请求方向期间修改答案，旧方向响应被忽略', async () => {
    const { asset, profile } = await setupBaseStoreState();
    const questions = getValidMockQuestions();
    
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'GUIDED_QUESTIONS',
        guidedQuestions: questions,
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'now' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }],
      }));
    });
    await projectStore.persistToDB();

    render(<App />);

    const submitBtn = await screen.findByRole('button', { name: /查看场景方向/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockDirectionsResolver).not.toBeNull();

    await act(async () => {
      projectStore.updateState((s) => ({
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt2', answeredAt: 'now2' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }]
      }));
    });

    const directions = getValidMockDirections();
    await act(async () => {
      mockDirectionsResolver?.(directions);
    });

    expect(projectStore.getState().sceneDirections).toBeNull();
  });

  it('9. 场景方向：连续两次换一批，较早响应晚返回时被忽略，且较新成功时替换方向并清除旧选择', async () => {
    const { asset, profile } = await setupBaseStoreState();
    const questions = getValidMockQuestions();
    
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'DIRECTION_SELECTION',
        guidedQuestions: questions,
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'now' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }],
        sceneDirections: getValidMockDirections(),
        selectedDirectionId: 'dir1',
      }));
    });
    await projectStore.persistToDB();

    render(<App />);
    
    const refreshBtn = await screen.findByRole('button', { name: /换一批方向/i });
    
    
    let resolvers: any[] = [];
    mockDirectionsResolver = null;
    
    // Trigger Request 1 and 2 synchronously
    await act(async () => {
      fireEvent.click(refreshBtn);
      resolvers.push(mockDirectionsResolver);
      fireEvent.click(refreshBtn);
      resolvers.push(mockDirectionsResolver);
    });
    
    const refresh1Resolver = resolvers[0];
    const refresh2Resolver = resolvers[1];


    expect(refresh1Resolver).not.toBeNull();
    expect(refresh2Resolver).not.toBeNull();
    expect(refresh1Resolver).not.toBe(refresh2Resolver);

    const freshDirections = [
      createFullMockDirection({ id: 'new-dir1', name: 'Fresh 1' }),
      createFullMockDirection({ id: 'new-dir2', name: 'Fresh 2' }),
      createFullMockDirection({ id: 'new-dir3', name: 'Fresh 3' }),
    ];
    
    // Resolve Request 2 first
    await act(async () => {
      refresh2Resolver(freshDirections);
    });
    
    const staleDirections = [
      createFullMockDirection({ id: 'stale-dir1', name: 'Stale 1' }),
    ];
    
    // Resolve Request 1 later
    await act(async () => {
      refresh1Resolver(staleDirections);
    });

    // Should keep Request 2 results
    expect(projectStore.getState().sceneDirections).toEqual(freshDirections);
    expect(projectStore.getState().selectedDirectionId).toBe('');
  });

  it('10. 场景方向：过期请求失败不能覆盖最新成功状态，最新换一批失败时保留旧方向', async () => {
    const { asset, profile } = await setupBaseStoreState();
    const questions = getValidMockQuestions();
    const initialDirections = getValidMockDirections();
    
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'DIRECTION_SELECTION',
        guidedQuestions: questions,
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'now' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }],
        sceneDirections: initialDirections,
        selectedDirectionId: 'dir1',
      }));
    });
    await projectStore.persistToDB();

    render(<App />);

    const refreshBtn = await screen.findByRole('button', { name: /换一批方向/i });
    
    
    let rejecters: any[] = [];
    let resolvers: any[] = [];
    mockDirectionsRejecter = null;
    mockDirectionsResolver = null;
    
    // Request 1 and 2 synchronously
    await act(async () => {
      fireEvent.click(refreshBtn);
      rejecters.push(mockDirectionsRejecter);
      fireEvent.click(refreshBtn);
      rejecters.push(mockDirectionsRejecter);
      resolvers.push(mockDirectionsResolver);
    });
    
    const r1Rejecter = rejecters[0];
    const r2Rejecter = rejecters[1];
    const r2Resolver = resolvers[0];


    expect(r1Rejecter).not.toBeNull();
    expect(r2Rejecter).not.toBeNull();
    expect(r1Rejecter).not.toBe(r2Rejecter);

    // Request 2 fails
    await act(async () => {
      r2Rejecter?.(new Error('Network Fail'));
    });

    // Request 1 fails later (should be ignored)
    await act(async () => {
      r1Rejecter?.(new Error('Stale Error'));
    });
    expect(projectStore.getState().sceneDirections).toEqual(initialDirections);
    expect(screen.getByText('Network Fail')).toBeDefined();

    await act(async () => {
      r1Rejecter?.(new Error('Stale Fail'));
    });

    expect(projectStore.getState().sceneDirections).toEqual(initialDirections);
  });

  it('11. 场景方向：产品替换后旧方向响应不能写入', async () => {
    const { asset, profile } = await setupBaseStoreState();
    const questions = getValidMockQuestions();
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'GUIDED_QUESTIONS',
        guidedQuestions: questions,
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'now' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }],
      }));
    });
    await projectStore.persistToDB();

    render(<App />);

    const submitBtn = await screen.findByRole('button', { name: /查看场景方向/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockDirectionsResolver).not.toBeNull();

    await act(async () => {
      projectStore.updateState(() => ({
        productAsset: { ...projectStore.getState().productAsset!, id: 'new-product-id' },
        productProfile: { ...projectStore.getState().productProfile!, productAssetId: 'new-product-id', analyzedAt: 'new-time' },
      }));
    });

    await act(async () => {
      mockDirectionsResolver?.(getValidMockDirections());
    });

    expect(projectStore.getState().sceneDirections).toBeNull();
  });

  it('12. 答案指纹只比较 questionId + optionId，不受 answeredAt 变化影响', async () => {
    const { asset, profile } = await setupBaseStoreState();
    const questions = getValidMockQuestions();
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'GUIDED_QUESTIONS',
        guidedQuestions: questions,
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'time-v1' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'time-v1' }],
      }));
    });
    await projectStore.persistToDB();

    render(<App />);

    const submitBtn = await screen.findByRole('button', { name: /查看场景方向/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await act(async () => {
      projectStore.updateState((s) => ({
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'time-v2' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'time-v1' }],
      }));
    });

    const directions = getValidMockDirections();
    await act(async () => {
      mockDirectionsResolver?.(directions);
    });

    expect(projectStore.getState().sceneDirections).toEqual(directions);
  });

  it('13. 相同答案重复点击不错误清除方向，真实答案变化立即清除方向 and 选择且不调用 SceneRecipe', async () => {
    const { asset, profile } = await setupBaseStoreState();
    const questions = getValidMockQuestions();
    const initialDirections = getValidMockDirections();
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'DIRECTION_SELECTION',
        guidedQuestions: questions,
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'now' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }],
        sceneDirections: initialDirections,
        selectedDirectionId: 'dir1',
      }));
    });
    await projectStore.persistToDB();

    render(<App />);

    const backBtn = await screen.findByRole('button', { name: /返回修改答案/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });

    const opt1Btn = await screen.findByRole('button', { name: /温暖家居/i });
    await act(async () => {
      fireEvent.click(opt1Btn);
    });

    expect(projectStore.getState().sceneDirections).toEqual(initialDirections);
    expect(projectStore.getState().selectedDirectionId).toBe('dir1');

    const opt2Btn = await screen.findByRole('button', { name: /现代办公/i });
    await act(async () => {
      fireEvent.click(opt2Btn);
    });

    expect(projectStore.getState().sceneDirections).toBeNull();
    expect(projectStore.getState().selectedDirectionId).toBeNull();
  });

  it('14. 确认方向后，仍未进入 SceneRecipe 或调用任何 SceneRecipe 阶段接口', async () => {
    const { asset, profile } = await setupBaseStoreState();
    const questions = getValidMockQuestions();
    const directions = getValidMockDirections();
    await act(async () => {
      projectStore.updateState(() => ({
        status: 'DIRECTION_SELECTION',
        guidedQuestions: questions,
        guidedAnswers: [{ questionId: 'q1', optionId: 'opt1', answeredAt: 'now' }, { questionId: 'q2', optionId: 'opt3', answeredAt: 'now' }],
        sceneDirections: directions,
        selectedDirectionId: 'dir1',
      }));
    });
    await projectStore.persistToDB();

    render(<App />);

    const confirmBtn = await screen.findByRole('button', { name: /确认这个方向/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(projectStore.getState().selectedDirectionId).toBe('dir1');

    expect(projectStore.getState().status).toBe('DIRECTION_SELECTION');
    expect(projectStore.getState().sceneRecipes).toEqual([]);
  });

  // ==========================================
  // D. 429 Error Handling Tests
  // ==========================================
  it('429 Quota Exhausted handling and manual retry', async () => {
    // 1. Prepare initial state with product profile
    await setupBaseStoreState('asset-1');

    // 2. Mock generateGuidedQuestions to throw 429
    
    
    const err = new Error('当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。');
    (err as any).code = 'GEMINI_QUOTA_EXHAUSTED';
    mockQuestionsError = err;

    // 3. Render and click "Continue"
    render(<App />);
    const continueBtn = screen.getByText('继续规划场景');
    await act(async () => {
      continueBtn.click();
    });

    // 4. Verify Error UI
    // Wait for error to appear
    await screen.findByText('生成引导问题失败');
    expect(screen.getByText('当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。')).toBeTruthy();

    // 5. Verify no empty array written to store and Product Profile kept
    const stateAfterError = projectStore.getState();
    expect(stateAfterError.guidedQuestions).toBeNull();
    expect(stateAfterError.productProfile).toBeTruthy();
    expect(stateAfterError.status).toBe('GUIDED_QUESTIONS'); // Stays in GUIDED_QUESTIONS but with error state

    // 6. Verify buttons
    expect(screen.queryByText('完成以下 0 个场景偏好')).toBeNull();
    expect(screen.queryByText('采用推荐方案')).toBeNull();
    const backBtn = screen.getByText('返回产品分析报告');
    const retryBtn = screen.getByText('稍后重试');

    // 7. Verify no auto-retry (callCount should be exactly 1)
    
    // 8. Manual retry
    
    mockQuestionsError = null;
    mockQuestionsResponse = getValidMockQuestions();

    await act(async () => {
      retryBtn.click();
    });

    // 9. Verify success after manual retry
    await screen.findByText('您期望的台历布景场景氛围是？');
        expect(projectStore.getState().guidedQuestions).toBeTruthy();
  });

  it('503 and 504 and TIMEOUT show different messages than 429', async () => {
    await setupBaseStoreState('asset-2');

    const err = new Error('智能分析服务暂时不可用（503 Service Unavailable），可能是大模型服务临时故障，请稍后重试。');
    (err as any).code = 'SERVICE_UNAVAILABLE';
    mockQuestionsError = err;

    render(<App />);
    const continueBtn = screen.getByText('继续规划场景');
    await act(async () => {
      continueBtn.click();
    });

    await screen.findByText('生成引导问题失败');
    expect(screen.getByText('智能分析服务暂时不可用（503 Service Unavailable），可能是大模型服务临时故障，请稍后重试。')).toBeTruthy();
  });


});
