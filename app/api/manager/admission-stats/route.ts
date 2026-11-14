import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();

    const departmentStats = await sql`
      SELECT p.department, COUNT(a.id) AS applications_count, SUM(p.seats) AS total_seats
      FROM programs p
      LEFT JOIN applications a ON a.program_id = p.id
      GROUP BY p.department
      ORDER BY applications_count DESC
    `;

    const genderStats = await sql`
      SELECT COALESCE(sp.gender, 'Not Specified') AS gender, COUNT(a.id) AS count
      FROM applications a
      LEFT JOIN student_profiles sp ON sp.user_id = a.student_id
      GROUP BY sp.gender
    `;

    const boardStats = await sql`
      SELECT COALESCE(sp.hsc_board, 'Unknown') AS board, COUNT(a.id) AS count
      FROM applications a
      LEFT JOIN student_profiles sp ON sp.user_id = a.student_id
      GROUP BY sp.hsc_board
      ORDER BY count DESC
    `;

    const capacityStats = await sql`
      SELECT 
        u.short_name AS university,
        SUM(p.seats) AS total_capacity,
        COUNT(a.id) AS total_applications,
        ROUND((COUNT(a.id) * 1.0 / NULLIF(SUM(p.seats), 0)), 2) AS demand_ratio
      FROM universities u
      JOIN programs p ON p.university_id = u.id
      LEFT JOIN applications a ON a.program_id = p.id
      GROUP BY u.id, u.short_name
      ORDER BY total_applications DESC
    `;

    return NextResponse.json({
      success: true,
      admission_stats: {
        by_department: departmentStats,
        by_gender: genderStats,
        by_board: boardStats,
        capacity_utilization: capacityStats
      }
    });
  } catch (err: any) {
    console.error('Admission stats error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
