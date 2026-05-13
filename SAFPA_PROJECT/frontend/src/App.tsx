import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider, useRole } from './contexts/RoleContext';
import AppLayout from './components/layout/AppLayout';
import type { ReactNode } from 'react';
import type { UserRole } from './types';

// SAFPA Admin
import SAFPADashboard from './pages/safpa/SAFPADashboard';
import ParlourList from './pages/safpa/ParlourList';
import AddParlour from './pages/safpa/AddParlour';
import ParlourDetail from './pages/safpa/ParlourDetail';
import Subscriptions from './pages/safpa/Subscriptions';
import SubscriptionEditor from './pages/safpa/SubscriptionEditor';
import SAFPAResources from './pages/safpa/SAFPAResources';

// Parlour Admin
import ParlourDashboard from './pages/parlour/ParlourDashboard';
import Branches from './pages/parlour/Branches';
import BranchEditor from './pages/parlour/BranchEditor';
import UserManagement from './pages/parlour/UserManagement';
import UserEditor from './pages/parlour/UserEditor';
import Products from './pages/parlour/Products';
import ProductEditor from './pages/parlour/ProductEditor';
import CommunicationTemplates from './pages/parlour/CommunicationTemplates';
import TemplateEditor from './pages/parlour/TemplateEditor';
import Branding from './pages/parlour/Branding';

// Website
import WebsitePreview from './pages/website/WebsitePreview';

// Leads
import LeadsList from './pages/leads/LeadsList';
import AddLead from './pages/leads/AddLead';
import LeadDetail from './pages/leads/LeadDetail';

// Members
import PolicyAdminOverview from './pages/members/PolicyAdminOverview';
import MembersList from './pages/members/MembersList';
import MemberDetail from './pages/members/MemberDetail';
import AddMember from './pages/members/AddMember';
import BulkImport from './pages/members/BulkImport';

// Policies
import PolicyList from './pages/policies/PolicyList';
import NewPolicy from './pages/policies/NewPolicy';
import PolicyDetail from './pages/policies/PolicyDetail';
import BulkImportPolicies from './pages/policies/BulkImportPolicies';

// Collections
import CollectionsDashboard from './pages/collections/CollectionsDashboard';
import ReceiptView from './pages/collections/ReceiptView';

// Funeral Cases
import OperationsOverview from './pages/funeralCases/OperationsOverview';
import FuneralCasesList from './pages/funeralCases/FuneralCasesList';
import FuneralCaseDetail from './pages/funeralCases/FuneralCaseDetail';
import NewFuneralCase from './pages/funeralCases/NewFuneralCase';

// Communications
import CommunicationLog from './pages/communications/CommunicationLog';
import CommunicationComposer from './pages/communications/CommunicationComposer';

// Customer
import CustomerPortal from './pages/customer/CustomerPortal';
import CustomerPolicyPage from './pages/customer/CustomerPolicyPage';
import CustomerPaymentsPage from './pages/customer/CustomerPaymentsPage';
import CustomerSupportPage from './pages/customer/CustomerSupportPage';

// Reports
import ReportsDashboard from './pages/reports/ReportsDashboard';

// Documents
import DocumentsList from './pages/documents/DocumentsList';

// Audit Log
import AuditLog from './pages/audit/AuditLog';

const roleDefaultPath: Record<string, string> = {
  safpa_admin: '/safpa',
  parlour_owner: '/parlour',
  branch_manager: '/parlour',
  policy_admin: '/policy-admin',
  collections_clerk: '/collections',
  operations_coordinator: '/operations',
  reporting_analyst: '/reports',
  policyholder_customer: '/customer',
};

function ProtectedRoute({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const { currentUser } = useRole();
  const defaultPath = roleDefaultPath[currentUser.role] || '/parlour';

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={defaultPath} replace />;
  }

  return <>{children}</>;
}

const withAccess = (allowedRoles: UserRole[], element: ReactNode) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
);

