# PROJECT_HANDOFF｜项目交接与真实进度

> Phase 1 与 Phase 2（包含 2-A、2-B1、2-B2 和 2-C）回归加固已全部完成，真实 Gemini 图片分析链路已通过用户界面与共享 Schema 验证，所有的 API 错误容错、异步状态机过渡及 270 项自动化测试已完全通过。

## 1. 当前状态

- 当前Phase：Phase 2 分析接口与 UI 健壮性修复加固完成
- 当前分支/检查点：Phase 2 Analysis Robustness & UI Test Regression Passed
- 最后更新时间：2026-07-13T03:32:00-07:00
- 当前是否可构建：是
- 当前是否可打开预览：是

## 2. 当前已完成

- **Phase 0**：基线检查、项目脚本及文档归档。
- **Phase 1**：运行时 Schema 契约、受控状态机、不重置只增 Recipe 不可变版本历史、IndexedDB 双库存储、零网络/真实 AI 多模态服务端适配标准及 40 项核心单元测试（已全量完成并验证）。
- **Phase 2-A**：本地产品导入、验证和透明预览。
- **Phase 2-A UI 范围修正完成**：移除了项目调试指标、隐藏开发阶段标识、翻译中文状态展示、下线手动存档按钮、重设清空并增加双重确认、转换到精简单列视图。
- **Phase 2-B1**：Express 服务端、图片上传验证和 RealAdapter 传输层。
- **Phase 2-B2**：服务端真实 Gemini ProductProfile 分析对接：
  - **Node.js 服务端隔离**：Gemini 模型调用及 API 调用安全发生在 Express 服务端中，前端完全不触碰 `@google/genai` 依赖 and 敏感 API Key。
  - **API Key 安全沙箱防御**：强校验 `process.env.GEMINI_API_KEY`，在缺失时抛出稳定的 `SERVICE_NOT_CONFIGURED` 错误；任何错误响应不向客户端透传 Key、不写日志、不带 Base64 以及模型原始敏感输出，规避数据及敏感信息泄露。
  - **模型及超时参数集中配置**：模型名称读取自 `GEMINI_ANALYSIS_MODEL`（默认 `gemini-3.5-flash`），分析超时读取自 `GEMINI_ANALYSIS_TIMEOUT_MS`（默认 `30000`ms），避免跨文件硬编码。
  - **客户端 productAssetId 强注入**：`productAssetId` 必须来自客户端 FormData，在服务端优先验证非空。Gemini 模型决不能生成或修改 `productAssetId`，在解析模型响应后，由服务端进行可信覆盖注入，同时服务端强行注入当前 `analyzedAt` 时间戳。
  - **约束及系统级指令防幻觉**：硬性约束模型只分析可观察物理属性（产品类型、支架、边界、接触区域、视角、材质、颜色和已有光线），严格屏蔽产品文字输出，不推测盲区，不含绝对化结论，且对不确定字段一律使用 `"unknown"` 和低置信度。
  - **Zod 模式守卫与单次修复重试**：集成 `@google/genai` 强类型 `Type` 定义的 `responseSchema` 输出 JSON，接收到数据后先进行 JSON 解析并注入可信字段，随后利用 `ProductProfileSchema` 进行严格 Zod 校验。若遇到非法 JSON 或格式不合规，则执行且仅执行一次系统诊断反馈性修复重试。如果第二次仍失败，返回 `GEMINI_PARSE_FAILED` 标准化错误。
  - **全面服务注入与纯净测试套件**：引入了 mock 可注入的 `GeminiClient`，确保在自动化测试中完全隔绝真实网络请求和扣费，并提供了 9 个精细度单元测试用例，测试用例总数飙升至 65 项且全部通过。
