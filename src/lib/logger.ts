import pino from "pino";
import type { Logger } from "pino";

export interface LoggerOptions {
  level?: string;
  file?: string;
}

export function createLogger(options: LoggerOptions): Logger {
  const level = options.level ?? "info";

  if (level === "silent") {
    return pino({ level: "silent" });
  }

  const targets: pino.TransportTargetOptions[] = [
    {
      target: "pino-pretty",
      options: { colorize: true },
      level,
    },
  ];

  if (options.file) {
    targets.push({
      target: "pino/file",
      options: { destination: options.file, mkdir: true },
      level,
    });
  }

  return pino({
    level,
    transport: { targets },
  });
}
