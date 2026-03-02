## 📅 进度概览

| 阶段         | 周期        | 主题                           | 核心任务                                                         | 状态      |
| :----------- | :---------- | :----------------------------- | :--------------------------------------------------------------- | :-------- |
| **第一阶段** | 第 1-4 周   | **思维转型：从确定性到概率性** | [DONE] Prompt Engineering, CoT 实战, Vercel AI SDK, 基础 Chatbot | ✅ 已完成 |
| **第二阶段** | 第 5-10 周  | **RAG 与向量数据库**           | 数据预处理, Embedding, Vector DB (Pinecone/Supabase), 私有知识库 | 🚀 进行中 |
| **第三阶段** | 第 11-16 周 | **进阶 Agent 与 MCP 协议**     | Function Calling, MCP 协议, LangChain/LlamaIndex 源码分析        | ⏳ 待开始 |
| **第四阶段** | 第 17-20 周 | **工程化与调优**               | RAGAS 评估, Swift Response (TTFT), 缓存, 微调基础                | ⏳ 待开始 |
| **第五阶段** | 第 21-24 周 | **实战模拟与简历**             | 高并发, 跨端 AI, 面试题准备 (幻觉, 长文本, 稳定性)               | ⏳ 待开始 |

#### ✅ 第一阶段已完成亮点：

1. **基础 Chatbot & Vercel AI SDK**：
   - 成功使用了 Vercel AI SDK。在 `app/page.tsx` 中使用了 `useChat` Hook 管理状态。
   - 在 `app/api/chat/route.ts` 中成功接入了 `@openrouter/ai-sdk-provider`，使用了现代且官方推荐的 `streamText` 和 `convertToModelMessages` 处理流式响应。
2. **Streamdown 渲染**：
   - 在 `components/chat/ChatMessages.tsx` 中完美集成了 `Streamdown` 组件，并配置了 `code`, `mermaid`, `math`, `cjk` 插件，流畅实现了打字机效果、数学公式解析以及代码高亮。
3. **Prompt Engineering & CoT 实战**：
   - 在 `route.ts` 的 `system` prompt 中精巧设计了 `<thinking>` 标签指令（包含拆解问题、逻辑推导、自我校验）。这展现了非常标准的 **Chain of Thought (思考链)**
     落地运用，通过要求模型分离思考过程与最终输出，提高了回答的准确性和逻辑性。

待完成：虽然第一阶段的目标已经达到，但在向第二阶段（RAG）迈进之前，或者在日常打磨中，你还可以在以下几个细节上进行加强：

1. 前端对 <thinking> 标签的 UI 处理 (UX 提升) 目前大模型返回的 <thinking>...</thinking> 内容会直接通过 streamdown 渲染在对话流中。

优化点：你可以尝试在前端解析流式数据，如果遇到 <thinking> 标签，将其渲染为类似 ChatGPT /
Gemini 那样的 “可折叠面板 (Accordion/Details)”（例如："💡 模型思考中..."）。这样能将思考过程与正式回答在视觉上进行隔离，提升 C 端用户体验。2. 增加异常和错误处理机制 (工程稳定性) 你目前是一个“快乐路径 (Happy
Path)”实现。

优化点：在

app/api/chat/route.ts 里面可以加上对应的 try...catch 以应对调用大模型超时的错误。同时在前端 useChat 里可以利用 onError 或 error 状态来给用户展示清晰的错误 UI（比如："网络错误，请重试"）。3. 尝试探索 Structured
Output (结构化输出) Vercel AI SDK 不仅仅支持简单的 streamText。

优化点：后续学习时你可以顺带看看 SDK 里的 streamObject 或者是 generateObject 方法。在真实的业务场景下，我们往往不仅仅需要输出文本，还要求大模型按固定的 JSON 格式输出 UI 卡片数据源，这是一个进阶的 Prompt
Engineering 技能。
