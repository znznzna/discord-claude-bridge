import type { z } from "zod";
import type { configSchema, channelConfigSchema, toolPolicySchema } from "./schema.js";

export type AppConfig = z.infer<typeof configSchema>;
export type ChannelConfig = z.infer<typeof channelConfigSchema>;
export type ToolPolicyConfig = z.infer<typeof toolPolicySchema>;

export type PermissionModeValue = "acceptEdits" | "plan" | "bypassPermissions";
