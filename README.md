# LiteLLM SearchLog

用于搜索和查看 LiteLLM Proxy 消费日志的 Web 管理界面。

## 功能特性

- 🔌 **多实例支持** — 可同时连接多个 LiteLLM Proxy 实例
- 🔍 **日志搜索** — 支持按对话 ID、时间范围、用户 ID 或请求 ID 过滤
- 🔐 **安全** — 管理员 API 密钥存储在服务端，不会暴露给浏览器
- 📊 **详细视图** — 可展开的日志条目，含格式化的 JSON（消息、响应和元数据）
- 💰 **消费追踪** — 查看每次请求及汇总的 Token 用量和费用
- 🔗 **子路径部署** — 支持将服务映射至 HTTPS 服务器的指定子路径下

## 快速开始

### 方式一：Docker Compose（推荐）

> **前置条件**：已安装 [Docker](https://docs.docker.com/get-docker/) 与 [Docker Compose](https://docs.docker.com/compose/install/)（v2.x+）。

```bash
# 1. 克隆仓库
git clone https://github.com/smellgamed3/litellm-searchlog.git
cd litellm-searchlog

# 2. （可选）创建并自定义 .env 文件
cp .env.sample .env
# 按需编辑 .env，例如修改对外暴露的端口号

# 3. 启动服务（后台运行）
docker compose up -d
```

服务启动后在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

**常用命令**

```bash
# 查看实时日志
docker compose logs -f

# 停止服务（保留数据）
docker compose down

# 更新到最新版本
docker compose pull && docker compose up -d
```

**数据持久化**

实例配置（含 adminKey）保存在宿主机的 `./data/instances.json`，容器重启后不会丢失。如需备份，直接复制该文件即可。

---

### 方式二：本地开发

**前置条件**：Node.js 18+，已运行的 [LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/quick_start) 实例

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

---

### 方式三：生产环境直接运行

```bash
npm run build
npm start
```

---

## 子路径部署（反向代理 HTTPS）

若需将本应用挂载到 HTTPS 服务器的指定子路径（如 `https://example.com/logs`），需要：

1. **重新构建镜像**，传入 `BASE_PATH` 构建参数
2. **配置反向代理**（如 Nginx），将子路径流量转发到容器

### 步骤一：本地构建带子路径的镜像

```bash
# 以 /logs 为子路径构建镜像
docker build --build-arg BASE_PATH=/logs -t my-searchlog:latest .
```

### 步骤二：更新 docker-compose.yaml

修改 `docker-compose.yaml`，使用本地构建并设置对应环境变量：

```yaml
services:
  litellm-searchlog:
    build:
      context: .
      args:
        BASE_PATH: /logs          # 与构建参数保持一致
    environment:
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
      DATA_DIR: /app/data
      BASE_PATH: /logs            # 供健康检查使用，需与构建参数一致
      APP_URL: https://example.com/logs  # 可选：公开访问 URL，显示在导航栏
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
```

### 步骤三：配置 Nginx 反向代理

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    # SSL 证书配置（略）

    # 访问子路径时若不带尾斜杠（如 /logs），自动 301 跳转补全（如 /logs/）。
    # 若缺少此规则，访问 /logs 时不匹配 location /logs/ 块，Nginx 将返回 404，
    # 浏览器随后尝试加载的 JS 文件也会收到 404 HTML，出现 "Unexpected identifier" 错误。
    location = /logs {
        return 301 /logs/;
    }

    location /logs/ {
        proxy_pass         http://127.0.0.1:3000/logs/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> ⚠️ **注意**：
> - `proxy_pass` 目标地址中的路径（`/logs/`）必须与 `BASE_PATH` 保持一致，**不能**省略路径前缀。
> - 必须添加 `location = /logs { return 301 /logs/; }` 精确重定向规则。若省略此规则，用户访问无尾斜杠的 URL（如 `/logs`）时，请求不会匹配 `location /logs/` 块，Nginx 将返回 404。浏览器随后尝试加载的 JS 文件也会收到 404 HTML 内容，并因将其当作脚本解析而抛出 `Uncaught SyntaxError: Unexpected identifier` 错误。

### 原理说明

| 配置项 | 作用 | 生效时机 |
|--------|------|----------|
| `BASE_PATH`（构建参数） | 将所有路由和静态资源前缀设为指定子路径 | **构建时**固化，运行时修改无效 |
| `BASE_PATH`（运行时环境变量） | 供容器健康检查使用 | 运行时，不影响路由 |
| `APP_URL`（运行时环境变量） | 在导航栏显示公开访问地址 | 运行时，可随时修改 |

---

## 使用指引

### 添加 LiteLLM 实例

1. 打开应用后，前往 **Instances** → **Add Instance**
2. 填写：
   - **Name**：实例的显示名称（便于区分多个代理）
   - **Base URL**：LiteLLM Proxy 的访问地址（如 `http://your-proxy:4000`）
   - **Admin Key**：LiteLLM 管理员 API 密钥（`sk-...`）
3. 点击 **Save**，实例配置将安全地保存在服务端

> 实例配置存储在服务端的 `instances.json`（已加入 .gitignore），管理员密钥不会暴露给浏览器。

### 搜索日志

1. 在首页 **Search** 页面选择要查询的实例
2. 可按以下条件过滤：
   - **Conversation ID** — 按对话 ID 精确检索
   - **Time Range** — 按时间范围筛选
   - **User ID** — 按用户 ID 过滤
   - **Request ID** — 按请求 ID 精确检索
3. 点击日志条目可展开查看请求消息、响应内容及费用明细

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

- **框架**：Next.js（App Router，[standalone 模式](https://nextjs.org/docs/pages/api-reference/next-config-js/output#automatically-copying-traced-files) — 适合容器化部署的精简输出）
- **UI**：Tailwind CSS + 自定义 shadcn/ui 风格组件
- **存储**：`instances.json` 文件（服务端，路径由 `DATA_DIR` 环境变量控制）

## 环境变量

| 变量名 | 默认值 | 生效时机 | 说明 |
|--------|--------|----------|------|
| `PORT` | `3000` | 运行时 | 应用监听端口 |
| `HOSTNAME` | `0.0.0.0` | 运行时 | 应用监听地址 |
| `NODE_ENV` | `production` | 运行时 | Node.js 运行环境 |
| `DATA_DIR` | 项目根目录 | 运行时 | 实例配置文件存储目录（Docker 部署时自动设为 `/app/data`） |
| `BASE_PATH` | `（空）` | **构建时** | 应用子路径前缀，如 `/logs`；修改后需重新构建镜像 |
| `APP_URL` | `（空）` | 运行时 | 应用公开访问 URL，如 `https://example.com/logs`；配置后显示在导航栏 |

> ⚠️ 在生产环境中，建议使用数据库或加密的密钥管理器来存储实例配置，而非明文 JSON 文件。
