import type { QueryClient } from "@tanstack/react-query";
import { createRoute, createRootRoute, createRouter } from "@tanstack/react-router";
import { RootLayout } from "./routes/__root";
import { CreateRoute } from "./routes/create";
import { CreateWhereRoute } from "./routes/create.where";
import { EventHomeRoute } from "./routes/e.$eventId";
import { JoinRoute } from "./routes/e.$eventId.join";
import { ProgressRoute } from "./routes/e.$eventId.progress";
import { LandingRoute } from "./routes/index";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: LandingRoute });
const createRouteDef = createRoute({ getParentRoute: () => rootRoute, path: "/create", component: CreateRoute });
const createWhereRoute = createRoute({ getParentRoute: () => rootRoute, path: "/create/where", component: CreateWhereRoute });
const eventRoute = createRoute({ getParentRoute: () => rootRoute, path: "/e/$eventId", component: EventHomeRoute });
const joinRoute = createRoute({ getParentRoute: () => rootRoute, path: "/e/$eventId/join", component: JoinRoute });
const progressRoute = createRoute({ getParentRoute: () => rootRoute, path: "/e/$eventId/progress", component: ProgressRoute });

const routeTree = rootRoute.addChildren([indexRoute, createRouteDef, createWhereRoute, eventRoute, joinRoute, progressRoute]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
