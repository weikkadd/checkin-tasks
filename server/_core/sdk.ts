import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader, serialize } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

// 废弃OAuth接口定义（保留兼容，彻底不启用）
const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {}
  private decodeState(state: string): string {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(): Promise<ExchangeTokenResponse> {
    throw new ForbiddenError("OAuth登录已禁用，请使用本地账号密码登录");
  }
  async getUserInfoByToken(): Promise<GetUserInfoResponse> {
    throw new ForbiddenError("OAuth登录已禁用，请使用本地账号密码登录");
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl || "",
    timeout: AXIOS_TIMEOUT_MS,
  });

// 本地账号密码配置（环境变量优先，安全无后门）
const LOCAL_USER = {
  username: ENV.ADMIN_USER || "admin",
  password: ENV.ADMIN_PASS || "admin123",
};

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  // 本地账号密码校验
  checkLocalAuth(username: string, password: string): boolean {
    return username === LOCAL_USER.username && password === LOCAL_USER.password;
  }

  // 本地登录成功后生成管理员会话Token
  async createLocalAdminSession(): Promise<string> {
    return this.signSession({
      openId: "local_admin_001",
      appId: ENV.appId || "local_app",
      name: LOCAL_USER.username,
    });
  }

  // 【配套登录接口】账号密码登录，设置会话Cookie，返回登录状态
  async localLogin(req: Request, res: Response): Promise<{ success: boolean; message: string }> {
    const { username, password } = req.body || {};

    // 参数校验
    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      return { success: false, message: "账号密码不能为空" };
    }

    // 账号密码校验
    if (!this.checkLocalAuth(username, password)) {
      return { success: false, message: "账号或密码错误" };
    }

    // 生成会话Token
    const sessionToken = await this.createLocalAdminSession();

    // 设置长效登录Cookie，适配全站鉴权
    const cookie = serialize(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ONE_YEAR_MS / 1000,
      path: "/",
    });

    res.setHeader("Set-Cookie", cookie);
    return { success: true, message: "登录成功" };
  }

  // 【配套登出接口】清空登录Cookie，退出登录
  localLogout(res: Response): { success: boolean; message: string } {
    // 清空Cookie
    const clearCookie = serialize(COOKIE_NAME, "", {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    res.setHeader("Set-Cookie", clearCookie);
    return { success: true, message: "已退出登录" };
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret || "local-admin-secret-key";
    return new TextEncoder().encode(secret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId || "local_app",
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      return null;
    }
  }

  // 主鉴权逻辑：纯本地会话鉴权，彻底移除OAuth依赖
  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);

    // 已有有效会话，直接登录
    if (session) {
      const signedInAt = new Date();
      let user = await db.getUserByOpenId(session.openId);

      // 自动创建本地管理员用户
      if (!user) {
        await db.upsertUser({
          openId: session.openId,
          name: session.name || "Admin",
          email: null,
          loginMethod: "local",
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(session.openId);
      }

      if (!user) throw ForbiddenError("用户不存在");

      // 更新最后登录时间
      await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });
      return user;
    }

    throw ForbiddenError("请先登录系统");
  }

  // 废弃原有OAuth方法，兼容旧代码不报错
  private deriveLoginMethod(): null { return null; }
  async exchangeCodeForToken(): Promise<ExchangeTokenResponse> { throw new ForbiddenError("OAuth已禁用"); }
  async getUserInfo(): Promise<GetUserInfoResponse> { throw new ForbiddenError("OAuth已禁用"); }
  async getUserInfoWithJwt(): Promise<GetUserInfoWithJwtResponse> { throw new ForbiddenError("OAuth已禁用"); }
}

const CRON_OPEN_ID_PREFIX = "cron_";

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

// 保留Cron任务用户适配（不影响前台登录）
function buildCronUser(
  userInfo: GetUserInfoWithJwtResponse
): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? undefined,
    isCron: true,
  } as AuthenticatedUser;
}

// 【关键修复】导出 sdk 实例！！解决构建报错
export const sdk = new SDKServer();
