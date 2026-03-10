import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi } from '../utils/api';
import { useExamTimer } from '../hooks/useExamTimer';
import { useTabSwitch } from '../hooks/useTabSwitch';
import { Clock, Flag, ChevronLeft, ChevronRight, Send, AlertTriangle, X, Loader2, Menu } from 'lucide-react';

// Question palette status
const STATUS = {
  NOT_VISITED: 'not-visited',
  NOT_ANSWERED: 'not-answered',
  ANSWERED: 'answered',
  MARKED: 'marked',
  MARKED_ANSWERED: 'marked-answered',
};

function getStatus(idx, answers, marked, visited) {
  const qid = idx; // we use index
  const isAnswered = answers[qid] !== undefined;
  const isMarked = marked.includes(qid);
  if (isMarked && isAnswered) return STATUS.MARKED_ANSWERED;
  if (isMarked) return STATUS.MARKED;
  if (isAnswered) return STATUS.ANSWERED;
  if (visited.has(qid)) return STATUS.NOT_ANSWERED;
  return STATUS.NOT_VISITED;
}

const statusClass = {
  [STATUS.NOT_VISITED]: 'status-not-visited',
  [STATUS.NOT_ANSWERED]: 'status-not-answered',
  [STATUS.ANSWERED]: 'status-answered',
  [STATUS.MARKED]: 'status-marked',
  [STATUS.MARKED_ANSWERED]: 'status-marked-answered',
};

const sectionRanges = [
  { name: 'Tamil', start: 0, end: 99 },
  { name: 'General Studies', start: 100, end: 174 },
  { name: 'Aptitude', start: 175, end: 199 },
];

