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
    const search = searchParams.get('search');

    let applications: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        applications = await sql`
          SELECT 
            a.*,
            u.name AS university_name,
            u.short_name AS university_short_name,
            p.name AS program_name,
            p.department AS program_department,
            p.seats AS program_seats,
            usr.full_name AS student_name,
            usr.email AS student_email,
            usr.phone AS student_phone,
            sp.ssc_gpa,
            sp.ssc_group,
            sp.ssc_board,
            sp.hsc_gpa,
            sp.hsc_group,
            sp.hsc_board,
            sp.documents_verified,
            sp.photo_path
          FROM applications a
          LEFT JOIN universities u ON a.university_id::text = u.id::text
          LEFT JOIN programs p ON a.program_id::text = p.id::text
          LEFT JOIN users usr ON a.student_id::text = usr.id::text
          LEFT JOIN student_profiles sp ON sp.user_id::text = usr.id::text
          ORDER BY a.application_date DESC
        `;
      } catch (neonErr) {
        console.warn('Neon manager applications query failed, using Supabase fallback:', neonErr);
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
      const unisMap: Record<string, any> = Object.fromEntries((unisRes.data || []).map(u => [String(u.id), u]));
      const progsMap: Record<string, any> = Object.fromEntries((progsRes.data || []).map(p => [String(p.id), p]));
      const usersMap: Record<string, any> = Object.fromEntries((usersRes.data || []).map(u => [String(u.id), u]));
      const profilesMap: Record<string, any> = Object.fromEntries((profilesRes.data || []).map(p => [String(p.user_id), p]));

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
          program_seats: p.seats,
          student_name: usr.full_name,
          student_email: usr.email,
          student_phone: usr.phone,
          ssc_gpa: sp.ssc_gpa,
          ssc_group: sp.ssc_group,
          ssc_board: sp.ssc_board,
          hsc_gpa: sp.hsc_gpa,
          hsc_group: sp.hsc_group,
          hsc_board: sp.hsc_board,
          documents_verified: sp.documents_verified,
          photo_path: sp.photo_path
        };
      });
    }

    if (status && status !== 'all') {
      applications = applications.filter(a => a.status === status);
    }
    if (university_id && university_id !== 'all') {
      applications = applications.filter(a => String(a.university_id) === String(university_id));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      applications = applications.filter(a =>
        (a.student_name && a.student_name.toLowerCase().includes(q)) ||
        (a.student_email && a.student_email.toLowerCase().includes(q)) ||
        (a.assigned_id && a.assigned_id.toLowerCase().includes(q)) ||
        (a.tracking_id && a.tracking_id.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err: any) {
    console.error('Manager applications error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
