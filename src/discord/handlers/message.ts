import type { Message, TextChannel } from "discord.js";
import type { SessionManager } from "../../session/manager.js";
import { ClaudeBridge } from "../../claude/bridge.js";
import { MessageFormatter } from "../formatter.js";
import type { AppConfig } from "../../config/types.js";
import type { OutputChunk } from "../../claude/output-filter.js";
import type { Logger } from "pino";

export interface MessageHandlerDeps {
  sessionManager: SessionManager;
  config: AppConfig;
  logger: Logger;
  requestApproval: (
    channel: TextChannel,
    toolName: string,
    input: Record<string, unknown>,
    timeoutMs: number,
  ) => Promise<boolean>;
}

export async function handleMessage(
  message: Message,
  deps: MessageHandlerDeps,
): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  const channelId = message.channelId;
  const session = deps.sessionManager.get(channelId);

  if (!session) {
    // No session in this channel, ignore
    return;
  }

  const userMessage = message.content.trim();
  if (userMessage.length === 0) return;

  // If currently processing, queue the message
  if (session.state === "processing" || session.state === "awaiting_approval") {
    deps.sessionManager.enqueueMessage(channelId, userMessage);
    await message.react("📥");
    deps.logger.debug({ channelId, queued: userMessage }, "Message queued");
    return;
  }

  // Process the message
  await processMessage(channelId, userMessage, message, deps);
}

async function processMessage(
  channelId: string,
  prompt: string,
  originalMessage: Message,
  deps: MessageHandlerDeps,
): Promise<void> {
  const { sessionManager, config, logger, requestApproval } = deps;
  const session = sessionManager.get(channelId);
  if (!session) return;

  const channel = originalMessage.channel as TextChannel;

  // Set processing state
  sessionManager.setState(channelId, "processing");
  const ac = new AbortController();
  session.abortController = ac;

  // Setup timeout (10 minutes)
  const timeout = setTimeout(() => {
    ac.abort();
    logger.warn({ channelId }, "Session timed out (10 min)");
  }, 10 * 60 * 1000);

  // Show typing indicator
  await channel.sendTyping();
  const typingInterval = setInterval(() => {
    channel.sendTyping().catch(() => {});
  }, 8000);

  const bridge = new ClaudeBridge({
    cwd: session.cwd,
    permissionMode: session.permissionMode,
    toolPolicy: config.toolPolicy,
    showToolSummary: config.output.showToolSummary,
    logger,
  });

  // Buffer for batching messages
  let messageBuffer = "";
  let lastSendTime = 0;
  const streamingInterval = config.output.streamingIntervalMs;

  const flushBuffer = async () => {
    if (messageBuffer.trim().length === 0) return;
    const chunks = MessageFormatter.splitMessage(messageBuffer);
    for (const chunk of chunks) {
      await channel.send(chunk);
    }
    messageBuffer = "";
    lastSendTime = Date.now();
  };

  try {
    const result = await bridge.execute(prompt, {
      abortController: ac,
      sessionId: session.sessionId ?? undefined,
      onChunk: async (chunk: OutputChunk) => {
        messageBuffer += chunk.content + "\n";

        const now = Date.now();
        if (now - lastSendTime >= streamingInterval) {
          await flushBuffer();
        }
      },
      onApprovalRequest: async (toolName, input) => {
        sessionManager.setState(channelId, "awaiting_approval");
        const approved = await requestApproval(
          channel,
          toolName,
          input,
          config.toolPolicy.approvalTimeoutSec * 1000,
        );
        sessionManager.setState(channelId, "processing");
        return approved;
      },
    });

    // Flush remaining buffer
    await flushBuffer();

    // Update session
    if (result.sessionId) {
      sessionManager.setSessionId(channelId, result.sessionId);
    }

    if (result.costUsd !== undefined) {
      logger.info(
        {
          channelId,
          sessionId: result.sessionId,
          costUsd: result.costUsd,
          durationMs: result.durationMs,
        },
        "Query completed",
      );
    }
  } catch (err) {
    logger.error({ err, channelId }, "Message processing failed");
    await channel.send(
      MessageFormatter.formatError(`Processing failed: ${err}`),
    );
  } finally {
    clearTimeout(timeout);
    clearInterval(typingInterval);
    session.abortController = null;
    sessionManager.setState(channelId, "idle");

    // Process queued messages
    const nextMsg = sessionManager.dequeueMessage(channelId);
    if (nextMsg) {
      logger.debug({ channelId, prompt: nextMsg }, "Processing queued message");
      await processMessage(channelId, nextMsg, originalMessage, deps);
    }
  }
}
