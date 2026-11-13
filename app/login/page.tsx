'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent, customCreds?: { email: string; pass: string }) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = customCreds ? customCreds.email : email;
    const loginPass = customCreds ? customCreds.pass : password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Please check credentials.');
      } else {
        if (data.user?.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (data.user?.role === 'manager') {
          router.push('/manager/dashboard');
        } else {
          router.push('/student/dashboard');
        }
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = (role: 'admin' | 'manager' | 'student') => {
    if (role === 'admin') {
      setEmail('admin@uniadmit.com');
      setPassword('admin123');
      handleLogin(undefined, { email: 'admin@uniadmit.com', pass: 'admin123' });
    } else if (role === 'manager') {
      setEmail('manager@uniadmit.com');
      setPassword('manager123');
      handleLogin(undefined, { email: 'manager@uniadmit.com', pass: 'manager123' });
    } else {
      setEmail('student@uniadmit.com');
      setPassword('student123');
      handleLogin(undefined, { email: 'student@uniadmit.com', pass: 'student123' });
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/25">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t.auth.loginTitle}
          </h1>
          <p className="text-xs text-gray-400">
            {t.auth.loginSub}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              {t.auth.email}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              {t.auth.password}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? t.common.loading : t.auth.loginBtn}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Google OAuth Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleDemo('student')}
            className="w-full py-2.5 rounded-xl border border-gray-700 bg-gray-900/50 hover:bg-gray-800 text-gray-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{t.auth.orGoogle}</span>
          </button>
        </div>

        {/* Demo Fast Logins */}
        <div className="pt-4 border-t border-gray-800 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block text-center">
            {t.auth.demoLoginNotice}
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemo('student')}
              className="px-2 py-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/40 text-blue-300 text-xs font-medium transition-all text-center"
            >
              🎓 {t.auth.studentDemo}
            </button>
            <button
              type="button"
              onClick={() => handleDemo('manager')}
              className="px-2 py-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-indigo-300 text-xs font-medium transition-all text-center"
            >
              📑 {t.auth.managerDemo}
            </button>
            <button
              type="button"
              onClick={() => handleDemo('admin')}
              className="px-2 py-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40 text-purple-300 text-xs font-medium transition-all text-center"
            >
              🛡️ {t.auth.adminDemo}
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center text-xs text-gray-400 pt-2">
          <span>{t.auth.noAccount} </span>
          <Link href="/register" className="text-blue-400 font-semibold hover:underline">
            {t.auth.registerLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
