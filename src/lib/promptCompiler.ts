import { SceneRecipe, PromptDocument } from '../types/schemas';

// ============================================================================
// Deterministic Enum and Code Translation Dictionaries (简体中文)
// ============================================================================

const PRODUCT_TYPE_MAP: Record<string, string> = {
  desk_calendar: '台历',
  wall_calendar: '挂历',
  packaging: '包装盒',
  combination: '组合装',
  unknown: '未知产品',
};

const BRACKET_TYPE_MAP: Record<string, string> = {
  paper_base: '纸质三角架底座',
  metal_frame: '金属框架框架',
  acrylic_frame: '亚克力框架支架',
  wood_base: '实木质感底座',
  other: '其他类型支架',
  unknown: '未知材质支架',
};

const VIEW_CLASS_MAP: Record<string, string> = {
  front: '正视视角（正面平行对齐机位）',
  front_left: '左前侧视视角（约30度-45度左侧偏转机位）',
  front_right: '右前侧视视角（约30度-45度右侧偏转机位）',
  slight_top: '轻度俯拍视角（低角度微下倾俯视）',
  high_top: '高角度俯拍视角（大角度鸟瞰式俯视）',
  unknown: '未知物理透视视角',
};

const VIEW_VISIBLE_TOP_MAP: Record<string, string> = {
  none: '完全不可见（完全平行齐平）',
  low: '微弱可见（超低倾角可见）',
  medium: '中等程度可见',
  high: '高度清晰可见（大面倾斜展现）',
  unknown: '不确定是否可见',
};

const VIEW_VISIBLE_SIDE_MAP: Record<string, string> = {
  none: '完全不可见（纯正视正面）',
  left: '仅左侧面清晰可见',
  right: '仅右侧面清晰可见',
  both: '双侧面皆有立体透视可见',
  unknown: '不确定侧面可见性',
};

const COMPOSITION_PURPOSE_MAP: Record<string, string> = {
  hero: '单品商业主视觉KV图',
  side_structure: '结构美学侧重展示图',
  multi_product: '多单品高低错落组合构图',
  product_packaging: '单品与配套精装礼盒包装组合展示',
  detail: '微距局部工艺细节特写图',
  usage_scene: '真实美学生活空间使用场景展示',
  copy_space: '商业设计留白构图（专为预留广告语及大标题设计）',
};

const COMPOSITION_POSITION_MAP: Record<string, string> = {
  center: '画面的正中心黄金分割点位置',
  center_left: '画面中轴线偏左区域',
  center_right: '画面中轴线偏右区域',
  lower_left: '画面的左下侧前景台面',
  lower_right: '画面的右下侧前景台面',
};

const CAMERA_HEIGHT_MAP: Record<string, string> = {
  low: '低矮机位仰拍（突显空间张力与产品挺拔感）',
  near_eye_level: '标准平视机位（模拟人眼自然审视高度）',
  slightly_high: '微高位俯拍（带有轻微设计视线俯角）',
  high: '高机位深俯拍（展现桌面陈设整体透视与格局）',
};

const FRAMING_MAP: Record<string, string> = {
  close: '特写/近景构图（紧凑对焦，突出台面材质与装饰细节）',
  medium: '中景构图（经典商业静物摄影画幅，主体与背景比例极佳）',
  wide: '全景/广角构图（涵盖丰富室内空间及背景环境，留存广阔视觉意境）',
};

const LIGHTING_SOURCE_TYPE_MAP: Record<string, string> = {
  window: '自然侧窗光（带出富有生命感的窗影与季节感）',
  large_softbox: '影棚级专业大柔光箱（塑造纯净、无杂质的商业柔和渐变漫反射）',
  diffuse_interior: '室内漫反射无方向环境光（柔美均匀无明显耀光强反差环境）',
};

const LIGHTING_SOURCE_POSITION_MAP: Record<string, string> = {
  upper_left: '画面左上方45度角切入',
  upper_right: '画面右上方45度角切入',
  front: '正面偏上微倾斜柔和直射',
  top: '顶部垂直向下柔和泻落',
};

const LIGHTING_TEMPERATURE_MAP: Record<string, string> = {
  cool: '高级清冷冷色调（约5500K-6000K，现代科技与静谧空间感）',
  neutral: '中性平衡自然光（约5000K，高还原度纯净商业日光）',
  neutral_warm: '优雅温馨微暖色温（约4000K-4500K，自然舒适居家美学氛围）',
  warm: '温暖怡人金色暖光（约3000K-3500K，晨曦或夕阳温煦调性）',
};

