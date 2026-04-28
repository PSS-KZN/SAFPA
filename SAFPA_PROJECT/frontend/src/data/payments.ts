import type { PaymentTransaction } from '../types';

export const payments: PaymentTransaction[] = [
  { id: 'pay1', policyId: 'pol1', policyNumber: 'UBT-2025-0001', memberId: 'm1', memberName: 'Sibusiso Mahlangu', amount: 250, date: '2026-04-01', method: 'debit_order', status: 'successful', reference: 'DO-20260401-001', parlourId: 'p1' },
  { id: 'pay2', policyId: 'pol2', policyNumber: 'UBT-2025-0002', memberId: 'm2', memberName: 'Ntombi Radebe', amount: 120, date: '2026-04-01', method: 'debit_order', status: 'successful', reference: 'DO-20260401-002', parlourId: 'p1' },
  { id: 'pay3', policyId: 'pol3', policyNumber: 'UBT-2026-0003', memberId: 'm3', memberName: 'Johannes van der Merwe', amount: 450, date: '2026-04-01', method: 'eft', status: 'successful', reference: 'EFT-20260401-001', parlourId: 'p1' },
  { id: 'pay4', policyId: 'pol4', policyNumber: 'UBT-2026-0004', memberId: 'm4', memberName: 'Fatima Essop', amount: 99, date: '2026-04-01', method: 'card', status: 'successful', reference: 'CRD-20260401-001', parlourId: 'p1' },
  { id: 'pay5', policyId: 'pol5', policyNumber: 'UBT-2026-0005', memberId: 'm5', memberName: 'Precious Mkhwanazi', amount: 199, date: '2026-03-01', method: 'debit_order', status: 'failed', reference: 'DO-20260301-005', parlourId: 'p1' },
  { id: 'pay6', policyId: 'pol5', policyNumber: 'UBT-2026-0005', memberId: 'm5', memberName: 'Precious Mkhwanazi', amount: 199, date: '2026-04-01', method: 'debit_order', status: 'failed', reference: 'DO-20260401-005', parlourId: 'p1' },
  { id: 'pay7', policyId: 'pol6', policyNumber: 'DIG-2026-0001', memberId: 'm6', memberName: 'Nkosinathi Buthelezi', amount: 200, date: '2026-04-01', method: 'debit_order', status: 'successful', reference: 'DO-20260401-006', parlourId: 'p2' },
  { id: 'pay8', policyId: 'pol7', policyNumber: 'DIG-2026-0002', memberId: 'm7', memberName: 'Lungile Ngcobo', amount: 89, date: '2026-04-01', method: 'cash', status: 'successful', reference: 'CSH-20260401-001', parlourId: 'p2' },
  { id: 'pay9', policyId: 'pol8', policyNumber: 'DIG-2026-0003', memberId: 'm8', memberName: 'Thulisile Dlamini', amount: 180, date: '2026-04-01', method: 'debit_order', status: 'pending', reference: 'DO-20260401-007', parlourId: 'p2' },
  { id: 'pay10', policyId: 'pol9', policyNumber: 'PHK-2026-0001', memberId: 'm9', memberName: 'Vuyani Maqungo', amount: 65, date: '2026-04-01', method: 'cash', status: 'successful', reference: 'CSH-20260401-002', parlourId: 'p3' },
  { id: 'pay11', policyId: 'pol10', policyNumber: 'PHK-2026-0002', memberId: 'm10', memberName: 'Nomfundo Jafta', amount: 50, date: '2026-03-15', method: 'debit_order', status: 'failed', reference: 'DO-20260315-001', parlourId: 'p3' },
  { id: 'pay12', policyId: 'pol1', policyNumber: 'UBT-2025-0001', memberId: 'm1', memberName: 'Sibusiso Mahlangu', amount: 250, date: '2026-03-01', method: 'debit_order', status: 'successful', reference: 'DO-20260301-001', parlourId: 'p1' },
  { id: 'pay13', policyId: 'pol2', policyNumber: 'UBT-2025-0002', memberId: 'm2', memberName: 'Ntombi Radebe', amount: 120, date: '2026-03-01', method: 'debit_order', status: 'successful', reference: 'DO-20260301-002', parlourId: 'p1' },
  { id: 'pay14', policyId: 'pol3', policyNumber: 'UBT-2026-0003', memberId: 'm3', memberName: 'Johannes van der Merwe', amount: 450, date: '2026-03-01', method: 'eft', status: 'successful', reference: 'EFT-20260301-001', parlourId: 'p1' },
  { id: 'pay15', policyId: 'pol1', policyNumber: 'UBT-2025-0001', memberId: 'm1', memberName: 'Sibusiso Mahlangu', amount: 250, date: '2026-02-01', method: 'debit_order', status: 'successful', reference: 'DO-20260201-001', parlourId: 'p1' },
];
