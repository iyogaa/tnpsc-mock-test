import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Users, FileQuestion, BarChart2, Upload, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, LogOut, Loader2, AlertCircle, CheckCircle, Download, Package, Settings } from 'lucide-react';

const TABS = ['Question Sets', 'Mock Tests', 'Candidates', 'Analytics'];

function QuestionSetsTab() {
  const [sets, setSets] = useState([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef();
  const [uploadTarget, setUploadTarget] = useState(null);

  useEffect(() => { adminApi.listSets().then(r => setSets(r.data)).catch(console.error); }, []);

  const createSet = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await adminApi.createSet({ name: newName, description: newDesc });
      const r = await adminApi.listSets();
      setSets(r.data);
      setNewName(''); setNewDesc('');
      setMsg({ type: 'success', text: 'Question set created!' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Error creating set' });
    } finally { setCreating(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadTarget) return;
    setUploading(uploadTarget);
    try {
      const r = await adminApi.uploadQuestions(uploadTarget, file);
      setMsg({ type: 'success', text: `Uploaded ${r.data.added} questions!${r.data.total_errors > 0 ? ` (${r.data.total_errors} errors)` : ''}` });
      const sets = await adminApi.listSets();
      setSets(sets.data);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Upload failed' });
    } finally { setUploading(null); e.target.value = ''; setTimeout(() => setMsg(null), 4000); }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-300' : 'bg-red-900/30 border border-red-500/30 text-red-300'}`}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{msg.text}
        </div>
      )}

      {/* Create new */}
      <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4">Create New Question Set</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Set name (e.g. Full Mock Set 1)"
            className="flex-1 bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
            className="flex-1 bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none" />
          <button onClick={createSet} disabled={creating || !newName.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
          </button>
        </div>
      </div>

      {/* Upload format info */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-xs text-slate-400">
        <p className="text-blue-300 font-semibold mb-2">📥 CSV/Excel Upload Format (Required columns):</p>
        <code className="bg-navy-900 rounded px-2 py-1 text-slate-300">subject | question_text | option_a | option_b | option_c | option_d | correct_option | explanation | difficulty</code>
        <p className="mt-2">subject values: <span className="text-amber-300">Tamil | General Studies | Aptitude & Mental Ability</span></p>
        <p>correct_option: <span className="text-amber-300">A / B / C / D</span></p>
        <p>difficulty: <span className="text-amber-300">easy / medium / hard</span></p>
      </div>

      {/* Sets list */}
      <div className="space-y-3">
        {sets.map(s => (
          <div key={s.id} className="bg-navy-900 border border-navy-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="text-white font-semibold">{s.name}</h4>
                {s.description && <p className="text-slate-400 text-xs mt-0.5">{s.description}</p>}
              </div>
              <span className="text-xs bg-navy-800 text-slate-400 px-2.5 py-1 rounded-full flex-shrink-0">
                {s.question_count} total
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              <span className="bg-rose-900/30 text-rose-300 px-2.5 py-1 rounded-full">Tamil: {s.tamil_count}</span>
              <span className="bg-blue-900/30 text-blue-300 px-2.5 py-1 rounded-full">GS: {s.gs_count}</span>
              <span className="bg-amber-900/30 text-amber-300 px-2.5 py-1 rounded-full">Aptitude: {s.aptitude_count}</span>
            </div>
            <input ref={uploadTarget === s.id ? fileRef : null} type="file" accept=".csv,.xlsx,.xls"
              onChange={handleUpload} className="hidden" id={`upload-${s.id}`} />
            <button
              onClick={() => { setUploadTarget(s.id); document.getElementById(`upload-${s.id}`).click(); }}
              disabled={uploading === s.id}
              className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-300 px-4 py-2 rounded-lg text-xs transition-colors">
              {uploading === s.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Upload Questions (CSV/Excel)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockTestsTab() {
  const [tests, setTests] = useState([]);
  const [sets, setSets] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', question_set_id: '', duration_minutes: 180, tamil_count: 100, gs_count: 75, aptitude_count: 25, randomize_questions: true, randomize_options: false });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    adminApi.listTests().then(r => setTests(r.data)).catch(console.error);
    adminApi.listSets().then(r => setSets(r.data)).catch(console.error);
  }, []);

  const create = async () => {
    if (!form.title || !form.question_set_id) return;
    setCreating(true);
    try {
      await adminApi.createTest({ ...form, question_set_id: parseInt(form.question_set_id) });
      const r = await adminApi.listTests();
      setTests(r.data);
      setForm(f => ({ ...f, title: '', description: '' }));
      setMsg({ type: 'success', text: 'Mock test created!' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Error' });
    } finally { setCreating(false); setTimeout(() => setMsg(null), 3000); }
  };

  const toggle = async (id) => {
    await adminApi.toggleTest(id);
    const r = await adminApi.listTests();
    setTests(r.data);
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-300' : 'bg-red-900/30 border border-red-500/30 text-red-300'}`}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{msg.text}
        </div>
      )}

      {/* Create form */}
      <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4">Create New Mock Test</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Test title *"
            className="bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none" />
          <select value={form.question_set_id} onChange={e => setForm({...form, question_set_id: e.target.value})}
            className="bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none">
            <option value="">Select Question Set *</option>
            {sets.map(s => <option key={s.id} value={s.id}>{s.name} ({s.question_count}q)</option>)}
          </select>
          <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description (optional)"
            className="md:col-span-2 bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none" />
          {[
            { key: 'duration_minutes', label: 'Duration (mins)', min: 30 },
            { key: 'tamil_count', label: 'Tamil Questions', min: 0 },
            { key: 'gs_count', label: 'GS Questions', min: 0 },
            { key: 'aptitude_count', label: 'Aptitude Questions', min: 0 },
          ].map(({key, label, min}) => (
            <div key={key}>
              <label className="text-slate-400 text-xs mb-1 block">{label}</label>
              <input type="number" min={min} value={form[key]} onChange={e => setForm({...form, [key]: parseInt(e.target.value) || 0})}
                className="w-full bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none" />
            </div>
          ))}
          <div className="flex items-center gap-4">
            {[{key:'randomize_questions',label:'Randomize Questions'},{key:'randomize_options',label:'Randomize Options'}].map(({key,label}) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={e => setForm({...form, [key]: e.target.checked})} className="w-4 h-4 accent-blue-500" />
                <span className="text-slate-300 text-xs">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <button onClick={create} disabled={creating || !form.title || !form.question_set_id}
          className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create Mock Test
        </button>
      </div>

      {/* Tests list */}
      <div className="space-y-3">
        {tests.map(t => (
          <div key={t.id} className="bg-navy-900 border border-navy-700 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-white font-semibold truncate">{t.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>{t.duration_minutes}m</span>
                <span>{t.tamil_count + t.gs_count + t.aptitude_count}Q</span>
                <span>Set #{t.question_set_id}</span>
              </div>
            </div>
            <button onClick={() => toggle(t.id)} className={`flex-shrink-0 ${t.is_active ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}>
              {t.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidatesTab() {
  const [candidates, setCandidates] = useState([]);
  useEffect(() => { adminApi.candidates().then(r => setCandidates(r.data)).catch(console.error); }, []);

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-700 bg-navy-800">
            {['Name', 'Email', 'Attempts', 'Registered'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-slate-400 text-xs font-semibold uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map(c => (
            <tr key={c.id} className="border-b border-navy-800 hover:bg-navy-800/50">
              <td className="px-4 py-3 text-slate-200 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-slate-400">{c.email}</td>
              <td className="px-4 py-3 text-blue-400 font-bold">{c.attempts}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {candidates.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No candidates registered yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsTab() {
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => { adminApi.listTests().then(r => { setTests(r.data); if (r.data[0]) setSelected(r.data[0].id); }).catch(console.error); }, []);
  useEffect(() => { if (selected) adminApi.analytics(selected).then(r => setAnalytics(r.data)).catch(console.error); }, [selected]);

  return (
    <div className="space-y-4">
      <select value={selected || ''} onChange={e => setSelected(parseInt(e.target.value))}
        className="bg-navy-800 border border-navy-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none">
        {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>

      {analytics && (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Attempts', val: analytics.total_attempts, color: 'text-blue-400' },
            { label: 'Average Score', val: analytics.average_score || '—', color: 'text-amber-400' },
            { label: 'Highest Score', val: analytics.highest_score || '—', color: 'text-emerald-400' },
            { label: 'Pass Rate', val: analytics.total_attempts ? `${Math.round((analytics.pass_count/analytics.total_attempts)*100)}%` : '—', color: 'text-violet-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-navy-900 border border-navy-700 rounded-xl p-5 text-center">
              <div className={`text-2xl font-bold font-display ${color}`}>{val}</div>
              <div className="text-slate-500 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState(0);

  if (!user || user.role !== 'admin') { nav('/dashboard'); return null; }

  const icons = [Package, Settings, Users, BarChart2];

  return (
    <div className="min-h-screen bg-navy-950">
      <nav className="border-b border-navy-800 bg-navy-900 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Settings size={15} className="text-amber-400" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-sm">Admin Panel</span>
              <p className="text-slate-500 text-xs">TNPSC Mock Test Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => nav('/dashboard')} className="text-xs text-slate-400 hover:text-white transition-colors">Dashboard</button>
            <button onClick={logout} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs transition-colors">
              <LogOut size={14} />Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-navy-900 border border-navy-700 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map((t, i) => {
            const Icon = icons[i];
            return (
              <button key={t} onClick={() => setTab(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  tab === i ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}>
                <Icon size={15} />{t}
              </button>
            );
          })}
        </div>

        {tab === 0 && <QuestionSetsTab />}
        {tab === 1 && <MockTestsTab />}
        {tab === 2 && <CandidatesTab />}
        {tab === 3 && <AnalyticsTab />}
      </div>
    </div>
  );
}
