# Cloudflare Pages 部署指南

本指南说明如何在 Cloudflare Pages 上部署签到自动续期管理平台。

## 📋 前置要求

- Cloudflare 账户（免费或付费）
- GitHub 账户和仓库连接
- 自定义域名（可选，Cloudflare 提供免费子域名）

## ⚠️ 重要说明

**Cloudflare Pages 主要用于静态网站和边缘计算**。由于本项目是全栈应用（需要 Node.js 后端和数据库），有以下限制：

| 功能 | Cloudflare Pages | 推荐方案 |
|---|---|---|
| 前端部署 | ✅ 支持 | ✅ |
| Node.js 后端 | ⚠️ 受限（需要 Cloudflare Workers） | ❌ |
| 数据库连接 | ⚠️ 受限 | ❌ |
| Playwright 自动化 | ❌ 不支持 | ❌ |
| Cron 定时任务 | ❌ 不支持 | ❌ |

## 🎯 最佳实践

### 方案 1：Cloudflare Pages + Workers（推荐用于全栈）

**优点：**
- 完整的全栈支持
- 全球 CDN 加速
- 自动扩展
- 免费额度充足

**缺点：**
- 需要配置 Cloudflare Workers
- 数据库需要外部服务

**部署步骤：**

#### 1. 准备项目

```bash
# 确保项目可以构建
bun run build

# 检查构建输出
ls -la dist/
```

#### 2. 配置 wrangler.toml

创建 `wrangler.toml` 文件（Cloudflare Workers 配置）：

```toml
name = "checkin-automation-panel"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "checkin-automation-panel-prod"
routes = [
  { pattern = "example.com/*", zone_name = "example.com" }
]

[build]
command = "bun run build"
cwd = "./"

[build.upload]
format = "modules"
main = "./dist/index.js"

[[env.production.vars]]
DATABASE_URL = ""
JWT_SECRET = ""
VITE_APP_ID = ""
OAUTH_SERVER_URL = "https://api.manus.im"
VITE_OAUTH_PORTAL_URL = "https://oauth.manus.im"
```

#### 3. 创建 GitHub Actions 工作流

创建 `.github/workflows/cloudflare-deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build application
        run: bun run build
        env:
          VITE_APP_ID: ${{ secrets.VITE_APP_ID }}
          VITE_APP_TITLE: ${{ secrets.VITE_APP_TITLE }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          OAUTH_SERVER_URL: ${{ secrets.OAUTH_SERVER_URL }}
          VITE_OAUTH_PORTAL_URL: ${{ secrets.VITE_OAUTH_PORTAL_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          secrets: |
            DATABASE_URL
            JWT_SECRET
            VITE_APP_ID
            OAUTH_SERVER_URL
            VITE_OAUTH_PORTAL_URL
            OWNER_OPEN_ID
            OWNER_NAME
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          VITE_APP_ID: ${{ secrets.VITE_APP_ID }}
          OAUTH_SERVER_URL: ${{ secrets.OAUTH_SERVER_URL }}
          VITE_OAUTH_PORTAL_URL: ${{ secrets.VITE_OAUTH_PORTAL_URL }}
          OWNER_OPEN_ID: ${{ secrets.OWNER_OPEN_ID }}
          OWNER_NAME: ${{ secrets.OWNER_NAME }}
```

#### 4. 获取 Cloudflare 凭证

