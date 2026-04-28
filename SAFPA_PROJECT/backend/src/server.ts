import cors from 'cors';
import express from 'express';
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
import { templatesRouter } from './routes/templates';
import { usersRouter } from './routes/users';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

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

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
