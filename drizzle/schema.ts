import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 签到任务表
 * 存储用户配置的各个服务的签到任务信息
 */
export const checkinTasks = mysqlTable("checkin_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceName: varchar("serviceName", { length: 128 }).notNull(),
  serviceUrl: text("serviceUrl").notNull(),
  accountUsername: varchar("accountUsername", { length: 256 }).notNull(),
  accountPassword: text("accountPassword").notNull(), // 加密存储
  checkinInterval: int("checkinInterval").notNull(), // 签到周期（天数）
  lastCheckinTime: timestamp("lastCheckinTime"),
  nextCheckinTime: timestamp("nextCheckinTime"),
  status: mysqlEnum("status", ["正常", "即将到期", "已过期", "执行中"]).default("正常").notNull(),
  executionScript: text("executionScript"), // 自定义执行脚本或预设规则
  isEnabled: int("isEnabled").default(1).notNull(), // 是否启用该任务
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CheckinTask = typeof checkinTasks.$inferSelect;
export type InsertCheckinTask = typeof checkinTasks.$inferInsert;

/**
 * 执行日志表
 * 记录每次自动续期的执行时间、结果、错误详情等
 */
export const executionLogs = mysqlTable("execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => checkinTasks.id, { onDelete: "cascade" }),
  executionTime: timestamp("executionTime").defaultNow().notNull(),
  resultStatus: mysqlEnum("resultStatus", ["成功", "失败", "跳过"]).notNull(),
  errorMessage: text("errorMessage"),
  executionDuration: int("executionDuration"), // 执行耗时（毫秒）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;

/**
 * 系统设置表
 * 存储全局配置（Gotify 服务器、调度策略等）
 */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  gotifyServerUrl: varchar("gotifyServerUrl", { length: 512 }),
  gotifyToken: text("gotifyToken"), // 加密存储
  notificationEnabled: int("notificationEnabled").default(1).notNull(),
  notifyOnSuccess: int("notifyOnSuccess").default(1).notNull(),
  notifyOnFailure: int("notifyOnFailure").default(1).notNull(),
  notifyOnExpiringSoon: int("notifyOnExpiringSoon").default(1).notNull(),
  expiringThresholdDays: int("expiringThresholdDays").default(3).notNull(), // 多少天内视为即将到期
  cronSchedule: varchar("cronSchedule", { length: 128 }).default("0 */6 * * *").notNull(), // 默认每 6 小时检查一次
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * 通知历史表
 * 记录所有推送给用户的通知
 */
export const notificationHistory = mysqlTable("notification_history", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => checkinTasks.id, { onDelete: "cascade" }),
  notificationType: mysqlEnum("notificationType", ["续期成功", "续期失败", "即将到期"]).notNull(),
  message: text("message").notNull(),
  sentTime: timestamp("sentTime").defaultNow().notNull(),
  sentStatus: mysqlEnum("sentStatus", ["已发送", "发送失败"]).default("已发送").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;