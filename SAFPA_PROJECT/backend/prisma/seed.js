"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const baseParlours = [
        {
            id: 'p1',
            name: 'Ubuntu Funeral Services',
            region: 'Gauteng Central',
            province: 'Gauteng',
            tier: 'premium',
            status: 'active',
            onboardingProgress: 100,
            totalMembers: 12450,
            totalPolicies: 14200,
            contactEmail: 'info@ubuntufunerals.co.za',
            contactPhone: '011 234 5678',
            primaryColor: '#1e3a5f',
            joinedDate: '2025-11-15',
        },
        {
            id: 'p2',
            name: 'Dignity Memorial Parlour',
            region: 'KZN Coastal',
            province: 'KwaZulu-Natal',
            tier: 'standard',
            status: 'active',
            onboardingProgress: 100,
            totalMembers: 3200,
            totalPolicies: 3800,
            contactEmail: 'admin@dignitymemorial.co.za',
            contactPhone: '031 456 7890',
            primaryColor: '#4a1a6b',
            joinedDate: '2026-01-10',
        },
        {
            id: 'p3',
            name: 'Phakama Funerals',
            region: 'Eastern Cape Metro',
            province: 'Eastern Cape',
            tier: 'basic',
            status: 'active',
            onboardingProgress: 85,
            totalMembers: 480,
            totalPolicies: 520,
            contactEmail: 'hello@phakamafunerals.co.za',
            contactPhone: '041 789 0123',
            primaryColor: '#2d5a2d',
            joinedDate: '2026-02-20',
        },
    ];
    for (const parlour of baseParlours) {
        await prisma.parlour.upsert({
            where: { id: parlour.id },
            update: parlour,
            create: parlour,
        });
    }
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map