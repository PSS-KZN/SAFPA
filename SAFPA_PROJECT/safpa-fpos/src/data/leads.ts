import type { Lead } from '../types';

export const leads: Lead[] = [
  { id: 'l1', parlourId: 'p1', branchId: 'b1', firstName: 'David', lastName: 'Moloi', phone: '079 111 2222', email: 'david.m@gmail.com', source: 'website', status: 'new', createdAt: '2026-04-18' },
  { id: 'l2', parlourId: 'p1', branchId: 'b1', firstName: 'Patricia', lastName: 'Mabaso', phone: '082 333 4444', source: 'agent', status: 'contacted', assignedTo: 'Lindiwe Sithole', createdAt: '2026-04-15' },
  { id: 'l3', parlourId: 'p1', branchId: 'b2', firstName: 'James', lastName: 'Pretorius', phone: '071 555 6666', email: 'james.p@outlook.com', source: 'website', status: 'qualified', assignedTo: 'Naledi Dlamini', createdAt: '2026-04-12' },
  { id: 'l4', parlourId: 'p1', branchId: 'b3', firstName: 'Amina', lastName: 'Patel', phone: '083 777 8888', email: 'amina.p@yahoo.com', source: 'referral', status: 'converted', assignedTo: 'Sipho Nkosi', notes: 'Referred by existing member Fatima Essop', createdAt: '2026-04-01' },
  { id: 'l5', parlourId: 'p1', branchId: 'b1', firstName: 'Thabiso', lastName: 'Mashaba', phone: '060 999 0000', source: 'branch', status: 'new', createdAt: '2026-04-19' },
  { id: 'l6', parlourId: 'p2', branchId: 'b4', firstName: 'Nokuthula', lastName: 'Shabalala', phone: '073 222 3333', email: 'nokuthula.s@gmail.com', source: 'website', status: 'new', createdAt: '2026-04-17' },
  { id: 'l7', parlourId: 'p2', branchId: 'b4', firstName: 'Rajesh', lastName: 'Naidoo', phone: '084 444 5555', source: 'agent', status: 'contacted', assignedTo: 'Zanele Mkhize', createdAt: '2026-04-14' },
  { id: 'l8', parlourId: 'p2', branchId: 'b5', firstName: 'Busisiwe', lastName: 'Mbatha', phone: '076 666 7777', source: 'referral', status: 'qualified', assignedTo: 'Mandla Zulu', createdAt: '2026-04-10' },
  { id: 'l9', parlourId: 'p3', branchId: 'b6', firstName: 'Mziwoxolo', lastName: 'Ntloko', phone: '065 888 9999', source: 'branch', status: 'new', createdAt: '2026-04-16' },
  { id: 'l10', parlourId: 'p3', branchId: 'b7', firstName: 'Unathi', lastName: 'Mfeka', phone: '078 000 1111', email: 'unathi.m@gmail.com', source: 'website', status: 'contacted', assignedTo: 'Andile Gcaba', createdAt: '2026-04-13' },
  { id: 'l11', parlourId: 'p1', branchId: 'b1', firstName: 'Kgomotso', lastName: 'Phiri', phone: '072 112 2334', source: 'agent', status: 'lost', assignedTo: 'Lindiwe Sithole', notes: 'Not interested at this time', createdAt: '2026-03-25' },
  { id: 'l12', parlourId: 'p1', branchId: 'b2', firstName: 'Willem', lastName: 'Joubert', phone: '082 445 5667', email: 'wjoubert@mweb.co.za', source: 'website', status: 'new', createdAt: '2026-04-20' },
];
