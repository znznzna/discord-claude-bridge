import type { ToolPolicyConfig } from "../config/types.js";

export const ToolAction = {
  AutoApprove: "auto_approve",
  LogOnly: "log_only",
  RequireApproval: "require_approval",
} as const;

export type ToolAction = (typeof ToolAction)[keyof typeof ToolAction];

export function classifyTool(
  toolName: string,
  policy: ToolPolicyConfig,
): ToolAction {
  if (policy.autoApprove.includes(toolName)) {
    return ToolAction.AutoApprove;
  }
  if (policy.logOnly.includes(toolName)) {
    return ToolAction.LogOnly;
  }
  // Default: require approval for unknown tools (safest)
  return ToolAction.RequireApproval;
}
