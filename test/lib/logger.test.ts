import { describe, it, expect } from "vitest";
import { createLogger } from "../../src/lib/logger.js";
import type { Logger } from "pino";

describe("createLogger", () => {
  it("should return a pino logger instance", () => {
    const logger = createLogger({ level: "silent" });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("should respect the configured log level", () => {
    const logger = createLogger({ level: "warn" });
    expect(logger.level).toBe("warn");
  });

  it("should include the component name in bindings", () => {
    const logger = createLogger({ level: "silent" });
    const child = logger.child({ component: "test" });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
  });

  it("should default to info level when not specified", () => {
    const logger = createLogger({});
    expect(logger.level).toBe("info");
  });
});
