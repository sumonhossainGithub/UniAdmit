import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getStudentProfile, findUserByEmail } from '@/lib/data';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.id || '3';

    let user = session?.email ? await findUserByEmail(session.email) : null;
    let profile = await getStudentProfile(userId);

    return NextResponse.json({
      success: true,
      user: user || { id: userId, email: 'student@uniadmit.com', full_name: 'Husna Morsaline', role: 'student', profile_completed: true },
      profile: profile || {}
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

async function handleSave(req: Request) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.id || '3';

    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          body[key] = value;
        }
      });
    } else {
      body = await req.json().catch(() => ({}));
    }

    const sql = getSql();

    const father_name = body.father_name || '';
    const mother_name = body.mother_name || '';
    const date_of_birth = body.date_of_birth || '';
    const gender = body.gender || '';
    const nid_number = body.nid_number || '';
    const present_address = body.present_address || '';
    const permanent_address = body.permanent_address || '';
    const ssc_board = body.ssc_board || '';
    const ssc_roll = body.ssc_roll || '';
    const ssc_year = body.ssc_year || '';
    const ssc_gpa = body.ssc_gpa ? Number(body.ssc_gpa) : 5.0;
    const ssc_group = body.ssc_group || 'Science';
    const hsc_board = body.hsc_board || '';
    const hsc_roll = body.hsc_roll || '';
    const hsc_year = body.hsc_year || '';
    const hsc_gpa = body.hsc_gpa ? Number(body.hsc_gpa) : 5.0;
    const hsc_group = body.hsc_group || 'Science';

    await sql`
      INSERT INTO student_profiles (
        id, user_id, father_name, mother_name, date_of_birth, gender, nationality,
        nid_number, present_address, permanent_address, ssc_board, ssc_roll,
        ssc_year, ssc_gpa, ssc_group, hsc_board, hsc_roll, hsc_year, hsc_gpa, hsc_group
      ) VALUES (
        gen_random_uuid(), ${userId}, ${father_name}, ${mother_name},
        ${date_of_birth}, ${gender}, 'Bangladeshi', ${nid_number},
        ${present_address}, ${permanent_address}, ${ssc_board},
        ${ssc_roll}, ${ssc_year}, ${ssc_gpa}, ${ssc_group},
        ${hsc_board}, ${hsc_roll}, ${hsc_year}, ${hsc_gpa}, ${hsc_group}
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

    try {
      await supabase.from('student_profiles').upsert({
        user_id: String(userId),
        father_name,
        mother_name,
        date_of_birth,
        gender,
        nationality: 'Bangladeshi',
        nid_number,
        present_address,
        permanent_address,
        ssc_board,
        ssc_roll,
        ssc_year,
        ssc_gpa,
        ssc_group,
        hsc_board,
        hsc_roll,
        hsc_year,
        hsc_gpa,
        hsc_group
      }, { onConflict: 'user_id' });
    } catch {}

    const updatedProfile = await getStudentProfile(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      profile: updatedProfile || body
    });
  } catch (err: any) {
    console.error('Error saving profile:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return handleSave(req);
}

export async function POST(req: Request) {
  return handleSave(req);
}
