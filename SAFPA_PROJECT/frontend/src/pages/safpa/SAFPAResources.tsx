import { useEffect, useState, type ReactNode } from 'react';
import { BookOpen, Bell, Users, FileText, Star, Download, Search, Plus } from 'lucide-react';
import type { Resource } from '../../types';
import { fetchResources } from '../../services/resourcesApi';

const typeConfig: Record<string, { label: string; color: string; icon: ReactNode }> = {
  notice:   { label: 'Notice',   color: 'bg-red-100 text-red-700',   icon: <Bell size={14} /> },
  training: { label: 'Training', color: 'bg-violet-100 text-violet-700', icon: <BookOpen size={14} /> },
  partner:  { label: 'Partner',  color: 'bg-amber-100 text-amber-700',  icon: <Users size={14} /> },
  policy:   { label: 'Policy',   color: 'bg-red-100 text-red-700',      icon: <FileText size={14} /> },
  template: { label: 'Template', color: 'bg-green-100 text-green-700',  icon: <Star size={14} /> },
};

export default function SAFPAResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const records = await fetchResources();
        setResources(records);
      } catch {
        setResources([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const types = ['all', 'notice', 'training', 'partner', 'policy', 'template'] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Resources & Notices</h1>
          <p className="text-sm text-slate-500 mt-1">Publish notices, training materials, and partner information for member parlours</p>
        </div>
        <button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
          <Plus size={16} /> Publish Resource
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize ${filterType === t ? 'bg-white shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(['notice', 'training', 'partner', 'policy', 'template'] as const).map((t) => {
          const count = resources.filter((r) => r.type === t).length;
          const cfg = typeConfig[t];
          return (
            <div key={t} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cfg.color}`}>{cfg.icon}</div>
              <div>
                <p className="text-xs text-slate-500 capitalize">{cfg.label}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading resources...</div>}

      {/* Resources grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((r) => {
          const cfg = typeConfig[r.type];
          return (
            <div key={r.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:border-red-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                <span className="text-xs text-slate-400">{r.publishedAt}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{r.title}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{r.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {r.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  {r.fileSize && <span className="text-xs text-slate-400">{r.fileSize}</span>}
                  <button className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium">
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                Published by {r.publishedBy}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-400">No resources found</div>
        )}
      </div>
    </div>
  );
}

