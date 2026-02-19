import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, PermissionMode, SettingSource } from "@anthropic-ai/claude-agent-sdk";
import { OutputFilter, type OutputChunk } from "./output-filter.js";
import { classifyTool, ToolAction } from "./tool-policy.js";
import { ClaudeBridgeError } from "../lib/errors.js";
import type { ToolPolicyConfig, PermissionModeValue } from "../config/types.js";
import type { Logger } from "pino";

export interface ClaudeBridgeOptions {
  cwd: string;
  permissionMode: PermissionModeValue;
  toolPolicy: ToolPolicyConfig;
  showToolSummary: boolean;
  logger: Logger;
}

export interface ExecuteOptions {
  onChunk?: (chunk: OutputChunk) => void | Promise<void>;
  onApprovalRequest?: (
    toolName: string,
    input: Record<string, unknown>,
  ) => Promise<boolean>;
  abortController?: AbortController;
  sessionId?: string;
}

export interface ExecuteResult {
  sessionId: string | null;
  success: boolean;
  costUsd?: number;
  durationMs?: number;
}

export class ClaudeBridge {
  private options: ClaudeBridgeOptions;
  private outputFilter: OutputFilter;

  constructor(options: ClaudeBridgeOptions) {
    this.options = options;
    this.outputFilter = new OutputFilter({
      showToolSummary: options.showToolSummary,
    });
  }

  async execute(prompt: string, execOpts: ExecuteOptions): Promise<ExecuteResult> {
    let sessionId: string | null = null;
    let success = false;
    let costUsd: number | undefined;
    let durationMs: number | undefined;

    const ac = execOpts.abortController ?? new AbortController();

    try {
      const q = query({
        prompt,
        options: {
          cwd: this.options.cwd,
          permissionMode: this.options.permissionMode as PermissionMode,
          abortController: ac,
          continue: !!execOpts.sessionId,
          settingSources: ["user", "project", "local"] as SettingSource[],
          systemPrompt: {
            type: "preset",
            preset: "claude_code",
          },
          tools: {
            type: "preset",
            preset: "claude_code",
          },
          canUseTool: this.createCanUseTool(execOpts),
          stderr: (data: string) => {
            this.options.logger.warn({ stderr: data.trimEnd() }, "Claude CLI stderr");
          },
        },
      });

      for await (const msg of q) {
        // Capture session ID from first message
        if (sessionId === null && "session_id" in msg) {
          sessionId = (msg as { session_id: string }).session_id;
        }

        // Process message through output filter
        const chunks = this.outputFilter.processMessage(msg as SDKMessage);
        for (const chunk of chunks) {
          await execOpts.onChunk?.(chunk);
        }

        // Extract result metadata
        if ((msg as SDKMessage).type === "result") {
          const resultMsg = msg as Extract<SDKMessage, { type: "result" }>;
          if (resultMsg.subtype === "success") {
            success = true;
          }
          costUsd = resultMsg.total_cost_usd;
          durationMs = resultMsg.duration_ms;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Graceful abort
        return { sessionId, success: false, costUsd, durationMs };
      }
      // Re-throw non-abort errors
      if (err instanceof Error && err.message === "AbortError") {
        return { sessionId, success: false, costUsd, durationMs };
      }
      throw new ClaudeBridgeError(`Query execution failed: ${err}`, {
        cause: err instanceof Error ? err : undefined,
        sessionId: sessionId ?? undefined,
      });
    }

    return { sessionId, success, costUsd, durationMs };
  }

  private createCanUseTool(execOpts: ExecuteOptions) {
    return async (
      toolName: string,
      input: Record<string, unknown>,
      _opts: { signal: AbortSignal },
    ) => {
      const action = classifyTool(toolName, this.options.toolPolicy);

      switch (action) {
        case ToolAction.AutoApprove:
          return {
            behavior: "allow" as const,
            updatedInput: input,
          };

        case ToolAction.LogOnly:
          // Allow but the output filter will log it
          return {
            behavior: "allow" as const,
            updatedInput: input,
          };

        case ToolAction.RequireApproval: {
          if (!execOpts.onApprovalRequest) {
            return {
              behavior: "deny" as const,
              message: `Tool ${toolName} requires approval but no approval handler is configured`,
            };
          }

          const approved = await execOpts.onApprovalRequest(toolName, input);
          if (approved) {
            return {
              behavior: "allow" as const,
              updatedInput: input,
            };
          }
          return {
            behavior: "deny" as const,
            message: `Tool ${toolName} was denied by user`,
          };
        }

        default:
          return {
            behavior: "deny" as const,
            message: `Unknown tool action for ${toolName}`,
          };
      }
    };
  }
}
