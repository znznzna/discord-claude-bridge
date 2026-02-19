import { SessionError } from "../lib/errors.js";
import type { Session, SessionCreateOptions, SessionState } from "./types.js";

export class SessionManager {
  private sessions = new Map<string, Session>();

  create(options: SessionCreateOptions): Session {
    if (this.sessions.has(options.channelId)) {
      throw new SessionError(
        `Session already exists for channel ${options.channelId}`,
        { channelId: options.channelId },
      );
    }

    const now = new Date();
    const session: Session = {
      channelId: options.channelId,
      cwd: options.cwd,
      sessionId: null,
      state: "idle",
      abortController: null,
      permissionMode: options.permissionMode ?? "acceptEdits",
      messageQueue: [],
      createdAt: now,
      lastActivityAt: now,
    };

    this.sessions.set(options.channelId, session);
    return session;
  }

  get(channelId: string): Session | undefined {
    return this.sessions.get(channelId);
  }

  destroy(channelId: string): boolean {
    const session = this.sessions.get(channelId);
    if (!session) return false;

    if (session.abortController) {
      session.abortController.abort();
    }

    this.sessions.delete(channelId);
    return true;
  }

  setState(channelId: string, state: SessionState): void {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new SessionError(`Session not found: ${channelId}`, {
        channelId,
      });
    }
    session.state = state;
    session.lastActivityAt = new Date();
  }

  enqueueMessage(channelId: string, message: string): void {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new SessionError(`Session not found: ${channelId}`, {
        channelId,
      });
    }
    session.messageQueue.push(message);
  }

  dequeueMessage(channelId: string): string | undefined {
    const session = this.sessions.get(channelId);
    if (!session) return undefined;
    return session.messageQueue.shift();
  }

  listAll(): Session[] {
    return [...this.sessions.values()];
  }

  setSessionId(channelId: string, sessionId: string): void {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new SessionError(`Session not found: ${channelId}`, {
        channelId,
      });
    }
    session.sessionId = sessionId;
    session.lastActivityAt = new Date();
  }

  clearHistory(channelId: string): void {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new SessionError(`Session not found: ${channelId}`, {
        channelId,
      });
    }
    session.sessionId = null;
    session.messageQueue = [];
    session.state = "idle";
    session.lastActivityAt = new Date();
  }
}
