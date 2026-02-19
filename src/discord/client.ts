import {
  Client,
  GatewayIntentBits,
  Events,
  type Interaction,
  type Message,
} from "discord.js";
import type { Logger } from "pino";
import type { SessionManager } from "../session/manager.js";
import type { AppConfig } from "../config/types.js";
import { handleStart } from "./commands/start.js";
import { handleStop } from "./commands/stop.js";
import { handleClear } from "./commands/clear.js";
import { handleStatus } from "./commands/status.js";
import { handleConfig } from "./commands/config-cmd.js";
import { handleMessage } from "./handlers/message.js";
import { requestApproval } from "./handlers/approval.js";
import { DiscordError } from "../lib/errors.js";

export interface DiscordClientOptions {
  token: string;
  sessionManager: SessionManager;
  config: AppConfig;
  logger: Logger;
}

export class DiscordBotClient {
  private client: Client;
  private token: string;
  private sessionManager: SessionManager;
  private config: AppConfig;
  private logger: Logger;

  constructor(options: DiscordClientOptions) {
    this.token = options.token;
    this.sessionManager = options.sessionManager;
    this.config = options.config;
    this.logger = options.logger.child({ component: "discord" });

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.setupEventListeners();
  }

  async start(): Promise<void> {
    try {
      await this.client.login(this.token);
    } catch (err) {
      throw new DiscordError("Failed to login to Discord", {
        cause: err as Error,
      });
    }
  }

  async stop(): Promise<void> {
    for (const session of this.sessionManager.listAll()) {
      this.sessionManager.destroy(session.channelId);
    }
    this.client.destroy();
    this.logger.info("Discord client stopped");
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
    this.logger.info("Config updated in Discord client");
  }

  private setupEventListeners(): void {
    this.client.once(Events.ClientReady, (readyClient) => {
      this.logger.info(
        { user: readyClient.user.tag },
        "Discord bot ready",
      );
    });

    this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        switch (interaction.commandName) {
          case "start":
            await handleStart(interaction, this.sessionManager, this.config, this.logger);
            break;
          case "stop":
            await handleStop(interaction, this.sessionManager, this.logger);
            break;
          case "clear":
            await handleClear(interaction, this.sessionManager, this.logger);
            break;
          case "status":
            await handleStatus(interaction, this.sessionManager);
            break;
          case "config":
            await handleConfig(interaction, this.config);
            break;
          default:
            await interaction.reply({
              content: `Unknown command: ${interaction.commandName}`,
              ephemeral: true,
            });
        }
      } catch (err) {
        this.logger.error({ err, command: interaction.commandName }, "Command handler error");
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `:x: Internal error processing command`,
            ephemeral: true,
          }).catch(() => {});
        }
      }
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      try {
        await handleMessage(message, {
          sessionManager: this.sessionManager,
          config: this.config,
          logger: this.logger,
          requestApproval,
        });
      } catch (err) {
        this.logger.error({ err, channelId: message.channelId }, "Message handler error");
      }
    });

    this.client.on(Events.Error, (err) => {
      this.logger.error({ err }, "Discord client error");
    });

    this.client.on(Events.Warn, (msg) => {
      this.logger.warn({ msg }, "Discord client warning");
    });
  }
}
