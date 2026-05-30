import { Context, Effect, Layer } from "effect";
import { eq } from "drizzle-orm";
import { PgDatabase } from "./Database";
import { refreshTokens, users } from "./DatabaseSchema";
import {
  AuthPersistenceError,
  RefreshTokenNotFound,
  UserAlreadyExists,
  UserNotFound,
} from "./AuthError";
import type { RefreshToken, RegisterInput, User } from "./AuthSchema";

const getProperty = (value: unknown, property: string): unknown =>
  typeof value === "object" && value !== null && property in value
    ? (value as Record<string, unknown>)[property]
    : undefined;

const findNestedProperty = (
  value: unknown,
  property: string,
  seen = new WeakSet<object>(),
): unknown => {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  const direct = getProperty(value, property);
  if (direct !== undefined) {
    return direct;
  }

  return (
    findNestedProperty(getProperty(value, "cause"), property, seen) ??
    findNestedProperty(getProperty(value, "reason"), property, seen)
  );
};

const getErrorMessage = (error: unknown): string => {
  const message = findNestedProperty(error, "message");
  return typeof message === "string" ? message : String(error);
};

const isUniqueViolation = (error: unknown): boolean => {
  const code = findNestedProperty(error, "code");
  const tag = findNestedProperty(error, "_tag");
  const constraint = findNestedProperty(error, "constraint");
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === "23505" ||
    tag === "UniqueViolation" ||
    message.includes("unique") ||
    (typeof constraint === "string" && constraint.includes("users_email"))
  );
};

const toAuthPersistenceError = (error: unknown) =>
  new AuthPersistenceError({ message: getErrorMessage(error) });

export interface AuthRepositoryShape {
  readonly createUser: (
    data: RegisterInput,
  ) => Effect.Effect<User, UserAlreadyExists | AuthPersistenceError>;
  readonly findUserByEmail: (
    email: string,
  ) => Effect.Effect<User, UserNotFound | AuthPersistenceError>;
  readonly findUserById: (
    id: string,
  ) => Effect.Effect<User, UserNotFound | AuthPersistenceError>;
  readonly createRefreshToken: (
    userId: string,
    token: string,
    expiresAt: Date,
  ) => Effect.Effect<RefreshToken, AuthPersistenceError>;
  readonly findRefreshToken: (
    token: string,
  ) => Effect.Effect<RefreshToken, RefreshTokenNotFound | AuthPersistenceError>;
  readonly deleteRefreshToken: (
    token: string,
  ) => Effect.Effect<void, RefreshTokenNotFound | AuthPersistenceError>;
}

export class AuthRepository extends Context.Service<
  AuthRepository,
  AuthRepositoryShape
>()("auth/AuthRepository") {
  static readonly Live = Layer.effect(
    AuthRepository,
    Effect.gen(function* () {
      const db = yield* PgDatabase;

      const createUser = Effect.fn("AuthRepository.createUser")(function* (
        data: RegisterInput,
      ) {
        const rows = yield* db
          .insert(users)
          .values({
            email: data.email,
            password: data.password,
            name: data.name,
          })
          .returning()
          .pipe(
            Effect.mapError((error) => {
              if (isUniqueViolation(error)) {
                return new UserAlreadyExists({
                  message: `User with email ${data.email} already exists`,
                });
              }
              return toAuthPersistenceError(error);
            }),
          );

        const inserted = rows[0];
        if (!inserted) {
          return yield* new AuthPersistenceError({
            message: "insert returned no rows",
          });
        }
        return inserted;
      });

      const findUserByEmail = Effect.fn("AuthRepository.findUserByEmail")(
        function* (email: string) {
          const rows = yield* db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .pipe(Effect.mapError(toAuthPersistenceError));
          const found = rows[0];
          if (!found) {
            return yield* new UserNotFound({
              message: `user with email ${email} not found`,
            });
          }
          return found;
        },
      );

      const findUserById = Effect.fn("AuthRepository.findUserById")(function* (
        id: string,
      ) {
        const rows = yield* db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .pipe(Effect.mapError(toAuthPersistenceError));
        const found = rows[0];
        if (!found) {
          return yield* new UserNotFound({
            message: `User with id ${id} not found`,
          });
        }
        return found;
      });

      const createRefreshToken = Effect.fn("AuthRepository.createRefreshToken")(
        function* (userId: string, token: string, expiresAt: Date) {
          const rows = yield* db
            .insert(refreshTokens)
            .values({ id: crypto.randomUUID(), userId, token, expiresAt })
            .returning()
            .pipe(Effect.mapError(toAuthPersistenceError));
          const inserted = rows[0];
          if (!inserted) {
            return yield* new AuthPersistenceError({
              message: "Failed to create refresh token",
            });
          }
          return inserted;
        },
      );

      const findRefreshToken = Effect.fn("AuthRepository.findRefreshToken")(
        function* (token: string) {
          const rows = yield* db
            .select()
            .from(refreshTokens)
            .where(eq(refreshTokens.token, token))
            .pipe(Effect.mapError(toAuthPersistenceError));
          const found = rows[0];
          if (!found) {
            return yield* new RefreshTokenNotFound({
              message: "Refresh token not found",
            });
          }
          return found;
        },
      );

      const deleteRefreshToken = Effect.fn("AuthRepository.deleteRefreshToken")(
        function* (token: string) {
          const result = yield* db
            .delete(refreshTokens)
            .where(eq(refreshTokens.token, token))
            .pipe(Effect.mapError(toAuthPersistenceError));

          if (result.length === 0) {
            return yield* new RefreshTokenNotFound({
              message: "Refresh token not found",
            });
          }
        },
      );

      return {
        createUser,
        findUserByEmail,
        findUserById,
        createRefreshToken,
        findRefreshToken,
        deleteRefreshToken,
      } satisfies AuthRepositoryShape;
    }),
  );
}
