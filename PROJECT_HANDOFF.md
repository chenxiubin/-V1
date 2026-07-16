# 项目交接状态 (Project Handoff)

## 当前阶段：M2-A (模型选择契约、应用级持久化与服务端请求级模型解析基础)
本项目当前已完整实现并收口 M2-A 阶段。**本轮只建立契约、持久化和请求级运行时解析，完全遵循“禁止进入 M2-B，不得新增任何模型选择按钮、单选框、保存按钮或‘使用此模型’等交互”的约束，前端无任何未授权交互变动。**

## M2-A 已实现核心功能与真实阻断修正
1. **统一共享契约设计 (`shared/aiModelContracts.ts`)**：
   - 制定了 `ModelIdSchema`（合法格式验证，禁止空、"null"、"undefined"、非字母数字连字符等字符串形式）、`ModelSettingsSchema`、`ModelRequestContextSchema` 以及 `RuntimeModelResolutionSchema`。
   - 契约由前后端 100% 共享，作为运行时验证与数据流转的唯一准则。

2. **应用级模型存储与持久化 (`src/services/modelSettingsStore.ts`)**：
   - 精确对接并订阅 IndexedDB 数据库 `CalendarScenePlannerDB` 的 `gemini-model-settings` 存储。
   - **严格遵循启动约束**：首次启动或重置后，`selectedModelId` 初始默认且保持为 `null`，**绝对不自动写入/保存默认模型**（用户没有做出选择时不改变数据库，实现纯净态）。
   - 实现了精简轻量的多订阅者通知机制，支持整个前端界面的状态热重载与多实例隔离更新。

3. **服务端动态解析与模型隔离 (`server/services/geminiRuntimeModel.ts`)**：
   - 实现了 `resolveRuntimeModelId(requestedModelId)` 方法。
   - **无状态请求级模型解析**：
     - 客户端不发送 `modelId` (即 `selectedModelId === null`) 时，服务端自动选用并动态解析至当前的全局首选可用模型（在发现列表中优先查找可用或 fallback 至 `gemini-2.5-flash`，不抛错）。
     - 传入不合法字符串（如 `""`, `"null"`, `"undefined"`, 含有特殊字符等）或 Zod schema 不匹配时，精确抛出并返回 `INVALID_MODEL_ID` 错误（HTTP 400，`retryable: false`）。
     - 传入合法格式但发现列表中不存在的未知模型时，精确抛出并返回 `MODEL_NOT_FOUND` 错误（HTTP 400，`retryable: false`）。
     - 传入列表存在但标为不兼容的模型时，精确抛出并返回 `MODEL_NOT_COMPATIBLE` 错误（HTTP 400，`retryable: false`）。
   - **不修改 `process.env`，不使用全局可变变量**：通过请求上下文进行模型传递，彻底剔除 `process.env.GEMINI_ANALYSIS_MODEL` 在运行时作为回落的使用。支持极限的多用户并发请求隔离。

4. **五大核心路由及端点全量重构与统一**：
   - 重构了 `/analyze-product`、`/guided-questions`、`/scene-directions`、`/scene-recipe`、`/analyze-match` 这 5 个核心大模型处理端点。
   - 统一采用 `ModelRequestContextSchema.safeParse` 对参数传入进行深度检验（统一阻断不合法的模型 ID 传递）。
   - 废除原有的全局 `catch (modelErr: any) { res.status(modelErr.status || 500).json(modelErr.message) }` 不安全代码。
   - 引入了正式的错误类型守卫 `if (modelErr && typeof modelErr.status === 'number' && typeof modelErr.code === 'string')`，实现向前端响应安全、脱敏、契约格式化的 API 错误结构（包含统一的 `code`、`message` 和 `retryable` 标示）。

5. **首个大模型请求探测保护（不调用 `generateContent`）**：
   - 场景在对大模型有效性及健康度进行检验时，仅查询本地或官方 `models.list`，**坚决不调用 `generateContent` 进行任何假请求探测**，极大保护用户每日宝贵的 quota 额度。

## 验证与置信度证据

### 1. 静态检查与构建状态
- **TypeScript 静态类型检查 (`npx tsc --noEmit`)**：以退出码 `0` 成功完成。
- **Linter (`npm run lint`)**：以退出码 `0` 成功完成。
- **Build (`npm run build`)**：以退出码 `0` 成功完成（包含 1 个 Chunk 包体 size 警告，符合预期）。

### 2. 全量回归测试结果
执行 `npm run test`（全量 36 个测试文件，393 个测试用例，100% 成功通过，0 错误）：
- **测试文件数**：36
- **测试总数**：393
- **通过数**：393
- **失败数**：0
- **跳过数**：0
- **退出码**：0

### 3. M2-A 核心测试验证细节 (在 `geminiRuntimeModel.test.ts` / `modelSettingsStore.test.ts` / `networkIsolationAssertion.test.tsx` 中)：
- **格式非法断言**：测试确保传入 `""`, `"null"`, `"undefined"` 精确拦截并返回 `INVALID_MODEL_ID` (HTTP 400).
- **未知模型断言**：测试确保传入格式合法但不存在的模型精确拦截并返回 `MODEL_NOT_FOUND` (HTTP 400，非 404).
- **不兼容模型断言**：测试确保传入不兼容模型拦截并返回 `MODEL_NOT_COMPATIBLE` (HTTP 400).
- **网络隔离与并发断言**：两个并发请求分别选择模型 A 和 B 进行隔离验证，运行后 `process.env.GEMINI_ANALYSIS_MODEL` 保持原值，彻底消除全局副作用.
- **持久化干净启动断言**：测试确保首次实例化 `modelSettingsStore` 后返回 `selectedModelId: null`，且在不调用 `save` 的前提下，没有向 IndexedDB 写入默认模型的数据.
- **测试噪音控制统计**：
  - `ECONNREFUSED` : 0
  - `Failed to fetch initial model` : 0
  - `indexedDB is not defined` : 0
  - `not wrapped in act` : 0
  - `AbortError` : 0
  - `Unmocked network request` : 0
  - `CANDIDATE STATE WAS` : 0
  - `An empty string was passed to the src attribute` : 0
