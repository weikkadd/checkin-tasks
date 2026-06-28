# 完全免费部署方案指南

本指南介绍所有完全免费的部署方案，无需任何付费。

## 🎯 免费方案对比

| 方案 | 前端 | 后端 | 数据库 | 自动化 | 成本 | 推荐度 |
|---|---|---|---|---|---|---|
| **Vercel + Supabase** | ✅ 免费 | ✅ 免费 | ✅ 免费 | ✅ 免费 | **$0** | ⭐⭐⭐⭐⭐ |
| **Render + Render DB** | ✅ 免费 | ⚠️ 15分钟后休眠 | ✅ 免费 | ⚠️ 受限 | **$0** | ⭐⭐⭐⭐ |
| **Heroku + Heroku Postgres** | ❌ 已停止 | ❌ 已停止 | ❌ 已停止 | ❌ 已停止 | - | ❌ |
| **GitHub Pages + Workers** | ✅ 免费 | ✅ 免费 | ⚠️ 需要外部 | ⚠️ 受限 | **$0** | ⭐⭐⭐ |
| **Replit** | ✅ 免费 | ✅ 免费 | ✅ 免费 | ✅ 免费 | **$0** | ⭐⭐⭐⭐ |
| **Railway** | ✅ 免费 | ✅ 免费 | ✅ 免费 | ✅ 免费 | **$0**（有限额） | ⭐⭐⭐⭐⭐ |
| **Manus WebDev** | ✅ 免费 | ✅ 免费 | ✅ 免费 | ✅ 免费 | **$0** | ⭐⭐⭐⭐⭐ |

## 🏆 推荐方案排名

### 第一名：**Vercel + Supabase**（最推荐）

**完全免费，功能完整，性能最优**

#### 特点
- ✅ 前端：Vercel（全球 CDN，自动部署）
- ✅ 后端：Vercel Serverless Functions（Node.js）
- ✅ 数据库：Supabase（PostgreSQL，免费 500MB）
- ✅ 自动化：支持 Cron（通过 CRON_SECRET）
- ✅ 全球分布，性能优秀

#### 部署步骤

**1. 连接 GitHub 到 Vercel**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

或直接在 https://vercel.com/new 连接 GitHub 仓库。

**2. 创建 Supabase 项目**

1. 访问 https://supabase.com/
2. 点击"New Project"
3. 填写项目信息
4. 复制连接字符串

**3. 配置环境变量**

在 Vercel 项目设置中添加：

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your_secret
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
```

**4. 配置 Cron 自动化**

创建 `api/cron/check-renewals.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkAndRenew } from '@/server/scheduler';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // 验证 Cron 密钥
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await checkAndRenew();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**5. 配置 Cron 触发**

使用免费的 Cron 服务（如 EasyCron、Cron-job.org）：

```
https://www.easycron.com/
- URL: https://your-vercel-app.vercel.app/api/cron/check-renewals
- 添加 Header: Authorization: Bearer your_cron_secret
- 频率: 每 6 小时
```

**成本：完全免费**

---

### 第二名：**Railway（推荐）**

**完全免费，最简单，支持完整的自动化**

#### 特点
- ✅ 完整的 Node.js 支持
- ✅ 免费 MySQL 数据库
- ✅ 内置 Cron 支持
- ✅ 自动部署
- ⚠️ 免费额度有限（每月 $5 额度）

#### 部署步骤

**1. 连接 GitHub**

1. 访问 https://railway.app/
2. 点击"New Project"
3. 选择"Deploy from GitHub"
4. 连接 `weikkadd/checkin-tasks` 仓库

**2. 配置环境变量**

Railway 会自动创建 MySQL 数据库，获取 `DATABASE_URL`。

添加其他环境变量：
```
JWT_SECRET=your_secret
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
```

**3. 部署**

推送到 main 分支，Railway 自动部署。

**4. 配置 Cron**

