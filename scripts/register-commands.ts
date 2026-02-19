import { REST, Routes } from "discord.js";
import { config as dotenvConfig } from "dotenv";
import { buildCommands } from "../src/discord/commands/register.js";

dotenvConfig();

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.GUILD_ID;

if (!token || !applicationId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_APPLICATION_ID in .env");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
const commands = buildCommands();

async function main() {
  try {
    console.log(`Registering ${commands.length} slash commands...`);

    if (guildId) {
      // Guild-specific (instant, for development)
      await rest.put(
        Routes.applicationGuildCommands(applicationId, guildId),
        { body: commands },
      );
      console.log(`Registered to guild ${guildId}`);
    } else {
      // Global (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(applicationId), {
        body: commands,
      });
      console.log("Registered globally");
    }

    console.log("Done!");
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
}

main();
