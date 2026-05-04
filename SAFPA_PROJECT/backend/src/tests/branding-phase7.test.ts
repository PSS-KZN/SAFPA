import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server';

function actorHeaders(actor: {
  id: string;
  name: string;
  role: string;
  parlourId?: string;
  branchId?: string;
}) {
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

test('parlour owner can update own branding workspace', async () => {
  const response = await request(app)
    .patch('/api/parlours/p1/branding')
    .set(ubuntuOwner)
    .send({ tagline: 'Compassionate care, dignified farewells.' });

  assert.equal(response.status, 200);
  assert.equal(response.body.id, 'p1');
  assert.equal(response.body.tagline, 'Compassionate care, dignified farewells.');
});

test('parlour owner cannot update another parlour branding', async () => {
  const response = await request(app)
    .patch('/api/parlours/p2/branding')
    .set(ubuntuOwner)
    .send({ tagline: 'Should never be allowed' });

  assert.equal(response.status, 403);
  assert.match(String(response.body.message), /scope violation/i);
});

test('branch manager cannot update branding', async () => {
  const response = await request(app)
    .patch('/api/parlours/p1/branding')
    .set(branchManager)
    .send({ tagline: 'Blocked branch edit' });

  assert.equal(response.status, 403);
  assert.match(String(response.body.message), /insufficient permissions/i);
});

test('tenant cannot fetch another parlour by id', async () => {
  const response = await request(app)
    .get('/api/parlours/p2')
    .set(ubuntuOwner);

  assert.equal(response.status, 403);
  assert.match(String(response.body.message), /scope violation/i);
});

test('subdomain availability reports an existing branded subdomain', async () => {
  const updateResponse = await request(app)
    .patch('/api/parlours/p2/branding')
    .set(safpaAdmin)
    .send({ websiteSubdomain: 'phase7-dignity-brand' });

  assert.equal(updateResponse.status, 200);

  const response = await request(app)
    .get('/api/parlours/availability/subdomain?value=phase7-dignity-brand&excludeParlourId=p1')
    .set(safpaAdmin);

  assert.equal(response.status, 200);
  assert.equal(response.body.available, false);
  assert.equal(response.body.takenBy, 'Dignity Memorial Parlour');
});

test('publishing is blocked when branding readiness requirements are not met', async () => {
  const response = await request(app)
    .patch('/api/parlours/p1/branding')
    .set(ubuntuOwner)
    .send({
      tagline: '',
      businessDescription: '',
      websitePublishStatus: 'published',
    });

  assert.equal(response.status, 400);
  assert.match(String(response.body.message), /complete the branding workspace|must be complete/i);
});

test('safpa admin can still access any parlour branding surface', async () => {
  const response = await request(app)
    .get('/api/parlours/p2')
    .set(safpaAdmin);

  assert.equal(response.status, 200);
  assert.equal(response.body.id, 'p2');
});

test('owner-specific availability checks exclude the current parlour', async () => {
  const response = await request(app)
    .get('/api/parlours/availability/subdomain?value=ubuntu-funerals&excludeParlourId=p1')
    .set(ubuntuOwner);

  assert.equal(response.status, 200);
  assert.equal(response.body.available, true);
});

test.after(async () => {
  await request(app)
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

  await request(app)
    .patch('/api/parlours/p2/branding')
    .set(safpaAdmin)
    .send({ websiteSubdomain: null });
});