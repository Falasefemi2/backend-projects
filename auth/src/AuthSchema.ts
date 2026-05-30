import { Schema } from "effect";

export class RegisterRequest extends Schema.Class<RegisterRequest>(
  "RegisterRequest",
)({
  email: Schema.NonEmptyString,
  password: Schema.String.check(Schema.isMinLength(6)),
  name: Schema.String.check(Schema.isMinLength(2)),
}) {}

export class LoginRequest extends Schema.Class<LoginRequest>("LoginRequest")({
  email: Schema.NonEmptyString,
  password: Schema.String.check(Schema.isMinLength(1)),
}) {}

export class LogoutRequest extends Schema.Class<LogoutRequest>("LogoutRequest")(
  {
    refreshToken: Schema.String.check(Schema.isMinLength(1)),
  },
) {}

export class RefreshTokenRequest extends Schema.Class<RefreshTokenRequest>(
  "RefreshTokenRequest",
)({
  token: Schema.String,
}) {}

export const AuthTokens = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.String,
});

export const AccessTokenResponse = Schema.Struct({
  accessToken: Schema.String,
});

export const UserResponse = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
  createdAt: Schema.Date,
});

export class CurrentUser extends Schema.Class<CurrentUser>("CurrentUser")({
  userId: Schema.String,
}) {}

export type RegisterInput = typeof RegisterRequest.Type;
export type LoginInput = typeof LoginRequest.Type;
export type LogoutInput = typeof LogoutRequest.Type;

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
