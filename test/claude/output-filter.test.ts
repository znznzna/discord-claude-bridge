import { describe, it, expect, beforeEach } from "vitest";
import { OutputFilter, type OutputChunk } from "../../src/claude/output-filter.js";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

describe("OutputFilter", () => {
  let filter: OutputFilter;

  beforeEach(() => {
    filter = new OutputFilter({ showToolSummary: true });
  });

  describe("processMessage", () => {
    it("should extract text from assistant messages", () => {
      const msg = {
        type: "assistant" as const,
        uuid: "uuid-1",
        session_id: "sess-1",
        parent_tool_use_id: null,
        message: {
          role: "assistant" as const,
          content: [{ type: "text" as const, text: "Hello from Claude!" }],
        },
      };

      const chunks = filter.processMessage(msg as SDKMessage);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe("text");
      expect(chunks[0].content).toBe("Hello from Claude!");
    });

    it("should create tool summary for tool_use blocks", () => {
      const msg = {
        type: "assistant" as const,
        uuid: "uuid-2",
        session_id: "sess-1",
        parent_tool_use_id: null,
        message: {
          role: "assistant" as const,
          content: [
            {
              type: "tool_use" as const,
              id: "tool-1",
              name: "Write",
              input: { file_path: "/tmp/test.ts", content: "code" },
            },
          ],
        },
      };

      const chunks = filter.processMessage(msg as SDKMessage);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe("tool_summary");
      expect(chunks[0].content).toContain("Write");
      expect(chunks[0].content).toContain("/tmp/test.ts");
    });

    it("should extract result from success result messages", () => {
      const msg = {
        type: "result" as const,
        subtype: "success" as const,
        uuid: "uuid-3",
        session_id: "sess-1",
        duration_ms: 1000,
        duration_api_ms: 500,
        is_error: false,
        num_turns: 3,
        result: "Task completed successfully",
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

      const chunks = filter.processMessage(msg as SDKMessage);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe("result");
      expect(chunks[0].content).toContain("Task completed successfully");
    });

    it("should extract errors from error result messages", () => {
      const msg = {
        type: "result" as const,
        subtype: "error_during_execution" as const,
        uuid: "uuid-4",
        session_id: "sess-1",
        duration_ms: 500,
        duration_api_ms: 200,
        is_error: true,
        num_turns: 1,
        total_cost_usd: 0.005,
        usage: {
          input_tokens: 50,
          output_tokens: 20,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
        errors: ["Something went wrong"],
      };

      const chunks = filter.processMessage(msg as SDKMessage);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe("error");
      expect(chunks[0].content).toContain("Something went wrong");
    });

    it("should skip system messages", () => {
      const msg = {
        type: "system" as const,
        subtype: "init" as const,
        uuid: "uuid-5",
        session_id: "sess-1",
        apiKeySource: "user" as const,
        cwd: "/tmp",
        tools: [],
        mcp_servers: [],
        model: "claude-sonnet-4-20250514",
        permissionMode: "default" as const,
        slash_commands: [],
        output_style: "text",
      };

      const chunks = filter.processMessage(msg as SDKMessage);
      expect(chunks).toHaveLength(0);
    });

    it("should skip stream_event messages", () => {
      const msg = {
        type: "stream_event" as const,
        event: {},
        parent_tool_use_id: null,
        uuid: "uuid-6",
        session_id: "sess-1",
      };

      const chunks = filter.processMessage(msg as SDKMessage);
      expect(chunks).toHaveLength(0);
    });

    it("should skip tool summaries when showToolSummary is false", () => {
      const filterNoTool = new OutputFilter({ showToolSummary: false });
      const msg = {
        type: "assistant" as const,
        uuid: "uuid-7",
        session_id: "sess-1",
        parent_tool_use_id: null,
        message: {
          role: "assistant" as const,
          content: [
            {
              type: "tool_use" as const,
              id: "tool-2",
              name: "Read",
              input: { file_path: "/tmp/file.ts" },
            },
          ],
        },
      };

      const chunks = filterNoTool.processMessage(msg as SDKMessage);
      expect(chunks).toHaveLength(0);
    });
  });

  describe("formatToolSummary", () => {
    it("should format Write tool", () => {
      const summary = OutputFilter.formatToolSummary("Write", {
        file_path: "/src/index.ts",
        content: "...",
      });
      expect(summary).toBe("> :pencil2: **Write**: `/src/index.ts`");
    });

    it("should format Edit tool", () => {
      const summary = OutputFilter.formatToolSummary("Edit", {
        file_path: "/src/main.ts",
        old_string: "foo",
        new_string: "bar",
      });
      expect(summary).toBe("> :pencil: **Edit**: `/src/main.ts`");
    });

    it("should format Read tool", () => {
      const summary = OutputFilter.formatToolSummary("Read", {
        file_path: "/src/config.ts",
      });
      expect(summary).toBe("> :book: **Read**: `/src/config.ts`");
    });

    it("should format Bash tool", () => {
      const summary = OutputFilter.formatToolSummary("Bash", {
        command: "npm test",
      });
      expect(summary).toBe("> :computer: **Bash**: `npm test`");
    });

    it("should format Glob tool", () => {
      const summary = OutputFilter.formatToolSummary("Glob", {
        pattern: "**/*.ts",
      });
      expect(summary).toBe("> :mag: **Glob**: `**/*.ts`");
    });

    it("should format Grep tool", () => {
      const summary = OutputFilter.formatToolSummary("Grep", {
        pattern: "TODO",
        path: "/src",
      });
      expect(summary).toBe("> :mag_right: **Grep**: `TODO` in `/src`");
    });

    it("should format unknown tool generically", () => {
      const summary = OutputFilter.formatToolSummary("CustomTool", {
        foo: "bar",
      });
      expect(summary).toBe("> :gear: **CustomTool**");
    });
  });
});
