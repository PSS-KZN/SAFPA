import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useRole } from '../../contexts/RoleContext';
import { bulkImportMembersFile, getBulkImportErrorFileUrl, type BulkImportResult } from '../../services/membersApi';

export default function BulkImport() {
  const { currentUser } = useRole();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const importRows = async () => {
    if (!file) {
      setMessage('Please select a CSV or XLSX file first.');
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      const response = await bulkImportMembersFile(
        currentUser.parlourId || 'p1',
        currentUser.branchId || 'b1',
        file
      );
      setResult(response);
      setMessage(`Imported ${response.createdCount}/${response.totalRows} rows.`);
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : 'Failed to import rows');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link to="/members" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Members
      </Link>
      <h1 className="text-2xl font-bold mb-6">Bulk Import Members</h1>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 max-w-3xl">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
          <Upload size={40} className="mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium mb-2">Upload CSV or Excel file</p>
          <p className="text-sm text-slate-500 mb-4">Accepted formats: .csv, .xlsx, .xls</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setFile(nextFile);
              setResult(null);
              setMessage(nextFile ? `Selected file: ${nextFile.name}` : null);
            }}
            className="block mx-auto text-sm"
          />
          <div className="mt-4">
            <button disabled={submitting || !file} onClick={() => void importRows()} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-60">
              {submitting ? 'Importing...' : 'Import File'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          <p>Required columns: firstName, lastName, idNumber, phone</p>
          <p>Optional columns: email, address, city, province, branchId</p>
        </div>

        {message && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</div>}

        {result && (
          <div className="mt-4 rounded-lg border border-slate-200 p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 text-green-700"><CheckCircle size={16} /> Import finished</div>
            <p>Total rows: {result.totalRows}</p>
            <p>Created: {result.createdCount}</p>
            <p>Errors: {result.errorCount}</p>
            {result.errorFileToken && (
              <a href={getBulkImportErrorFileUrl(result.errorFileToken)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-red-600 hover:text-red-800">
                <AlertCircle size={14} /> Download error file
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

