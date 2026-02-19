import { describe, it, expect } from "vitest";
import { classifyTool, ToolAction } from "../../src/claude/tool-policy.js";
import type { ToolPolicyConfig } from "../../src/config/types.js";

describe("classifyTool", () => {
  const policy: ToolPolicyConfig = {
    autoApprove: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
    logOnly: ["Write", "Edit", "NotebookEdit"],
    requireApproval: ["Bash"],
    approvalTimeoutSec: 300,
  };

  it("should classify auto-approved tools", () => {
    expect(classifyTool("Read", policy)).toBe(ToolAction.AutoApprove);
    expect(classifyTool("Glob", policy)).toBe(ToolAction.AutoApprove);
    expect(classifyTool("Grep", policy)).toBe(ToolAction.AutoApprove);
  });

  it("should classify log-only tools", () => {
    expect(classifyTool("Write", policy)).toBe(ToolAction.LogOnly);
    expect(classifyTool("Edit", policy)).toBe(ToolAction.LogOnly);
  });

  it("should classify require-approval tools", () => {
    expect(classifyTool("Bash", policy)).toBe(ToolAction.RequireApproval);
  });

  it("should default unknown tools to require-approval", () => {
    expect(classifyTool("UnknownTool", policy)).toBe(ToolAction.RequireApproval);
  });
});
