import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeBridge } from "../../src/claude/bridge.js";
import type { ToolPolicyConfig } from "../../src/config/types.js";

// Mock the claude-agent-sdk module
vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
}));

import { query as mockQuery } from "@anthropic-ai/claude-agent-sdk";

describe("ClaudeBridge", () => {
  const defaultToolPolicy: ToolPolicyConfig = {
    autoApprove: ["Read", "Glob"],
    logOnly: ["Write"],
    requireApproval: ["Bash"],
    approvalTimeoutSec: 300,
  };

  let bridge: ClaudeBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new ClaudeBridge({
      cwd: "/tmp/test-project",
      permissionMode: "acceptEdits",
      toolPolicy: defaultToolPolicy,
      showToolSummary: true,
    });
  });

  describe("constructor", () => {
    it("should create an instance with valid options", () => {
      expect(bridge).toBeInstanceOf(ClaudeBridge);
    });
  });

  describe("execute", () => {
    it("should call query with correct parameters and collect output", async () => {
      const assistantMsg = {
        type: "assistant" as const,
        uuid: "uuid-1",
        session_id: "sess-1",
        parent_tool_use_id: null,
        message: {
          role: "assistant" as const,
          content: [{ type: "text" as const, text: "Hello!" }],
        },
      };

      const resultMsg = {
        type: "result" as const,
        subtype: "success" as const,
        uuid: "uuid-2",
        session_id: "sess-1",
        duration_ms: 1000,
        duration_api_ms: 500,
        is_error: false,
        num_turns: 1,
        result: "Done",
        total_cost_usd: 0.01,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
      };

      // Create an async generator mock
      async function* mockGenerator() {
        yield assistantMsg;
        yield resultMsg;
      }

      const mockQueryInstance = mockGenerator();
      vi.mocked(mockQuery).mockReturnValue(mockQueryInstance as any);

      const chunks: Array<{ type: string; content: string }> = [];
      const result = await bridge.execute("Say hello", {
        onChunk: (chunk) => chunks.push(chunk),
      });

      expect(vi.mocked(mockQuery)).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(mockQuery).mock.calls[0][0];
      expect(callArgs.prompt).toBe("Say hello");
      expect(callArgs.options?.cwd).toBe("/tmp/test-project");
      expect(callArgs.options?.permissionMode).toBe("acceptEdits");

      // Should have received both text and result chunks
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks.some((c) => c.content === "Hello!")).toBe(true);

      expect(result.sessionId).toBe("sess-1");
      expect(result.success).toBe(true);
    });

    it("should capture session_id from first message", async () => {
      const systemMsg = {
        type: "system" as const,
        subtype: "init" as const,
        uuid: "uuid-0",
        session_id: "captured-session-id",
        apiKeySource: "user" as const,
        cwd: "/tmp",
        tools: [],
        mcp_servers: [],
        model: "claude-sonnet-4-20250514",
        permissionMode: "default" as const,
        slash_commands: [],
        output_style: "text",
      };

      const resultMsg = {
        type: "result" as const,
        subtype: "success" as const,
        uuid: "uuid-1",
        session_id: "captured-session-id",
        duration_ms: 100,
        duration_api_ms: 50,
        is_error: false,
        num_turns: 1,
        result: "",
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
      };

      async function* mockGenerator() {
        yield systemMsg;
        yield resultMsg;
      }

      vi.mocked(mockQuery).mockReturnValue(mockGenerator() as any);

      const result = await bridge.execute("test", {});
      expect(result.sessionId).toBe("captured-session-id");
    });

    it("should support abort via AbortController", async () => {
      const ac = new AbortController();

      async function* mockGenerator() {
        // Simulate a long-running operation
        yield {
          type: "assistant" as const,
          uuid: "uuid-1",
          session_id: "sess-1",
          parent_tool_use_id: null,
          message: {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: "Working..." }],
          },
        };
        // This yield should not be reached if aborted
        throw new Error("AbortError");
      }

      vi.mocked(mockQuery).mockReturnValue(mockGenerator() as any);

      const result = await bridge.execute("long task", {
        abortController: ac,
      });

      expect(vi.mocked(mockQuery)).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(mockQuery).mock.calls[0][0];
      expect(callArgs.options?.abortController).toBe(ac);
    });

    it("should resume a session when sessionId is provided", async () => {
      const resultMsg = {
        type: "result" as const,
        subtype: "success" as const,
        uuid: "uuid-1",
        session_id: "existing-session",
        duration_ms: 100,
        duration_api_ms: 50,
        is_error: false,
        num_turns: 1,
        result: "Resumed",
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
      };

      async function* mockGenerator() {
        yield resultMsg;
      }

      vi.mocked(mockQuery).mockReturnValue(mockGenerator() as any);

      await bridge.execute("continue", { sessionId: "existing-session" });

      const callArgs = vi.mocked(mockQuery).mock.calls[0][0];
      expect(callArgs.options?.resume).toBe("existing-session");
    });
  });
});
