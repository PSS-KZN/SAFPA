export type UserRole =
  | 'safpa_admin'
  | 'parlour_owner'
  | 'branch_manager'
  | 'policy_admin'
  | 'collections_clerk'
  | 'operations_coordinator'
  | 'policyholder_customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  parlourId?: string;
  branchId?: string;
  memberId?: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

export interface Parlour {
  id: string;
  name: string;
  region: string;
  province: string;
  tier: 'basic' | 'standard' | 'premium';
  status: 'onboarding' | 'active' | 'suspended';
  onboardingProgress: number;
  totalMembers: number;
  totalPolicies: number;
  contactEmail: string;
  contactPhone: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  businessDescription?: string | null;
  tagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  physicalAddress?: string | null;
  websiteTemplate: 'heritage' | 'modern' | 'community';
  websiteSubdomain?: string | null;
  customDomain?: string | null;
  customDomainStatus: 'not_requested' | 'requested' | 'configured';
  customDomainDnsTarget?: string | null;
  customDomainNotes?: string | null;
  websitePublished: boolean;
  websitePublishStatus: 'draft' | 'ready' | 'published' | 'needs_review';
  brandingCompletedAt?: string | null;
  joinedDate: string;
}

export interface ParlourSubscription {
  id: string;
  parlourId: string;
  parlourName: string;
  tier: 'basic' | 'standard' | 'premium';
  status: 'active' | 'paused' | 'cancelled';
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  amount: number;
  startDate: string;
  endDate?: string | null;
  autoRenew: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  tier: 'basic' | 'standard' | 'premium';
  name: string;
  amount: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  parlourId: string;
  name: string;
  address: string;
  city: string;
  province: string;
  manager: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface Member {
  id: string;
  parlourId: string;
  branchId: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'suspended';
  dependants: Dependant[];
  beneficiaries: Beneficiary[];
}

export interface Dependant {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  relationship: string;
  dateOfBirth: string;
}

export interface Beneficiary {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  relationship: string;
  percentage: number;
}

export interface Policy {
  id: string;
  policyNumber: string;
  memberId: string;
  parlourId: string;
  productId: string;
  productName: string;
  status: 'draft' | 'pending' | 'active' | 'suspended' | 'lapsed' | 'reinstated' | 'cancelled' | 'closed';
  premiumAmount: number;
  waitingPeriodDays: number;
  billingFrequency: 'monthly' | 'weekly' | 'annually';
  nextDueDate: string;
  startDate: string;
  coverAmount: number;
  arrearsAmount: number;
  lastPaymentDate?: string;
  allowedStatusTransitions?: Record<string, string[]> | null;
}

export interface Product {
  id: string;
  parlourId: string;
  name: string;
  description: string;
  premiumFrom: number;
  coverFrom: number;
  maxDependants: number;
  isActive: boolean;
}

export interface PaymentTransaction {
  id: string;
  policyId: string;
  policyNumber: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  method: 'debit_order' | 'eft' | 'card' | 'cash';
  providerCode: string;
  providerName: string;
  captureChannel: 'provider_static' | 'branch_manual';
  status: 'successful' | 'failed' | 'pending' | 'reversed';
  reference: string;
  parlourId: string;
}

export interface FuneralCase {
  id: string;
  caseNumber: string;
  parlourId: string;
  branchId: string;
  deceasedName: string;
  deceasedIdNumber: string;
  dateOfDeath: string;
  deathNoticeLoggedAt: string;
  deathNoticeLoggedBy: string;
  informantName: string;
  informantPhone: string;
  placeOfDeath: string;
  causeOfDeath?: string;
  bodyCollected: boolean;
  bodyCollectionLocation?: string;
  policyId?: string;
  policyNumber?: string;
  memberId?: string;
  coordinatorId: string;
  coordinatorName: string;
  status: 'logged' | 'in_progress' | 'scheduled' | 'completed' | 'archived';
  funeralDate?: string;
  venue?: string;
  caseType: 'policy' | 'cash' | 'private';
  tasks: CaseTask[];
  notes: string[];
  staff?: FuneralCaseStaff[];
  vehicles?: FuneralCaseVehicle[];
  suppliers?: FuneralCaseSupplier[];
  milestones?: FuneralCaseMilestone[];
  closedAt?: string;
  closedBy?: string;
  closureSummary?: string;
  closureChecklistComplete?: boolean;
  createdAt: string;
}

export interface FuneralCaseStaff {
  id: string;
  staffUserId?: string;
  displayName: string;
  name: string;
  role: string;
}

export interface FuneralCaseVehicle {
  id: string;
  reg: string;
  type: string;
  driver: string;
  capacity?: number;
  purpose?: string;
  availabilityStatus?: 'available' | 'allocated' | 'maintenance';
}

export interface FuneralCaseSupplier {
  id: string;
  name: string;
  service: string;
  status: 'pending' | 'confirmed';
}

export interface CaseTask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
  category?: 'documentation' | 'logistics' | 'family_support' | 'ceremony' | 'finance';
  milestoneId?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface FuneralCaseMilestone {
  id: string;
  type:
    | 'death_notice_logged'
    | 'body_collection'
    | 'family_meeting'
    | 'documentation_collection'
    | 'funeral_service'
    | 'burial_or_cremation'
    | 'post_funeral_followup'
    | 'case_closure';
  title: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'pending' | 'scheduled' | 'completed';
  assignedStaffId?: string;
  assignedVehicleId?: string;
  notes?: string;
  completedAt?: string;
}

export interface Lead {
  id: string;
  parlourId: string;
  branchId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  source: 'website' | 'branch' | 'agent' | 'referral';
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  assignedTo?: string;
  notes?: string;
  createdAt: string;
}

export interface Communication {
  id: string;
  type: 'sms' | 'email';
  recipientName: string;
  recipientContact: string;
  subject?: string;
  template: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'pending';
  sentAt: string;
  parlourId: string;
  metadata?: {
    trigger?: string;
    channel?: 'sms' | 'email';
    templateId?: string;
    templateName?: string;
    renderedBody?: string;
    renderedSubject?: string;
    providerMode?: 'demo';
    providerMessageId?: string;
    statusReason?: string;
    queuedAt?: string;
    deliveredAt?: string;
    failedAt?: string;
    createdBy?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    policyId?: string;
    policyNumber?: string;
    paymentId?: string;
    receiptId?: string;
    funeralCaseId?: string;
    caseNumber?: string;
    eventType?: string;
    oldStatus?: string;
    newStatus?: string;
    memberId?: string;
  };
}

export interface Document {
  id: string;
  name: string;
  type: 'id_copy' | 'death_certificate' | 'proof_of_address' | 'policy_document' | 'receipt' | 'burial_order' | 'consent_form' | 'other';
  entityType: 'member' | 'policy' | 'funeral_case';
  entityId: string;
  parlourId: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  parlourId?: string;
  details?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'notice' | 'training' | 'partner' | 'policy' | 'template';
  description: string;
  publishedAt: string;
  publishedBy: string;
  fileSize?: string;
  url?: string;
  tags: string[];
}

export interface CommunicationTemplate {
  id: string;
  parlourId: string;
  name: string;
  type: 'sms' | 'email';
  trigger: 'payment_reminder' | 'payment_receipt' | 'payment_failed_notice' | 'policy_activated' | 'policy_lapsed' | 'policy_suspended' | 'policy_reinstated' | 'policy_cancelled' | 'funeral_case_update' | 'welcome' | 'custom';
  subject?: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  lastUpdated: string;
}

export interface DashboardStats {
  totalParlours: number;
  activeParlours: number;
  totalMembers: number;
  totalPolicies: number;
  activePolicies: number;
  premiumsDueThisMonth: number;
  premiumsCollectedThisMonth: number;
  totalArrears: number;
  openFuneralCases: number;
  newLeadsThisMonth: number;
  collectionRate: number;
  monthlyCollections: { month: string; collected: number; due: number }[];
  policyStatusBreakdown: { status: string; count: number }[];
  memberGrowth: { month: string; members: number }[];
}
