'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import {
  ShieldCheck,
  Building,
  GraduationCap,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [meRes, appRes, progRes] = await Promise.all([
        fetch('/api/auth/me').then((r) => r.json()),
        fetch('/api/applications').then((r) => r.json()),
        fetch('/api/programs').then((r) => r.json()),
      ]);

      if (!meRes.user || meRes.user.role !== 'admin') {
        router.push('/login');
        return;
      }

      setUser(meRes.user);
      setApplications(appRes.applications || []);
      setUniversities(progRes.universities || []);
      setPrograms(progRes.programs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">{t.common.loading}</div>;
  }

  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const totalRevenue = applications.filter((a) => a.payment_status === 'paid').length * 500;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-purple-500/20">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            {t.nav.adminPortal}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {t.dashboard.adminOverview}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Logged in as Super Administrator ({user?.email})
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-gray-800">
          <span className="text-xs text-gray-400 block">{t.dashboard.totalApps}</span>
          <span className="text-3xl font-bold text-white mt-2 block">{applications.length}</span>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/20">
          <span className="text-xs text-emerald-400 block">{t.dashboard.approvedApps}</span>
          <span className="text-3xl font-bold text-emerald-400 mt-2 block">{approvedCount}</span>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-blue-500/20">
          <span className="text-xs text-blue-400 block">Total Universities</span>
          <span className="text-3xl font-bold text-blue-400 mt-2 block">{universities.length}</span>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-purple-500/20">
          <span className="text-xs text-purple-400 block">Total Application Revenue</span>
          <span className="text-3xl font-bold text-purple-400 mt-2 block">৳{totalRevenue.toLocaleString()} BDT</span>
        </div>
      </div>

      {/* Universities & Programs Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-gray-800">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-400" />
            Registered Universities
          </h3>
          <div className="space-y-3">
            {universities.map((u) => (
              <div key={u.id} className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-white block">{u.name}</span>
                  <span className="text-xs text-gray-400">{u.location}</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-semibold uppercase">
                  {u.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-gray-800">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            Academic Programs Offered
          </h3>
          <div className="space-y-3">
            {programs.slice(0, 5).map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-white block">{p.name}</span>
                  <span className="text-xs text-gray-400">Dept: {p.department} • Seats: {p.seats}</span>
                </div>
                <span className="text-xs font-mono text-blue-400">
                  ৳{p.fee_per_semester?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Master Table */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Central Admission Ledger
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-400 uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="p-3">Tracking ID</th>
                <th className="p-3">Applicant Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">University</th>
                <th className="p-3">Program</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-900/40">
                  <td className="p-3 font-mono font-bold text-blue-400">{app.tracking_id}</td>
                  <td className="p-3 font-medium text-white">{app.applicant_name}</td>
                  <td className="p-3 text-gray-400">{app.applicant_phone}</td>
                  <td className="p-3 text-gray-300">{app.university_short_name || app.university_name}</td>
                  <td className="p-3 text-gray-300">{app.program_name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-gray-800 text-gray-300">
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3 text-emerald-400 font-semibold">
                    {app.payment_status === 'paid' ? 'Paid (৳500)' : 'Unpaid'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
