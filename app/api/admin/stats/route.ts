import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();
    if (sql) {
      try {
        const [userCount] = await sql`SELECT COUNT(*) as c FROM users WHERE role = 'student'`;
        const [newRegCount] = await sql`
          SELECT COUNT(*) as c FROM users 
          WHERE role = 'student' 
            AND created_at >= NOW() - INTERVAL '30 days'
        `;
        const [pendingDocCount] = await sql`
          SELECT COUNT(*) as c FROM student_profiles WHERE documents_verified = false OR documents_verified IS NULL
        `;
        const [appCount] = await sql`SELECT COUNT(*) as c FROM applications`;
        const [pendingAppCount] = await sql`SELECT COUNT(*) as c FROM applications WHERE status IN ('pending', 'under_review')`;
        const [verifiedPay] = await sql`
          SELECT COUNT(*) as c, COALESCE(SUM(payment_amount), 0) as total 
          FROM applications WHERE payment_status = 'verified'
        `;
        const [pendingPay] = await sql`
          SELECT COUNT(*) as c, COALESCE(SUM(payment_amount), 0) as total 
          FROM applications WHERE payment_status = 'paid'
        `;
        const [activeUnis] = await sql`SELECT COUNT(*) as c FROM universities WHERE is_active = true`;

        // Recent 10 applications with university & student joins
        const recentApplications = await sql`
          SELECT 
            a.id, COALESCE(a.application_date, a.created_at) AS application_date, a.status, a.payment_status, a.payment_amount, a.assigned_id,
            u.name AS university_name, u.short_name AS university_short_name,
            p.name AS program_name,
            usr.full_name AS student_name, usr.email AS student_email, usr.phone AS student_phone
          FROM applications a
          LEFT JOIN universities u ON a.university_id = u.id
          LEFT JOIN programs p ON a.program_id = p.id
          LEFT JOIN users usr ON a.student_id = usr.id
          ORDER BY COALESCE(a.application_date, a.created_at) DESC
          LIMIT 10
        `;

        // Pending Tasks
        const unverifiedDocs = await sql`
          SELECT usr.id, usr.full_name, usr.email, sp.ssc_gpa, sp.hsc_gpa, usr.created_at, sp.photo_path, sp.signature_path
          FROM users usr
          JOIN student_profiles sp ON usr.id = sp.user_id
          WHERE sp.documents_verified = false OR sp.documents_verified IS NULL
          ORDER BY usr.created_at DESC
          LIMIT 6
        `;

        const unverifiedPayments = await sql`
          SELECT a.id, a.payment_amount, a.payment_transaction_id, a.payment_date,
                 usr.full_name AS student_name, usr.email AS student_email,
                 u.short_name AS university_short_name, p.name AS program_name
          FROM applications a
          LEFT JOIN users usr ON a.student_id = usr.id
          LEFT JOIN universities u ON a.university_id = u.id
          LEFT JOIN programs p ON a.program_id = p.id
          WHERE a.payment_status = 'paid'
          ORDER BY a.payment_date DESC
          LIMIT 6
        `;

        const pendingApps = await sql`
          SELECT a.id, COALESCE(a.application_date, a.created_at) AS application_date, a.status, a.payment_status,
                 usr.full_name AS student_name, usr.email AS student_email,
                 u.short_name AS university_short_name, p.name AS program_name
          FROM applications a
          LEFT JOIN users usr ON a.student_id = usr.id
          LEFT JOIN universities u ON a.university_id = u.id
          LEFT JOIN programs p ON a.program_id = p.id
          WHERE a.status IN ('pending', 'under_review')
          ORDER BY COALESCE(a.application_date, a.created_at) DESC
          LIMIT 6
        `;

        return NextResponse.json({
          success: true,
          stats: {
            totalStudents: Number(userCount?.c || 0),
            newRegistrations: Number(newRegCount?.c || 0),
            pendingVerifications: Number(pendingDocCount?.c || 0),
            totalApplications: Number(appCount?.c || 0),
            pendingApplications: Number(pendingAppCount?.c || 0),
            verifiedPaymentsCount: Number(verifiedPay?.c || 0),
            verifiedPaymentsAmount: Number(verifiedPay?.total || 0),
            pendingPaymentsCount: Number(pendingPay?.c || 0),
            pendingPaymentsAmount: Number(pendingPay?.total || 0),
            activeUniversities: Number(activeUnis?.c || 0)
          },
          recentApplications,
          pendingTasks: {
            unverified_documents: unverifiedDocs,
            unverified_payments: unverifiedPayments,
            pending_applications: pendingApps
          }
        });
      } catch (neonErr) {
        console.warn('Neon query in admin stats failed, using Supabase fallback:', neonErr);
      }
    }

    // Supabase fallback
    const [usersRes, profilesRes, appsRes, unisRes, progsRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('student_profiles').select('*'),
      supabase.from('applications').select('*'),
      supabase.from('universities').select('*'),
      supabase.from('programs').select('*')
    ]);

    const users = usersRes.data || [];
    const profiles = profilesRes.data || [];
    const apps = appsRes.data || [];
    const unis = unisRes.data || [];
    const progs = progsRes.data || [];

    const unisMap = Object.fromEntries(unis.map(u => [String(u.id), u]));
    const progsMap = Object.fromEntries(progs.map(p => [String(p.id), p]));
    const usersMap = Object.fromEntries(users.map(u => [String(u.id), u]));
    const profilesMap = Object.fromEntries(profiles.map(p => [String(p.user_id), p]));

    const students = users.filter(u => u.role === 'student');
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const newStudents = students.filter(s => new Date(s.created_at).getTime() >= thirtyDaysAgo);
    const pendingProfiles = profiles.filter(p => !p.documents_verified);
    const pendingApps = apps.filter(a => a.status === 'pending' || a.status === 'under_review');
    const verifiedPayments = apps.filter(a => a.payment_status === 'verified');
    const pendingPayments = apps.filter(a => a.payment_status === 'paid');
    const activeUnis = unis.filter(u => u.is_active !== false);

    const verifiedPaymentsAmount = verifiedPayments.reduce((sum, a) => sum + Number(a.payment_amount || 0), 0);
    const pendingPaymentsAmount = pendingPayments.reduce((sum, a) => sum + Number(a.payment_amount || 0), 0);

    const enrichedApps = apps.map(a => {
      const u = unisMap[String(a.university_id)] || {};
      const p = progsMap[String(a.program_id)] || {};
      const usr = usersMap[String(a.student_id)] || {};
      return {
        id: a.id,
        application_date: a.application_date || a.created_at,
        status: a.status,
        payment_status: a.payment_status,
        payment_amount: a.payment_amount,
        assigned_id: a.assigned_id,
        university_name: u.name,
        university_short_name: u.short_name,
        program_name: p.name,
        student_name: usr.full_name,
        student_email: usr.email,
        student_phone: usr.phone
      };
    });

    const recentApplications = enrichedApps.slice(0, 10);

    const unverifiedDocs = students
      .filter(s => {
        const pr = profilesMap[String(s.id)];
        return !pr || !pr.documents_verified;
      })
      .slice(0, 6)
      .map(s => {
        const pr = profilesMap[String(s.id)] || {};
        return {
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          ssc_gpa: pr.ssc_gpa,
          hsc_gpa: pr.hsc_gpa,
          created_at: s.created_at,
          photo_path: pr.photo_path,
          signature_path: pr.signature_path
        };
      });

    const unverifiedPaymentsList = apps
      .filter(a => a.payment_status === 'paid')
      .slice(0, 6)
      .map(a => {
        const u = unisMap[String(a.university_id)] || {};
        const p = progsMap[String(a.program_id)] || {};
        const usr = usersMap[String(a.student_id)] || {};
        return {
          id: a.id,
          payment_amount: a.payment_amount,
          payment_transaction_id: a.payment_transaction_id,
          payment_date: a.payment_date,
          student_name: usr.full_name,
          student_email: usr.email,
          university_short_name: u.short_name,
          program_name: p.name
        };
      });

    const pendingAppsList = enrichedApps.filter(a => a.status === 'pending' || a.status === 'under_review').slice(0, 6);

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents: students.length,
        newRegistrations: newStudents.length,
        pendingVerifications: pendingProfiles.length,
        totalApplications: apps.length,
        pendingApplications: pendingApps.length,
        verifiedPaymentsCount: verifiedPayments.length,
        verifiedPaymentsAmount,
        pendingPaymentsCount: pendingPayments.length,
        pendingPaymentsAmount,
        activeUniversities: activeUnis.length
      },
      recentApplications,
      pendingTasks: {
        unverified_documents: unverifiedDocs,
        unverified_payments: unverifiedPaymentsList,
        pending_applications: pendingAppsList
      }
    });
  } catch (err: any) {
    console.error('Admin stats fallback error:', err);
    return NextResponse.json({
      success: true,
      stats: {
        totalStudents: 0,
        newRegistrations: 0,
        pendingVerifications: 0,
        totalApplications: 0,
        pendingApplications: 0,
        verifiedPaymentsCount: 0,
        verifiedPaymentsAmount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsAmount: 0,
        activeUniversities: 0
      },
      recentApplications: [],
      pendingTasks: {
        unverified_documents: [],
        unverified_payments: [],
        pending_applications: []
      }
    });
  }
}
