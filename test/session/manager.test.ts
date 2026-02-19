import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "../../src/session/manager.js";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe("create", () => {
    it("should create a new session", () => {
      const session = manager.create({
        channelId: "ch-1",
        cwd: "/tmp/project",
      });

      expect(session.channelId).toBe("ch-1");
      expect(session.cwd).toBe("/tmp/project");
      expect(session.state).toBe("idle");
      expect(session.sessionId).toBeNull();
      expect(session.abortController).toBeNull();
      expect(session.permissionMode).toBe("acceptEdits");
      expect(session.messageQueue).toEqual([]);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
    });

    it("should create a session with custom permissionMode", () => {
      const session = manager.create({
        channelId: "ch-2",
        cwd: "/tmp/project2",
        permissionMode: "plan",
      });

      expect(session.permissionMode).toBe("plan");
    });

    it("should throw if session already exists for channel", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      expect(() =>
        manager.create({ channelId: "ch-1", cwd: "/tmp/b" }),
      ).toThrow("Session already exists");
    });
  });

  describe("get", () => {
    it("should return existing session", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      const session = manager.get("ch-1");
      expect(session).toBeDefined();
      expect(session?.channelId).toBe("ch-1");
    });

    it("should return undefined for non-existent session", () => {
      const session = manager.get("ch-999");
      expect(session).toBeUndefined();
    });
  });

  describe("destroy", () => {
    it("should remove a session", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      const destroyed = manager.destroy("ch-1");
      expect(destroyed).toBe(true);
      expect(manager.get("ch-1")).toBeUndefined();
    });

    it("should return false for non-existent session", () => {
      const destroyed = manager.destroy("ch-999");
      expect(destroyed).toBe(false);
    });

    it("should abort active AbortController on destroy", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      const session = manager.get("ch-1")!;
      const ac = new AbortController();
      session.abortController = ac;

      manager.destroy("ch-1");
      expect(ac.signal.aborted).toBe(true);
    });
  });

  describe("setState", () => {
    it("should update session state", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      manager.setState("ch-1", "processing");
      expect(manager.get("ch-1")?.state).toBe("processing");
    });

    it("should update lastActivityAt", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      const before = manager.get("ch-1")!.lastActivityAt;

      manager.setState("ch-1", "processing");
      const after = manager.get("ch-1")!.lastActivityAt;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should throw for non-existent session", () => {
      expect(() => manager.setState("ch-999", "idle")).toThrow();
    });
  });

  describe("enqueueMessage", () => {
    it("should add message to queue", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      manager.enqueueMessage("ch-1", "hello");
      manager.enqueueMessage("ch-1", "world");

      const session = manager.get("ch-1")!;
      expect(session.messageQueue).toEqual(["hello", "world"]);
    });

    it("should throw for non-existent session", () => {
      expect(() => manager.enqueueMessage("ch-999", "msg")).toThrow();
    });
  });

  describe("dequeueMessage", () => {
    it("should dequeue first message", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      manager.enqueueMessage("ch-1", "first");
      manager.enqueueMessage("ch-1", "second");

      const msg = manager.dequeueMessage("ch-1");
      expect(msg).toBe("first");

      const session = manager.get("ch-1")!;
      expect(session.messageQueue).toEqual(["second"]);
    });

    it("should return undefined when queue is empty", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      const msg = manager.dequeueMessage("ch-1");
      expect(msg).toBeUndefined();
    });
  });

  describe("listAll", () => {
    it("should return all sessions", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      manager.create({ channelId: "ch-2", cwd: "/tmp/b" });

      const sessions = manager.listAll();
      expect(sessions).toHaveLength(2);
    });

    it("should return empty array when no sessions", () => {
      expect(manager.listAll()).toEqual([]);
    });
  });

  describe("setSessionId", () => {
    it("should set the Claude session ID", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      manager.setSessionId("ch-1", "claude-session-abc");

      const session = manager.get("ch-1")!;
      expect(session.sessionId).toBe("claude-session-abc");
    });
  });

  describe("clearHistory", () => {
    it("should reset sessionId, messageQueue, and state", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      manager.setSessionId("ch-1", "old-session");
      manager.enqueueMessage("ch-1", "pending message");
      manager.setState("ch-1", "processing");

      manager.clearHistory("ch-1");

      const session = manager.get("ch-1")!;
      expect(session.sessionId).toBeNull();
      expect(session.messageQueue).toEqual([]);
      expect(session.state).toBe("idle");
    });

    it("should update lastActivityAt", () => {
      manager.create({ channelId: "ch-1", cwd: "/tmp/a" });
      const before = manager.get("ch-1")!.lastActivityAt;

      manager.clearHistory("ch-1");
      const after = manager.get("ch-1")!.lastActivityAt;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should throw for non-existent session", () => {
      expect(() => manager.clearHistory("ch-999")).toThrow();
    });
  });
});
