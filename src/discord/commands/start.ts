import type { ChatInputCommandInteraction } from "discord.js";
import type { SessionManager } from "../../session/manager.js";
import type { AppConfig } from "../../config/types.js";
import { MessageFormatter } from "../formatter.js";
import type { Logger } from "pino";

export async function handleStart(
  interaction: ChatInputCommandInteraction,
  sessionManager: SessionManager,
  config: AppConfig,
  logger: Logger,
): Promise<void> {
  const channelId = interaction.channelId;
  const directoryArg = interaction.options.getString("directory");

  // Check if session already exists
  if (sessionManager.get(channelId)) {
    await interaction.reply({
      content: MessageFormatter.formatError(
        "Session already active in this channel. Use `/stop` first.",
      ),
      ephemeral: true,
    });
    return;
  }

  // Determine working directory
  let cwd: string;
  let permissionMode = config.channels[channelId]?.permissionMode ?? "acceptEdits";

  if (directoryArg) {
    cwd = directoryArg;
  } else if (config.channels[channelId]?.directory) {
    cwd = config.channels[channelId].directory;
  } else {
    await interaction.reply({
      content: MessageFormatter.formatError(
        "No directory configured for this channel. Use `/start directory:/path/to/project`.",
      ),
      ephemeral: true,
    });
    return;
  }

  try {
    const session = sessionManager.create({
      channelId,
      cwd,
      permissionMode,
    });

    logger.info({ channelId, cwd, permissionMode }, "Session started");

    await interaction.reply(
      MessageFormatter.formatSuccess(
        `Session started!\n**Directory:** \`${cwd}\`\n**Mode:** ${permissionMode}`,
      ),
    );
  } catch (err) {
    logger.error({ err, channelId }, "Failed to start session");
    await interaction.reply({
      content: MessageFormatter.formatError(`Failed to start session: ${err}`),
      ephemeral: true,
    });
  }
}
