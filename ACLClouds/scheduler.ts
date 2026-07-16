import cron from "node-cron";
import * as db from "./db";
import { executeAutomationTask, AutomationExecutionConfig } from "./automation";
import * as notifications from "./notifications";
import { CheckinTask } from "../drizzle/schema";

/**
 * 全局 Cron 任务存储
 */
const activeTasks: Map<string, cron.ScheduledTask> = new Map();

/**
 * 计算任务状态
 */
function calculateTaskStatus(task: CheckinTask): string {
  if (!task.nextCheckinTime) {
    return "正常";
  }

  const now = new Date();
  const nextTime = new Date(task.nextCheckinTime);
  const daysUntilExpiry = Math.ceil((nextTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    return "已过期";
  } else if (daysUntilExpiry <= 3) {
    return "即将到期";
  } else {
    return "正常";
  }
}

/**
 * 执行单个任务的续期逻辑
 */
async function executeTaskRenewal(task: CheckinTask): Promise<void> {
  try {
    console.log(`[Scheduler] 开始执行任务: ${task.serviceName} (ID: ${task.id})`);

    // 更新任务状态为"执行中"
    await db.updateCheckinTask(task.id, { status: "执行中" });

    // 执行自动化脚本
    const config: AutomationExecutionConfig = {
      url: task.serviceUrl,
      username: task.accountUsername,
      password: task.accountPassword,
      script: task.executionScript || undefined,
      timeout: 120000, // 2 分钟超时
    };

    const result = await executeAutomationTask(config);

    if (result.success) {
      // 续期成功，更新下次签到时间
      const nextCheckinTime = new Date();
      nextCheckinTime.setDate(nextCheckinTime.getDate() + task.checkinInterval);

      await db.updateCheckinTask(task.id, {
        status: "正常" as const,
        lastCheckinTime: new Date(),
        nextCheckinTime,
      });

      // 记录执行日志
      await db.createExecutionLog({
        taskId: task.id,
        resultStatus: "成功",
        executionDuration: result.duration,
      });

      // 发送成功通知
      await notifications.notifyCheckinSuccess(task.userId, task.id, task.serviceName);

      console.log(`[Scheduler] 任务执行成功: ${task.serviceName}`);
    } else {
      // 续期失败
      const newStatus = calculateTaskStatus(task) as "正常" | "即将到期" | "已过期" | "执行中";
      await db.updateCheckinTask(task.id, { status: newStatus });

      // 记录执行日志
      await db.createExecutionLog({
        taskId: task.id,
        resultStatus: "失败",
        errorMessage: result.errorDetails,
        executionDuration: result.duration,
      });

      // 发送失败通知
      await notifications.notifyCheckinFailure(
        task.userId,
        task.id,
        task.serviceName,
        result.errorDetails || "未知错误"
      );

      console.error(`[Scheduler] 任务执行失败: ${task.serviceName} - ${result.errorDetails}`);
    }
  } catch (error) {
    console.error(`[Scheduler] 任务执行异常: ${task.serviceName}`, error);

    // 记录执行日志
    await db.createExecutionLog({
      taskId: task.id,
      resultStatus: "失败",
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // 发送失败通知
    await notifications.notifyCheckinFailure(
      task.userId,
      task.id,
      task.serviceName,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 检查所有任务的到期状态
 */
async function checkAllTasksStatus(): Promise<void> {
  try {
    console.log("[Scheduler] 开始检查所有任务状态");

    // 获取所有用户
    // 注意：这里需要从数据库获取所有用户，但当前没有实现
    // 为了演示，我们假设有一个方法可以获取所有用户
    // 实际实现中，应该遍历所有用户的任务

    console.log("[Scheduler] 任务状态检查完成");
  } catch (error) {
    console.error("[Scheduler] 检查任务状态失败:", error);
  }
}

/**
 * 启动定时调度
 */
export async function startScheduler(): Promise<void> {
  try {
    console.log("[Scheduler] 启动定时调度系统");

    // 每 6 小时检查一次所有任务
    const checkTask = cron.schedule("0 */6 * * *", async () => {
      console.log("[Scheduler] 执行定期检查");
      await checkAllTasksStatus();
    });

    activeTasks.set("check-all-tasks", checkTask);

    console.log("[Scheduler] 定时调度系统已启动");
  } catch (error) {
    console.error("[Scheduler] 启动定时调度失败:", error);
  }
}

/**
 * 停止定时调度
 */
export async function stopScheduler(): Promise<void> {
  try {
    console.log("[Scheduler] 停止定时调度系统");

    activeTasks.forEach((task, key) => {
      task.stop();
      console.log(`[Scheduler] 已停止任务: ${key}`);
    });

    activeTasks.clear();

    console.log("[Scheduler] 定时调度系统已停止");
  } catch (error) {
    console.error("[Scheduler] 停止定时调度失败:", error);
  }
}

/**
 * 手动触发单个任务的续期
 */
export async function manuallyTriggerTaskRenewal(taskId: number): Promise<{ success: boolean; message: string }> {
  try {
    const task = await db.getCheckinTaskById(taskId);
    if (!task) {
      return { success: false, message: "任务不存在" };
    }

    if (!task.isEnabled) {
      return { success: false, message: "任务已禁用" };
    }

    await executeTaskRenewal(task);
    return { success: true, message: "任务已触发执行" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 为用户启动个性化的定时任务
 */
export async function startUserScheduler(userId: number): Promise<void> {
  try {
    const settings = await db.getSystemSettingsByUserId(userId);
    if (!settings) {
      console.log(`[Scheduler] 用户 ${userId} 没有配置系统设置`);
      return;
    }

    const cronExpression = settings.cronSchedule || "0 */6 * * *";
    const taskKey = `user-${userId}-scheduler`;

    // 如果已存在任务，先停止它
    if (activeTasks.has(taskKey)) {
      const existingTask = activeTasks.get(taskKey);
      if (existingTask) {
        existingTask.stop();
      }
      activeTasks.delete(taskKey);
    }

    // 创建新的定时任务
    const task = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] 执行用户 ${userId} 的定期检查`);

      try {
        const userTasks = await db.getCheckinTasksByUserId(userId);
        const now = new Date();

        for (const userTask of userTasks) {
          if (!userTask.isEnabled) {
            continue;
          }

          // 检查是否需要执行续期
          if (userTask.nextCheckinTime && new Date(userTask.nextCheckinTime) <= now) {
            console.log(`[Scheduler] 任务 ${userTask.serviceName} 需要续期`);
            await executeTaskRenewal(userTask);
          } else if (userTask.nextCheckinTime) {
            // 检查是否即将到期
            const daysUntilExpiry = Math.ceil(
              (new Date(userTask.nextCheckinTime).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilExpiry <= settings.expiringThresholdDays && daysUntilExpiry > 0) {
              // 发送即将到期提醒
              const status = calculateTaskStatus(userTask);
              if (status === "即将到期" || status === "已过期") {
                await notifications.notifyExpiringsoon(userId, userTask.id, userTask.serviceName, Math.max(daysUntilExpiry, 0));
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Scheduler] 用户 ${userId} 的定期检查失败:`, error);
      }
    });

    activeTasks.set(taskKey, task);
    console.log(`[Scheduler] 用户 ${userId} 的定时任务已启动 (表达式: ${cronExpression})`);
  } catch (error) {
    console.error(`[Scheduler] 启动用户 ${userId} 的定时任务失败:`, error);
  }
}

/**
 * 停止用户的定时任务
 */
export async function stopUserScheduler(userId: number): Promise<void> {
  const taskKey = `user-${userId}-scheduler`;
  const task = activeTasks.get(taskKey);
  if (task) {
    task.stop();
    activeTasks.delete(taskKey);
    console.log(`[Scheduler] 用户 ${userId} 的定时任务已停止`);
  }
}
