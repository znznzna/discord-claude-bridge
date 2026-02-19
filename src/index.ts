import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import { createLogger } from "./lib/logger.js";
import { ConfigLoader } from "./config/loader.js";
import { SessionManager } from "./session/manager.js";
import { DiscordBotClient } from "./discord/client.js";

dotenvConfig();

async function main(): Promise<void> {
  // Load config
  const configPath = resolve(
    process.env.CONFIG_PATH ?? "./config/config.yaml",
  );
  const configLoader = new ConfigLoader(configPath);
  const config = configLoader.load();

  // Initialize logger
  const logger = createLogger({
    level: config.logging.level,
    file: config.logging.file,
  });

  logger.info({ configPath }, "Configuration loaded");

  // Validate required environment variables
  const discordToken = process.env.DISCORD_TOKEN;
  if (!discordToken) {
    logger.fatal("DISCORD_TOKEN environment variable is required");
    process.exit(1);
  }

  // Initialize session manager
  const sessionManager = new SessionManager();

  // Initialize Discord client
  const discordClient = new DiscordBotClient({
    token: discordToken,
    sessionManager,
    config,
    logger,
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");
    await discordClient.stop();
    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Config hot-reload via SIGHUP
  process.on("SIGHUP", () => {
    logger.info("SIGHUP received, reloading config...");
    try {
      const newConfig = configLoader.reload();
      discordClient.updateConfig(newConfig);
      logger.info("Config reloaded successfully");
    } catch (err) {
      logger.error({ err }, "Failed to reload config");
    }
  });

  // Start
  try {
    await discordClient.start();
    logger.info("Discord Claude Bridge is running");
  } catch (err) {
    logger.fatal({ err }, "Failed to start");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
