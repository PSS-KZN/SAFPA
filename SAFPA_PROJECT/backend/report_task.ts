import request from 'supertest';
import { app } from './src/server';

const safpaAdmin = {
  'x-user-id': 'u1',
  'x-user-name': 'Kagiso Mabena',
  'x-user-role': 'safpa_admin',
  Authorization: 'Bearer u1',
};

async function run() {
  try {
    const response = await request(app)
      .get('/api/reports/network')
      .set(safpaAdmin);

    if (response.status !== 200) {
      console.error(`Error: ${response.status} - ${JSON.stringify(response.body)}`);
      process.exit(1);
    }

    const report = response.body;
    const fields = [
      'totalParlours',
      'activeParlours',
      'totalMembers',
      'totalPolicies',
      'activePolicies',
      'premiumsDueThisMonth',
      'premiumsCollectedThisMonth',
      'totalArrears',
      'openFuneralCases'
    ];

    fields.forEach(field => {
      console.log(`${field}: ${report[field]}`);
    });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
