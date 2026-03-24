# LiteLLM SearchLog

用于搜索和查看 LiteLLM Proxy 消费日志的 Web 管理界面。

## 功能特性

- 🔌 **多实例支持** — 可同时连接多个 LiteLLM Proxy 实例
- 🔍 **日志搜索** — 支持按对话 ID、时间范围、用户 ID 或请求 ID 过滤
- 🔐 **安全** — 管理员 API 密钥存储在服务端，不会暴露给浏览器
- 📊 **详细视图** — 可展开的日志条目，含格式化的 JSON（消息、响应和元数据）
- 💰 **消费追踪** — 查看每次请求及汇总的 Token 用量和费用

## 快速开始

### 前置条件

- Node.js 18+
- 已运行的 [LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/quick_start) 实例，并具备管理员 API 密钥

### 安装

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 配置

1. 前往 **Instances** → **Add Instance**
2. 填写名称、LiteLLM Proxy 的 Base URL 以及管理员 API 密钥
3. 实例配置会保存在服务端的 `instances.json` 文件中（已加入 .gitignore）

### 在 LiteLLM 中启用提示词/响应存储

若要在日志详情视图中查看请求消息和响应内容，需在 LiteLLM 的 `proxy_config.yaml` 中启用存储：

```yaml
general_settings:
  store_prompts_in_spend_logs: true
```

或在管理界面 → Logs → Settings 中开启。

### 传递 `conversation_id`

若要按对话分组请求，可在 LLM 请求的 `metadata` 字段中包含 `conversation_id`：

```json
{
  "model": "gpt-4",
  "messages": [...],
  "metadata": {
    "conversation_id": "my-conv-123"
  }
}
```

## 架构

```
浏览器（Next.js App Router）
  └── /search          — 日志搜索界面
  └── /instances       — 实例管理界面
  └── /api/instances   — LiteLLM 实例配置的 CRUD 接口（服务端）
  └── /api/logs        — 代理至 LiteLLM /spend/logs（隐藏管理员密钥）
```

- **框架**：Next.js 14（App Router）
- **UI**：Tailwind CSS + 自定义 shadcn/ui 风格组件
- **存储**：`instances.json` 文件（服务端，已加入 .gitignore）

## 生产部署

```bash
npm run build
npm start
```

也可部署至 Vercel 或 Docker。`instances.json` 文件会在添加第一个实例时自动创建。

> ⚠️ 在生产环境中，建议使用数据库或加密的密钥管理器来存储实例配置，而非明文 JSON 文件。
