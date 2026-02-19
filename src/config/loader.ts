import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { configSchema } from "./schema.js";
import { ConfigError } from "../lib/errors.js";
import type { AppConfig } from "./types.js";

export class ConfigLoader {
  private configPath: string;
  private config: AppConfig | null = null;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  load(): AppConfig {
    let raw: string;
    try {
      raw = readFileSync(this.configPath, "utf-8");
    } catch (err) {
      throw new ConfigError(`Failed to read config file: ${this.configPath}`, {
        cause: err,
      });
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      throw new ConfigError(`Failed to parse YAML: ${this.configPath}`, {
        cause: err,
      });
    }

    const result = configSchema.safeParse(parsed);
    if (!result.success) {
      throw new ConfigError(
        `Config validation failed: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
      );
    }

    this.config = result.data;
    return this.config;
  }

  reload(): AppConfig {
    return this.load();
  }

  get(): AppConfig {
    if (!this.config) {
      throw new ConfigError("Config not loaded. Call load() first.");
    }
    return this.config;
  }
}
