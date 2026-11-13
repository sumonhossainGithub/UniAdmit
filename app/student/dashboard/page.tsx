'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { BANGLADESH_DISTRICTS } from '@/lib/locations';
import {
  GraduationCap,
  PlusCircle,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Building,
  Calendar,
  CreditCard,
  MapPin,
  Award
} from 'lucide-react';

export default function StudentDashboard() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New application modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedUni, setSelectedUni] = useState('');
  const [selectedProg, setSelectedProg] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(BANGLADESH_DISTRICTS[0].nameEn);
  const [selectedUpazila, setSelectedUpazila] = useState(BANGLADESH_DISTRICTS[0].upazilas[0].en);
  const [sscGpa, setSscGpa] = useState('5.00');
  const [sscBoard, setSscBoard] = useState('Rajshahi');
  const [hscGpa, setHscGpa] = useState('5.00');
  const [hscBoard, setHscBoard] = useState('Rajshahi');
  const [submitting, setSubmitting] = useState(false);
  const [activeModalDoc, setActiveModalDoc] = useState<{ type: 'admit' | 'challan'; app: any } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [meRes, appRes, progRes] = await Promise.all([
        fetch('/api/auth/me').then((r) => r.json()),
        fetch('/api/applications').then((r) => r.json()),
        fetch('/api/programs').then((r) => r.json()),
      ]);

      if (!meRes.user) {
        router.push('/login');
        return;
      }

      setUser(meRes.user);
      setApplications(appRes.applications || []);
      setUniversities(progRes.universities || []);
      setPrograms(progRes.programs || []);

      if (progRes.universities?.length > 0) {
        setSelectedUni(progRes.universities[0].id);
      }
      if (progRes.programs?.length > 0) {
        setSelectedProg(progRes.programs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currentDistrictObj = BANGLADESH_DISTRICTS.find((d) => d.nameEn === selectedDistrict) || BANGLADESH_DISTRICTS[0];

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUni || !selectedProg) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityId: selectedUni,
          programId: selectedProg,
          applicantName: user.fullName,
          applicantPhone: user.phone || '01811223344',
          applicantEmail: user.email,
          paymentAmount: 500,
        }),
      });

      if (res.ok) {
        setShowApplyModal(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">
        {t.common.loading}
      </div>
    );
  }

  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const pendingCount = applications.filter((a) => a.status === 'pending' || a.status === 'under_review').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-blue-500/20">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
            {t.nav.studentPortal}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {t.dashboard.welcome} {user?.fullName}!
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Email: {user?.email} | Role: Student / Applicant
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.dashboard.submitNewApp}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-gray-800">
          <span className="text-xs text-gray-400 block">{t.dashboard.totalApps}</span>
          <span className="text-3xl font-bold text-white mt-2 block">{applications.length}</span>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/20">
          <span className="text-xs text-emerald-400 block">{t.dashboard.approvedApps}</span>
          <span className="text-3xl font-bold text-emerald-400 mt-2 block">{approvedCount}</span>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-amber-500/20">
          <span className="text-xs text-amber-400 block">{t.dashboard.pendingApps}</span>
          <span className="text-3xl font-bold text-amber-400 mt-2 block">{pendingCount}</span>
        </div>
      </div>

      {/* Applications Table / Cards */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-gray-800">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-400" />
          <span>{t.dashboard.studentOverview}</span>
        </h2>

        {applications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No applications submitted yet.</p>
            <button
              onClick={() => setShowApplyModal(true)}
              className="mt-3 text-xs text-blue-400 underline"
            >
              Click here to apply to Khwaja Yunus Ali University (KYAU)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-blue-400">
                      {app.tracking_id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        app.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : app.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {app.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {app.payment_status === 'paid' ? '• Fee Paid' : '• Fee Unpaid'}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white mt-1">
                    {app.program_name} ({app.department})
                  </h3>
                  <p className="text-xs text-gray-400">
                    {app.university_name} • Applied on {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveModalDoc({ type: 'challan', app })}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-xs font-medium text-gray-300 flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Challan</span>
                  </button>

                  {app.status === 'approved' && (
                    <button
                      onClick={() => setActiveModalDoc({ type: 'admit', app })}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Admit Card</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 text-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                {t.applicationForm.title}
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              {/* University Select */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {t.applicationForm.uniSelect}
                </label>
                <select
                  value={selectedUni}
                  onChange={(e) => setSelectedUni(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.short_name}) - {u.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Program Select */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {t.applicationForm.progSelect}
                </label>
                <select
                  value={selectedProg}
                  onChange={(e) => setSelectedProg(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {programs
                    .filter((p) => !selectedUni || p.university_id === selectedUni)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.department} (Min GPA: {p.min_gpa})
                      </option>
                    ))}
                </select>
              </div>

              {/* Bangladesh Location System */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    {t.applicationForm.districtSelect}
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      const dObj = BANGLADESH_DISTRICTS.find((d) => d.nameEn === e.target.value);
                      if (dObj && dObj.upazilas.length > 0) {
                        setSelectedUpazila(dObj.upazilas[0].en);
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {BANGLADESH_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.nameEn}>
                        {d.nameEn} ({d.nameBn}) - {d.divisionEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    {t.applicationForm.upazilaSelect}
                  </label>
                  <select
                    value={selectedUpazila}
                    onChange={(e) => setSelectedUpazila(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {currentDistrictObj.upazilas.map((u) => (
                      <option key={u.en} value={u.en}>
                        {u.en} ({u.bn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Academic Background */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-800">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t.applicationForm.sscBoard}</label>
                  <select
                    value={sscBoard}
                    onChange={(e) => setSscBoard(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Dinajpur">Dinajpur</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t.applicationForm.sscGpa}</label>
                  <input
                    type="number"
                    step="0.01"
                    max="5.00"
                    min="2.00"
                    value={sscGpa}
                    onChange={(e) => setSscGpa(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t.applicationForm.hscBoard}</label>
                  <select
                    value={hscBoard}
                    onChange={(e) => setHscBoard(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Dinajpur">Dinajpur</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t.applicationForm.hscGpa}</label>
                  <input
                    type="number"
                    step="0.01"
                    max="5.00"
                    min="2.00"
                    value={hscGpa}
                    onChange={(e) => setHscGpa(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300">
                {t.applicationForm.feeNote}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? t.common.loading : t.applicationForm.submitBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doc Modal */}
      {activeModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full p-6 text-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white">
                {activeModalDoc.type === 'admit' ? 'Official Admission Admit Card' : 'Official Bank Fee Challan'}
              </h3>
              <button onClick={() => setActiveModalDoc(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="bg-white text-gray-900 p-6 rounded-xl border border-gray-300 font-sans space-y-4">
              <div className="text-center border-b pb-3">
                <h2 className="text-lg font-bold text-gray-900">{activeModalDoc.app.university_name || 'Khwaja Yunus Ali University (KYAU)'}</h2>
                <p className="text-xs text-gray-600">Enayetpur, Sirajganj, Bangladesh</p>
                <div className="mt-2 inline-block px-3 py-1 rounded bg-blue-100 text-blue-900 font-bold text-xs">
                  {activeModalDoc.type === 'admit' ? 'ADMIT CARD - 2026' : 'BANK CHALLAN SLIP (৳500)'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tracking:</span> <span className="font-mono font-bold">{activeModalDoc.app.tracking_id}</span></div>
                <div><span className="text-gray-500">Applicant:</span> <span className="font-semibold">{activeModalDoc.app.applicant_name}</span></div>
                <div><span className="text-gray-500">Program:</span> <span className="font-semibold">{activeModalDoc.app.program_name}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{activeModalDoc.app.status.toUpperCase()}</span></div>
              </div>

              <div className="pt-4 flex justify-between items-end text-[10px] text-gray-500">
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Authorized Controller of Examinations</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
