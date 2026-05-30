# Auth Backend Service

A robust authentication backend service built with Bun, Effect, and Drizzle ORM. This service provides a complete authentication flow including registration, login, token management, and secure user data retrieval.

## Tech Stack

*   Runtime: Bun
*   Framework: Effect (HttpApi)
*   Database: PostgreSQL
*   ORM: Drizzle ORM
*   Authentication: JSON Web Tokens (JWT)
*   Password Hashing: Bun.password

## Features

*   User Registration: Secure password hashing using Bun's built-in hashing.
*   User Login: Issue access and refresh tokens upon successful authentication.
*   Token Refresh: Exchange a valid refresh token for a new access token.
*   Logout: Invalidate refresh tokens on the server side.
*   Protected Routes: Middleware-based authorization for sensitive endpoints.
*   OpenAPI Support: Automatically generated API documentation.
*   Type Safety: Fully typed using Effect's Schema and TypeScript.

## Getting Started

### Prerequisites

*   Bun (latest version)
*   PostgreSQL database

### Installation

1.  Clone the repository.
2.  Install dependencies:

```bash
bun install
```

### Environment Variables

Create a `.env` file in the root directory and configure the following variables (refer to `.env.example`):

*   DATABASE_URL: PostgreSQL connection string.
*   ACCESS_TOKEN_SECRET: Secret key for signing access tokens.
*   ACCESS_TOKEN_EXPIRY: Expiry duration for access tokens (e.g., 15m).
*   REFRESH_TOKEN_SECRET: Secret key for signing refresh tokens.
*   REFRESH_TOKEN_EXPIRY: Expiry duration for refresh tokens (e.g., 7d).
*   PORT: Port on which the server will run (default is 3000).

### Database Setup

Run the migrations to set up your database schema:

```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:migrate
```

Alternatively, use `bun run db:push` to push the schema directly to the database during development.

### Running the Server

Start the development server:

```bash
bun index.ts
```

The server will be available at `http://localhost:3000`. You can access the OpenAPI documentation at `/openapi.json`.

## API Endpoints

### Authentication Group

*   POST /auth/register: Register a new user. Returns access and refresh tokens.
*   POST /auth/login: Authenticate a user. Returns access and refresh tokens.
*   POST /auth/logout: Logout a user and invalidate their refresh token (Requires Authorization).
*   POST /auth/refresh: Exchange a refresh token for a new access token.
*   GET /auth/me: Retrieve the currently authenticated user's details (Requires Authorization).

## Project Structure

*   index.ts: Application entry point and layer configuration.
*   src/
    *   AuthApi.ts: Definition of HTTP endpoints and handlers.
    *   AuthError.ts: Custom error classes for domain-specific errors.
    *   AuthMiddleware.ts: Authorization middleware and user context management.
    *   AuthRepository.ts: Data access layer interacting with the database.
    *   AuthSchema.ts: Zod/Effect schemas for data validation and types.
    *   AuthService.ts: Business logic for authentication processes.
    *   Config.ts: Configuration loading and validation.
    *   Database.ts: Database connection and Drizzle instance setup.
    *   DatabaseSchema.ts: Drizzle database table definitions.
*   drizzle/: Contains migration files and database snapshots.

## License

This project is private and for internal use.
