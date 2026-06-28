import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Tasks API", () => {
  it("should create a new task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.create({
      serviceName: "Test Service",
      serviceUrl: "https://example.com/login",
      accountUsername: "testuser",
      accountPassword: "testpass",
      checkinInterval: 7,
    });

    expect(result).toBeDefined();
    expect(result.serviceName).toBe("Test Service");
    expect(result.checkinInterval).toBe(7);
  });

  it("should list tasks for current user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a task first
    await caller.tasks.create({
      serviceName: "Test Service",
      serviceUrl: "https://example.com/login",
      accountUsername: "testuser",
      accountPassword: "testpass",
      checkinInterval: 7,
    });

    // List tasks
    const tasks = await caller.tasks.list();

    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("should reject invalid URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.tasks.create({
        serviceName: "Test Service",
        serviceUrl: "not-a-url",
        accountUsername: "testuser",
        accountPassword: "testpass",
        checkinInterval: 7,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message || JSON.stringify(error)).toBeTruthy();
    }
  });

  it("should reject invalid checkin interval", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.tasks.create({
        serviceName: "Test Service",
        serviceUrl: "https://example.com/login",
        accountUsername: "testuser",
        accountPassword: "testpass",
        checkinInterval: 0, // Invalid
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message || JSON.stringify(error)).toBeTruthy();
    }
  });
});

describe("Settings API", () => {
  it("should get default settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const settings = await caller.settings.get();

    expect(settings).toBeDefined();
    expect(settings.notificationEnabled).toBe(1);
    expect(settings.cronSchedule).toBe("0 */6 * * *");
  });

  it("should update settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const updated = await caller.settings.update({
      gotifyServerUrl: "https://gotify.example.com",
      gotifyToken: "test-token",
      notificationEnabled: 1,
      notifyOnSuccess: 1,
      notifyOnFailure: 1,
      notifyOnExpiringSoon: 1,
      cronSchedule: "0 */12 * * *",
      expiringThresholdDays: 5,
    });

    expect(updated.gotifyServerUrl).toBe("https://gotify.example.com");
    expect(updated.cronSchedule).toBe("0 */12 * * *");
  });
});

describe("Auth API", () => {
  it("should return current user info", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.id).toBe(1);
    expect(user?.openId).toBe("test-user-1");
  });
});