const LIGHTING_SOFTNESS_MAP: Record<string, string> = {
  hard: '强直射硬光（投影边缘极其锐利清晰，高对比度光斑，戏剧反差感）',
  medium: '标准过渡半柔和光（明暗交界线清晰但带有优雅渐变羽化）',
  soft: '极度柔和漫射光（投影边缘完全羽化消散，无生硬边界，过渡浑然一体）',
};

const LIGHTING_CONTRAST_MAP: Record<string, string> = {
  low: '低反差（柔润、多漫反射、整体亮度分布均匀平缓）',
  medium: '标准对比度（高光与阴影过渡层级丰富自然）',
  high: '高对比度（高光清脆，暗部深邃，富于艺术感戏剧张力）',
};

const SHADOW_DIRECTION_MAP: Record<string, string> = {
  rear_left: '向左后方45度自然柔和延伸并消逝',
  rear_right: '向右后方45度自然柔和延伸并消逝',
  behind: '平缓投射至正后方台面及背景墙',
  soft_diffuse: '多向漫反射均匀淡化（无单一显著投影影子）',
};

const COPY_SPACE_MAP: Record<string, string> = {
  none: '无需大面积预留留白',
  left: '画面的左半部分预留大面积纯净空气感留白空间',
  right: '画面的右半部分预留大面积纯净空气感留白空间',
  top: '画面上部区域预留空气感留白空间',
  upper_half: '画面上半部分（桌面以上背景区）完全净空留白',
};

const DECORATION_DENSITY_MAP: Record<string, string> = {
  minimal: '极简主义陈设（仅1-2个高质感单品作为极简点缀，极度克制）',
  moderate: '中度适中陈设（元素比例协调，不凌乱不空旷，商业平衡）',
  rich: '丰富层次陈设（包含前景、中景、背景多重道具道具，充满生活美学烟火气）',
};

// ============================================================================
// Core Pure Function Prompt Compiler
// ============================================================================

export const COMPILER_VERSION = '1.0.0';

/**
 * Deterministically compiles a SceneRecipe into a PromptDocument.
 * This is a pure function. It produces identical output for identical SceneRecipe inputs.
 */
