import { Context, Effect, Layer, Redacted } from "effect";
import * as jwt from "jsonwebtoken";
import {
  HttpApiError,
  HttpApiMiddleware,
  HttpApiSecurity,
} from "effect/unstable/httpapi";
import { InvalidAccessToken } from "./AuthError";
import { loadConfig } from "./Config";

export class CurrentUserService extends Context.Service<CurrentUserService>()(
  "auth/CurrentUser",
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
    const config = yield* loadConfig;
    return {
      bearer: (httpEffect, { credential }) =>
        Effect.try({
          try: () =>
            jwt.verify(
              Redacted.value(credential).trim(),
              config.ACCESS_TOKEN_SECRET,
            ) as {
              userId: string;
            },
          catch: (error) => {
            return new InvalidAccessToken({ message: String(error) });
          },
        }).pipe(
          Effect.flatMap((payload) =>
            Effect.provideService(
              httpEffect,
              CurrentUserService,
              CurrentUserService.of({ userId: payload.userId }),
            ),
          ),
          Effect.catchTag("InvalidAccessToken", () =>
            Effect.fail(new HttpApiError.Unauthorized()),
          ),
        ),
    };
  }),
);
