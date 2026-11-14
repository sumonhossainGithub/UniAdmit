import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

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

    const sql = getSql();

    let applications = await sql`
      SELECT 
        a.*,
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
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      LEFT JOIN student_profiles sp ON sp.user_id = usr.id
      ORDER BY a.application_date DESC
    `;

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
    return NextResponse.json({ success: false, message: 'Error retrieving applications.' }, { status: 500 });
  }
}
