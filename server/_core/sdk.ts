import type { Request, Response, NextFunction } from "express";
import { sdk } from "./sdk";

// 无需登录放行的白名单（固定放行登录页、登录接口、用户校验接口）
const WHITE_LIST = [
  "/login.html",
  "/api/login",
  "/api/user/info"
];

// 全局登录守卫中间件
export async function authGuard(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  // 1. 白名单路径直接放行
  if (WHITE_LIST.some(item => path.startsWith(item))) {
    return next();
  }

  try {
    // 2. 校验登录状态
    await sdk.authenticateRequest(req);
    // 已登录，正常访问页面
    return next();
  } catch (err) {
    // 3. 未登录，所有页面自动跳转登录页
    return res.redirect("/login.html");
  }
}

// 登录页专属拦截：已登录禁止访问登录页，自动跳首页
export async function loginPageGuard(req: Request, res: Response, next: NextFunction) {
  try {
    await sdk.authenticateRequest(req);
    // 已登录访问登录页 → 跳转后台首页
    return res.redirect("/");
  } catch (err) {
    // 未登录正常访问登录页
    return next();
  }
}
