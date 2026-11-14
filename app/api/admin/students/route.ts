import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const verified = searchParams.get('verified');

    const sql = getSql();

    let students = await sql`
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
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
