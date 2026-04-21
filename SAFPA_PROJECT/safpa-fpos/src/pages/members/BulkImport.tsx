import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const sampleRows = [
  { firstName: 'David', lastName: 'Moloi', idNumber: '9001015800060', phone: '079 111 2222', email: 'david.m@gmail.com', status: 'valid' },
  { firstName: 'Patricia', lastName: 'Mabaso', idNumber: '8502015800061', phone: '082 333 4444', email: '', status: 'valid' },
  { firstName: '', lastName: 'Pretorius', idNumber: '7803015800062', phone: '071 555 6666', email: 'james@outlook.com', status: 'error' },
  { firstName: 'Amina', lastName: 'Patel', idNumber: '91010158', phone: '083 777 8888', email: 'amina@yahoo.com', status: 'error' },
  { firstName: 'Thabiso', lastName: 'Mashaba', idNumber: '8801015800063', phone: '060 999 0000', email: '', status: 'valid' },
];

export default function BulkImport() {
  const [uploaded, setUploaded] = useState(false);

  return (
    <div>
      <Link to="/members" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Members
      </Link>
      <h1 className="text-2xl font-bold mb-6">Bulk Import Members</h1>

      {!uploaded ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 max-w-2xl">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
            <Upload size={40} className="mx-auto mb-4 text-slate-400" />
            <p className="text-lg font-medium mb-2">Upload CSV or Excel file</p>
            <p className="text-sm text-slate-500 mb-4">Drag and drop your file here, or click to browse</p>
            <button onClick={() => setUploaded(true)} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-red-700">Select File</button>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            <p>Required columns: First Name, Last Name, ID Number, Phone</p>
            <p>Optional columns: Email, Address, City, Province</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Preview — members_import.csv</h3>
              <p className="text-sm text-slate-500">{sampleRows.length} rows • {sampleRows.filter((r) => r.status === 'valid').length} valid • {sampleRows.filter((r) => r.status === 'error').length} errors</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setUploaded(false)} className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => alert('Import started! (Demo)')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Import Valid Rows</button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">First Name</th>
                <th className="px-4 py-2">Last Name</th>
                <th className="px-4 py-2">ID Number</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((r, i) => (
                <tr key={i} className={`border-t border-slate-100 ${r.status === 'error' ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{r.firstName || <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12} /> Missing</span>}</td>
                  <td className="px-4 py-2">{r.lastName}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.idNumber.length !== 13 ? <span className="text-red-500">{r.idNumber} <AlertCircle size={12} className="inline" /></span> : r.idNumber}</td>
                  <td className="px-4 py-2">{r.phone}</td>
                  <td className="px-4 py-2">{r.email || '—'}</td>
                  <td className="px-4 py-2">
                    {r.status === 'valid' ? (
                      <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Valid</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1"><AlertCircle size={14} /> Error</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

