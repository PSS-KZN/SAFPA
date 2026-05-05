import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { createFuneralCase } from '../../services/funeralCasesApi';
import { fetchMembers } from '../../services/membersApi';
import { fetchUsers } from '../../services/usersApi';
import type { Member, User } from '../../types';

export default function NewFuneralCase() {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    deceasedName: '',
    deceasedIdNumber: '',
    dateOfDeath: '',
    informantName: '',
    informantPhone: '',
    placeOfDeath: '',
    causeOfDeath: '',
    bodyCollected: false,
    bodyCollectionLocation: '',
    caseType: 'policy',
    funeralDate: '',
    venue: '',
    memberId: '',
    coordinatorId: currentUser.id,
    coordinatorName: currentUser.name,
  });
  const [searchMember, setSearchMember] = useState('');
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [staffOptions, setStaffOptions] = useState<User[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const parlourId = currentUser.parlourId || 'p1';
        const [memberRecords, userRecords] = await Promise.all([
          fetchMembers(parlourId),
          fetchUsers(parlourId),
        ]);

        setMembers(memberRecords);
        setStaffOptions(
          userRecords.filter((user) => user.status === 'active' && user.parlourId === parlourId)
        );
      } catch {
        setMembers([]);
        setStaffOptions([]);
      }
    };

    void loadMembers();
  }, [currentUser.id, currentUser.name, currentUser.parlourId]);

  const filteredMembers = members.filter((m) =>
    `${m.firstName} ${m.lastName} ${m.idNumber}`.toLowerCase().includes(searchMember.toLowerCase())
  );

  const update = (field: string, value: string | boolean) => setForm({ ...form, [field]: value });

  const coordinatorChoices = staffOptions.filter((user) => {
    if (user.role === 'safpa_admin') {
      return false;
    }

    if (currentUser.branchId && user.branchId && user.branchId !== currentUser.branchId && currentUser.role === 'branch_manager') {
      return false;
    }

    return true;
  });

  const saveCase = async () => {
    if (!form.deceasedName || !form.deceasedIdNumber || !form.dateOfDeath || !form.informantName || !form.informantPhone || !form.placeOfDeath || !form.coordinatorName) {
      setError('Please complete required case fields.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const created = await createFuneralCase({
        parlourId: currentUser.parlourId || 'p1',
        branchId: currentUser.branchId || 'b1',
        deceasedName: form.deceasedName,
        deceasedIdNumber: form.deceasedIdNumber,
        dateOfDeath: form.dateOfDeath,
        deathNoticeLoggedAt: new Date().toISOString().slice(0, 10),
        deathNoticeLoggedBy: currentUser.name,
        informantName: form.informantName,
        informantPhone: form.informantPhone,
        placeOfDeath: form.placeOfDeath,
        causeOfDeath: form.causeOfDeath || undefined,
        bodyCollected: form.bodyCollected,
        bodyCollectionLocation: form.bodyCollectionLocation || undefined,
        policyId: undefined,
        policyNumber: undefined,
        memberId: form.memberId || undefined,
        coordinatorId: form.coordinatorId,
        coordinatorName: form.coordinatorName,
        status: 'logged',
        funeralDate: form.funeralDate || undefined,
        venue: form.venue || undefined,
        caseType: form.caseType as 'policy' | 'cash' | 'private',
        tasks: [],
        notes: [],
        staff: [],
        vehicles: [],
        suppliers: [],
        milestones: [],
        closureSummary: undefined,
        closureChecklistComplete: false,
        createdAt: new Date().toISOString().slice(0, 10),
      });

      navigate(`/funeral-cases/${created.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create case');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to="/funeral-cases" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Cases
      </Link>
      <h1 className="text-2xl font-bold mb-6">Log New Funeral Case</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 max-w-2xl">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <h3 className="font-semibold">Death Notice Intake</h3>
          <div><label className="block text-sm text-slate-600 mb-1">Deceased Full Name*</label>
            <input type="text" value={form.deceasedName} onChange={(e) => update('deceasedName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-600 mb-1">ID Number*</label>
              <input type="text" value={form.deceasedIdNumber} onChange={(e) => update('deceasedIdNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" maxLength={13} /></div>
            <div><label className="block text-sm text-slate-600 mb-1">Date of Death*</label>
              <input type="date" value={form.dateOfDeath} onChange={(e) => update('dateOfDeath', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="block text-sm text-slate-600 mb-1">Informant Name*</label>
              <input type="text" value={form.informantName} onChange={(e) => update('informantName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-slate-600 mb-1">Informant Phone*</label>
              <input type="tel" value={form.informantPhone} onChange={(e) => update('informantPhone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="block text-sm text-slate-600 mb-1">Place Of Death*</label>
              <input type="text" value={form.placeOfDeath} onChange={(e) => update('placeOfDeath', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-slate-600 mb-1">Cause Of Death</label>
              <input type="text" value={form.causeOfDeath} onChange={(e) => update('causeOfDeath', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto,1fr] md:items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.bodyCollected} onChange={(e) => update('bodyCollected', e.target.checked)} />
              Body already collected
            </label>
            <div><label className="block text-sm text-slate-600 mb-1">Body Collection Location</label>
              <input type="text" value={form.bodyCollectionLocation} onChange={(e) => update('bodyCollectionLocation', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>

          <div><label className="block text-sm text-slate-600 mb-1">Case Type</label>
            <select value={form.caseType} onChange={(e) => update('caseType', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="policy">Policy Claim</option>
              <option value="cash">Cash Service</option>
              <option value="private">Private</option>
            </select>
          </div>

          {form.caseType === 'policy' && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">Link to Policyholder</label>
              <div className="relative">
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2">
                  <Search size={16} className="text-slate-400" />
                  <input type="text" value={searchMember} onChange={(e) => { setSearchMember(e.target.value); setShowMemberSearch(true); }}
                    placeholder="Search member by name or ID..." className="bg-transparent outline-none text-sm flex-1" />
                </div>
                {showMemberSearch && searchMember && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredMembers.map((m) => (
                      <div key={m.id} onClick={() => { update('memberId', m.id); setSearchMember(`${m.firstName} ${m.lastName}`); setShowMemberSearch(false); }}
                        className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                        <span className="font-medium">{m.firstName} {m.lastName}</span>
                        <span className="text-slate-400 ml-2 font-mono text-xs">{m.idNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-600 mb-1">Funeral Date</label>
              <input type="date" value={form.funeralDate} onChange={(e) => update('funeralDate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-slate-600 mb-1">Coordinator</label>
              <select
                value={form.coordinatorId}
                onChange={(e) => {
                  const selected = coordinatorChoices.find((user) => user.id === e.target.value);
                  update('coordinatorId', e.target.value);
                  update('coordinatorName', selected?.name || '');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select...</option>
                {coordinatorChoices.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div><label className="block text-sm text-slate-600 mb-1">Venue</label>
            <input type="text" value={form.venue} onChange={(e) => update('venue', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Cemetery or church name" /></div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-2">
          <Link to="/funeral-cases" className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Cancel</Link>
          <button disabled={saving} onClick={() => void saveCase()} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">{saving ? 'Creating...' : 'Create Case'}</button>
        </div>
      </div>
    </div>
  );
}

