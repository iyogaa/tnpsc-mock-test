import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { examApi } from '../utils/api';
import { BookOpen, Clock, Award, ChevronRight, BarChart2, LogOut, Trophy, History, Loader2, Play, Users, FileText, Star } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-5">
      <Icon size={20} className={`${color} mb-3`} />
      <div className="text-2xl font-bold text-white font-display">{value}</div>
      <div className="text-slate-400 text-xs mt-0.5">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tests, setTests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([examApi.listTests(), examApi.myHistory()])
      .then(([t, h]) => { setTests(t.data); setHistory(h.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const bestScore = history.length ? Math.max(...history.map(h => h.percentage)) : null;
  const avgScore = history.length ? (history.reduce((a,h) => a + h.percentage, 0) / history.length).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Top nav */}
      <nav className="border-b border-navy-800 bg-navy-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <BookOpen size={16} className="text-blue-400" />
            </div>
            <span className="font-display font-bold text-white text-sm">TNPSC Mock Test</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8 fade-up">
          <h1 className="font-display text-3xl font-bold text-white mb-1">
            வணக்கம், {user?.name}! 👋
          </h1>
          <p className="text-slate-400">Ready for your TNPSC Group 4 preparation?</p>
        </div>

        {/* Stats */}
        {history.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 fade-up fade-up-1">
            <StatCard icon={FileText} label="Attempts" value={history.length} color="text-blue-400" />
            <StatCard icon={Star} label="Best Score" value={bestScore ? `${bestScore}%` : '—'} color="text-amber-400" />
            <StatCard icon={BarChart2} label="Avg Score" value={avgScore ? `${avgScore}%` : '—'} color="text-emerald-400" />
            <StatCard icon={Trophy} label="Rank" value="—" color="text-violet-400" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Available Tests */}
          <div className="lg:col-span-2 fade-up fade-up-2">
            <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Play size={16} className="text-blue-400" />
              Available Mock Tests
            </h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
            ) : tests.length === 0 ? (
              <div className="bg-navy-900 border border-navy-700 rounded-xl p-8 text-center text-slate-500">
                No mock tests available yet. Admin will add them soon.
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map(t => (
                  <div key={t.id} className="bg-navy-900 border border-navy-700 hover:border-blue-500/40 rounded-xl p-5 transition-all group cursor-pointer"
                       onClick={() => nav(`/exam/${t.id}/instructions`)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">{t.title}</h3>
                        {t.description && <p className="text-slate-400 text-sm mb-3 line-clamp-2">{t.description}</p>}
                        <div className="flex flex-wrap gap-2">
                          {[
                            { icon: FileText, text: `${t.total_questions} Questions` },
                            { icon: Clock, text: `${t.duration_minutes} mins` },
                            { icon: Award, text: '300 Marks' },
                          ].map(({icon: Icon, text}) => (
                            <span key={text} className="flex items-center gap-1 text-xs bg-navy-800 text-slate-400 px-2.5 py-1 rounded-full">
                              <Icon size={11} />{text}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-5 fade-up fade-up-3">
            {/* Exam Pattern */}
            <div className="bg-navy-900 border border-navy-700 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4 text-sm">Exam Pattern</h3>
              {[
                { subj: 'Tamil / தமிழ்', q: 100, m: 100, color: 'bg-rose-500' },
                { subj: 'General Studies', q: 75, m: 150, color: 'bg-blue-500' },
                { subj: 'Aptitude & Mental Ability', q: 25, m: 50, color: 'bg-amber-500' },
              ].map(({subj, q, m, color}) => (
                <div key={subj} className="flex items-center gap-3 py-2.5 border-b border-navy-800 last:border-0">
                  <div className={`w-1.5 h-8 rounded-full ${color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium truncate">{subj}</p>
                    <p className="text-slate-500 text-xs">{q}Q × {m/q === 1 ? '1' : '2'} = {m} marks</p>
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-navy-800 flex justify-between text-sm">
                <span className="text-slate-400">Total</span>
                <span className="text-white font-bold">200Q | 300M | 3hrs</span>
              </div>
            </div>

            {/* Recent History */}
            {history.length > 0 && (
              <div className="bg-navy-900 border border-navy-700 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                  <History size={14} className="text-slate-400" />Recent Attempts
                </h3>
                <div className="space-y-2">
                  {history.slice(0, 5).map(h => (
                    <div key={h.session_id} className="flex items-center justify-between py-2 border-b border-navy-800 last:border-0">
                      <div>
                        <p className="text-xs text-slate-300 truncate max-w-[140px]">{h.mock_test_title}</p>
                        <p className="text-xs text-slate-600">{h.submitted_at ? new Date(h.submitted_at).toLocaleDateString() : '—'}</p>
                      </div>
                      <span className={`text-sm font-bold ${h.percentage >= 70 ? 'text-emerald-400' : h.percentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {h.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
