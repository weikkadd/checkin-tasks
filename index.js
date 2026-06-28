const express = require('express')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const { sdk } = require('./server/_core/sdk')
const { router } = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

// 基础全局中间件
app.use(cors({ credentials: true, origin: true }))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 白名单：放行所有登录、静态资源接口
const WHITE_LIST = [
  "/login.html",
  "/api/login",
  "/api/logout",
  "/api/user/info",
  "/assets/",
  "/favicon.ico"
]
const isWhitePath = (path) => WHITE_LIST.some(item => path.startsWith(item))

// 登录页守卫：已登录禁止访问登录页
const loginPageGuard = async (req, res, next) => {
  try {
    await sdk.authenticateRequest(req)
    return res.redirect("/")
  } catch {
    return next()
  }
}

// 全局鉴权守卫：未登录拦截所有私有页面
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

// 1. 托管静态资源
app.use(express.static(path.resolve(__dirname, './dist')))

// 2. 最高优先级登录接口（杜绝路由覆盖）
app.post("/api/login", async (req, res) => {
  const result = await sdk.localLogin(req, res)
  res.json(result)
})

app.post("/api/logout", (req, res) => {
  sdk.localLogout(res)
  res.redirect("/login.html")
})

app.get("/api/user/info", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req)
    res.json({ success: true, data: { username: user.name, openId: user.openId } })
  } catch {
    res.json({ success: false, message: "未登录" })
  }
})

// 3. 业务子路由后置，不冲突登录接口
app.use('/api', router)

// 4. 页面守卫挂载
app.use("/login.html", loginPageGuard)
app.use(authGuard)

// 5. SPA前端路由兜底
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './dist/index.html'), (err) => {
    if (err) res.status(404).send('Page Not Found')
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
