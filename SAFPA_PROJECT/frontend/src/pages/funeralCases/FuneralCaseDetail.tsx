import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckSquare, Square, Upload, File, Users, Truck, Building2, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRole } from '../../contexts/RoleContext';
import type { Document, FuneralCase, FuneralCaseStaff, FuneralCaseSupplier, FuneralCaseVehicle } from '../../types';
import { fetchDocuments } from '../../services/documentsApi';
import {
  addFuneralCaseNote,
  addFuneralCaseStaff,
  addFuneralCaseSupplier,
  addFuneralCaseTask,
  addFuneralCaseVehicle,
  deleteFuneralCase,
  deleteFuneralCaseNote,
  deleteFuneralCaseStaff,
  deleteFuneralCaseSupplier,
  deleteFuneralCaseTask,
  deleteFuneralCaseVehicle,
  fetchFuneralCase,
  updateFuneralCase,
  updateFuneralCaseStaff,
  updateFuneralCaseStatus,
  updateFuneralCaseSupplier,
  updateFuneralCaseTask,
  updateFuneralCaseVehicle,
} from '../../services/funeralCasesApi';

const statusColors: Record<string, string> = {
  logged: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
};

const DEMO_STAFF: FuneralCaseStaff[] = [
  { id: 'demo-staff-1', name: 'Sibongile Mthembu', role: 'Coordinator' },
  { id: 'demo-staff-2', name: 'Thabo Mokoena', role: 'Pallbearer Lead' },
  { id: 'demo-staff-3', name: 'Zanele Mkhize', role: 'Family Liaison' },
];

const DEMO_VEHICLES: FuneralCaseVehicle[] = [
  { id: 'demo-vehicle-1', reg: 'GP 123-456', type: 'Hearse', driver: 'Solomon Dube' },
  { id: 'demo-vehicle-2', reg: 'GP 789-012', type: 'Family Car', driver: 'TBC' },
];

const DEMO_SUPPLIERS: FuneralCaseSupplier[] = [
  { id: 'demo-supplier-1', name: 'Graceland Coffins', service: 'Coffin Supply', status: 'confirmed' },
  { id: 'demo-supplier-2', name: 'Divine Flowers', service: 'Floral Arrangements', status: 'pending' },
];

function isDemoCase(record: FuneralCase): boolean {
  return record.id.startsWith('fcdemo_') || record.caseNumber.startsWith('FC-DEMO');
}

