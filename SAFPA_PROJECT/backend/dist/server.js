"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_1 = require("./lib/openapi");
const routeCatalog_1 = require("./lib/routeCatalog");
const session_1 = require("./lib/session");
const auth_1 = require("./routes/auth");
const audit_1 = require("./routes/audit");
const branches_1 = require("./routes/branches");
const communications_1 = require("./routes/communications");
const documents_1 = require("./routes/documents");
const funeralCases_1 = require("./routes/funeralCases");
const leads_1 = require("./routes/leads");
const members_1 = require("./routes/members");
const parlours_1 = require("./routes/parlours");
const payments_1 = require("./routes/payments");
const parlourSubscriptions_1 = require("./routes/parlourSubscriptions");
const policies_1 = require("./routes/policies");
const products_1 = require("./routes/products");
const reports_1 = require("./routes/reports");
const resources_1 = require("./routes/resources");
const subscriptions_1 = require("./routes/subscriptions");
const templates_1 = require("./routes/templates");
const users_1 = require("./routes/users");
exports.app = (0, express_1.default)();
const port = Number(process.env.PORT || 4000);
const showRouteIndex = process.env.NODE_ENV !== 'production';
const docsBasePath = '/api/docs';
const configuredFrontendOrigin = process.env.FRONTEND_ORIGIN;
const localFrontendOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):(5173|5174)$/;
const mountedRouters = [
    { basePath: '/api/auth', router: auth_1.authRouter },
    { basePath: '/api/parlours', router: parlours_1.parloursRouter },
    { basePath: '/api/branches', router: branches_1.branchesRouter },
    { basePath: '/api/users', router: users_1.usersRouter },
    { basePath: '/api/products', router: products_1.productsRouter },
    { basePath: '/api/leads', router: leads_1.leadsRouter },
    { basePath: '/api/members', router: members_1.membersRouter },
    { basePath: '/api/policies', router: policies_1.policiesRouter },
    { basePath: '/api/payments', router: payments_1.paymentsRouter },
    { basePath: '/api/templates', router: templates_1.templatesRouter },
    { basePath: '/api/communications', router: communications_1.communicationsRouter },
    { basePath: '/api/documents', router: documents_1.documentsRouter },
    { basePath: '/api/funeral-cases', router: funeralCases_1.funeralCasesRouter },
    { basePath: '/api/reports', router: reports_1.reportsRouter },
    { basePath: '/api/audit', router: audit_1.auditRouter },
    { basePath: '/api/resources', router: resources_1.resourcesRouter },
    { basePath: '/api/subscriptions', router: subscriptions_1.subscriptionsRouter },
    { basePath: '/api/parlour-subscriptions', router: parlourSubscriptions_1.parlourSubscriptionsRouter },
];
function getDocumentedEndpoints() {
    return (0, routeCatalog_1.collectMountedRoutes)(mountedRouters, [
        { method: 'GET', path: '/api/health' },
        { method: 'GET', path: '/api/routes' },
        { method: 'GET', path: `${docsBasePath}/openapi.json` },
    ]);
}
exports.app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (configuredFrontendOrigin) {
            callback(null, origin === configuredFrontendOrigin);
            return;
        }
        callback(null, localFrontendOriginPattern.test(origin));
    },
}));
exports.app.use(express_1.default.json());
exports.app.use('/uploads', express_1.default.static(node_path_1.default.resolve(process.cwd(), 'uploads')));
exports.app.get(`${docsBasePath}/openapi.json`, (req, res) => {
    const serverUrl = `${req.protocol}://${req.get('host') || `localhost:${port}`}`;
    res.json((0, openapi_1.createOpenApiDocument)(getDocumentedEndpoints(), serverUrl));
});
exports.app.use(docsBasePath, swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(undefined, {
    swaggerOptions: {
        url: `${docsBasePath}/openapi.json`,
    },
    customSiteTitle: 'SAFPA Backend API Docs',
}));
if (showRouteIndex) {
    exports.app.get('/api/routes', (_req, res) => {
        const endpoints = getDocumentedEndpoints();
        res.json({
            count: endpoints.length,
            endpoints,
        });
    });
}
exports.app.use(session_1.authScopeMiddleware);
exports.app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
exports.app.use('/api/auth', auth_1.authRouter);
exports.app.use('/api/parlours', parlours_1.parloursRouter);
exports.app.use('/api/branches', branches_1.branchesRouter);
exports.app.use('/api/users', users_1.usersRouter);
exports.app.use('/api/products', products_1.productsRouter);
exports.app.use('/api/leads', leads_1.leadsRouter);
exports.app.use('/api/members', members_1.membersRouter);
exports.app.use('/api/policies', policies_1.policiesRouter);
exports.app.use('/api/payments', payments_1.paymentsRouter);
exports.app.use('/api/templates', templates_1.templatesRouter);
exports.app.use('/api/communications', communications_1.communicationsRouter);
exports.app.use('/api/documents', documents_1.documentsRouter);
exports.app.use('/api/funeral-cases', funeralCases_1.funeralCasesRouter);
exports.app.use('/api/reports', reports_1.reportsRouter);
exports.app.use('/api/audit', audit_1.auditRouter);
exports.app.use('/api/resources', resources_1.resourcesRouter);
exports.app.use('/api/subscriptions', subscriptions_1.subscriptionsRouter);
exports.app.use('/api/parlour-subscriptions', parlourSubscriptions_1.parlourSubscriptionsRouter);
if (require.main === module) {
    exports.app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Backend listening on http://localhost:${port}`);
        if (showRouteIndex) {
            // eslint-disable-next-line no-console
            console.log(`Route index available at http://localhost:${port}/api/routes`);
        }
        // eslint-disable-next-line no-console
        console.log(`Swagger UI available at http://localhost:${port}${docsBasePath}`);
    });
}
//# sourceMappingURL=server.js.map