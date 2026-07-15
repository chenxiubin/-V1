import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Save,
  Database,
  RefreshCw,
  FileCode,
  ArrowRight,
  Sparkles,
  Loader2,
  RotateCcw,
  Check,
  XCircle,
  Info
} from 'lucide-react';
import { ProjectStore } from './store/projectStore';
import { ProjectState, ProductAsset, GuidedAnswer, SceneRecipeSchema, PromptDocumentSchema } from './types/schemas';
import { saveAsset, getAsset, listProjects, deleteProject } from './lib/db';
import { analyzeImageFile, ImageAnalysis } from './lib/imageAnalyzer';
import { RealAdapter } from './services/ai/realAdapter';
import { compilePromptDocument } from './services/ai/promptCompiler';
import { GuidedQuestionsPanel } from './components/GuidedQuestionsPanel';
import { SceneDirectionPanel } from './components/SceneDirectionPanel';
import { RecipeReadyView } from './components/RecipeReadyView';
import { ExternalGenerationPanel } from './components/ExternalGenerationPanel';
import { ProductScenePreview } from './components/ProductScenePreview';
import { MatchReportPanel } from './components/MatchReportPanel';
import { RecipeVersionHistoryPanel } from './components/RecipeVersionHistoryPanel';
import { AnalyzeMatchInput } from './types/schemas';

import { TemplateGallery } from './components/TemplateGallery';
import { TemplateDetailView } from './components/TemplateDetailView';
import { CanvasInteractionEditor } from './components/CanvasInteractionEditor';
import { ProductionWorkspace } from './components/ProductionWorkspace';
import { MOCK_TEMPLATES } from './data/mockTemplates';

// Instantiate the global ProjectStore with a default project
const defaultProjectId = 'default-project';
export const projectStore = new ProjectStore();

export function useProjectState() {
  const [state, setState] = useState<ProjectState>(projectStore.getState());
  useEffect(() => {
    return projectStore.subscribe((s) => setState(s));
  }, []);
  return state;
}

const statusTranslations: Record<string, string> = {
  EMPTY: '空项目',
  PRODUCT_IMPORTED: '已导入产品',
  ANALYZING_PRODUCT: '产品分析中',
  PRODUCT_REVIEW: '分析审核中',
  GUIDED_QUESTIONS: '引导问答中',
  DIRECTION_SELECTION: '场景方向确认',
  RECIPE_READY: '场景配方就绪',
  AWAITING_EXTERNAL_GENERATION: '等待外部生成',
  PREVIEW_IMPORTED: '已导入预览',
  ANALYZING_MATCH: '正在分析匹配',
  NEEDS_REVISION: '需要修正',
  APPROVED: '已通过审核',
  TEMPLATE_SELECTION: '选择生产模板',
  PRODUCTION_READY: '生产就绪',
  SERIES_ACTIVE: '系列化进行中',
};

const productTypeMappping: Record<string, string> = {
  desk_calendar: '台历',
  wall_calendar: '挂历',
  packaging: '产品包装',
  combination: '组合套装',
  unknown: '未知类型',
};

const bracketTypeMapping: Record<string, string> = {
  paper_base: '纸质三角架',
  metal_frame: '金属支架',
  acrylic_frame: '亚克力支架',
  wood_base: '木质底座',
  other: '其他类型支架',
  unknown: '未知支架/无支架',
};

const viewClassMapping: Record<string, string> = {
  front: '正视视角',
  front_left: '左前侧视',
  front_right: '右前侧视',
  slight_top: '俯视视角',
  high_top: '高空俯视',
  unknown: '未知视角',
};

const visibleLevelMapping: Record<string, string> = {
  none: '完全不可见',
  low: '低度可见',
  medium: '中度可见',
  high: '高度可见',
  left: '仅左侧可见',
  right: '仅右侧可见',
  both: '两侧均可见',
  unknown: '未知可见度',
};

const materialMapping: Record<string, string> = {
  paper: '纸张/卡纸',
  metal: '金属',
  acrylic: '亚克力/聚合物',
  wood: '木质/竹质',
  plastic: '塑料',
  fabric: '布料/皮革',
  other: '其他材质',
};

const reflectivityMapping: Record<string, string> = {
  low: '低反光/哑光',
  medium: '中等反光/半哑光',
  high: '高反光/镜面',
};

const edgeBrightnessMapping: Record<string, string> = {
  dark: '暗色',
  mid: '中等亮度',
  light: '亮色',
  mixed: '混合亮度',
};

const lightDirectionMapping: Record<string, string> = {
  upper_left: '左上角光源',
  upper_right: '右上角光源',
  front: '正面光源',
  top: '顶部直射光源',
  diffuse: '漫反射/无明显方向',
  unknown: '未知方向',
};

const lightTemperatureMapping: Record<string, string> = {
  cool: '冷色调',
  neutral: '中性自然光',
  neutral_warm: '暖白光/中性偏暖',
  warm: '暖黄色调',
  unknown: '未知色温',
};

const lightSoftnessMapping: Record<string, string> = {
  hard: '硬光 (阴影锐利)',
  medium: '适中光 (阴影边缘平滑)',
  soft: '柔和光 (无明显阴影边缘)',
  unknown: '未知光质',
};

const lightContrastMapping: Record<string, string> = {
  low: '低对比度',
  medium: '中等对比度',
  high: '高对比度',
  unknown: '未知对比度',
};

