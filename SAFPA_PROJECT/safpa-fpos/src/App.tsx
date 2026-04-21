import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider, useRole } from './contexts/RoleContext';
import AppLayout from './components/layout/AppLayout';

// SAFPA Admin
import SAFPADashboard from './pages/safpa/SAFPADashboard';
import ParlourList from './pages/safpa/ParlourList';
import ParlourDetail from './pages/safpa/ParlourDetail';
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
};

function AppRoutes() {
  const { currentUser } = useRole();
  const defaultPath = roleDefaultPath[currentUser.role] || '/parlour';

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* SAFPA Admin */}
        <Route path="/safpa" element={<SAFPADashboard />} />
        <Route path="/safpa/parlours" element={<ParlourList />} />
        <Route path="/safpa/parlours/:id" element={<ParlourDetail />} />
        <Route path="/safpa/resources" element={<SAFPAResources />} />

        {/* Parlour Admin */}
        <Route path="/parlour" element={<ParlourDashboard />} />
        <Route path="/parlour/branches" element={<Branches />} />
        <Route path="/parlour/users" element={<UserManagement />} />
        <Route path="/parlour/products" element={<Products />} />
        <Route path="/parlour/comm-templates" element={<CommunicationTemplates />} />

        {/* Website */}
        <Route path="/website" element={<WebsitePreview />} />

        {/* Leads */}
        <Route path="/leads" element={<LeadsList />} />
        <Route path="/leads/:id" element={<LeadDetail />} />

        {/* Members */}
        <Route path="/members" element={<MembersList />} />
        <Route path="/members/new" element={<AddMember />} />
        <Route path="/members/import" element={<BulkImport />} />
        <Route path="/members/:id" element={<MemberDetail />} />

        {/* Policies */}
        <Route path="/policies" element={<PolicyList />} />
        <Route path="/policies/:id" element={<PolicyDetail />} />

        {/* Collections */}
        <Route path="/collections" element={<CollectionsDashboard />} />
        <Route path="/collections/receipt/:id" element={<ReceiptView />} />

        {/* Funeral Cases */}
        <Route path="/funeral-cases" element={<FuneralCasesList />} />
        <Route path="/funeral-cases/new" element={<NewFuneralCase />} />
        <Route path="/funeral-cases/:id" element={<FuneralCaseDetail />} />

        {/* Communications */}
        <Route path="/communications" element={<CommunicationLog />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsDashboard />} />

        {/* Documents */}
        <Route path="/documents" element={<DocumentsList />} />

        {/* Audit Log */}
        <Route path="/audit-log" element={<AuditLog />} />

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

