import {
  ProjectState,
  ProjectStateSchema,
  AppStatus,
  SceneRecipe,
  ProductAsset,
  ProductProfile,
  GuidedQuestion,
  GuidedAnswer,
  SceneDirection,
  MatchReport,
  SeriesProject,
  AnalyzeMatchInput,
  RecipePatchOperation,
  CanvasDocument,
  CanvasLayer,
  AssetReference,
  CanvasDocumentSchema,
  RenderSnapshot,
  RenderSnapshotSchema
} from '../types/schemas';
import { RealAdapter } from '../services/ai/realAdapter';
import { validateGuidedAnswerCoverage, validateSceneDirectionSet, getSafeRecoveryState } from './phase3StateValidation';
import { saveProject, getProject } from '../lib/db';
import { compilePromptDocument, PROMPT_COMPILER_VERSION } from '../services/ai/promptCompiler';
import { applyRecipePatch } from '../services/ai/recipePatch';
import { SceneRecipeSchema, PromptDocumentSchema } from '../types/schemas';

export class ProjectStore {
  private state: ProjectState;
  private realAdapter = new RealAdapter();
  private listeners: Set<(state: ProjectState) => void> = new Set();

  constructor(initialState?: ProjectState) {
    if (initialState) {
      let sanitized = { ...initialState };
      if (sanitized.canvasDocument) {
        const check = CanvasDocumentSchema.safeParse(sanitized.canvasDocument);
        if (!check.success) {
          console.warn('CanvasDocument is corrupt/invalid in constructor, resetting to null:', check.error.message);
          sanitized.canvasDocument = null;
        }
      }
      const parsed = ProjectStateSchema.safeParse(sanitized);
      if (parsed.success) {
        this.state = parsed.data;
      } else {
        console.warn('Initial project state invalid even after sanitization, using empty state:', parsed.error.message);
        this.state = this.getEmptyState();
      }
    } else {
      this.state = this.getEmptyState();
    }
  }

