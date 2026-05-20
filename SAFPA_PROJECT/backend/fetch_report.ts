import request from 'supertest';
import { app } from './src/server';

async function run() {
  try {
    const response = await request(app)
      .get('/api/reports/network')
      .set('x-user-id', 'u1')
      .set('x-user-role', 'safpa_admin');

    if (response.status !== 200) {
      console.error('Error status:', response.status);
      console.error('Error body:', JSON.stringify(response.body, null, 2));
      process.exit(1);
    }

    const {
      totalParlours,
      activeParlours,
      totalMembers,
      totalPolicies,
      activePolicies,
      premiumsDueThisMonth,
      premiumsCollectedThisMonth,
      totalArrears,
      openFuneralCases
    } = response.body;

    console.log(JSON.stringify({
      totalParlours,
      activeParlours,
      totalMembers,
      totalPolicies,
      activePolicies,
      premiumsDueThisMonth,
      premiumsCollectedThisMonth,
      totalArrears,
      openFuneralCases
    }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Catch error:', err);
    process.exit(1);
  }
}

run();
