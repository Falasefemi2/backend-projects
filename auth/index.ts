import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
import { Api, AuthLive } from "./src/services/http/api";
import { Effect, Layer } from "effect";
import { DatabaseLive } from "./src/db";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { AuthorizationLive } from "./src/middleware/authmiddleware";
import { AuthRepository } from "./src/services/auth-service";

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide(AuthLive),
  Layer.provide(AuthorizationLive),
  Layer.provide(AuthRepository.layer),
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

