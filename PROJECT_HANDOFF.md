# 项目交接状态 (Project Handoff)

## 核心目标
这是一个供摄影师、设计师以及电商运营使用的产品空场景图 AI 生成匹配预览平台。当前处于 Phase 4-C 阶段的完善工作。

## 已完成阶段
- Phase 1: 需求对齐与脚手架搭建。
- Phase 2: Mock 产品分析阶段闭环。
- Phase 3: Gemini 提示词编译、服务端生成方向、Recipe，重构服务端架构。
- Phase 4-A: Server-side API 重构，使用 @google/genai 和 Express 中间件。
- Phase 4-B: MatchReport 完整定义与 Schema。
- Phase 4-C-1: Phase 1 到 Phase 4 之间的真实全链路整合与组件迁移。
- Phase 4-C-2: Match Report UI 和交互适配。
- Phase 4-C-3: 外部空场景导入、确定性产品叠加预览与统一 MatchReport 链路最终修复。

## 当前系统关键结构
唯一正式结构：
- `SceneAssetSchema`: 包含场景图属性与 IndexedDB `persistedAssetRef` 和内容哈希。
- `AnalyzeMatchInputSchema`: 包含 productAsset、sceneAsset、overlayPreviewRef、sceneRecipe、promptDocument。
- `MatchReportSchema`: Gemini 返回的结构化报告，含 issues, pass, suggestedPatch。
- `ProductScenePreview`: 纯视觉产品叠加图预览。
- `MatchReportPanel`: 匹配报告展示。
- `/api/ai/analyze-match`: 唯一匹配分析后端接口。

## 待完成工作
- Phase 4-C-4: 基于 MatchReport 的 RecipePatch 采纳、忽略、版本创建和恢复最终整合。

## 历史遗留概念与弃用
已删除如下旧概念与功能实现：
- `SceneMatchReportView`, `IMAGE_IMPORTED`, `MATCH_ANALYZING`, `MATCH_READY` 状态弃用。
- 旧分析接口 `/api/ai/analyze-scene-match` 弃用。
- Mock / Gemini 用户界面切换弃用。
- 雷达图、下载修复包、自动修正 Prompt 弃用。
- 下一步 Canvas 编辑器、RunningHub 集成、光影融合弃用。

