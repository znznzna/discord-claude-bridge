import { z } from "zod";

const permissionModeSchema = z.enum(["acceptEdits", "plan", "bypassPermissions"]);

export const channelConfigSchema = z.object({
  directory: z.string().min(1),
  permissionMode: permissionModeSchema.default("acceptEdits"),
  description: z.string().optional(),
});

export const toolPolicySchema = z.object({
  autoApprove: z.array(z.string()).default([]),
  logOnly: z.array(z.string()).default([]),
  requireApproval: z.array(z.string()).default([]),
  approvalTimeoutSec: z.number().positive().default(300),
});

const outputSchema = z.object({
  streamingIntervalMs: z.number().positive().default(1500),
  showStreamingUpdates: z.boolean().default(true),
  showToolSummary: z.boolean().default(true),
});

const loggingSchema = z.object({
  level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  file: z.string().optional(),
});

export const configSchema = z.object({
  discord: z.object({
    guildId: z.string().min(1),
  }),
  channels: z.record(z.string(), channelConfigSchema).default({}),
  toolPolicy: toolPolicySchema,
  output: outputSchema.default({}),
  logging: loggingSchema.default({}),
});
