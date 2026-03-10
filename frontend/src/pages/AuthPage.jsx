import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../utils/api';
import { BookOpen, User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthPage({ mode }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const isLogin = mode === 'login';

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = isLogin
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form);
      login(res.data.user, res.data.access_token);
      nav(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize:'32px 32px'}} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <BookOpen size={28} className="text-blue-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">TNPSC Mock Test</h1>
          <p className="text-slate-400 mt-1 text-sm">Group 4 Exam Platform</p>
        </div>

        {/* Card */}
        <div className="bg-navy-900 border border-navy-700 rounded-2xl p-8 shadow-2xl shadow-black/40 fade-up fade-up-1">
          <h2 className="font-display text-xl font-semibold text-white mb-6">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="உங்கள் பெயர் / Your Name" required
                    className="w-full bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors placeholder-slate-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="your@email.com" required
                  className="w-full bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={show ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="••••••••" required minLength={6}
                  className="w-full bg-navy-800 border border-navy-700 focus:border-blue-500 text-white rounded-xl pl-10 pr-10 py-3 text-sm outline-none transition-colors placeholder-slate-600"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-5">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link to={isLogin ? '/register' : '/login'} className="text-blue-400 hover:text-blue-300 font-medium">
              {isLogin ? 'Register' : 'Sign In'}
            </Link>
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          TNPSC Group 4 • 200 Questions • 180 Minutes • 300 Marks
        </p>
      </div>
    </div>
  );
}
