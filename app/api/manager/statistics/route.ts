import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();

    const [totalStudents] = await sql`SELECT COUNT(*) AS c FROM users WHERE role = 'student'`;
    const [totalApplications] = await sql`SELECT COUNT(*) AS c FROM applications`;
    const [pendingApps] = await sql`SELECT COUNT(*) AS c FROM applications WHERE status = 'pending'`;
    const [underReviewApps] = await sql`SELECT COUNT(*) AS c FROM applications WHERE status = 'under_review'`;
    const [approvedApps] = await sql`SELECT COUNT(*) AS c FROM applications WHERE status = 'approved'`;
    const [rejectedApps] = await sql`SELECT COUNT(*) AS c FROM applications WHERE status = 'rejected'`;
    const [waitlistedApps] = await sql`SELECT COUNT(*) AS c FROM applications WHERE status = 'waitlisted'`;

    const [totalPaid] = await sql`
      SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total 
      FROM applications WHERE payment_status IN ('paid', 'verified')
    `;
    const [verifiedPayments] = await sql`
      SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total 
      FROM applications WHERE payment_status = 'verified'
    `;
    const [unpaidApps] = await sql`
      SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total 
      FROM applications WHERE payment_status = 'unpaid'
    `;

    const [totalUniversities] = await sql`SELECT COUNT(*) AS c FROM universities`;
    const [totalPrograms] = await sql`SELECT COUNT(*) AS c FROM programs`;

    return NextResponse.json({
      success: true,
      statistics: {
        total_students: Number(totalStudents.c),
        total_applications: Number(totalApplications.c),
        pending_applications: Number(pendingApps.c),
        under_review_applications: Number(underReviewApps.c),
        approved_applications: Number(approvedApps.c),
        rejected_applications: Number(rejectedApps.c),
        waitlisted_applications: Number(waitlistedApps.c),
        paid_applications_count: Number(totalPaid.c),
        total_revenue_collected: Number(totalPaid.total),
        verified_revenue: Number(verifiedPayments.total),
        pending_revenue: Number(unpaidApps.total),
        total_universities: Number(totalUniversities.c),
        total_programs: Number(totalPrograms.c)
      }
    });
  } catch (err: any) {
    console.error('Manager statistics error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
