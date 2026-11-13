'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  UserCheck,
  ShieldCheck,
  Building
} from 'lucide-react';

export default function ManagerDashboard() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const [meRes, appRes] = await Promise.all([
        fetch('/api/auth/me').then((r) => r.json()),
        fetch('/api/applications').then((r) => r.json()),
      ]);

      if (!meRes.user || (meRes.user.role !== 'manager' && meRes.user.role !== 'admin')) {
        router.push('/login');
        return;
      }

      setUser(meRes.user);
      setApplications(appRes.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          remarks: `Status updated to ${status} by ${user.fullName}`,
          assignedId: status === 'approved' ? `KYAU-2026-${Math.floor(100 + Math.random() * 900)}` : undefined,
        }),
      });
      await fetchApplications();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyPayment = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'paid',
          transactionId: `VERIFIED-${Date.now().toString().slice(-6)}`,
        }),
      });
      await fetchApplications();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">{t.common.loading}</div>;
  }

  const filtered = applications.filter((a) => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-indigo-500/20">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
            {t.nav.managerPortal}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {t.dashboard.managerOverview}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Reviewer: {user?.fullName} ({user?.email})
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses ({applications.length})</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="waitlisted">Waitlisted</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800">
        <div className="space-y-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:border-gray-700 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {app.tracking_id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      app.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : app.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {app.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      app.payment_status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {app.payment_status === 'paid' ? 'Fee Verified' : 'Fee Unpaid'}
                  </span>
                </div>

                <div className="text-sm font-semibold text-white">
                  {app.applicant_name} • <span className="text-gray-400 font-normal">{app.applicant_phone}</span>
                </div>
                <div className="text-xs text-gray-300">
                  {app.program_name} ({app.department}) • {app.university_name}
                </div>
                {app.remarks && (
                  <div className="text-[11px] text-gray-400 italic">
                    Remarks: {app.remarks}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {app.payment_status !== 'paid' && (
                  <button
                    onClick={() => handleVerifyPayment(app.id)}
                    disabled={actionLoading === app.id}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium transition-all"
                  >
                    Verify Fee
                  </button>
                )}

                <button
                  onClick={() => handleUpdateStatus(app.id, 'approved')}
                  disabled={actionLoading === app.id || app.status === 'approved'}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-medium transition-all disabled:opacity-30"
                >
                  Approve
                </button>

                <button
                  onClick={() => handleUpdateStatus(app.id, 'waitlisted')}
                  disabled={actionLoading === app.id || app.status === 'waitlisted'}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-medium transition-all disabled:opacity-30"
                >
                  Waitlist
                </button>

                <button
                  onClick={() => handleUpdateStatus(app.id, 'rejected')}
                  disabled={actionLoading === app.id || app.status === 'rejected'}
                  className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 hover:bg-red-600 text-red-300 hover:text-white text-xs font-medium transition-all disabled:opacity-30"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
