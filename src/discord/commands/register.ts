import {
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

export function buildCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  const start = new SlashCommandBuilder()
    .setName("start")
    .setDescription("Start a Claude Code session in this channel")
    .addStringOption((option) =>
      option
        .setName("directory")
        .setDescription("Working directory (overrides channel config)")
        .setRequired(false),
    )
    .toJSON();

  const stop = new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the Claude Code session in this channel")
    .toJSON();

  const clear = new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear conversation history (keep session alive)")
    .toJSON();

  const status = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show all active Claude Code sessions")
    .toJSON();

  const config = new SlashCommandBuilder()
    .setName("config")
    .setDescription("Show current channel configuration")
    .toJSON();

  return [start, stop, clear, status, config];
}
