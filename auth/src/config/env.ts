import { Effect, Schema } from "effect";

export class EnvError extends Schema.TaggedErrorClass<EnvError>()("EnvError", {
  message: Schema.String,
}) {}

export class EnvSchema extends Schema.Class<EnvSchema>("EnvSchema")({
  DATABASE_URL: Schema.String,
  ACCESS_TOKEN_SECRET: Schema.String,
  ACCESS_TOKEN_EXPIRY: Schema.String,
  REFRESH_TOKEN_SECRET: Schema.String,
  REFRESH_TOKEN_EXPIRY: Schema.String,
  PORT: Schema.String,
}) {}

export const loadEnv = Schema.decodeUnknownExit(EnvSchema)(process.env).pipe(
  Effect.mapError(
    (error) =>
      new EnvError({ message: `invalid env variables: ${error.message}` }),
  ),
);
