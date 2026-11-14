import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const university_id = searchParams.get('university_id');
    const payment_status = searchParams.get('payment_status');
    const search = searchParams.get('search');

    let applications: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        applications = await sql`
          SELECT 
            a.*,
            COALESCE(a.application_date, a.created_at) AS application_date,
            u.name AS university_name,
            u.short_name AS university_short_name,
            p.name AS program_name,
            p.department AS program_department,
            usr.full_name AS student_name,
            usr.email AS student_email,
            usr.phone AS student_phone,
            sp.ssc_gpa,
            sp.hsc_gpa,
            sp.hsc_group,
            sp.documents_verified
          FROM applications a
          LEFT JOIN universities u ON a.university_id = u.id
          LEFT JOIN programs p ON a.program_id = p.id
          LEFT JOIN users usr ON a.student_id = usr.id
          LEFT JOIN student_profiles sp ON sp.user_id = usr.id
          ORDER BY COALESCE(a.application_date, a.created_at) DESC
        `;
      } catch (neonErr) {
        console.warn('Neon applications query failed, using Supabase fallback:', neonErr);
      }
    }

    if (!applications || applications.length === 0) {
      const [appsRes, unisRes, progsRes, usersRes, profilesRes] = await Promise.all([
        supabase.from('applications').select('*').order('created_at', { ascending: false }),
        supabase.from('universities').select('*'),
        supabase.from('programs').select('*'),
        supabase.from('users').select('*'),
        supabase.from('student_profiles').select('*')
      ]);

      const apps = appsRes.data || [];
      const unis = unisRes.data || [];
      const progs = progsRes.data || [];
      const users = usersRes.data || [];
      const profiles = profilesRes.data || [];

      const unisMap = Object.fromEntries(unis.map(u => [String(u.id), u]));
      const progsMap = Object.fromEntries(progs.map(p => [String(p.id), p]));
      const usersMap = Object.fromEntries(users.map(u => [String(u.id), u]));
      const profilesMap = Object.fromEntries(profiles.map(p => [String(p.user_id), p]));

      applications = apps.map(a => {
        const u = unisMap[String(a.university_id)] || {};
        const p = progsMap[String(a.program_id)] || {};
        const usr = usersMap[String(a.student_id)] || {};
        const sp = profilesMap[String(a.student_id)] || {};
        return {
          ...a,
          application_date: a.application_date || a.created_at,
          university_name: u.name,
          university_short_name: u.short_name,
          program_name: p.name,
          program_department: p.department,
          student_name: usr.full_name,
          student_email: usr.email,
          student_phone: usr.phone,
          ssc_gpa: sp.ssc_gpa,
          hsc_gpa: sp.hsc_gpa,
          hsc_group: sp.hsc_group,
          documents_verified: sp.documents_verified
        };
      });
    }

    if (status && status !== 'all') {
      applications = applications.filter(a => a.status === status);
    }
    if (university_id && university_id !== 'all') {
      applications = applications.filter(a => String(a.university_id) === String(university_id));
    }
    if (payment_status && payment_status !== 'all') {
      applications = applications.filter(a => a.payment_status === payment_status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      applications = applications.filter(a =>
        (a.student_name && a.student_name.toLowerCase().includes(q)) ||
        (a.student_email && a.student_email.toLowerCase().includes(q)) ||
        (a.assigned_id && a.assigned_id.toLowerCase().includes(q)) ||
        (a.tracking_id && a.tracking_id.toLowerCase().includes(q)) ||
        (a.payment_transaction_id && a.payment_transaction_id.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err: any) {
    console.error('Admin applications list error:', err);
    return NextResponse.json({ success: true, count: 0, applications: [] });
  }
}
