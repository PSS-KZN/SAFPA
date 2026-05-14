import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, CheckSquare, File, FileText, MessageSquare, Square, Truck, Upload, Users } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { CaseTask, Communication, Document, FuneralCase, FuneralCaseMilestone, FuneralCaseStaff, FuneralCaseSupplier, FuneralCaseVehicle, User } from '../../types';
import { fetchCommunications } from '../../services/communicationsApi';
import { fetchDocuments } from '../../services/documentsApi';
import {
  addFuneralCaseMilestone,
  addFuneralCaseNote,
  addFuneralCaseStaff,
  addFuneralCaseSupplier,
  addFuneralCaseTask,
  addFuneralCaseVehicle,
  deleteFuneralCase,
  deleteFuneralCaseMilestone,
  deleteFuneralCaseNote,
  deleteFuneralCaseStaff,
  deleteFuneralCaseSupplier,
  deleteFuneralCaseTask,
  deleteFuneralCaseVehicle,
  fetchFuneralCase,
  updateFuneralCase,
  updateFuneralCaseMilestone,
  updateFuneralCaseStaff,
  updateFuneralCaseStatus,
  updateFuneralCaseSupplier,
  updateFuneralCaseTask,
  updateFuneralCaseVehicle,
} from '../../services/funeralCasesApi';
import { fetchUsers } from '../../services/usersApi';

const statusColors: Record<FuneralCase['status'], string> = {
  logged: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
};

const milestoneStatusColors: Record<FuneralCaseMilestone['status'], string> = {
  pending: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
};

const DEMO_STAFF: FuneralCaseStaff[] = [
  { id: 'demo-staff-1', staffUserId: 'u7', displayName: 'Sibongile Mthembu', name: 'Sibongile Mthembu', role: 'Coordinator' },
  { id: 'demo-staff-2', staffUserId: 'u4', displayName: 'Thabo Mokoena', name: 'Thabo Mokoena', role: 'Pallbearer Lead' },
  { id: 'demo-staff-3', staffUserId: 'u9', displayName: 'Zanele Mkhize', name: 'Zanele Mkhize', role: 'Family Liaison' },
];

const DEMO_VEHICLES: FuneralCaseVehicle[] = [
  { id: 'demo-vehicle-1', reg: 'GP 123-456', type: 'Hearse', driver: 'Solomon Dube', capacity: 4, purpose: 'service', availabilityStatus: 'allocated' },
  { id: 'demo-vehicle-2', reg: 'GP 789-012', type: 'Family Car', driver: 'TBC', capacity: 4, purpose: 'family transport', availabilityStatus: 'allocated' },
];

const DEMO_SUPPLIERS: FuneralCaseSupplier[] = [
  { id: 'demo-supplier-1', name: 'Graceland Coffins', service: 'Coffin Supply', status: 'confirmed' },
  { id: 'demo-supplier-2', name: 'Divine Flowers', service: 'Floral Arrangements', status: 'pending' },
];

const milestoneTypeLabels: Record<FuneralCaseMilestone['type'], string> = {
  death_notice_logged: 'Death Notice Logged',
  body_collection: 'Body Collection',
  family_meeting: 'Family Meeting',
  documentation_collection: 'Documentation Collection',
  funeral_service: 'Funeral Service',
  burial_or_cremation: 'Burial Or Cremation',
  post_funeral_followup: 'Post Funeral Follow Up',
  case_closure: 'Case Closure',
};

function isDemoCase(record: FuneralCase): boolean {
  return record.id.startsWith('fcdemo_') || record.caseNumber.startsWith('FC-DEMO');
}

function toVehicleForm(vehicle?: FuneralCaseVehicle) {
  return {
    reg: vehicle?.reg || '',
    type: vehicle?.type || '',
    driver: vehicle?.driver || '',
    capacity: vehicle?.capacity ? String(vehicle.capacity) : '',
    purpose: vehicle?.purpose || '',
    availabilityStatus: vehicle?.availabilityStatus || 'allocated',
  };
}

function toMilestoneForm(milestone?: FuneralCaseMilestone) {
  return {
    type: milestone?.type || 'body_collection',
    title: milestone?.title || '',
    scheduledDate: milestone?.scheduledDate || '',
    scheduledTime: milestone?.scheduledTime || '',
    status: milestone?.status || 'pending',
    assignedStaffId: milestone?.assignedStaffId || '',
    assignedVehicleId: milestone?.assignedVehicleId || '',
    notes: milestone?.notes || '',
  };
}

function syncCaseForm(record: FuneralCase) {
  return {
    deceasedName: record.deceasedName,
    deceasedIdNumber: record.deceasedIdNumber,
    dateOfDeath: record.dateOfDeath,
    deathNoticeLoggedAt: record.deathNoticeLoggedAt,
    deathNoticeLoggedBy: record.deathNoticeLoggedBy,
    informantName: record.informantName,
    informantPhone: record.informantPhone,
    placeOfDeath: record.placeOfDeath,
    causeOfDeath: record.causeOfDeath || '',
    bodyCollected: record.bodyCollected,
    bodyCollectionLocation: record.bodyCollectionLocation || '',
    funeralDate: record.funeralDate || '',
    venue: record.venue || '',
    coordinatorName: record.coordinatorName,
    caseType: record.caseType,
    status: record.status,
    closureSummary: record.closureSummary || '',
    closureChecklistComplete: Boolean(record.closureChecklistComplete),
  };
}

