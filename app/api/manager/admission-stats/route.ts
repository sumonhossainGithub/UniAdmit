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
      } catch (neonErr) {
        console.warn('Neon admission stats error, using Supabase fallback:', neonErr);
      }
    }

    // Supabase fallback
    const [appsRes, progsRes, profilesRes, unisRes] = await Promise.all([
      supabase.from('applications').select('*'),
      supabase.from('programs').select('*'),
      supabase.from('student_profiles').select('*'),
      supabase.from('universities').select('*')
    ]);

    const apps = appsRes.data || [];
    const progs = progsRes.data || [];
    const profiles = profilesRes.data || [];
    const unis = unisRes.data || [];

    const progsMap: Record<string, any> = Object.fromEntries(progs.map(p => [String(p.id), p]));
    const profilesMap: Record<string, any> = Object.fromEntries(profiles.map(p => [String(p.user_id), p]));
    const unisMap: Record<string, any> = Object.fromEntries(unis.map(u => [String(u.id), u]));

    // By department
    const deptCounts: Record<string, number> = {};
    const deptSeats: Record<string, number> = {};
    progs.forEach(p => {
      const d = p.department || 'General';
      deptSeats[d] = (deptSeats[d] || 0) + (Number(p.seats) || 50);
    });
    apps.forEach(a => {
      const p = progsMap[String(a.program_id)] || {};
      const d = p.department || 'General';
      deptCounts[d] = (deptCounts[d] || 0) + 1;
    });
    const by_department = Object.keys(deptSeats).map(d => ({
      department: d,
      applications_count: deptCounts[d] || 0,
      total_seats: deptSeats[d]
    })).sort((a, b) => b.applications_count - a.applications_count);

    // By gender
    const genderCounts: Record<string, number> = {};
    apps.forEach(a => {
      const sp = profilesMap[String(a.student_id)] || {};
      const g = sp.gender || 'Not Specified';
      genderCounts[g] = (genderCounts[g] || 0) + 1;
    });
    const by_gender = Object.keys(genderCounts).map(g => ({
      gender: g,
      count: genderCounts[g]
    }));

    // By board
    const boardCounts: Record<string, number> = {};
    apps.forEach(a => {
      const sp = profilesMap[String(a.student_id)] || {};
      const b = sp.hsc_board || 'Dhaka';
      boardCounts[b] = (boardCounts[b] || 0) + 1;
    });
    const by_board = Object.keys(boardCounts).map(b => ({
      board: b,
      count: boardCounts[b]
    })).sort((a, b) => b.count - a.count);

    // Capacity utilization
    const uniSeats: Record<string, number> = {};
    const uniApps: Record<string, number> = {};
    progs.forEach(p => {
      const u = unisMap[String(p.university_id)]?.short_name || 'UNI';
      uniSeats[u] = (uniSeats[u] || 0) + (Number(p.seats) || 50);
    });
    apps.forEach(a => {
      const u = unisMap[String(a.university_id)]?.short_name || 'UNI';
      uniApps[u] = (uniApps[u] || 0) + 1;
    });
    const capacity_utilization = Object.keys(uniSeats).map(u => {
      const total_capacity = uniSeats[u] || 1;
      const total_applications = uniApps[u] || 0;
      return {
        university: u,
        total_capacity,
        total_applications,
        demand_ratio: Number((total_applications / total_capacity).toFixed(2))
      };
    }).sort((a, b) => b.total_applications - a.total_applications);

    return NextResponse.json({
      success: true,
      admission_stats: {
        by_department,
        by_gender,
        by_board,
        capacity_utilization
      }
    });
  } catch (err: any) {
    console.error('Admission stats error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
