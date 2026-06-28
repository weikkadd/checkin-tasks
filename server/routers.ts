import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as scheduler from "./scheduler";
import { TRPCError } from "@trpc/server";

// ============ Validation Schemas ============

const CreateCheckinTaskSchema = z.object({
  serviceName: z.string().min(1, "服务名称不能为空"),
  serviceUrl: z.string().url("请输入有效的 URL"),
  accountUsername: z.string().min(1, "账号不能为空"),
  accountPassword: z.string().min(1, "密码不能为空"),
  checkinInterval: z.number().int().min(1, "签到周期必须大于 0"),
  executionScript: z.string().optional(),
});

const UpdateCheckinTaskSchema = CreateCheckinTaskSchema.partial();

const SystemSettingsSchema = z.object({
  gotifyServerUrl: z.string().url("请输入有效的 Gotify 服务器 URL").optional().or(z.literal("")),
  gotifyToken: z.string().optional(),
  notificationEnabled: z.number().int().min(0).max(1),
  notifyOnSuccess: z.number().int().min(0).max(1),
  notifyOnFailure: z.number().int().min(0).max(1),
  notifyOnExpiringSoon: z.number().int().min(0).max(1),
  expiringThresholdDays: z.number().int().min(1, "阈值必须大于 0"),
  cronSchedule: z.string().min(1, "Cron 表达式不能为空"),
});

// ============ Checkin Tasks Router ============

const tasksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await db.getCheckinTasksByUserId(ctx.user.id);
    return tasks;
  }),

  create: protectedProcedure
    .input(CreateCheckinTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await db.createCheckinTask({
        userId: ctx.user.id,
        ...input,
        nextCheckinTime: new Date(Date.now() + input.checkinInterval * 24 * 60 * 60 * 1000),
      });
      if (!task) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "创建任务失败" });
      return task;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await db.getCheckinTaskById(input.id);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }
      return task;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateCheckinTaskSchema }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.getCheckinTaskById(input.id);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }

      const updated = await db.updateCheckinTask(input.id, input.data);
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "更新任务失败" });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.getCheckinTaskById(input.id);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }

      const success = await db.deleteCheckinTask(input.id);
      if (!success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "删除任务失败" });
      return { success: true };
    }),

  toggleEnabled: protectedProcedure
    .input(z.object({ id: z.number(), isEnabled: z.number().int().min(0).max(1) }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.getCheckinTaskById(input.id);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }

      const updated = await db.updateCheckinTask(input.id, { isEnabled: input.isEnabled });
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "更新任务失败" });
      return updated;
    }),
});

// ============ Execution Logs Router ============

const logsRouter = router({
  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.number(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const task = await db.getCheckinTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }

      return db.getExecutionLogsByTaskId(input.taskId, input.limit);
    }),
});

// ============ System Settings Router ============

const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.getSystemSettingsByUserId(ctx.user.id);
    if (!settings) {
      // 返回默认设置
      return {
        id: 0,
        userId: ctx.user.id,
        gotifyServerUrl: null,
        gotifyToken: null,
        notificationEnabled: 1,
        notifyOnSuccess: 1,
        notifyOnFailure: 1,
        notifyOnExpiringSoon: 1,
        expiringThresholdDays: 3,
        cronSchedule: "0 */6 * * *",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return settings;
  }),

  update: protectedProcedure
    .input(SystemSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await db.upsertSystemSettings(ctx.user.id, input);
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "更新设置失败" });
      return updated;
    }),
});

// ============ Notification History Router ============

const notificationsRouter = router({
  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.number(), limit: z.number().default(100) }))
    .query(async ({ ctx, input }) => {
      const task = await db.getCheckinTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }

      return db.getNotificationHistoryByTaskId(input.taskId, input.limit);
    }),

  getByUserId: protectedProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ ctx, input }) => {
      return db.getNotificationHistoryByUserId(ctx.user.id, input.limit);
    }),
});

// ============ Main App Router ============

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  tasks: tasksRouter,
  logs: logsRouter,
  settings: settingsRouter,
  notifications: notificationsRouter,

  triggerRenewal: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.getCheckinTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }

      // 异步触发续期，不阻塞响应
      scheduler.manuallyTriggerTaskRenewal(input.taskId).catch(error => {
        console.error("[API] 手动触发续期失败:", error);
      });

      return {
        success: true,
        message: "续期任务已提交，请稍候...",
      };
    })
});

export type AppRouter = typeof appRouter;
