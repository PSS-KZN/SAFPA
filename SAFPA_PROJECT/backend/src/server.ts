import cors from 'cors';
import express from 'express';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { createOpenApiDocument } from './lib/openapi';
import { collectMountedRoutes, type MountedRouter } from './lib/routeCatalog';
import { authScopeMiddleware } from './lib/session';
import { authRouter } from './routes/auth';
import { auditRouter } from './routes/audit';
import { branchesRouter } from './routes/branches';
import { communicationsRouter } from './routes/communications';
import { documentsRouter } from './routes/documents';
import { funeralCasesRouter } from './routes/funeralCases';
import { leadsRouter } from './routes/leads';
import { membersRouter } from './routes/members';
import { parloursRouter } from './routes/parlours';
import { paymentsRouter } from './routes/payments';
import { policiesRouter } from './routes/policies';
import { productsRouter } from './routes/products';
import { reportsRouter } from './routes/reports';
import { resourcesRouter } from './routes/resources';
import { subscriptionsRouter } from './routes/subscriptions';
import { templatesRouter } from './routes/templates';
import { usersRouter } from './routes/users';

export const app = express();
const port = Number(process.env.PORT || 4000);
const showRouteIndex = process.env.NODE_ENV !== 'production';
const docsBasePath = '/api/docs';
const mountedRouters: MountedRouter[] = [
  { basePath: '/api/auth', router: authRouter },
  { basePath: '/api/parlours', router: parloursRouter },
  { basePath: '/api/branches', router: branchesRouter },
  { basePath: '/api/users', router: usersRouter },
  { basePath: '/api/products', router: productsRouter },
  { basePath: '/api/leads', router: leadsRouter },
  { basePath: '/api/members', router: membersRouter },
  { basePath: '/api/policies', router: policiesRouter },
  { basePath: '/api/payments', router: paymentsRouter },
  { basePath: '/api/templates', router: templatesRouter },
  { basePath: '/api/communications', router: communicationsRouter },
  { basePath: '/api/documents', router: documentsRouter },
  { basePath: '/api/funeral-cases', router: funeralCasesRouter },
  { basePath: '/api/reports', router: reportsRouter },
  { basePath: '/api/audit', router: auditRouter },
  { basePath: '/api/resources', router: resourcesRouter },
  { basePath: '/api/subscriptions', router: subscriptionsRouter },
];

function getDocumentedEndpoints() {
  return collectMountedRoutes(mountedRouters, [
    { method: 'GET', path: '/api/health' },
    { method: 'GET', path: '/api/routes' },
    { method: 'GET', path: `${docsBasePath}/openapi.json` },
  ]);
}

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get(`${docsBasePath}/openapi.json`, (req, res) => {
  const serverUrl = `${req.protocol}://${req.get('host') || `localhost:${port}`}`;
  res.json(createOpenApiDocument(getDocumentedEndpoints(), serverUrl));
});

app.use(
  docsBasePath,
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: `${docsBasePath}/openapi.json`,
    },
    customSiteTitle: 'SAFPA Backend API Docs',
  }),
);

if (showRouteIndex) {
  app.get('/api/routes', (_req, res) => {
    const endpoints = getDocumentedEndpoints();

    res.json({
      count: endpoints.length,
      endpoints,
    });
  });
}

app.use(authScopeMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/parlours', parloursRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/members', membersRouter);
app.use('/api/policies', policiesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/funeral-cases', funeralCasesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/subscriptions', subscriptionsRouter);

if (require.main === module) {
  app.listen(port, () => {
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
