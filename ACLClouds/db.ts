import { eq, and, desc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  CheckinTask,
  checkinTasks,
  InsertCheckinTask,
  ExecutionLog,
  executionLogs,
  InsertExecutionLog,
  SystemSetting,
  systemSettings,
  InsertSystemSetting,
  NotificationHistory,
  notificationHistory,
  InsertNotificationHistory,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Checkin Tasks ============

export async function createCheckinTask(task: InsertCheckinTask): Promise<CheckinTask | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(checkinTasks).values(task);
  const id = result[0].insertId;
  return getCheckinTaskById(id as number);
}

export async function getCheckinTaskById(id: number): Promise<CheckinTask | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(checkinTasks).where(eq(checkinTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getCheckinTasksByUserId(userId: number): Promise<CheckinTask[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(checkinTasks).where(eq(checkinTasks.userId, userId));
}

export async function updateCheckinTask(id: number, updates: Partial<InsertCheckinTask>): Promise<CheckinTask | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(checkinTasks).set(updates).where(eq(checkinTasks.id, id));
  return getCheckinTaskById(id);
}

export async function deleteCheckinTask(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(checkinTasks).where(eq(checkinTasks.id, id));
  return true;
}

// ============ Execution Logs ============

export async function createExecutionLog(log: InsertExecutionLog): Promise<ExecutionLog | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(executionLogs).values(log);
  const id = result[0].insertId;
  return getExecutionLogById(id as number);
}

export async function getExecutionLogById(id: number): Promise<ExecutionLog | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(executionLogs).where(eq(executionLogs.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getExecutionLogsByTaskId(taskId: number, limit: number = 50): Promise<ExecutionLog[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(executionLogs)
    .where(eq(executionLogs.taskId, taskId))
    .orderBy(desc(executionLogs.createdAt))
    .limit(limit);
}

// ============ System Settings ============

export async function getSystemSettingsByUserId(userId: number): Promise<SystemSetting | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(systemSettings).where(eq(systemSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSystemSettings(userId: number, settings: Partial<InsertSystemSetting>): Promise<SystemSetting | null> {
  const db = await getDb();
  if (!db) return null;

  const existing = await getSystemSettingsByUserId(userId);
  
  if (existing) {
    await db.update(systemSettings).set(settings).where(eq(systemSettings.userId, userId));
  } else {
    await db.insert(systemSettings).values({ userId, ...settings } as InsertSystemSetting);
  }

  return getSystemSettingsByUserId(userId);
}

// ============ Notification History ============

export async function createNotificationHistory(notification: InsertNotificationHistory): Promise<NotificationHistory | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(notificationHistory).values(notification);
  const id = result[0].insertId;
  return getNotificationHistoryById(id as number);
}

export async function getNotificationHistoryById(id: number): Promise<NotificationHistory | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(notificationHistory).where(eq(notificationHistory.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getNotificationHistoryByTaskId(taskId: number, limit: number = 100): Promise<NotificationHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(notificationHistory)
    .where(eq(notificationHistory.taskId, taskId))
    .orderBy(desc(notificationHistory.createdAt))
    .limit(limit);
}

export async function getNotificationHistoryByUserId(userId: number, limit: number = 100): Promise<NotificationHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(notificationHistory)
    .innerJoin(checkinTasks, eq(notificationHistory.taskId, checkinTasks.id))
    .where(eq(checkinTasks.userId, userId))
    .orderBy(desc(notificationHistory.createdAt))
    .limit(limit)
    .then(rows => rows.map(row => row.notification_history));
}
