import { useParams, Link } from 'react-router-dom';
import { payments } from '../../data/payments';
import { ArrowLeft, Printer } from 'lucide-react';

export default function ReceiptView() {
  const { id } = useParams();
  const payment = payments.find((p) => p.id === id);
  if (!payment) return <div className="text-center py-12 text-slate-500">Receipt not found</div>;

  return (
    <div>
      <Link to="/collections" className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Collections
      </Link>

      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Payment Receipt</h2>
            <p className="text-slate-400 text-sm">SAFPA FPOS</p>
          </div>

          <div className="border-t border-b border-slate-200 py-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono font-medium">{payment.reference}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{payment.date}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Member</span><span className="font-medium">{payment.memberName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Policy Number</span><span className="font-mono text-xs">{payment.policyNumber}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Payment Method</span><span className="capitalize">{payment.method.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${payment.status === 'successful' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{payment.status}</span>
            </div>
          </div>

          <div className="py-4 text-center">
            <p className="text-3xl font-bold">R{payment.amount.toLocaleString()}</p>
          </div>

          <button onClick={() => window.print()} className="w-full mt-4 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