export default function ExamPage() {
  const { testId } = useParams();
  const nav = useNavigate();
  const [examData, setExamData] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState([]);
  const [visited, setVisited] = useState(new Set([0]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tabWarning, setTabWarning] = useState(null);
  const [showPalette, setShowPalette] = useState(false);
  const [activeSection, setActiveSection] = useState('All');
  const sessionRef = useRef(null);
  const questionsRef = useRef([]);

  const handleExpire = useCallback(() => submitExam(true), []);
  const timer = useExamTimer(examData?.time_remaining_seconds || 10800, sessionRef.current, handleExpire);

  // Tab switch detection
  useTabSwitch(sessionRef.current, !!examData, (count, autoSubmit) => {
    setTabWarning({ count, autoSubmit });
    if (autoSubmit) submitExam(true);
  });

  // Load exam
  useEffect(() => {
    examApi.start(testId)
      .then(r => {
        const data = r.data;
        sessionRef.current = data.session_id;
        questionsRef.current = data.questions;
        setExamData(data);
        // Restore state
        const ans = {};
        Object.entries(data.answers || {}).forEach(([qid, opt]) => { ans[parseInt(qid)] = opt; });
        setAnswers(ans);
        setMarked(data.marked_for_review || []);
        // Mark visited for answered ones
        const v = new Set([0]);
        Object.keys(data.answers || {}).forEach(qid => v.add(parseInt(qid)));
        setVisited(v);
        setLoading(false);
        timer.start();
      })
      .catch(e => {
        setError(e.response?.data?.detail || 'Failed to load exam');
        setLoading(false);
      });
  }, [testId]);

  // Save answer to backend
  const saveAnswer = useCallback((qid, option) => {
    const q = questionsRef.current[qid];
    if (!q || !sessionRef.current) return;
    examApi.answer({ session_id: sessionRef.current, question_id: q.id, selected_option: option })
      .catch(console.error);
  }, []);

  const handleAnswer = (optionKey) => {
    const newAns = { ...answers };
    if (newAns[current] === optionKey) {
      delete newAns[current]; // clear on re-click
      saveAnswer(current, null);
    } else {
      newAns[current] = optionKey;
      saveAnswer(current, optionKey);
    }
    setAnswers(newAns);
  };

  const handleClear = () => {
    const newAns = { ...answers };
    delete newAns[current];
    setAnswers(newAns);
    saveAnswer(current, null);
  };

  const handleMark = () => {
    const q = questionsRef.current[current];
    if (!q) return;
    const isMarked = marked.includes(current);
    const newMarked = isMarked ? marked.filter(m => m !== current) : [...marked, current];
    setMarked(newMarked);
    examApi.review({ session_id: sessionRef.current, question_id: q.id, marked: !isMarked }).catch(console.error);
  };

  const goTo = (idx) => {
    setVisited(v => { const nv = new Set(v); nv.add(idx); return nv; });
    setCurrent(idx);
    setShowPalette(false);
  };

  const goNext = () => { if (current < (examData?.questions.length || 0) - 1) goTo(current + 1); };
  const goPrev = () => { if (current > 0) goTo(current - 1); };

  const submitExam = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    timer.stop();
    try {
      const res = await examApi.submit(sessionRef.current, auto);
      nav('/results', { state: { result: res.data, sessionId: sessionRef.current } });
    } catch (e) {
      setSubmitting(false);
      alert('Submit failed. Please try again.');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={36} className="animate-spin text-blue-400 mx-auto mb-3" />
        <p className="text-slate-400">தேர்வு தயாரிக்கிறது... / Loading exam...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center bg-navy-900 border border-navy-700 rounded-2xl p-8 max-w-sm">
        <AlertTriangle size={36} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-300 mb-4">{error}</p>
        <button onClick={() => nav('/dashboard')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  const questions = examData?.questions || [];
  const q = questions[current];
  if (!q) return null;

  const answeredCount = Object.keys(answers).length;
  const markedCount = marked.length;
  const totalQ = questions.length;

  // Section filter for palette
  const sectionQ = activeSection === 'All' ? questions :
    questions.filter(q => q.subject === activeSection);

  return (
    <div className="h-screen bg-navy-950 flex flex-col overflow-hidden">
      {/* ===== TOP BAR ===== */}
      <div className={`flex-shrink-0 border-b ${timer.isCritical ? 'border-red-900/50 bg-[#1a0505]' : 'border-navy-800 bg-navy-900'} transition-colors`}>
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Left: Title + Progress */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setShowPalette(!showPalette)} className="md:hidden text-slate-400 hover:text-white">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate hidden sm:block">{examData?.mock_test_title}</p>
              <p className="text-slate-300 text-sm font-medium">
                Q <span className="text-white font-bold">{current + 1}</span>
                <span className="text-slate-500">/{totalQ}</span>
              </p>
            </div>
          </div>

          {/* Center: Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg flex-shrink-0 ${
            timer.isCritical ? 'bg-red-900/60 text-red-300 timer-critical' :
            timer.isWarning ? 'bg-amber-900/30 text-amber-300' :
            'bg-navy-800 text-white'
          }`}>
            <Clock size={16} />
            {timer.formatted}
          </div>

          {/* Right: Submit */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 mr-2">
              <span className="text-emerald-400">{answeredCount} ans</span>
              <span className="text-violet-400">{markedCount} flagged</span>
            </div>
            <button
              onClick={() => setShowConfirm(true)} disabled={submitting}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span className="hidden sm:inline">Submit</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-navy-800">
          <div className="h-full bg-blue-500 transition-all duration-300"
               style={{ width: `${((current + 1) / totalQ) * 100}%` }} />
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 question-slide" key={current}>
          {/* Subject + Difficulty tag */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-medium px-3 py-1 rounded-full border" style={{
              background: q.subject === 'Tamil' ? 'rgba(244,63,94,0.1)' : q.subject === 'General Studies' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
              borderColor: q.subject === 'Tamil' ? 'rgba(244,63,94,0.3)' : q.subject === 'General Studies' ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.3)',
              color: q.subject === 'Tamil' ? '#fb7185' : q.subject === 'General Studies' ? '#93c5fd' : '#fcd34d',
            }}>
              {q.subject}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${
              q.difficulty === 'easy' ? 'bg-emerald-900/30 text-emerald-400' :
              q.difficulty === 'hard' ? 'bg-red-900/30 text-red-400' :
              'bg-slate-800 text-slate-400'
            }`}>{q.difficulty}</span>
            {marked.includes(current) && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-900/30 text-violet-400">🚩 Marked</span>
            )}
          </div>

          {/* Question text */}
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5 mb-5">
            <p className="text-white text-base md:text-lg leading-relaxed">
              <span className="text-slate-500 font-mono text-sm mr-2">{current + 1}.</span>
              {q.question_text}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {Object.entries(q.options || {}).map(([key, text]) => {
              const isSelected = answers[current] === key;
              return (
                <label key={key} onClick={() => handleAnswer(key)}
                  className={`option-row flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-900/20'
                      : 'bg-navy-900 border-navy-700 hover:border-blue-500/40 hover:bg-navy-800'
                  }`}>
                  <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                    isSelected ? 'bg-blue-600 border-blue-400 text-white' : 'border-navy-600 text-slate-400'
                  }`}>{key}</span>
                  <span className="text-slate-200 text-sm md:text-base leading-relaxed">{text}</span>
                  {isSelected && (
                    <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg width="10" height="8" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-between gap-3">
            <button onClick={goPrev} disabled={current === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-navy-800 hover:bg-navy-700 border border-navy-700 disabled:opacity-30 text-slate-300 rounded-xl text-sm transition-colors">
              <ChevronLeft size={16} />Prev
            </button>
            <div className="flex gap-2">
              <button onClick={handleClear} disabled={!answers[current]}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 hover:bg-navy-700 border border-navy-700 disabled:opacity-30 text-slate-400 rounded-xl text-sm transition-colors">
                <X size={14} />Clear
              </button>
              <button onClick={handleMark}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm border transition-all ${
                  marked.includes(current)
                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                    : 'bg-navy-800 border-navy-700 text-slate-400 hover:border-violet-500/40'
                }`}>
                <Flag size={14} />
                {marked.includes(current) ? 'Unmark' : 'Mark'}
              </button>
            </div>
            <button onClick={goNext} disabled={current === totalQ - 1}
              className="flex items-center gap-2 px-5 py-2.5 bg-navy-800 hover:bg-navy-700 border border-navy-700 disabled:opacity-30 text-slate-300 rounded-xl text-sm transition-colors">
              Next<ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ===== QUESTION PALETTE ===== */}
        <div className={`${showPalette ? 'fixed inset-0 z-30 bg-navy-950 overflow-auto' : 'hidden'} md:relative md:flex md:flex-col w-full md:w-72 flex-shrink-0 border-l border-navy-800 bg-navy-900/60`}>
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <span className="font-semibold text-white text-sm">Question Palette</span>
            <button onClick={() => setShowPalette(false)} className="md:hidden text-slate-400"><X size={18} /></button>
          </div>

          {/* Legend */}
          <div className="p-3 border-b border-navy-800 grid grid-cols-2 gap-1.5 text-xs">
            {[
              { cls: 'status-not-visited', label: `Not Visited` },
              { cls: 'status-answered', label: `Answered (${answeredCount})` },
              { cls: 'status-not-answered', label: `Not Answered` },
              { cls: 'status-marked', label: `Marked (${markedCount})` },
            ].map(({cls, label}) => (
              <div key={label} className="flex items-center gap-1.5 text-slate-400">
                <span className={`w-4 h-4 rounded-sm text-xs flex items-center justify-center ${cls}`} />
                {label}
              </div>
            ))}
          </div>

          {/* Section filter */}
          <div className="p-2 border-b border-navy-800 flex gap-1 flex-wrap">
            {['All', 'Tamil', 'General Studies', 'Aptitude & Mental Ability'].map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${activeSection === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {s === 'General Studies' ? 'GS' : s === 'Aptitude & Mental Ability' ? 'Apt' : s}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, idx) => {
                const shouldShow = activeSection === 'All' || questions[idx]?.subject === activeSection;
                if (!shouldShow) return null;
                const status = idx === current ? 'current' : getStatus(idx, answers, marked, visited);
                return (
                  <button key={idx} onClick={() => goTo(idx)}
                    className={`palette-btn w-full aspect-square rounded-lg text-xs font-bold transition-all ${
                      idx === current ? 'status-current' : statusClass[status] || 'status-not-visited'
                    }`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit button in palette */}
          <div className="p-3 border-t border-navy-800">
            <button onClick={() => setShowConfirm(true)} disabled={submitting}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              <Send size={15} />Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* ===== CONFIRM DIALOG ===== */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-display font-bold text-white text-lg mb-1">Submit Exam?</h3>
            <p className="text-slate-400 text-sm mb-4">Once submitted, you cannot change your answers.</p>
            <div className="grid grid-cols-2 gap-2 bg-navy-800 rounded-xl p-3 mb-5 text-sm">
              {[
                { label: 'Answered', val: answeredCount, color: 'text-emerald-400' },
                { label: 'Not Answered', val: totalQ - answeredCount, color: 'text-red-400' },
                { label: 'Marked', val: markedCount, color: 'text-violet-400' },
                { label: 'Time Left', val: timer.formatted, color: 'text-amber-300' },
              ].map(({label, val, color}) => (
                <div key={label} className="text-center">
                  <div className={`font-bold text-lg ${color}`}>{val}</div>
                  <div className="text-slate-500 text-xs">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-navy-800 border border-navy-700 text-slate-300 py-3 rounded-xl transition-colors hover:bg-navy-700">
                Cancel
              </button>
              <button onClick={() => submitExam(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors">
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB SWITCH WARNING ===== */}
      {tabWarning && !tabWarning.autoSubmit && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-amber-900/90 border border-amber-500/50 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3 shadow-2xl">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-200 font-semibold text-sm">Tab Switch Detected!</p>
              <p className="text-amber-300/70 text-xs mt-0.5">Warning {tabWarning.count}/5. Exam will auto-submit after 5 violations.</p>
            </div>
            <button onClick={() => setTabWarning(null)} className="text-amber-400 hover:text-amber-200">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