export default function FuneralCaseDetail() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const { id } = useParams();
  const [fc, setFc] = useState<FuneralCase | null>(null);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; completed: boolean; assignee?: string; dueDate?: string }>>([]);
  const [caseForm, setCaseForm] = useState({
    deceasedName: '',
    deceasedIdNumber: '',
    dateOfDeath: '',
    funeralDate: '',
    venue: '',
    coordinatorName: '',
    caseType: 'policy' as FuneralCase['caseType'],
    status: 'logged' as FuneralCase['status'],
  });
  const [newTask, setNewTask] = useState({ title: '', assignee: '', dueDate: '' });
  const [newNote, setNewNote] = useState('');
  const [newStaff, setNewStaff] = useState({ name: '', role: '' });
  const [newVehicle, setNewVehicle] = useState({ reg: '', type: '', driver: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '', service: '', status: 'pending' as 'pending' | 'confirmed' });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState({ name: '', role: '' });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState({ reg: '', type: '', driver: '' });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState({ name: '', service: '', status: 'pending' as 'pending' | 'confirmed' });
  const [caseDocs, setCaseDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const [caseRecord, documentRecords] = await Promise.all([
          fetchFuneralCase(id),
          fetchDocuments({ parlourId, entityType: 'funeral_case', entityId: id }),
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
              // Keep original record if hydration fails.
            }
          }
        }

        if (currentUser.role === 'branch_manager' && currentUser.branchId && resolvedCase.branchId !== currentUser.branchId) {
          setFc(null);
          return;
        }

        setFc(resolvedCase);
        setTasks(resolvedCase.tasks || []);
        setCaseForm({
          deceasedName: resolvedCase.deceasedName,
          deceasedIdNumber: resolvedCase.deceasedIdNumber,
          dateOfDeath: resolvedCase.dateOfDeath,
          funeralDate: resolvedCase.funeralDate || '',
          venue: resolvedCase.venue || '',
          coordinatorName: resolvedCase.coordinatorName,
          caseType: resolvedCase.caseType,
          status: resolvedCase.status,
        });
        setCaseDocs(documentRecords);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load funeral case');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, currentUser.parlourId, currentUser.role, currentUser.branchId]);

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

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading case...</div>;
  }

  if (!fc) {
    return <div className="text-center py-12 text-slate-500">Case not found</div>;
  }

  const toggleTask = async (taskId: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) {
      return;
    }

    try {
      setError(null);
      const updated = await updateFuneralCaseTask(fc.id, taskId, { completed: !target.completed });
      setFc(updated);
      setTasks(updated.tasks || []);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to update task');
    }
  };

  const applyUpdatedCase = (updated: FuneralCase) => {
    setFc(updated);
    setTasks(updated.tasks || []);
  };

  const saveCaseDetails = async () => {
    if (!fc) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updated = await updateFuneralCase(fc.id, {
        deceasedName: caseForm.deceasedName,
        deceasedIdNumber: caseForm.deceasedIdNumber,
        dateOfDeath: caseForm.dateOfDeath,
        funeralDate: caseForm.funeralDate || undefined,
        venue: caseForm.venue || undefined,
        coordinatorName: caseForm.coordinatorName,
        caseType: caseForm.caseType,
      });

      if (caseForm.status !== updated.status) {
        const statusUpdated = await updateFuneralCaseStatus(fc.id, caseForm.status);
        setFc(statusUpdated);
        setTasks(statusUpdated.tasks || []);
      } else {
        setFc(updated);
        setTasks(updated.tasks || []);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save funeral case');
    } finally {
      setSaving(false);
    }
  };

  const addTask = async () => {
    if (!fc || !newTask.title.trim()) {
      return;
    }

    try {
      setError(null);
      const updated = await addFuneralCaseTask(fc.id, {
        title: newTask.title.trim(),
        assignee: newTask.assignee || undefined,
        dueDate: newTask.dueDate || undefined,
      });
      setFc(updated);
      setTasks(updated.tasks || []);
      setNewTask({ title: '', assignee: '', dueDate: '' });
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to add task');
    }
  };

  const removeTask = async (taskId: string) => {
    if (!fc) {
      return;
    }

    try {
      setError(null);
      const updated = await deleteFuneralCaseTask(fc.id, taskId);
      setFc(updated);
      setTasks(updated.tasks || []);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Failed to delete task');
    }
  };

  const addNote = async () => {
    if (!fc || !newNote.trim()) {
      return;
    }

    try {
      setError(null);
      const updated = await addFuneralCaseNote(fc.id, newNote.trim());
      setFc(updated);
      setTasks(updated.tasks || []);
      setNewNote('');
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Failed to add note');
    }
  };

  const removeNote = async (index: number) => {
    if (!fc) {
      return;
    }

    try {
      setError(null);
      const updated = await deleteFuneralCaseNote(fc.id, index);
      setFc(updated);
      setTasks(updated.tasks || []);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Failed to delete note');
    }
  };

  const removeCase = async () => {
    if (!fc) {
      return;
    }

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

  const createStaff = async () => {
    if (!fc || !newStaff.name.trim() || !newStaff.role.trim()) {
      return;
    }

    try {
      const updated = await addFuneralCaseStaff(fc.id, { name: newStaff.name.trim(), role: newStaff.role.trim() });
      applyUpdatedCase(updated);
      setNewStaff({ name: '', role: '' });
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : 'Failed to add staff');
    }
  };

  const startEditStaff = (staffId: string, currentName: string, currentRole: string) => {
    setEditingStaffId(staffId);
    setEditingStaff({ name: currentName, role: currentRole });
  };

  const saveEditStaff = async () => {
    if (!fc || !editingStaffId || !editingStaff.name.trim() || !editingStaff.role.trim()) {
      return;
    }

    try {
      const updated = await updateFuneralCaseStaff(fc.id, editingStaffId, {
        name: editingStaff.name.trim(),
        role: editingStaff.role.trim(),
      });
      applyUpdatedCase(updated);
      setEditingStaffId(null);
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : 'Failed to update staff');
    }
  };

  const removeStaff = async (staffId: string) => {
    if (!fc) {
      return;
    }

    try {
      const updated = await deleteFuneralCaseStaff(fc.id, staffId);
      applyUpdatedCase(updated);
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : 'Failed to delete staff');
    }
  };

  const createVehicle = async () => {
    if (!fc || !newVehicle.reg.trim() || !newVehicle.type.trim() || !newVehicle.driver.trim()) {
      return;
    }

    try {
      const updated = await addFuneralCaseVehicle(fc.id, {
        reg: newVehicle.reg.trim(),
        type: newVehicle.type.trim(),
        driver: newVehicle.driver.trim(),
      });
      applyUpdatedCase(updated);
      setNewVehicle({ reg: '', type: '', driver: '' });
    } catch (vehicleError) {
      setError(vehicleError instanceof Error ? vehicleError.message : 'Failed to add vehicle');
    }
  };

  const startEditVehicle = (vehicleId: string, reg: string, type: string, driver: string) => {
    setEditingVehicleId(vehicleId);
    setEditingVehicle({ reg, type, driver });
  };

  const saveEditVehicle = async () => {
    if (!fc || !editingVehicleId || !editingVehicle.reg.trim() || !editingVehicle.type.trim() || !editingVehicle.driver.trim()) {
      return;
    }

    try {
      const updated = await updateFuneralCaseVehicle(fc.id, editingVehicleId, {
        reg: editingVehicle.reg.trim(),
        type: editingVehicle.type.trim(),
        driver: editingVehicle.driver.trim(),
      });
      applyUpdatedCase(updated);
      setEditingVehicleId(null);
    } catch (vehicleError) {
      setError(vehicleError instanceof Error ? vehicleError.message : 'Failed to update vehicle');
    }
  };

  const removeVehicle = async (vehicleId: string) => {
    if (!fc) {
      return;
    }

    try {
      const updated = await deleteFuneralCaseVehicle(fc.id, vehicleId);
      applyUpdatedCase(updated);
    } catch (vehicleError) {
      setError(vehicleError instanceof Error ? vehicleError.message : 'Failed to delete vehicle');
    }
  };

  const createSupplier = async () => {
    if (!fc || !newSupplier.name.trim() || !newSupplier.service.trim()) {
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

  const startEditSupplier = (supplierId: string, name: string, service: string, status: 'pending' | 'confirmed') => {
    setEditingSupplierId(supplierId);
    setEditingSupplier({ name, service, status });
  };

  const saveEditSupplier = async () => {
    if (!fc || !editingSupplierId || !editingSupplier.name.trim() || !editingSupplier.service.trim()) {
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
    if (!fc) {
      return;
    }

    try {
      const updated = await deleteFuneralCaseSupplier(fc.id, supplierId);
      applyUpdatedCase(updated);
    } catch (supplierError) {
      setError(supplierError instanceof Error ? supplierError.message : 'Failed to delete supplier');
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div>
      <Link to="/funeral-cases" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Cases
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{fc.caseNumber}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[fc.status]}`}>{fc.status.replace('_', ' ')}</span>
        <button onClick={() => void removeCase()} className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
          Delete Case
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Case Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4">Deceased Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Deceased Name</label>
              <input value={caseForm.deceasedName} onChange={(event) => setCaseForm((prev) => ({ ...prev, deceasedName: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">ID Number</label>
              <input value={caseForm.deceasedIdNumber} onChange={(event) => setCaseForm((prev) => ({ ...prev, deceasedIdNumber: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Date of Death</label>
              <input type="date" value={caseForm.dateOfDeath} onChange={(event) => setCaseForm((prev) => ({ ...prev, dateOfDeath: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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
            <button disabled={saving} onClick={() => void saveCaseDetails()} className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Case Details'}
            </button>
          </div>
          {fc.policyNumber && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600">Linked Policy: <Link to={`/policies/${fc.policyId}`} className="font-mono font-medium hover:underline">{fc.policyNumber}</Link></p>
            </div>
          )}
        </div>

        {/* Task Checklist */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Task Checklist</h3>
            <span className="text-sm text-slate-500">{completedCount}/{tasks.length} complete</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full mb-4">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }} />
          </div>
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${t.completed ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <button type="button" onClick={() => void toggleTask(t.id)}>
                  {t.completed ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} className="text-slate-400" />}
                </button>
                <div className="flex-1">
                  <span className={`text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</span>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {t.assignee && <span>Assigned to {t.assignee}</span>}
                    {t.dueDate && <span className="ml-2">Due: {t.dueDate}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => void removeTask(t.id)} className="text-xs text-red-600 hover:text-red-800">
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <input value={newTask.title} onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))} placeholder="Task title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
            <input value={newTask.assignee} onChange={(event) => setNewTask((prev) => ({ ...prev, assignee: event.target.value }))} placeholder="Assignee" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input type="date" value={newTask.dueDate} onChange={(event) => setNewTask((prev) => ({ ...prev, dueDate: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={() => void addTask()} className="mt-3 text-sm text-red-600 hover:text-red-800">+ Add Task</button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
        <h3 className="font-semibold mb-4">Notes</h3>
        <div className="space-y-2 mb-4">
          {fc.notes.map((n, i) => (
            <div key={i} className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-lg">
              <span>{n}</span>
              <button type="button" onClick={() => void removeNote(i)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newNote} onChange={(event) => setNewNote(event.target.value)} type="text" placeholder="Add a note..." className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          <button onClick={() => void addNote()} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">Add</button>
        </div>
      </div>

      {/* Resources & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Staff assigned */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users size={16} /> Staff Assigned</h3>
          <div className="space-y-2 mb-4">
            {(fc.staff || []).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                {editingStaffId === s.id ? (
                  <div className="flex w-full items-center gap-2">
                    <input value={editingStaff.name} onChange={(event) => setEditingStaff((prev) => ({ ...prev, name: event.target.value }))} className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={editingStaff.role} onChange={(event) => setEditingStaff((prev) => ({ ...prev, role: event.target.value }))} className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <button onClick={() => void saveEditStaff()} className="text-xs text-green-700">Save</button>
                    <button onClick={() => setEditingStaffId(null)} className="text-xs text-slate-500">Cancel</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.role}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditStaff(s.id, s.name, s.role)} className="text-xs text-slate-500 hover:text-slate-700">Edit</button>
                      <button onClick={() => void removeStaff(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(fc.staff || []).length === 0 && <div className="text-sm text-slate-400">No staff assigned yet.</div>}
          </div>
          <div className="space-y-2">
            <input value={newStaff.name} onChange={(event) => setNewStaff((prev) => ({ ...prev, name: event.target.value }))} placeholder="Staff name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newStaff.role} onChange={(event) => setNewStaff((prev) => ({ ...prev, role: event.target.value }))} placeholder="Role" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => void createStaff()} className="text-sm text-red-600 hover:text-red-800">+ Assign Staff</button>
          </div>
        </div>

        {/* Vehicles */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Truck size={16} /> Vehicles</h3>
          <div className="space-y-2 mb-4">
            {(fc.vehicles || []).map((v) => (
              <div key={v.id} className="text-sm py-1.5 border-b border-slate-100 last:border-0">
                {editingVehicleId === v.id ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                    <input value={editingVehicle.reg} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, reg: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs md:col-span-2" />
                    <input value={editingVehicle.type} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, type: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={editingVehicle.driver} onChange={(event) => setEditingVehicle((prev) => ({ ...prev, driver: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => void saveEditVehicle()} className="text-xs text-green-700">Save</button>
                      <button onClick={() => setEditingVehicleId(null)} className="text-xs text-slate-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{v.reg}</div>
                      <div className="text-xs text-slate-400">{v.type} · {v.driver}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditVehicle(v.id, v.reg, v.type, v.driver)} className="text-xs text-slate-500 hover:text-slate-700">Edit</button>
                      <button onClick={() => void removeVehicle(v.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(fc.vehicles || []).length === 0 && <div className="text-sm text-slate-400">No vehicles assigned yet.</div>}
          </div>
          <div className="space-y-2">
            <input value={newVehicle.reg} onChange={(event) => setNewVehicle((prev) => ({ ...prev, reg: event.target.value }))} placeholder="Registration" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newVehicle.type} onChange={(event) => setNewVehicle((prev) => ({ ...prev, type: event.target.value }))} placeholder="Vehicle type" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={newVehicle.driver} onChange={(event) => setNewVehicle((prev) => ({ ...prev, driver: event.target.value }))} placeholder="Driver" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => void createVehicle()} className="text-sm text-red-600 hover:text-red-800">+ Assign Vehicle</button>
          </div>
        </div>

        {/* Suppliers */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 size={16} /> Suppliers</h3>
          <div className="space-y-2 mb-4">
            {(fc.suppliers || []).map((s) => (
              <div key={s.id} className="text-sm py-1.5 border-b border-slate-100 last:border-0">
                {editingSupplierId === s.id ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                    <input value={editingSupplier.name} onChange={(event) => setEditingSupplier((prev) => ({ ...prev, name: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs md:col-span-2" />
                    <input value={editingSupplier.service} onChange={(event) => setEditingSupplier((prev) => ({ ...prev, service: event.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <select value={editingSupplier.status} onChange={(event) => setEditingSupplier((prev) => ({ ...prev, status: event.target.value as 'pending' | 'confirmed' }))} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void saveEditSupplier()} className="text-xs text-green-700">Save</button>
                      <button onClick={() => setEditingSupplierId(null)} className="text-xs text-slate-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.service}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                      <button onClick={() => startEditSupplier(s.id, s.name, s.service, s.status)} className="text-xs text-slate-500 hover:text-slate-700">Edit</button>
                      <button onClick={() => void removeSupplier(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
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

      {/* Documents */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><FileText size={16} /> Documents ({caseDocs.length})</h3>
          <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 border border-red-300 px-3 py-1.5 rounded-lg">
            <Upload size={14} /> Upload
          </button>
        </div>
        {caseDocs.length > 0 ? (
          <div className="space-y-2">
            {caseDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <File size={16} className="text-slate-400" />
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-slate-400">Uploaded by {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[doc.type] || 'bg-slate-100 text-slate-600'}`}>
                  {typeLabels[doc.type] || doc.type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-sm">No documents uploaded for this case yet</div>
        )}
        <div className="mt-4 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-sm text-slate-400 hover:border-red-300 cursor-pointer transition-colors">
          Drop files here or <span className="text-red-600">browse</span> · PDF, JPG, PNG up to 10 MB
        </div>
      </div>

      {/* Communication log */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare size={16} /> Communication Log</h3>
        <div className="space-y-2 mb-4">
          {[
            { type: 'SMS', recipient: 'Nomsa Ndlovu (family)', msg: 'Dear family, case FC-2026-001 has been assigned. Your coordinator is ' + fc.coordinatorName + '.', date: fc.createdAt },
            { type: 'SMS', recipient: 'Nomsa Ndlovu (family)', msg: 'Update: Documentation received. Funeral scheduled for ' + (fc.funeralDate || 'TBC') + '.', date: fc.funeralDate || '' },
          ].filter((c) => c.date).map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${c.type === 'SMS' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>{c.type}</span>
              <div className="flex-1">
                <div className="font-medium text-xs text-slate-500 mb-0.5">To: {c.recipient} · {c.date}</div>
                <div className="text-slate-700">{c.msg}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800">
          <MessageSquare size={14} /> Send Communication
        </button>
      </div>
    </div>
  );
}

