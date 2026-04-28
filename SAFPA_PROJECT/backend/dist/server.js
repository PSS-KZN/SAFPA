"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
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
const policies_1 = require("./routes/policies");
const products_1 = require("./routes/products");
const reports_1 = require("./routes/reports");
const resources_1 = require("./routes/resources");
const subscriptions_1 = require("./routes/subscriptions");
const templates_1 = require("./routes/templates");
const users_1 = require("./routes/users");
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 4000);
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express_1.default.json());
app.use(session_1.authScopeMiddleware);
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
app.use('/api/auth', auth_1.authRouter);
app.use('/api/parlours', parlours_1.parloursRouter);
app.use('/api/branches', branches_1.branchesRouter);
app.use('/api/users', users_1.usersRouter);
app.use('/api/products', products_1.productsRouter);
app.use('/api/leads', leads_1.leadsRouter);
app.use('/api/members', members_1.membersRouter);
app.use('/api/policies', policies_1.policiesRouter);
app.use('/api/payments', payments_1.paymentsRouter);
app.use('/api/templates', templates_1.templatesRouter);
app.use('/api/communications', communications_1.communicationsRouter);
app.use('/api/documents', documents_1.documentsRouter);
app.use('/api/funeral-cases', funeralCases_1.funeralCasesRouter);
app.use('/api/reports', reports_1.reportsRouter);
app.use('/api/audit', audit_1.auditRouter);
app.use('/api/resources', resources_1.resourcesRouter);
app.use('/api/subscriptions', subscriptions_1.subscriptionsRouter);
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map