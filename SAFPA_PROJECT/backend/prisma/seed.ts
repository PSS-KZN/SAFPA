import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function toDateText(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthDay(monthStart: Date, day: number): string {
  const safeDay = Math.max(1, Math.min(day, 28));
  return toDateText(new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), safeDay)));
}

function toTimestamp(dateText: string, hour: number, minute: number): string {
  const hh = String(Math.max(0, Math.min(hour, 23))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(minute, 59))).padStart(2, '0');
  return `${dateText} ${hh}:${mm}:00`;
}

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
      logo: '/branding/ubuntu-logo.png',
      primaryColor: '#1e3a5f',
      secondaryColor: '#0f172a',
      accentColor: '#dc2626',
      businessDescription: 'A full-service family funeral parlour serving Gauteng communities with branch-based support and flexible funeral plans.',
      tagline: 'Compassionate care, dignified farewells.',
      supportEmail: 'support@ubuntufunerals.co.za',
      supportPhone: '011 234 5678',
      physicalAddress: '45 Vilakazi St, Soweto, Gauteng',
      websiteTemplate: 'heritage',
      websiteSubdomain: 'ubuntu-funerals',
      customDomain: 'www.ubuntufunerals.co.za',
      customDomainStatus: 'configured',
      customDomainDnsTarget: 'cname.safpa-sites.co.za',
      customDomainNotes: 'Configured during pilot onboarding.',
      websitePublished: true,
      websitePublishStatus: 'published',
      brandingCompletedAt: '2026-05-04',
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
      logo: '/branding/dignity-logo.png',
      primaryColor: '#4a1a6b',
      secondaryColor: '#1f1731',
      accentColor: '#b45309',
      businessDescription: 'Regional memorial services with strong branch coverage and practical funeral policy administration for growing families.',
      tagline: 'Trusted support when families need it most.',
      supportEmail: 'care@dignitymemorial.co.za',
      supportPhone: '031 456 7890',
      physicalAddress: '23 Smith St, Durban, KwaZulu-Natal',
      websiteTemplate: 'modern',
      websiteSubdomain: 'dignity-memorial',
      customDomainStatus: 'not_requested',
      websitePublished: true,
      websitePublishStatus: 'published',
      brandingCompletedAt: '2026-05-04',
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
      logo: '/branding/phakama-logo.png',
      primaryColor: '#2d5a2d',
      secondaryColor: '#16351d',
      accentColor: '#d97706',
      businessDescription: 'Community-led funeral support with simple, accessible cover and local branch service across the Eastern Cape.',
      tagline: 'Local care rooted in community.',
      supportEmail: 'support@phakamafunerals.co.za',
      supportPhone: '041 789 0123',
      physicalAddress: '10 Main Rd, Gqeberha, Eastern Cape',
      websiteTemplate: 'community',
      websiteSubdomain: 'phakama-funerals',
      customDomainStatus: 'requested',
      customDomainDnsTarget: 'cname.safpa-sites.co.za',
      customDomainNotes: 'Waiting on DNS delegation from the parlour owner.',
      websitePublished: false,
      websitePublishStatus: 'ready',
      joinedDate: '2026-02-20',
    },
  ] as const;

  const baseBranches = [
    { id: 'b1', parlourId: 'p1', name: 'Soweto Main', address: '45 Vilakazi St', city: 'Soweto', province: 'Gauteng', manager: 'Thabo Mokoena', phone: '011 234 5601', status: 'active' },
    { id: 'b2', parlourId: 'p1', name: 'Pretoria East', address: '12 Lynnwood Rd', city: 'Pretoria', province: 'Gauteng', manager: 'Naledi Dlamini', phone: '012 345 6789', status: 'active' },
    { id: 'b3', parlourId: 'p1', name: 'Johannesburg CBD', address: '88 Commissioner St', city: 'Johannesburg', province: 'Gauteng', manager: 'Sipho Nkosi', phone: '011 987 6543', status: 'active' },
    { id: 'b4', parlourId: 'p2', name: 'Durban Central', address: '23 Smith St', city: 'Durban', province: 'KwaZulu-Natal', manager: 'Zanele Mkhize', phone: '031 456 7801', status: 'active' },
    { id: 'b5', parlourId: 'p2', name: 'Pietermaritzburg', address: '56 Church St', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', manager: 'Mandla Zulu', phone: '033 345 6789', status: 'active' },
    { id: 'b6', parlourId: 'p3', name: 'Port Elizabeth Main', address: '10 Main Rd', city: 'Gqeberha', province: 'Eastern Cape', manager: 'Noxolo Mtshali', phone: '041 789 0101', status: 'active' },
    { id: 'b7', parlourId: 'p3', name: 'East London', address: '34 Oxford St', city: 'East London', province: 'Eastern Cape', manager: 'Andile Gcaba', phone: '043 456 7890', status: 'active' },
  ] as const;

  const baseUsers = [
    { id: 'u1', name: 'Kagiso Mabena', email: 'kagiso@safpa.org.za', role: 'safpa_admin', status: 'active' },
    { id: 'u2', name: 'Nomvula Khumalo', email: 'nomvula@safpa.org.za', role: 'safpa_admin', status: 'active' },
    { id: 'u3', name: 'Bongani Ndlovu', email: 'bongani@ubuntufunerals.co.za', role: 'parlour_owner', parlourId: 'p1', status: 'active' },
    { id: 'u4', name: 'Thabo Mokoena', email: 'thabo@ubuntufunerals.co.za', role: 'branch_manager', parlourId: 'p1', branchId: 'b1', status: 'active' },
    { id: 'u5', name: 'Lindiwe Sithole', email: 'lindiwe@ubuntufunerals.co.za', role: 'policy_admin', parlourId: 'p1', branchId: 'b1', status: 'active' },
    { id: 'u6', name: 'Mpho Tau', email: 'mpho@ubuntufunerals.co.za', role: 'collections_clerk', parlourId: 'p1', branchId: 'b1', status: 'active' },
    { id: 'u7', name: 'Sibongile Mthembu', email: 'sibongile@ubuntufunerals.co.za', role: 'operations_coordinator', parlourId: 'p1', branchId: 'b1', status: 'active' },
    { id: 'u8', name: 'Ayanda Cele', email: 'ayanda@dignitymemorial.co.za', role: 'parlour_owner', parlourId: 'p2', status: 'active' },
    { id: 'u9', name: 'Zanele Mkhize', email: 'zanele@dignitymemorial.co.za', role: 'branch_manager', parlourId: 'p2', branchId: 'b4', status: 'active' },
    { id: 'u10', name: 'Noxolo Mtshali', email: 'noxolo@phakamafunerals.co.za', role: 'parlour_owner', parlourId: 'p3', status: 'active' },
    { id: 'u11', name: 'Neo Mahlasela', email: 'neo.reports@ubuntufunerals.co.za', role: 'reporting_analyst', parlourId: 'p1', branchId: 'b1', status: 'active' },
  ] as const;

  const baseSubscriptions = [
    {
      id: 'sub1',
      parlourId: 'p1',
      tier: 'premium',
      status: 'active',
      billingCycle: 'monthly',
      amount: 4999,
      startDate: '2025-11-15',
      autoRenew: true,
      notes: 'Enterprise support package',
    },
    {
      id: 'sub2',
      parlourId: 'p2',
      tier: 'standard',
      status: 'active',
      billingCycle: 'monthly',
      amount: 2499,
      startDate: '2026-01-10',
      autoRenew: true,
      notes: 'Standard growth plan',
    },
    {
      id: 'sub3',
      parlourId: 'p3',
      tier: 'basic',
      status: 'paused',
      billingCycle: 'monthly',
      amount: 999,
      startDate: '2026-02-20',
      autoRenew: false,
      notes: 'Paused during onboarding',
    },
  ] as const;

  const baseProducts = [
    { id: 'pr1', parlourId: 'p1', name: 'Individual Plan', description: 'Cover for a single individual', premiumFrom: 99, coverFrom: 15000, maxDependants: 0, isActive: true },
    { id: 'pr2', parlourId: 'p1', name: 'Family Plan', description: 'Cover for member plus dependants', premiumFrom: 199, coverFrom: 25000, maxDependants: 6, isActive: true },
    { id: 'pr3', parlourId: 'p1', name: 'Premium Family Plan', description: 'Enhanced cover with added benefits', premiumFrom: 350, coverFrom: 50000, maxDependants: 8, isActive: true },
  ] as const;

  const baseLeads = [
    { id: 'l1', parlourId: 'p1', branchId: 'b1', firstName: 'David', lastName: 'Moloi', phone: '079 111 2222', email: 'david.m@gmail.com', source: 'website', status: 'new', createdOn: '2026-04-18' },
    { id: 'l2', parlourId: 'p1', branchId: 'b1', firstName: 'Patricia', lastName: 'Mabaso', phone: '082 333 4444', source: 'agent', status: 'contacted', assignedTo: 'Lindiwe Sithole', createdOn: '2026-04-15' },
    { id: 'l3', parlourId: 'p1', branchId: 'b2', firstName: 'James', lastName: 'Pretorius', phone: '071 555 6666', email: 'james.p@outlook.com', source: 'website', status: 'qualified', assignedTo: 'Naledi Dlamini', createdOn: '2026-04-12' },
  ] as const;

  const baseMembers = [
    {
      id: 'm1', parlourId: 'p1', branchId: 'b1', firstName: 'Sibusiso', lastName: 'Mahlangu', idNumber: '8501015800089',
      phone: '072 345 6789', email: 'sibusiso.m@gmail.com', address: '12 Khumalo St', city: 'Soweto', province: 'Gauteng',
      joinDate: '2025-12-01', status: 'active',
      dependants: [
        { id: 'd1', firstName: 'Grace', lastName: 'Mahlangu', idNumber: '8803025800081', relationship: 'Spouse', dateOfBirth: '1988-03-02' },
      ],
      beneficiaries: [
        { id: 'bn1', firstName: 'Grace', lastName: 'Mahlangu', idNumber: '8803025800081', relationship: 'Spouse', percentage: 100 },
      ],
    },
    {
      id: 'm2', parlourId: 'p1', branchId: 'b1', firstName: 'Ntombi', lastName: 'Radebe', idNumber: '9002145800083',
      phone: '083 456 7890', email: 'ntombi.r@yahoo.com', address: '34 Mandela Dr', city: 'Soweto', province: 'Gauteng',
      joinDate: '2025-12-15', status: 'active', dependants: [], beneficiaries: [],
    },
    {
      id: 'm3', parlourId: 'p1', branchId: 'b2', firstName: 'Johannes', lastName: 'van der Merwe', idNumber: '7506085800085',
      phone: '082 567 8901', email: 'johannes.vdm@outlook.com', address: '56 Lynnwood Rd', city: 'Pretoria', province: 'Gauteng',
      joinDate: '2026-01-05', status: 'active', dependants: [], beneficiaries: [],
    },
    {
      id: 'm4', parlourId: 'p1', branchId: 'b3', firstName: 'Fatima', lastName: 'Essop', idNumber: '8210225800089',
      phone: '071 678 9012', email: 'fatima.e@gmail.com', address: '78 Market St', city: 'Johannesburg', province: 'Gauteng',
      joinDate: '2026-01-20', status: 'active', dependants: [], beneficiaries: [],
    },
    {
      id: 'm5', parlourId: 'p1', branchId: 'b1', firstName: 'Precious', lastName: 'Mkhwanazi', idNumber: '9505015800091',
      phone: '060 789 0123', email: 'precious.m@icloud.com', address: '90 Vilakazi St', city: 'Soweto', province: 'Gauteng',
      joinDate: '2026-02-01', status: 'suspended', dependants: [], beneficiaries: [],
    },
  ] as const;

  const basePolicies = [
    { id: 'pol1', policyNumber: 'UBT-2025-0001', memberId: 'm1', parlourId: 'p1', productId: 'pr2', productName: 'Family Plan', status: 'active', premiumAmount: 250, waitingPeriodDays: 180, billingFrequency: 'monthly', nextDueDate: '2026-05-01', startDate: '2025-12-01', coverAmount: 35000, arrearsAmount: 0, lastPaymentDate: '2026-04-01' },
    { id: 'pol2', policyNumber: 'UBT-2025-0002', memberId: 'm2', parlourId: 'p1', productId: 'pr1', productName: 'Individual Plan', status: 'active', premiumAmount: 120, waitingPeriodDays: 180, billingFrequency: 'monthly', nextDueDate: '2026-05-01', startDate: '2025-12-15', coverAmount: 20000, arrearsAmount: 0, lastPaymentDate: '2026-04-01' },
    { id: 'pol3', policyNumber: 'UBT-2026-0003', memberId: 'm3', parlourId: 'p1', productId: 'pr3', productName: 'Premium Family Plan', status: 'active', premiumAmount: 450, waitingPeriodDays: 90, billingFrequency: 'monthly', nextDueDate: '2026-05-01', startDate: '2026-01-05', coverAmount: 60000, arrearsAmount: 0, lastPaymentDate: '2026-04-01' },
    { id: 'pol4', policyNumber: 'UBT-2026-0004', memberId: 'm4', parlourId: 'p1', productId: 'pr1', productName: 'Individual Plan', status: 'active', premiumAmount: 99, waitingPeriodDays: 180, billingFrequency: 'monthly', nextDueDate: '2026-05-01', startDate: '2026-01-20', coverAmount: 15000, arrearsAmount: 0, lastPaymentDate: '2026-04-01' },
    { id: 'pol5', policyNumber: 'UBT-2026-0005', memberId: 'm5', parlourId: 'p1', productId: 'pr2', productName: 'Family Plan', status: 'suspended', premiumAmount: 199, waitingPeriodDays: 180, billingFrequency: 'monthly', nextDueDate: '2026-03-01', startDate: '2026-02-01', coverAmount: 25000, arrearsAmount: 398 },
  ] as const;

  const basePayments = [
    { id: 'pay1', policyId: 'pol1', policyNumber: 'UBT-2025-0001', memberId: 'm1', memberName: 'Sibusiso Mahlangu', amount: 250, date: '2026-04-01', method: 'debit_order', status: 'successful', reference: 'DO-20260401-001', parlourId: 'p1' },
    { id: 'pay2', policyId: 'pol2', policyNumber: 'UBT-2025-0002', memberId: 'm2', memberName: 'Ntombi Radebe', amount: 120, date: '2026-04-01', method: 'debit_order', status: 'successful', reference: 'DO-20260401-002', parlourId: 'p1' },
    { id: 'pay3', policyId: 'pol3', policyNumber: 'UBT-2026-0003', memberId: 'm3', memberName: 'Johannes van der Merwe', amount: 450, date: '2026-04-01', method: 'eft', status: 'successful', reference: 'EFT-20260401-001', parlourId: 'p1' },
    { id: 'pay4', policyId: 'pol5', policyNumber: 'UBT-2026-0005', memberId: 'm5', memberName: 'Precious Mkhwanazi', amount: 199, date: '2026-04-01', method: 'debit_order', status: 'failed', reference: 'DO-20260401-005', parlourId: 'p1' },
  ] as const;

  const baseTemplates = [
    {
      id: 'tpl1', parlourId: 'p1', name: 'Monthly Payment Reminder', type: 'sms', trigger: 'payment_reminder',
      body: 'Dear {member_name}, your premium is due on {due_date}.', isActive: true, createdOn: '2026-01-10', lastUpdated: '2026-03-15',
    },
    {
      id: 'tpl2', parlourId: 'p1', name: 'Payment Receipt SMS', type: 'sms', trigger: 'payment_receipt',
      body: 'Thank you, your payment has been received.', isActive: true, createdOn: '2026-01-10', lastUpdated: '2026-01-10',
    },
  ] as const;

  const baseCommunications = [
    { id: 'c1', parlourId: 'p1', type: 'sms', recipientName: 'Sibusiso Mahlangu', recipientContact: '072 345 6789', template: 'Payment Reminder', status: 'delivered', sentAt: '2026-04-01 08:00' },
    { id: 'c2', parlourId: 'p1', type: 'email', recipientName: 'Johannes van der Merwe', recipientContact: 'johannes.vdm@outlook.com', subject: 'Payment Receipt', template: 'Payment Receipt', status: 'delivered', sentAt: '2026-04-01 10:30' },
  ] as const;

  const baseDocuments = [
    { id: 'doc1', name: 'Sipho_Ndlovu_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm1', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2025-12-02', size: '245 KB' },
    { id: 'doc2', name: 'POL_UBT-2025-0001_PolicySchedule.pdf', type: 'policy_document', entityType: 'policy', entityId: 'pol1', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2025-12-05', size: '320 KB' },
    { id: 'doc3', name: 'FC001_Death_Certificate.pdf', type: 'death_certificate', entityType: 'funeral_case', entityId: 'fc1', parlourId: 'p1', uploadedBy: 'Sibongile Mthembu', uploadedAt: '2026-03-12', size: '285 KB' },
  ] as const;

  const baseFuneralCases = [
    {
      id: 'fc1', caseNumber: 'FC-2026-001', parlourId: 'p1', branchId: 'b1', deceasedName: 'Elizabeth Mahlangu', deceasedIdNumber: '5501015800050',
      dateOfDeath: '2026-04-10', policyId: 'pol1', policyNumber: 'UBT-2025-0001', memberId: 'm1', coordinatorId: 'u7', coordinatorName: 'Sibongile Mthembu',
      status: 'in_progress', funeralDate: '2026-04-20', venue: 'Avalon Cemetery, Soweto', caseType: 'policy',
      tasks: [
        { id: 't1', title: 'Collect death certificate', completed: true },
        { id: 't2', title: 'Arrange hearse', completed: true },
        { id: 't3', title: 'Order flowers', completed: false },
      ],
      notes: ['Family requested white casket'],
      createdOn: '2026-04-10',
    },
    {
      id: 'fc2', caseNumber: 'FC-2026-002', parlourId: 'p1', branchId: 'b2', deceasedName: 'Petrus Botha', deceasedIdNumber: '4301015800051',
      dateOfDeath: '2026-04-05', coordinatorId: 'u7', coordinatorName: 'Sibongile Mthembu', status: 'completed', funeralDate: '2026-04-12',
      venue: 'Rebecca Street Cemetery, Pretoria', caseType: 'cash', tasks: [], notes: [], createdOn: '2026-04-05',
    },
  ] as const;

  const baseReconciliationImports = [
    { id: 'rec1', parlourId: 'p1', fileName: 'April_2026_Batch.csv', importedBy: 'Mpho Tau', importedAt: '2026-04-18', matched: 142, exceptions: 3, status: 'completed' },
  ] as const;

  const baseAuditEntries = [
    { id: 'a1', timestamp: '2026-04-21 09:14:32', userId: 'u5', userName: 'Lindiwe Sithole', userRole: 'policy_admin', action: 'POLICY_UPDATED', entityType: 'Policy', entityId: 'pol5', entityLabel: 'UBT-2026-0005', parlourId: 'p1', details: 'Status changed from suspended to active; arrears cleared' },
    { id: 'a2', timestamp: '2026-04-20 16:44:11', userId: 'u3', userName: 'Bongani Ndlovu', userRole: 'parlour_owner', action: 'USER_CREATED', entityType: 'User', entityId: 'u8', entityLabel: 'Nompumelelo Dube', parlourId: 'p1', details: 'New user created with role: policy_admin' },
  ] as const;

  const baseResources = [
    {
      id: 'res1',
      title: 'SAFPA 2026 Convention - Member Pack',
      type: 'notice',
      description: 'Official delegate and exhibitor pack for the SAFPA 2026 Convention. Includes schedule, venue details, networking sessions, and registration instructions.',
      publishedAt: '2026-04-15',
      publishedBy: 'Kagiso Mabena',
      fileSize: '2.4 MB',
      tags: ['convention', '2026', 'event'],
    },
    {
      id: 'res2',
      title: 'POPIA Compliance Guide for Funeral Parlours',
      type: 'training',
      description: 'Practical guide on how funeral parlours should handle personal information in compliance with POPIA.',
      publishedAt: '2026-04-10',
      publishedBy: 'Nomvula Khumalo',
      fileSize: '1.8 MB',
      tags: ['compliance', 'POPIA', 'training'],
    },
    {
      id: 'res3',
      title: 'Premium Collection Best Practices - Member Toolkit',
      type: 'training',
      description: 'Toolkit to improve premium collection rates, arrears workflows, and member communication quality.',
      publishedAt: '2026-04-08',
      publishedBy: 'Kagiso Mabena',
      fileSize: '950 KB',
      tags: ['collections', 'training', 'toolkit'],
    },
    {
      id: 'res4',
      title: 'FSCA Compliance Bulletin - April 2026',
      type: 'policy',
      description: 'Regulatory update covering enforcement actions, funeral insurance framework changes, and member obligations.',
      publishedAt: '2026-04-18',
      publishedBy: 'Kagiso Mabena',
      fileSize: '620 KB',
      tags: ['FSCA', 'regulatory', 'compliance'],
    },
    {
      id: 'res5',
      title: 'Preferred Payment Partner Directory - 2026',
      type: 'partner',
      description: 'Approved payment and debit order providers with negotiated rates for SAFPA members.',
      publishedAt: '2026-03-28',
      publishedBy: 'Nomvula Khumalo',
      fileSize: '410 KB',
      tags: ['partners', 'payments', 'collections'],
    },
    {
      id: 'res6',
      title: 'Member Communication Templates Pack',
      type: 'template',
      description: 'Standardized SMS and email templates for reminders, receipts, and policy lifecycle events.',
      publishedAt: '2026-03-20',
      publishedBy: 'Nomvula Khumalo',
      fileSize: '340 KB',
      tags: ['templates', 'communications', 'SMS', 'email'],
    },
    {
      id: 'res7',
      title: 'SAFPA Member Onboarding Guide - Digital Platform',
      type: 'training',
      description: 'Step-by-step guide for new member parlours onboarding to the SAFPA FPOS platform.',
      publishedAt: '2026-03-15',
      publishedBy: 'Kagiso Mabena',
      fileSize: '1.2 MB',
      tags: ['onboarding', 'training', 'FPOS', 'setup'],
    },
    {
      id: 'res8',
      title: 'Draft Industry Code of Conduct - Funeral Sector',
      type: 'policy',
      description: 'Draft code of conduct covering transparent pricing, quotations, complaints handling, and records.',
      publishedAt: '2026-03-05',
      publishedBy: 'Nomvula Khumalo',
      fileSize: '780 KB',
      tags: ['policy', 'code of conduct', 'regulatory'],
    },
  ] as const;

  const startOfCurrentMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const monthStarts = Array.from({ length: 6 }, (_, index) => addMonths(startOfCurrentMonth, -(5 - index)));

  const firstNames = ['Lebo', 'Anele', 'Musa', 'Nomsa', 'Peter', 'Ayabonga', 'Refilwe', 'Tumi', 'Nandi', 'Kabelo', 'Palesa', 'Brian'];
  const lastNames = ['Mokoena', 'Mthethwa', 'Dube', 'Mahlangu', 'Pillay', 'van Wyk', 'Nkosi', 'Mbatha', 'Radebe', 'Molefe', 'Zulu', 'Naidoo'];
  const branchCycle = ['b1', 'b2', 'b3'];

  const productCatalog = {
    pr1: { name: 'Individual Plan', premium: 99, cover: 15000 },
    pr2: { name: 'Family Plan', premium: 199, cover: 25000 },
    pr3: { name: 'Premium Family Plan', premium: 350, cover: 50000 },
  };

  const demoLeads: any[] = [];
  const demoMembers: any[] = [];
  const demoPolicies: any[] = [];
  const demoPayments: any[] = [];
  const demoBillingEvents: any[] = [];
  const demoTemplates: any[] = [];
  const demoCommunications: any[] = [];
  const demoDocuments: any[] = [];
  const demoFuneralCases: any[] = [];
  const demoReconciliationImports: any[] = [];
  const demoAuditEntries: any[] = [];

  demoTemplates.push(
    {
      id: 'tpl_demo_1', parlourId: 'p1', name: 'Policy Lapsed Warning', type: 'sms', trigger: 'policy_lapsed',
      body: 'Dear {member_name}, your policy is currently lapsed due to missed premiums.', isActive: true,
      createdOn: monthDay(monthStarts[0], 5), lastUpdated: monthDay(monthStarts[5], 8),
    },
    {
      id: 'tpl_demo_2', parlourId: 'p1', name: 'Collections Follow-up', type: 'email', trigger: 'payment_reminder',
      subject: 'Premium follow-up',
      body: 'Please settle outstanding premiums to keep your policy active.', isActive: true,
      createdOn: monthDay(monthStarts[1], 9), lastUpdated: monthDay(monthStarts[5], 9),
    }
  );

  for (let monthIndex = 0; monthIndex < monthStarts.length; monthIndex += 1) {
    const monthStart = monthStarts[monthIndex];
    let firstPolicyIdForMonth = '';
    let firstPolicyNumberForMonth = '';
    let firstMemberIdForMonth = '';

    for (let memberIndex = 0; memberIndex < 6; memberIndex += 1) {
      const memberId = `mdemo_${monthIndex}_${memberIndex}`;
      const firstName = firstNames[(monthIndex * 3 + memberIndex) % firstNames.length];
      const lastName = lastNames[(monthIndex * 5 + memberIndex) % lastNames.length];
      const joinDate = monthDay(monthStart, 3 + memberIndex * 2);
      const branchId = branchCycle[(monthIndex + memberIndex) % branchCycle.length];
      const dependantCount = memberIndex % 4;

      const dependants = Array.from({ length: dependantCount }, (_, dependantIndex) => ({
        id: `ddemo_${monthIndex}_${memberIndex}_${dependantIndex}`,
        firstName: firstNames[(monthIndex + dependantIndex + 2) % firstNames.length],
        lastName,
        idNumber: `7001015800${String(monthIndex * 100 + memberIndex * 10 + dependantIndex).padStart(3, '0')}`,
        relationship: dependantIndex === 0 ? 'Spouse' : 'Child',
        dateOfBirth: monthDay(addMonths(monthStart, -(20 + dependantIndex)), 10 + dependantIndex),
      }));

      const beneficiaries = [
        {
          id: `bndemo_${monthIndex}_${memberIndex}_0`,
          firstName,
          lastName,
          idNumber: `8001015800${String(monthIndex * 10 + memberIndex).padStart(3, '0')}`,
          relationship: 'Spouse',
          percentage: 100,
        },
      ];

      const memberStatus = monthIndex === 0 && memberIndex === 0
        ? 'inactive'
        : (monthIndex >= 4 && memberIndex === 4 ? 'suspended' : 'active');

      demoMembers.push({
        id: memberId,
        parlourId: 'p1',
        branchId,
        firstName,
        lastName,
        idNumber: `9001015800${String(monthIndex * 10 + memberIndex).padStart(3, '0')}`,
        phone: `07${String(10000000 + monthIndex * 100 + memberIndex).slice(-8)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${monthIndex}${memberIndex}@demo.co.za`,
        address: `${10 + memberIndex} Demo Street`,
        city: branchId === 'b2' ? 'Pretoria' : branchId === 'b3' ? 'Johannesburg' : 'Soweto',
        province: 'Gauteng',
        joinDate,
        status: memberStatus,
        dependants,
        beneficiaries,
      });

      const productId = dependantCount === 0 && memberIndex % 2 === 0 ? 'pr1' : (memberIndex % 3 === 0 ? 'pr3' : 'pr2');
      const product = productCatalog[productId as keyof typeof productCatalog];
      const policyId = `poldemo_${monthIndex}_${memberIndex}`;
      const policyNumber = `UBT-DEM-${monthIndex}${memberIndex}`;

      const policyStatus = monthIndex <= 1 && memberIndex === 5
        ? 'lapsed'
        : (monthIndex >= 3 && memberIndex === 4 ? 'suspended' : (monthIndex === 5 && memberIndex === 0 ? 'pending' : 'active'));

      const arrearsAmount = policyStatus === 'suspended' || policyStatus === 'lapsed'
        ? product.premium * 2
        : (policyStatus === 'pending' ? product.premium : 0);

      demoPolicies.push({
        id: policyId,
        policyNumber,
        memberId,
        parlourId: 'p1',
        productId,
        productName: product.name,
        status: policyStatus,
        premiumAmount: product.premium,
        billingFrequency: 'monthly',
        nextDueDate: monthDay(addMonths(startOfCurrentMonth, 1), 1),
        startDate: joinDate,
        coverAmount: product.cover,
        arrearsAmount,
        lastPaymentDate: policyStatus === 'pending' ? undefined : monthDay(addMonths(startOfCurrentMonth, -1), 2 + memberIndex),
      });

      if (!firstPolicyIdForMonth) {
        firstPolicyIdForMonth = policyId;
        firstPolicyNumberForMonth = policyNumber;
        firstMemberIdForMonth = memberId;
      }

      for (let paymentMonthIndex = monthIndex; paymentMonthIndex < monthStarts.length; paymentMonthIndex += 1) {
        const paymentDate = monthDay(monthStarts[paymentMonthIndex], 2 + memberIndex);
        const latestMonth = paymentMonthIndex === monthStarts.length - 1;
        const isFailed = (policyStatus === 'suspended' || policyStatus === 'lapsed') && latestMonth;
        const isPending = policyStatus === 'pending' && latestMonth;
        const paymentStatus = isFailed ? 'failed' : (isPending ? 'pending' : 'successful');
        const paymentId = `paydemo_${monthIndex}_${memberIndex}_${paymentMonthIndex}`;

        demoPayments.push({
          id: paymentId,
          policyId,
          policyNumber,
          memberId,
          memberName: `${firstName} ${lastName}`,
          amount: product.premium,
          date: paymentDate,
          method: memberIndex % 3 === 0 ? 'eft' : 'debit_order',
          status: paymentStatus,
          reference: `DEMO-${monthIndex}${memberIndex}${paymentMonthIndex}-${memberIndex}`,
          parlourId: 'p1',
        });

        demoBillingEvents.push({
          id: `bedemo_${monthIndex}_${memberIndex}_${paymentMonthIndex}`,
          parlourId: 'p1',
          policyId,
          policyNumber,
          dueDate: monthDay(monthStarts[paymentMonthIndex], 1),
          amount: product.premium,
          status: paymentStatus === 'successful' ? 'paid' : paymentStatus,
        });

        demoCommunications.push({
          id: `cdemo_${monthIndex}_${memberIndex}_${paymentMonthIndex}`,
          parlourId: 'p1',
          type: memberIndex % 2 === 0 ? 'sms' : 'email',
          recipientName: `${firstName} ${lastName}`,
          recipientContact: memberIndex % 2 === 0 ? `07${String(20000000 + memberIndex).slice(-8)}` : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.co.za`,
          subject: memberIndex % 2 === 0 ? undefined : 'Premium update',
          template: paymentStatus === 'successful' ? 'Payment Receipt' : 'Payment Reminder',
          status: paymentStatus === 'failed' ? 'failed' : 'delivered',
          sentAt: toTimestamp(paymentDate, 9 + (memberIndex % 5), 10),
        });
      }
    }

    for (let leadIndex = 0; leadIndex < 3; leadIndex += 1) {
      const leadId = `ldemo_${monthIndex}_${leadIndex}`;
      const leadFirstName = firstNames[(monthIndex + leadIndex + 4) % firstNames.length];
      const leadLastName = lastNames[(monthIndex + leadIndex + 1) % lastNames.length];
      const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];

      demoLeads.push({
        id: leadId,
        parlourId: 'p1',
        branchId: branchCycle[(monthIndex + leadIndex) % branchCycle.length],
        firstName: leadFirstName,
        lastName: leadLastName,
        phone: `08${String(30000000 + monthIndex * 100 + leadIndex).slice(-8)}`,
        email: leadIndex % 2 === 0 ? `${leadFirstName.toLowerCase()}.${leadLastName.toLowerCase()}@mail.com` : undefined,
        source: leadIndex % 2 === 0 ? 'website' : 'agent',
        status: statuses[(monthIndex + leadIndex) % statuses.length],
        assignedTo: leadIndex === 0 ? 'Lindiwe Sithole' : undefined,
        createdOn: monthDay(monthStart, 4 + leadIndex * 6),
      });
    }

    demoReconciliationImports.push({
      id: `recdemo_${monthIndex}`,
      parlourId: 'p1',
      fileName: `Recon_${toDateText(monthStart)}.csv`,
      importedBy: 'Mpho Tau',
      importedAt: monthDay(monthStart, 22),
      matched: 80 + monthIndex * 7,
      exceptions: 1 + (monthIndex % 4),
      status: 'completed',
    });

    demoAuditEntries.push(
      {
        id: `ademo_${monthIndex}_0`,
        timestamp: toTimestamp(monthDay(monthStart, 10), 11, 24),
        userId: 'u5',
        userName: 'Lindiwe Sithole',
        userRole: 'policy_admin',
        action: 'POLICY_UPDATED',
        entityType: 'Policy',
        entityId: firstPolicyIdForMonth || `poldemo_${monthIndex}_0`,
        entityLabel: firstPolicyNumberForMonth || `UBT-DEM-${monthIndex}0`,
        parlourId: 'p1',
        details: 'Demo status adjustment and arrears review',
      },
      {
        id: `ademo_${monthIndex}_1`,
        timestamp: toTimestamp(monthDay(monthStart, 21), 14, 5),
        userId: 'u6',
        userName: 'Mpho Tau',
        userRole: 'collections_clerk',
        action: 'RECON_FILE_IMPORTED',
        entityType: 'Reconciliation',
        entityId: `recdemo_${monthIndex}`,
        entityLabel: `Recon_${toDateText(monthStart)}.csv`,
        parlourId: 'p1',
        details: 'Demo monthly reconciliation import completed',
      }
    );

    demoFuneralCases.push({
      id: `fcdemo_${monthIndex}`,
      caseNumber: `FC-DEMO-${monthIndex + 1}`,
      parlourId: 'p1',
      branchId: branchCycle[monthIndex % branchCycle.length],
      deceasedName: `${firstNames[(monthIndex + 1) % firstNames.length]} ${lastNames[(monthIndex + 2) % lastNames.length]}`,
      deceasedIdNumber: `5001015800${String(500 + monthIndex).padStart(3, '0')}`,
      dateOfDeath: monthDay(monthStart, 18),
      policyId: firstPolicyIdForMonth || undefined,
      policyNumber: firstPolicyNumberForMonth || undefined,
      memberId: firstMemberIdForMonth || undefined,
      coordinatorId: 'u7',
      coordinatorName: 'Sibongile Mthembu',
      status: monthIndex >= 4 ? 'in_progress' : 'completed',
      funeralDate: monthDay(addMonths(monthStart, 0), 24),
      venue: monthIndex % 2 === 0 ? 'Avalon Cemetery, Soweto' : 'Westpark Cemetery, Johannesburg',
      caseType: 'policy',
      tasks: [
        { id: `fctask_${monthIndex}_1`, title: 'Collect death certificate', completed: true },
        { id: `fctask_${monthIndex}_2`, title: 'Finalize transport', completed: monthIndex <= 4 },
        { id: `fctask_${monthIndex}_3`, title: 'Family coordination call', completed: monthIndex <= 3 },
      ],
      notes: ['Generated six-month demo case'],
      createdOn: monthDay(monthStart, 18),
    });

    demoDocuments.push({
      id: `docdemo_pol_${monthIndex}`,
      name: `Policy_${firstPolicyNumberForMonth || `UBT-DEM-${monthIndex}0`}.pdf`,
      type: 'policy_document',
      entityType: 'policy',
      entityId: firstPolicyIdForMonth || `poldemo_${monthIndex}_0`,
      parlourId: 'p1',
      uploadedBy: 'Lindiwe Sithole',
      uploadedAt: monthDay(monthStart, 12),
      size: `${280 + monthIndex * 5} KB`,
    });
  }

  for (const parlour of baseParlours) {
    await prisma.parlour.upsert({
      where: { id: parlour.id },
      update: parlour,
      create: parlour,
    });
  }

  for (const branch of baseBranches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: branch,
      create: branch,
    });
  }

  for (const user of baseUsers) {
    await prisma.appUser.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  for (const subscription of baseSubscriptions) {
    await prisma.parlourSubscription.upsert({
      where: { id: subscription.id },
      update: subscription,
      create: subscription,
    });
  }

  for (const product of baseProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  for (const lead of baseLeads) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: lead,
      create: lead,
    });
  }

  for (const lead of demoLeads) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: lead,
      create: lead,
    });
  }

  for (const member of baseMembers) {
    await prisma.member.upsert({
      where: { id: member.id },
      update: member,
      create: member,
    });
  }

  for (const member of demoMembers) {
    await prisma.member.upsert({
      where: { id: member.id },
      update: member,
      create: member,
    });
  }

  for (const policy of basePolicies) {
    await prisma.policy.upsert({
      where: { id: policy.id },
      update: policy,
      create: policy,
    });
  }

  for (const policy of demoPolicies) {
    await prisma.policy.upsert({
      where: { id: policy.id },
      update: policy,
      create: policy,
    });
  }

  for (const payment of basePayments) {
    await prisma.paymentTransaction.upsert({
      where: { id: payment.id },
      update: payment,
      create: payment,
    });
  }

  for (const payment of demoPayments) {
    await prisma.paymentTransaction.upsert({
      where: { id: payment.id },
      update: payment,
      create: payment,
    });
  }

  for (const billingEvent of demoBillingEvents) {
    await prisma.billingEvent.upsert({
      where: { id: billingEvent.id },
      update: billingEvent,
      create: billingEvent,
    });
  }

  for (const template of baseTemplates) {
    await prisma.communicationTemplate.upsert({
      where: { id: template.id },
      update: template,
      create: template,
    });
  }

  for (const template of demoTemplates) {
    await prisma.communicationTemplate.upsert({
      where: { id: template.id },
      update: template,
      create: template,
    });
  }

  for (const communication of baseCommunications) {
    await prisma.communicationLog.upsert({
      where: { id: communication.id },
      update: communication,
      create: communication,
    });
  }

  for (const communication of demoCommunications) {
    await prisma.communicationLog.upsert({
      where: { id: communication.id },
      update: communication,
      create: communication,
    });
  }

  for (const document of baseDocuments) {
    await prisma.documentRecord.upsert({
      where: { id: document.id },
      update: document,
      create: document,
    });
  }

  for (const document of demoDocuments) {
    await prisma.documentRecord.upsert({
      where: { id: document.id },
      update: document,
      create: document,
    });
  }

  for (const funeralCase of baseFuneralCases) {
    await prisma.funeralCase.upsert({
      where: { id: funeralCase.id },
      update: funeralCase,
      create: funeralCase,
    });
  }

  for (const funeralCase of demoFuneralCases) {
    await prisma.funeralCase.upsert({
      where: { id: funeralCase.id },
      update: funeralCase,
      create: funeralCase,
    });
  }

  for (const item of baseReconciliationImports) {
    await prisma.reconciliationImport.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  for (const item of demoReconciliationImports) {
    await prisma.reconciliationImport.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  for (const item of baseAuditEntries) {
    await prisma.auditEntry.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  for (const item of demoAuditEntries) {
    await prisma.auditEntry.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  for (const resource of baseResources) {
    await prisma.resourceAsset.upsert({
      where: { id: resource.id },
      update: resource,
      create: resource,
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
