import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

export interface OutputChunk {
  type: "text" | "tool_summary" | "result" | "error";
  content: string;
}

export interface OutputFilterOptions {
  showToolSummary: boolean;
}

export class OutputFilter {
  private options: OutputFilterOptions;

  constructor(options: OutputFilterOptions) {
    this.options = options;
  }

  processMessage(msg: SDKMessage): OutputChunk[] {
    switch (msg.type) {
      case "assistant":
        return this.processAssistant(msg);
      case "result":
        return this.processResult(msg);
      case "system":
      case "stream_event":
      case "user":
        return [];
      default:
        return [];
    }
  }

  private processAssistant(
    msg: Extract<SDKMessage, { type: "assistant" }>,
  ): OutputChunk[] {
    const chunks: OutputChunk[] = [];

    for (const block of msg.message.content) {
      if (block.type === "text" && block.text.trim().length > 0) {
        chunks.push({ type: "text", content: block.text });
      } else if (block.type === "tool_use") {
        if (!this.options.showToolSummary) continue;
        const summary = OutputFilter.formatToolSummary(
          block.name,
          block.input as Record<string, unknown>,
        );
        chunks.push({ type: "tool_summary", content: summary });
      }
    }

    return chunks;
  }

  private processResult(
    msg: Extract<SDKMessage, { type: "result" }>,
  ): OutputChunk[] {
    if (msg.subtype === "success") {
      const resultMsg = msg as Extract<
        SDKMessage,
        { type: "result"; subtype: "success" }
      >;
      if (resultMsg.result && resultMsg.result.trim().length > 0) {
        return [{ type: "result", content: resultMsg.result }];
      }
      return [];
    }

    // Error subtypes
    const errorMsg = msg as Extract<
      SDKMessage,
      { type: "result"; subtype: "error_during_execution" }
    >;
    const errors = "errors" in errorMsg ? (errorMsg.errors as string[]) : [];
    if (errors.length > 0) {
      return [
        {
          type: "error",
          content: `:warning: **Error** (${msg.subtype}): ${errors.join(", ")}`,
        },
      ];
    }

    return [
      {
        type: "error",
        content: `:warning: **Error**: ${msg.subtype}`,
      },
    ];
  }

  static formatToolSummary(
    toolName: string,
    input: Record<string, unknown>,
  ): string {
    switch (toolName) {
      case "Write":
        return `> :pencil2: **Write**: \`${input.file_path}\``;
      case "Edit":
        return `> :pencil: **Edit**: \`${input.file_path}\``;
      case "Read":
        return `> :book: **Read**: \`${input.file_path}\``;
      case "Bash":
        return `> :computer: **Bash**: \`${input.command}\``;
      case "Glob":
        return `> :mag: **Glob**: \`${input.pattern}\``;
      case "Grep": {
        const inPath = input.path ? ` in \`${input.path}\`` : "";
        return `> :mag_right: **Grep**: \`${input.pattern}\`${inPath}`;
      }
      case "WebSearch":
        return `> :globe_with_meridians: **WebSearch**: \`${input.query}\``;
      case "WebFetch":
        return `> :link: **WebFetch**: \`${input.url}\``;
      default:
        return `> :gear: **${toolName}**`;
    }
  }
}
