import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getSql();

    const [user] = await sql`
      SELECT id, email, role, full_name, phone, profile_completed, created_at 
      FROM users WHERE id = ${id}
    `;

    if (!user) {
      return NextResponse.json({ success: false, message: 'Student not found.' }, { status: 404 });
    }

    const [profile] = await sql`SELECT * FROM student_profiles WHERE user_id = ${id}`;

    const applications = await sql`
      SELECT a.*, u.name AS university_name, u.short_name AS university_short_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.student_id = ${id}
      ORDER BY a.application_date DESC
    `;

    return NextResponse.json({
      success: true,
      student: user,
      profile: profile || {},
      applications
    });
  } catch (err: any) {
    console.error('Admin student details error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
