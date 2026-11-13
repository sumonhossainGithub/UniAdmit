'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import {
  GraduationCap,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  BookOpen,
  FileText,
  BadgeAlert,
  Award,
  Users
} from 'lucide-react';

export default function HomePage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/programs').then((res) => res.json()),
      fetch('/api/notices').then((res) => res.json()),
    ])
      .then(([progData, noticeData]) => {
        if (progData.universities) setUniversities(progData.universities);
        if (progData.programs) setPrograms(progData.programs);
        if (noticeData.notices) setNotices(noticeData.notices);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/track?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs sm:text-sm font-medium mb-8 animate-pulse">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>{t.hero.badge}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            {t.hero.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {t.hero.description}
          </p>

          {/* Instant Tracking Bar */}
          <div className="mt-10 max-w-2xl mx-auto">
            <form onSubmit={handleTrackSubmit} className="relative glass-card p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2 border border-blue-500/30">
              <div className="relative flex-1 flex items-center pl-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.hero.searchPlaceholder}
                  className="w-full bg-transparent border-0 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
              >
                <span>{t.hero.searchBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2 text-center">
              💡 {language === 'bn' ? 'ডেমো ট্র্যাকিং দেখতে ট্রাই করুন:' : 'Try sample tracking ID:'}{' '}
              <button
                type="button"
                onClick={() => router.push('/track?q=APP-2026-KYAU-1001')}
                className="text-blue-400 underline font-mono hover:text-blue-300"
              >
                APP-2026-KYAU-1001
              </button>
            </p>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              <span>{t.hero.applyNow}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl glass-card hover:bg-gray-800 text-gray-200 text-sm font-semibold transition-all"
            >
              {t.nav.studentPortal}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured University (KYAU - Khwaja Yunus Ali University) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-blue-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Featured Academic Partner
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Khwaja Yunus Ali University (KYAU)
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                Located on the tranquil shores of Enayetpur, Sirajganj, KYAU is a leading modern university offering state-of-the-art engineering, pharmaceutical, business, and biomedical education in Bangladesh.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <div className="text-lg font-bold text-blue-400">CSE & EEE</div>
                  <div className="text-xs text-gray-400">Engineering Faculty</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <div className="text-lg font-bold text-indigo-400">B.Pharm</div>
                  <div className="text-xs text-gray-400">Pharmacy Council Approved</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <div className="text-lg font-bold text-purple-400">BBA</div>
                  <div className="text-xs text-gray-400">Business Studies</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <div className="text-lg font-bold text-emerald-400">Up to 100%</div>
                  <div className="text-xs text-gray-400">Merit Waiver</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-900/40 border border-gray-800 text-center">
              <img
                src="/Logo.png"
                alt="KYAU Logo"
                className="w-28 h-28 object-contain mb-4 rounded-xl p-2 bg-white/5"
              />
              <span className="text-sm font-semibold text-white">Khwaja Yunus Ali University</span>
              <span className="text-xs text-gray-400 mt-1">Sirajganj, Bangladesh</span>
              <Link
                href="/register"
                className="mt-4 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all text-center"
              >
                Apply to KYAU Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Available Programs Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {language === 'bn' ? 'উপলব্ধ বিভাগ ও প্রোগ্রামসমূহ' : 'Available Academic Programs'}
          </h2>
          <p className="mt-2 text-gray-400 text-sm max-w-xl mx-auto">
            {language === 'bn'
              ? 'আপনার পছন্দের বিষয় বেছে নিন এবং সরাসরি আবেদন করুন'
              : 'Choose your desired field of study and start your university admission journey'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((prog) => (
            <div
              key={prog.id}
              className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {prog.department}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    Seats: {prog.seats}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 leading-snug">
                  {prog.name}
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  {prog.university_name || 'Khwaja Yunus Ali University'}
                </p>
                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min GPA Required:</span>
                    <span className="font-semibold text-white">{prog.min_gpa?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Required Group:</span>
                    <span className="font-semibold text-white">{prog.required_group || 'Any'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block">Tuition per sem</span>
                  <span className="text-sm font-bold text-blue-400">
                    ৳{prog.fee_per_semester?.toLocaleString()} BDT
                  </span>
                </div>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold transition-all border border-blue-500/30"
                >
                  Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            {t.features.badge}
          </span>
          <h2 className="text-3xl font-bold text-white tracking-tight mt-1">
            {t.features.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">{t.features.f1_title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{t.features.f1_desc}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">{t.features.f2_title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{t.features.f2_desc}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">{t.features.f3_title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{t.features.f3_desc}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">{t.features.f4_title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{t.features.f4_desc}</p>
          </div>
        </div>
      </section>

      {/* Notices & Circulars */}
      {notices.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6 text-amber-400">
              <BadgeAlert className="w-5 h-5" />
              <h2 className="text-xl font-bold text-white">
                {language === 'bn' ? 'ভর্তি বিজ্ঞপ্তি ও ঘোষণা' : 'Admission Notices & Circulars'}
              </h2>
            </div>
            <div className="space-y-4">
              {notices.map((n) => (
                <div
                  key={n.id}
                  className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {n.category || 'Announcement'}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(n.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">{n.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
