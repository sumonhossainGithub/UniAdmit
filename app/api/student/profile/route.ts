import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStudentProfile, findUserByEmail } from '@/lib/data';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserByEmail(session.email);
    const profile = await getStudentProfile(user?.id || session.id);

    return NextResponse.json({
      success: true,
      user,
      profile: profile || {}
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const sql = getSql();

    await sql`
      INSERT INTO student_profiles (
        id, user_id, father_name, mother_name, date_of_birth, gender, nationality,
        nid_number, present_address, permanent_address, ssc_board, ssc_roll,
        ssc_year, ssc_gpa, ssc_group, hsc_board, hsc_roll, hsc_year, hsc_gpa, hsc_group
      ) VALUES (
        gen_random_uuid(), ${session.id}, ${body.father_name || ''}, ${body.mother_name || ''},
        ${body.date_of_birth || ''}, ${body.gender || ''}, 'Bangladeshi', ${body.nid_number || ''},
        ${body.present_address || ''}, ${body.permanent_address || ''}, ${body.ssc_board || ''},
        ${body.ssc_roll || ''}, ${body.ssc_year || ''}, ${body.ssc_gpa || 5.0}, ${body.ssc_group || 'Science'},
        ${body.hsc_board || ''}, ${body.hsc_roll || ''}, ${body.hsc_year || ''}, ${body.hsc_gpa || 5.0}, ${body.hsc_group || 'Science'}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        father_name = EXCLUDED.father_name,
        mother_name = EXCLUDED.mother_name,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        present_address = EXCLUDED.present_address,
        permanent_address = EXCLUDED.permanent_address,
        ssc_board = EXCLUDED.ssc_board,
        ssc_roll = EXCLUDED.ssc_roll,
        ssc_year = EXCLUDED.ssc_year,
        ssc_gpa = EXCLUDED.ssc_gpa,
        ssc_group = EXCLUDED.ssc_group,
        hsc_board = EXCLUDED.hsc_board,
        hsc_roll = EXCLUDED.hsc_roll,
        hsc_year = EXCLUDED.hsc_year,
        hsc_gpa = EXCLUDED.hsc_gpa,
        hsc_group = EXCLUDED.hsc_group;
    `;

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
