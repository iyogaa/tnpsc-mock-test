import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, RotateCcw, Home, ChevronDown, ChevronUp, Download, Trophy, BarChart2, Target } from 'lucide-react';

function RadialProgress({ pct, size = 120 }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1a3260" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
    </svg>
  );
}

export default function ResultsPage() {
  const { state } = useLocation();
  const nav = useNavigate();
  const [showReview, setShowReview] = useState(false);
  const [filter, setFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  if (!state?.result) { nav('/dashboard'); return null; }
  const r = state.result;
  const pct = r.percentage;
  const grade = pct >= 70 ? { label: 'Excellent! 🏆', color: 'text-emerald-400' }
    : pct >= 50 ? { label: 'Good! 👍', color: 'text-amber-400' }
    : { label: 'Keep Practicing 💪', color: 'text-red-400' };

  const sectionData = r.section_scores || {};

  const filteredQ = (r.detailed_results || []).filter(q => {
    const statusMatch = filter === 'all' ? true : filter === 'correct' ? q.is_correct : filter === 'wrong' ? (!q.is_correct && q.your_answer) : !q.your_answer;
    const subjMatch = subjectFilter === 'all' || q.subject === subjectFilter;
    return statusMatch && subjMatch;
  });

  return (
    <div className="min-h-screen bg-navy-950 pb-16">
      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="font-display font-bold text-white text-lg">Exam Result</h1>
          <div className="flex gap-2">
            <button onClick={() => nav('/dashboard')} className="flex items-center gap-1.5 bg-navy-800 border border-navy-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-navy-700">
              <Home size={13} />Dashboard
            </button>
            <button onClick={() => nav(`/exam/${r.mock_test_id || 1}/instructions`)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
              <RotateCcw size={13} />Retake
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Score Hero */}
        <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 md:p-8 mb-6 fade-up">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Radial chart */}
            <div className="relative flex-shrink-0">
              <RadialProgress pct={pct} size={130} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-bold text-white">{r.score}</span>
                <span className="text-slate-400 text-xs">/ {r.total_marks}</span>
              </div>
            </div>

            <div className="text-center md:text-left flex-1">
              <div className={`font-display text-4xl font-bold ${grade.color}`}>{pct}%</div>
              <div className={`text-lg font-semibold ${grade.color} mt-1`}>{grade.label}</div>
              <p className="text-slate-400 text-sm mt-1">TNPSC Group 4 Mock Test</p>

              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { val: r.total_correct, label: 'Correct', color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
                  { val: r.total_wrong, label: 'Wrong', color: 'text-red-400', bg: 'bg-red-900/20' },
                  { val: r.total_unanswered, label: 'Skipped', color: 'text-slate-400', bg: 'bg-navy-800' },
                ].map(({val, label, color, bg}) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <div className={`font-display text-2xl font-bold ${color}`}>{val}</div>
                    <div className="text-slate-500 text-xs">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section Scores */}
        <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5 mb-6 fade-up fade-up-1">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-400" />
            Section-wise Performance
          </h2>
          <div className="space-y-4">
            {Object.entries(sectionData).map(([subj, data]) => {
              const total = data.correct + data.wrong + data.unanswered;
              const secPct = total > 0 ? Math.round((data.correct / total) * 100) : 0;
              const marks_per_q = subj === 'Tamil' ? 1 : 2;
              const max_marks = total * marks_per_q;
              const scored = data.score * marks_per_q;
              return (
                <div key={subj}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-200 text-sm font-medium">{subj}</span>
                    <span className="text-white font-bold text-sm">{scored}/{max_marks} ({secPct}%)</span>
                  </div>
                  <div className="h-2.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${
                      secPct >= 70 ? 'bg-emerald-500' : secPct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`} style={{ width: `${secPct}%` }} />
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                    <span className="text-emerald-400">✓ {data.correct} correct</span>
                    <span className="text-red-400">✗ {data.wrong} wrong</span>
                    <span>— {data.unanswered} skipped</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weak Topics */}
        {r.detailed_results && (
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5 mb-6 fade-up fade-up-2">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Target size={16} className="text-amber-400" />
              Performance Insight
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(sectionData).map(([subj, d]) => {
                const total = d.correct + d.wrong + d.unanswered;
                const pctSec = total > 0 ? Math.round((d.correct / total) * 100) : 0;
                const emoji = pctSec >= 70 ? '🟢' : pctSec >= 50 ? '🟡' : '🔴';
                return (
                  <div key={subj} className="flex items-center gap-3 bg-navy-800 rounded-xl p-3">
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{subj}</p>
                      <p className="text-slate-500 text-xs">{pctSec >= 70 ? 'Strong area' : pctSec >= 50 ? 'Needs improvement' : 'Focus area — Practice more'}</p>
                    </div>
                    <span className={`ml-auto font-bold ${pctSec >= 70 ? 'text-emerald-400' : pctSec >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{pctSec}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Answer Review */}
        {r.detailed_results && (
          <div className="bg-navy-900 border border-navy-700 rounded-2xl overflow-hidden fade-up fade-up-3">
            <button onClick={() => setShowReview(!showReview)}
              className="w-full flex items-center justify-between p-5 hover:bg-navy-800/50 transition-colors">
              <span className="font-semibold text-white flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" />
                Detailed Answer Review ({r.detailed_results.length} questions)
              </span>
              {showReview ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {showReview && (
              <div className="px-5 pb-5">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { key: 'all', label: `All (${r.detailed_results.length})` },
                    { key: 'correct', label: `Correct (${r.total_correct})` },
                    { key: 'wrong', label: `Wrong (${r.total_wrong})` },
                    { key: 'unanswered', label: `Skipped (${r.total_unanswered})` },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === key ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                  <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-navy-800 text-slate-400 border border-navy-700 outline-none">
                    <option value="all">All Subjects</option>
                    <option value="Tamil">Tamil</option>
                    <option value="General Studies">General Studies</option>
                    <option value="Aptitude & Mental Ability">Aptitude</option>
                  </select>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {filteredQ.map((item, idx) => (
                    <div key={idx} className={`rounded-xl border p-4 ${
                      !item.your_answer ? 'border-slate-700/40 bg-slate-900/20' :
                      item.is_correct ? 'border-emerald-800/50 bg-emerald-950/30' :
                      'border-red-800/50 bg-red-950/20'
                    }`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {!item.your_answer ? <MinusCircle size={16} className="text-slate-500" /> :
                           item.is_correct ? <CheckCircle size={16} className="text-emerald-400" /> :
                           <XCircle size={16} className="text-red-400" />}
                        </div>
                        <p className="text-slate-200 text-sm leading-relaxed">{item.question_text}</p>
                      </div>

                      <div className="ml-7 space-y-1.5 mb-2">
                        {Object.entries(item.options || {}).map(([key, text]) => {
                          const isCorrect = key === item.correct_answer;
                          const isUser = key === item.your_answer;
                          return (
                            <div key={key} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                              isCorrect ? 'bg-emerald-900/30 text-emerald-300' :
                              isUser && !isCorrect ? 'bg-red-900/30 text-red-300' :
                              'text-slate-500'
                            }`}>
                              <span className="font-mono font-bold w-4">{key}.</span>
                              <span>{text}</span>
                              {isCorrect && <span className="ml-auto text-emerald-400 font-bold">✓ Correct</span>}
                              {isUser && !isCorrect && <span className="ml-auto text-red-400 font-bold">✗ Your ans</span>}
                            </div>
                          );
                        })}
                      </div>

                      {item.explanation && (
                        <div className="ml-7 text-xs text-slate-400 bg-navy-800/50 rounded-lg px-3 py-2 border border-navy-700/50">
                          <span className="text-blue-400 font-semibold">Explanation: </span>
                          {item.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