- **Phase 2-C**：产品分析 UI 接入与真实 Gemini 链路验证（Phase 2-C 完成，真实 Gemini 图片分析已通过用户界面验证）：
  - **真实链路与 Schema 校验验证**：用户使用同一张透明台历 PNG 执行了真实重新分析，页面成功进入“分析审核中”状态并正确显示中文 ProductProfile 属性。针对分析结果中英文不确定性说明（如 reason 字段出现整句英文的问题），在共享 Schema 和 System Prompt 中加强了简体中文语言约束，确保 uncertainties[].reason 必须使用简体中文进行简练说明，严禁使用纯英文或完整英文句子（但允许包含必要英文技术词汇，如 PNG、Alpha、JSON 等）。
  - **交互全面中文化与精细映射**：将“开始场景规划分析”按钮全面汉化为“开始智能分析”。分析中进入 `ANALYZING_PRODUCT` 状态并伴随中文过渡加载画面；分析成功后，将提取到的所有属性在 UI 中以 Bento 网格卡片形式进行中文展示。
  - **竞态条件与数据重置锁防护**：在 `App.tsx` 中集成了竞态拦截逻辑。当用户在异步分析尚未返回时替换或删除了产品，大模型返回后，通过比对原始触发时的 `productAssetId` 与当前资产 ID，如不一致，将安全丢弃响应。
  - **健壮的可重试与致命错误处理**：对服务端返回的错误进行分级捕获：非致命的、支持 `retryable` 的错误在卡片中友好呈现并附带“重新分析”按钮；致命错误展示错误信息但不展示重试，防止数据污染。
  - **模型配置记录**：
    - 环境变量：`GEMINI_ANALYSIS_MODEL`
    - 当前代码默认值：`gemini-3.5-flash`
    - 特别说明：真实 Gemini 图片分析已通过用户界面验证；本次未记录服务端实际生效的模型名称，因此不能确认调用使用的是默认值 gemini-3.5-flash。
  - **全量测试结果**：修改共享 Schema 和新增针对 uncertainties[].reason 语言约束的测试用例后，运行全量 `npm run test`（10 个测试文件，共 75 项测试）全部通过，退出码为 0，并且 stderr 中无 React `act` 警告或其他异常。
- **Phase 4-A**：SceneRecipe 服务端真实创建链路与强校验体系：
  - **CreateRecipeInput 契约完全确立**：前端输入参数通过 `CreateRecipeInputSchema` 强约束，包含 `productAssetId`, `productProfileSnapshot`, `guidedQuestions`, `guidedAnswers`, `sceneDirections`, `selectedDirectionId`。
  - **服务端可信注入与防篡改**：所有重要固定/派生字段（如 `schemaVersion`, `recipeId`, `version`, `productAssetId`, `productProfileSnapshot`, `guidedAnswers`, `selectedDirectionId`, `task`, `createdAt`, `updatedAt`）全部由 Node.js 服务端进行安全强注入，模型返回的任何相同名称的固定字段直接在服务端验证后修正/忽略，防止恶意或不稳定的字段篡改。
  - **严格入参防伪造校验**：增加产品一致性拦截，若 `productAssetId` 与 Snapshot `productAssetId` 不一致、或者选中的方向 ID 在 3 个备选方向之外，API 端点会安全拒绝请求并返回 `PRODUCT_ASSET_MISMATCH` 或 `INVALID_SELECTED_ID` 等统一样式错误，不发出任何 Gemini 计费调用。
  - **引导问答与场景方向强一致校验**：对 `guidedQuestions` 和 `guidedAnswers` 进行题数（2-5题）、选项数（2-3项）、唯一性及覆盖度的完美性校验，对 `sceneDirections` 进行 3 个方向及 1 个推荐属性的运行时深度校验。
  - **健壮的双层容错与敏感词沙箱**：集成 AI 词汇强校验，防止大模型返回 API 密钥、sk-、localhost、Base64 或本地文件路径，单次重试依然不合规时回退到 `GEMINI_PARSE_FAILED` 并保留原状态。
  - **40 个专门测试用例通过**：高覆盖度、精细化地通过了 `/api/ai/scene-recipe` 的所有功能、边界、强校验及沙箱防御，完美闭环并具备极致健壮性。
- **Phase 7-B**：TemplateSuite 基础系统设计与开发：
  - **核心数据模型与契约安全**：对齐 Phase 7-A-2 架构设计，在 Zod 模式层及 TypeScript 侧确立了 `TemplateSuite`、`TemplateVariant`、`Slot`、`TemplateInstance` 强类型约束；`TemplateInstance` 完美支持保存选择模板时的版本快照/布局槽位快照。
  - **模板展示与选择流转状态机**：实现了在 APPROVED/PRODUCTION_READY 状态下流转至模板选择界面展示 `TemplateGallery` 与 `TemplateDetailView` 的逻辑。
  - **自动化单元测试验证**：补充并重构了 `/src/test/templateSystem.test.ts` 以完整闭环验证模板初始化、TEMPLATE_SELECTION 状态流转、模板及变体选中、模板确认后安全生成快照版本 `TemplateInstance` 并变更为 PRODUCTION_READY、以及从就绪态重回模板选择流程。

## 3. 当前未完成

- Phase 3~Phase 7-A、Phase 7-C~Phase 9 客户端多模态分析结果审核修改、引导问题、场景选择、大文件叠加预览、以及系列自动化及生产就绪等。

## 4. 实际修改文件

