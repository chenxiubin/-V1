# Project Handoff

## 1. 当前 Phase
Phase 4-C-1b (最终收口)

## 2. 已完成
- 彻底删除了 `createInitialRecipe` 并在测试中替换为合法的 `commitInitialRecipe` 调用。
- 修复了从 IndexedDB 恢复历史记录时，缺失 Prompt 时回退创建假 `temp-id` 的逻辑。现在通过调用真实的编译器 `compilePromptDocument` 恢复，编译失败则直接丢弃历史。
- 增加了对应的测试覆盖（敏感字符导致编译失败则回退到 `DIRECTION_SELECTION`）。
- 修补了 `phase4ClientState.test.tsx` 中的真实应用集成测试，不再通过调用 `projectStore.reset()` 清空应用，而是触发 UI 事件。
- 修复了 `App.tsx` 中 `invalidateRecipeRequest()` 没有重置 `loading` 状态导致请求返回后部分 UI 卡在禁用状态的问题。

## 3. 未完成
- Phase 4-C-2: `Phase4 Preview Layout Editor` 的迁移。

## 4. 实际修改文件
- `src/store/projectStore.ts` (移除 createInitialRecipe，重构 prompt 回退逻辑)
- `src/App.tsx` (修复 invalidateRecipeRequest 的 loading 状态)
- `src/test/projectStore.test.ts` (替换创建方法，新增自动编译与回退测试)
- `src/test/recipePatch.test.ts` (替换创建方法)
- `src/test/phase4ClientState.test.tsx` (增强真实的 App React Testing Library 交互测试)

## 5. 验收结果
- `createInitialRecipe` 搜索结果：0
- 假 Prompt fallback (`temp-id`) 搜索结果：0
- 真实清空测试：已通过 (`fireEvent.click('清空当前项目')`)
- 真实返回产品报告测试：已通过 (`fireEvent.click('返回分析报告')`)
- 同一 act 双击防抖测试：已通过
- 专项测试 / 全量测试：所有 Phase 4 和项目仓储的验证均以 100% 通过。

## 6. 真实命令结果
- TypeScript (`npx tsc --noEmit`): 通过
- Lint (`npm run lint`): 通过
- Build (`npm run build`): 通过
- Tests (`npm run test`): 成功

## 7. Gemini/Mock 状态
- 核心编译与重试逻辑全部采用真实的 `compilePromptDocument` 执行，且不调用真实网络。测试中依然使用 `MockAdapter` 进行数据层隔离。

## 8. 已知问题 (非阻断)
- 测试过程中会输出预期的 stderr 诊断日志（如 `Failed to persist to DB`）。
- `npm run build` 产物因未分包优化导致单个 chunk 大小超过 500kB。
- 存在 Vite 关于 `src/types/schemas.ts` 的类型导入提示（TypeScript warning），但不影响最终打包构建和类型推导。

## 9. 下一步唯一任务
- 进入 Phase 4-C-2，完成对画布界面布局编辑器（Canvas/Preview）以及最终图库导入工作流的对接和测试。
