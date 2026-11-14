import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const university_id = searchParams.get('university_id');
    const program_id = searchParams.get('program_id');

    const sql = getSql();

    let meritList;
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
        JOIN universities u ON m.university_id = u.id
        JOIN programs p ON m.program_id = p.id
        JOIN users usr ON m.student_id = usr.id
        LEFT JOIN student_profiles sp ON sp.user_id = usr.id
        WHERE m.university_id = ${university_id} AND m.program_id = ${program_id}
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
        JOIN universities u ON m.university_id = u.id
        JOIN programs p ON m.program_id = p.id
        JOIN users usr ON m.student_id = usr.id
        LEFT JOIN student_profiles sp ON sp.user_id = usr.id
        WHERE m.university_id = ${university_id}
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
        JOIN universities u ON m.university_id = u.id
        JOIN programs p ON m.program_id = p.id
        JOIN users usr ON m.student_id = usr.id
        LEFT JOIN student_profiles sp ON sp.user_id = usr.id
        ORDER BY m.merit_position ASC
        LIMIT 50
      `;
    }

    return NextResponse.json({
      success: true,
      count: meritList.length,
      merit_list: meritList,
      merit_lists: meritList
    });
  } catch (err: any) {
    console.error('Merit list error:', err);
    return NextResponse.json({ success: true, count: 0, merit_list: [], merit_lists: [] });
  }
}
