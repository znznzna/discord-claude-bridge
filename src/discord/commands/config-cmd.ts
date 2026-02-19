import type { ChatInputCommandInteraction } from "discord.js";
import type { AppConfig } from "../../config/types.js";
import { MessageFormatter } from "../formatter.js";

export async function handleConfig(
  interaction: ChatInputCommandInteraction,
  config: AppConfig,
): Promise<void> {
  const channelId = interaction.channelId;
  const channelConfig = config.channels[channelId];

  if (!channelConfig) {
    await interaction.reply({
      content: "No configuration found for this channel.",
      ephemeral: true,
    });
    return;
  }

  const lines = [
    `**Channel Configuration:**`,
    `**Directory:** \`${channelConfig.directory}\``,
    `**Permission Mode:** ${channelConfig.permissionMode}`,
    `**Description:** ${channelConfig.description ?? "(none)"}`,
    "",
    `**Tool Policy:**`,
    `Auto-approve: ${config.toolPolicy.autoApprove.join(", ") || "(none)"}`,
    `Log-only: ${config.toolPolicy.logOnly.join(", ") || "(none)"}`,
    `Require approval: ${config.toolPolicy.requireApproval.join(", ") || "(none)"}`,
    `Approval timeout: ${config.toolPolicy.approvalTimeoutSec}s`,
  ];

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}
