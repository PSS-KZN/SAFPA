import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { members } from '../../data/members';

export default function NewFuneralCase() {
  const [form, setForm] = useState({
    deceasedName: '', deceasedIdNumber: '', dateOfDeath: '',
    caseType: 'policy', funeralDate: '', venue: '',
    memberId: '', coordinatorName: '',
  });
  const [searchMember, setSearchMember] = useState('');
  const [showMemberSearch, setShowMemberSearch] = useState(false);

  const filteredMembers = members.filter((m) =>
    `${m.firstName} ${m.lastName} ${m.idNumber}`.toLowerCase().includes(searchMember.toLowerCase())
  );

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div>
      <Link to="/funeral-cases" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Cases
      </Link>
      <h1 className="text-2xl font-bold mb-6">Log New Funeral Case</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 max-w-2xl">
        <div className="space-y-4">
          <h3 className="font-semibold">Death Notice Information</h3>
          <div><label className="block text-sm text-slate-600 mb-1">Deceased Full Name*</label>
            <input type="text" value={form.deceasedName} onChange={(e) => update('deceasedName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-600 mb-1">ID Number*</label>
              <input type="text" value={form.deceasedIdNumber} onChange={(e) => update('deceasedIdNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" maxLength={13} /></div>
            <div><label className="block text-sm text-slate-600 mb-1">Date of Death*</label>
              <input type="date" value={form.dateOfDeath} onChange={(e) => update('dateOfDeath', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
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
              <select value={form.coordinatorName} onChange={(e) => update('coordinatorName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Select...</option>
                <option value="Sibongile Mthembu">Sibongile Mthembu</option>
                <option value="Zanele Mkhize">Zanele Mkhize</option>
                <option value="Noxolo Mtshali">Noxolo Mtshali</option>
              </select>
            </div>
          </div>

          <div><label className="block text-sm text-slate-600 mb-1">Venue</label>
            <input type="text" value={form.venue} onChange={(e) => update('venue', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Cemetery or church name" /></div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-2">
          <Link to="/funeral-cases" className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Cancel</Link>
          <button onClick={() => alert('Case created! (Demo)')} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Create Case</button>
        </div>
      </div>
    </div>
  );
}

