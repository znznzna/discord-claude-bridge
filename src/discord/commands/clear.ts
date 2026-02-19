import type { ChatInputCommandInteraction } from "discord.js";
import type { SessionManager } from "../../session/manager.js";
import { MessageFormatter } from "../formatter.js";
import type { Logger } from "pino";

export async function handleClear(
  interaction: ChatInputCommandInteraction,
  sessionManager: SessionManager,
  logger: Logger,
): Promise<void> {
  const channelId = interaction.channelId;
  const session = sessionManager.get(channelId);

  if (!session) {
    await interaction.reply({
      content: MessageFormatter.formatError("No active session in this channel."),
      ephemeral: true,
    });
    return;
  }

  // Clear the session ID to start fresh, but keep the session alive
  sessionManager.clearHistory(channelId);

  logger.info({ channelId }, "Session history cleared");

  await interaction.reply(
    MessageFormatter.formatSuccess("Conversation history cleared. Session is still active."),
  );
}
