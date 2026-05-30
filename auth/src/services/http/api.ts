import { Effect, Schema } from "effect";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  DatabaseError,
  LoginSchema,
  LogoutSchema,
  RefreshTokenNotFoundError,
  RegisterSchema,
  UserAlreadyExistsError,
  UserNotFoundError,
} from "../auth-service";
import {
  Authorization,
  CurrentUserService,
} from "../../middleware/authmiddleware";
import { AuthService } from "../async-handler";
import { EnvError } from "../../config/env";

const AuthTokens = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.String,
});

const AccessToken = Schema.Struct({
  accessToken: Schema.String,
});

const RefreshInput = Schema.Struct({
  token: Schema.String,
});

const UserResponse = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
  createdAt: Schema.Date,
});

export class AuthController extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("register", "/auth/register", {
      payload: RegisterSchema,
      success: AuthTokens,
      error: [UserAlreadyExistsError, DatabaseError, EnvError],
    }),
  )
  .add(
    HttpApiEndpoint.post("login", "/auth/login", {
      payload: LoginSchema,
      success: AuthTokens,
      error: [UserNotFoundError, DatabaseError, EnvError],
    }),
  )
  .add(
    HttpApiEndpoint.post("logout", "/auth/logout", {
      payload: LogoutSchema,
      success: Schema.Void,
      error: [RefreshTokenNotFoundError, DatabaseError],
    }).middleware(Authorization),
  )
  .add(
    HttpApiEndpoint.post("refresh", "/auth/refresh", {
      payload: RefreshInput,
      success: AccessToken,
      error: [
        UserNotFoundError,
        RefreshTokenNotFoundError,
        DatabaseError,
        EnvError,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.get("getMe", "/auth/me", {
      success: UserResponse,
      error: [UserNotFoundError, DatabaseError],
    }).middleware(Authorization),
  ) {}

export class Api extends HttpApi.make("auth")
  .add(AuthController)
  .annotateMerge(OpenApi.annotations({ title: "Auth API" })) {}

export const AuthLive = HttpApiBuilder.group(Api, "auth", (handlers) =>
  handlers
    .handle("register", ({ payload }) => AuthService.register(payload))
    .handle("login", ({ payload }) => AuthService.login(payload))
    .handle("logout", ({ payload }) => AuthService.logout(payload))
    .handle("refresh", ({ payload }) => AuthService.refreshToken(payload.token))
    .handle("getMe", () =>
      Effect.gen(function* () {
        const { userId } = yield* CurrentUserService;
        return yield* AuthService.getUserById(userId);
      }),
    ),
);