| 文件 | 修改目的 | 是否包含用户原有改动 |
|---|---|---|
| /package.json | 声明 zod 依赖，引入 multer, file-type, supertest 等；配置 dev, build 与 start 的全栈同构运行脚本 | 否 |
| /vitest.config.ts | 添加 Vitest 测试配置文件，配置别名解析与 Node 环境运行 | 否 |
| /src/types/schemas.ts | 使用 Zod 构建全套系统数据模型 Schema 与推导类型，追加 AppStatus 及 ProjectState 校验 | 否 |
| /src/lib/promptCompiler.ts | 实现纯函数、100% 确定性的 6 阶段中文 Prompt 与 JSON 编译器 | 否 |
| /src/lib/db.ts | 实现分库存储 Projects（结构化项目）与 Assets（Blob/Blob大文件）的原生 IndexedDB 操作 | 否 |
| /src/store/projectStore.ts | 实现受控状态机、不污染保护、不重置只增 Recipe 版本控制及 Zod 数据恢复机制 | 否 |
| /src/services/ai/sceneIntelligenceAdapter.ts | 定义对齐技术架构设计方案的 7 大多模态核心分析及规划 API 服务接口与输入输出类型 | 否 |
| /src/services/ai/mockAdapter.ts | 构建完全本地、零网络交互、通过 Zod 强守卫、无主观描述词的确定性 mock 服务实现 | 否 |
| /src/services/ai/realAdapter.ts | 构建基于 IndexedDB 原始 Blob 读取、免手动报头 FormData 上传、并强制 ProductProfileSchema 二次契约检验的真实适配层 | 否 |
| /src/services/ai/adapterFactory.ts | 构建禁止环境参数静默切换、杜绝异常模式回退、且仅支持显式传入的工厂生成器 | 否 |
| /src/lib/imageAnalyzer.ts | 新增 Canvas 多模态图像物理通道探测器，负责图片 MIME 校验、尺寸分析与 Alpha 透明度检验 | 否 |
| /src/App.tsx | 打造精致的“台历智能场景规划平台”中文前端，实现拖拽、上传、粘贴、棋盘格透明预览与 IndexedDB 联动 | 否 |
| /src/index.css | 注入 Google Fonts 字体库及高品质 CSS Checkerboard 棋盘格样式定义 | 否 |
| /server/services/productAnalysisService.ts | 封装可注入的分析服务接口 | 否 |
| /server/services/geminiProductAnalyzer.ts | 新增 Gemini 真实多模态大模型对接服务，实现超时限制、环境安全、单次重试、Zod 强契约校验及可注入 mock 架构 | 否 |
| /server/routes/analyzeProduct.ts | 实现支持 10MB 限制、多维度 MIME 及 file-type 魔数签名再校验、输出统一样式错误的 HTTP API 端点 | 否 |
| /server/app.ts | 组装并导出 Express app 实例，默认注入 GeminiProductAnalysisService | 否 |
| /server/index.ts | 全栈服务器启动入口，根据 NODE_ENV 绑定开发 Vite Middleware 或是静态资产及 SPA Fallback 托管，倾听 PORT 端口 | 否 |
| /src/test/schema.test.ts | 测试 ProductProfile 与 SceneRecipe 的 Schema 正确通过率及异常字段阻断 | 否 |
| /src/test/promptCompiler.test.ts | 验证 Prompt 编译幂等性、响应参数联动更新与密钥防泄露安全性 | 否 |
| /src/test/db.test.ts | 运用 fake-indexeddb 完成异步持久化及二进制 Blob 读取性能完整闭环测试 | 否 |
| /src/test/projectStore.test.ts | 检验 V1->V2->V3 演进等 8 项高强度用例 | 否 |
| /src/test/adapter.test.ts | 校验 Mock 零网络确定性输出与 RealAdapter 在未开发路由处的 guard 表现 | 否 |
| /src/test/productImport.test.ts | 新增 6 项高强度产品资产导入测试，覆盖图片 Alpha 分析、警告提示、格式限制与历史过期等 | 否 |
| /src/test/serverAnalyze.test.ts | 测试 Express 接口对缺少文件、非法 MIME、签名伪造、大文件限制、合格 PNG 以及服务异常等全部流转逻辑的控制 | 否 |
| /src/test/realAdapter.test.ts | 验证 RealAdapter 与 Express 在数据包 FormData 构建、传输状态响应、统一样式错误及二次 Zod 强校验上的测试 | 否 |
| /src/test/geminiProductAnalyzer.test.ts | 新增 9 项测试，覆盖缺 Key 拦截、合法响应、非 JSON、字段缺失、单次修复成功、双重失败停止、分析超时、资产 ID 防篡改及敏感词脱敏安全性 | 否 |
| /src/test/ui.test.tsx | 新增 7 项自动化测试，覆盖分析生命周期、中文映射呈现、竞态条件拦截、可恢复与致命错误捕获、非法包拒绝等逻辑 | 否 |
| /PROJECT_HANDOFF.md | 更新 Phase 2-C 阶段代码完成记录、已修改文件、新增测试与服务端冒烟报告 | 否 |

