import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();

    const statusCounts = await sql`
      SELECT status, COUNT(*) AS count
      FROM applications
      GROUP BY status
    `;

    const groupCounts = await sql`
      SELECT COALESCE(sp.hsc_group, 'Not Specified') AS hsc_group, COUNT(a.id) AS count
      FROM applications a
      LEFT JOIN student_profiles sp ON sp.user_id = a.student_id
      GROUP BY sp.hsc_group
    `;

    const topUniversities = await sql`
      SELECT u.id, u.name, u.short_name, COUNT(a.id) AS total_applications
      FROM universities u
      LEFT JOIN applications a ON a.university_id = u.id
      GROUP BY u.id, u.name, u.short_name
      ORDER BY total_applications DESC
      LIMIT 5
    `;

    const topPrograms = await sql`
      SELECT p.id, p.name, u.short_name AS university, COUNT(a.id) AS application_count
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      LEFT JOIN applications a ON a.program_id = p.id
      GROUP BY p.id, p.name, u.short_name
      ORDER BY application_count DESC
      LIMIT 8
    `;

    const [tot] = await sql`SELECT COUNT(*) AS c FROM applications`;
    const [app] = await sql`SELECT COUNT(*) AS c FROM applications WHERE status = 'approved'`;
    const totalApps = Number(tot.c);
    const approvedApps = Number(app.c);
    const acceptanceRate = totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(1) + '%' : '0%';

    return NextResponse.json({
      success: true,
      report: {
        total_applications: totalApps,
        acceptance_rate: acceptanceRate,
        applications_by_status: statusCounts,
        applications_by_group: groupCounts,
        top_universities: topUniversities,
        top_programs: topPrograms
      }
    });
  } catch (err: any) {
    console.error('Reports error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