  private getEmptyState(id = 'default-project', name = '台历智能场景规划项目'): ProjectState {
    return {
      schemaVersion: '1.0',
      id,
      name,
      status: 'EMPTY',
      productAsset: null,
      productProfile: null,
      guidedQuestions: null,
      guidedAnswers: [],
      sceneDirections: null,
      selectedDirectionId: null,
      sceneRecipes: [],
      recipeVersions: [],
      sceneRecipe: null,
      promptDocument: null,
      recipeRequestStatus: 'idle',
      recipeError: null,
      activeVersion: null,
      sceneAsset: null,
      matchReport: null,
      matchRequestStatus: 'idle',
      matchError: null,
      matchRequestId: null,
      seriesProject: null,
      ignoredMatchIssueIds: [],
      // Phase 7: Template State
      templateLibrary: [],
      selectedTemplateSuiteId: null,
      selectedTemplateVariantId: null,
      templateInstances: [],
      templateInstance: null,
      canvasDocument: null,
      selectedLayerId: null,
      canvasEditingMode: 'select',
      renderSnapshots: [],
      activeRenderSnapshotId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Listener management
  subscribe(listener: (state: ProjectState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  getState(): ProjectState {
    return this.state;
  }

  /**
   * Validates whether state can transition to targetStatus based on business rules
   * and prerequisite data presence.
   */
  canTransitionTo(targetStatus: AppStatus, testState?: ProjectState): { allowed: boolean; reason?: string } {
    const s = testState || this.state;
    const currentStatus = s.status;

    if (targetStatus === 'EMPTY') {
      return { allowed: true };
    }

    if (currentStatus === 'EMPTY' && targetStatus === 'APPROVED') {
      return { allowed: false, reason: 'EMPTY不能直接进入APPROVED' };
    }

    switch (targetStatus) {
      case 'PRODUCT_IMPORTED':
      case 'ANALYZING_PRODUCT':
        if (!s.productAsset) {
          return { allowed: false, reason: '必须存在产品资产' };
        }
        break;

      case 'PRODUCT_REVIEW':
        if (!s.productAsset || !s.productProfile) {
          return { allowed: false, reason: '必须存在产品分析结果' };
        }
        break;

      case 'GUIDED_QUESTIONS':
        if (!s.productAsset || !s.productProfile) {
          return { allowed: false, reason: '必须存在产品分析结果' };
        }
        break;

      case 'DIRECTION_SELECTION':
        if (!s.productAsset || !s.productProfile) {
          return { allowed: false, reason: '必须存在产品分析结果' };
        }
        if (!s.guidedQuestions) {
          return { allowed: false, reason: '必须存在引导问题' };
        }
        const answerCheck = validateGuidedAnswerCoverage(s.guidedQuestions, s.guidedAnswers);
        if (!answerCheck.valid) {
          return { allowed: false, reason: `引导问答不合法: ${answerCheck.errors.join(', ')}` };
        }
        if (!s.sceneDirections) {
          return { allowed: false, reason: '必须存在场景方向' };
        }
        const directionCheck = validateSceneDirectionSet(s.sceneDirections, s.selectedDirectionId);
        if (!directionCheck.valid) {
          return { allowed: false, reason: `场景方向不合法: ${directionCheck.errors.join(', ')}` };
        }
        break;

      case 'RECIPE_READY':
      case 'AWAITING_EXTERNAL_GENERATION':
        if (!s.productAsset || !s.productProfile || (s.sceneRecipes.length === 0 && !s.sceneRecipe) || s.activeVersion === null) {
          return { allowed: false, reason: '必须存在已生成的SceneRecipe及当前活动版本号' };
        }
        break;

      case 'PREVIEW_IMPORTED':
      case 'ANALYZING_MATCH':
        if (!s.productAsset || !s.productProfile || (s.sceneRecipes.length === 0 && !s.sceneRecipe) || s.activeVersion === null) {
          return { allowed: false, reason: '必须存在SceneRecipe及活动版本' };
        }
        if (!s.sceneAsset) {
          return { allowed: false, reason: '必须存在导入的场景实景图背景资产' };
        }
        break;

      case 'NEEDS_REVISION':
        if (!s.productAsset || !s.productProfile || s.sceneRecipes.length === 0 || s.activeVersion === null || !s.sceneAsset) {
          return { allowed: false, reason: '必须完成场景实景图背景导入' };
        }
        if (!s.matchReport) {
          return { allowed: false, reason: '必须存在匹配度分析报告' };
        }
        break;

      case 'APPROVED':
        if (!s.productAsset || !s.productProfile || s.sceneRecipes.length === 0 || s.activeVersion === null) {
          return { allowed: false, reason: '必须存在SceneRecipe' };
        }
        if (!s.sceneAsset) {
          return { allowed: false, reason: '没有真实场景结果不能进入APPROVED' };
        }
        if (!s.matchReport) {
          return { allowed: false, reason: '没有已验证的匹配分析报告不能进入APPROVED' };
        }
        break;

      case 'TEMPLATE_SELECTION':
        if (this.state.status !== 'APPROVED' && this.state.status !== 'PRODUCTION_READY' && this.state.status !== 'RECIPE_READY') {
          return { allowed: false, reason: '只有已通过(APPROVED)、已就绪(PRODUCTION_READY)或配方就绪(RECIPE_READY)状态才能进入模板选择' };
        }
        break;

      case 'PRODUCTION_READY':
        if (s.templateInstances.length === 0) {
          return { allowed: false, reason: '没有已确定的模板实例不能进入就绪状态' };
        }
        break;

      case 'SERIES_ACTIVE':
        if (!s.seriesProject) {
          return { allowed: false, reason: '没有已配置的SeriesProject不能进入SERIES_ACTIVE' };
        }
        const isApproved = this.state.status === 'APPROVED' || (s.matchReport && s.matchReport.productSceneStatus === 'pass');
        if (!isApproved) {
          return { allowed: false, reason: '没有已通过(APPROVED)结果不能进入SERIES_ACTIVE' };
        }
        break;
    }
    
    return { allowed: true };
  }

  /**
   * Safely updates project state, ensuring zod contract validation and state machine checks.
   * If validation fails, throws an error and leaves old state completely untouched.
   */
  updateState(updater: (state: ProjectState) => Partial<ProjectState>): void {
    const updatedProps = updater(this.state);

    // Enforce layer business constraints on canvasDocument if updated
    if (updatedProps.canvasDocument?.layers) {
      const enforcedLayers = updatedProps.canvasDocument.layers.map((layer) => {
        if (layer.type === 'scene_background') {
          return { ...layer, zIndex: 0 };
        }
        let zIndex = layer.zIndex;
        if (layer.type === 'product' && zIndex <= 0) {
          zIndex = 10;
        } else if (zIndex <= 0) {
          zIndex = 5;
        }
        return { ...layer, zIndex };
      });

      // Sort layers by zIndex ascending so render ordering is always robust
      enforcedLayers.sort((a, b) => a.zIndex - b.zIndex);

      updatedProps.canvasDocument = {
        ...updatedProps.canvasDocument,
        layers: enforcedLayers,
      };
    }

    const candidateState = {
      ...this.state,
      ...updatedProps,
      updatedAt: new Date().toISOString(),
    };

    // 1. Validate Zod Contract Schema
    const parsed = ProjectStateSchema.safeParse(candidateState);
    if (!parsed.success) {
      throw new Error(`Zod 校验未通过: ${parsed.error.message}`);
    }

    // 2. Validate State Machine Transition Constraints
    if (updatedProps.status && updatedProps.status !== this.state.status) {
      const check = this.canTransitionTo(updatedProps.status, parsed.data);
      if (check && !check.allowed) {
        throw new Error(`状态机控制拒绝该转换: ${check.reason}`);
      }
    }

    // 3. Mutate state
    this.state = parsed.data;
    this.notify();
  }

  transitionTo(targetStatus: AppStatus): void {
    this.updateState(() => ({ status: targetStatus }));
  }

  goToExternalGeneration(): void {
    this.updateState(() => ({ status: 'AWAITING_EXTERNAL_GENERATION', sceneAsset: null }));
  }

  goToPreview(): void {
    this.updateState(() => ({ status: 'PREVIEW_IMPORTED' }));
  }

  importSceneAsset(asset: ProjectState['sceneAsset']): void {
    this.updateState(() => ({
      sceneAsset: asset,
      status: 'PREVIEW_IMPORTED',
    }));
  }

  // ==========================================
  // Domain Operations (Mutators)
  // ==========================================

  reset(): void {
    const empty = this.getEmptyState(this.state.id, this.state.name);
    this.updateState(() => empty);
  }

  importProduct(asset: ProductAsset): void {
    this.updateState((s) => ({
      status: 'PRODUCT_IMPORTED',
      productAsset: asset,
      productProfile: null,
      guidedQuestions: null,
      guidedAnswers: [],
      sceneDirections: null,
      selectedDirectionId: null,
      sceneRecipes: [],
      sceneRecipe: null,
      promptDocument: null,
      recipeRequestStatus: 'idle',
      recipeError: null,
      activeVersion: null,
      sceneAsset: null,
      matchReport: null,
      matchRequestStatus: 'idle',
      matchError: null,
      matchRequestId: null,
      seriesProject: null,
      ignoredMatchIssueIds: [],
    }));
  }

  setProductProfile(profile: ProductProfile): void {
    this.updateState(() => ({
      status: 'PRODUCT_REVIEW',
      productProfile: profile,
    }));
  }

  setGuidedQuestions(questions: GuidedQuestion[]): void {
    if (!questions || questions.length < 2 || questions.length > 5) {
      throw new Error('引导问题数量必须在 2 到 5 之间');
    }
    const qIds = new Set<string>();
    for (const q of questions) {
      if (qIds.has(q.id)) throw new Error('问题 ID 必须唯一');
      qIds.add(q.id);
      if (q.options.length < 2 || q.options.length > 3) {
        throw new Error('每个问题必须包含 2 到 3 个选项');
      }
      const optIds = new Set<string>();
      let hasRec = false;
      for (const opt of q.options) {
        if (optIds.has(opt.id)) throw new Error('选项 ID 必须唯一');
        optIds.add(opt.id);
        if (opt.id === q.recommendedOptionId) {
          hasRec = true;
        }
      }
      if (!hasRec) throw new Error('推荐选项 ID 必须存在于问题选项中');
    }

    this.updateState(() => ({
      status: 'GUIDED_QUESTIONS',
      guidedQuestions: questions,
    }));
  }

  addGuidedAnswer(answer: GuidedAnswer): void {
    this.updateState((s) => {
      if (!s.guidedQuestions) throw new Error('引导问题不存在');
      const q = s.guidedQuestions.find(q => q.id === answer.questionId);
      if (!q) throw new Error('无效的问题 ID');
      if (!q.options.some(o => o.id === answer.optionId)) throw new Error('无效的选项 ID');

      const answers = [...s.guidedAnswers.filter((a) => a.questionId !== answer.questionId), answer];
      return { 
        guidedAnswers: answers,
        sceneDirections: null,
        selectedDirectionId: null,
        sceneAsset: null,
      };
    });
  }

  setSceneDirections(directions: SceneDirection[]): void {
    this.updateState(() => ({
      status: 'DIRECTION_SELECTION',
      sceneDirections: directions,
      selectedDirectionId: null,
      sceneAsset: null,
    }));
  }

  selectDirection(directionId: string): void {
    this.updateState(() => ({
      selectedDirectionId: directionId,
      sceneAsset: null,
    }));
  }

  commitInitialRecipe(recipe: SceneRecipe): void {
    // 1. 执行 SceneRecipeSchema.safeParse
    const recipeCheck = SceneRecipeSchema.safeParse(recipe);
    if (!recipeCheck.success) {
      throw new Error(`SceneRecipe 校验未通过: ${recipeCheck.error.message}`);
    }

    // 2. 调用 compilePromptDocument (or handle throw)
    let prompt;
    try {
      prompt = compilePromptDocument(recipeCheck.data);
    } catch (e: any) {
      throw new Error(`编译 Prompt 失败: ${e.message || e}`);
    }

    // 3. 执行 PromptDocumentSchema.safeParse
    const promptCheck = PromptDocumentSchema.safeParse(prompt);
    if (!promptCheck.success) {
      throw new Error(`PromptDocument 校验未通过: ${promptCheck.error.message}`);
    }

    const validatedPrompt = promptCheck.data;
    const validatedRecipe = recipeCheck.data;

    // 4. 校验
    if (validatedPrompt.recipeId !== validatedRecipe.recipeId) {
      throw new Error('校验失败: prompt.recipeId 与 recipe.recipeId 不匹配');
    }
    if (validatedPrompt.recipeVersion !== validatedRecipe.version) {
      throw new Error('校验失败: prompt.recipeVersion 与 recipe.version 不匹配');
    }
    if (validatedPrompt.compilerVersion !== PROMPT_COMPILER_VERSION) {
      throw new Error(`校验失败: prompt.compilerVersion 与当前编译器版本 ${PROMPT_COMPILER_VERSION} 不匹配`);
    }

    // 5. 所有步骤完成后，才执行一次 updateState
    this.updateState(() => ({
      sceneRecipe: validatedRecipe,
      promptDocument: validatedPrompt,
      sceneRecipes: [validatedRecipe],
      recipeVersions: [{
        recipe: validatedRecipe,
        promptDocument: validatedPrompt,
        createdAt: validatedRecipe.createdAt
      }],
      activeVersion: validatedRecipe.version,
      recipeRequestStatus: 'success',
      recipeError: null,
      status: 'RECIPE_READY',
      sceneAsset: null,
    }));
  }

  applyConfirmedRecipePatch(params: {
    issueIds: string[];
    confirmed?: boolean;
    patch?: RecipePatchOperation[];
  }): void {
    const { issueIds, confirmed, patch = [] } = params;

    if (confirmed === undefined) {
      throw new Error('缺少确认参数 (confirmed)');
    }
    if (confirmed !== true) {
      throw new Error('未确认应用 Patch (confirmed 必须为 true)');
    }

    // Only require MatchReport if status is NEEDS_REVISION. If already RECIPE_READY, patch is just modifying the current recipe.
    if (this.state.status !== 'RECIPE_READY' && (!this.state.matchReport || this.state.matchReport.recipeVersion !== this.state.activeVersion)) {
        throw new Error('MatchReport过期或不存在');
    }
    
    // If we have a matchReport, we use its suggested patches. If not (e.g. initial manual patch), we take the provided patch directly.
    let combinedPatch = patch;
    if (issueIds.length > 0) {
        if (!this.state.matchReport) throw new Error('MatchReport不存在');
        const issues = this.state.matchReport.issues.filter(i => issueIds.includes(i.id));
        if (issues.length !== issueIds.length) throw new Error('部分 Issue 不存在');
        combinedPatch = [...combinedPatch, ...issues.flatMap(i => i.suggestedPatch)];
    }
    
    const newRecipeData = applyRecipePatch(this.state.sceneRecipe, combinedPatch);
    
    // Validate new recipe
    SceneRecipeSchema.parse(newRecipeData);

    const maxVer = Math.max(...this.state.recipeVersions.map(rv => rv.recipe.version), 0);
    
    const newRecipe: SceneRecipe = {
        ...newRecipeData,
        version: maxVer + 1,
        basedOnVersion: this.state.activeVersion,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const newPromptDoc = compilePromptDocument(newRecipe);

    this.updateState((s) => ({
      sceneRecipes: [...s.sceneRecipes, newRecipe],
      recipeVersions: [...s.recipeVersions, {
          recipe: newRecipe,
          promptDocument: newPromptDoc,
          sourceMatchReportId: s.matchReport?.id,
          createdAt: newRecipe.createdAt
      }],
      activeVersion: newRecipe.version,
      sceneRecipe: newRecipe,
      promptDocument: newPromptDoc,
      status: 'RECIPE_READY',
      sceneAsset: null,
      matchReport: null,
      matchRequestStatus: 'idle',
      matchError: null,
      ignoredMatchIssueIds: [],
    }));
  }

  /**
   * Switches to an older Recipe version.
   * "恢复旧版本只从唯一权威历史中读取 Recipe 与 PromptDocument 配对记录"
   */
  rollbackToVersion(versionNum: number): void {
    const versionHistory = this.state.recipeVersions.find(v => v.recipe.version === versionNum);
    if (!versionHistory) {
      throw new Error(`未能在历史版本栈中检索到 V${versionNum} 的 Recipe。`);
    }

    this.updateState(() => ({
      activeVersion: versionNum,
      sceneRecipe: versionHistory.recipe,
      promptDocument: versionHistory.promptDocument,
      status: 'RECIPE_READY',
      sceneAsset: null,
      matchReport: null,
      matchRequestStatus: 'idle',
      matchError: null,
      ignoredMatchIssueIds: [],
    }));
  }

  ignoreMatchIssue(issueId: string): void {
    const report = this.state.matchReport;
    if (!report) throw new Error('MatchReport不存在');
    const hasIssue = report.issues.some(i => i.id === issueId);
    if (!hasIssue) throw new Error('该 Issue 在当前 MatchReport 中不存在');
    
    this.updateState((s) => {
      const current = s.ignoredMatchIssueIds || [];
      if (current.includes(issueId)) return {};
      return {
        ignoredMatchIssueIds: [...current, issueId]
      };
    });
  }

  unignoreMatchIssue(issueId: string): void {
    this.updateState((s) => {
      const current = s.ignoredMatchIssueIds || [];
      return {
        ignoredMatchIssueIds: current.filter(id => id !== issueId)
      };
    });
  }

  changeSceneDirection(): void {
    this.updateState((s) => ({
      status: 'DIRECTION_SELECTION',
      sceneRecipe: null,
      promptDocument: null,
      sceneAsset: null,
      matchReport: null,
      ignoredMatchIssueIds: [],
      activeVersion: null,
    }));
  }

  importScenePreview(scene: ProjectState['sceneAsset']): void {
    this.updateState(() => ({
      sceneAsset: scene,
      status: 'PREVIEW_IMPORTED',
      matchReport: null,
      matchRequestStatus: 'idle',
      matchError: null,
      matchRequestId: null,
    }));
  }

  async analyzeMatch(input: AnalyzeMatchInput): Promise<void> {
    const requestId = `req-${Date.now()}`;
    this.updateState(() => ({
      status: 'ANALYZING_MATCH',
      matchRequestStatus: 'loading',
      matchRequestId: requestId,
      matchError: null,
    }));

    try {
      const report = await this.realAdapter.analyzeMatch(input);
      if (this.state.matchRequestId !== requestId) return; // Stale

      this.setMatchReport(report);
      this.updateState(() => ({
        matchRequestStatus: 'success',
      }));
    } catch (e: any) {
      if (this.state.matchRequestId !== requestId) return;
      this.updateState(() => ({
        matchRequestStatus: 'error',
        matchError: e.message || '分析失败',
        status: 'PREVIEW_IMPORTED',
      }));
    }
  }

  setMatchReport(report: MatchReport): void {
    this.updateState((s) => {
      const targetStatus: AppStatus = report.productSceneStatus === 'needs_adjustment'
        ? 'NEEDS_REVISION'
        : 'PREVIEW_IMPORTED';
        
      const check = this.canTransitionTo(targetStatus, { ...s, matchReport: report });
      
      return {
        matchReport: report,
        status: check.allowed ? targetStatus : s.status,
        ignoredMatchIssueIds: [],
      };
    });
  }

  approveProject(): void {
    this.updateState(() => ({
      status: 'APPROVED',
    }));
  }

  activateSeries(series: SeriesProject): void {
    this.updateState(() => ({
      seriesProject: series,
      status: 'SERIES_ACTIVE',
    }));
  }

  // ==========================================
  // Phase 7: Template Actions
  // ==========================================

  setTemplateLibrary(templates: ProjectState['templateLibrary']): void {
    this.updateState(() => ({
      templateLibrary: templates
    }));
  }

  selectTemplateSuite(suiteId: string): void {
    this.updateState((s) => {
      const suite = s.templateLibrary.find(t => t.id === suiteId);
      if (!suite) throw new Error('模板套件不存在');
      return {
        selectedTemplateSuiteId: suiteId,
        selectedTemplateVariantId: suite.variants[0]?.id || null
      };
    });
  }

  selectTemplateVariant(variantId: string): void {
    this.updateState((s) => {
      if (!s.selectedTemplateSuiteId) throw new Error('请先选择模板套件');
      const suite = s.templateLibrary.find(t => t.id === s.selectedTemplateSuiteId);
      if (!suite) throw new Error('模板套件不存在');
      const variant = suite.variants.find(v => v.id === variantId);
      if (!variant) throw new Error('该套件中不存在指定的变体');
      return {
        selectedTemplateVariantId: variantId
      };
    });
  }

  generateCanvasDocument(instance: any, state: ProjectState): CanvasDocument {
    const variant = instance.variantSnapshot;
    const slots = variant.slots || [];

    const layers: CanvasLayer[] = slots.map((slot: any) => {
      let source: AssetReference | null = null;

      // Map slot type to CanvasLayer type
      let layerType: 'product' | 'scene_background' | 'text' | 'selling_point' | 'badge' | 'logo' | 'decoration' = 'decoration';
      if (slot.type === 'product') {
        layerType = 'product';
      } else if (slot.type === 'background' || slot.type === 'scene_background') {
        layerType = 'scene_background';
      } else if (slot.type === 'title' || slot.type === 'subtitle' || slot.type === 'text') {
        layerType = 'text';
      } else if (slot.type === 'selling_point') {
        layerType = 'selling_point';
      } else if (slot.type === 'badge') {
        layerType = 'badge';
      } else if (slot.type === 'logo') {
        layerType = 'logo';
      } else if (slot.type === 'decoration') {
        layerType = 'decoration';
      }

      if (layerType === 'product') {
        source = {
          assetId: state.productAsset?.id || 'default-product',
          assetType: 'product',
          sourceType: 'product_png',
          version: 1,
        };
      } else if (layerType === 'scene_background') {
        source = {
          assetId: state.sceneAsset?.id || state.sceneRecipe?.recipeId || 'default-scene',
          assetType: 'scene_background',
          sourceType: 'scene_image',
          version: state.sceneRecipe?.version || 1,
        };
      } else {
        source = {
          assetId: slot.id,
          assetType: slot.type,
          sourceType: 'template_element',
          version: 1,
        };
      }

      return {
        id: `layer-${slot.id}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        type: layerType,
        source,
        transform: {
          x: slot.rect.x,
          y: slot.rect.y,
          scale: 1.0,
          rotate: 0,
        },
        visible: true,
        locked: layerType === 'scene_background',
        zIndex: slot.zIndex,
        content: slot.label || '',
      };
    });

    // Ensure layers are sorted by zIndex ascending
    layers.sort((a, b) => a.zIndex - b.zIndex);

    return {
      width: variant.canvasSize.width,
      height: variant.canvasSize.height,
      templateInstanceId: instance.id,
      layers,
      version: 1,
    };
  }

  confirmTemplateSelection(): void {
    const s = this.state;
    if (!s.selectedTemplateSuiteId || !s.selectedTemplateVariantId) {
      throw new Error('未选择完整的模板及变体');
    }

    const suite = s.templateLibrary.find(t => t.id === s.selectedTemplateSuiteId);
    const variant = suite?.variants.find(v => v.id === s.selectedTemplateVariantId);

    if (!suite || !variant) {
      throw new Error('所选模板或变体已失效');
    }

    const newInstance = {
      id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      suiteId: suite.id,
      variantId: variant.id,
      variantSnapshot: JSON.parse(JSON.stringify(variant)), // Snapshotted
      slotValues: [],
      recipeId: s.sceneRecipe?.recipeId,
      recipeVersion: s.sceneRecipe?.version,
      templateName: suite.name,
      slots: variant.slots,
      createdAt: new Date().toISOString()
    };

    const newCanvasDoc = this.generateCanvasDocument(newInstance, s);

    this.updateState((prev) => ({
      templateInstances: [...prev.templateInstances, newInstance],
      templateInstance: newInstance,
      canvasDocument: newCanvasDoc,
      status: 'PRODUCTION_READY'
    }));
  }

  goToTemplateSelection(): void {
    this.updateState((s) => {
      let selectedSuiteId = s.selectedTemplateSuiteId;
      let selectedVariantId = s.selectedTemplateVariantId;

      if (!selectedSuiteId && s.templateLibrary.length > 0) {
        selectedSuiteId = s.templateLibrary[0].id;
        selectedVariantId = s.templateLibrary[0].variants[0]?.id || null;
      }

      return {
        status: 'TEMPLATE_SELECTION',
        selectedTemplateSuiteId: selectedSuiteId,
        selectedTemplateVariantId: selectedVariantId
      };
    });
  }

  selectLayer(layerId: string | null): void {
    this.updateState((s) => ({
      selectedLayerId: layerId,
    }));
  }

  setCanvasEditingMode(mode: 'select' | 'move' | 'scale'): void {
    this.updateState((s) => ({
      canvasEditingMode: mode,
    }));
  }

  updateLayerTransform(layerId: string, transform: { x?: number; y?: number; scale?: number; rotate?: number }): void {
    this.updateState((s) => {
      if (!s.canvasDocument) return {};
      const updatedLayers = s.canvasDocument.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        if (layer.locked) return layer; // If locked, prevent changes
        
        const newTransform = { ...layer.transform };
        if (transform.x !== undefined) newTransform.x = transform.x;
        if (transform.y !== undefined) newTransform.y = transform.y;
        if (transform.scale !== undefined) newTransform.scale = transform.scale;
        if (transform.rotate !== undefined) newTransform.rotate = transform.rotate;
        
        return {
          ...layer,
          transform: newTransform,
        };
      });
      return {
        canvasDocument: {
          ...s.canvasDocument,
          layers: updatedLayers,
          version: s.canvasDocument.version + 1,
        },
      };
    });
  }

  updateLayerProperties(layerId: string, properties: { shadow?: boolean | string; opacity?: number; blendMode?: string; assetVersion?: number }): void {
    this.updateState((s) => {
      if (!s.canvasDocument) return {};
      const updatedLayers = s.canvasDocument.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        if (layer.locked) return layer; // If locked, prevent changes
        
        return {
          ...layer,
          ...properties,
        };
      });
      return {
        canvasDocument: {
          ...s.canvasDocument,
          layers: updatedLayers,
          version: s.canvasDocument.version + 1,
        },
      };
    });
  }

  toggleLayerVisibility(layerId: string): void {
    this.updateState((s) => {
      if (!s.canvasDocument) return {};
      const updatedLayers = s.canvasDocument.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        return {
          ...layer,
          visible: !layer.visible,
        };
      });
      return {
        canvasDocument: {
          ...s.canvasDocument,
          layers: updatedLayers,
          version: s.canvasDocument.version + 1,
        },
      };
    });
  }

  toggleLayerLock(layerId: string): void {
    this.updateState((s) => {
      if (!s.canvasDocument) return {};
      const updatedLayers = s.canvasDocument.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        return {
          ...layer,
          locked: !layer.locked,
        };
      });
      return {
        canvasDocument: {
          ...s.canvasDocument,
          layers: updatedLayers,
          version: s.canvasDocument.version + 1,
        },
      };
    });
  }

  createRenderSnapshot(): RenderSnapshot {
    if (!this.state.canvasDocument) {
      throw new Error('无法创建渲染快照: 当前画布文档 (canvasDocument) 为空。');
    }

    // Deep copy canvas document to guarantee complete immutability isolation
    const canvasDocumentSnapshot = JSON.parse(JSON.stringify(this.state.canvasDocument));

    // Get current template instance snapshot
    const templateInstanceSnapshot = this.state.templateInstance
      ? JSON.parse(JSON.stringify(this.state.templateInstance))
      : null;

    // Map all layer asset references
    const layerAssetReferences = canvasDocumentSnapshot.layers
      .map((layer: any) => layer.source)
      .filter((source: any): source is AssetReference => source !== null && source !== undefined);

    const snapshot: RenderSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: this.state.id,
      canvasDocumentSnapshot,
      templateInstanceSnapshot,
      templateInstanceId: this.state.templateInstance?.id || null,
      templateInstanceVersion: this.state.templateInstance ? 1 : null,
      templateSuiteId: this.state.selectedTemplateSuiteId,
      templateSuiteVersion: 1,
      sceneRecipeId: this.state.sceneRecipe?.recipeId || null,
      sceneRecipeVersion: this.state.sceneRecipe?.version || null,
      recipeId: this.state.sceneRecipe?.recipeId || null,
      recipeVersion: this.state.sceneRecipe?.version || null,
      productAssetId: this.state.productAsset?.id || null,
      productAssetVersion: 1,
      layerAssetReferences,
      createdAt: new Date().toISOString(),
    };

    // Validate using RenderSnapshotSchema
    const parseCheck = RenderSnapshotSchema.safeParse(snapshot);
    if (!parseCheck.success) {
      throw new Error(`渲染快照 Zod 校验失败: ${parseCheck.error.message}`);
    }

    this.updateState((s) => ({
      renderSnapshots: [...(s.renderSnapshots || []), snapshot],
      activeRenderSnapshotId: snapshot.id,
    }));

    return snapshot;
  }

  // ==========================================
  // IndexedDB Persistence Actions
  // ==========================================

  /**
   * Persists current project to IndexedDB projects store.
   */
  async persistToDB(): Promise<void> {
    const parsed = ProjectStateSchema.safeParse(this.state);
    if (!parsed.success) {
      throw new Error(`无法持久化: 状态未通过 Zod 校验: ${parsed.error.message}`);
    }
    await saveProject(parsed.data);
  }

  /**
   * Loads and restores a project from IndexedDB.
   * Performs critical Zod schema checks to reject corrupt, illegal, or mismatched schema versions.
   */
  async loadFromDB(id: string): Promise<void> {
    const data = await getProject(id);
    if (!data) {
      // Rule 6: If default project is not found (first run), stay in initial state silently.
      return;
    }

    let sanitizedData = { ...data };
    if (sanitizedData.canvasDocument) {
      const check = CanvasDocumentSchema.safeParse(sanitizedData.canvasDocument);
      if (!check.success) {
        console.warn('CanvasDocument is corrupt/invalid on load, resetting to null:', check.error.message);
        sanitizedData.canvasDocument = null;
      }
    }

    // --- Pre-repair / sanitize recipe-related fields prior to global Zod parsing ---
    
    // 1. Repair missing promptDocument in recipeVersions
    if (Array.isArray(sanitizedData.recipeVersions)) {
      const validVersions = [];
      for (const entry of sanitizedData.recipeVersions) {
        if (!entry || !entry.recipe) continue;
        let promptDoc = entry.promptDocument;
        if (!promptDoc) {
          try {
            promptDoc = compilePromptDocument(entry.recipe);
          } catch (e) {
            // Compilation failed, discard this entry early
            continue;
          }
        }
        validVersions.push({
          ...entry,
          promptDocument: promptDoc
        });
      }
      sanitizedData.recipeVersions = validVersions;
    }

    // 2. Filter out invalid/illegal recipes from recipeVersions
    if (Array.isArray(sanitizedData.recipeVersions)) {
      sanitizedData.recipeVersions = sanitizedData.recipeVersions.filter((entry: any) => {
        if (!entry || !entry.recipe) return false;
        const check = SceneRecipeSchema.safeParse(entry.recipe);
        return check.success;
      });
    }

    // 3. Validate active sceneRecipe schema
    if (sanitizedData.sceneRecipe) {
      const check = SceneRecipeSchema.safeParse(sanitizedData.sceneRecipe);
      if (!check.success) {
        // Rollback whole recipe state to DIRECTION_SELECTION
        sanitizedData.status = 'DIRECTION_SELECTION';
        sanitizedData.sceneRecipe = null;
        sanitizedData.promptDocument = null;
        sanitizedData.activeVersion = null;
        sanitizedData.sceneRecipes = [];
        sanitizedData.recipeVersions = [];
        sanitizedData.sceneAsset = null;
        sanitizedData.matchReport = null;
      }
    }

    // Explicit schema constraint
    const parsed = ProjectStateSchema.safeParse(sanitizedData);
    if (!parsed.success) {
      throw new Error(`无法恢复项目: 数据库持久化数据已损坏、不合法或 schemaVersion 不兼容。 Zod 报错: ${parsed.error.message}`);
    }

    let stateData = { ...parsed.data };

    // --- Phase 4 Consistency recovery defense ---
    if (stateData.productAsset && stateData.productProfile && stateData.productAsset.id !== stateData.productProfile.productAssetId) {
      console.warn('Persistence recovery triggered: productAsset.id and productProfile.productAssetId do not match. Rolling back to PRODUCT_IMPORTED.');
      stateData = {
        ...stateData,
        status: 'PRODUCT_IMPORTED' as const,
        productProfile: null,
        guidedQuestions: null,
        guidedAnswers: [],
        sceneDirections: null,
        selectedDirectionId: null,
        sceneRecipes: [],
        sceneRecipe: null,
        promptDocument: null,
        recipeRequestStatus: 'idle' as const,
        recipeError: null,
        activeVersion: null,
        sceneAsset: null,
        matchReport: null,
        matchRequestStatus: 'idle' as const,
        matchError: null,
        matchRequestId: null,
        seriesProject: null,
        ignoredMatchIssueIds: [],
        recipeVersions: [],
      };
    } else {
      // Prioritize restoring from recipeVersions as authority (Scenario F)
      const rawVersions = stateData.recipeVersions || [];
      const validVersions: typeof stateData.recipeVersions = [];

      for (const entry of rawVersions) {
        // Validate recipe (Scenario E)
        const recipeCheck = SceneRecipeSchema.safeParse(entry.recipe);
        if (!recipeCheck.success) {
          // If recipe is invalid, discard this version history entry
          continue;
        }
        const validatedRecipe = recipeCheck.data;

        // Check if PromptDocument exists and is valid and matches (Scenarios B, C, D)
        let promptDoc = entry.promptDocument;
        let needsRecompile = false;

        if (!promptDoc) {
          // Scenario B: PromptDocument missing
          needsRecompile = true;
        } else {
          const promptCheck = PromptDocumentSchema.safeParse(promptDoc);
          if (!promptCheck.success) {
            // Invalid prompt schema
            needsRecompile = true;
          } else {
            const vPrompt = promptCheck.data;
            if (vPrompt.recipeId !== validatedRecipe.recipeId || vPrompt.recipeVersion !== validatedRecipe.version) {
              // Scenario D: Mismatched ID or version
              needsRecompile = true;
            } else if (vPrompt.compilerVersion !== PROMPT_COMPILER_VERSION) {
              // Scenario C: Compiler version mismatched
              needsRecompile = true;
            }
          }
        }

        if (needsRecompile) {
          try {
            promptDoc = compilePromptDocument(validatedRecipe);
          } catch (e) {
            // If compilation fails, skip this entry
            continue;
          }
        }

        validVersions.push({
          recipe: validatedRecipe,
          promptDocument: promptDoc!,
          sourceMatchReportId: entry.sourceMatchReportId,
          createdAt: entry.createdAt || validatedRecipe.createdAt
        });
      }

      const requiresRecipe = [
        'RECIPE_READY',
        'AWAITING_EXTERNAL_GENERATION',
        'PREVIEW_IMPORTED',
        'ANALYZING_MATCH',
        'NEEDS_REVISION',
        'APPROVED',
        'SERIES_ACTIVE'
      ].includes(stateData.status);

      const hasAnyRecipeHistory = (stateData.sceneRecipes && stateData.sceneRecipes.length > 0) ||
                                  (stateData.recipeVersions && stateData.recipeVersions.length > 0) ||
                                  !!stateData.sceneRecipe || !!stateData.promptDocument;

      if (validVersions.length === 0) {
        if (requiresRecipe || hasAnyRecipeHistory) {
          // Fallback to DIRECTION_SELECTION state before RECIPE_READY (Scenario E & F)
          stateData.status = 'DIRECTION_SELECTION';
          stateData.sceneRecipe = null;
          stateData.promptDocument = null;
          stateData.activeVersion = null;
          stateData.sceneRecipes = [];
          stateData.recipeVersions = [];
          stateData.sceneAsset = null;
          stateData.matchReport = null;
          stateData.recipeRequestStatus = 'idle';
          stateData.recipeError = null;
        }
      } else {
        // Reconstruct sceneRecipes and recipeVersions to be 100% synchronized and consistent
        validVersions.sort((a, b) => a.recipe.version - b.recipe.version);

        // Group by version to check duplicates and potential conflicts (Scenario B / Requirement I)
        const versionMap = new Map<number, typeof validVersions>();
        for (const v of validVersions) {
          const list = versionMap.get(v.recipe.version) || [];
          list.push(v);
          versionMap.set(v.recipe.version, list);
        }

        const uniqueVersions: typeof validVersions = [];
        let hasConflict = false;

        for (const [ver, list] of versionMap.entries()) {
          if (list.length === 1) {
            uniqueVersions.push(list[0]);
          } else {
            // There are duplicates. Check if they are completely identical.
            const first = list[0];
            let allIdentical = true;
            for (let i = 1; i < list.length; i++) {
              const r1 = first.recipe;
              const r2 = list[i].recipe;
              if (
                r1.recipeId !== r2.recipeId ||
                r1.selectedDirectionId !== r2.selectedDirectionId ||
                JSON.stringify(r1.task) !== JSON.stringify(r2.task) ||
                JSON.stringify(r1.scene) !== JSON.stringify(r2.scene) ||
                JSON.stringify(r1.composition) !== JSON.stringify(r2.composition) ||
                JSON.stringify(r1.lighting) !== JSON.stringify(r2.lighting) ||
                JSON.stringify(r1.decoration) !== JSON.stringify(r2.decoration) ||
                JSON.stringify(r1.output) !== JSON.stringify(r2.output)
              ) {
                allIdentical = false;
                break;
              }
            }

            if (allIdentical) {
              // Same content, deduplicate: just keep one
              uniqueVersions.push(first);
            } else {
              // Conflict!
              hasConflict = true;
              break;
            }
          }
        }

        if (hasConflict) {
          // If conflict is found, rollback to DIRECTION_SELECTION and clear recipe history
          stateData.status = 'DIRECTION_SELECTION';
          stateData.sceneRecipe = null;
          stateData.promptDocument = null;
          stateData.activeVersion = null;
          stateData.sceneRecipes = [];
          stateData.recipeVersions = [];
          stateData.sceneAsset = null;
          stateData.matchReport = null;
          stateData.recipeRequestStatus = 'idle';
          stateData.recipeError = null;
        } else {
          stateData.recipeVersions = uniqueVersions;
          stateData.sceneRecipes = uniqueVersions.map(uv => uv.recipe);

          // Align the current sceneRecipe and promptDocument pointers
          let targetVersion = stateData.activeVersion;
          let matchedEntry = targetVersion !== null ? uniqueVersions.find(uv => uv.recipe.version === targetVersion) : undefined;

          if (!matchedEntry) {
            // Fallback to latest version
            matchedEntry = uniqueVersions[uniqueVersions.length - 1];
            targetVersion = matchedEntry.recipe.version;
          }

          stateData.activeVersion = targetVersion;
          stateData.sceneRecipe = matchedEntry.recipe;
          stateData.promptDocument = matchedEntry.promptDocument;

          if (requiresRecipe && stateData.status === 'DIRECTION_SELECTION') {
            stateData.status = 'RECIPE_READY';
          }
        }
      }
    }

    // Apply Phase 3 semantic safety recovery
    const safeData = getSafeRecoveryState(stateData);

    // Ensure state machine is valid too
    const statusCheck = this.canTransitionTo(safeData.status, safeData);
    if (!statusCheck.allowed) {
      throw new Error(`无法恢复项目: 恢复数据的状态机配置不合法。 原因: ${statusCheck.reason}`);
    }

    this.state = safeData;
    this.notify();
  }
}
