import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const verified = searchParams.get('verified');

    let students: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        students = await sql`
          SELECT 
            u.id, u.email, u.full_name, u.phone, u.profile_completed, u.created_at,
            sp.ssc_gpa, sp.ssc_group, sp.hsc_gpa, sp.hsc_group, sp.documents_verified,
            sp.photo_path, sp.signature_path,
            (SELECT COUNT(*) FROM applications a WHERE a.student_id = u.id) AS total_applications
          FROM users u
          LEFT JOIN student_profiles sp ON sp.user_id = u.id
          WHERE u.role = 'student'
          ORDER BY u.created_at DESC
        `;
      } catch (neonErr) {
        console.warn('Neon students query failed, using Supabase fallback:', neonErr);
      }
    }

    if (!students || students.length === 0) {
      const [usersRes, profilesRes, appsRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'student').order('created_at', { ascending: false }),
        supabase.from('student_profiles').select('*'),
        supabase.from('applications').select('student_id')
      ]);

      const users = usersRes.data || [];
      const profiles = profilesRes.data || [];
      const apps = appsRes.data || [];

      const profilesMap = Object.fromEntries(profiles.map(p => [String(p.user_id), p]));
      const appCounts: Record<string, number> = {};
      apps.forEach(a => {
        const sid = String(a.student_id);
        appCounts[sid] = (appCounts[sid] || 0) + 1;
      });

      students = users.map(u => {
        const p = profilesMap[String(u.id)] || {};
        return {
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          phone: u.phone,
          profile_completed: u.profile_completed,
          created_at: u.created_at,
          ssc_gpa: p.ssc_gpa,
          ssc_group: p.ssc_group,
          hsc_gpa: p.hsc_gpa,
          hsc_group: p.hsc_group,
          documents_verified: p.documents_verified,
          photo_path: p.photo_path,
          signature_path: p.signature_path,
          total_applications: appCounts[String(u.id)] || 0
        };
      });
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      students = students.filter(s =>
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q))
      );
    }

    if (verified !== null && verified !== undefined && verified !== '') {
      const isVerified = verified === '1' || verified === 'true';
      students = students.filter(s => Boolean(s.documents_verified) === isVerified);
    }

    return NextResponse.json({
      success: true,
      count: students.length,
      students
    });
  } catch (err: any) {
    console.error('Admin students list error:', err);
    return NextResponse.json({ success: true, count: 0, students: [] });
  }
}
