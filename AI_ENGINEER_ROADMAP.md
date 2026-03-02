# AI 工程师 24 周冲刺计划 (AI Engineer 24-Week Sprint Plan)

本仓库用于记录从 Web 开发转型为 AI 工程师的学习路径与实践代码。

## 📅 进度概览

| 阶段         | 周期        | 主题                           | 核心任务                                                                | 状态      |
| :----------- | :---------- | :----------------------------- | :---------------------------------------------------------------------- | :-------- |
| **第一阶段** | 第 1-4 周   | **思维转型：从确定性到概率性** | [DONE] Prompt Engineering, [TODO] CoT 实战, Vercel AI SDK, 基础 Chatbot | 🚀 进行中 |
| **第二阶段** | 第 5-10 周  | **RAG 与向量数据库**           | 数据预处理, Embedding, Vector DB (Pinecone/Supabase), 私有知识库        | ⏳ 待开始 |
| **第三阶段** | 第 11-16 周 | **进阶 Agent 与 MCP 协议**     | Function Calling, MCP 协议, LangChain/LlamaIndex 源码分析               | ⏳ 待开始 |
| **第四阶段** | 第 17-20 周 | **工程化与调优**               | RAGAS 评估, Swift Response (TTFT), 缓存, 微调基础                       | ⏳ 待开始 |
| **第五阶段** | 第 21-24 周 | **实战模拟与简历**             | 高并发, 跨端 AI, 面试题准备 (幻觉, 长文本, 稳定性)                      | ⏳ 待开始 |

---

## 🛠 技术栈

- **Framework**: Next.js (React)
- **Language**: TypeScript
- **AI SDK**: Vercel AI SDK
- **Model Provider**: OpenAI / Anthropic / DeepSeek / Doubao
- **Styling**: Tailwind CSS

## 📂 目录结构规划

- `/app`: Next.js App Router
- `/components`: UI 组件 (Chat, Input, Markdown)
- `/lib/ai`: AI 相关工具 (Prompts, Tools)
- `/docs`: 学习笔记与文档

## 🚀 快速开始

1. 克隆/初始化项目
2. 配置 `.env.local` 中的 API Key
3. `npm run dev` 启动

---

---

## 🎯 当前任务：Phase 1 - CoT 思维链实战

### 1. 后端逻辑：强化系统提示词

- [x] 修改 `app/api/chat/route.ts` 中的 `system` 提示词。
- [x] 要求模型在回答前包含 `<thinking>` 标签。
- [x] 定义思考维度：拆解问题、逻辑推导、自我校验。

### 2. 测试用例：验证概率性逻辑

- [ ] **数学逻辑陷阱测试**：测试 AI 对连续加减及隐藏条件的处理。
- [ ] **工程咨询测试**：测试 AI 处理复杂、多维度问题的规划能力。

### 3. 前端工程化：流式解析 (Advanced)

- [ ] 解析流式输出中的 `<thinking>` 标签。
- [ ] UI 实现：将思考过程渲染为“折叠面板”或“灰色引用区”，与最终答案分离。

---

> 💡 **避坑指南**
>
> 1. 不死磕数学公式，关注应用框架。
> 2. 紧跟大厂风向 (Doubao, Coze)。
> 3. 发挥 Web 工程优势 (TS/React/Perf)。
