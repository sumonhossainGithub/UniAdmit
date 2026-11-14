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
            total_students: Number(totalStudents?.c || 0),
            total_applications: Number(totalApplications?.c || 0),
            pending_applications: Number(pendingApps?.c || 0),
            under_review_applications: Number(underReviewApps?.c || 0),
            approved_applications: Number(approvedApps?.c || 0),
            rejected_applications: Number(rejectedApps?.c || 0),
            waitlisted_applications: Number(waitlistedApps?.c || 0),
            paid_applications_count: Number(totalPaid?.c || 0),
            total_revenue_collected: Number(totalPaid?.total || 0),
            verified_revenue: Number(verifiedPayments?.total || 0),
            pending_revenue: Number(unpaidApps?.total || 0),
            total_universities: Number(totalUniversities?.c || 0),
            total_programs: Number(totalPrograms?.c || 0)
          }
        });
      } catch (neonErr) {
        console.warn('Neon query in manager statistics failed, using Supabase fallback:', neonErr);
      }
    }

    // Supabase fallback
    const [usersRes, appsRes, unisRes, progsRes] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'student'),
      supabase.from('applications').select('*'),
      supabase.from('universities').select('*'),
      supabase.from('programs').select('*')
    ]);

    const students = usersRes.data || [];
    const apps = appsRes.data || [];
    const unis = unisRes.data || [];
    const progs = progsRes.data || [];

    const pendingApps = apps.filter(a => a.status === 'pending');
    const underReviewApps = apps.filter(a => a.status === 'under_review');
    const approvedApps = apps.filter(a => a.status === 'approved');
    const rejectedApps = apps.filter(a => a.status === 'rejected');
    const waitlistedApps = apps.filter(a => a.status === 'waitlisted');

    const paidApps = apps.filter(a => a.payment_status === 'paid' || a.payment_status === 'verified');
    const verifiedApps = apps.filter(a => a.payment_status === 'verified');
    const unpaidApps = apps.filter(a => a.payment_status === 'unpaid');

    const totalRevenue = paidApps.reduce((sum, a) => sum + Number(a.payment_amount || 0), 0);
    const verifiedRevenue = verifiedApps.reduce((sum, a) => sum + Number(a.payment_amount || 0), 0);
    const pendingRevenue = unpaidApps.reduce((sum, a) => sum + Number(a.payment_amount || 0), 0);

    return NextResponse.json({
      success: true,
      statistics: {
        total_students: students.length,
        total_applications: apps.length,
        pending_applications: pendingApps.length,
        under_review_applications: underReviewApps.length,
        approved_applications: approvedApps.length,
        rejected_applications: rejectedApps.length,
        waitlisted_applications: waitlistedApps.length,
        paid_applications_count: paidApps.length,
        total_revenue_collected: totalRevenue,
        verified_revenue: verifiedRevenue,
        pending_revenue: pendingRevenue,
        total_universities: unis.length,
        total_programs: progs.length
      }
    });
  } catch (err: any) {
    console.error('Manager statistics error:', err);
    return NextResponse.json({
      success: true,
      statistics: {
        total_students: 0,
        total_applications: 0,
        pending_applications: 0,
        under_review_applications: 0,
        approved_applications: 0,
        rejected_applications: 0,
        waitlisted_applications: 0,
        paid_applications_count: 0,
        total_revenue_collected: 0,
        verified_revenue: 0,
        pending_revenue: 0,
        total_universities: 0,
        total_programs: 0
      }
    });
  }
}
