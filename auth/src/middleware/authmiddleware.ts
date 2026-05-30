import {
  HttpApiMiddleware,
  HttpApiSecurity,
  HttpApiError,
} from "effect/unstable/httpapi";
import { Schema, Effect, Redacted, Context, Data, Layer } from "effect";
import * as jwt from "jsonwebtoken";
import { loadEnv } from "../config/env.js";

// Typed error for bad token
export class InvalidTokenError extends Data.TaggedError("InvalidTokenError")<{
  message: string;
}> {}

// The data shape
export class CurrentUser extends Schema.Class<CurrentUser>("CurrentUser")({
  userId: Schema.String,
}) {}

// Separate Context key for providing CurrentUser to handlers
export class CurrentUserService extends Context.Service<CurrentUserService>()(
  "auth/middleware/authmiddleware/CurrentUserService",
  { make: Effect.succeed({ userId: "" }) },
) {}

export class Authorization extends HttpApiMiddleware.Service<Authorization>()(
  "Authorization",
  {
    security: { bearer: HttpApiSecurity.bearer },
    error: HttpApiError.Unauthorized,
  },
) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const env = yield* loadEnv;
    return {
      bearer: (httpEffect, { credential }) =>
        Effect.try({
          try: () =>
            jwt.verify(Redacted.value(credential), env.ACCESS_TOKEN_SECRET) as {
              userId: string;
            },
          catch: (e) => new InvalidTokenError({ message: String(e) }),
        }).pipe(
          Effect.flatMap((payload) =>
            Effect.provideService(
              httpEffect,
              CurrentUserService,
              CurrentUserService.of({ userId: payload.userId }),
            ),
          ),
          Effect.catchTag("InvalidTokenError", () =>
            Effect.fail(new HttpApiError.Unauthorized()),
          ),
        ),
    };
  }),
);