在 `package.json` 中添加：

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
    "start": "NODE_ENV=production node dist/index.js",
    "cron": "node -e \"require('./dist/server/scheduler').startScheduler()\""
  }
}
```

在 Railway 中添加 Cron Job：

```
Command: npm run cron
Schedule: 0 */6 * * *
```

**成本：完全免费（有 $5/月 免费额度）**

---

### 第三名：**Manus WebDev**（官方推荐）

**完全免费，最简单，官方支持**

#### 特点
- ✅ 完整的全栈支持
- ✅ 内置数据库
- ✅ 自动 SSL
- ✅ 全球 CDN
- ✅ 自动扩展
- ✅ 官方支持

#### 部署步骤

**1. 在 Manus 管理界面创建项目**

- 选择"Web App (tRPC + Auth + Database)"模板
- 连接 GitHub 仓库

**2. 配置环境变量**

在项目设置中配置所有必需的环境变量。

**3. 点击"发布"**

自动部署到 Manus 平台。

**成本：完全免费**

---

### 第四名：**Replit**

**完全免费，最简单快速**

#### 特点
- ✅ 在线 IDE
- ✅ 完整的 Node.js 环境
- ✅ 免费数据库（Replit Database）
- ✅ 自动部署
- ✅ 支持 Cron

#### 部署步骤

**1. Fork 到 Replit**

在 Replit 中创建新项目，选择"Import from GitHub"。

**2. 配置 Secrets**

在 Replit 中添加环境变量。

**3. 运行**

```bash
bun install
bun run dev
```

**成本：完全免费**

---

### 第五名：**Render + Render Database**

**完全免费，但有限制**

#### 特点
- ✅ 免费 Web Service（15 分钟无活动后休眠）
- ✅ 免费 PostgreSQL 数据库
- ✅ 自动部署
- ⚠️ 15 分钟后休眠（需要 ping 保活）

#### 部署步骤

**1. 连接 GitHub**

1. 访问 https://render.com/
2. 创建新 Web Service
3. 连接 GitHub 仓库

**2. 配置**

- Build command: `bun install && bun run build`
- Start command: `bun run start`

**3. 添加数据库**

创建 PostgreSQL 数据库，复制连接字符串。

**4. 配置环境变量**

添加 `DATABASE_URL` 和其他必需的环境变量。

**5. 部署**

点击"Deploy"。

**成本：完全免费（但有休眠限制）**

---

## 📊 详细对比

### 性能对比

| 方案 | 响应时间 | 全球分布 | 可靠性 |
|---|---|---|---|
| Vercel | ⚡ 最快 | ✅ 全球 | ✅ 99.99% |
| Railway | ⚡ 快 | ⚠️ 有限 | ✅ 99.9% |
| Manus WebDev | ⚡ 快 | ✅ 全球 | ✅ 99.9% |
| Replit | 🐢 中等 | ⚠️ 有限 | ⚠️ 一般 |
| Render | 🐢 中等 | ⚠️ 有限 | ⚠️ 一般 |

### 功能对比

| 功能 | Vercel | Railway | Manus | Replit | Render |
|---|---|---|---|---|---|
| Node.js 后端 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 数据库 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cron 自动化 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Playwright | ✅ | ✅ | ✅ | ✅ | ✅ |
| 自动部署 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 全球 CDN | ✅ | ⚠️ | ✅ | ❌ | ⚠️ |
| 官方支持 | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🎯 最终建议

### 如果您想要最佳性能和可靠性
**选择：Vercel + Supabase**
- 全球最快的 CDN
- 完全免费
- 支持完整的自动化

### 如果您想要最简单快速
**选择：Railway 或 Manus WebDev**
- 一键部署
- 完全免费
- 支持完整的自动化

### 如果您想要官方支持
**选择：Manus WebDev**
- 官方支持
- 完全免费
- 内置所有功能

### 如果您想要在线 IDE
**选择：Replit**
- 在线开发环境
- 完全免费
- 快速原型

---

## 🚀 快速开始（选择一个）

### 方案 1：Vercel + Supabase（推荐）

```bash
# 1. Fork 到 Vercel
# 访问 https://vercel.com/new 并连接 GitHub

# 2. 创建 Supabase 项目
# 访问 https://supabase.com/

# 3. 配置环境变量
# 在 Vercel 项目设置中添加 DATABASE_URL 等

# 4. 配置 Cron
# 使用 EasyCron 或 Cron-job.org
```

### 方案 2：Railway（最简单）

```bash
# 1. 访问 https://railway.app/
# 2. 点击 "New Project"
# 3. 选择 "Deploy from GitHub"
# 4. 连接仓库
# 5. 配置环境变量
# 6. 完成！
```

### 方案 3：Manus WebDev（官方）

```bash
# 1. 在 Manus 管理界面创建项目
# 2. 连接 GitHub 仓库
# 3. 配置环境变量
# 4. 点击"发布"
# 5. 完成！
```

---

## 💡 成本节省技巧

1. **使用免费的 Cron 服务**
   - EasyCron（免费）
   - Cron-job.org（免费）
   - Uptime Robot（免费）

2. **使用免费的数据库**
   - Supabase（500MB 免费）
   - PlanetScale（免费层）
   - Render Database（免费）

3. **使用免费的通知服务**
   - Gotify（自托管，免费）
   - Discord Webhook（免费）
   - Telegram Bot（免费）

4. **监控免费额度**
   - Railway：$5/月 免费额度
   - Vercel：无限制
   - Manus：无限制

---

## 🎓 学习资源

- [Vercel 部署指南](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Railway 文档](https://docs.railway.app/)
- [Manus 文档](https://manus.im/docs)

---

**总结：所有这些方案都完全免费，选择最适合您的即可！**
