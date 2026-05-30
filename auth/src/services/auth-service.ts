import { Context, Effect, Layer, Schema } from "effect";
import { PgDrizzle } from "../db";
import { refreshToken, user } from "../db/schema";
import { eq } from "drizzle-orm";

export class RegisterSchema extends Schema.Class<RegisterSchema>(
  "RegisterSchema",
)({
  email: Schema.NonEmptyString,
  password: Schema.String.check(Schema.isMinLength(6)),
  name: Schema.String.check(Schema.isMinLength(2)),
}) {}

export class LoginSchema extends Schema.Class<LoginSchema>("LoginSchema")({
  email: Schema.NonEmptyString,
  password: Schema.String.check(Schema.isMinLength(1)),
}) {}

export class LogoutSchema extends Schema.Class<LogoutSchema>("LogoutSchema")({
  refreshToken: Schema.String.check(Schema.isMinLength(1)),
}) {}

export type RegisterInput = Schema.Schema.Type<typeof RegisterSchema>;
export type LoginInput = Schema.Schema.Type<typeof LoginSchema>;
export type LogoutInput = Schema.Schema.Type<typeof LogoutSchema>;

export class UserNotFoundError extends Schema.TaggedErrorClass<UserNotFoundError>()(
  "UserNotFoundError",
  { message: Schema.String },
) {}

export class UserAlreadyExistsError extends Schema.TaggedErrorClass<UserAlreadyExistsError>()(
  "UserAlreadyExistsError",
  { message: Schema.String },
) {}

export class RefreshTokenNotFoundError extends Schema.TaggedErrorClass<RefreshTokenNotFoundError>()(
  "RefreshTokenNotFoundError",
  { message: Schema.String },
) {}

export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()(
  "DatabaseError",
  { message: Schema.String },
) {}

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthRepositoryShape {
  readonly create: (
    data: RegisterSchema,
  ) => Effect.Effect<User, UserAlreadyExistsError | DatabaseError>;
  readonly findUserByEmail: (
    email: string,
  ) => Effect.Effect<User, UserNotFoundError | DatabaseError>;
  readonly findUserById: (
    id: string,
  ) => Effect.Effect<User, UserNotFoundError | DatabaseError>;
  readonly createRefreshToken: (
    userId: string,
    token: string,
    expiresAt: Date,
  ) => Effect.Effect<RefreshToken, DatabaseError>;
  readonly findRefreshToken: (
    token: string,
  ) => Effect.Effect<RefreshToken, RefreshTokenNotFoundError | DatabaseError>;
  readonly deleteRefreshToken: (
    token: string,
  ) => Effect.Effect<void, RefreshTokenNotFoundError | DatabaseError>;
}

export class AuthRepository extends Context.Service<
  AuthRepository,
  AuthRepositoryShape
>()("auth/services/auth-service/AuthRepository") {
  static readonly layer = Layer.effect(
    AuthRepository,
    Effect.gen(function* () {
      const db = yield* PgDrizzle;

      const create = Effect.fn("AuthRepository.create")(function* (
        data: RegisterInput,
      ) {
        const rows = yield* db
          .insert(user)
          .values({
            email: data.email,
            password: data.password,
            name: data.name,
          })
          .returning()
          .pipe(
            Effect.mapError((e) => {
              const msg = String(e);
              if (
                msg.toLowerCase().includes("unique") ||
                (e as any).code === "23505"
              ) {
                return new UserAlreadyExistsError({
                  message: `User with email ${data.email} already exists`,
                });
              }
              return new DatabaseError({ message: msg });
            }),
          );

        const inserted = rows[0];
        if (!inserted) {
          return yield* new DatabaseError({
            message: "insert returned no rows",
          });
        }
        return inserted;
      });

      const findUserByEmail = Effect.fn("AuthRepository.findUserByEmail")(
        function* (email: string) {
          const rows = yield* db
            .select()
            .from(user)
            .where(eq(user.email, email))
            .pipe(
              Effect.mapError((e) => new DatabaseError({ message: String(e) })),
            );
          const found = rows[0];
          if (!found) {
            return yield* new UserNotFoundError({
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
          .from(user)
          .where(eq(user.id, id))
          .pipe(
            Effect.mapError((e) => new DatabaseError({ message: String(e) })),
          );
        const found = rows[0];
        if (!found) {
          return yield* new UserNotFoundError({
            message: `User with id ${id} not found`,
          });
        }
        return found;
      });

      const createRefreshToken = Effect.fn("AuthRepository.createRefreshToken")(
        function* (userId: string, token: string, expiresAt: Date) {
          const rows = yield* db
            .insert(refreshToken)
            .values({ id: crypto.randomUUID(), userId, token, expiresAt })
            .returning()
            .pipe(
              Effect.mapError((e) => new DatabaseError({ message: String(e) })),
            );
          const inserted = rows[0];
          if (!inserted) {
            return yield* new DatabaseError({
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
            .from(refreshToken)
            .where(eq(refreshToken.token, token))
            .pipe(
              Effect.mapError((e) => new DatabaseError({ message: String(e) })),
            );
          const found = rows[0];
          if (!found) {
            return yield* new RefreshTokenNotFoundError({
              message: "Refresh token not found",
            });
          }
          return found;
        },
      );

      const deleteRefreshToken = Effect.fn("AuthRepository.deleteRefreshToken")(
        function* (token: string) {
          const result = yield* db
            .delete(refreshToken)
            .where(eq(refreshToken.token, token))
            .pipe(
              Effect.mapError((e) => new DatabaseError({ message: String(e) })),
            );

          if (result.length === 0) {
            return yield* new RefreshTokenNotFoundError({
              message: "Refresh token not found",
            });
          }
        },
      );

      return {
        create,
        findUserByEmail,
        findUserById,
        createRefreshToken,
        findRefreshToken,
        deleteRefreshToken,
      } as AuthRepositoryShape;
    }),
  );
}
