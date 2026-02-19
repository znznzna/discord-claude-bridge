import { describe, it, expect } from "vitest";
import { configSchema } from "../../src/config/schema.js";

describe("configSchema", () => {
  it("should validate a minimal valid config", () => {
    const config = {
      discord: { guildId: "123456789012345678" },
      channels: {},
      toolPolicy: {
        autoApprove: ["Read"],
        logOnly: [],
        requireApproval: [],
        approvalTimeoutSec: 300,
      },
      output: {
        streamingIntervalMs: 1500,
        showStreamingUpdates: true,
        showToolSummary: true,
      },
      logging: {
        level: "info",
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should validate a full config with channels", () => {
    const config = {
      discord: { guildId: "123456789012345678" },
      channels: {
        "987654321098765432": {
          directory: "/path/to/project",
          permissionMode: "acceptEdits" as const,
          description: "My project",
        },
      },
      toolPolicy: {
        autoApprove: ["Read", "Glob", "Grep"],
        logOnly: ["Write", "Edit"],
        requireApproval: ["Bash"],
        approvalTimeoutSec: 300,
      },
      output: {
        streamingIntervalMs: 1500,
        showStreamingUpdates: true,
        showToolSummary: true,
      },
      logging: {
        level: "debug",
        file: "/tmp/test.log",
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should reject config without guildId", () => {
    const config = {
      discord: {},
      channels: {},
      toolPolicy: { autoApprove: [], logOnly: [], requireApproval: [], approvalTimeoutSec: 300 },
      output: { streamingIntervalMs: 1500, showStreamingUpdates: true, showToolSummary: true },
      logging: { level: "info" },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should reject invalid permissionMode", () => {
    const config = {
      discord: { guildId: "123456789012345678" },
      channels: { "123": { directory: "/path", permissionMode: "invalid" } },
      toolPolicy: { autoApprove: [], logOnly: [], requireApproval: [], approvalTimeoutSec: 300 },
      output: { streamingIntervalMs: 1500, showStreamingUpdates: true, showToolSummary: true },
      logging: { level: "info" },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should apply defaults for optional fields", () => {
    const config = {
      discord: { guildId: "123456789012345678" },
      channels: {},
      toolPolicy: { autoApprove: [], logOnly: [], requireApproval: [] },
      output: {},
      logging: {},
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toolPolicy.approvalTimeoutSec).toBe(300);
      expect(result.data.output.streamingIntervalMs).toBe(1500);
      expect(result.data.output.showStreamingUpdates).toBe(true);
      expect(result.data.output.showToolSummary).toBe(true);
      expect(result.data.logging.level).toBe("info");
    }
  });
});
