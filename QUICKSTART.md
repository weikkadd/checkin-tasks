# 快速开始指南

## 5 分钟快速上手

### 1. 本地开发环境

**前置要求：**
- Node.js 20+
- Bun（包管理器）
- MySQL 8.0+（或使用 Docker）

**启动 MySQL（使用 Docker）：**
```bash
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=checkin_db \
  -p 3306:3306 \
  mysql:8.0
```

**克隆并启动项目：**
```bash
git clone https://github.com/weikkadd/checkin-tasks.git
cd checkin-tasks

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env.local

# 数据库迁移
bun run db:push

# 启动开发服务器
bun run dev
```

访问 http://localhost:3000

### 2. 首次使用

1. **登录**
   - 点击"登录"按钮
   - 使用 Manus OAuth 或配置的认证方式

2. **配置系统**
   - 进入"系统设置"
   - 填写 Gotify 服务器地址和 Token
   - 保存配置

3. **添加第一个任务**
   - 点击"新增任务"
   - 填写以下信息：
     - **服务名称**：例如 "Hax 签到"
     - **服务 URL**：例如 "https://hax.co.id/login"
     - **账号**：您的账号
     - **密码**：您的密码
     - **签到周期**：7（天）
   - 点击"保存"

4. **测试自动化**
   - 在任务卡片上点击"立即执行"
   - 查看执行日志
   - 如果成功，会收到 Gotify 通知

### 3. 配置自动续期

**Cron 表达式示例：**

| 表达式 | 说明 |
|---|---|
| `0 */6 * * *` | 每 6 小时执行一次 |
| `0 0 * * *` | 每天午夜执行 |
| `0 9 * * *` | 每天早上 9 点执行 |
| `0 */12 * * *` | 每 12 小时执行一次 |
| `0 0 * * 1` | 每周一午夜执行 |

**在系统设置中修改 Cron 表达式后，系统会自动按照新的时间表执行续期。**

### 4. 常见操作

**编辑任务：**
- 点击任务卡片上的"编辑"按钮
- 修改配置后点击"保存"

**查看执行日志：**
- 点击任务卡片上的"日志"按钮
- 查看历史执行记录和错误信息

**手动触发续期：**
- 点击任务卡片上的"立即执行"按钮
- 等待执行完成

**删除任务：**
- 点击任务卡片上的"删除"按钮
- 确认删除

## 部署到生产环境

### 选项 1：Manus WebDev（推荐）

最简单的方式，无需管理服务器。

1. 在 Manus 管理界面创建项目
2. 连接此 GitHub 仓库
3. 配置环境变量
4. 点击"发布"

### 选项 2：Docker 部署

适合自托管场景。

```bash
# 构建镜像
docker build -t checkin-automation-panel .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=mysql://user:pass@db:3306/checkin_db \
  -e JWT_SECRET=your_secret \
  --name checkin \
  checkin-automation-panel
```

### 选项 3：Railway / Render

1. 连接 GitHub 仓库
2. 配置环境变量
3. 自动部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 故障排查

### 问题：无法登录

**解决方案：**
- 检查 OAuth 配置是否正确
- 确认 JWT_SECRET 已设置
- 查看浏览器控制台错误信息

### 问题：Playwright 执行失败

**解决方案：**
```bash
# 重新安装 Playwright 浏览器
npx playwright install
```

### 问题：数据库连接失败

**解决方案：**
```bash
# 测试数据库连接
mysql -u user -p -h host -e "SELECT 1"

# 检查 DATABASE_URL 环境变量
echo $DATABASE_URL
```

### 问题：Gotify 通知不工作

**解决方案：**
1. 确认 Gotify 服务器地址包含 `http://` 或 `https://`
2. 验证 Token 是否正确
3. 检查网络连接
4. 查看应用日志中的错误信息

## 获取帮助

- 📖 完整文档：[DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 提交问题：https://github.com/weikkadd/checkin-tasks/issues
- 💬 讨论：https://github.com/weikkadd/checkin-tasks/discussions

## 下一步

- 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解高级配置
- 查看 [API 文档](./docs/API.md)
- 学习如何编写自定义脚本

祝您使用愉快！ 🚀
