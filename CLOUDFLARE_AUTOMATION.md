# Cloudflare Workers + D1 自动化续期实现指南

## 📋 能力对比

| 功能 | Cloudflare Workers | Railway / Render |
|---|---|---|
| **HTTP 请求处理** | ✅ 完全支持 | ✅ 完全支持 |
| **数据库操作** | ✅ D1 原生支持 | ✅ MySQL、PostgreSQL |
| **定时任务（Cron）** | ✅ **Cron Triggers**（付费） | ✅ 完全支持 |
| **后台任务** | ⚠️ 受限（10 秒超时） | ✅ 完全支持 |
| **Playwright 自动化** | ❌ **不支持**（无浏览器） | ✅ 支持 |
| **成本** | 💰 按请求计费 | 💰 按使用量计费 |

## ⚠️ 关键限制

### 1. **Playwright 不可用**

Cloudflare Workers 是无服务器环境，**无法运行 Playwright**：
- 没有浏览器运行时
- 无法执行 JavaScript DOM 操作
- 无法处理 Cloudflare 盾

**解决方案：**
- 使用 Cloudflare 的 HTTP API 调用外部 Playwright 服务
- 或在 Railway/Render 中运行 Playwright，Workers 调用其 API

### 2. **Cron Triggers 需要付费**

Cloudflare Workers 的定时任务功能：
- ✅ 免费版：支持基础 HTTP 触发
- ⚠️ 付费版：支持 Cron Triggers（需要 Workers Paid 计划）
- 💰 成本：$25/月起

### 3. **执行时间限制**

- 免费版：10 秒超时
- 付费版：30 秒超时
- 无法运行长时间的后台任务

### 4. **内存和资源限制**

- CPU：受限
- 内存：128 MB
- 不适合大型数据处理

## 🎯 最佳实现方案

### **方案 A：Cloudflare Workers + 外部 Playwright 服务（推荐）**

架构：
```
Cloudflare Cron Trigger
    ↓
Cloudflare Workers
    ↓
调用外部 API（Railway/Render 中的 Playwright）
    ↓
D1 数据库（存储结果）
    ↓
Gotify 通知
```

**优点：**
- 充分利用 Cloudflare 的全球网络
- 成本相对低廉
- 支持完整的自动化流程

**缺点：**
- 需要维护两个服务
- 需要 Workers Paid 计划（$25/月）

**实现步骤：**

#### 1. 在 Railway 或 Render 部署 Playwright 服务

创建一个简单的 API 服务来执行 Playwright：

```typescript
// playwright-service.ts
import Fastify from 'fastify';
import { runAutomation } from './automation';

const app = Fastify();

app.post('/execute', async (request, reply) => {
  const { url, username, password, script } = request.body as any;
  
  try {
    const result = await runAutomation({
      url,
      username,
      password,
      script
    });
    
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.listen({ port: 3000 }, () => {
  console.log('Playwright service running on port 3000');
});
```

部署到 Railway：
```bash
railway deploy
```

#### 2. 在 Cloudflare Workers 中调用

