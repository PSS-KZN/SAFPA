import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { User, UserRole, Branch } from '../../types';
import { fetchBranches } from '../../services/branchesApi';
import { createUser, fetchUsers, updateUser } from '../../services/usersApi';

const roleLabels: Record<UserRole, string> = {
  safpa_admin: 'SAFPA Admin',
  parlour_owner: 'Parlour Owner',
  branch_manager: 'Branch Manager',
  policy_admin: 'Policy Admin',
  collections_clerk: 'Collections Clerk',
  operations_coordinator: 'Operations Coordinator',
  policyholder_customer: 'Policyholder / Customer',
};

const managedRoles: UserRole[] = [
  'parlour_owner',
  'branch_manager',
  'policy_admin',
  'collections_clerk',
  'operations_coordinator',
];

type UserFormState = {
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  status: User['status'];
};

const initialForm: UserFormState = {
  name: '',
  email: '',
  role: 'policy_admin',
  branchId: '',
  status: 'active',
};

const guidance = [
  'Assign the right role before granting system access.',
  'Use a branch only when the user should be scoped operationally.',
  'Keep status active only for staff ready to log in immediately.',
];

type UserField = keyof UserFormState;
type UserFieldErrors = Partial<Record<UserField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUserField(field: UserField, value: string): string | undefined {
  const trimmed = value.trim();

  if (field === 'email') {
    if (!trimmed) {
      return 'Email is required.';
    }
    if (!emailPattern.test(trimmed)) {
      return 'Enter a valid email address.';
    }
    return undefined;
  }

  if (field === 'name') {
    if (!trimmed) {
      return 'Name is required.';
    }
    if (trimmed.length < 2) {
      return 'Enter at least 2 characters.';
    }
  }

  return undefined;
}

function validateUserForm(form: UserFormState): UserFieldErrors {
  return {
    name: validateUserField('name', form.name),
    email: validateUserField('email', form.email),
  };
}

function hasUserErrors(errors: UserFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export default function UserEditor() {
  const { id } = useParams();
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const parlourId = currentUser.parlourId || 'p1';
  const isEditing = Boolean(id);
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<UserField, boolean>>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [userRecords, branchRecords] = await Promise.all([fetchUsers(parlourId), fetchBranches(parlourId)]);
        setBranches(branchRecords);

        if (id) {
          const existing = userRecords.find((user) => user.id === id);
          if (!existing) {
            setError('User not found.');
            return;
          }

          setForm({
            name: existing.name,
            email: existing.email,
            role: existing.role,
            branchId: existing.branchId || '',
            status: existing.status,
          });
          return;
        }

        setForm((previous) => ({
          ...previous,
          branchId: previous.branchId || branchRecords[0]?.id || '',
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load user form');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, parlourId]);

  const updateForm = <K extends keyof UserFormState>(field: K, value: UserFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (field === 'name' || field === 'email') {
      setFieldErrors((previous) => ({ ...previous, [field]: validateUserField(field, value) }));
    }
  };

  const markTouched = (field: UserField) => {
    setTouched((previous) => ({ ...previous, [field]: true }));
    if (field === 'name' || field === 'email') {
      setFieldErrors((previous) => ({ ...previous, [field]: validateUserField(field, form[field]) }));
    }
  };

  const inputClassName = (field: 'name' | 'email') => `w-full rounded-xl border px-3 py-2.5 text-sm ${touched[field] && fieldErrors[field] ? 'border-red-300 bg-red-50/40' : 'border-slate-300'}`;

  const saveUser = async () => {
    const nextErrors = validateUserForm(form);
    setFieldErrors(nextErrors);
    setTouched((previous) => ({ ...previous, name: true, email: true }));

    if (hasUserErrors(nextErrors)) {
      setError(null);
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      branchId: form.branchId || undefined,
      status: form.status,
      parlourId,
    };

    try {
      setSaving(true);
      setError(null);

      if (id) {
        await updateUser(id, payload);
      } else {
        await createUser(payload);
      }

      navigate('/parlour/users');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/parlour/users" className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800">
        <ArrowLeft size={16} /> Back to Users
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
          <Shield size={14} /> Access Setup
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{isEditing ? 'Edit User' : 'Add User'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Move staff setup into a full page so role, status, and branch assignment are easier to verify before saving.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading user form...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">User Details</h2>
              <p className="mt-1 text-sm text-slate-500">Define identity, access role, and optional branch scope.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Name*</label>
                <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} onBlur={() => markTouched('name')} className={inputClassName('name')} />
                {touched.name && fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Email*</label>
                <input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} onBlur={() => markTouched('email')} className={inputClassName('email')} />
                {touched.email && fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Role*</label>
                <select value={form.role} onChange={(event) => updateForm('role', event.target.value as UserRole)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  {managedRoles.map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Branch</label>
                <select value={form.branchId} onChange={(event) => updateForm('branchId', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">No branch restriction</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Status</label>
                <select value={form.status} onChange={(event) => updateForm('status', event.target.value as User['status'])} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/parlour/users" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-600">Cancel</Link>
              <button onClick={() => void saveUser()} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Saving User...' : isEditing ? 'Save User' : 'Create User'}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">Guidance</div>
            <h2 className="mt-4 text-xl font-semibold">Keep access assignments deliberate.</h2>
            <div className="mt-6 space-y-3">
              {guidance.map((item) => (
                <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}