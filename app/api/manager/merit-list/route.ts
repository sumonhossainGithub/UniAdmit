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

    const sql = getSql();

    const [program] = await sql`SELECT * FROM programs WHERE id = ${program_id} AND university_id = ${university_id}`;
    if (!program) {
      return NextResponse.json({ success: false, message: 'Program not found for this university.' }, { status: 404 });
    }

    await sql`DELETE FROM merit_list WHERE university_id = ${university_id} AND program_id = ${program_id}`;
    try {
      await supabase.from('merit_list').delete().match({ university_id: String(university_id), program_id: String(program_id) });
    } catch {}

    let count = 0;

    if (auto_generate) {
      const candidates = await sql`
        SELECT 
          a.student_id,
          (COALESCE(sp.ssc_gpa, 0) + COALESCE(sp.hsc_gpa, 0)) AS total_score,
          sp.hsc_gpa,
          sp.ssc_gpa
        FROM applications a
        JOIN student_profiles sp ON sp.user_id = a.student_id
        WHERE a.university_id = ${university_id} AND a.program_id = ${program_id}
        ORDER BY total_score DESC, sp.hsc_gpa DESC, sp.ssc_gpa DESC
      `;

      const seats = program.seats || 50;

      for (let i = 0; i < candidates.length; i++) {
        const pos = i + 1;
        const status = pos <= seats ? 'selected' : 'waitlisted';

        await sql`
          INSERT INTO merit_list (university_id, program_id, student_id, merit_position, status, published_at)
          VALUES (${university_id}, ${program_id}, ${candidates[i].student_id}, ${pos}, ${status}, NOW())
        `;

        try {
          await supabase.from('merit_list').insert({
            university_id: String(university_id),
            program_id: String(program_id),
            student_id: String(candidates[i].student_id),
            merit_position: pos,
            status,
            published_at: new Date().toISOString()
          });

          await supabase.from('notifications').insert({
            user_id: String(candidates[i].student_id),
            title: `Merit List Published: ${program.name}`,
            message: `You have been ranked at Merit Position #${pos} (${status.toUpperCase()}) for ${program.name}.`,
            type: status === 'selected' ? 'success' : 'info'
          });
        } catch {}

        count++;
      }
    } else if (Array.isArray(entries)) {
      for (const entry of entries) {
        await sql`
          INSERT INTO merit_list (university_id, program_id, student_id, merit_position, status, published_at)
          VALUES (${university_id}, ${program_id}, ${entry.student_id}, ${entry.merit_position}, ${entry.status || 'selected'}, NOW())
        `;
        count++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Merit list generated and published successfully for ${program.name}.`,
      ranked_count: count
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error generating merit list:', err);
    return NextResponse.json({ success: false, message: 'Failed to generate merit list: ' + err.message }, { status: 500 });
  }
}
