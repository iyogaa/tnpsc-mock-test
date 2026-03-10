import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Clock, FileQuestion, Award, CheckCircle, ChevronRight, BookOpen } from 'lucide-react';

export default function InstructionsPage() {
  const { testId } = useParams();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6 fade-up">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
            <BookOpen size={14} className="text-blue-400" />
            <span className="text-blue-300 text-sm">TNPSC Group 4 Mock Test</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">தேர்வு விதிமுறைகள்</h1>
          <p className="text-slate-400 mt-1">General Instructions / பொது விதிமுறைகள்</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5 fade-up fade-up-1">
          {[
            { icon: FileQuestion, val: '200', label: 'Questions', color: 'text-blue-400' },
            { icon: Clock, val: '3 Hrs', label: '180 Minutes', color: 'text-amber-400' },
            { icon: Award, val: '300', label: 'Total Marks', color: 'text-emerald-400' },
          ].map(({icon: Icon, val, label, color}) => (
            <div key={label} className="bg-navy-900 border border-navy-700 rounded-xl p-4 text-center">
              <Icon size={18} className={`${color} mx-auto mb-1.5`} />
              <div className="font-display font-bold text-white text-xl">{val}</div>
              <div className="text-slate-500 text-xs">{label}</div>
            </div>
          ))}
        </div>

        {/* Instructions card */}
        <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 mb-4 fade-up fade-up-2">
          <h2 className="font-semibold text-white mb-4">Instructions</h2>
          <ul className="space-y-3">
            {[
              'This test follows the official TNPSC Group 4 exam pattern with 200 MCQ questions.',
              'Tamil section: 100 questions × 1 mark = 100 marks. GS & Aptitude: 2 marks each.',
              'Total: 300 marks. No negative marking for wrong answers.',
              'The timer starts automatically when you click "Start Exam".',
              'Your answers are saved automatically — no need to manually save.',
              'You can navigate to any question using the question palette on the right.',
              'Use "Mark for Review" to flag questions you want to revisit.',
              'If you switch tabs, a warning will be shown. Exam auto-submits after 5 violations.',
              'If you accidentally close the browser, you can resume by starting the same test again.',
              'Exam will auto-submit when time expires.',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warning */}
        <div className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6 fade-up fade-up-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/80">
            <strong>Important:</strong> Do not refresh or navigate away during the exam. Your session is saved, but use the "Submit" button to properly end your exam.
          </div>
        </div>

        <div className="flex gap-3 fade-up fade-up-4">
          <button onClick={() => nav('/dashboard')} className="flex-1 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-300 font-medium py-3.5 rounded-xl transition-colors">
            ← Back
          </button>
          <button onClick={() => nav(`/exam/${testId}/session`)}
            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 hover:-translate-y-0.5">
            தேர்வு தொடங்கு / Start Exam
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
