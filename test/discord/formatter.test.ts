import { describe, it, expect } from "vitest";
import { MessageFormatter } from "../../src/discord/formatter.js";

describe("MessageFormatter", () => {
  describe("splitMessage", () => {
    it("should return single chunk for short messages", () => {
      const result = MessageFormatter.splitMessage("Hello world");
      expect(result).toEqual(["Hello world"]);
    });

    it("should split long messages at 2000 characters", () => {
      const longText = "a".repeat(4500);
      const result = MessageFormatter.splitMessage(longText);
      expect(result.length).toBe(3);
      expect(result[0].length).toBeLessThanOrEqual(2000);
      expect(result[1].length).toBeLessThanOrEqual(2000);
      expect(result[2].length).toBeLessThanOrEqual(2000);
      expect(result.join("")).toBe(longText);
    });

    it("should split at newlines when possible", () => {
      const text = "line1\n" + "a".repeat(1990) + "\nline3";
      const result = MessageFormatter.splitMessage(text);
      expect(result.length).toBe(2);
      expect(result[0]).toBe("line1\n" + "a".repeat(1990));
      expect(result[1]).toBe("line3");
    });

    it("should handle empty string", () => {
      const result = MessageFormatter.splitMessage("");
      expect(result).toEqual([]);
    });

    it("should handle exactly 2000 characters", () => {
      const text = "a".repeat(2000);
      const result = MessageFormatter.splitMessage(text);
      expect(result).toEqual([text]);
    });
  });

  describe("formatCodeBlock", () => {
    it("should wrap text in code block", () => {
      const result = MessageFormatter.formatCodeBlock("const x = 1;", "typescript");
      expect(result).toBe("```typescript\nconst x = 1;\n```");
    });

    it("should default to no language", () => {
      const result = MessageFormatter.formatCodeBlock("some text");
      expect(result).toBe("```\nsome text\n```");
    });
  });

  describe("formatSessionStatus", () => {
    it("should format session info", () => {
      const result = MessageFormatter.formatSessionStatus({
        channelId: "123",
        cwd: "/tmp/project",
        state: "idle",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });

      expect(result).toContain("123");
      expect(result).toContain("/tmp/project");
      expect(result).toContain("idle");
    });
  });

  describe("formatError", () => {
    it("should format an error message", () => {
      const result = MessageFormatter.formatError("Something failed");
      expect(result).toContain(":x:");
      expect(result).toContain("Something failed");
    });
  });

  describe("formatSuccess", () => {
    it("should format a success message", () => {
      const result = MessageFormatter.formatSuccess("All done");
      expect(result).toContain(":white_check_mark:");
      expect(result).toContain("All done");
    });
  });
});
