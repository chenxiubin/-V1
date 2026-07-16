# 项目交接状态 (Project Handoff)

## 当前阶段：M1-D-4g
本项目当前已完成 M1 最终清理与直接证据补齐 (M1-D-4g)，并最终收口。**未进入 M2 阶段，禁止 push，未修改任何无关业务逻辑，未添加任何新模型选择/持久化等 M2 功能。**

## M1 已实现功能
1. **Phase 1 - 4 核心脚手架**：空场景导入、底片/贴纸处理、分析流、配方采纳、画布渲染以及全链路持久化机制。
2. **模型中心 M1-A / M1-D 模型发现**：
   - 实现了基于后端 `GeminiModelDiscoveryService` 调用官方 Gemini Models API。
   - 支持自动化检测大模型对多模态分析、图片生成的兼容性过滤，区分兼容模型（如 gemini-2.5-flash）与不兼容模型（如 text-embedding-004）展示。
   - 实现了带安全脱敏（绝对路径、file://、Base64 敏感字段清除）、防抖（in-flight 共享 promise）、两级容错回落缓存机制的鲁棒模型发现架构。
3. **安全机制与异常闭环**：
   - 用户文件检测：包含真实的 PNG 签名验证、GIF 文件及 GIF 伪装 PNG 文件阻断拦截、10MB 文件上限硬阻断、图片加载损坏等校验。
   - 像素级 Alpha 通道检测：利用 Canvas getContext('2d') 图像物理像素检测是否有透明度 (hasAlpha)，安全分级回落，生成黄色合规度警告但允许正常进行智能分析。
   - 所有抛出的网络与系统异常信息在流向前端前均通过安全 Sanitizer 进行绝对路径、签名以及敏感 Key 脱敏处理。

## 模型中心核心限制与现状
1. **模型中心当前仍为只读**：前端能够实时、高置信度地展示模型状态、名称、开发商、主要特点和兼容性，但该配置目前仅用于浏览和发现，**尚未实现模型选择与持久化功能（属于 M2 阶段规划）**。
2. **官方剩余额度无法获取**：官方 Gemini Models API 并不提供当前 API Key 的免费额度剩余量信息，因此 `officialRemainingToday` 被如实设计并设置为 `null`（通过专用测试进行了断言）。

## 临时脚本清理情况
所有根目录下的临时跑测、修补和调试脚本已被彻底清理：
- 已彻底删除：`debug_ret.cjs`, `fix_hoisted.cjs`, `fix_isolation_test.cjs`, `fix_mock_and_log.cjs`, `get_logs.cjs`, `mock-dom.js`, `patch_test.js`, `run_one.cjs`, `run_ui.cjs`, `setupTests.js`, `test_1_log.cjs`, `wait_test.cjs`
- 仅保留的正式测试与构建配置：`vite.config.ts`, `vitest.config.ts`

## 验证与置信度证据

### 1. 人工验证状态声明
**Preview 未进行可独立复核的人工验证；当前结论来自自动化测试和代码检查。**

### 2. 构建警告 (Build Chunk Warnings)
生产构建 `npm run build` 依然存在 **1 项包体警告**：
- 主业务 Chunk `dist/assets/index-vX6ewWRr.js` (968.72 kB) 依然超过 500kB 限制。本阶段暂时安全保留，不破坏原有压缩率与导入路径。
- **并非 “0 Warning”**，有一项 Chunk Size Warning。

### 3. 直接/精确测试断言补充
- **非法文件零调用断言**：在 `productImport.test.ts` 中，为 GIF 上传失败、GIF 伪装 PNG、超过 10MB 这三类失败流程添加了真实的 `vi.spyOn` 间接与直接断言：
  - `saveAsset` 调用次数为 `0`；
  - `analyzeProduct` 调用次数为 `0`；
  - `productAsset` 状态保持为 `null`。
- **透明通道警告 UI 真实测试**：在 `phase4ClientState.test.tsx` 中，利用真实组件渲染 (`render(<App />)`) 和用户事件验证文字：
  - **透明 PNG**：不显示警告文字 `⚠️ 警告：不包含透明通道 (Alpha)`，可点击“开始智能分析”。
  - **实底 PNG**：出现警告文字 `⚠️ 警告：不包含透明通道 (Alpha)`，“开始智能分析”按钮不被禁用，点击可正常触发并调用后端 `analyzeProduct` 成功。
  - **JPEG**：出现警告文字 `⚠️ 警告：不包含透明通道 (Alpha)`，不阻断正常智能分析，点击可正常调用 `analyzeProduct` 成功。

### 4. 专项测试结果
执行 5 个核心测试文件 (`productImport.test.ts`, `networkIsolationAssertion.test.tsx`, `modelDiscovery.test.ts`, `modelCenter.test.tsx`, `modelsRoute.test.ts`)：
- **测试文件数**：5
- **测试总数**：64
- **通过数**：64
- **失败数**：0
- **跳过数**：0
- **退出码**：0

### 5. 全量测试结果
执行 `npm run test`（全量 33 个测试文件）：
- **测试文件数**：33
- **测试总数**：358
- **通过数**：358
- **失败数**：0
- **跳过数**：0
- **退出码**：0

### 6. 八类测试噪音控制统计 (全量 0 噪音)
- `ECONNREFUSED` : 0
- `Failed to fetch initial model` : 0
- `indexedDB is not defined` : 0
- `not wrapped in act` : 0
- `AbortError` : 0
- `Unmocked network request` : 0
- `CANDIDATE STATE WAS` : 0
- `An empty string was passed to the src attribute` : 0

### 7. 全量静态检查与构建状态
- **TypeScript 静态类型检查 (`npx tsc --noEmit`)**：以退出码 `0` 成功完成。
- **Linter (`npm run lint`)**：以退出码 `0` 成功完成。
- **Build (`npm run build`)**：以退出码 `0` 成功完成（包含 1 个 Chunk 包体 size 警告）。
- **当前工作区**：非 Git 仓库，GitHub 无需同步。