function AppRoutes() {
  const { currentUser } = useRole();
  const defaultPath = roleDefaultPath[currentUser.role] || '/parlour';

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* SAFPA Admin */}
        <Route path="/safpa" element={withAccess(['safpa_admin'], <SAFPADashboard />)} />
        <Route path="/safpa/parlours" element={withAccess(['safpa_admin'], <ParlourList />)} />
        <Route path="/safpa/parlours/new" element={withAccess(['safpa_admin'], <AddParlour />)} />
        <Route path="/safpa/parlours/:id" element={withAccess(['safpa_admin'], <ParlourDetail />)} />
        <Route path="/safpa/subscriptions" element={withAccess(['safpa_admin'], <Subscriptions />)} />
        <Route path="/safpa/subscriptions/new" element={withAccess(['safpa_admin'], <SubscriptionEditor />)} />
        <Route path="/safpa/subscriptions/:id/edit" element={withAccess(['safpa_admin'], <SubscriptionEditor />)} />
        <Route path="/safpa/resources" element={withAccess(['safpa_admin'], <SAFPAResources />)} />

        {/* Parlour Admin */}
        <Route path="/parlour" element={withAccess(['parlour_owner', 'branch_manager'], <ParlourDashboard />)} />
        <Route path="/parlour/branches" element={withAccess(['parlour_owner'], <Branches />)} />
        <Route path="/parlour/branches/new" element={withAccess(['parlour_owner'], <BranchEditor />)} />
        <Route path="/parlour/branches/:id/edit" element={withAccess(['parlour_owner'], <BranchEditor />)} />
        <Route path="/parlour/users" element={withAccess(['parlour_owner'], <UserManagement />)} />
        <Route path="/parlour/users/new" element={withAccess(['parlour_owner'], <UserEditor />)} />
        <Route path="/parlour/users/:id/edit" element={withAccess(['parlour_owner'], <UserEditor />)} />
        <Route path="/parlour/products" element={withAccess(['parlour_owner'], <Products />)} />
        <Route path="/parlour/products/new" element={withAccess(['parlour_owner'], <ProductEditor />)} />
        <Route path="/parlour/products/:id/edit" element={withAccess(['parlour_owner'], <ProductEditor />)} />
        <Route path="/parlour/branding" element={withAccess(['parlour_owner'], <Branding />)} />
        <Route path="/parlour/comm-templates" element={withAccess(['parlour_owner'], <CommunicationTemplates />)} />
        <Route path="/parlour/comm-templates/new" element={withAccess(['parlour_owner'], <TemplateEditor />)} />
        <Route path="/parlour/comm-templates/:id/edit" element={withAccess(['parlour_owner'], <TemplateEditor />)} />

        {/* Website */}
        <Route path="/website" element={withAccess(['parlour_owner'], <WebsitePreview />)} />

        {/* Leads */}
        <Route path="/policy-admin" element={withAccess(['policy_admin'], <PolicyAdminOverview />)} />
        <Route path="/leads" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <LeadsList />)} />
        <Route path="/leads/new" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <AddLead />)} />
        <Route path="/leads/:id" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <LeadDetail />)} />

        {/* Members */}
        <Route path="/members" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <MembersList />)} />
        <Route path="/members/new" element={withAccess(['parlour_owner', 'policy_admin'], <AddMember />)} />
        <Route path="/members/import" element={withAccess(['parlour_owner', 'policy_admin'], <BulkImport />)} />
        <Route path="/members/:id" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <MemberDetail />)} />

        {/* Policies */}
        <Route path="/policies" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <PolicyList />)} />
        <Route path="/policies/new" element={withAccess(['parlour_owner', 'policy_admin'], <NewPolicy />)} />
        <Route path="/policies/import" element={withAccess(['parlour_owner', 'policy_admin'], <BulkImportPolicies />)} />
        <Route path="/policies/:id" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <PolicyDetail />)} />

        {/* Collections */}
        <Route path="/collections" element={withAccess(['parlour_owner', 'branch_manager', 'collections_clerk'], <CollectionsDashboard />)} />
        <Route path="/collections/receipt/:id" element={withAccess(['parlour_owner', 'branch_manager', 'collections_clerk'], <ReceiptView />)} />

        {/* Funeral Cases */}
        <Route path="/operations" element={withAccess(['operations_coordinator'], <OperationsOverview />)} />
        <Route path="/funeral-cases" element={withAccess(['parlour_owner', 'branch_manager', 'operations_coordinator'], <FuneralCasesList />)} />
        <Route path="/funeral-cases/new" element={withAccess(['parlour_owner', 'branch_manager', 'operations_coordinator'], <NewFuneralCase />)} />
        <Route path="/funeral-cases/:id" element={withAccess(['parlour_owner', 'branch_manager', 'operations_coordinator'], <FuneralCaseDetail />)} />

        {/* Communications */}
        <Route path="/communications" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator'], <CommunicationLog />)} />
        <Route path="/communications/new" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator'], <CommunicationComposer />)} />

        {/* Customer */}
        <Route path="/customer" element={withAccess(['policyholder_customer'], <CustomerPortal />)}>
          <Route index element={<Navigate to="policy" replace />} />
          <Route path="policy" element={<CustomerPolicyPage />} />
          <Route path="payments" element={<CustomerPaymentsPage />} />
          <Route path="support" element={<CustomerSupportPage />} />
        </Route>

        {/* Reports */}
        <Route path="/reports" element={withAccess(['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator', 'reporting_analyst'], <ReportsDashboard />)} />

        {/* Documents */}
        <Route path="/documents" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin', 'operations_coordinator'], <DocumentsList />)} />

        {/* Audit Log */}
        <Route path="/audit-log" element={withAccess(['safpa_admin', 'parlour_owner'], <AuditLog />)} />

        {/* Default redirect based on role */}
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppRoutes />
      </RoleProvider>
    </BrowserRouter>
  );
}

