import type {
  Document,
  FuneralCase,
  Lead,
  Member,
  PaymentTransaction,
  Policy,
  User,
} from '../types';
import { funeralCases } from '../data/funeralCases';
import { members } from '../data/members';
import { policies } from '../data/policies';

const DEFAULT_PARLOUR_ID = 'p1';

const memberById = new Map(members.map((member) => [member.id, member]));
const policyById = new Map(policies.map((policy) => [policy.id, policy]));
const funeralCaseById = new Map(funeralCases.map((funeralCase) => [funeralCase.id, funeralCase]));

export function getUserParlourId(user: User): string {
  return user.parlourId || DEFAULT_PARLOUR_ID;
}

export function isBranchManager(user: User): boolean {
  return user.role === 'branch_manager';
}

export function isRoleAllowed(user: User, allowedRoles: User['role'][]): boolean {
  return allowedRoles.includes(user.role);
}

export function canAccessLead(user: User, lead: Lead): boolean {
  if (lead.parlourId !== getUserParlourId(user)) {
    return false;
  }

  if (isBranchManager(user)) {
    return Boolean(user.branchId && lead.branchId === user.branchId);
  }

  return true;
}

export function canAccessMember(user: User, member: Member): boolean {
  if (member.parlourId !== getUserParlourId(user)) {
    return false;
  }

  if (isBranchManager(user)) {
    return Boolean(user.branchId && member.branchId === user.branchId);
  }

  return true;
}

export function canAccessPolicy(user: User, policy: Policy): boolean {
  if (policy.parlourId !== getUserParlourId(user)) {
    return false;
  }

  if (isBranchManager(user)) {
    const member = memberById.get(policy.memberId);
    return Boolean(user.branchId && member?.branchId === user.branchId);
  }

  return true;
}

export function canAccessFuneralCase(user: User, funeralCase: FuneralCase): boolean {
  if (funeralCase.parlourId !== getUserParlourId(user)) {
    return false;
  }

  if (isBranchManager(user)) {
    return Boolean(user.branchId && funeralCase.branchId === user.branchId);
  }

  return true;
}

export function canAccessPayment(user: User, payment: PaymentTransaction): boolean {
  if (payment.parlourId !== getUserParlourId(user)) {
    return false;
  }

  if (isBranchManager(user)) {
    const member = memberById.get(payment.memberId);
    return Boolean(user.branchId && member?.branchId === user.branchId);
  }

  return true;
}

function isDocumentEntityVisibleByRole(user: User, doc: Document): boolean {
  if (user.role === 'policy_admin') {
    return doc.entityType === 'member' || doc.entityType === 'policy';
  }

  if (user.role === 'operations_coordinator') {
    return doc.entityType === 'funeral_case';
  }

  return true;
}

function getDocumentBranchId(doc: Document): string | undefined {
  if (doc.entityType === 'member') {
    return memberById.get(doc.entityId)?.branchId;
  }

  if (doc.entityType === 'policy') {
    const policy = policyById.get(doc.entityId);
    if (!policy) {
      return undefined;
    }

    return memberById.get(policy.memberId)?.branchId;
  }

  if (doc.entityType === 'funeral_case') {
    return funeralCaseById.get(doc.entityId)?.branchId;
  }

  return undefined;
}

export function canAccessDocument(user: User, doc: Document): boolean {
  if (doc.parlourId !== getUserParlourId(user)) {
    return false;
  }

  if (!isDocumentEntityVisibleByRole(user, doc)) {
    return false;
  }

  if (isBranchManager(user)) {
    const documentBranchId = getDocumentBranchId(doc);
    return Boolean(user.branchId && documentBranchId === user.branchId);
  }

  return true;
}

export function filterLeadsForUser(leads: Lead[], user: User): Lead[] {
  return leads.filter((lead) => canAccessLead(user, lead));
}

export function filterMembersForUser(allMembers: Member[], user: User): Member[] {
  return allMembers.filter((member) => canAccessMember(user, member));
}

export function filterPoliciesForUser(allPolicies: Policy[], user: User): Policy[] {
  return allPolicies.filter((policy) => canAccessPolicy(user, policy));
}

export function filterFuneralCasesForUser(allCases: FuneralCase[], user: User): FuneralCase[] {
  return allCases.filter((funeralCase) => canAccessFuneralCase(user, funeralCase));
}

export function filterPaymentsForUser(allPayments: PaymentTransaction[], user: User): PaymentTransaction[] {
  return allPayments.filter((payment) => canAccessPayment(user, payment));
}

export function filterDocumentsForUser(allDocuments: Document[], user: User): Document[] {
  return allDocuments.filter((doc) => canAccessDocument(user, doc));
}