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
      } catch (neonErr) {
        console.warn('Neon reports error, using Supabase fallback:', neonErr);
      }
    }

    // Supabase fallback
    const [appsRes, profilesRes, unisRes, progsRes] = await Promise.all([
      supabase.from('applications').select('*'),
      supabase.from('student_profiles').select('*'),
      supabase.from('universities').select('*'),
      supabase.from('programs').select('*')
    ]);

    const apps = appsRes.data || [];
    const profiles = profilesRes.data || [];
    const unis = unisRes.data || [];
    const progs = progsRes.data || [];

    const profilesMap: Record<string, any> = Object.fromEntries(profiles.map(p => [String(p.user_id), p]));
    const unisMap: Record<string, any> = Object.fromEntries(unis.map(u => [String(u.id), u]));
    const progsMap: Record<string, any> = Object.fromEntries(progs.map(p => [String(p.id), p]));

    // Status counts
    const statusMap: Record<string, number> = {};
    apps.forEach(a => {
      const s = a.status || 'pending';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const applications_by_status = Object.keys(statusMap).map(s => ({
      status: s,
      count: statusMap[s]
    }));

    // Group counts
    const groupMap: Record<string, number> = {};
    apps.forEach(a => {
      const sp = profilesMap[String(a.student_id)] || {};
      const g = sp.hsc_group || 'Science';
      groupMap[g] = (groupMap[g] || 0) + 1;
    });
    const applications_by_group = Object.keys(groupMap).map(g => ({
      hsc_group: g,
      count: groupMap[g]
    }));

    // Top universities
    const uniCounts: Record<string, number> = {};
    apps.forEach(a => {
      const uid = String(a.university_id);
      uniCounts[uid] = (uniCounts[uid] || 0) + 1;
    });
    const top_universities = Object.keys(uniCounts).map(uid => {
      const u = unisMap[uid] || {};
      return {
        id: uid,
        name: u.name || 'University',
        short_name: u.short_name || 'UNI',
        total_applications: uniCounts[uid]
      };
    }).sort((a, b) => b.total_applications - a.total_applications).slice(0, 5);

    // Top programs
    const progCounts: Record<string, number> = {};
    apps.forEach(a => {
      const pid = String(a.program_id);
      progCounts[pid] = (progCounts[pid] || 0) + 1;
    });
    const top_programs = Object.keys(progCounts).map(pid => {
      const p = progsMap[pid] || {};
      const u = unisMap[String(p.university_id)] || {};
      return {
        id: pid,
        name: p.name || 'Program',
        university: u.short_name || 'UNI',
        application_count: progCounts[pid]
      };
    }).sort((a, b) => b.application_count - a.application_count).slice(0, 8);

    const totalApps = apps.length;
    const approvedApps = apps.filter(a => a.status === 'approved').length;
    const acceptanceRate = totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(1) + '%' : '0%';

    return NextResponse.json({
      success: true,
      report: {
        total_applications: totalApps,
        acceptance_rate: acceptanceRate,
        applications_by_status,
        applications_by_group,
        top_universities,
        top_programs
      }
    });
  } catch (err: any) {
    console.error('Reports error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
