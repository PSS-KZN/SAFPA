import type { Communication } from '../types';

export const communications: Communication[] = [
  { id: 'c1', type: 'sms', recipientName: 'Sibusiso Mahlangu', recipientContact: '072 345 6789', template: 'Payment Reminder', status: 'delivered', sentAt: '2026-04-01 08:00', parlourId: 'p1' },
  { id: 'c2', type: 'sms', recipientName: 'Ntombi Radebe', recipientContact: '083 456 7890', template: 'Payment Reminder', status: 'delivered', sentAt: '2026-04-01 08:00', parlourId: 'p1' },
  { id: 'c3', type: 'email', recipientName: 'Johannes van der Merwe', recipientContact: 'johannes.vdm@outlook.com', subject: 'Payment Receipt - April 2026', template: 'Payment Receipt', status: 'delivered', sentAt: '2026-04-01 10:30', parlourId: 'p1' },
  { id: 'c4', type: 'sms', recipientName: 'Precious Mkhwanazi', recipientContact: '060 789 0123', template: 'Payment Failed Notice', status: 'delivered', sentAt: '2026-04-02 09:00', parlourId: 'p1' },
  { id: 'c5', type: 'email', recipientName: 'Precious Mkhwanazi', recipientContact: 'precious.m@icloud.com', subject: 'Policy Suspension Warning', template: 'Policy Suspension Warning', status: 'delivered', sentAt: '2026-04-05 14:00', parlourId: 'p1' },
  { id: 'c6', type: 'sms', recipientName: 'Sibusiso Mahlangu', recipientContact: '072 345 6789', template: 'Funeral Case Update', status: 'delivered', sentAt: '2026-04-10 16:00', parlourId: 'p1' },
  { id: 'c7', type: 'sms', recipientName: 'Nkosinathi Buthelezi', recipientContact: '073 890 1234', template: 'Payment Reminder', status: 'delivered', sentAt: '2026-04-01 08:00', parlourId: 'p2' },
  { id: 'c8', type: 'email', recipientName: 'Thulisile Dlamini', recipientContact: 'thulisile.d@gmail.com', subject: 'Welcome to Dignity Memorial', template: 'Welcome Message', status: 'delivered', sentAt: '2026-03-01 09:00', parlourId: 'p2' },
  { id: 'c9', type: 'sms', recipientName: 'Vuyani Maqungo', recipientContact: '065 123 4567', template: 'Payment Receipt', status: 'sent', sentAt: '2026-04-01 11:00', parlourId: 'p3' },
  { id: 'c10', type: 'sms', recipientName: 'Nomfundo Jafta', recipientContact: '078 234 5678', template: 'Payment Failed Notice', status: 'failed', sentAt: '2026-04-02 09:00', parlourId: 'p3' },
];