export default function FuneralCaseDetail() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const { id } = useParams();
  const [fc, setFc] = useState<FuneralCase | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [caseDocs, setCaseDocs] = useState<Document[]>([]);
  const [staffOptions, setStaffOptions] = useState<User[]>([]);
  const [caseForm, setCaseForm] = useState({
    deceasedName: '',
    deceasedIdNumber: '',
    dateOfDeath: '',
    deathNoticeLoggedAt: '',
    deathNoticeLoggedBy: '',
    informantName: '',
    informantPhone: '',
    placeOfDeath: '',
    causeOfDeath: '',
    bodyCollected: false,
    bodyCollectionLocation: '',
    funeralDate: '',
    venue: '',
    coordinatorName: '',
    caseType: 'policy' as FuneralCase['caseType'],
    status: 'logged' as FuneralCase['status'],
    closureSummary: '',
    closureChecklistComplete: false,
  });
  const [newTask, setNewTask] = useState({
    title: '',
    assignee: '',
    dueDate: '',
    category: 'documentation' as NonNullable<CaseTask['category']>,
    milestoneId: '',
  });
  const [newNote, setNewNote] = useState('');
  const [newStaff, setNewStaff] = useState({ staffUserId: '', role: '' });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffRole, setEditingStaffRole] = useState('');
  const [newVehicle, setNewVehicle] = useState(toVehicleForm());
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState(toVehicleForm());
  const [newSupplier, setNewSupplier] = useState({ name: '', service: '', status: 'pending' as 'pending' | 'confirmed' });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState({ name: '', service: '', status: 'pending' as 'pending' | 'confirmed' });
  const [newMilestone, setNewMilestone] = useState(toMilestoneForm());
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState(toMilestoneForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyUpdatedCase = (updated: FuneralCase) => {
    setFc(updated);
    setCaseForm(syncCaseForm(updated));
  };

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const parlourId = currentUser.parlourId || 'p1';
        const [caseRecord, communicationRecords, documentRecords, users] = await Promise.all([
          fetchFuneralCase(id),
          fetchCommunications(parlourId),
          fetchDocuments({ parlourId, entityType: 'funeral_case', entityId: id }),
          fetchUsers(parlourId),
        ]);

        let resolvedCase = caseRecord;
        if (isDemoCase(caseRecord)) {
          const hasStaff = Array.isArray(caseRecord.staff) && caseRecord.staff.length > 0;
          const hasVehicles = Array.isArray(caseRecord.vehicles) && caseRecord.vehicles.length > 0;
          const hasSuppliers = Array.isArray(caseRecord.suppliers) && caseRecord.suppliers.length > 0;

          if (!hasStaff || !hasVehicles || !hasSuppliers) {
            try {
              resolvedCase = await updateFuneralCase(caseRecord.id, {
                staff: hasStaff ? caseRecord.staff : DEMO_STAFF,
                vehicles: hasVehicles ? caseRecord.vehicles : DEMO_VEHICLES,
                suppliers: hasSuppliers ? caseRecord.suppliers : DEMO_SUPPLIERS,
              });
            } catch {
              // Keep original record if demo hydration fails.
            }
          }
        }

        if (currentUser.role === 'branch_manager' && currentUser.branchId && resolvedCase.branchId !== currentUser.branchId) {
          setFc(null);
          setStaffOptions([]);
          return;
        }

        setFc(resolvedCase);
        setCommunications(communicationRecords);
        setCaseForm(syncCaseForm(resolvedCase));
        setCaseDocs(documentRecords);
        setStaffOptions(users.filter((user) => user.status === 'active'));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load funeral case');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, currentUser.branchId, currentUser.parlourId, currentUser.role]);

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Loading case...</div>;
  }

  if (!fc) {
    return <div className="py-12 text-center text-slate-500">Case not found</div>;
  }

  const tasks = fc.tasks || [];
  const caseCommunications = communications.filter((item) => item.metadata?.funeralCaseId === fc.id || item.metadata?.relatedEntityId === fc.id);
  const milestones = [...(fc.milestones || [])].sort((left, right) => (left.scheduledDate || '').localeCompare(right.scheduledDate || ''));
  const vehicles = fc.vehicles || [];
  const availableStaff = staffOptions.filter((user) => {
    if (user.parlourId !== fc.parlourId) {
      return false;
    }

    if (currentUser.role === 'parlour_owner' || currentUser.role === 'safpa_admin') {
      return true;
    }

    return !user.branchId || user.branchId === fc.branchId;
  });
  const completedCount = tasks.filter((task) => task.completed).length;
  const overdueMilestones = milestones.filter((milestone) => milestone.status !== 'completed' && milestone.scheduledDate && milestone.scheduledDate < new Date().toISOString().slice(0, 10));

  const typeLabels: Record<string, string> = {
    death_certificate: 'Death Certificate',
    burial_order: 'Burial Order',
    id_copy: 'ID Copy',
    policy_document: 'Policy Document',
    other: 'Other',
  };

  const typeColors: Record<string, string> = {
    death_certificate: 'bg-red-100 text-red-700',
    burial_order: 'bg-orange-100 text-orange-700',
    id_copy: 'bg-red-100 text-red-700',
    policy_document: 'bg-violet-100 text-violet-700',
    other: 'bg-slate-100 text-slate-600',
  };

  const saveCaseDetails = async () => {
    try {
      setSaving(true);
      setError(null);

      const updated = await updateFuneralCase(fc.id, {
        deceasedName: caseForm.deceasedName,
        deceasedIdNumber: caseForm.deceasedIdNumber,
        dateOfDeath: caseForm.dateOfDeath,
        deathNoticeLoggedAt: caseForm.deathNoticeLoggedAt,
        deathNoticeLoggedBy: caseForm.deathNoticeLoggedBy,
        informantName: caseForm.informantName,
        informantPhone: caseForm.informantPhone,
        placeOfDeath: caseForm.placeOfDeath,
        causeOfDeath: caseForm.causeOfDeath || undefined,
        bodyCollected: caseForm.bodyCollected,
        bodyCollectionLocation: caseForm.bodyCollectionLocation || undefined,
        funeralDate: caseForm.funeralDate || undefined,
        venue: caseForm.venue || undefined,
        coordinatorName: caseForm.coordinatorName,
        caseType: caseForm.caseType,
        closureSummary: caseForm.closureSummary || undefined,
        closureChecklistComplete: caseForm.closureChecklistComplete,
      });

      if (caseForm.status !== updated.status) {
        const statusUpdated = await updateFuneralCaseStatus(fc.id, caseForm.status);
        applyUpdatedCase(statusUpdated);
      } else {
        applyUpdatedCase(updated);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save funeral case');
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) {
      return;
    }

    try {
      setError(null);
      const updated = await updateFuneralCaseTask(fc.id, taskId, { completed: !target.completed });
      applyUpdatedCase(updated);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to update task');
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) {
      return;
    }

    try {
      setError(null);
      const updated = await addFuneralCaseTask(fc.id, {
        title: newTask.title.trim(),
        assignee: newTask.assignee || undefined,
        dueDate: newTask.dueDate || undefined,
        category: newTask.category,
        milestoneId: newTask.milestoneId || undefined,
      });
      applyUpdatedCase(updated);
      setNewTask({ title: '', assignee: '', dueDate: '', category: 'documentation', milestoneId: '' });
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to add task');
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      setError(null);
      const updated = await deleteFuneralCaseTask(fc.id, taskId);
      applyUpdatedCase(updated);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to delete task');
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) {
      return;
    }

    try {
      setError(null);
      const updated = await addFuneralCaseNote(fc.id, newNote.trim());
      applyUpdatedCase(updated);
      setNewNote('');
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Failed to add note');
    }
  };

  const removeNote = async (index: number) => {
    try {
      setError(null);
      const updated = await deleteFuneralCaseNote(fc.id, index);
      applyUpdatedCase(updated);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Failed to delete note');
    }
  };

  const createStaff = async () => {
    if (!newStaff.staffUserId || !newStaff.role.trim()) {
      return;
    }

    const selected = availableStaff.find((user) => user.id === newStaff.staffUserId);
    if (!selected) {
      return;
    }

    try {
      const updated = await addFuneralCaseStaff(fc.id, {
        staffUserId: selected.id,
        displayName: selected.name,
        role: newStaff.role.trim(),
      });
      applyUpdatedCase(updated);
      setNewStaff({ staffUserId: '', role: '' });
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : 'Failed to add staff');
    }
  };

  const startEditStaff = (staffId: string, currentRole: string) => {
    setEditingStaffId(staffId);
    setEditingStaffRole(currentRole);
  };

  const saveEditStaff = async () => {
    if (!editingStaffId || !editingStaffRole.trim()) {
      return;
    }

    try {
      const updated = await updateFuneralCaseStaff(fc.id, editingStaffId, { role: editingStaffRole.trim() });
      applyUpdatedCase(updated);
      setEditingStaffId(null);
      setEditingStaffRole('');
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : 'Failed to update staff');
    }
  };

  const removeStaff = async (staffId: string) => {
    try {
      const updated = await deleteFuneralCaseStaff(fc.id, staffId);
      applyUpdatedCase(updated);
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : 'Failed to delete staff');
    }
  };

  const createVehicle = async () => {
    if (!newVehicle.reg.trim() || !newVehicle.type.trim() || !newVehicle.driver.trim()) {
      return;
    }

    try {
      const updated = await addFuneralCaseVehicle(fc.id, {
        reg: newVehicle.reg.trim(),
        type: newVehicle.type.trim(),
        driver: newVehicle.driver.trim(),
        capacity: newVehicle.capacity ? Number.parseInt(newVehicle.capacity, 10) : undefined,
        purpose: newVehicle.purpose || undefined,
        availabilityStatus: newVehicle.availabilityStatus as FuneralCaseVehicle['availabilityStatus'],
      });
      applyUpdatedCase(updated);
      setNewVehicle(toVehicleForm());
    } catch (vehicleError) {
      setError(vehicleError instanceof Error ? vehicleError.message : 'Failed to add vehicle');
    }
  };

  const startEditVehicle = (vehicle: FuneralCaseVehicle) => {
    setEditingVehicleId(vehicle.id);
    setEditingVehicle(toVehicleForm(vehicle));
  };

  const saveEditVehicle = async () => {
    if (!editingVehicleId || !editingVehicle.reg.trim() || !editingVehicle.type.trim() || !editingVehicle.driver.trim()) {
      return;
    }

    try {
      const updated = await updateFuneralCaseVehicle(fc.id, editingVehicleId, {
        reg: editingVehicle.reg.trim(),
        type: editingVehicle.type.trim(),
        driver: editingVehicle.driver.trim(),
        capacity: editingVehicle.capacity ? Number.parseInt(editingVehicle.capacity, 10) : undefined,
        purpose: editingVehicle.purpose || undefined,
        availabilityStatus: editingVehicle.availabilityStatus as FuneralCaseVehicle['availabilityStatus'],
      });
      applyUpdatedCase(updated);
      setEditingVehicleId(null);
    } catch (vehicleError) {
      setError(vehicleError instanceof Error ? vehicleError.message : 'Failed to update vehicle');
    }
  };

  const removeVehicle = async (vehicleId: string) => {
    try {
      const updated = await deleteFuneralCaseVehicle(fc.id, vehicleId);
      applyUpdatedCase(updated);
    } catch (vehicleError) {
      setError(vehicleError instanceof Error ? vehicleError.message : 'Failed to delete vehicle');
    }
  };

  const createSupplier = async () => {
    if (!newSupplier.name.trim() || !newSupplier.service.trim()) {
      return;
    }

    try {
      const updated = await addFuneralCaseSupplier(fc.id, {
        name: newSupplier.name.trim(),
        service: newSupplier.service.trim(),
        status: newSupplier.status,
      });
      applyUpdatedCase(updated);
      setNewSupplier({ name: '', service: '', status: 'pending' });
    } catch (supplierError) {
      setError(supplierError instanceof Error ? supplierError.message : 'Failed to add supplier');
    }
  };

  const startEditSupplier = (supplier: FuneralCaseSupplier) => {
    setEditingSupplierId(supplier.id);
    setEditingSupplier({ name: supplier.name, service: supplier.service, status: supplier.status });
  };

  const saveEditSupplier = async () => {
    if (!editingSupplierId || !editingSupplier.name.trim() || !editingSupplier.service.trim()) {
      return;
    }

    try {
      const updated = await updateFuneralCaseSupplier(fc.id, editingSupplierId, {
        name: editingSupplier.name.trim(),
        service: editingSupplier.service.trim(),
        status: editingSupplier.status,
      });
      applyUpdatedCase(updated);
      setEditingSupplierId(null);
    } catch (supplierError) {
      setError(supplierError instanceof Error ? supplierError.message : 'Failed to update supplier');
    }
  };

  const removeSupplier = async (supplierId: string) => {
    try {
      const updated = await deleteFuneralCaseSupplier(fc.id, supplierId);
      applyUpdatedCase(updated);
    } catch (supplierError) {
      setError(supplierError instanceof Error ? supplierError.message : 'Failed to delete supplier');
    }
  };

  const createMilestone = async () => {
    if (!newMilestone.title.trim()) {
      return;
    }

    try {
      const updated = await addFuneralCaseMilestone(fc.id, {
        type: newMilestone.type as FuneralCaseMilestone['type'],
        title: newMilestone.title.trim(),
        scheduledDate: newMilestone.scheduledDate || undefined,
        scheduledTime: newMilestone.scheduledTime || undefined,
        status: newMilestone.status as FuneralCaseMilestone['status'],
        assignedStaffId: newMilestone.assignedStaffId || undefined,
        assignedVehicleId: newMilestone.assignedVehicleId || undefined,
        notes: newMilestone.notes || undefined,
      });
      applyUpdatedCase(updated);
      setNewMilestone(toMilestoneForm());
    } catch (milestoneError) {
      setError(milestoneError instanceof Error ? milestoneError.message : 'Failed to add milestone');
    }
  };

  const startEditMilestone = (milestone: FuneralCaseMilestone) => {
    setEditingMilestoneId(milestone.id);
    setEditingMilestone(toMilestoneForm(milestone));
  };

  const saveEditMilestone = async () => {
    if (!editingMilestoneId || !editingMilestone.title.trim()) {
      return;
    }

    try {
      const updated = await updateFuneralCaseMilestone(fc.id, editingMilestoneId, {
        type: editingMilestone.type as FuneralCaseMilestone['type'],
        title: editingMilestone.title.trim(),
        scheduledDate: editingMilestone.scheduledDate || undefined,
        scheduledTime: editingMilestone.scheduledTime || undefined,
        status: editingMilestone.status as FuneralCaseMilestone['status'],
        assignedStaffId: editingMilestone.assignedStaffId || undefined,
        assignedVehicleId: editingMilestone.assignedVehicleId || undefined,
        notes: editingMilestone.notes || undefined,
      });
      applyUpdatedCase(updated);
      setEditingMilestoneId(null);
    } catch (milestoneError) {
      setError(milestoneError instanceof Error ? milestoneError.message : 'Failed to update milestone');
    }
  };

  const completeMilestone = async (milestone: FuneralCaseMilestone) => {
    try {
      const updated = await updateFuneralCaseMilestone(fc.id, milestone.id, { status: 'completed' });
      applyUpdatedCase(updated);
    } catch (milestoneError) {
      setError(milestoneError instanceof Error ? milestoneError.message : 'Failed to complete milestone');
    }
  };

  const removeMilestone = async (milestoneId: string) => {
    try {
      const updated = await deleteFuneralCaseMilestone(fc.id, milestoneId);
      applyUpdatedCase(updated);
    } catch (milestoneError) {
      setError(milestoneError instanceof Error ? milestoneError.message : 'Failed to delete milestone');
    }
  };

  const removeCase = async () => {
    const confirmed = window.confirm('Delete this funeral case? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await deleteFuneralCase(fc.id);
      navigate('/funeral-cases');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete funeral case');
    }
  };

  return (
    <div>
      <Link to="/funeral-cases" className="mb-4 flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Cases
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold">{fc.caseNumber}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[fc.status]}`}>{fc.status.replace('_', ' ')}</span>
        <button onClick={() => void removeCase()} className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
          Delete Case
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-semibold">Death Notice And Case Details</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Deceased Name</label>
              <input value={caseForm.deceasedName} onChange={(event) => setCaseForm((prev) => ({ ...prev, deceasedName: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Deceased ID Number</label>
              <input value={caseForm.deceasedIdNumber} onChange={(event) => setCaseForm((prev) => ({ ...prev, deceasedIdNumber: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Date Of Death</label>
              <input type="date" value={caseForm.dateOfDeath} onChange={(event) => setCaseForm((prev) => ({ ...prev, dateOfDeath: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Death Notice Logged At</label>
              <input type="date" value={caseForm.deathNoticeLoggedAt} onChange={(event) => setCaseForm((prev) => ({ ...prev, deathNoticeLoggedAt: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Logged By</label>
              <input value={caseForm.deathNoticeLoggedBy} onChange={(event) => setCaseForm((prev) => ({ ...prev, deathNoticeLoggedBy: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Informant Name</label>
              <input value={caseForm.informantName} onChange={(event) => setCaseForm((prev) => ({ ...prev, informantName: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Informant Phone</label>
              <input value={caseForm.informantPhone} onChange={(event) => setCaseForm((prev) => ({ ...prev, informantPhone: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Place Of Death</label>
              <input value={caseForm.placeOfDeath} onChange={(event) => setCaseForm((prev) => ({ ...prev, placeOfDeath: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Cause Of Death</label>
              <input value={caseForm.causeOfDeath} onChange={(event) => setCaseForm((prev) => ({ ...prev, causeOfDeath: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Body Collection Location</label>
              <input value={caseForm.bodyCollectionLocation} onChange={(event) => setCaseForm((prev) => ({ ...prev, bodyCollectionLocation: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-5 text-sm text-slate-700">
              <input type="checkbox" checked={caseForm.bodyCollected} onChange={(event) => setCaseForm((prev) => ({ ...prev, bodyCollected: event.target.checked }))} />
              Body collected
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Funeral Date</label>
              <input type="date" value={caseForm.funeralDate} onChange={(event) => setCaseForm((prev) => ({ ...prev, funeralDate: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Venue</label>
              <input value={caseForm.venue} onChange={(event) => setCaseForm((prev) => ({ ...prev, venue: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Coordinator</label>
              <input value={caseForm.coordinatorName} onChange={(event) => setCaseForm((prev) => ({ ...prev, coordinatorName: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Case Type</label>
              <select value={caseForm.caseType} onChange={(event) => setCaseForm((prev) => ({ ...prev, caseType: event.target.value as FuneralCase['caseType'] }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="policy">Policy</option>
                <option value="cash">Cash</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Status</label>
              <select value={caseForm.status} onChange={(event) => setCaseForm((prev) => ({ ...prev, status: event.target.value as FuneralCase['status'] }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="logged">Logged</option>
                <option value="in_progress">In Progress</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <button disabled={saving} onClick={() => void saveCaseDetails()} className="mt-4 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Case Details'}
          </button>
          {fc.policyNumber && (
            <div className="mt-4 rounded-lg bg-red-50 p-3">
              <p className="text-xs text-red-600">Linked Policy: <Link to={`/policies/${fc.policyId}`} className="font-medium hover:underline">{fc.policyNumber}</Link></p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Closure Workflow</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Closure Summary</label>
              <textarea value={caseForm.closureSummary} onChange={(event) => setCaseForm((prev) => ({ ...prev, closureSummary: event.target.value }))} rows={5} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" checked={caseForm.closureChecklistComplete} onChange={(event) => setCaseForm((prev) => ({ ...prev, closureChecklistComplete: event.target.checked }))} />
              Closure checklist complete
            </label>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <div>Closed At: {fc.closedAt || 'Not closed yet'}</div>
              <div>Closed By: {fc.closedBy || 'Not closed yet'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <div>Overdue milestones: {overdueMilestones.length}</div>
              <div>Completed tasks: {completedCount}/{tasks.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Milestones</h3>
          <span className="text-sm text-slate-500">{milestones.length} total</span>
        </div>
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const assignedStaff = (fc.staff || []).find((item) => item.id === milestone.assignedStaffId || item.staffUserId === milestone.assignedStaffId);
            const assignedVehicle = vehicles.find((item) => item.id === milestone.assignedVehicleId);
            const isEditing = editingMilestoneId === milestone.id;

            return (
              <div key={milestone.id} className="rounded-lg border border-slate-200 p-3">
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <select value={editingMilestone.type} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, type: event.target.value as FuneralCaseMilestone['type'] }))} className="rounded border border-slate-300 px-2 py-1 text-sm">
                      {Object.entries(milestoneTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input value={editingMilestone.title} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, title: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-sm md:col-span-2" />
                    <input type="date" value={editingMilestone.scheduledDate} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, scheduledDate: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-sm" />
                    <input type="time" value={editingMilestone.scheduledTime} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, scheduledTime: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-sm" />
                    <select value={editingMilestone.status} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, status: event.target.value as FuneralCaseMilestone['status'] }))} className="rounded border border-slate-300 px-2 py-1 text-sm">
                      <option value="pending">Pending</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                    </select>
                    <select value={editingMilestone.assignedStaffId} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, assignedStaffId: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-sm">
                      <option value="">Assign staff</option>
                      {availableStaff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                    <select value={editingMilestone.assignedVehicleId} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, assignedVehicleId: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-sm">
                      <option value="">Assign vehicle</option>
                      {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg} · {vehicle.type}</option>)}
                    </select>
                    <input value={editingMilestone.notes} onChange={(event) => setEditingMilestone((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" className="rounded border border-slate-300 px-2 py-1 text-sm md:col-span-3" />
                    <div className="flex items-center gap-2 md:col-span-3">
                      <button onClick={() => void saveEditMilestone()} className="text-sm text-green-700">Save</button>
                      <button onClick={() => setEditingMilestoneId(null)} className="text-sm text-slate-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{milestone.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${milestoneStatusColors[milestone.status]}`}>{milestone.status}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {milestoneTypeLabels[milestone.type]}{milestone.scheduledDate ? ` · ${milestone.scheduledDate}` : ''}{milestone.scheduledTime ? ` ${milestone.scheduledTime}` : ''}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {assignedStaff ? `Staff: ${assignedStaff.displayName}` : 'Staff: unassigned'}
                        {assignedVehicle ? ` · Vehicle: ${assignedVehicle.reg}` : ' · Vehicle: unassigned'}
                      </div>
                      {milestone.notes && <div className="mt-1 text-xs text-slate-500">{milestone.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button onClick={() => startEditMilestone(milestone)} className="text-slate-500 hover:text-slate-700">Edit</button>
                      {milestone.status !== 'completed' && <button onClick={() => void completeMilestone(milestone)} className="text-green-700 hover:text-green-800">Complete</button>}
                      <button onClick={() => void removeMilestone(milestone.id)} className="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select value={newMilestone.type} onChange={(event) => setNewMilestone((prev) => ({ ...prev, type: event.target.value as FuneralCaseMilestone['type'], title: milestoneTypeLabels[event.target.value as FuneralCaseMilestone['type']] }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {Object.entries(milestoneTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input value={newMilestone.title} onChange={(event) => setNewMilestone((prev) => ({ ...prev, title: event.target.value }))} placeholder="Milestone title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <input type="date" value={newMilestone.scheduledDate} onChange={(event) => setNewMilestone((prev) => ({ ...prev, scheduledDate: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="time" value={newMilestone.scheduledTime} onChange={(event) => setNewMilestone((prev) => ({ ...prev, scheduledTime: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={newMilestone.status} onChange={(event) => setNewMilestone((prev) => ({ ...prev, status: event.target.value as FuneralCaseMilestone['status'] }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
          <select value={newMilestone.assignedStaffId} onChange={(event) => setNewMilestone((prev) => ({ ...prev, assignedStaffId: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Assign staff</option>
            {availableStaff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <select value={newMilestone.assignedVehicleId} onChange={(event) => setNewMilestone((prev) => ({ ...prev, assignedVehicleId: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Assign vehicle</option>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg} · {vehicle.type}</option>)}
          </select>
          <input value={newMilestone.notes} onChange={(event) => setNewMilestone((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3" />
        </div>
        <button onClick={() => void createMilestone()} className="mt-3 text-sm text-red-600 hover:text-red-800">+ Add Milestone</button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Task Checklist</h3>
            <span className="text-sm text-slate-500">{completedCount}/{tasks.length} complete</span>
          </div>
          <div className="mb-4 h-2 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }} />
          </div>
          <div className="space-y-2">
            {tasks.map((task) => {
              const linkedMilestone = milestones.find((milestone) => milestone.id === task.milestoneId);
              return (
                <div key={task.id} className={`flex items-center gap-3 rounded-lg border p-3 ${task.completed ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <button type="button" onClick={() => void toggleTask(task.id)}>
                    {task.completed ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} className="text-slate-400" />}
                  </button>
                  <div className="flex-1">
                    <span className={`text-sm ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</span>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {task.category && <span className="capitalize">{task.category.replace('_', ' ')}</span>}
                      {task.assignee && <span className="ml-2">Assigned to {task.assignee}</span>}
                      {task.dueDate && <span className="ml-2">Due: {task.dueDate}</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {linkedMilestone && <span>Milestone: {linkedMilestone.title}</span>}
                      {task.completedAt && <span className="ml-2">Completed: {task.completedAt}</span>}
                      {task.completedBy && <span className="ml-2">By: {task.completedBy}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => void removeTask(task.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-5">
            <input value={newTask.title} onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))} placeholder="Task title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
            <input value={newTask.assignee} onChange={(event) => setNewTask((prev) => ({ ...prev, assignee: event.target.value }))} placeholder="Assignee" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input type="date" value={newTask.dueDate} onChange={(event) => setNewTask((prev) => ({ ...prev, dueDate: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={newTask.category} onChange={(event) => setNewTask((prev) => ({ ...prev, category: event.target.value as NonNullable<CaseTask['category']> }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="documentation">Documentation</option>
              <option value="logistics">Logistics</option>
              <option value="family_support">Family Support</option>
              <option value="ceremony">Ceremony</option>
              <option value="finance">Finance</option>
            </select>
            <select value={newTask.milestoneId} onChange={(event) => setNewTask((prev) => ({ ...prev, milestoneId: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2">
              <option value="">No linked milestone</option>
              {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}
            </select>
          </div>
          <button onClick={() => void addTask()} className="mt-3 text-sm text-red-600 hover:text-red-800">+ Add Task</button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Notes</h3>
          <div className="mb-4 space-y-2">
            {fc.notes.map((note, index) => (
              <div key={`${note}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                <span>{note}</span>
                <button type="button" onClick={() => void removeNote(index)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newNote} onChange={(event) => setNewNote(event.target.value)} type="text" placeholder="Add a note..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => void addNote()} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Add</button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Users size={16} /> Staff Assigned</h3>
          <div className="mb-4 space-y-2">
            {(fc.staff || []).map((staff) => (
              <div key={staff.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
                {editingStaffId === staff.id ? (
                  <div className="flex w-full items-center gap-2">
                    <div className="flex-1 text-xs text-slate-500">{staff.displayName}</div>
                    <input value={editingStaffRole} onChange={(event) => setEditingStaffRole(event.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <button onClick={() => void saveEditStaff()} className="text-xs text-green-700">Save</button>
                    <button onClick={() => setEditingStaffId(null)} className="text-xs text-slate-500">Cancel</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="font-medium">{staff.displayName}</div>
                      <div className="text-xs text-slate-400">{staff.role}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditStaff(staff.id, staff.role)} className="text-xs text-slate-500 hover:text-slate-700">Edit</button>
                      <button onClick={() => void removeStaff(staff.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(fc.staff || []).length === 0 && <div className="text-sm text-slate-400">No staff assigned yet.</div>}
          </div>
          <div className="space-y-2">
            <select value={newStaff.staffUserId} onChange={(event) => setNewStaff((prev) => ({ ...prev, staffUserId: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select branch staff</option>
              {availableStaff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <input value={newStaff.role} onChange={(event) => setNewStaff((prev) => ({ ...prev, role: event.target.value }))} placeholder="Role" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => void createStaff()} className="text-sm text-red-600 hover:text-red-800">+ Assign Staff</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Truck size={16} /> Vehicles</h3>
          <div className="mb-4 space-y-2">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border-b border-slate-100 py-1.5 text-sm last:border-0">
                {editingVehicleId === vehicle.id ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <input value={editingVehicle.reg} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, reg: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={editingVehicle.type} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, type: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={editingVehicle.driver} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, driver: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={editingVehicle.capacity} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, capacity: event.target.value }))} placeholder="Capacity" className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={editingVehicle.purpose} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, purpose: event.target.value }))} placeholder="Purpose" className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <select value={editingVehicle.availabilityStatus} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, availabilityStatus: event.target.value as 'available' | 'allocated' | 'maintenance' }))} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="available">available</option>
                      <option value="allocated">allocated</option>
                      <option value="maintenance">maintenance</option>
                    </select>
                    <div className="flex items-center gap-2 md:col-span-3">
                      <button onClick={() => void saveEditVehicle()} className="text-xs text-green-700">Save</button>
                      <button onClick={() => setEditingVehicleId(null)} className="text-xs text-slate-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{vehicle.reg}</div>
                      <div className="text-xs text-slate-400">{vehicle.type} · {vehicle.driver}</div>
                      <div className="text-xs text-slate-400">{vehicle.purpose || 'No purpose'} · {vehicle.availabilityStatus || 'allocated'}{vehicle.capacity ? ` · ${vehicle.capacity} seats` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditVehicle(vehicle)} className="text-xs text-slate-500 hover:text-slate-700">Edit</button>
                      <button onClick={() => void removeVehicle(vehicle.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {vehicles.length === 0 && <div className="text-sm text-slate-400">No vehicles assigned yet.</div>}
          </div>
          <div className="space-y-2">
            <input value={newVehicle.reg} onChange={(event) => setNewVehicle((prev) => ({ ...prev, reg: event.target.value }))} placeholder="Registration" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newVehicle.type} onChange={(event) => setNewVehicle((prev) => ({ ...prev, type: event.target.value }))} placeholder="Vehicle type" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newVehicle.driver} onChange={(event) => setNewVehicle((prev) => ({ ...prev, driver: event.target.value }))} placeholder="Driver" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newVehicle.capacity} onChange={(event) => setNewVehicle((prev) => ({ ...prev, capacity: event.target.value }))} placeholder="Capacity" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newVehicle.purpose} onChange={(event) => setNewVehicle((prev) => ({ ...prev, purpose: event.target.value }))} placeholder="Purpose" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={newVehicle.availabilityStatus} onChange={(event) => setNewVehicle((prev) => ({ ...prev, availabilityStatus: event.target.value as 'available' | 'allocated' | 'maintenance' }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="available">Available</option>
              <option value="allocated">Allocated</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <button onClick={() => void createVehicle()} className="text-sm text-red-600 hover:text-red-800">+ Assign Vehicle</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Building2 size={16} /> Suppliers</h3>
          <div className="mb-4 space-y-2">
            {(fc.suppliers || []).map((supplier) => (
              <div key={supplier.id} className="border-b border-slate-100 py-1.5 text-sm last:border-0">
                {editingSupplierId === supplier.id ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <input value={editingSupplier.name} onChange={(event) => setEditingSupplier((prev) => ({ ...prev, name: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={editingSupplier.service} onChange={(event) => setEditingSupplier((prev) => ({ ...prev, service: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <select value={editingSupplier.status} onChange={(event) => setEditingSupplier((prev) => ({ ...prev, status: event.target.value as 'pending' | 'confirmed' }))} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                    </select>
                    <div className="flex items-center gap-2 md:col-span-3">
                      <button onClick={() => void saveEditSupplier()} className="text-xs text-green-700">Save</button>
                      <button onClick={() => setEditingSupplierId(null)} className="text-xs text-slate-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-xs text-slate-400">{supplier.service}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${supplier.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{supplier.status}</span>
                      <button onClick={() => startEditSupplier(supplier)} className="text-xs text-slate-500 hover:text-slate-700">Edit</button>
                      <button onClick={() => void removeSupplier(supplier.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(fc.suppliers || []).length === 0 && <div className="text-sm text-slate-400">No suppliers assigned yet.</div>}
          </div>
          <div className="space-y-2">
            <input value={newSupplier.name} onChange={(event) => setNewSupplier((prev) => ({ ...prev, name: event.target.value }))} placeholder="Supplier name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newSupplier.service} onChange={(event) => setNewSupplier((prev) => ({ ...prev, service: event.target.value }))} placeholder="Service" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={newSupplier.status} onChange={(event) => setNewSupplier((prev) => ({ ...prev, status: event.target.value as 'pending' | 'confirmed' }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
            <button onClick={() => void createSupplier()} className="text-sm text-red-600 hover:text-red-800">+ Add Supplier</button>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><FileText size={16} /> Documents ({caseDocs.length})</h3>
          <button className="flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:text-red-800">
            <Upload size={14} /> Upload
          </button>
        </div>
        {caseDocs.length > 0 ? (
          <div className="space-y-2">
            {caseDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <File size={16} className="text-slate-400" />
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-slate-400">Uploaded by {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}</div>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${typeColors[doc.type] || 'bg-slate-100 text-slate-600'}`}>{typeLabels[doc.type] || doc.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-slate-400">No documents uploaded for this case yet</div>
        )}
        <div className="mt-4 cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 transition-colors hover:border-red-300">
          Drop files here or <span className="text-red-600">browse</span> · PDF, JPG, PNG up to 10 MB
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><MessageSquare size={16} /> Communication Log</h3>
        <div className="mb-4 space-y-2">
          {caseCommunications.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${entry.type === 'sms' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>{entry.type}</span>
              <div className="flex-1">
                <div className="mb-0.5 text-xs font-medium text-slate-500">To: {entry.recipientName} ({entry.recipientContact}) · {entry.sentAt}</div>
                <div className="text-slate-700">{entry.metadata?.renderedBody || entry.template}</div>
              </div>
            </div>
          ))}
          {caseCommunications.length === 0 && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-400">No case-related communications have been logged yet.</div>}
        </div>
        <Link to="/communications/new" className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800">
          <MessageSquare size={14} /> Send Communication
        </Link>
      </div>
    </div>
  );
}