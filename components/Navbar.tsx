'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from './LanguageProvider';
import { GraduationCap, Globe, Search, User, LogOut, LayoutDashboard, Shield, BookOpen, Menu, X } from 'lucide-react';

export function Navbar() {
  const { t, language, toggleLanguage } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; fullName: string; role: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'manager') return '/manager/dashboard';
    return '/student/dashboard';
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Uni<span className="text-blue-500">Admit</span>
              </span>
              <span className="text-[10px] text-gray-400 block -mt-1 tracking-wider uppercase">
                KYAU System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/' ? 'text-blue-400 bg-blue-950/50' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {t.nav.home}
            </Link>

            <Link
              href="/track"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                pathname === '/track' ? 'text-blue-400 bg-blue-950/50' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Search className="w-4 h-4 text-blue-400" />
              {t.nav.track}
            </Link>

            {user && (
              <Link
                href={getDashboardLink()}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  pathname.includes('/dashboard') ? 'text-blue-400 bg-blue-950/50' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                {t.nav.dashboard}
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {user.role}
                </span>
              </Link>
            )}
          </div>

          {/* Right actions: Language Switcher & Auth */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Switcher Pill */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-xs font-semibold text-gray-200 transition-all hover:border-gray-500"
              title="Toggle Language (English / বাংলা)"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'bn' ? 'বাংলা (BN)' : 'English (EN)'}</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="text-xs font-medium text-gray-200 truncate max-w-[130px]">{user.fullName}</div>
                  <div className="text-[10px] text-gray-400 capitalize">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  title={t.nav.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleLanguage}
              className="p-1.5 rounded-lg border border-gray-800 text-xs font-bold text-blue-400"
            >
              {language === 'bn' ? 'BN' : 'EN'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-2 border-t border-gray-800 bg-gray-950/95">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
          >
            {t.nav.home}
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
          >
            {t.nav.track}
          </Link>
          {user && (
            <Link
              href={getDashboardLink()}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-blue-400 hover:bg-gray-800"
            >
              {t.nav.dashboard} ({user.role})
            </Link>
          )}
          <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
            {user ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg"
              >
                {t.nav.logout} ({user.fullName})
              </button>
            ) : (
              <div className="flex gap-2 w-full">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm text-gray-200 bg-gray-800 rounded-lg"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm text-white bg-blue-600 rounded-lg"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
