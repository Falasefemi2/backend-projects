import { Effect } from "effect";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  AuthPersistenceError,
  ConfigError,
  RefreshTokenNotFound,
  UserAlreadyExists,
  UserNotFound,
} from "./AuthError";
import { Authorization, CurrentUserService } from "./AuthMiddleware";
import {
  AccessTokenResponse,
  AuthTokens,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RegisterRequest,
  UserResponse,
} from "./AuthSchema";
import { AuthService } from "./AuthService";
import { Schema } from "effect";

export class AuthGroup extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("register", "/auth/register", {
      payload: RegisterRequest,
      success: AuthTokens,
      error: [UserAlreadyExists, AuthPersistenceError, ConfigError],
    }),
  )
  .add(
    HttpApiEndpoint.post("login", "/auth/login", {
      payload: LoginRequest,
      success: AuthTokens,
      error: [UserNotFound, AuthPersistenceError, ConfigError],
    }),
  )
  .add(
    HttpApiEndpoint.post("logout", "/auth/logout", {
      payload: LogoutRequest,
      success: Schema.Void,
      error: [RefreshTokenNotFound, AuthPersistenceError],
    }).middleware(Authorization),
  )
  .add(
    HttpApiEndpoint.post("refresh", "/auth/refresh", {
      payload: RefreshTokenRequest,
      success: AccessTokenResponse,
      error: [
        UserNotFound,
        RefreshTokenNotFound,
        AuthPersistenceError,
        ConfigError,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.get("getCurrentUser", "/auth/me", {
      success: UserResponse,
      error: [UserNotFound, AuthPersistenceError],
    }).middleware(Authorization),
  ) {}

export class Api extends HttpApi.make("auth")
  .add(AuthGroup)
  .annotateMerge(OpenApi.annotations({ title: "Auth API" })) {}

export const AuthApiLive = HttpApiBuilder.group(Api, "auth", (handlers) =>
  handlers
    .handle("register", ({ payload }) => AuthService.register(payload))
    .handle("login", ({ payload }) => AuthService.login(payload))
    .handle("logout", ({ payload }) => AuthService.logout(payload))
    .handle("refresh", ({ payload }) =>
      AuthService.refreshAccessToken(payload.token),
    )
    .handle("getCurrentUser", () =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUserService;
        return yield* AuthService.getUserById(userId);
      }),
    ),
);