```typescript
// worker.ts
import { Router } from 'itty-router';

const router = Router();

// 定时任务入口
router.post('/api/cron/check-renewals', async (request, env) => {
  const db = env.DB;
  
  // 获取需要续期的任务
  const tasks = await db
    .prepare(`
      SELECT * FROM checkin_tasks 
      WHERE enabled = 1 
      AND next_renewal_date <= datetime('now')
    `)
    .all();
  
  // 执行每个任务
  for (const task of tasks.results) {
    try {
      // 调用外部 Playwright 服务
      const response = await fetch('https://your-playwright-service.railway.app/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: task.url,
          username: task.username,
          password: task.password,
          script: task.custom_script
        })
      });
      
      const result = await response.json();
      
      // 记录执行结果
      await db.prepare(`
        INSERT INTO execution_logs (task_id, status, result, executed_at)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(task.id, result.success ? 'success' : 'failure', JSON.stringify(result)).run();
      
      // 发送通知
      if (result.success) {
        await sendGotifyNotification(env, task.id, 'success', result);
      } else {
        await sendGotifyNotification(env, task.id, 'failure', result);
      }
      
      // 更新下次续期时间
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + task.renewal_cycle);
      
      await db.prepare(`
        UPDATE checkin_tasks 
        SET next_renewal_date = ?, last_renewal_date = datetime('now')
        WHERE id = ?
      `).bind(nextDate.toISOString(), task.id).run();
      
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);
      await sendGotifyNotification(env, task.id, 'failure', { error: error.message });
    }
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Gotify 通知函数
async function sendGotifyNotification(env: any, taskId: number, status: string, data: any) {
  const settings = await env.DB
    .prepare('SELECT * FROM system_settings LIMIT 1')
    .first();
  
  if (!settings?.gotify_enabled) return;
  
  const title = status === 'success' ? '✅ 续期成功' : '❌ 续期失败';
  const message = status === 'success' 
    ? `任务 ${taskId} 续期成功`
    : `任务 ${taskId} 续期失败: ${data.error}`;
  
  await fetch(`${settings.gotify_url}/message?token=${settings.gotify_token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      message,
      priority: status === 'success' ? 5 : 10
    })
  });
}

export default router;
```

#### 3. 配置 Cron Trigger

在 `wrangler.toml` 中配置：

```toml
name = "checkin-automation"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[[triggers.crons]]
crons = ["0 */6 * * *"]  # 每 6 小时执行一次

[[d1_databases]]
binding = "DB"
database_name = "checkin_db"
database_id = "your_database_id"

[env.production]
name = "checkin-automation-prod"
vars = { ENVIRONMENT = "production" }
```

#### 4. 部署

```bash
# 创建 D1 数据库
wrangler d1 create checkin_db

# 迁移数据库架构
wrangler d1 execute checkin_db --file ./drizzle/0001_clean_fixer.sql --remote

# 部署 Worker
wrangler deploy
```

### **方案 B：Railway + Cron（最简单，推荐）**

如果您想要最简单的实现，直接使用 Railway：

**优点：**
- 完全支持 Node.js + Playwright
- 内置 Cron 支持
- 成本低廉（$5/月起）
- 无需维护多个服务

**缺点：**
- 不如 Cloudflare 全球分布

**实现步骤：**

1. **在 Railway 部署完整应用**
   ```bash
   railway deploy
   ```

2. **配置 Cron 任务**
   ```typescript
   // server/scheduler.ts
   import cron from 'node-cron';
   
   // 每 6 小时执行一次
   cron.schedule('0 */6 * * *', async () => {
     await checkAndRenew();
   });
   ```

3. **完成**
   - 应用自动运行
   - Cron 自动执行

### **方案 C：混合方案（Cloudflare Pages + Railway 后端）**

最灵活的方案：

```
┌─────────────────────────────────────┐
│   Cloudflare Pages（前端）           │
│   - React UI                        │
│   - 全球 CDN 加速                    │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   Railway（后端 + 自动化）           │
│   - Node.js API                     │
│   - Playwright 自动化               │
│   - Cron 定时任务                   │
│   - MySQL 数据库                    │
└─────────────────────────────────────┘
```

## 📊 成本对比

| 方案 | 前端 | 后端 | 数据库 | 自动化 | 总成本 |
|---|---|---|---|---|---|
| **Cloudflare Workers + D1** | Pages 免费 | $25/月 | D1 免费 | $25/月 | $25/月 |
| **Railway** | Pages 免费 | $5/月 | $5/月 | 免费 | $10/月 |
| **Manus WebDev** | 免费 | 免费 | 免费 | 免费 | **免费** |

## 🎯 最终建议

### 如果您想使用 Cloudflare：

**使用方案 A（Workers + 外部 Playwright）**
- 优点：充分利用 Cloudflare 全球网络
- 缺点：需要 $25/月 的 Workers Paid 计划
- 适合：需要全球低延迟的应用

### 如果您想最简单快速：

**使用方案 B（Railway）**
- 优点：最简单，成本最低，完全支持
- 缺点：不如 Cloudflare 全球分布
- 适合：大多数用户

### 如果您想完全免费：

**使用 Manus WebDev**
- 优点：完全免费，自动扩展，内置数据库
- 缺点：不如 Cloudflare 全球分布
- 适合：个人项目、学习

## 📝 实现清单

如果选择方案 A（Workers + 外部 Playwright）：

- [ ] 升级 Cloudflare Workers 到 Paid 计划
- [ ] 在 Railway/Render 部署 Playwright 服务
- [ ] 创建 D1 数据库
- [ ] 编写 Worker 代码
- [ ] 配置 Cron Trigger
- [ ] 测试自动化流程
- [ ] 监控执行日志

## 🔗 相关资源

- [Cloudflare Workers Cron Triggers](https://developers.cloudflare.com/workers/platform/cron-triggers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Railway 部署指南](https://docs.railway.app/)
- [Playwright 文档](https://playwright.dev/)

---

**总结：Cloudflare Workers + D1 可以实现自动化续期，但需要额外的 Playwright 服务支持。如果您想要最简单的方案，建议使用 Railway 或 Manus WebDev。**
