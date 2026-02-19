import type { ChatInputCommandInteraction } from "discord.js";
import type { SessionManager } from "../../session/manager.js";
import { MessageFormatter } from "../formatter.js";
import type { Logger } from "pino";

export async function handleStop(
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

  sessionManager.destroy(channelId);
  logger.info({ channelId }, "Session stopped");

  await interaction.reply(
    MessageFormatter.formatSuccess("Session stopped."),
  );
}
