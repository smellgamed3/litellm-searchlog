# ---- 依赖安装阶段 ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---- 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app

# BASE_PATH：应用部署的子路径（如 /logs），留空则部署在根路径
# 示例：docker build --build-arg BASE_PATH=/logs .
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 将构建时的 BASE_PATH 保留为运行时环境变量，供健康检查脚本使用
# 注意：运行时修改此变量不会改变已编译的路由配置
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 standalone 产物
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
