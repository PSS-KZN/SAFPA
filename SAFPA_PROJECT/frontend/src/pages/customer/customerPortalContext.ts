import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Communication, Member, Parlour, PaymentTransaction, Policy } from '../../types';

export type ProfileFormState = {
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
};

export type PaymentFormState = {
  policyId: string;
  amount: number;
  method: PaymentTransaction['method'];
  date: string;
};

export type CustomerPortalContextValue = {
  member: Member;
  parlour: Parlour;
  policies: Policy[];
  payments: PaymentTransaction[];
  communications: Communication[];
  activePolicy: Policy | null;
  profileForm: ProfileFormState;
  paymentForm: PaymentFormState;
  savingProfile: boolean;
  paying: boolean;
  error: string | null;
  notice: string | null;
  setPaymentForm: Dispatch<SetStateAction<PaymentFormState>>;
  updateProfileField: <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => void;
  saveProfile: () => Promise<void>;
  payNow: () => Promise<void>;
};

export function useCustomerPortal() {
  return useOutletContext<CustomerPortalContextValue>();
}