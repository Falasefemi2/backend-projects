import { Effect } from "effect";
import {
  AuthRepository,
  DatabaseError,
  UserNotFoundError,
  type LoginInput,
  type LogoutInput,
  type RegisterSchema,
  type User,
} from "./auth-service";
import { loadEnv } from "../config/env";
import * as jwt from "jsonwebtoken";

export class AuthService {
  static readonly register = Effect.fn("AuthService.register")(function* (
    data: RegisterSchema,
  ) {
    const repo = yield* AuthRepository;
    const env = yield* loadEnv;

    const hashedPassword = yield* Effect.tryPromise({
      try: () => Bun.password.hash(data.password),
      catch: (e) => new DatabaseError({ message: String(e) }),
    });
    const user = yield* repo.create({
      ...data,
      password: hashedPassword,
    });
    const accessToken = jwt.sign({ userId: user.id }, env.ACCESS_TOKEN_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRY as any,
    });
    const refreshToken = jwt.sign(
      { userId: user.id },
      env.REFRESH_TOKEN_SECRET,
      { expiresIn: env.REFRESH_TOKEN_EXPIRY as any },
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    yield* repo.createRefreshToken(user.id, refreshToken, expiresAt);
    return { accessToken, refreshToken };
  });

  static readonly login = Effect.fn("AuthService.login")(function* (
    data: LoginInput,
  ) {
    const repo = yield* AuthRepository;
    const env = yield* loadEnv;
    const user = yield* repo.findUserByEmail(data.email);

    const passwordMatch = yield* Effect.tryPromise({
      try: () => Bun.password.verify(data.password, user.password),
      catch: (e) => new DatabaseError({ message: String(e) }),
    });
    if (!passwordMatch) {
      return yield* new UserNotFoundError({
        message: "invalid email or password",
      });
    }
    const accessToken = jwt.sign({ userId: user.id }, env.ACCESS_TOKEN_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRY as any,
    });
    const refreshToken = jwt.sign(
      { userId: user.id },
      env.REFRESH_TOKEN_SECRET,
      { expiresIn: env.REFRESH_TOKEN_EXPIRY as any },
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    yield* repo.createRefreshToken(user.id, refreshToken, expiresAt);
    return { accessToken, refreshToken };
  });

  static readonly refreshToken = Effect.fn("AuthService.refreshToken")(
    function* (token: string) {
      const repo = yield* AuthRepository;
      const env = yield* loadEnv;

      const payload = yield* Effect.try({
        try: () =>
          jwt.verify(token, env.REFRESH_TOKEN_SECRET) as { userId: string },
        catch: () =>
          new UserNotFoundError({
            message: "invalid or expired refresh token",
          }),
      });

      const storedToken = yield* repo.findRefreshToken(token);

      if (new Date() > storedToken.expiresAt) {
        yield* repo.deleteRefreshToken(token);
        return yield* new UserNotFoundError({
          message: "token expired, please login again",
        });
      }

      const accessToken = jwt.sign(
        { userId: payload.userId },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: env.ACCESS_TOKEN_EXPIRY as any },
      );

      return { accessToken };
    },
  );

  static readonly logout = Effect.fn("AuthService.logout")(function* (
    data: LogoutInput,
  ) {
    const repo = yield* AuthRepository;
    yield* repo.deleteRefreshToken(data.refreshToken);
  });

  static readonly getUserById: (
    id: string,
  ) => Effect.Effect<User, UserNotFoundError | DatabaseError, AuthRepository> =
    Effect.fn("AuthService.getUserById")(function* (id: string) {
      const repo = yield* AuthRepository;
      return yield* repo.findUserById(id);
    });
}
