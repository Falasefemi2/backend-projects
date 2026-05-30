import { Effect } from "effect";
import * as jwt from "jsonwebtoken";
import { AuthRepository } from "./AuthRepository";
import { AuthPersistenceError, UserNotFound } from "./AuthError";
import { loadConfig } from "./Config";
import type {
  LoginInput,
  LogoutInput,
  RegisterInput,
  User,
} from "./AuthSchema";

export class AuthService {
  static readonly register = Effect.fn("AuthService.register")(function* (
    data: RegisterInput,
  ) {
    const repository = yield* AuthRepository;
    const config = yield* loadConfig;

    const hashedPassword = yield* Effect.tryPromise({
      try: () => Bun.password.hash(data.password),
      catch: (error) => new AuthPersistenceError({ message: String(error) }),
    });
    const user = yield* repository.createUser({
      ...data,
      password: hashedPassword,
    });
    const accessToken = jwt.sign(
      { userId: user.id },
      config.ACCESS_TOKEN_SECRET,
      {
        expiresIn: config.REFRESH_TOKEN_EXPIRY as any,
      },
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRY as any },
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    yield* repository.createRefreshToken(user.id, refreshToken, expiresAt);
    return { accessToken, refreshToken };
  });

  static readonly login = Effect.fn("AuthService.login")(function* (
    data: LoginInput,
  ) {
    const repository = yield* AuthRepository;
    const config = yield* loadConfig;
    const user = yield* repository.findUserByEmail(data.email);

    const passwordMatch = yield* Effect.tryPromise({
      try: () => Bun.password.verify(data.password, user.password),
      catch: (error) => new AuthPersistenceError({ message: String(error) }),
    });
    if (!passwordMatch) {
      return yield* new UserNotFound({
        message: "invalid email or password",
      });
    }
    const accessToken = jwt.sign(
      { userId: user.id },
      config.ACCESS_TOKEN_SECRET,
      {
        expiresIn: config.ACCESS_TOKEN_EXPIRY as any,
      },
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRY as any },
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    yield* repository.createRefreshToken(user.id, refreshToken, expiresAt);
    return { accessToken, refreshToken };
  });

  static readonly refreshAccessToken = Effect.fn(
    "AuthService.refreshAccessToken",
  )(function* (token: string) {
    const repository = yield* AuthRepository;
    const config = yield* loadConfig;

    const payload = yield* Effect.try({
      try: () =>
        jwt.verify(token, config.REFRESH_TOKEN_SECRET) as { userId: string },
      catch: () =>
        new UserNotFound({
          message: "invalid or expired refresh token",
        }),
    });

    const storedToken = yield* repository.findRefreshToken(token);

    if (new Date() > storedToken.expiresAt) {
      yield* repository.deleteRefreshToken(token);
      return yield* new UserNotFound({
        message: "token expired, please login again",
      });
    }

    const accessToken = jwt.sign(
      { userId: payload.userId },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: config.ACCESS_TOKEN_EXPIRY as any },
    );

    return { accessToken };
  });

  static readonly logout = Effect.fn("AuthService.logout")(function* (
    data: LogoutInput,
  ) {
    const repository = yield* AuthRepository;
    yield* repository.deleteRefreshToken(data.refreshToken);
  });

  static readonly getUserById: (
    id: string,
  ) => Effect.Effect<
    User,
    UserNotFound | AuthPersistenceError,
    AuthRepository
  > = Effect.fn("AuthService.getUserById")(function* (id: string) {
    const repository = yield* AuthRepository;
    return yield* repository.findUserById(id);
  });
}
