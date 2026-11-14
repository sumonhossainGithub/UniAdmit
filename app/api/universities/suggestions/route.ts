import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSessionUser } from '@/lib/auth';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.id || '3';

    const sql = getSql();
    const [profile] = await sql`SELECT * FROM student_profiles WHERE user_id = ${userId}`;
    const sscGpa = profile ? Number(profile.ssc_gpa || 0) : 4.5;
    const hscGpa = profile ? Number(profile.hsc_gpa || 0) : 4.5;

    const universities = await sql`
      SELECT * FROM universities 
      WHERE is_active = true 
        AND min_gpa_ssc <= ${sscGpa} 
        AND min_gpa_hsc <= ${hscGpa}
      ORDER BY name ASC
    `;

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
