import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET() {
  try {
    const sql = getSql();

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
        a.id, a.application_date, a.status, a.payment_status, a.payment_amount, a.assigned_id,
        u.name AS university_name, u.short_name AS university_short_name,
        p.name AS program_name,
        usr.full_name AS student_name, usr.email AS student_email, usr.phone AS student_phone
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      ORDER BY a.application_date DESC
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
      JOIN users usr ON a.student_id = usr.id
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.payment_status = 'paid'
      ORDER BY a.payment_date DESC
      LIMIT 6
    `;

    const pendingApps = await sql`
      SELECT a.id, a.application_date, a.status, a.payment_status,
             usr.full_name AS student_name, usr.email AS student_email,
             u.short_name AS university_short_name, p.name AS program_name
      FROM applications a
      JOIN users usr ON a.student_id = usr.id
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.status IN ('pending', 'under_review')
      ORDER BY a.application_date DESC
      LIMIT 6
    `;

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents: Number(userCount.c),
        newRegistrations: Number(newRegCount.c),
        pendingVerifications: Number(pendingDocCount.c),
        totalApplications: Number(appCount.c),
        pendingApplications: Number(pendingAppCount.c),
        verifiedPaymentsCount: Number(verifiedPay.c),
        verifiedPaymentsAmount: Number(verifiedPay.total),
        pendingPaymentsCount: Number(pendingPay.c),
        pendingPaymentsAmount: Number(pendingPay.total),
        activeUniversities: Number(activeUnis.c)
      },
      recentApplications,
      pendingTasks: {
        unverified_documents: unverifiedDocs,
        unverified_payments: unverifiedPayments,
        pending_applications: pendingApps
      }
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
