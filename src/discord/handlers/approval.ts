import type { TextChannel, Message } from "discord.js";
import { OutputFilter } from "../../claude/output-filter.js";

/**
 * Discordチャンネルにツール承認リクエストを送信し、
 * ユーザーのリアクション（✅ or ❌）を待つ。
 */
export async function requestApproval(
  channel: TextChannel,
  toolName: string,
  input: Record<string, unknown>,
  timeoutMs: number,
): Promise<boolean> {
  const summary = OutputFilter.formatToolSummary(toolName, input);
  const approvalMsg = await channel.send(
    `:warning: **Approval Required**\n${summary}\n\nReact with :white_check_mark: to approve or :x: to deny.`,
  );

  await approvalMsg.react("✅");
  await approvalMsg.react("❌");

  try {
    const collected = await approvalMsg.awaitReactions({
      filter: (reaction, user) => {
        return (
          !user.bot &&
          (reaction.emoji.name === "✅" || reaction.emoji.name === "❌")
        );
      },
      max: 1,
      time: timeoutMs,
      errors: ["time"],
    });

    const reaction = collected.first();
    if (!reaction) return false;

    const approved = reaction.emoji.name === "✅";

    // Update the message to show the result
    await approvalMsg.edit(
      `${approved ? ":white_check_mark:" : ":x:"} **${approved ? "Approved" : "Denied"}**\n${summary}`,
    );

    return approved;
  } catch {
    // Timeout
    await approvalMsg.edit(
      `:hourglass: **Timed out** (${Math.round(timeoutMs / 1000)}s)\n${summary}`,
    );
    return false;
  }
}