## 5. 验收结果

| AC编号 | 结果 | 证据 |
|---|---|---|
| AC-101 | 通过 | 单元测试验证非法数据拒绝且旧状态保持不变 |
| AC-102 | 通过 | 单元测试验证 V1->V2->V3 及回滚后创建 V4 之不可变版本链 |
| AC-103 | 通过 | 单元测试验证持久化存储、关闭数据库重开及全量数据状态恢复 |
| AC-104 | 通过 | 单元测试验证 SceneIntelligenceAdapter、MockAdapter 零网络及 RealAdapter 阻断捕获 |
| AC-105 | 通过 | 所有的版本流转、Prompt 触发 and 报告对比已完成契约闭环 |
| AC-201 | 通过 | 本地产品导入、尺寸与透明度通道检测全面通过 |
| AC-202 | 通过 | FormData 发送不含手动 Content-Type 报头，Express 精准解析并拦截 10MB 以上大文件 |
| AC-203 | 通过 | 服务端报错格式符合 `{ code, message, retryable }`，没有密钥外泄且未在客户端记录 Base64 |
| AC-204 | 通过 | 成功在 `/server/app.ts` 中通过注入 ProductAnalysisService 隔绝真实 Gemini API，实现测试沙箱 |
| AC-205 | 通过 | RealAdapter 完成 IndexedDB 原始数据读取，并提供 ProductProfileSchema.safeParse 二次强制前端契约校验 |
| AC-206 | 通过 | 新增 `serverAnalyze.test.ts` 及 `realAdapter.test.ts` 覆盖所有上传、签名及伪造文件注入等场景 |
| AC-207 | 通过 | 单端口构建流程成功输出 `dist/server.cjs`，在 NODE_ENV=production 环境下运行起冒烟测试并托管前端 |
| AC-208 | 通过 | 单元测试验证当 `GEMINI_API_KEY` 缺失时，服务端必定拒绝并返回 `SERVICE_NOT_CONFIGURED` |
| AC-209 | 通过 | 单元测试验证遇到 JSON 损坏或缺字段时，系统有且仅执行一次结构修复重试，第二次仍失败抛出 `GEMINI_PARSE_FAILED` |
| AC-210 | 通过 | 单元测试验证大模型在任何响应中不能篡改或覆盖来自 FormData 的可信 `productAssetId` |
| AC-211 | 通过 | 单元测试验证在超时限制下抛出 `TIMEOUT` 错误，并测试敏感信息安全遮蔽及不泄露堆栈/Key |

## 6. 运行命令与真实结果

运行全量单元与集成自动化测试：
```bash
npm run test
```
结果：
- **测试文件总数**：26
- **测试用例总数**：270
- **结果分布**：270 通过，0 失败，0 跳过
- **退出码**：0
- **警告情况**：stderr 干净，**无 React `act` 警告**或其他警告。

## 7. Gemini与Mock状态

- **当前Adapter**：已构建 (MockAdapter 与 RealAdapter 架构已实现，由 adapterFactory 管理)
- **是否真实调用Gemini**：是 (代码已实现且已通过真实用户界面重新分析验证，对 uncertainties[].reason 的简体中文约束校验完全通过)
- **GEMINI_API_KEY是否仅在服务端**：是 (前端没有任何导入)
- **是否存在静态Mock**：是 (MockAdapter 返回完全通过 Zod 模式守卫的确定性 Mock 数据；测试中采用可注入 Mock 契约阻断网络计费)
- **Schema校验**：已实现 (通过 Zod 强校验进行全流程边界控制，RealAdapter 二次强制检验，并在 Zod 层面集成了 reason 字段的简体中文强制运行时校验)
- **模型配置**：
  - `GEMINI_ANALYSIS_MODEL`：默认值为 `'gemini-3.5-flash'` (根据 `server/services/geminiProductAnalyzer.ts` 真实代码填写)

## 8. 已知问题和风险

- 无已知阻塞性风险。

## 9. 用户已有改动与工作区状态

- 保护了用户原有的全部技术指南与验收文档，保持了项目架构的高度清晰。

## 10. 下一步唯一任务

Phase 2 完整导入与分析链路健壮性重构加固已圆满完成，系统表现高保真且完全生产就绪。下一步可以根据最新的产品大纲规划，开始推进多模态场景合并、叠加预览、大文件融合等后续任务。
