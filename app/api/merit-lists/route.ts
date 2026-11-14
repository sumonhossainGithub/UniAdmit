import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const university_id = searchParams.get('university_id');
    const program_id = searchParams.get('program_id');

    let meritList: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        if (university_id && program_id) {
          meritList = await sql`
            SELECT 
              m.id,
              m.merit_position,
              m.status,
              m.published_at,
              u.name AS university_name,
              u.short_name AS university_short_name,
              p.name AS program_name,
              p.department AS program_department,
              usr.full_name AS student_name,
              sp.ssc_gpa,
              sp.hsc_gpa,
              sp.hsc_group
            FROM merit_list m
            LEFT JOIN universities u ON m.university_id::text = u.id::text
            LEFT JOIN programs p ON m.program_id::text = p.id::text
            LEFT JOIN users usr ON m.student_id::text = usr.id::text
            LEFT JOIN student_profiles sp ON sp.user_id::text = usr.id::text
            WHERE m.university_id::text = ${String(university_id)} AND m.program_id::text = ${String(program_id)}
            ORDER BY m.merit_position ASC
          `;
        } else if (university_id) {
          meritList = await sql`
            SELECT 
              m.id,
              m.merit_position,
              m.status,
              m.published_at,
              u.name AS university_name,
              u.short_name AS university_short_name,
              p.name AS program_name,
              p.department AS program_department,
              usr.full_name AS student_name,
              sp.ssc_gpa,
              sp.hsc_gpa,
              sp.hsc_group
            FROM merit_list m
            LEFT JOIN universities u ON m.university_id::text = u.id::text
            LEFT JOIN programs p ON m.program_id::text = p.id::text
            LEFT JOIN users usr ON m.student_id::text = usr.id::text
            LEFT JOIN student_profiles sp ON sp.user_id::text = usr.id::text
            WHERE m.university_id::text = ${String(university_id)}
            ORDER BY m.merit_position ASC
          `;
        } else {
          meritList = await sql`
            SELECT 
              m.id,
              m.merit_position,
              m.status,
              m.published_at,
              u.name AS university_name,
              u.short_name AS university_short_name,
              p.name AS program_name,
              p.department AS program_department,
              usr.full_name AS student_name,
              sp.ssc_gpa,
              sp.hsc_gpa,
              sp.hsc_group
            FROM merit_list m
            LEFT JOIN universities u ON m.university_id::text = u.id::text
            LEFT JOIN programs p ON m.program_id::text = p.id::text
            LEFT JOIN users usr ON m.student_id::text = usr.id::text
            LEFT JOIN student_profiles sp ON sp.user_id::text = usr.id::text
            ORDER BY m.published_at DESC, m.merit_position ASC
            LIMIT 100
          `;
        }
      } catch (neonErr) {
        console.warn('Neon merit list query failed, using Supabase fallback:', neonErr);
      }
    }

    if (!meritList || meritList.length === 0) {
      let query = supabase.from('merit_list').select('*').order('merit_position', { ascending: true });
      if (university_id && program_id) {
        query = query.eq('university_id', String(university_id)).eq('program_id', String(program_id));
      } else if (university_id) {
        query = query.eq('university_id', String(university_id));
      } else {
        query = query.limit(100);
      }

      const [meritRes, unisRes, progsRes, usersRes, profilesRes] = await Promise.all([
        query,
        supabase.from('universities').select('id, name, short_name'),
        supabase.from('programs').select('id, name, department'),
        supabase.from('users').select('id, full_name'),
        supabase.from('student_profiles').select('user_id, ssc_gpa, hsc_gpa, hsc_group')
      ]);

      const items = meritRes.data || [];
      const unisMap: Record<string, any> = Object.fromEntries((unisRes.data || []).map(u => [String(u.id), u]));
      const progsMap: Record<string, any> = Object.fromEntries((progsRes.data || []).map(p => [String(p.id), p]));
      const usersMap: Record<string, any> = Object.fromEntries((usersRes.data || []).map(u => [String(u.id), u]));
      const profilesMap: Record<string, any> = Object.fromEntries((profilesRes.data || []).map(p => [String(p.user_id), p]));

      meritList = items.map(m => {
        const u = unisMap[String(m.university_id)] || {};
        const p = progsMap[String(m.program_id)] || {};
        const usr = usersMap[String(m.student_id)] || {};
        const sp = profilesMap[String(m.student_id)] || {};
        return {
          id: m.id,
          merit_position: m.merit_position,
          status: m.status || 'selected',
          published_at: m.published_at || m.created_at,
          university_name: u.name || 'University',
          university_short_name: u.short_name || 'UNI',
          program_name: p.name || 'Program',
          program_department: p.department || 'General',
          student_name: usr.full_name || 'Applicant',
          ssc_gpa: sp.ssc_gpa,
          hsc_gpa: sp.hsc_gpa,
          hsc_group: sp.hsc_group
        };
      });
    }

    return NextResponse.json({
      success: true,
      count: meritList.length,
      merit_list: meritList
    });
  } catch (err: any) {
    console.error('Error fetching merit list:', err);
    return NextResponse.json({ success: true, count: 0, merit_list: [] });
  }
}
