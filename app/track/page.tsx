'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Printer,
  Download,
  Building,
  GraduationCap,
  Calendar,
  CreditCard,
  UserCheck
} from 'lucide-react';

function TrackContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeModal, setActiveModal] = useState<{ type: 'admit' | 'challan'; app: any } | null>(null);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/applications/track?q=${encodeURIComponent(searchTerm.trim())}`);
      const data = await res.json();
      setResults(data.applications || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.statusText.approved}
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            {t.statusText.under_review}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {t.statusText.rejected}
          </span>
        );
      case 'waitlisted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            {t.statusText.waitlisted}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            {t.statusText.pending}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {t.tracking.title}
        </h1>
        <p className="mt-2 text-gray-400 text-sm max-w-xl mx-auto">
          {t.tracking.subtitle}
        </p>
      </div>

      {/* Search Input */}
      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSubmit} className="glass-card p-2 rounded-2xl flex gap-2 border border-blue-500/30">
          <div className="relative flex-1 flex items-center pl-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.tracking.placeholder}
              className="w-full bg-transparent border-0 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
          >
            {loading ? t.common.loading : t.hero.searchBtn}
          </button>
        </form>

        <div className="flex items-center justify-between mt-3 px-2 text-xs text-gray-400">
          <span>{language === 'bn' ? 'উদাহরণ ট্র্যাকিং নম্বর:' : 'Quick sample IDs:'}</span>
          <div className="space-x-3">
            <button
              onClick={() => {
                setQuery('APP-2026-KYAU-1001');
                performSearch('APP-2026-KYAU-1001');
              }}
              className="text-blue-400 font-mono hover:underline"
            >
              APP-2026-KYAU-1001
            </button>
            <button
              onClick={() => {
                setQuery('APP-2026-KYAU-1002');
                performSearch('APP-2026-KYAU-1002');
              }}
              className="text-blue-400 font-mono hover:underline"
            >
              APP-2026-KYAU-1002
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-6">
          {results.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-1">
                {t.tracking.notFound}
              </h3>
              <p className="text-xs text-gray-400">
                Please verify your Application Tracking ID or registered mobile phone number.
              </p>
            </div>
          ) : (
            results.map((app) => (
              <div
                key={app.id}
                className="glass-card rounded-2xl p-6 sm:p-8 border border-blue-500/20 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
                  <div>
                    <span className="text-xs text-gray-400 font-mono block">Tracking ID</span>
                    <span className="text-xl font-bold text-blue-400 font-mono">
                      {app.tracking_id}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {getStatusBadge(app.status)}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        app.payment_status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {app.payment_status === 'paid' ? 'Fee Paid (৳500)' : 'Payment Pending'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">{t.tracking.applicantName}</span>
                    <span className="text-sm font-semibold text-white">{app.applicant_name}</span>
                    <span className="text-xs text-gray-500 block mt-0.5">{app.applicant_phone}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 block mb-1">{t.tracking.university}</span>
                    <span className="text-sm font-semibold text-white">{app.university_name}</span>
                    <span className="text-xs text-gray-500 block mt-0.5">{app.university_location}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 block mb-1">{t.tracking.program}</span>
                    <span className="text-sm font-semibold text-blue-400">{app.program_name}</span>
                    <span className="text-xs text-gray-500 block mt-0.5">Dept: {app.department}</span>
                  </div>
                </div>

                {app.remarks && (
                  <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-300 mb-6">
                    <span className="font-semibold text-gray-400">Office Remarks: </span>
                    {app.remarks}
                  </div>
                )}

                {/* Action Buttons: Admit Card & Challan */}
                <div className="pt-4 border-t border-gray-800 flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={() => setActiveModal({ type: 'challan', app })}
                    className="px-4 py-2 rounded-xl glass-card hover:bg-gray-800 text-xs font-semibold text-gray-200 flex items-center gap-2 transition-all border border-gray-700"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Download Bank Challan (PDF)</span>
                  </button>

                  {app.status === 'approved' && (
                    <button
                      onClick={() => setActiveModal({ type: 'admit', app })}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Download Admit Card</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Admit Card & Challan Modal Preview */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full p-6 text-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {activeModal.type === 'admit' ? 'Official Admission Admit Card' : 'Official Bank Fee Challan'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Document Content */}
            <div className="bg-white text-gray-900 p-6 rounded-xl border border-gray-300 font-sans space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {activeModal.app.university_name || 'Khwaja Yunus Ali University (KYAU)'}
                </h2>
                <p className="text-xs text-gray-600">Enayetpur, Sirajganj-6751, Bangladesh</p>
                <div className="mt-2 inline-block px-3 py-1 rounded bg-blue-100 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  {activeModal.type === 'admit' ? 'ADMIT CARD - ADMISSION 2026-2027' : 'STUDENT ADMISSION FEE CHALLAN (BANK COPY)'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Tracking / Ref No:</span>
                  <span className="font-mono font-bold">{activeModal.app.tracking_id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Roll / Assigned ID:</span>
                  <span className="font-mono font-bold">{activeModal.app.assigned_id || 'KYAU-2026-PENDING'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Applicant Name:</span>
                  <span className="font-semibold text-gray-900">{activeModal.app.applicant_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Contact Phone:</span>
                  <span className="font-semibold">{activeModal.app.applicant_phone}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Degree Program:</span>
                  <span className="font-semibold text-blue-800">{activeModal.app.program_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Exam / Campus Venue:</span>
                  <span className="font-semibold">KYAU Main Academic Complex, Sirajganj</span>
                </div>
              </div>

              {activeModal.type === 'challan' && (
                <div className="mt-4 border-t pt-3">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-1.5">Description</th>
                        <th className="p-1.5 text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-1.5">Admission Processing & Test Fee</td>
                        <td className="p-1.5 text-right font-mono font-bold">৳500.00</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Payable at any branch of Sonali Bank / Dutch-Bangla Bank or online via bKash Merchant (Account: 01711-KYAU-BD).
                  </p>
                </div>
              )}

              <div className="pt-6 flex justify-between items-end text-[10px] text-gray-500">
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div className="text-right">
                  <div className="font-serif italic font-bold">Prof. Dr. Admission Controller</div>
                  <div className="border-t border-gray-400 pt-0.5">Authorized Signature & Seal</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading tracking engine...</div>}>
      <TrackContent />
    </Suspense>
  );
}
