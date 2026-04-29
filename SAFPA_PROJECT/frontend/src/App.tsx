import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider, useRole } from './contexts/RoleContext';
import AppLayout from './components/layout/AppLayout';
import type { ReactNode } from 'react';
import type { UserRole } from './types';

// SAFPA Admin
import SAFPADashboard from './pages/safpa/SAFPADashboard';
import ParlourList from './pages/safpa/ParlourList';
import ParlourDetail from './pages/safpa/ParlourDetail';
import Subscriptions from './pages/safpa/Subscriptions';
import SAFPAResources from './pages/safpa/SAFPAResources';

// Parlour Admin
import ParlourDashboard from './pages/parlour/ParlourDashboard';
import Branches from './pages/parlour/Branches';
import UserManagement from './pages/parlour/UserManagement';
import Products from './pages/parlour/Products';
import CommunicationTemplates from './pages/parlour/CommunicationTemplates';

// Website
import WebsitePreview from './pages/website/WebsitePreview';

// Leads
import LeadsList from './pages/leads/LeadsList';
import LeadDetail from './pages/leads/LeadDetail';

// Members
import MembersList from './pages/members/MembersList';
import MemberDetail from './pages/members/MemberDetail';
import AddMember from './pages/members/AddMember';
import BulkImport from './pages/members/BulkImport';

// Policies
import PolicyList from './pages/policies/PolicyList';
import PolicyDetail from './pages/policies/PolicyDetail';
import BulkImportPolicies from './pages/policies/BulkImportPolicies';

// Collections
import CollectionsDashboard from './pages/collections/CollectionsDashboard';
import ReceiptView from './pages/collections/ReceiptView';

// Funeral Cases
import FuneralCasesList from './pages/funeralCases/FuneralCasesList';
import FuneralCaseDetail from './pages/funeralCases/FuneralCaseDetail';
import NewFuneralCase from './pages/funeralCases/NewFuneralCase';

// Communications
import CommunicationLog from './pages/communications/CommunicationLog';

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
  policy_admin: '/members',
  collections_clerk: '/collections',
  operations_coordinator: '/funeral-cases',
  reporting_analyst: '/reports',
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
        <Route path="/safpa/parlours/:id" element={withAccess(['safpa_admin'], <ParlourDetail />)} />
        <Route path="/safpa/subscriptions" element={withAccess(['safpa_admin'], <Subscriptions />)} />
        <Route path="/safpa/resources" element={withAccess(['safpa_admin'], <SAFPAResources />)} />

        {/* Parlour Admin */}
        <Route path="/parlour" element={withAccess(['parlour_owner', 'branch_manager'], <ParlourDashboard />)} />
        <Route path="/parlour/branches" element={withAccess(['parlour_owner'], <Branches />)} />
        <Route path="/parlour/users" element={withAccess(['parlour_owner'], <UserManagement />)} />
        <Route path="/parlour/products" element={withAccess(['parlour_owner'], <Products />)} />
        <Route path="/parlour/comm-templates" element={withAccess(['parlour_owner'], <CommunicationTemplates />)} />

        {/* Website */}
        <Route path="/website" element={withAccess(['parlour_owner'], <WebsitePreview />)} />

        {/* Leads */}
        <Route path="/leads" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <LeadsList />)} />
        <Route path="/leads/:id" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <LeadDetail />)} />

        {/* Members */}
        <Route path="/members" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <MembersList />)} />
        <Route path="/members/new" element={withAccess(['parlour_owner', 'policy_admin'], <AddMember />)} />
        <Route path="/members/import" element={withAccess(['parlour_owner', 'policy_admin'], <BulkImport />)} />
        <Route path="/members/:id" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <MemberDetail />)} />

        {/* Policies */}
        <Route path="/policies" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <PolicyList />)} />
        <Route path="/policies/import" element={withAccess(['parlour_owner', 'policy_admin'], <BulkImportPolicies />)} />
        <Route path="/policies/:id" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin'], <PolicyDetail />)} />

        {/* Collections */}
        <Route path="/collections" element={withAccess(['parlour_owner', 'branch_manager', 'collections_clerk'], <CollectionsDashboard />)} />
        <Route path="/collections/receipt/:id" element={withAccess(['parlour_owner', 'branch_manager', 'collections_clerk'], <ReceiptView />)} />

        {/* Funeral Cases */}
        <Route path="/funeral-cases" element={withAccess(['parlour_owner', 'branch_manager', 'operations_coordinator'], <FuneralCasesList />)} />
        <Route path="/funeral-cases/new" element={withAccess(['parlour_owner', 'branch_manager', 'operations_coordinator'], <NewFuneralCase />)} />
        <Route path="/funeral-cases/:id" element={withAccess(['parlour_owner', 'branch_manager', 'operations_coordinator'], <FuneralCaseDetail />)} />

        {/* Communications */}
        <Route path="/communications" element={withAccess(['parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'operations_coordinator'], <CommunicationLog />)} />

        {/* Reports */}
        <Route path="/reports" element={withAccess(['safpa_admin', 'parlour_owner', 'branch_manager', 'policy_admin', 'collections_clerk', 'reporting_analyst'], <ReportsDashboard />)} />

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