export function compilePrompt(recipe: SceneRecipe, createdAt?: string): PromptDocument {
  const profile = recipe.productProfileSnapshot;

  // 1. 任务与参考关系 (Task and References)
  const taskAndReferences = `【基础生图指令与定位】
- 任务：生成一个高品质、纯净的商业摄影级别【空场景背景（Empty scene background）】。
- 严禁生成：在画面中生成任何“台历”、“挂历”、“产品本体”、“包装盒子”、“人物手部”、“模特”、“任何文字、英文、标志、Logo或画作文字”。
- 物理对位约束：本生成的空背景图片将作为底层。请严格按照下方规划的物理机位、透视强度以及台面预留空间进行绘制，保证前景产品叠加时，透视逻辑完美贴合。`.trim();

  // 2. 产品匹配依据 (Product Matching)
  const dominantColors = profile.palette.dominant.length > 0
    ? profile.palette.dominant.join('、')
    : '未指定';
  
  const productMatching = `【前景待贴入产品之物理特征参考】
- 产品品类属性：${PRODUCT_TYPE_MAP[profile.productType] || '台历'}（支架结构：${BRACKET_TYPE_MAP[profile.bracketType] || '纸质三角底座'}）。
- 待贴入产品之相机视角：${VIEW_CLASS_MAP[profile.view.class] || '正视视角'}。
- 产品侧面可见度：${VIEW_VISIBLE_SIDE_MAP[profile.view.visibleSide] || '完全不可见'}。
- 产品顶面可见度：${VIEW_VISIBLE_TOP_MAP[profile.view.visibleTop] || '完全不可见'}。
- 产品透视感强度：${profile.view.perspectiveStrength === 'low' ? '微弱透视' : profile.view.perspectiveStrength === 'medium' ? '标准透视' : '强烈广角透视'}。
- 主体底座水平接触位置比例：X 坐标 [${profile.contactRegion.xStart}%] 至 [${profile.contactRegion.xEnd}%] 之间的台面上。
- 待贴入产品主色调属性：[${dominantColors}]。
- 产品原已有物理光影特征：方向[${profile.existingLighting.direction === 'upper_left' ? '左上方斜射光' : profile.existingLighting.direction === 'upper_right' ? '右上方斜射光' : '漫反射光'}]; 色温[${profile.existingLighting.temperature === 'cool' ? '冷色调' : profile.existingLighting.temperature === 'warm' ? '暖色调' : '中性色温'}]; 柔和度[${profile.existingLighting.softness === 'soft' ? '极柔和' : '中等软硬'}]; 对比度[${profile.existingLighting.contrast === 'high' ? '强对比' : '标准对比'}]。
* 注意事项：场景生成中，台面的透视、背景墙的消失点、桌面承托线的高度，必须契合本产品视角与接触线，以防后续贴合出现悬空或透视错位。`.trim();

  // 3. 场景与风格 (Scene and Style)
  const paletteStr = recipe.scene.palette.join('、');
  const sceneAndStyle = `【场景物理空间与设计风格】
- 空间类型：${recipe.scene.spaceType}
- 风格基调：${recipe.scene.style}
- 整体配色方案：${paletteStr}
- 墙面材质工艺：${recipe.scene.wallMaterial}
- 桌面/台面物理材质：${recipe.scene.desktopMaterial}
- 桌面/台面整体色彩：${recipe.scene.desktopTone}
- 室内环境陈设密度：${recipe.scene.furnitureDensity === 'low' ? '极简开阔，无大型多余家具' : recipe.scene.furnitureDensity === 'medium' ? '家具陈设适中，优雅有呼吸感' : '家具装饰丰富，营造饱满生活情境'}
- 场景整体照度深度：${recipe.scene.backgroundBrightness === 'dark' ? '深邃幽暗调性' : recipe.scene.backgroundBrightness === 'medium_dark' ? '偏暗低调沉稳' : recipe.scene.backgroundBrightness === 'medium' ? '标准室内舒适中性照度' : recipe.scene.backgroundBrightness === 'medium_light' ? '明亮通透清爽' : '极度透亮洁白调性'}`.trim();

  // 4. 镜头与构图 (Camera and Composition)
  const cameraAndComposition = `【静物摄影镜头与画幅构图】
- 商业拍摄意图：${COMPOSITION_PURPOSE_MAP[recipe.composition.purpose] || '商业宣传KV'}
- 前景空闲空间预留位置：${COMPOSITION_POSITION_MAP[recipe.composition.productPosition] || '画面的黄金分割位置'}
- 预留产品摆放宽度占比：前景台面约 ${recipe.composition.productWidthPercent}% 宽度的区域，请完全腾空，仅保留空旷物理台面，不可在此范围内绘制任何遮挡性装饰物
- 后期文字排版留白设计：${COPY_SPACE_MAP[recipe.composition.copySpace] || '无需留白'}
- 相机物理高度与倾角：${CAMERA_HEIGHT_MAP[recipe.composition.cameraHeight] || '标准平视机位'}
- 构图焦距与画幅：${FRAMING_MAP[recipe.composition.framing] || '标准中景'}
- 透视畸变强度控制：${recipe.composition.perspectiveStrength === 'low' ? '正焦长镜头，几乎无畸变，透视线平缓' : recipe.composition.perspectiveStrength === 'medium' ? '标准静物摄影镜头透视' : '中广角镜头，透视消失线陡峭深邃'}
- 桌面在垂直画面占比：前景台面在画面垂直高度上大约占据 ${recipe.composition.desktopVisiblePercent}% 的比例（承托线水平横向拉开）`.trim();

  // 5. 光线与装饰 (Lighting and Decoration)
  const allowedDecorations = recipe.decoration.allowed.join('、');
  const forbiddenDecorations = recipe.decoration.forbiddenNearProduct.length > 0
    ? recipe.decoration.forbiddenNearProduct.join('、')
    : '无限制';

  const lightingAndDecoration = `【灯光物理学与装饰细节】
- 场景主光源类型：${LIGHTING_SOURCE_TYPE_MAP[recipe.lighting.sourceType] || '侧窗光'}
- 主光源物理射入位置：${LIGHTING_SOURCE_POSITION_MAP[recipe.lighting.sourcePosition] || '左上方'}
- 主光源光线色温：${LIGHTING_TEMPERATURE_MAP[recipe.lighting.temperature] || '中性光'}
- 光影边缘软硬过渡：${LIGHTING_SOFTNESS_MAP[recipe.lighting.softness] || '极度羽化'}
- 画面明暗反差对比度：${LIGHTING_CONTRAST_MAP[recipe.lighting.contrast] || '标准反差'}
- 物理投影主要延伸方向：主高光及台面阴影倾斜[${SHADOW_DIRECTION_MAP[recipe.lighting.shadowDirection] || '向斜后方消散'}]
- 装饰摆件空间密度：${DECORATION_DENSITY_MAP[recipe.decoration.density] || '适中'}
- 场景中推荐出现的美学点缀物：[${allowedDecorations}]
- 产品主体周围预留区域绝对严禁出现的摆件：[${forbiddenDecorations}]
- 前景微虚化遮挡：${recipe.decoration.foregroundOcclusion ? '允许前景镜头前有少许轻微朦胧景深绿植虚化' : '严禁前景遮挡（保证底座到桌面接触点100%全透、清晰视界）'}`.trim();

  // 6. 输出限制 (Output Constraints)
  const excludeStr = recipe.output.exclude.join(', ');
  const inheritanceSection = recipe.inheritance
    ? `- 【系列一致性匹配锁定】：此场景属于正在规划的同风格系列（系列编号: ${recipe.inheritance.seriesId}，模式: ${recipe.inheritance.mode === 'same_space' ? '物理同空间多角度' : '视觉同调性'}，系列基准版本: V${recipe.inheritance.lockedSeriesVersion}）。请务必遵守该系列一贯的空间材质模态、采光白平衡、阴影边缘消散比，保持视觉连续性。`
    : '- 【无系列继承约束】：独立背景，允许按最高创意和美学自由生成。';

  const outputConstraints = `【生图模型渲染与负向输出约束】
- 图像宽高宽高比：${recipe.output.aspectRatio} （正向要求）
- 清晰度分级：${recipe.output.resolutionLabel}分辨率商业底图标准
- 画面照片写实属性：${recipe.output.realism === 'real_commercial_interior_photography' ? '真实的商业摄影级室内设计实景照片。严禁任何3D渲染感、偏塑料感模型、AI绘画塑料磨皮感、卡通、插画或概念设计笔触。' : '真实的商业室内实景摄影照片'}
- 负向提示严禁生成（Negative constraints）：${excludeStr}, calendar, book, paper holder, standing calendar, letters, text, watermark, signature, hands, person, hand, logo, bad proportions, distorted perspective
${inheritanceSection}`.trim();

  // 7. Full Prompt Concatenation
  const fullPrompt = `${taskAndReferences}

${productMatching}

${sceneAndStyle}

${cameraAndComposition}

${lightingAndDecoration}

${outputConstraints}`;

  // 8. Deterministic JSON compilation
  // We extract and sort key parameters to ensure exact reproducibility across renders
  const promptJsonObj = {
    recipeId: recipe.recipeId,
    version: recipe.version,
    task: {
      operation: recipe.task.operation,
      productRole: recipe.task.productRole,
      backgroundOnly: recipe.task.backgroundOnly,
    },
    scene: {
      spaceType: recipe.scene.spaceType,
      wallMaterial: recipe.scene.wallMaterial,
      desktopMaterial: recipe.scene.desktopMaterial,
      desktopTone: recipe.scene.desktopTone,
      backgroundBrightness: recipe.scene.backgroundBrightness,
      style: recipe.scene.style,
      palette: recipe.scene.palette,
      furnitureDensity: recipe.scene.furnitureDensity,
    },
    composition: {
      purpose: recipe.composition.purpose,
      productCount: recipe.composition.productCount,
      productPosition: recipe.composition.productPosition,
      productWidthPercent: recipe.composition.productWidthPercent,
      copySpace: recipe.composition.copySpace,
      cameraView: recipe.composition.cameraView,
      cameraHeight: recipe.composition.cameraHeight,
      framing: recipe.composition.framing,
      perspectiveStrength: recipe.composition.perspectiveStrength,
      desktopVisiblePercent: recipe.composition.desktopVisiblePercent,
    },
    lighting: {
      sourceType: recipe.lighting.sourceType,
      sourcePosition: recipe.lighting.sourcePosition,
      temperature: recipe.lighting.temperature,
      softness: recipe.lighting.softness,
      contrast: recipe.lighting.contrast,
      shadowDirection: recipe.lighting.shadowDirection,
    },
    decoration: {
      density: recipe.decoration.density,
      allowed: recipe.decoration.allowed,
      forbiddenNearProduct: recipe.decoration.forbiddenNearProduct,
      foregroundOcclusion: recipe.decoration.foregroundOcclusion,
    },
    output: {
      aspectRatio: recipe.output.aspectRatio,
      resolutionLabel: recipe.output.resolutionLabel,
      realism: recipe.output.realism,
      exclude: recipe.output.exclude,
    },
    ...(recipe.inheritance ? { inheritance: recipe.inheritance } : {}),
  };

  const fullJson = JSON.stringify(promptJsonObj, null, 2);

  const timestamp = createdAt || '2026-07-10T03:15:10-07:00';

  return {
    recipeId: recipe.recipeId,
    recipeVersion: recipe.version,
    compilerVersion: COMPILER_VERSION,
    sections: {
      taskAndReferences,
      productMatching,
      sceneAndStyle,
      cameraAndComposition,
      lightingAndDecoration,
      outputConstraints,
    },
    fullPrompt,
    fullJson,
    createdAt: timestamp,
  };
}