const confidenceMapping: Record<string, string> = {
  high: '高置信度',
  medium: '中置信度',
  low: '低置信度',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function App() {
  const state = useProjectState();
  console.log(
    `[APP_STATE]\n` +
    `status: ${state.status}\n` +
    `productAsset: ${state.productAsset ? JSON.stringify(state.productAsset) : 'null'}\n` +
    `templateInstance: ${state.templateInstance ? JSON.stringify(state.templateInstance) : 'null'}\n` +
    `canvasDocument: ${state.canvasDocument ? JSON.stringify(state.canvasDocument) : 'null'}`
  );
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('2026年创意定制台历电商发布组图');
  const [selectedProductType, setSelectedProductType] = useState('ring_top_tent');
  const [errorMessage, setErrorMessage] = useState<{ message: string; retryable: boolean } | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<'checking' | 'ready' | 'error'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setApiHealth('ready');
        } else {
          setApiHealth('error');
        }
      })
      .catch(() => {
        setApiHealth('error');
      });
  }, []);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [overlayPreviewRef, setOverlayPreviewRef] = useState<string>('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzingError, setAnalyzingError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [guidedQuestionsRequestStatus, setGuidedQuestionsRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [guidedQuestionsError, setGuidedQuestionsError] = useState<string | null>(null);
  const [sceneDirectionsRequestStatus, setSceneDirectionsRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sceneDirectionsError, setSceneDirectionsError] = useState<string | null>(null);
  const [isDirectionConfirmed, setIsDirectionConfirmed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [patchSuccessMessage, setPatchSuccessMessage] = useState<string | null>(null);

  const guidedQuestionsRequestIdRef = useRef<number>(0);
  const sceneDirectionsRequestIdRef = useRef<number>(0);
  const recipeRequestIdRef = useRef<number>(0);
  const recipeSubmitLockRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const invalidateRecipeRequest = () => {
    recipeRequestIdRef.current += 1;
    recipeSubmitLockRef.current = false;
    setLoading(false);
  };

  const createAnswersFingerprint = (answers: GuidedAnswer[]): string =>
    JSON.stringify(
      [...answers]
        .sort((a, b) => a.questionId.localeCompare(b.questionId))
        .map(({ questionId, optionId }) => ({
          questionId,
          optionId,
        })),
    );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      guidedQuestionsRequestIdRef.current += 1;
      sceneDirectionsRequestIdRef.current += 1;
      invalidateRecipeRequest();
    };
  }, []);

  useEffect(() => {
    guidedQuestionsRequestIdRef.current += 1;
    sceneDirectionsRequestIdRef.current += 1;
  }, [state.productAsset?.id, state.productProfile?.productAssetId, state.productProfile?.analyzedAt]);

  useEffect(() => {
    if (state.status === 'DIRECTION_SELECTION' && state.selectedDirectionId) {
      setIsDirectionConfirmed(true);
    } else {
      setIsDirectionConfirmed(false);
    }
  }, [state.status, state.selectedDirectionId]);

  // Load project on mount and load preview if asset exists
  useEffect(() => {
    async function loadInitial() {
      if (projectStore.getState().productAsset) {
        refreshSavedProjects();
        return;
      }
      try {
        await projectStore.loadFromDB(defaultProjectId);
        const activeState = projectStore.getState();
        if (activeState.productAsset) {
          const blob = await getAsset(activeState.productAsset.persistedAssetRef);
          if (blob) {
            const url = URL.createObjectURL(blob);
            setLocalPreviewUrl(url);
          }
        }
      } catch (err) {
        console.error('loadInitial failed with error:', err);
        projectStore.reset();
      }
      refreshSavedProjects();
    }
    loadInitial();
  }, []);

  // Update local preview URL when productAsset changes or is cleared
  useEffect(() => {
    if (!state.productAsset) {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl(null);
      }
    }
  }, [state.productAsset]);


  // Global Paste Event Listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [localPreviewUrl]);

  const refreshSavedProjects = async () => {
    try {
      const list = await listProjects();
      setSavedProjects(list);
    } catch (err) {
      console.error('Failed to list saved projects:', err);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setErrorMessage(null);
    setAnalyzingError(null);
    setIsConfirmed(false);
    try {
      // 1. Analyze image properties (MIME, Dimensions, Alpha channel check)
      const analysis: ImageAnalysis = await analyzeImageFile(file);

      // 2. Write original Blob to IndexedDB asset store
      const assetId = `prod-asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await saveAsset(assetId, file);

      // 3. Assemble ProductAsset structure in compliance with Zod
      const productAsset: ProductAsset = {
        id: assetId,
        name: file.name,
        mimeType: analysis.mimeType,
        width: analysis.width,
        height: analysis.height,
        hasAlpha: analysis.hasAlpha,
        persistedAssetRef: assetId,
        createdAt: new Date().toISOString(),
      };

      // 4. Load preview URL
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      const url = URL.createObjectURL(file);
      setLocalPreviewUrl(url);

      // 5. Update Project Store state
      invalidateRecipeRequest();
      projectStore.importProduct(productAsset);

      // 6. Automatically save project to DB
      await projectStore.persistToDB();
      await refreshSavedProjects();
    } catch (err: any) {
      console.error(err);
      setErrorMessage({ message: err.message || '文件导入失败，请检查文件格式是否正确。', retryable: false });
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleClear = async () => {
    guidedQuestionsRequestIdRef.current += 1;
    sceneDirectionsRequestIdRef.current += 1;
    invalidateRecipeRequest();
    if (state.productAsset) {
      await deleteProject(state.productAsset.persistedAssetRef);
    }
    projectStore.reset();
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    setErrorMessage(null);
    setAnalyzingError(null);
    setIsConfirmed(false);
    setGuidedQuestionsRequestStatus('idle');
    setGuidedQuestionsError(null);
    setSceneDirectionsRequestStatus('idle');
    setSceneDirectionsError(null);
    setIsDirectionConfirmed(false);
    await projectStore.persistToDB();
    await refreshSavedProjects();
  };

  const handlePersist = async () => {
    setSaveStatus('saving');
    try {
      await projectStore.persistToDB();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      await refreshSavedProjects();
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleAnalyze = async () => {
    if (!state.productAsset || loading || state.status === 'ANALYZING_PRODUCT') return;
    setLoading(true);
    setAnalyzingError(null);
    setIsConfirmed(false);
    invalidateRecipeRequest();

    try {
      projectStore.transitionTo('ANALYZING_PRODUCT');
    } catch (e: any) {
      console.error('Transition to ANALYZING_PRODUCT failed:', e);
      setAnalyzingError({ message: e.message || '状态转换失败', retryable: false });
      setLoading(false);
      return;
    }

    const initiatedAssetId = state.productAsset.id;

    try {
      const adapter = new RealAdapter();
      const profile = await adapter.analyzeProduct({
        productAsset: state.productAsset,
      });


      // Prevent overwriting if user replaced the product in-flight
      const currentAsset = projectStore.getState().productAsset;
      if (currentAsset && currentAsset.id === initiatedAssetId) {
        projectStore.setProductProfile(profile);
        await projectStore.persistToDB();
        await refreshSavedProjects();
      } else {
        console.warn('Discarding old analysis response due to product asset mismatch.');
      }
    } catch (err: any) {
      console.error('analyzeProduct failed in adapter:', err);
      
      // Revert to PRODUCT_IMPORTED on failure so user can retry or upload a new one
      try {
        projectStore.transitionTo('PRODUCT_IMPORTED');
      } catch (transitionErr) {
        console.error('Failed to transition back to PRODUCT_IMPORTED:', transitionErr);
      }

      let userFriendlyMessage = err.message || '智能分析产品图失败，请重试。';
      if (err.code === 'TIMEOUT' || /timeout/i.test(err.message) || /超时/i.test(err.message)) {
        userFriendlyMessage = '分析产品大模型服务请求超时（120秒超时限制），请检查网络后重试。';
      } else if (err.code === 'GEMINI_QUOTA_EXHAUSTED' || err.code === 'RATE_LIMIT' || err.status === 429 || /429|resource_exhausted/i.test(err.message)) {
        userFriendlyMessage = '当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。';
      } else if (err.code === 'SERVICE_UNAVAILABLE' || err.status === 503 || /503|service_unavailable/i.test(err.message)) {
        userFriendlyMessage = '智能分析服务暂时不可用（503 Service Unavailable），可能是大模型服务临时故障，请稍后重试。';
      } else if (err.code === 'GATEWAY_TIMEOUT' || err.status === 504 || /504/i.test(err.message)) {
        userFriendlyMessage = '网关超时（504 Gateway Timeout），大模型无响应，请重试。';
      }

      setAnalyzingError({
        message: userFriendlyMessage,
        retryable: typeof err.retryable === 'boolean' ? err.retryable : true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeMatch = async () => {
    if (!state.productAsset || !state.productProfile || !state.sceneAsset || !state.sceneRecipe || !state.promptDocument) return;

    if (!overlayPreviewRef || overlayPreviewRef.startsWith('data:')) {
       setErrorMessage({ message: '产品叠加预览尚未生成或非法，请等待生成完成。', retryable: false });
       return;
    }

    const input: AnalyzeMatchInput = {
      productProfile: state.productProfile,
      sceneRecipe: state.sceneRecipe,
      productAsset: state.productAsset,
      sceneAsset: state.sceneAsset,
      promptDocument: state.promptDocument,
      overlayPreviewRef,
    };
    await projectStore.analyzeMatch(input);
  };

  const handleContinueToQuestions = async () => {
    if (!state.productProfile) return;

    if (state.guidedQuestions && state.guidedQuestions.length > 0) {
      projectStore.transitionTo('GUIDED_QUESTIONS');
      return;
    }

    setLoading(true);
    setGuidedQuestionsRequestStatus('loading');
    setGuidedQuestionsError(null);
    setSceneDirectionsError(null);
    setErrorMessage(null);
    projectStore.transitionTo('GUIDED_QUESTIONS');
    
    const requestId = ++guidedQuestionsRequestIdRef.current;
    const initialAssetId = state.productAsset?.id;
    const initialProfileAssetId = state.productProfile?.productAssetId;
    const initialAnalyzedAt = state.productProfile?.analyzedAt;

    try {
      const adapter = new RealAdapter();
      const questions = await adapter.generateGuidedQuestions({
        productProfile: state.productProfile,
      });

      const currentState = projectStore.getState();
      const currentAssetId = currentState.productAsset?.id;
      const currentProfileAssetId = currentState.productProfile?.productAssetId;
      const currentAnalyzedAt = currentState.productProfile?.analyzedAt;

      if (
        mountedRef.current &&
        requestId === guidedQuestionsRequestIdRef.current &&
        currentAssetId === initialAssetId &&
        currentProfileAssetId === initialProfileAssetId &&
        currentAnalyzedAt === initialAnalyzedAt
      ) {
        projectStore.setGuidedQuestions(questions);
        setGuidedQuestionsRequestStatus('success');
        await projectStore.persistToDB();
        await refreshSavedProjects();
      }
    } catch (err: any) {
      const currentState = projectStore.getState();
      const currentAssetIdCatch = currentState.productAsset?.id;
      const currentProfileAssetIdCatch = currentState.productProfile?.productAssetId;
      const currentAnalyzedAtCatch = currentState.productProfile?.analyzedAt;
      console.error('generateGuidedQuestions failed:', err);
      
      if (
        mountedRef.current &&
        requestId === guidedQuestionsRequestIdRef.current &&
        currentAssetIdCatch === initialAssetId &&
        currentProfileAssetIdCatch === initialProfileAssetId &&
        currentAnalyzedAtCatch === initialAnalyzedAt
      ) {
        setGuidedQuestionsRequestStatus('error');
        setGuidedQuestionsError(err.message || '生成引导问题失败，请重试。');
      }
    } finally {
      const currentState = projectStore.getState();
      const currentAssetIdFinally = currentState.productAsset?.id;
      const currentProfileAssetIdFinally = currentState.productProfile?.productAssetId;
      const currentAnalyzedAtFinally = currentState.productProfile?.analyzedAt;
      if (
        mountedRef.current &&
        requestId === guidedQuestionsRequestIdRef.current &&
        currentAssetIdFinally === initialAssetId &&
        currentProfileAssetIdFinally === initialProfileAssetId &&
        currentAnalyzedAtFinally === initialAnalyzedAt
      ) {
        setLoading(false);
      }
    }
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    const existing = state.guidedAnswers.find(a => a.questionId === questionId);
    if (existing?.optionId === optionId) return;

    // Increment scene directions request ID to invalidate any in-flight requests
    sceneDirectionsRequestIdRef.current += 1;
    invalidateRecipeRequest();

    projectStore.updateState((s) => {
      const answers = [...s.guidedAnswers.filter(a => a.questionId !== questionId), {
        questionId,
        optionId,
        answeredAt: new Date().toISOString()
      }];
      return {
        guidedAnswers: answers,
        sceneDirections: null,
        selectedDirectionId: null,
      };
    });
  };

  const handleAdoptRecommendations = () => {
    const unanswered = (state.guidedQuestions || []).filter(
      q => !state.guidedAnswers.some(a => a.questionId === q.id)
    );
    if (unanswered.length === 0) return;

    // Increment scene directions request ID to invalidate any in-flight requests
    sceneDirectionsRequestIdRef.current += 1;
    invalidateRecipeRequest();

    projectStore.updateState((s) => {
      let answers = [...s.guidedAnswers];
      let changed = false;
      for (const q of unanswered) {
        if (q.recommendedOptionId) {
          answers.push({
            questionId: q.id,
            optionId: q.recommendedOptionId,
            answeredAt: new Date().toISOString()
          });
          changed = true;
        }
      }
      
      if (!changed) return {};

      return {
        guidedAnswers: answers,
        sceneDirections: null,
        selectedDirectionId: null,
      };
    });
  };

  const handleSubmitAnswers = async () => {

    if (!state.productProfile || (state.guidedQuestions || []).length !== state.guidedAnswers.length) {
      return;
    }

    if (state.sceneDirections && state.sceneDirections.length > 0) {
      projectStore.transitionTo('DIRECTION_SELECTION');
      return;
    }

    setLoading(true);
    setSceneDirectionsRequestStatus('loading');
    setSceneDirectionsError(null);
    setErrorMessage(null);
    // Removed transitionTo to avoid invalid state before fetching directions
    // projectStore.transitionTo('DIRECTION_SELECTION');
    
    const requestId = ++sceneDirectionsRequestIdRef.current;
    const initialAssetId = state.productAsset?.id;
    const initialProfileAssetId = state.productProfile?.productAssetId;
    const initialFingerprint = createAnswersFingerprint(state.guidedAnswers);

    try {
      const adapter = new RealAdapter();
      const directions = await adapter.planSceneDirections({
        productProfile: state.productProfile,
        guidedAnswers: state.guidedAnswers,
      });

      const currentState = projectStore.getState();
      const currentAssetId = currentState.productAsset?.id;
      const currentProfileAssetId = currentState.productProfile?.productAssetId;
      const currentFingerprint = createAnswersFingerprint(currentState.guidedAnswers);

      if (
        mountedRef.current &&
        requestId === sceneDirectionsRequestIdRef.current &&
        currentAssetId === initialAssetId &&
        currentProfileAssetId === initialProfileAssetId &&
        currentFingerprint === initialFingerprint
      ) {
        projectStore.setSceneDirections(directions);
        setSceneDirectionsRequestStatus('success');
        await projectStore.persistToDB();
        await refreshSavedProjects();
      } else {
      }
    } catch (err: any) {
      console.error('planSceneDirections failed:', err);
      const currentState = projectStore.getState();
      const currentAssetId = currentState.productAsset?.id;
      const currentProfileAssetId = currentState.productProfile?.productAssetId;
      const currentFingerprint = createAnswersFingerprint(currentState.guidedAnswers);

      if (
        mountedRef.current &&
        requestId === sceneDirectionsRequestIdRef.current &&
        currentAssetId === initialAssetId &&
        currentProfileAssetId === initialProfileAssetId &&
        currentFingerprint === initialFingerprint
      ) {
        setSceneDirectionsRequestStatus('error');
        setSceneDirectionsError(err.message || '规划场景方向失败，请重试。');
      } else {
      }
    } finally {
      const currentState = projectStore.getState();
      const currentAssetIdFinally = currentState.productAsset?.id;
      const currentProfileAssetIdFinally = currentState.productProfile?.productAssetId;
      const currentFingerprintFinally = createAnswersFingerprint(currentState.guidedAnswers);
      
      if (
        mountedRef.current &&
        requestId === sceneDirectionsRequestIdRef.current &&
        currentAssetIdFinally === initialAssetId &&
        currentProfileAssetIdFinally === initialProfileAssetId &&
        currentFingerprintFinally === initialFingerprint
      ) {
        setLoading(false);
      }
    }
  };

  const handleRetryQuestions = async () => {
    if (!state.productProfile) return;
    setLoading(true);
    setGuidedQuestionsRequestStatus('loading');
    setGuidedQuestionsError(null);
    setSceneDirectionsError(null);
    setErrorMessage(null);
    projectStore.transitionTo('GUIDED_QUESTIONS');
    
    const requestId = ++guidedQuestionsRequestIdRef.current;
    const initialAssetId = state.productAsset?.id;
    const initialProfileAssetId = state.productProfile?.productAssetId;
    const initialAnalyzedAt = state.productProfile?.analyzedAt;

    try {
      const adapter = new RealAdapter();
      const questions = await adapter.generateGuidedQuestions({
        productProfile: state.productProfile,
      });

      const currentState = projectStore.getState();
      const currentAssetId = currentState.productAsset?.id;
      const currentProfileAssetId = currentState.productProfile?.productAssetId;
      const currentAnalyzedAt = currentState.productProfile?.analyzedAt;

      if (
        mountedRef.current &&
        requestId === guidedQuestionsRequestIdRef.current &&
        currentAssetId === initialAssetId &&
        currentProfileAssetId === initialProfileAssetId &&
        currentAnalyzedAt === initialAnalyzedAt
      ) {
        projectStore.setGuidedQuestions(questions);
        setGuidedQuestionsRequestStatus('success');
        await projectStore.persistToDB();
        await refreshSavedProjects();
      } else {
      }
    } catch (err: any) {
      console.error('generateGuidedQuestions failed during retry:', err);
      const currentState = projectStore.getState();
      const currentAssetId = currentState.productAsset?.id;
      const currentProfileAssetId = currentState.productProfile?.productAssetId;
      const currentAnalyzedAt = currentState.productProfile?.analyzedAt;

      if (
        mountedRef.current &&
        requestId === guidedQuestionsRequestIdRef.current &&
        currentAssetId === initialAssetId &&
        currentProfileAssetId === initialProfileAssetId &&
        currentAnalyzedAt === initialAnalyzedAt
      ) {
        setGuidedQuestionsRequestStatus('error');
        setGuidedQuestionsError(err.message || '生成引导问题失败，请重试。');
      } else {
      }
    } finally {
      const currentState = projectStore.getState();
      const currentAssetIdFinally = currentState.productAsset?.id;
      const currentProfileAssetIdFinally = currentState.productProfile?.productAssetId;
      const currentAnalyzedAtFinally = currentState.productProfile?.analyzedAt;
      if (
        mountedRef.current &&
        requestId === guidedQuestionsRequestIdRef.current &&
        currentAssetIdFinally === initialAssetId &&
        currentProfileAssetIdFinally === initialProfileAssetId &&
        currentAnalyzedAtFinally === initialAnalyzedAt
      ) {
        setLoading(false);
      }
    }
  };

  const handleBackToReview = () => {
    guidedQuestionsRequestIdRef.current += 1;
    sceneDirectionsRequestIdRef.current += 1;
    invalidateRecipeRequest();
    projectStore.transitionTo('PRODUCT_REVIEW');
  };

  const handleDirectionSelect = (directionId: string) => {
    const exists = (state.sceneDirections || []).some(d => d.id === directionId);
    if (!exists) return;
    invalidateRecipeRequest();
    projectStore.selectDirection(directionId);
  };

  const handleConfirmDirection = async () => {
    if (recipeSubmitLockRef.current) return;
    recipeSubmitLockRef.current = true;

    if (!state.selectedDirectionId) {
      recipeSubmitLockRef.current = false;
      return;
    }
    if (state.recipeRequestStatus === 'loading') {
      recipeSubmitLockRef.current = false;
      return;
    }

    if (!state.productProfile) {
      setErrorMessage({ message: '缺少 ProductProfile', retryable: false });
      recipeSubmitLockRef.current = false;
      return;
    }
    if (!state.guidedQuestions || state.guidedAnswers.length !== state.guidedQuestions.length) {
      setErrorMessage({ message: '必须完成所有引导问题', retryable: false });
      recipeSubmitLockRef.current = false;
      return;
    }
    if (!state.sceneDirections || state.sceneDirections.length !== 3) {
      setErrorMessage({ message: '缺少 3 个场景方向', retryable: false });
      recipeSubmitLockRef.current = false;
      return;
    }

    const directionExists = state.sceneDirections.some(d => d.id === state.selectedDirectionId);
    if (!directionExists) {
      setErrorMessage({ message: '选择的方向 ID 非法', retryable: false });
      recipeSubmitLockRef.current = false;
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // Save snapshot of state prior to committing
    const snapshot = JSON.parse(JSON.stringify(projectStore.getState()));

    projectStore.updateState(() => ({
      recipeRequestStatus: 'loading',
      recipeError: null
    }));

    const requestId = ++recipeRequestIdRef.current;
    
    // Save starting context variables
    const startProductAssetId = state.productAsset?.id;
    const startProfileAssetId = state.productProfile?.productAssetId;
    const startAnswersFingerprint = createAnswersFingerprint(state.guidedAnswers);
    const startSelectedDirectionId = state.selectedDirectionId;

    try {
      const adapter = new RealAdapter();
      const recipe = await adapter.createSceneRecipe({
        productAssetId: state.productAsset?.id || state.productProfile?.productAssetId || '',
        productProfileSnapshot: state.productProfile!,
        guidedQuestions: state.guidedQuestions || [],
        guidedAnswers: state.guidedAnswers,
        sceneDirections: state.sceneDirections,
        selectedDirectionId: state.selectedDirectionId
      });

      // Verification before committing: read current state
      const currState = projectStore.getState();
      const currAnswersFingerprint = createAnswersFingerprint(currState.guidedAnswers);

      const isValid = 
        mountedRef.current === true &&
        requestId === recipeRequestIdRef.current &&
        currState.status === 'DIRECTION_SELECTION' &&
        currState.productAsset?.id === startProductAssetId &&
        currState.productProfile?.productAssetId === startProfileAssetId &&
        currAnswersFingerprint === startAnswersFingerprint &&
        currState.selectedDirectionId === startSelectedDirectionId;

      if (!isValid) {
        return;
      }

      // Use unique store commit method
      projectStore.commitInitialRecipe(recipe);

      // Attempt to persist to database
      try {
        await projectStore.persistToDB();
        await refreshSavedProjects();
      } catch (persistErr: any) {
        console.error('Failed to persist to DB:', persistErr);
        if (requestId !== recipeRequestIdRef.current) return;

        // Roll back state to the pre-commit snapshot, retaining the error
        projectStore.updateState(() => ({
          ...snapshot,
          recipeRequestStatus: 'error',
          recipeError: '场景配方保存失败，请重新尝试'
        }));
        setErrorMessage({ message: '场景配方保存失败，请重新尝试', retryable: true });
        return;
      }

    } catch (err: any) {
      if (requestId !== recipeRequestIdRef.current) return;

      const currState = projectStore.getState();
      const currAnswersFingerprint = createAnswersFingerprint(currState.guidedAnswers);

      const isValid = 
        mountedRef.current === true &&
        currState.status === 'DIRECTION_SELECTION' &&
        currState.productAsset?.id === startProductAssetId &&
        currState.productProfile?.productAssetId === startProfileAssetId &&
        currAnswersFingerprint === startAnswersFingerprint &&
        currState.selectedDirectionId === startSelectedDirectionId;

      if (!isValid) return;

      console.error('Failed to create recipe:', err);
      
      let errorMsg = '生成配方失败，请重试';
      if (err.message) {
        if (err.message.includes('当前产品与场景规划数据不一致') || err.code === 'PRODUCT_ASSET_MISMATCH') {
          errorMsg = err.message;
        } else if (err.code === 'GEMINI_RECIPE_PARSE_FAILED') {
          errorMsg = '生成配方失败：模型生成的格式不符合要求，请重试';
        } else {
          errorMsg += `: ${err.message}`;
        }
      }

      projectStore.updateState(() => ({
        recipeRequestStatus: 'error',
        recipeError: errorMsg
      }));
      setErrorMessage({ message: errorMsg, retryable: true });
    } finally {
      if (requestId === recipeRequestIdRef.current) {
        recipeSubmitLockRef.current = false;
        setLoading(false);
      }
    }
  };

  const handleGoToExternalGeneration = () => {
    projectStore.goToExternalGeneration();
  };

  const handleBackToGeneration = () => {
    projectStore.goToExternalGeneration();
  };

  const handleImportSceneAsset = (asset: ProjectState['sceneAsset']) => {
    if (asset) projectStore.importSceneAsset(asset);
  };

  const handleIgnoreIssue = (issueId: string) => {
    projectStore.ignoreMatchIssue(issueId);
  };

  const handleUnignoreIssue = (issueId: string) => {
    projectStore.unignoreMatchIssue(issueId);
  };

  const handleApplyConfirmedPatch = (params: { issueIds: string[]; confirmed: boolean }) => {
    try {
      projectStore.applyConfirmedRecipePatch(params);
      const newVer = projectStore.getState().activeVersion;
      setPatchSuccessMessage(`已创建 Recipe V${newVer}，请重新复制提示词并生成空场景。`);
      setShowHistory(false);
    } catch (err: any) {
      setErrorMessage({ message: err.message || '采纳建议失败', retryable: false });
    }
  };

  const handleRollback = (version: number) => {
    try {
      projectStore.rollbackToVersion(version);
      setPatchSuccessMessage(`已恢复到 Recipe V${version}，当前场景和预览已被清除，请重新复制提示词生成场景。`);
      setShowHistory(false);
    } catch (err: any) {
      setErrorMessage({ message: err.message || '恢复版本失败', retryable: false });
    }
  };

  const handleChangeSceneDirection = () => {
    invalidateRecipeRequest();
    projectStore.changeSceneDirection();
    setPatchSuccessMessage(null);
    setShowHistory(false);
  };

  const handleRefreshDirections = async () => {
    if (!state.productProfile) return;
    setLoading(true);
    invalidateRecipeRequest();
    setSceneDirectionsRequestStatus('loading');
    setSceneDirectionsError(null);
    setErrorMessage(null);
    // Removed transitionTo to avoid invalid state before fetching directions
    // projectStore.transitionTo('DIRECTION_SELECTION');
    
    const requestId = ++sceneDirectionsRequestIdRef.current;
    const initialAssetId = state.productAsset?.id;
    const initialProfileAssetId = state.productProfile?.productAssetId;
    const initialFingerprint = createAnswersFingerprint(state.guidedAnswers);

    try {
      const adapter = new RealAdapter();
      const directions = await adapter.planSceneDirections({
        productProfile: state.productProfile,
        guidedAnswers: state.guidedAnswers,
      });

      const currentState = projectStore.getState();
      const currentAssetId = currentState.productAsset?.id;
      const currentProfileAssetId = currentState.productProfile?.productAssetId;
      const currentFingerprint = createAnswersFingerprint(currentState.guidedAnswers);

      if (
        mountedRef.current &&
        requestId === sceneDirectionsRequestIdRef.current &&
        currentAssetId === initialAssetId &&
        currentProfileAssetId === initialProfileAssetId &&
        currentFingerprint === initialFingerprint
      ) {
        projectStore.setSceneDirections(directions);
        projectStore.selectDirection('');
        setSceneDirectionsRequestStatus('success');
        await projectStore.persistToDB();
        await refreshSavedProjects();
      } else {
      }
    } catch (err: any) {
      console.error('planSceneDirections failed during refresh:', err);
      const currentState = projectStore.getState();
      const currentAssetId = currentState.productAsset?.id;
      const currentProfileAssetId = currentState.productProfile?.productAssetId;
      const currentFingerprint = createAnswersFingerprint(currentState.guidedAnswers);

      if (
        mountedRef.current &&
        requestId === sceneDirectionsRequestIdRef.current &&
        currentAssetId === initialAssetId &&
        currentProfileAssetId === initialProfileAssetId &&
        currentFingerprint === initialFingerprint
      ) {
        setSceneDirectionsRequestStatus('error');
        setSceneDirectionsError(err.message || '规划场景方向失败，请重试。');
      } else {
      }
    } finally {
      const currentState = projectStore.getState();
      const currentAssetIdFinally = currentState.productAsset?.id;
      const currentProfileAssetIdFinally = currentState.productProfile?.productAssetId;
      const currentFingerprintFinally = createAnswersFingerprint(currentState.guidedAnswers);
      
      if (
        mountedRef.current &&
        requestId === sceneDirectionsRequestIdRef.current &&
        currentAssetIdFinally === initialAssetId &&
        currentProfileAssetIdFinally === initialProfileAssetId &&
        currentFingerprintFinally === initialFingerprint
      ) {
        setLoading(false);
      }
    }
  };

  const handleBackToQuestions = () => {
    invalidateRecipeRequest();
    projectStore.transitionTo('GUIDED_QUESTIONS');
  };

  const handleGoToTemplateSelection = () => {
    if (state.templateLibrary.length === 0) {
      projectStore.setTemplateLibrary(MOCK_TEMPLATES);
    }
    projectStore.goToTemplateSelection();
  };

  const handleSelectTemplateSuite = (id: string) => {
    projectStore.selectTemplateSuite(id);
  };

  const handleSelectTemplateVariant = (id: string) => {
    projectStore.selectTemplateVariant(id);
  };

  const handleConfirmTemplateSelection = async () => {
    try {
      projectStore.confirmTemplateSelection();
      await projectStore.persistToDB();
      await refreshSavedProjects();
    } catch (err: any) {
      setErrorMessage({ message: err.message || '确认模板失败', retryable: false });
    }
  };

  const handleSelectLayer = (layerId: string | null) => {
    projectStore.selectLayer(layerId);
  };

  const handleSetEditingMode = (mode: 'select' | 'move' | 'scale') => {
    projectStore.setCanvasEditingMode(mode);
  };

  const handleUpdateLayerTransform = async (layerId: string, transform: { x?: number; y?: number; scale?: number; rotate?: number }) => {
    projectStore.updateLayerTransform(layerId, transform);
    await projectStore.persistToDB();
    await refreshSavedProjects();
  };

  const handleUpdateLayerProperties = async (layerId: string, properties: { shadow?: boolean | string; opacity?: number; blendMode?: string; assetVersion?: number }) => {
    projectStore.updateLayerProperties(layerId, properties);
    await projectStore.persistToDB();
    await refreshSavedProjects();
  };

  const handleToggleLayerVisibility = async (layerId: string) => {
    projectStore.toggleLayerVisibility(layerId);
    await projectStore.persistToDB();
    await refreshSavedProjects();
  };

  const handleToggleLayerLock = async (layerId: string) => {
    projectStore.toggleLayerLock(layerId);
    await projectStore.persistToDB();
    await refreshSavedProjects();
  };

  const handleCreateRenderSnapshot = async () => {
    const snapshot = projectStore.createRenderSnapshot();
    await projectStore.persistToDB();
    await refreshSavedProjects();
    return snapshot;
  };

  const selectedSuite = state.templateLibrary.find(s => s.id === state.selectedTemplateSuiteId);

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header id="app-header" className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-600/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 id="app-title" className="text-xl font-bold tracking-tight text-slate-900 font-display">
                台历智能场景规划平台
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                智能多模态台历产品图分析与布景合成工具
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/60 font-mono">
              状态: {statusTranslations[state.status] || state.status}
            </span>
            {!showConfirmClear ? (
              <button
                id="btn-clear"
                onClick={() => setShowConfirmClear(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all"
              >
                <Trash2 className="w-4 h-4" />
                清空当前项目
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-medium">确认清空？</span>
                <button
                  id="btn-confirm-clear"
                  onClick={async () => {
                    await handleClear();
                    setShowConfirmClear(false);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all"
                >
                  确认
                </button>
                <button
                  id="btn-cancel-clear"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className={`${(state.status === 'PRODUCTION_READY' || state.status === 'TEMPLATE_SELECTION') ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-6 py-8 transition-all duration-300`}>
        <div className="flex flex-col gap-6">
          {patchSuccessMessage && (
            <div id="patch-success-banner" className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl p-4 flex justify-between items-start gap-3 shadow-xs">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 text-sm">更新成功</p>
                  <p className="mt-1 text-emerald-700 leading-relaxed">{patchSuccessMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setPatchSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-800 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {state.status === 'ANALYZING_PRODUCT' ? (
              /* ANALYZING STATE */
              <motion.div
                key="analyzing"
                id="analyzing-screen"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center flex flex-col items-center justify-center gap-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
                  </span>
                </div>
                <div className="max-w-md">
                  <h3 id="analyzing-title" className="text-lg font-bold text-slate-900 mb-2">
                    台历智能分析中...
                  </h3>
                  <p id="analyzing-subtitle" className="text-sm text-slate-500 leading-relaxed">
                    正在深度分析台历的物理结构、底座特征、画面视角透视、主体材质反射系数及自然光源分布，请稍候。该过程通常需要 5-15 秒。
                  </p>
                </div>
                <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    className="bg-indigo-600 h-1.5 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "90%" }}
                    transition={{ duration: 10, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 font-mono tracking-wider">
                  STATUS: PROCESSING_VIA_GEMINI_MODEL
                </span>
              </motion.div>
            ) : state.status === 'PRODUCT_REVIEW' ? (
              /* PRODUCT_REVIEW STATE */
              <motion.div
                key="review"
                id="review-screen"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500" />
                      大模型多模态智能分析报告
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      分析时间：{state.productProfile?.analyzedAt ? new Date(state.productProfile.analyzedAt).toLocaleString('zh-CN') : '暂无'}
                    </p>
                  </div>
                  {state.productProfile && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                      state.productProfile.overallConfidence === 'high' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : state.productProfile.overallConfidence === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      置信度：{confidenceMapping[state.productProfile.overallConfidence] || state.productProfile.overallConfidence}
                    </span>
                  )}
                </div>

                {state.productProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Image Preview */}
                    <div className="md:col-span-5 flex flex-col gap-3">
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden aspect-square bg-checkerboard flex items-center justify-center p-4 shadow-inner">
                        <img
                          src={localPreviewUrl || ''}
                          alt={state.productAsset?.name || '产品图'}
                          className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-sm pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
                        <p className="font-semibold text-slate-700 mb-1">台历实况视角参考</p>
                        <p>该视图已锁定，作为大模型布景和透视融合计算的标准输入基准。</p>
                      </div>
                    </div>

                    {/* Right Column: Attribute Bento Grid */}
                    <div className="md:col-span-7 flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Box 1: 产品与支架 */}
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">产品基础结构</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">产品类型</span>
                              <span className="font-semibold text-slate-800">{productTypeMappping[state.productProfile.productType] || state.productProfile.productType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">支架类型</span>
                              <span className="font-semibold text-slate-800">{bracketTypeMapping[state.productProfile.bracketType] || state.productProfile.bracketType}</span>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: 视角和可见度 */}
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">视角与可见性</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">产品视角</span>
                              <span className="font-semibold text-slate-800">{viewClassMapping[state.productProfile.view.class] || state.productProfile.view.class}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">透视强度</span>
                              <span className="font-semibold text-slate-800">
                                {state.productProfile.view.perspectiveStrength === 'high' ? '强透视' :
                                 state.productProfile.view.perspectiveStrength === 'medium' ? '中等透视' : '弱透视'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Box 3: 顶部与侧面可见性 */}
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">局部特征可见</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">顶部表面</span>
                              <span className="font-semibold text-slate-800">{visibleLevelMapping[state.productProfile.view.visibleTop] || state.productProfile.view.visibleTop}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">侧面表面</span>
                              <span className="font-semibold text-slate-800">{visibleLevelMapping[state.productProfile.view.visibleSide] || state.productProfile.view.visibleSide}</span>
                            </div>
                          </div>
                        </div>

                        {/* Box 4: 既有光源 */}
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">既有环境光源</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">光源方向</span>
                              <span className="font-semibold text-slate-800">{lightDirectionMapping[state.productProfile.existingLighting.direction] || state.productProfile.existingLighting.direction}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">光源色温</span>
                              <span className="font-semibold text-slate-800">{lightTemperatureMapping[state.productProfile.existingLighting.temperature] || state.productProfile.existingLighting.temperature}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Box 5: 材质与反射、色温硬度 */}
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">表面材质与既有光影细节</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-500 block mb-0.5">主体材质</span>
                              <span className="font-semibold text-slate-800">
                                {state.productProfile.materials.map(m => `${materialMapping[m.name] || m.name} (${reflectivityMapping[m.reflectivity] || m.reflectivity})`).join('、')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block mb-0.5">色彩边缘亮度</span>
                              <span className="font-semibold text-slate-800">{edgeBrightnessMapping[state.productProfile.palette.edgeBrightness] || state.productProfile.palette.edgeBrightness}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-500 block mb-0.5">光影软硬度</span>
                              <span className="font-semibold text-slate-800">{lightSoftnessMapping[state.productProfile.existingLighting.softness] || state.productProfile.existingLighting.softness}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block mb-0.5">画面对比度</span>
                              <span className="font-semibold text-slate-800">{lightContrastMapping[state.productProfile.existingLighting.contrast] || state.productProfile.existingLighting.contrast}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Box 6: 色彩分布 */}
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">主色系分布</h4>
                        <div className="flex flex-wrap gap-2">
                          {state.productProfile.palette.dominant.map((color, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200/60 px-2 py-1 rounded-lg">
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-inner" style={{ backgroundColor: color }} />
                              <span className="text-[11px] font-mono font-semibold text-slate-600">{color}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">未能成功读取分析数据。</div>
                )}

                {/* Uncertainties Area */}
                {state.productProfile && (
                  <div className="border-t border-slate-100 pt-5 mt-2">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      分析置信度与不确定性说明
                    </h4>
                    {state.productProfile.uncertainties && state.productProfile.uncertainties.length > 0 ? (
                      <div className="space-y-2.5">
                        {state.productProfile.uncertainties.map((item, idx) => (
                          <div key={idx} className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs flex gap-3 items-start">
                            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-900">
                                  {item.field === 'productType' ? '产品类型' :
                                   item.field === 'bracketType' ? '支架类型' :
                                   item.field === 'view' ? '视角分类' :
                                   item.field === 'materials' ? '材质特征' :
                                   item.field === 'palette' ? '色彩分布' :
                                   item.field === 'existingLighting' ? '既有光源' : item.field}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                  {confidenceMapping[item.confidence] || item.confidence}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-600 leading-relaxed">{item.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50/60 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>大模型在各项属性提取中表现出高水平的一致度，未标注任何偏离项。</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Notice if confirmed */}
                {isConfirmed && (
                  <motion.div
                    id="confirmed-notice"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm flex items-start gap-3 mt-2"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">分析结果已确认</p>
                      <p className="mt-0.5 opacity-90">该产品的物理几何属性及光源配置已成功绑定，并持久化写入数据库中！</p>
                    </div>
                  </motion.div>
                )}

                {/* Actions Footer */}
                <div className="border-t border-slate-100 pt-5 flex flex-wrap justify-between items-center gap-4 mt-2">
                  <div className="flex gap-3">
                    <button
                      id="btn-replace"
                      onClick={handleClear}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                      替换产品
                    </button>
                    <button
                      id="btn-reanalyze"
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-400" />
                      重新分析
                    </button>
                  </div>
                  <button
                    id="btn-confirm-review"
                    onClick={handleContinueToQuestions}
                    disabled={loading || !state.productProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        正在规划...
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        继续规划场景
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : state.status === 'GUIDED_QUESTIONS' ? (
              /* GUIDED_QUESTIONS STATE */
              <motion.div
                key="guided-questions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GuidedQuestionsPanel
                  questions={state.guidedQuestions || []}
                  answers={state.guidedAnswers}
                  onAnswerSelect={handleAnswerSelect}
                  onAdoptRecommendations={handleAdoptRecommendations}
                  onSubmit={handleSubmitAnswers}
                  loading={loading}
                  error={guidedQuestionsError}
                  sceneDirectionsError={sceneDirectionsError}
                  onRetry={handleRetryQuestions}
                  onBackToReview={handleBackToReview}
                />
              </motion.div>
            ) : state.status === 'DIRECTION_SELECTION' ? (
              /* DIRECTION_SELECTION STATE */
              <motion.div
                key="direction-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <SceneDirectionPanel
                  directions={state.sceneDirections || []}
                  selectedDirectionId={state.selectedDirectionId}
                  onDirectionSelect={handleDirectionSelect}
                  onConfirmDirection={handleConfirmDirection}
                  onRefreshDirections={handleRefreshDirections}
                  onBackToQuestions={handleBackToQuestions}
                  loading={loading}
                  error={sceneDirectionsError || errorMessage?.message || null}
                />
              </motion.div>
            ) : state.status === 'RECIPE_READY' ? (
              <RecipeReadyView
                recipe={state.sceneRecipe!}
                promptDocument={state.promptDocument!}
                selectedDirection={
                  state.sceneDirections?.find(d => d.id === state.selectedDirectionId)
                }
                onGoToExternalGeneration={handleGoToExternalGeneration}
              />
            ) : state.status === 'AWAITING_EXTERNAL_GENERATION' ? (
              <ExternalGenerationPanel
                prompt={state.promptDocument!}
                recipeId={state.sceneRecipe!.recipeId}
                recipeVersion={state.sceneRecipe!.version}
                productAssetId={state.productAsset!.id}
                onImport={handleImportSceneAsset}
                onError={(msg) => setErrorMessage({ message: msg, retryable: false })}
              />
            ) : (state.status === 'PREVIEW_IMPORTED' || state.status === 'NEEDS_REVISION' || state.status === 'APPROVED') ? (
              <div className="flex flex-col gap-6">
                <ProductScenePreview
                  productAsset={state.productAsset!}
                  sceneAsset={state.sceneAsset!}
                  recipe={state.sceneRecipe!}
                  onReplaceScene={handleGoToExternalGeneration}
                  onBackToGeneration={handleBackToGeneration}
                  onOverlayGenerated={setOverlayPreviewRef}
                />
                {showHistory ? (
                  <RecipeVersionHistoryPanel
                    recipeVersions={state.recipeVersions || []}
                    activeVersion={state.activeVersion}
                    sceneDirections={state.sceneDirections}
                    onRollback={handleRollback}
                    onClose={() => setShowHistory(false)}
                  />
                ) : state.matchReport ? (
                  <MatchReportPanel
                    report={state.matchReport}
                    status={state.matchRequestStatus || 'idle'}
                    error={state.matchError || null}
                    ignoredMatchIssueIds={state.ignoredMatchIssueIds || []}
                    activeVersion={state.activeVersion}
                    onIgnoreIssue={handleIgnoreIssue}
                    onUnignoreIssue={handleUnignoreIssue}
                    onApplyConfirmedPatch={handleApplyConfirmedPatch}
                    onShowHistory={() => setShowHistory(true)}
                    onBackToPreview={handleBackToGeneration}
                    onChangeDirection={handleChangeSceneDirection}
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4">
                    <p className="text-sm text-slate-600">产品台历与生成场景的空间一致性需要进行智能匹配分析</p>
                    <button
                      onClick={handleAnalyzeMatch}
                      disabled={state.matchRequestStatus === 'loading'}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {state.matchRequestStatus === 'loading' ? '正在分析匹配...' : '分析产品与场景匹配'}
                    </button>
                  </div>
                )}
                {state.status === 'APPROVED' && (
                  <div className="flex justify-center mt-4 gap-4">
                    <span className="text-sm text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                      项目已成功审核通过
                    </span>
                    <button
                      onClick={() => projectStore.transitionTo('TEMPLATE_SELECTION')}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm cursor-pointer"
                    >
                      选择生产模板
                    </button>
                  </div>
                )}
                {state.status === 'PREVIEW_IMPORTED' && state.matchReport && state.matchReport.productSceneStatus === 'pass' && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => projectStore.approveProject()}
                      className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm cursor-pointer"
                    >
                      通过场景验证
                    </button>
                  </div>
                )}
              </div>
            ) : state.status === 'TEMPLATE_SELECTION' ? (
              <motion.div
                key="template-selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <TemplateGallery
                  templates={state.templateLibrary}
                  selectedSuiteId={state.selectedTemplateSuiteId}
                  onSelectSuite={handleSelectTemplateSuite}
                  onConfirm={handleConfirmTemplateSelection}
                />
                
                {selectedSuite && (
                  <TemplateDetailView
                    suite={selectedSuite}
                    selectedVariantId={state.selectedTemplateVariantId}
                    onSelectVariant={handleSelectTemplateVariant}
                  />
                )}
              </motion.div>
            ) : state.status === 'PRODUCTION_READY' ? (
              <ProductionWorkspace
                state={state}
                onSelectLayer={handleSelectLayer}
                onSetEditingMode={handleSetEditingMode}
                onUpdateLayerTransform={handleUpdateLayerTransform}
                onUpdateLayerProperties={handleUpdateLayerProperties}
                onToggleLayerVisibility={handleToggleLayerVisibility}
                onToggleLayerLock={handleToggleLayerLock}
                onCreateRenderSnapshot={handleCreateRenderSnapshot}
                onBackToTemplateSelection={handleGoToTemplateSelection}
              />
            ) : state.status === 'EMPTY' ? (
              /* EMPTY STATE */
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
                  {/* Title Header */}
                  <div className="text-center max-w-2xl mx-auto space-y-3">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[11px] uppercase rounded-full tracking-wider border border-indigo-100">
                      台历智能场景规划平台
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      台历智能场景规划平台
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      上传真实台历透明产品图，AI 将分析产品结构、视角、材质和现有光线，并自动规划适合的空场景、构图与风格，生成可复制的中文提示词和 JSON。
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-6 space-y-6">
                    {/* Project Name input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        项目名称（可选）
                      </label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="请输入台历智能场景规划项目名..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                      />
                    </div>

                    {/* Upload Box */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        导入产品图片资产
                      </label>
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                        className={`relative group border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                          dragActive 
                            ? 'border-indigo-500 bg-indigo-50/50' 
                            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                        />

                        <div className="flex flex-col items-center gap-3">
                          <div className={`p-4 rounded-full transition-colors ${
                            dragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'
                          }`}>
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              拖拽产品图片文件至此，或点击浏览
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                              支持透明背景 PNG、JPG、WebP 格式，最大支持 10MB。支持拖拽或直接 Ctrl+V 粘贴文件上传。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Demo asset quick launch section */}
                {true && (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                      演示数据
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800">没有透明背景 PNG 台历？</h4>
                      <p className="text-[10px] text-slate-400">一键导入系统内置台历真实资产与背景，全速体验完整 AI 场景规划分析！</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (loading) return;
                        setLoading(true);
                        setErrorMessage(null);
                        try {
                          const res = await fetch('/public/mock-assets/product-demo.png');
                          const blob = await res.blob();
                          const file = new File([blob], 'product-demo.png', { type: 'image/png' });
                          
                          // Process file
                          const analysis = await analyzeImageFile(file);
                          const assetId = `prod-asset-${Date.now()}`;
                          await saveAsset(assetId, file);
                          const productAsset = {
                            id: assetId,
                            name: file.name,
                            mimeType: analysis.mimeType,
                            width: analysis.width,
                            height: analysis.height,
                            hasAlpha: analysis.hasAlpha,
                            persistedAssetRef: assetId,
                            createdAt: new Date().toISOString(),
                          };
                          
                          const url = URL.createObjectURL(file);
                          setLocalPreviewUrl(url);
                          
                          // Update store state with customized project name & selected product type
                          projectStore.updateState(s => ({
                            name: projectName,
                            productAsset: productAsset,
                            status: 'PRODUCT_IMPORTED'
                          }));
                          await projectStore.persistToDB();

                          // Auto trigger analyze!
                          projectStore.transitionTo('ANALYZING_PRODUCT');
                          const adapter = new RealAdapter();
                          const profile = await adapter.analyzeProduct({ productAsset });
                          
                          // Set profile and proceed
                          projectStore.setProductProfile(profile);
                          await projectStore.persistToDB();
                          await refreshSavedProjects();
                        } catch (err: any) {
                          // Preserve the imported product and transition to PRODUCT_IMPORTED state to allow retry
                          try {
                            projectStore.transitionTo('PRODUCT_IMPORTED');
                          } catch (e) {}

                          let userFriendlyMessage = err.message || '导入及分析演示产品失败，请重试。';
                          if (err.code === 'TIMEOUT' || /timeout/i.test(err.message) || /超时/i.test(err.message)) {
                            userFriendlyMessage = '分析演示产品服务请求超时（120秒超时限制），请检查网络后重试。';
                          } else if (err.code === 'GEMINI_QUOTA_EXHAUSTED' || err.code === 'RATE_LIMIT' || err.status === 429 || /429|resource_exhausted/i.test(err.message)) {
        userFriendlyMessage = '当前项目的 Gemini 免费请求额度已达到上限，请稍后重试或检查项目额度。';
                          } else if (err.code === 'SERVICE_UNAVAILABLE' || err.status === 503 || /503|service_unavailable/i.test(err.message)) {
                            userFriendlyMessage = '大模型服务暂时不可用（503 Service Unavailable），请稍后重试。';
                          } else if (err.code === 'GATEWAY_TIMEOUT' || err.status === 504 || /504/i.test(err.message)) {
                            userFriendlyMessage = '网关超时（504 Gateway Timeout），大模型无响应，请重试。';
                          }

                          setAnalyzingError({
                            message: userFriendlyMessage,
                            retryable: typeof err.retryable === 'boolean' ? err.retryable : true,
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/10 hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50 animate-pulse"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      导入内置真实台历并一键 AI 分析 (演示数据)
                    </button>
                  </div>
                )}

                {/* Error Alert Panel */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-sm flex items-start gap-3"
                    >
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">操作错误</p>
                        <p className="mt-0.5 opacity-90">{errorMessage.message}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : state.status === 'PRODUCT_IMPORTED' ? (
              /* PRODUCT_IMPORTED STATE */
              <motion.div
                key="product-imported-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6"
              >
                <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  已导入台历资产与规格检测
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  {/* Left Column: checkerboard product image preview */}
                  <div className="md:col-span-5 flex flex-col gap-4">
                    <div className="relative border border-slate-200 rounded-2xl overflow-hidden aspect-square bg-checkerboard flex items-center justify-center p-4 shadow-inner">
                      {localPreviewUrl ? (
                        <img
                          src={localPreviewUrl}
                          alt={state.productAsset?.name || '产品图'}
                          className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-slate-400 text-xs">暂无预览</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                      替换产品
                    </button>
                  </div>

                  {/* Right Column: details, risk warning, and primary button */}
                  <div className="md:col-span-7 space-y-6">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3.5 text-xs text-slate-600">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                        <span className="text-slate-400 font-medium">产品文件名</span>
                        <span className="font-bold text-slate-800 font-mono truncate max-w-[220px]">
                          {state.productAsset?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                        <span className="text-slate-400 font-medium">图像物理尺寸</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {state.productAsset?.width} × {state.productAsset?.height} px
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                        <span className="text-slate-400 font-medium">文件格式</span>
                        <span className="font-bold text-slate-800 uppercase">
                          {state.productAsset?.mimeType.replace('image/', '')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">透明度检测 (Alpha)</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          state.productAsset?.hasAlpha 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {state.productAsset?.hasAlpha ? '包含透明 Alpha 通道' : '不包含透明通道'}
                        </span>
                      </div>
                    </div>

                    {/* Risk Warning Box */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">规格与质量检测</h4>
                      {state.productAsset && (
                        <div className="p-4 rounded-xl border text-xs leading-relaxed">
                          {!state.productAsset.hasAlpha ? (
                            <div className="flex gap-2.5 text-amber-800 bg-amber-50/50 border-amber-100">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p>
                                <strong>⚠️ 警告：不包含透明通道 (Alpha)</strong>
                                <br />
                                检测到该图片背景不透明。在后续的多模态空间计算与布景合成中，可能残留白色或原有背景杂色。强烈建议使用已经过精准抠图的 32-bit 透明背景 PNG。
                              </p>
                            </div>
                          ) : state.productAsset.mimeType !== 'image/png' ? (
                            <div className="flex gap-2.5 text-blue-800 bg-blue-50/50 border-blue-100">
                              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                              <p>
                                <strong>💡 提示：非标准 PNG 格式</strong>
                                <br />
                                当前文件为 WebP/JPEG。虽支持导入，但使用透明背景的高分辨率 PNG 格式能获得更加精确的视角特征与材质反射率分析。
                              </p>
                            </div>
                          ) : (state.productAsset.width < 500 || state.productAsset.height < 500) ? (
                            <div className="flex gap-2.5 text-amber-800 bg-amber-50/50 border-amber-100">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p>
                                <strong>⚠️ 建议：分辨率偏低</strong>
                                <br />
                                图像尺寸（{state.productAsset.width}x{state.productAsset.height} px）低于 500px。低分辨率可能会导致材质纹理与光线投影识别产生轻微偏差。
                              </p>
                            </div>
                          ) : (
                            <div className="flex gap-2.5 text-emerald-800 bg-emerald-50/50 border-emerald-100">
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <p>
                                <strong>✅ 检测通过：资产规格优良</strong>
                                <br />
                                高分辨率透明背景 PNG 资产，无任何通道缺陷，物理透视边界清晰，已准备好进行多模态空间透视与光线配比计算。
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Error display if previous run failed */}
                    {analyzingError && (
                      <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-sm flex flex-col gap-2 shadow-xs">
                        <div className="flex items-start gap-2.5">
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">智能分析失败</p>
                            <p className="mt-0.5 text-xs opacity-90">{analyzingError.message}</p>
                          </div>
                        </div>
                        {analyzingError.retryable && (
                          <div className="flex justify-end">
                            <button
                              id="btn-retry-analysis"
                              onClick={handleAnalyze}
                              disabled={loading}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              重新分析
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Start intelligence analysis button */}
                    <button
                      id="btn-analyze-start"
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          正在请求大模型多模态分析...
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          开始智能分析
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
