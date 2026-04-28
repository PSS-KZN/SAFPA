import type { Member } from '../types';

export const members: Member[] = [
  {
    id: 'm1', parlourId: 'p1', branchId: 'b1', firstName: 'Sibusiso', lastName: 'Mahlangu',
    idNumber: '8501015800089', phone: '072 345 6789', email: 'sibusiso.m@gmail.com',
    address: '12 Khumalo St', city: 'Soweto', province: 'Gauteng', joinDate: '2025-12-01', status: 'active',
    dependants: [
      { id: 'd1', firstName: 'Grace', lastName: 'Mahlangu', idNumber: '8803025800081', relationship: 'Spouse', dateOfBirth: '1988-03-02' },
      { id: 'd2', firstName: 'Lebo', lastName: 'Mahlangu', idNumber: '1501015800082', relationship: 'Child', dateOfBirth: '2015-01-01' },
    ],
    beneficiaries: [{ id: 'bn1', firstName: 'Grace', lastName: 'Mahlangu', idNumber: '8803025800081', relationship: 'Spouse', percentage: 100 }],
  },
  {
    id: 'm2', parlourId: 'p1', branchId: 'b1', firstName: 'Ntombi', lastName: 'Radebe',
    idNumber: '9002145800083', phone: '083 456 7890', email: 'ntombi.r@yahoo.com',
    address: '34 Mandela Dr', city: 'Soweto', province: 'Gauteng', joinDate: '2025-12-15', status: 'active',
    dependants: [
      { id: 'd3', firstName: 'Themba', lastName: 'Radebe', idNumber: '8805125800084', relationship: 'Spouse', dateOfBirth: '1988-05-12' },
    ],
    beneficiaries: [{ id: 'bn2', firstName: 'Themba', lastName: 'Radebe', idNumber: '8805125800084', relationship: 'Spouse', percentage: 100 }],
  },
  {
    id: 'm3', parlourId: 'p1', branchId: 'b2', firstName: 'Johannes', lastName: 'van der Merwe',
    idNumber: '7506085800085', phone: '082 567 8901', email: 'johannes.vdm@outlook.com',
    address: '56 Lynnwood Rd', city: 'Pretoria', province: 'Gauteng', joinDate: '2026-01-05', status: 'active',
    dependants: [
      { id: 'd4', firstName: 'Maria', lastName: 'van der Merwe', idNumber: '7808155800086', relationship: 'Spouse', dateOfBirth: '1978-08-15' },
      { id: 'd5', firstName: 'Pieter', lastName: 'van der Merwe', idNumber: '0501015800087', relationship: 'Child', dateOfBirth: '2005-01-01' },
      { id: 'd6', firstName: 'Annelie', lastName: 'van der Merwe', idNumber: '0801015800088', relationship: 'Child', dateOfBirth: '2008-01-01' },
    ],
    beneficiaries: [{ id: 'bn3', firstName: 'Maria', lastName: 'van der Merwe', idNumber: '7808155800086', relationship: 'Spouse', percentage: 100 }],
  },
  {
    id: 'm4', parlourId: 'p1', branchId: 'b3', firstName: 'Fatima', lastName: 'Essop',
    idNumber: '8210225800089', phone: '071 678 9012', email: 'fatima.e@gmail.com',
    address: '78 Market St', city: 'Johannesburg', province: 'Gauteng', joinDate: '2026-01-20', status: 'active',
    dependants: [],
    beneficiaries: [{ id: 'bn4', firstName: 'Ahmed', lastName: 'Essop', idNumber: '8005015800090', relationship: 'Spouse', percentage: 100 }],
  },
  {
    id: 'm5', parlourId: 'p1', branchId: 'b1', firstName: 'Precious', lastName: 'Mkhwanazi',
    idNumber: '9505015800091', phone: '060 789 0123', email: 'precious.m@icloud.com',
    address: '90 Vilakazi St', city: 'Soweto', province: 'Gauteng', joinDate: '2026-02-01', status: 'suspended',
    dependants: [
      { id: 'd7', firstName: 'Nhlanhla', lastName: 'Mkhwanazi', idNumber: '1801015800092', relationship: 'Child', dateOfBirth: '2018-01-01' },
    ],
    beneficiaries: [{ id: 'bn5', firstName: 'Zodwa', lastName: 'Mkhwanazi', idNumber: '7001015800093', relationship: 'Mother', percentage: 100 }],
  },
  {
    id: 'm6', parlourId: 'p2', branchId: 'b4', firstName: 'Nkosinathi', lastName: 'Buthelezi',
    idNumber: '8801015800094', phone: '073 890 1234', email: 'nkosinathi.b@gmail.com',
    address: '11 Point Rd', city: 'Durban', province: 'KwaZulu-Natal', joinDate: '2026-01-15', status: 'active',
    dependants: [
      { id: 'd8', firstName: 'Nomcebo', lastName: 'Buthelezi', idNumber: '9001015800095', relationship: 'Spouse', dateOfBirth: '1990-01-01' },
    ],
    beneficiaries: [{ id: 'bn6', firstName: 'Nomcebo', lastName: 'Buthelezi', idNumber: '9001015800095', relationship: 'Spouse', percentage: 100 }],
  },
  {
    id: 'm7', parlourId: 'p2', branchId: 'b4', firstName: 'Lungile', lastName: 'Ngcobo',
    idNumber: '7703025800096', phone: '084 901 2345', email: 'lungile.n@yahoo.com',
    address: '22 West St', city: 'Durban', province: 'KwaZulu-Natal', joinDate: '2026-02-10', status: 'active',
    dependants: [],
    beneficiaries: [{ id: 'bn7', firstName: 'Senzo', lastName: 'Ngcobo', idNumber: '8001015800097', relationship: 'Brother', percentage: 100 }],
  },
  {
    id: 'm8', parlourId: 'p2', branchId: 'b5', firstName: 'Thulisile', lastName: 'Dlamini',
    idNumber: '8506015800098', phone: '076 012 3456', email: 'thulisile.d@gmail.com',
    address: '33 Berg St', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', joinDate: '2026-03-01', status: 'active',
    dependants: [
      { id: 'd9', firstName: 'Bheki', lastName: 'Dlamini', idNumber: '8301015800099', relationship: 'Spouse', dateOfBirth: '1983-01-01' },
      { id: 'd10', firstName: 'Siphokazi', lastName: 'Dlamini', idNumber: '1201015800100', relationship: 'Child', dateOfBirth: '2012-01-01' },
    ],
    beneficiaries: [{ id: 'bn8', firstName: 'Bheki', lastName: 'Dlamini', idNumber: '8301015800099', relationship: 'Spouse', percentage: 100 }],
  },
  {
    id: 'm9', parlourId: 'p3', branchId: 'b6', firstName: 'Vuyani', lastName: 'Maqungo',
    idNumber: '9201015800101', phone: '065 123 4567', email: 'vuyani.m@gmail.com',
    address: '44 Govan Mbeki Ave', city: 'Gqeberha', province: 'Eastern Cape', joinDate: '2026-03-10', status: 'active',
    dependants: [],
    beneficiaries: [{ id: 'bn9', firstName: 'Nosipho', lastName: 'Maqungo', idNumber: '9301015800102', relationship: 'Sister', percentage: 100 }],
  },
  {
    id: 'm10', parlourId: 'p3', branchId: 'b7', firstName: 'Nomfundo', lastName: 'Jafta',
    idNumber: '8004015800103', phone: '078 234 5678', email: 'nomfundo.j@outlook.com',
    address: '55 Fleet St', city: 'East London', province: 'Eastern Cape', joinDate: '2026-03-15', status: 'inactive',
    dependants: [
      { id: 'd11', firstName: 'Lwazi', lastName: 'Jafta', idNumber: '1001015800104', relationship: 'Child', dateOfBirth: '2010-01-01' },
    ],
    beneficiaries: [{ id: 'bn10', firstName: 'Lwazi', lastName: 'Jafta', idNumber: '1001015800104', relationship: 'Child', percentage: 100 }],
  },
];
