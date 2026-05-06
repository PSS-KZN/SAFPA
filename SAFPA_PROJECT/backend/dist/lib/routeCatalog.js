"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectMountedRoutes = collectMountedRoutes;
function normalizePath(pathname) {
    if (!pathname.startsWith('/')) {
        return `/${pathname}`;
    }
    return pathname;
}
function joinPaths(basePath, routePath) {
    const normalizedBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');
    const normalizedRoute = routePath === '/' ? '' : routePath.replace(/^\//, '');
    const joined = normalizedRoute ? `${normalizedBase}/${normalizedRoute}` : normalizedBase || '/';
    return normalizePath(joined.replace(/\/+/g, '/'));
}
function collectRouterRoutes(router, basePath) {
    const endpoints = [];
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
            endpoints.push(...collectRouterRoutes(layer.handle, basePath));
        }
    }
    return endpoints;
}
function collectMountedRoutes(mountedRouters, extraEndpoints = []) {
    return [...extraEndpoints, ...mountedRouters.flatMap(({ basePath, router }) => collectRouterRoutes(router, basePath))]
        .sort((left, right) => {
        if (left.path === right.path) {
            return left.method.localeCompare(right.method);
        }
        return left.path.localeCompare(right.path);
    });
}
//# sourceMappingURL=routeCatalog.js.map