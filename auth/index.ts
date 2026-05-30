import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
import { Api, AuthApiLive } from "./src/AuthApi";
import { Effect, Layer } from "effect";
import { DatabaseLive } from "./src/Database";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { AuthorizationLive } from "./src/AuthMiddleware";
import { AuthRepository } from "./src/AuthRepository";

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide(AuthApiLive),
  Layer.provide(AuthorizationLive),
  Layer.provide(AuthRepository.Live),
  Layer.provide(DatabaseLive),
  Layer.provide(HttpApiScalar.layer(Api)),
);

const HttpLive = HttpRouter.serve(Layer.mergeAll(ApiLive)).pipe(
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layer({ port: 3000 })),
);

if (import.meta.main) {
  BunRuntime.runMain(
    Layer.launch(HttpLive) as Effect.Effect<never, never, never>,
  );
}