1. 登录 [Cloudflare 仪表板](https://dash.cloudflare.com/)
2. 进入"账户设置"→"API 令牌"
3. 创建新的 API 令牌：
   - 选择"编辑 Cloudflare Workers"模板
   - 复制令牌

4. 获取账户 ID：
   - 在仪表板首页查看
   - 或在任何页面的 URL 中找到

#### 5. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
DATABASE_URL=mysql://user:pass@host:3306/db
JWT_SECRET=your_secret
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Administrator
VITE_APP_TITLE=签到管理平台
```

#### 6. 推送并部署

```bash
git add .
git commit -m "feat: 添加 Cloudflare Pages 部署配置"
git push origin main
```

GitHub Actions 将自动构建并部署到 Cloudflare Pages。

### 方案 2：Cloudflare Pages + 外部 API（仅前端）

如果您只想部署前端，后端使用外部服务（如 Railway、Render）：

#### 1. 分离前后端

```bash
# 只构建前端
bun run build:client
```

#### 2. 配置 Cloudflare Pages

1. 登录 [Cloudflare Pages](https://pages.cloudflare.com/)
2. 连接 GitHub 仓库
3. 设置构建配置：
   - **Build command**: `bun install && bun run build:client`
   - **Build output directory**: `client/dist`
   - **Environment variables**: 配置 API 端点

#### 3. 配置环境变量

在 Cloudflare Pages 设置中添加：

```
VITE_API_URL=https://your-backend-api.com
VITE_APP_ID=your_app_id
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
```

#### 4. 自动部署

每次推送到 `main` 分支时，Cloudflare Pages 会自动构建和部署。

## 🗄️ 数据库配置

由于 Cloudflare Pages 无法直接连接数据库，您有以下选择：

### 选项 1：使用 Cloudflare D1（推荐）

Cloudflare 的原生数据库服务。

```bash
# 创建 D1 数据库
wrangler d1 create checkin_db

# 迁移数据库架构
wrangler d1 execute checkin_db --file ./drizzle/0001_clean_fixer.sql
```

### 选项 2：使用外部数据库服务

- **PlanetScale**（MySQL 兼容）
- **Supabase**（PostgreSQL）
- **Railway**（多种数据库）
- **Render**（多种数据库）

配置 DATABASE_URL 指向外部服务。

### 选项 3：Cloudflare KV（键值存储）

适合小型应用或缓存。

```typescript
// 在 Cloudflare Workers 中使用 KV
export default {
  async fetch(request, env) {
    const value = await env.KV_NAMESPACE.get('key');
    return new Response(value);
  }
};
```

## 🚀 完整部署流程

### 快速部署（5 分钟）

1. **连接 GitHub 仓库**
   ```
   https://github.com/weikkadd/checkin-tasks
   ```

2. **在 Cloudflare Pages 中配置**
   - Build command: `bun install && bun run build`
   - Build output: `dist`

3. **配置环境变量**
   - 在 Cloudflare Pages 设置中添加所有必需的环境变量

4. **部署**
   - 点击"部署"按钮
   - 或推送到 main 分支自动部署

### 完整部署（包含后端）

1. **在 Cloudflare 创建 Workers**
   - 配置 wrangler.toml
   - 部署后端代码

2. **配置数据库**
   - 使用 Cloudflare D1 或外部服务
   - 执行数据库迁移

3. **配置环境变量**
   - 在 Cloudflare Workers 中设置所有密钥

4. **部署前端**
   - 连接 GitHub 仓库到 Cloudflare Pages
   - 自动构建和部署

## 📊 性能优化

### 启用 Cloudflare 优化

1. **启用 Brotli 压缩**
   - 在 Cloudflare 仪表板中启用

2. **启用 HTTP/2 推送**
   - 在 Pages 设置中配置

3. **配置缓存规则**
   ```
   # 缓存静态资源 30 天
   /assets/* -> Cache-Control: max-age=2592000
   
   # API 不缓存
   /api/* -> Cache-Control: no-cache
   ```

4. **启用 Minify**
   - 在 Cloudflare 仪表板启用 HTML、CSS、JS 压缩

## 🔐 安全配置

### 启用 Cloudflare 安全功能

1. **WAF 规则**
   - 启用 OWASP 核心规则集
   - 配置速率限制

2. **DDoS 保护**
   - 启用高级 DDoS 防护

3. **SSL/TLS**
   - 使用"完全（严格）"模式
   - 启用 HSTS

4. **页面规则**
   ```
   # 强制 HTTPS
   http://example.com/* -> 始终使用 HTTPS
   
   # 缓存所有内容
   /static/* -> 缓存级别：缓存所有内容
   ```

## 🐛 故障排查

### 问题：部署失败

**检查清单：**
1. 构建命令是否正确
2. 环境变量是否完整
3. 依赖是否安装成功
4. 查看 Cloudflare Pages 构建日志

### 问题：API 调用失败

**解决方案：**
1. 检查 CORS 配置
2. 验证 API 端点是否正确
3. 检查网络连接
4. 查看浏览器控制台错误

### 问题：数据库连接失败

**解决方案：**
1. 验证 DATABASE_URL 是否正确
2. 检查数据库是否在线
3. 验证防火墙规则
4. 检查凭证是否有效

## 📚 相关资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 🎯 推荐方案

| 场景 | 推荐方案 | 原因 |
|---|---|---|
| 仅前端 | Cloudflare Pages | 简单、快速、免费 |
| 全栈应用 | Cloudflare Workers + D1 | 完整的 Cloudflare 生态 |
| 需要自动化 | Railway / Render | 支持后台任务和定时执行 |
| 最佳性能 | Cloudflare + 外部后端 | 充分利用 CDN 和计算资源 |

## 💡 最佳实践

1. **使用环境变量**
   - 不要在代码中硬编码密钥
   - 使用 Cloudflare 的 Secrets 管理

2. **启用自动部署**
   - 连接 GitHub 仓库
   - 推送到 main 分支自动部署

3. **监控性能**
   - 使用 Cloudflare Analytics
   - 定期检查缓存命中率

4. **定期备份**
   - 备份数据库
   - 保存配置文件

---

**需要帮助？** 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解其他部署方式。
