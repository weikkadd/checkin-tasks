# 签到自动续期管理平台 - 部署说明

## 项目概述

这是一个全栈自动化签到续期管理平台，支持通过可视化面板统一管理多个服务的定时签到与续期任务，并在关键事件时通过 Gotify 推送通知。

**核心特性：**
- 🤖 Playwright 自动化执行引擎（支持过 Cloudflare 盾）
- 🔔 Gotify 通知系统（成功/失败/即将到期）
- ⏰ Cron 定时调度系统
- 🎨 现代化前端 UI（React + Tailwind CSS）
- 🔐 Manus OAuth 用户认证

## 技术栈

| 组件 | 技术 | 版本 |
|---|---|---|
| 前端 | React + Tailwind CSS | 19 / 4 |
| 后端 | Express + tRPC | 4 / 11 |
| 数据库 | MySQL | 8.0+ |
| 自动化 | Playwright | 最新 |
| 部署 | Node.js | 20+ |

## 部署方式

### 方案一：Manus WebDev（推荐）

Manus WebDev 提供托管部署，无需自己管理服务器。

**优点：**
- 自动扩展（Autoscale）
- 内置数据库支持
- 自动 SSL 证书
- 一键部署

**部署步骤：**

1. 在 Manus 管理界面创建新项目
2. 选择 "Web App (tRPC + Auth + Database)" 模板
3. 上传项目代码或连接 GitHub 仓库
4. 配置环境变量（见下文）
5. 点击"发布"按钮

### 方案二：Docker + 云服务器

适合需要更多控制的场景（Railway、Render、Vercel 等）。

**前置要求：**
- Node.js 20+
- MySQL 8.0+
- Docker（可选）

**部署步骤：**

1. **克隆仓库**
```bash
git clone https://github.com/weikkadd/checkin-tasks.git
cd checkin-tasks
```

2. **安装依赖**
```bash
pnpm install
```

3. **配置环境变量**

创建 `.env.local` 文件：
```env
# 数据库配置
DATABASE_URL=mysql://user:password@localhost:3306/checkin_db

# OAuth 配置（如果使用 Manus OAuth）
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# JWT 密钥
JWT_SECRET=your_secret_key_here

# 应用信息
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Your Name
VITE_APP_TITLE=签到自动续期管理平台
VITE_APP_LOGO=https://your-logo-url.png

# 分析（可选）
VITE_ANALYTICS_ENDPOINT=https://your-analytics.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

4. **数据库迁移**
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

5. **构建应用**
```bash
pnpm build
```

6. **启动应用**
```bash
pnpm start
```

应用将在 `http://localhost:3000` 运行。

### 方案三：Docker 容器部署

**Dockerfile 示例：**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 启动
CMD ["pnpm", "start"]
```

**构建和运行：**

```bash
docker build -t checkin-automation-panel .
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://user:password@db:3306/checkin_db \
  -e JWT_SECRET=your_secret \
  checkin-automation-panel
```

## 环境变量配置

| 变量名 | 说明 | 示例 |
|---|---|---|
| `DATABASE_URL` | MySQL 连接字符串 | `mysql://user:pass@localhost:3306/db` |
| `JWT_SECRET` | JWT 签名密钥 | `your-secret-key` |
| `VITE_APP_ID` | OAuth 应用 ID | `app_123456` |
| `OAUTH_SERVER_URL` | OAuth 服务器地址 | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | OAuth 门户地址 | `https://oauth.manus.im` |
| `OWNER_OPEN_ID` | 所有者 OpenID | `user_123` |
| `OWNER_NAME` | 所有者名称 | `Admin` |
| `VITE_APP_TITLE` | 应用标题 | `签到管理平台` |
| `VITE_APP_LOGO` | 应用 Logo URL | `https://...` |

## 首次启动

1. **访问应用**
   - 打开 `http://localhost:3000`（本地）或您的部署 URL

2. **登录**
   - 使用 Manus OAuth 或配置的认证方式登录

3. **配置系统**
   - 进入"系统设置"页面
   - 配置 Gotify 服务器地址和 Token
   - 设置 Cron 调度表达式（默认：`0 */6 * * *` 每 6 小时执行一次）

4. **添加任务**
   - 在仪表板点击"新增任务"
   - 填写服务名称、URL、账号密码、签到周期等信息
   - 保存任务

5. **验证自动化**
   - 点击"立即执行"手动触发续期
   - 查看执行日志确认是否成功
   - 等待定时任务自动执行

## 常见问题

### Q: 如何过 Cloudflare 盾？

A: 系统已内置 Playwright 反爬虫对策，包括：
- 浏览器指纹伪装（User-Agent、视口、语言等）
- 隐藏自动化工具标记
- 随机延迟和人类行为模拟

如果仍然被拦截，可以在任务编辑页面配置自定义 JavaScript 脚本。

### Q: Gotify 通知不工作？

A: 检查以下几点：
1. Gotify 服务器地址是否正确（需要包含 `http://` 或 `https://`）
2. Token 是否正确
3. 通知开关是否启用
4. 网络连接是否正常

### Q: 如何修改签到逻辑？

A: 有两种方式：

1. **使用预设规则**：系统提供常见网站的预设规则
2. **自定义 JavaScript**：在任务编辑页面编写自定义脚本

示例脚本：
```javascript
// 等待登录按钮并点击
await page.waitForSelector('button:has-text("登录")');
await page.click('button:has-text("登录")');

// 填写表单
await page.fill('input[name="username"]', username);
await page.fill('input[name="password"]', password);

// 提交
await page.click('button[type="submit"]');

// 等待签到成功
await page.waitForNavigation();
```

### Q: 如何备份数据？

A: 定期备份 MySQL 数据库：

```bash
mysqldump -u user -p database_name > backup.sql
```

恢复数据：
```bash
mysql -u user -p database_name < backup.sql
```

## 监控和日志

### 查看日志

**本地开发：**
```bash
pnpm dev
```

**生产环境：**
- Manus WebDev：在管理界面查看日志
- 自托管：查看 Docker 日志或应用日志文件

### 监控指标

- 任务执行成功率
- 平均执行时间
- 通知发送成功率
- 系统错误率

## 安全建议

1. **使用强密码**：为数据库和应用设置强密码
2. **启用 HTTPS**：在生产环境中使用 HTTPS
3. **定期更新**：及时更新依赖包和系统
4. **限制访问**：使用防火墙限制数据库访问
5. **备份数据**：定期备份数据库和配置文件
6. **监控日志**：定期检查应用和系统日志

## 故障排查

### 应用无法启动

1. 检查 Node.js 版本：`node --version`（需要 20+）
2. 检查数据库连接：`mysql -u user -p -h host`
3. 查看错误日志：`pnpm dev` 或 Docker 日志

### 数据库连接失败

```bash
# 测试连接
mysql -u user -p -h host -e "SELECT 1"

# 检查环境变量
echo $DATABASE_URL
```

### Playwright 执行失败

1. 检查浏览器依赖：`npx playwright install`
2. 查看执行日志中的错误信息
3. 尝试手动测试 URL

## 支持和反馈

- 📧 Email: support@example.com
- 🐛 Issues: https://github.com/weikkadd/checkin-tasks/issues
- 💬 Discussions: https://github.com/weikkadd/checkin-tasks/discussions

## 许可证

MIT License
