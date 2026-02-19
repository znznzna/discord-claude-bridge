const MAX_MESSAGE_LENGTH = 2000;

export interface SessionStatusInfo {
  channelId: string;
  cwd: string;
  state: string;
  createdAt: Date;
}

export class MessageFormatter {
  static splitMessage(text: string, maxLength = MAX_MESSAGE_LENGTH): string[] {
    if (text.length === 0) return [];
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Try to split at a newline within the limit
      let splitIndex = remaining.lastIndexOf("\n", maxLength);
      if (splitIndex <= 0) {
        // No newline found, hard-split at maxLength
        splitIndex = maxLength;
      }

      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex);

      // Remove leading newline from remaining if we split at newline
      if (remaining.startsWith("\n")) {
        remaining = remaining.slice(1);
      }
    }

    return chunks;
  }

  static formatCodeBlock(text: string, language?: string): string {
    const lang = language ?? "";
    return `\`\`\`${lang}\n${text}\n\`\`\``;
  }

  static formatSessionStatus(info: SessionStatusInfo): string {
    const lines = [
      `**Channel:** <#${info.channelId}>`,
      `**Directory:** \`${info.cwd}\``,
      `**State:** ${info.state}`,
      `**Created:** ${info.createdAt.toISOString()}`,
    ];
    return lines.join("\n");
  }

  static formatError(message: string): string {
    return `:x: **Error:** ${message}`;
  }

  static formatSuccess(message: string): string {
    return `:white_check_mark: ${message}`;
  }
}
