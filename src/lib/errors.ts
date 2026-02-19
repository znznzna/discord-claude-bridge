export class AppError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppError";
  }
}

export class SessionError extends AppError {
  public readonly channelId?: string;

  constructor(
    message: string,
    options?: ErrorOptions & { channelId?: string },
  ) {
    super(message, options);
    this.name = "SessionError";
    this.channelId = options?.channelId;
  }
}

export class ConfigError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ConfigError";
  }
}

export class ClaudeBridgeError extends AppError {
  public readonly sessionId?: string;

  constructor(
    message: string,
    options?: ErrorOptions & { sessionId?: string },
  ) {
    super(message, options);
    this.name = "ClaudeBridgeError";
    this.sessionId = options?.sessionId;
  }
}

export class DiscordError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DiscordError";
  }
}
