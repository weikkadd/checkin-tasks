const express = require('express')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')
require('dotenv').config()

// 兼容导入 sdk（核心登录鉴权模块）
const { sdk } = require('./server/_core/sdk')
const { router } = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

// 全局基础中间件
app.use(cors({
  credentials: true,
  origin: true
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ====================== 核心白名单（根治无限302重定向）======================
const WHITE_LIST = [
  "/login.html",
  "/api/login",
  "/api/logout",
  "/api/user/info",
  "/assets/",
  "/favicon.ico"
]
const isWhitePath = (path) => WHITE_LIST.some(item => path.startsWith(item))

// ====================== 登录守卫中间件 ======================
// 登录页守卫：已登录访问登录页自动跳首页
const loginPageGuard = async (req, res, next) => {
  try {
    await sdk.authenticateRequest(req)
    return res.redirect("/")
  } catch {
    return next()
  }
}

// 全局权限守卫：未登录拦截所有页面
const authGuard = async (req, res, next) => {
  const path = req.path
  if (isWhitePath(path)) return next()

  try {
    await sdk.authenticateRequest(req)
    return next()
  } catch {
    return res.redirect("/login.html")
  }
}

// ====================== 核心加载顺序 + 【修复路径BUG】======================
// 1. 托管静态资源（修复：dist 在根目录，删除错误的 ../ 层级）
app.use(express.static(path.resolve(__dirname, './dist')))

// 2. 单独拦截登录页
app.use("/login.html", loginPageGuard)

// 3. 全局权限拦截
app.use(authGuard)

// ====================== 登录配套接口 ======================
// 账号密码登录
app.post("/api/login", async (req, res) => {
  const result = await sdk.localLogin(req, res)
  res.json(result)
})

// 退出登录
app.post("/api/logout", (req, res) => {
  sdk.localLogout(res)
  res.redirect("/login.html")
})

// 获取登录状态
app.get("/api/user/info", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req)
    res.json({ success: true, data: { username: user.name, openId: user.openId } })
  } catch {
    res.json({ success: false, message: "未登录" })
  }
})

// 4. 原有业务接口路由（保留你所有旧接口，不冲突）
app.use('/api', router)

// ====================== 前端SPA兜底路由【修复路径BUG】======================
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './dist/index.html'), (err) => {
    if (err) {
      res.status(404).send('Page Not Found')
    }
  })
})

// 启动服务
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
