import { describe, it, expect } from "vitest";
import {
  AppError,
  SessionError,
  ConfigError,
  ClaudeBridgeError,
  DiscordError,
} from "../../src/lib/errors.js";

describe("AppError", () => {
  it("should create an error with name and message", () => {
    const err = new AppError("something went wrong");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("AppError");
    expect(err.message).toBe("something went wrong");
  });

  it("should support a cause option", () => {
    const cause = new Error("root cause");
    const err = new AppError("wrapper", { cause });
    expect(err.cause).toBe(cause);
  });
});

describe("SessionError", () => {
  it("should extend AppError", () => {
    const err = new SessionError("session failed");
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("SessionError");
  });

  it("should include channelId", () => {
    const err = new SessionError("session failed", { channelId: "123" });
    expect(err.channelId).toBe("123");
  });
});

describe("ConfigError", () => {
  it("should extend AppError", () => {
    const err = new ConfigError("bad config");
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("ConfigError");
  });
});

describe("ClaudeBridgeError", () => {
  it("should extend AppError", () => {
    const err = new ClaudeBridgeError("bridge error");
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("ClaudeBridgeError");
  });

  it("should include sessionId", () => {
    const err = new ClaudeBridgeError("fail", { sessionId: "abc" });
    expect(err.sessionId).toBe("abc");
  });
});

describe("DiscordError", () => {
  it("should extend AppError", () => {
    const err = new DiscordError("discord error");
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("DiscordError");
  });
});
