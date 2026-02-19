import type { ChatInputCommandInteraction } from "discord.js";
import type { SessionManager } from "../../session/manager.js";
import { MessageFormatter } from "../formatter.js";

export async function handleStatus(
  interaction: ChatInputCommandInteraction,
  sessionManager: SessionManager,
): Promise<void> {
  const sessions = sessionManager.listAll();

  if (sessions.length === 0) {
    await interaction.reply({
      content: "No active sessions.",
      ephemeral: true,
    });
    return;
  }

  const statusLines = sessions.map((s) =>
    MessageFormatter.formatSessionStatus({
      channelId: s.channelId,
      cwd: s.cwd,
      state: s.state,
      createdAt: s.createdAt,
    }),
  );

  const header = `**Active Sessions (${sessions.length}):**\n\n`;
  const body = statusLines.join("\n---\n");

  await interaction.reply({ content: header + body, ephemeral: true });
}
