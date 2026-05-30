import { Schema } from "effect";

export class ConfigError extends Schema.TaggedErrorClass<ConfigError>()(
  "ConfigError",
  { message: Schema.String },
) {}

export class AuthPersistenceError extends Schema.TaggedErrorClass<AuthPersistenceError>()(
  "AuthPersistenceError",
  { message: Schema.String },
) {}

export class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()(
  "UserNotFound",
  { message: Schema.String },
) {}

export class UserAlreadyExists extends Schema.TaggedErrorClass<UserAlreadyExists>()(
  "UserAlreadyExists",
  { message: Schema.String },
) {}

export class RefreshTokenNotFound extends Schema.TaggedErrorClass<RefreshTokenNotFound>()(
  "RefreshTokenNotFound",
  { message: Schema.String },
) {}

export class InvalidAccessToken extends Schema.TaggedErrorClass<InvalidAccessToken>()(
  "InvalidAccessToken",
  { message: Schema.String },
) {}

export class InternalServerError extends Schema.TaggedErrorClass<InternalServerError>()(
  "InternalServerError",
  { message: Schema.String },
) {}
