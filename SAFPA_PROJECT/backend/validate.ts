import request from 'supertest';
import { app } from './src/server';

async function runValidation() {
  try {
    const resetRes = await request(app).post('/api/auth/demo-session/reset');
    console.log(`POST /api/auth/demo-session/reset status: ${resetRes.status}`);

    const reportRes = await request(app)
      .get('/api/reports/adoption/overview')
      .set('x-user-id', 'u1')
      .set('x-user-role', 'safpa_admin');

    console.log(`GET /api/reports/adoption/overview status: ${reportRes.status}`);
    if (reportRes.body) {
      console.log(`totalParlours: ${reportRes.body.totalParlours}`);
      console.log(`liveParlours: ${reportRes.body.liveParlours}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

runValidation();
