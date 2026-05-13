import type { PaymentTransaction } from '../types';
import { jsonRequest, request } from './http';

export interface ReconciliationImportRecord {
  id: string;
  parlourId: string;
  fileName: string;
  importedBy: string;
  importedAt: string;
  matched: number;
  exceptions: number;
  status: 'completed' | 'processing' | 'failed';
}

export interface PaymentProvider {
  code: string;
  name: string;
  mode: 'static' | 'manual';
  status: 'configured';
  methods: Array<'debit_order' | 'eft' | 'card' | 'cash'>;
  notes: string;
}

export function fetchPayments(parlourId: string): Promise<PaymentTransaction[]> {
  return request<PaymentTransaction[]>(`/api/payments?parlourId=${encodeURIComponent(parlourId)}`);
}

export function fetchPaymentProviders(): Promise<{ providers: PaymentProvider[] }> {
  return request<{ providers: PaymentProvider[] }>('/api/payments/providers');
}

export function createPayment(input: {
  policyId: string;
  amount: number;
  date: string;
  method: PaymentTransaction['method'];
  status?: PaymentTransaction['status'];
  reference?: string;
}): Promise<PaymentTransaction> {
  return request<PaymentTransaction>('/api/payments', jsonRequest(input, { method: 'POST' }));
}

export function fetchReconciliationImports(parlourId: string): Promise<ReconciliationImportRecord[]> {
  return request<ReconciliationImportRecord[]>(`/api/payments/reconciliation-imports?parlourId=${encodeURIComponent(parlourId)}`);
}

export function createReconciliationImport(input: {
  parlourId: string;
  fileName: string;
  importedBy: string;
  matched: number;
  exceptions: number;
  status?: 'completed' | 'processing' | 'failed';
  details?: string[];
}): Promise<ReconciliationImportRecord> {
  return request<ReconciliationImportRecord>('/api/payments/reconciliation-imports', jsonRequest(input, { method: 'POST' }));
}

export function generateBillingEvents(parlourId: string, dueDate: string): Promise<{ created: number }> {
  return request<{ created: number }>('/api/payments/billing-events/generate', jsonRequest({ parlourId, dueDate }, { method: 'POST' }));
}
