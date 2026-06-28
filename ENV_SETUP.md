# 环境变量配置指南

## 必需的环境变量

### 数据库配置

```env
DATABASE_URL=mysql://username:password@host:3306/database_name
```

**示例：**
```env
DATABASE_URL=mysql://root:root@localhost:3306/checkin_db
DATABASE_URL=mysql://user:pass123@db.example.com:3306/checkin_prod
```

### OAuth 配置（Manus）

```env
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
```

获取 APP_ID：
1. 登录 Manus 管理后台
2. 创建 OAuth 应用
3. 复制应用 ID

### JWT 密钥

```env
JWT_SECRET=your_secret_key_here_change_in_production
```

**生成强密钥：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 应用信息

```env
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Administrator
VITE_APP_TITLE=签到自动续期管理平台
VITE_APP_LOGO=https://your-logo-url.png
```

## 可选的环境变量

### 分析和监控

```env
VITE_ANALYTICS_ENDPOINT=https://your-analytics.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

### Manus 内置 API

```env
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_api_key
```

### Playwright 配置

```env
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_LAUNCH_ARGS=--disable-blink-features=AutomationControlled
```

## 本地开发设置

1. **复制模板文件**
```bash
cp .env.example .env.local
```

2. **编辑 .env.local**
```bash
nano .env.local
```

3. **填写必需的值**
   - DATABASE_URL
   - JWT_SECRET（可以使用任意值用于开发）
   - VITE_APP_ID（如果使用 Manus OAuth）

4. **启动开发服务器**
```bash
bun run dev
```

## 生产环境设置

### Manus WebDev

在 Manus 管理界面的"设置"→"Secrets"中配置所有环境变量。

### Docker 部署

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@db:3306/checkin_db" \
  -e JWT_SECRET="your_secret_key" \
  -e VITE_APP_ID="your_app_id" \
  -e OAUTH_SERVER_URL="https://api.manus.im" \
  -e VITE_OAUTH_PORTAL_URL="https://oauth.manus.im" \
  -e OWNER_OPEN_ID="your_owner_id" \
  -e OWNER_NAME="Administrator" \
  -e VITE_APP_TITLE="签到管理平台" \
  checkin-automation-panel
```

### Railway 部署

1. 在 Railway 项目设置中配置环境变量
2. 添加 MySQL 插件
3. 自动注入 DATABASE_URL

### GitHub Actions

在 GitHub 仓库的"Settings"→"Secrets and variables"→"Actions"中添加：

```
VITE_APP_ID
JWT_SECRET
OAUTH_SERVER_URL
VITE_OAUTH_PORTAL_URL
OWNER_OPEN_ID
OWNER_NAME
VITE_APP_TITLE
```

然后在工作流文件中引用：
```yaml
env:
  VITE_APP_ID: ${{ secrets.VITE_APP_ID }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  # ...
```

## 安全最佳实践

1. **不要提交 .env 文件到 Git**
   ```bash
   # .gitignore 中应该包含
   .env
   .env.local
   .env.*.local
   ```

2. **使用强密钥**
   - JWT_SECRET 至少 32 字符
   - 定期轮换密钥

3. **限制权限**
   - 数据库用户只授予必要的权限
   - 使用只读用户进行备份

4. **使用 HTTPS**
   - 生产环境必须使用 HTTPS
   - 定期更新 SSL 证书

5. **监控日志**
   - 定期检查应用日志
   - 监控异常访问

## 验证配置

启动应用后，检查以下几点：

1. **数据库连接**
   - 应用成功启动
   - 日志中没有数据库错误

2. **OAuth 登录**
   - 可以成功登录
   - 用户信息正确显示

3. **API 功能**
   - 可以创建任务
   - 可以保存设置
   - 可以查看日志

## 故障排查

### 错误：`Cannot find module 'mysql2'`

**解决方案：**
```bash
bun install
```

### 错误：`ECONNREFUSED` 数据库连接失败

**检查清单：**
1. MySQL 是否运行：`mysql -u root -p`
2. 数据库是否存在：`SHOW DATABASES;`
3. DATABASE_URL 是否正确
4. 防火墙是否阻止连接

### 错误：`JWT_SECRET is not defined`

**解决方案：**
确保 .env.local 中包含 JWT_SECRET：
```env
JWT_SECRET=your_secret_key_here
```

### 错误：`OAuth login failed`

**检查清单：**
1. VITE_APP_ID 是否正确
2. OAUTH_SERVER_URL 是否可访问
3. 应用是否已在 Manus 后台注册
4. 回调 URL 是否配置正确

## 更多信息

- 完整部署指南：[DEPLOYMENT.md](./DEPLOYMENT.md)
- 快速开始：[QUICKSTART.md](./QUICKSTART.md)
- GitHub Issues：https://github.com/weikkadd/checkin-tasks/issues
