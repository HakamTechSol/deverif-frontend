import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { DvarifLoader } from "@/components/common/DvarifLoader";
import "@/i18n";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: () => <DvarifLoader size="lg" fullscreen label="Loading…" />,
  });

  return router;
};
