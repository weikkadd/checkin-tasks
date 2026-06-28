const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()
const { router } = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 接口路由
app.use('/api', router)

// ====================== 新增前端路由兜底（解决 Example Page）======================
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'), (err) => {
    if (err) {
      res.status(404).send('Page Not Found')
    }
  })
})

// 启动服务
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
