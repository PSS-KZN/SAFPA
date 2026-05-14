"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authScopeMiddleware = authScopeMiddleware;
const prisma_1 = require("./prisma");
const PUBLIC_ENDPOINTS = new Set(['/api/health', '/api/auth/login', '/api/auth/session', '/api/leads/website-inquiry']);
const ROLE_PERMISSIONS = [
    { prefix: '/api/members/', methods: ['PATCH'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'policyholder_customer'] },
    { prefix: '/api/payments', methods: ['POST'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'collections_clerk', 'policyholder_customer'] },
    { prefix: '/api/parlours', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin'] },
    { prefix: '/api/resources', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin'] },
    { prefix: '/api/branches', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner'] },
    { prefix: '/api/users', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner'] },
    { prefix: '/api/products', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner'] },
    { prefix: '/api/templates', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner'] },
    { prefix: '/api/members', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin'] },
    { prefix: '/api/policies', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin'] },
    { prefix: '/api/leads', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin'] },
    { prefix: '/api/payments', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'collections_clerk'] },
    { prefix: '/api/funeral-cases', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'operations_coordinator'] },
    { prefix: '/api/documents', methods: ['POST', 'PATCH', 'DELETE'], roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'operations_coordinator'] },
    { prefix: '/api/audit', roles: ['safpa_admin', 'parlour_owner'] },
    { prefix: '/api/reports', roles: ['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator'] },
    { prefix: '/api/subscriptions', roles: ['safpa_admin'] },
];
function pathIsPublic(path) {
    if (PUBLIC_ENDPOINTS.has(path)) {
        return true;
    }
    return path.startsWith('/api/leads/website-inquiry');
}
function getHeaderValue(req, key) {
    const value = req.header(key);
    return value && value.trim() ? value.trim() : undefined;
}
function normalizeRole(role) {
    if (!role) {
        return '';
    }
    return role.trim().toLowerCase().replace(/[\s-]+/g, '_');
}
async function resolveActor(req) {
    const explicitUserId = getHeaderValue(req, 'x-user-id');
    const authHeader = getHeaderValue(req, 'authorization');
    const headerRole = normalizeRole(getHeaderValue(req, 'x-user-role'));
    const headerUserName = getHeaderValue(req, 'x-user-name');
    const headerParlourId = getHeaderValue(req, 'x-parlour-id');
    const headerBranchId = getHeaderValue(req, 'x-branch-id');
    const bearerUserId = authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice('bearer '.length).trim()
        : undefined;
    const userId = explicitUserId || bearerUserId;
    if (userId) {
        const user = await prisma_1.prisma.appUser.findUnique({ where: { id: userId } });
        if (user && user.status === 'active') {
            return {
                userId: user.id,
                userName: headerUserName || user.name,
                role: headerRole || normalizeRole(user.role),
                parlourId: headerParlourId || user.parlourId || undefined,
                branchId: headerBranchId || user.branchId || undefined,
                memberId: user.memberId || undefined,
                isAuthenticated: true,
            };
        }
        // Demo role switching can provide actor context entirely via headers.
        if (headerRole) {
            return {
                userId,
                userName: headerUserName || userId,
                role: headerRole,
                parlourId: headerParlourId,
                branchId: headerBranchId,
                memberId: undefined,
                isAuthenticated: true,
            };
        }
        return null;
    }
    if (!headerRole) {
        return null;
    }
    return {
        userId: headerUserName || 'header-user',
        userName: headerUserName || 'Header User',
        role: headerRole,
        parlourId: headerParlourId,
        branchId: headerBranchId,
        memberId: undefined,
        isAuthenticated: true,
    };
}
function ruleAllows(path, method, role) {
    const normalizedRole = normalizeRole(role);
    if (/^\/api\/parlours\/[^/]+\/(branding|logo)$/.test(path)) {
        return ['safpa_admin', 'parlour_owner'].includes(normalizedRole);
    }
    const rules = ROLE_PERMISSIONS.filter((rule) => path.startsWith(rule.prefix));
    if (rules.length === 0) {
        return true;
    }
    const applicableRules = rules.filter((rule) => !rule.methods || rule.methods.includes(method));
    if (applicableRules.length === 0) {
        return true;
    }
    return applicableRules.some((rule) => rule.roles.includes(normalizedRole));
}
function enforceTenantScope(req, res) {
    const actor = req.actor;
    if (!actor || actor.role === 'safpa_admin') {
        return true;
    }
    const scopedParlourId = actor.parlourId;
    if (!scopedParlourId) {
        return true;
    }
    const queryParlourId = typeof req.query.parlourId === 'string' ? req.query.parlourId : undefined;
    const bodyParlourId = req.body && typeof req.body === 'object' && typeof req.body.parlourId === 'string'
        ? req.body.parlourId
        : undefined;
    if (queryParlourId && queryParlourId !== scopedParlourId) {
        res.status(403).json({ message: 'Parlour scope violation' });
        return false;
    }
    if (bodyParlourId && bodyParlourId !== scopedParlourId) {
        res.status(403).json({ message: 'Parlour scope violation' });
        return false;
    }
    if (!queryParlourId && req.method === 'GET' && !req.path.startsWith('/api/parlours')) {
        req.query.parlourId = scopedParlourId;
    }
    if (!bodyParlourId && req.method !== 'GET' && req.body && typeof req.body === 'object') {
        req.body.parlourId = scopedParlourId;
    }
    if (actor.role === 'branch_manager' && actor.branchId && req.path.startsWith('/api/reports')) {
        const queryBranchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
        if (queryBranchId && queryBranchId !== actor.branchId) {
            res.status(403).json({ message: 'Branch scope violation' });
            return false;
        }
        req.query.branchId = actor.branchId;
    }
    return true;
}
async function authScopeMiddleware(req, res, next) {
    if (pathIsPublic(req.path)) {
        next();
        return;
    }
    const actor = await resolveActor(req);
    if (!actor) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    req.actor = actor;
    if (!ruleAllows(req.path, req.method, actor.role)) {
        res.status(403).json({ message: 'Insufficient permissions for this action' });
        return;
    }
    if (!enforceTenantScope(req, res)) {
        return;
    }
    next();
}
//# sourceMappingURL=session.js.map