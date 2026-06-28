# 签到自动续期管理平台

[![CI](https://github.com/weikkadd/checkin-tasks/actions/workflows/ci.yml/badge.svg)](https://github.com/weikkadd/checkin-tasks/actions/workflows/ci.yml)
[![Deploy](https://github.com/weikkadd/checkin-tasks/actions/workflows/deploy.yml/badge.svg)](https://github.com/weikkadd/checkin-tasks/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个功能完整的全栈自动化签到续期管理平台，支持通过可视化面板统一管理多个服务的定时签到与续期任务，并在关键事件时通过 Gotify 推送通知。

## ✨ 核心特性

- 🤖 **Playwright 自动化执行引擎**
  - 支持浏览器指纹伪装（User-Agent、视口、语言等）
  - 内置 Cloudflare 盾绕过策略
  - 反爬虫对策（隐藏自动化标记、随机延迟等）
  - 支持自定义 JavaScript 脚本

- 🔔 **Gotify 通知系统**
  - 续期成功通知
  - 续期失败告警
  - 即将到期提醒
  - 完整的通知历史记录

- ⏰ **Cron 定时调度系统**
  - 灵活的 Cron 表达式配置
  - 自动检查任务到期状态
  - 自动触发续期执行
  - 支持自定义调度频率

- 🎨 **现代化前端界面**
  - 响应式设计（支持手机、平板、桌面）
  - 任务仪表板（统计卡片、快速操作）
  - 任务管理（新增、编辑、删除、启用/禁用）
  - 执行日志查看（历史记录、错误详情）
  - 系统设置（Gotify 配置、通知开关、Cron 配置）

- 🔐 **完整的用户认证和权限控制**
  - Manus OAuth 集成
  - 基于角色的访问控制（admin/user）
  - 会话管理和安全认证

- 📊 **详细的执行日志和统计**
  - 每次续期的完整执行记录
  - 执行时间、结果状态、错误信息
  - 任务状态可视化（正常/即将到期/已过期/执行中）

## 🚀 快速开始

### 前置要求

- Node.js 20+
- Bun（包管理器）
- MySQL 8.0+（或使用 Docker）

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/weikkadd/checkin-tasks.git
cd checkin-tasks

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填写必需的配置

# 数据库迁移
bun run db:push

# 启动开发服务器
bun run dev
```

访问 http://localhost:3000

### Docker 快速启动

```bash
# 使用 Docker Compose
docker-compose up -d

# 或手动启动
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=checkin_db \
  -p 3306:3306 \
  mysql:8.0

docker build -t checkin-automation-panel .
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=mysql://root:root@mysql:3306/checkin_db \
  -e JWT_SECRET=your_secret \
  --link mysql:mysql \
  checkin-automation-panel
```

## 📖 文档

- **[快速开始指南](./QUICKSTART.md)** - 5 分钟快速上手
- **[部署说明](./DEPLOYMENT.md)** - 详细的部署指南（3 种方式）
- **[环境变量配置](./ENV_SETUP.md)** - 环境变量详细说明

## 🛠 技术栈

| 组件 | 技术 | 版本 |
|---|---|---|
| **前端** | React + Tailwind CSS + shadcn/ui | 19 / 4 / 最新 |
| **后端** | Express + tRPC | 4 / 11 |
| **数据库** | MySQL | 8.0+ |
| **自动化** | Playwright | 最新 |
| **包管理** | Bun | 最新 |
| **部署** | Docker / Manus WebDev | - |

## 📦 项目结构

```
checkin-tasks/
├── client/                 # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 可复用组件
│   │   ├── lib/           # 工具函数
│   │   └── App.tsx        # 主应用
│   └── index.html
├── server/                 # 后端应用
│   ├── routers.ts         # tRPC 路由
│   ├── db.ts              # 数据库查询
│   ├── automation.ts      # Playwright 自动化
│   ├── notifications.ts   # Gotify 通知
│   ├── scheduler.ts       # Cron 调度
│   └── _core/             # 核心模块
├── drizzle/               # 数据库架构
│   └── schema.ts          # 表定义
├── .github/workflows/     # GitHub Actions
├── DEPLOYMENT.md          # 部署指南
├── QUICKSTART.md          # 快速开始
├── ENV_SETUP.md           # 环境变量
└── package.json
```

## 🎯 使用流程

1. **登录系统**
   - 使用 Manus OAuth 或配置的认证方式登录

2. **配置系统**
   - 进入"系统设置"页面
   - 配置 Gotify 服务器地址和 Token
   - 设置 Cron 调度表达式

3. **添加任务**
   - 点击"新增任务"
   - 填写服务信息（名称、URL、账号、密码、周期）
   - 保存任务

4. **自动执行**
   - 系统按照 Cron 表达式自动检查和执行续期
   - 接收 Gotify 通知
   - 在日志中查看执行结果

## 🔄 工作流程

```
┌─────────────────────────────────────────────────────────┐
│                  Cron 定时调度                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  检查任务到期状态    │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │  触发 Playwright     │
        │  自动化执行          │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │  记录执行日志        │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │  发送 Gotify 通知    │
        └──────────────────────┘
```

## 🔐 安全特性

- **浏览器指纹伪装**：隐藏自动化工具标记，模拟真实用户
- **反爬虫对策**：随机延迟、User-Agent 轮换、视口随机化
- **Cloudflare 盾绕过**：支持过 CF 盾的自动化执行
- **敏感信息加密**：数据库中的密码加密存储
- **会话安全**：JWT 令牌认证、HTTPS 支持
- **访问控制**：基于角色的权限管理

## 📊 API 端点

### 任务管理

- `POST /api/trpc/tasks.create` - 创建任务
- `GET /api/trpc/tasks.list` - 获取任务列表
- `POST /api/trpc/tasks.update` - 更新任务
- `POST /api/trpc/tasks.delete` - 删除任务
- `POST /api/trpc/tasks.toggleEnabled` - 启用/禁用任务

### 系统设置

- `GET /api/trpc/settings.get` - 获取系统设置
- `POST /api/trpc/settings.update` - 更新系统设置
- `POST /api/trpc/settings.validateGotify` - 验证 Gotify 配置

### 执行和日志

- `POST /api/trpc/tasks.triggerRenewal` - 手动触发续期
- `GET /api/trpc/logs.getByTaskId` - 获取任务日志
- `GET /api/trpc/notifications.getByTaskId` - 获取通知历史

## 🚢 部署

### Manus WebDev（推荐）

最简单的方式，无需管理服务器。

1. 在 Manus 管理界面创建项目
2. 连接此 GitHub 仓库
3. 配置环境变量
4. 点击"发布"

### Docker 部署

```bash
docker build -t checkin-automation-panel .
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://user:pass@db:3306/checkin_db \
  -e JWT_SECRET=your_secret \
  checkin-automation-panel
```

### Railway / Render

连接 GitHub 仓库，自动部署。详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🧪 测试

```bash
# 运行单元测试
bun run test

# 运行类型检查
bun run check

# 构建应用
bun run build

# 启动生产服务器
bun run start
```

## 📝 环境变量

必需的环境变量：

```env
DATABASE_URL=mysql://user:password@host:3306/database
JWT_SECRET=your_secret_key
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Administrator
VITE_APP_TITLE=签到管理平台
```

详见 [ENV_SETUP.md](./ENV_SETUP.md)

## 🐛 故障排查

### Playwright 执行失败

```bash
npx playwright install
```

### 数据库连接失败

检查 DATABASE_URL 和 MySQL 服务是否运行。

### Gotify 通知不工作

1. 确认 Gotify 服务器地址包含 `http://` 或 `https://`
2. 验证 Token 是否正确
3. 检查网络连接

详见 [DEPLOYMENT.md](./DEPLOYMENT.md#故障排查)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

## 📞 支持

- 📧 Email: support@example.com
- 🐛 Issues: https://github.com/weikkadd/checkin-tasks/issues
- 💬 Discussions: https://github.com/weikkadd/checkin-tasks/discussions

## 🙏 致谢

感谢以下开源项目的支持：

- [Playwright](https://playwright.dev/) - 浏览器自动化
- [tRPC](https://trpc.io/) - 类型安全的 API
- [React](https://react.dev/) - UI 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

---

**⭐ 如果这个项目对您有帮助，请给个 Star！**
