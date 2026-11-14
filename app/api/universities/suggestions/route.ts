import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.id || '3';

    let profile: any = null;
    let universities: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        const pRows = await sql`SELECT * FROM student_profiles WHERE user_id::text = ${String(userId)} LIMIT 1`;
        if (pRows && pRows.length > 0) profile = pRows[0];

        const sscGpa = profile ? Number(profile.ssc_gpa || 0) : 4.5;
        const hscGpa = profile ? Number(profile.hsc_gpa || 0) : 4.5;

        universities = await sql`
          SELECT * FROM universities 
          WHERE is_active = true 
            AND min_gpa_ssc <= ${sscGpa} 
            AND min_gpa_hsc <= ${hscGpa}
          ORDER BY name ASC
        `;
      } catch (neonErr) {
        console.warn('Neon suggestions query error, using Supabase fallback:', neonErr);
      }
    }

    if (!profile) {
      const { data } = await supabase.from('student_profiles').select('*').eq('user_id', String(userId)).maybeSingle();
      if (data) profile = data;
    }

    const sscGpa = profile ? Number(profile.ssc_gpa || 4.5) : 4.5;
    const hscGpa = profile ? Number(profile.hsc_gpa || 4.5) : 4.5;

    if (!universities || universities.length === 0) {
      const { data } = await supabase.from('universities').select('*').eq('is_active', true).order('name', { ascending: true });
      universities = (data || []).filter(u => {
        const minSsc = Number(u.min_gpa_ssc) || 0;
        const minHsc = Number(u.min_gpa_hsc) || 0;
        return minSsc <= sscGpa && minHsc <= hscGpa;
      });
    }

    return NextResponse.json({
      success: true,
      student: {
        ssc_gpa: sscGpa,
        ssc_group: profile?.ssc_group || 'Science',
        hsc_gpa: hscGpa,
        hsc_group: profile?.hsc_group || 'Science'
      },
      count: universities.length,
      suggestions: universities
    });
  } catch (err: any) {
    console.error('Error generating suggestions:', err);
    return NextResponse.json({ success: false, message: 'Error generating suggestions.' }, { status: 500 });
  }
}
