import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { university_id, program_id, auto_generate = true, entries } = body;

    if (!university_id || !program_id) {
      return NextResponse.json({ success: false, message: 'University ID and Program ID are required.' }, { status: 400 });
    }

    const uId = String(university_id);
    const pId = String(program_id);

    let program: any = null;
    const sql = getSql();

    // 1. Find program
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM programs WHERE id::text = ${pId} LIMIT 1`;
        if (rows && rows.length > 0) program = rows[0];
      } catch (neonErr) {
        console.warn('Neon program lookup error:', neonErr);
      }
    }

    if (!program) {
      const { data } = await supabase.from('programs').select('*').eq('id', pId).maybeSingle();
      if (data) program = data;
    }

    if (!program) {
      return NextResponse.json({ success: false, message: 'Program not found.' }, { status: 404 });
    }

    // 2. Clear old merit list
    if (sql) {
      try {
        await sql`DELETE FROM merit_list WHERE university_id::text = ${uId} AND program_id::text = ${pId}`;
      } catch (neonErr) {
        console.warn('Neon merit_list delete error:', neonErr);
      }
    }

    try {
      await supabase.from('merit_list').delete().match({ university_id: uId, program_id: pId });
    } catch (supaErr) {
      console.warn('Supabase merit_list delete error:', supaErr);
    }

    let count = 0;

    if (auto_generate) {
      let candidates: any[] = [];

      if (sql) {
        try {
          candidates = await sql`
            SELECT 
              a.student_id,
              (COALESCE(sp.ssc_gpa, 0) + COALESCE(sp.hsc_gpa, 0)) AS total_score,
              sp.hsc_gpa,
              sp.ssc_gpa
            FROM applications a
            LEFT JOIN student_profiles sp ON sp.user_id::text = a.student_id::text
            WHERE a.university_id::text = ${uId} AND a.program_id::text = ${pId}
            ORDER BY total_score DESC, sp.hsc_gpa DESC, sp.ssc_gpa DESC
          `;
        } catch (neonErr) {
          console.warn('Neon candidates query error:', neonErr);
        }
      }

      if (!candidates || candidates.length === 0) {
        const [appsRes, profilesRes] = await Promise.all([
          supabase.from('applications').select('*').eq('university_id', uId).eq('program_id', pId),
          supabase.from('student_profiles').select('*')
        ]);

        const apps = appsRes.data || [];
        const profilesMap: Record<string, any> = Object.fromEntries((profilesRes.data || []).map(p => [String(p.user_id), p]));

        candidates = apps.map(a => {
          const sp = profilesMap[String(a.student_id)] || {};
          const ssc = Number(sp.ssc_gpa) || 4.5;
          const hsc = Number(sp.hsc_gpa) || 4.5;
          return {
            student_id: a.student_id,
            total_score: ssc + hsc,
            hsc_gpa: hsc,
            ssc_gpa: ssc
          };
        }).sort((a, b) => b.total_score - a.total_score || b.hsc_gpa - a.hsc_gpa);
      }

      const seats = program.seats || 50;

      for (let i = 0; i < candidates.length; i++) {
        const pos = i + 1;
        const status = pos <= seats ? 'selected' : 'waitlisted';
        const candStudentId = String(candidates[i].student_id);

        if (sql) {
          try {
            await sql`
              INSERT INTO merit_list (university_id, program_id, student_id, merit_position, status, published_at)
              VALUES (${uId}, ${pId}, ${candStudentId}, ${pos}, ${status}, NOW())
            `;
          } catch {}
        }

        try {
          await supabase.from('merit_list').insert({
            university_id: uId,
            program_id: pId,
            student_id: candStudentId,
            merit_position: pos,
            status,
            published_at: new Date().toISOString()
          });

          await supabase.from('notifications').insert({
            user_id: candStudentId,
            title: `Merit List Published: ${program.name}`,
            message: `You have been ranked at Merit Position #${pos} (${status.toUpperCase()}) for ${program.name}.`,
            type: status === 'selected' ? 'success' : 'info'
          });
        } catch {}

        count++;
      }
    } else if (Array.isArray(entries)) {
      for (const entry of entries) {
        const candStudentId = String(entry.student_id);
        const pos = entry.merit_position;
        const status = entry.status || 'selected';

        if (sql) {
          try {
            await sql`
              INSERT INTO merit_list (university_id, program_id, student_id, merit_position, status, published_at)
              VALUES (${uId}, ${pId}, ${candStudentId}, ${pos}, ${status}, NOW())
            `;
          } catch {}
        }

        try {
          await supabase.from('merit_list').insert({
            university_id: uId,
            program_id: pId,
            student_id: candStudentId,
            merit_position: pos,
            status,
            published_at: new Date().toISOString()
          });
        } catch {}

        count++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Merit list generated and published successfully for ${program.name}. (${count} candidates ranked)`,
      ranked_count: count
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error generating merit list:', err);
    return NextResponse.json({ success: false, message: 'Failed to generate merit list: ' + err.message }, { status: 500 });
  }
}
