import type { Router } from 'express';

export type ListedEndpoint = {
  method: string;
  path: string;
};

export type MountedRouter = {
  basePath: string;
  router: Router;
};

type RouteLayer = {
  route?: {
    path?: string | string[];
    methods?: Record<string, boolean>;
  };
  handle?: {
    stack?: RouteLayer[];
  };
};

type StackRouter = Router & {
  stack?: RouteLayer[];
};

function normalizePath(pathname: string): string {
  if (!pathname.startsWith('/')) {
    return `/${pathname}`;
  }

  return pathname;
}

function joinPaths(basePath: string, routePath: string): string {
  const normalizedBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  const normalizedRoute = routePath === '/' ? '' : routePath.replace(/^\//, '');
  const joined = normalizedRoute ? `${normalizedBase}/${normalizedRoute}` : normalizedBase || '/';
  return normalizePath(joined.replace(/\/+/g, '/'));
}

function collectRouterRoutes(router: StackRouter, basePath: string): ListedEndpoint[] {
  const endpoints: ListedEndpoint[] = [];

  for (const layer of router.stack || []) {
    if (layer.route?.path) {
      const routePaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      const methods = Object.entries(layer.route.methods || {})
        .filter(([, enabled]) => enabled)
        .map(([method]) => method.toUpperCase())
        .sort((left, right) => left.localeCompare(right));

      for (const routePath of routePaths) {
        const fullPath = joinPaths(basePath, routePath);
        for (const method of methods) {
          endpoints.push({ method, path: fullPath });
        }
      }

      continue;
    }

    if (layer.handle?.stack) {
      endpoints.push(...collectRouterRoutes(layer.handle as StackRouter, basePath));
    }
  }

  return endpoints;
}

export function collectMountedRoutes(mountedRouters: MountedRouter[], extraEndpoints: ListedEndpoint[] = []): ListedEndpoint[] {
  return [...extraEndpoints, ...mountedRouters.flatMap(({ basePath, router }) => collectRouterRoutes(router as StackRouter, basePath))]
    .sort((left, right) => {
      if (left.path === right.path) {
        return left.method.localeCompare(right.method);
      }

      return left.path.localeCompare(right.path);
    });
}