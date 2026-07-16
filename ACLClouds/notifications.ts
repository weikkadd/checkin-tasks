import axios from "axios";
import * as db from "./db";

/**
 * Gotify 通知消息
 */
export interface GotifyMessage {
  title: string;
  message: string;
  priority?: number; // 1-10，默认 5
}

/**
 * 发送 Gotify 通知
 */
export async function sendGotifyNotification(
  serverUrl: string,
  token: string,
  notification: GotifyMessage
): Promise<boolean> {
  try {
    // 移除 URL 末尾的斜杠
    const cleanUrl = serverUrl.replace(/\/$/, "");

    const response = await axios.post(
      `${cleanUrl}/message?token=${token}`,
      {
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 5,
      },
      {
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("[Gotify] 通知发送成功:", response.status);
    return true;
  } catch (error) {
    console.error("[Gotify] 通知发送失败:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * 验证 Gotify 服务器配置
 */
export async function validateGotifyConfig(serverUrl: string, token: string): Promise<boolean> {
  try {
    const cleanUrl = serverUrl.replace(/\/$/, "");

    // 尝试发送测试消息
    const response = await axios.post(
      `${cleanUrl}/message?token=${token}`,
      {
        title: "测试通知",
        message: "这是一条来自签到自动续期管理面板的测试通知",
        priority: 5,
      },
      {
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error("[Gotify] 配置验证失败:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * 续期成功通知
 */
export async function notifyCheckinSuccess(
  userId: number,
  taskId: number,
  serviceName: string
): Promise<void> {
  const settings = await db.getSystemSettingsByUserId(userId);
  if (!settings || !settings.gotifyServerUrl || !settings.gotifyToken) {
    console.log("[Notifications] 未配置 Gotify，跳过通知");
    return;
  }

  if (!settings.notificationEnabled || !settings.notifyOnSuccess) {
    console.log("[Notifications] 续期成功通知已禁用");
    return;
  }

  const message: GotifyMessage = {
    title: `✅ 续期成功 - ${serviceName}`,
    message: `服务 "${serviceName}" 的签到续期已成功完成。下次检查将在 6 小时后进行。`,
    priority: 5,
  };

  const success = await sendGotifyNotification(
    settings.gotifyServerUrl,
    settings.gotifyToken,
    message
  );

  // 记录通知历史
  await db.createNotificationHistory({
    taskId,
    notificationType: "续期成功",
    message: message.message,
    sentStatus: success ? "已发送" : "发送失败",
  });
}

/**
 * 续期失败通知
 */
export async function notifyCheckinFailure(
  userId: number,
  taskId: number,
  serviceName: string,
  errorMessage: string
): Promise<void> {
  const settings = await db.getSystemSettingsByUserId(userId);
  if (!settings || !settings.gotifyServerUrl || !settings.gotifyToken) {
    console.log("[Notifications] 未配置 Gotify，跳过通知");
    return;
  }

  if (!settings.notificationEnabled || !settings.notifyOnFailure) {
    console.log("[Notifications] 续期失败通知已禁用");
    return;
  }

  const message: GotifyMessage = {
    title: `❌ 续期失败 - ${serviceName}`,
    message: `服务 "${serviceName}" 的签到续期失败。\n错误信息: ${errorMessage}\n请手动检查并重试。`,
    priority: 8,
  };

  const success = await sendGotifyNotification(
    settings.gotifyServerUrl,
    settings.gotifyToken,
    message
  );

  // 记录通知历史
  await db.createNotificationHistory({
    taskId,
    notificationType: "续期失败",
    message: message.message,
    sentStatus: success ? "已发送" : "发送失败",
  });
}

/**
 * 即将到期提醒通知
 */
export async function notifyExpiringsoon(
  userId: number,
  taskId: number,
  serviceName: string,
  daysUntilExpiry: number
): Promise<void> {
  const settings = await db.getSystemSettingsByUserId(userId);
  if (!settings || !settings.gotifyServerUrl || !settings.gotifyToken) {
    console.log("[Notifications] 未配置 Gotify，跳过通知");
    return;
  }

  if (!settings.notificationEnabled || !settings.notifyOnExpiringSoon) {
    console.log("[Notifications] 即将到期通知已禁用");
    return;
  }

  const message: GotifyMessage = {
    title: `⏰ 即将到期 - ${serviceName}`,
    message: `服务 "${serviceName}" 将在 ${daysUntilExpiry} 天后到期。请及时续期。`,
    priority: 7,
  };

  const success = await sendGotifyNotification(
    settings.gotifyServerUrl,
    settings.gotifyToken,
    message
  );

  // 记录通知历史
  await db.createNotificationHistory({
    taskId,
    notificationType: "即将到期",
    message: message.message,
    sentStatus: success ? "已发送" : "发送失败",
  });
}
