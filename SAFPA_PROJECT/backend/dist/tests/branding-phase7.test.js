"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../server");
function actorHeaders(actor) {
    return {
        'x-user-id': actor.id,
        'x-user-name': actor.name,
        'x-user-role': actor.role,
        ...(actor.parlourId ? { 'x-parlour-id': actor.parlourId } : {}),
        ...(actor.branchId ? { 'x-branch-id': actor.branchId } : {}),
        Authorization: `Bearer ${actor.id}`,
    };
}
const safpaAdmin = actorHeaders({ id: 'u1', name: 'Kagiso Mabena', role: 'safpa_admin' });
const ubuntuOwner = actorHeaders({ id: 'u3', name: 'Bongani Ndlovu', role: 'parlour_owner', parlourId: 'p1' });
const dignityOwner = actorHeaders({ id: 'u8', name: 'Ayanda Cele', role: 'parlour_owner', parlourId: 'p2' });
const branchManager = actorHeaders({ id: 'u4', name: 'Thabo Mokoena', role: 'branch_manager', parlourId: 'p1', branchId: 'b1' });
(0, node_test_1.default)('parlour owner can update own branding workspace', async () => {
    const response = await (0, supertest_1.default)(server_1.app)
        .patch('/api/parlours/p1/branding')
        .set(ubuntuOwner)
        .send({ tagline: 'Compassionate care, dignified farewells.' });
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(response.body.id, 'p1');
    strict_1.default.equal(response.body.tagline, 'Compassionate care, dignified farewells.');
});
(0, node_test_1.default)('parlour owner cannot update another parlour branding', async () => {
    const response = await (0, supertest_1.default)(server_1.app)
        .patch('/api/parlours/p2/branding')
        .set(ubuntuOwner)
        .send({ tagline: 'Should never be allowed' });
    strict_1.default.equal(response.status, 403);
    strict_1.default.match(String(response.body.message), /scope violation/i);
});
(0, node_test_1.default)('branch manager cannot update branding', async () => {
    const response = await (0, supertest_1.default)(server_1.app)
        .patch('/api/parlours/p1/branding')
        .set(branchManager)
        .send({ tagline: 'Blocked branch edit' });
    strict_1.default.equal(response.status, 403);
    strict_1.default.match(String(response.body.message), /insufficient permissions/i);
});
(0, node_test_1.default)('tenant cannot fetch another parlour by id', async () => {
    const response = await (0, supertest_1.default)(server_1.app)
        .get('/api/parlours/p2')
        .set(ubuntuOwner);
    strict_1.default.equal(response.status, 403);
    strict_1.default.match(String(response.body.message), /scope violation/i);
});
(0, node_test_1.default)('subdomain availability reports an existing branded subdomain', async () => {
    const updateResponse = await (0, supertest_1.default)(server_1.app)
        .patch('/api/parlours/p2/branding')
        .set(safpaAdmin)
        .send({ websiteSubdomain: 'phase7-dignity-brand' });
    strict_1.default.equal(updateResponse.status, 200);
    const response = await (0, supertest_1.default)(server_1.app)
        .get('/api/parlours/availability/subdomain?value=phase7-dignity-brand&excludeParlourId=p1')
        .set(safpaAdmin);
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(response.body.available, false);
    strict_1.default.equal(response.body.takenBy, 'Dignity Memorial Parlour');
});
(0, node_test_1.default)('publishing is blocked when branding readiness requirements are not met', async () => {
    const response = await (0, supertest_1.default)(server_1.app)
        .patch('/api/parlours/p1/branding')
        .set(ubuntuOwner)
        .send({
        tagline: '',
        businessDescription: '',
        websitePublishStatus: 'published',
    });
    strict_1.default.equal(response.status, 400);
    strict_1.default.match(String(response.body.message), /complete the branding workspace|must be complete/i);
});
(0, node_test_1.default)('safpa admin can still access any parlour branding surface', async () => {
    const response = await (0, supertest_1.default)(server_1.app)
        .get('/api/parlours/p2')
        .set(safpaAdmin);
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(response.body.id, 'p2');
});
(0, node_test_1.default)('owner-specific availability checks exclude the current parlour', async () => {
    const response = await (0, supertest_1.default)(server_1.app)
        .get('/api/parlours/availability/subdomain?value=ubuntu-funerals&excludeParlourId=p1')
        .set(ubuntuOwner);
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(response.body.available, true);
});
node_test_1.default.after(async () => {
    await (0, supertest_1.default)(server_1.app)
        .patch('/api/parlours/p1/branding')
        .set(safpaAdmin)
        .send({
        tagline: 'Compassionate care, dignified farewells.',
        businessDescription: 'A full-service family funeral parlour serving Gauteng communities with branch-based support and flexible funeral plans.',
        supportEmail: 'support@ubuntufunerals.co.za',
        supportPhone: '011 234 5678',
        physicalAddress: '45 Vilakazi St, Soweto, Gauteng',
        websiteSubdomain: 'ubuntu-funerals',
        websitePublishStatus: 'published',
    });
    await (0, supertest_1.default)(server_1.app)
        .patch('/api/parlours/p2/branding')
        .set(safpaAdmin)
        .send({ websiteSubdomain: null });
});
//# sourceMappingURL=branding-phase7.test.js.map