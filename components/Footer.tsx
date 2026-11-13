'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { GraduationCap, ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-gray-800/80 bg-gray-950/90 text-gray-400 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white">UniAdmit Portal</span>
            </div>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed">
              {t.subtagline}
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Khwaja Yunus Ali University (KYAU) Admission Management System</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-blue-400 transition-colors">{t.nav.home}</Link></li>
              <li><Link href="/track" className="hover:text-blue-400 transition-colors">{t.nav.track}</Link></li>
              <li><Link href="/login" className="hover:text-blue-400 transition-colors">{t.nav.login}</Link></li>
              <li><Link href="/register" className="hover:text-blue-400 transition-colors">{t.nav.register}</Link></li>
            </ul>
          </div>

          {/* Academic Info */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Project Credentials</h4>
            <p className="text-xs text-gray-400 mb-2">Software Engineering Capstone Project</p>
            <p className="text-xs font-semibold text-gray-300">Developers:</p>
            <p className="text-xs text-blue-400">Morsaline & Husna</p>
            <p className="text-xs text-gray-500 mt-1">Department of CSE, KYAU</p>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 UniAdmit. {t.common.allRights}</p>
          <p className="flex items-center gap-1">
            Built with React 19 & Next.js App Router for Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}
