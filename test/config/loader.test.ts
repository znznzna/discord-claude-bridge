import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ConfigLoader } from "../../src/config/loader.js";

describe("ConfigLoader", () => {
  let tempDir: string;
  let configPath: string;

  const validYaml = `
discord:
  guildId: "123456789012345678"
channels:
  "111222333444555666":
    directory: "/tmp/test-project"
    permissionMode: "acceptEdits"
    description: "Test project"
toolPolicy:
  autoApprove: [Read, Glob, Grep]
  logOnly: [Write, Edit]
  requireApproval: [Bash]
  approvalTimeoutSec: 300
output:
  streamingIntervalMs: 1500
  showStreamingUpdates: true
  showToolSummary: true
logging:
  level: "info"
`;

  beforeEach(() => {
    tempDir = join(tmpdir(), `dcb-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    configPath = join(tempDir, "config.yaml");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should load a valid YAML config", () => {
    writeFileSync(configPath, validYaml);
    const loader = new ConfigLoader(configPath);
    const config = loader.load();
    expect(config.discord.guildId).toBe("123456789012345678");
    expect(config.channels["111222333444555666"].directory).toBe("/tmp/test-project");
    expect(config.toolPolicy.autoApprove).toEqual(["Read", "Glob", "Grep"]);
  });

  it("should throw ConfigError for invalid YAML", () => {
    writeFileSync(configPath, "invalid: yaml: content: [broken");
    const loader = new ConfigLoader(configPath);
    expect(() => loader.load()).toThrow();
  });

  it("should throw ConfigError for missing file", () => {
    const loader = new ConfigLoader("/nonexistent/config.yaml");
    expect(() => loader.load()).toThrow();
  });

  it("should throw ConfigError for schema validation failure", () => {
    writeFileSync(configPath, "discord:\n  guildId: 123\nchannels: null\n");
    const loader = new ConfigLoader(configPath);
    expect(() => loader.load()).toThrow();
  });

  it("should reload config", () => {
    writeFileSync(configPath, validYaml);
    const loader = new ConfigLoader(configPath);
    const config1 = loader.load();
    expect(config1.logging.level).toBe("info");

    const updatedYaml = validYaml.replace('level: "info"', 'level: "debug"');
    writeFileSync(configPath, updatedYaml);

    const config2 = loader.reload();
    expect(config2.logging.level).toBe("debug");
  });

  it("should return cached config on get() after load()", () => {
    writeFileSync(configPath, validYaml);
    const loader = new ConfigLoader(configPath);
    loader.load();
    const config = loader.get();
    expect(config.discord.guildId).toBe("123456789012345678");
  });

  it("should throw if get() called before load()", () => {
    const loader = new ConfigLoader(configPath);
    expect(() => loader.get()).toThrow();
  });
});
