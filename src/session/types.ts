import type { PermissionModeValue } from "../config/types.js";

export type SessionState = "idle" | "processing" | "awaiting_approval";

export interface Session {
  channelId: string;
  cwd: string;
  sessionId: string | null;
  state: SessionState;
  abortController: AbortController | null;
  permissionMode: PermissionModeValue;
  messageQueue: string[];
  createdAt: Date;
  lastActivityAt: Date;
}

export interface SessionCreateOptions {
  channelId: string;
  cwd: string;
  permissionMode?: PermissionModeValue;
}
