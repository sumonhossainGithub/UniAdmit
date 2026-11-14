import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { supabase } from '@/lib/supabase';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { type = 'application', data } = body;

    if (!data) {
      return NextResponse.json({ success: false, message: 'Data payload is required.' }, { status: 400 });
    }

    const sql = getSql();

    if (type === 'application') {
      const { status, remarks, payment_status, assigned_id } = data;
      await sql`
        UPDATE applications
        SET status = COALESCE(${status || null}, status),
            remarks = COALESCE(${remarks || null}, remarks),
            payment_status = COALESCE(${payment_status || null}, payment_status),
            assigned_id = COALESCE(${assigned_id || null}, assigned_id)
        WHERE id = ${id}
      `;
      try {
        await supabase.from('applications').update({
          status: status || undefined,
          remarks: remarks || undefined,
          payment_status: payment_status || undefined,
          assigned_id: assigned_id || undefined
        }).eq('id', String(id));
      } catch {}
    } else if (type === 'student') {
      const { full_name, phone, ssc_gpa, hsc_gpa, ssc_board, hsc_board, ssc_roll, hsc_roll, ssc_year, hsc_year, ssc_group, hsc_group, present_address, permanent_address, documents_verified } = data;
      await sql`
        UPDATE users
        SET full_name = COALESCE(${full_name || null}, full_name),
            phone = COALESCE(${phone || null}, phone)
        WHERE id = ${id}
      `;
      await sql`
        UPDATE student_profiles
        SET ssc_gpa = COALESCE(${ssc_gpa !== undefined && ssc_gpa !== '' ? Number(ssc_gpa) : null}, ssc_gpa),
            hsc_gpa = COALESCE(${hsc_gpa !== undefined && hsc_gpa !== '' ? Number(hsc_gpa) : null}, hsc_gpa),
            ssc_board = COALESCE(${ssc_board || null}, ssc_board),
            hsc_board = COALESCE(${hsc_board || null}, hsc_board),
            ssc_roll = COALESCE(${ssc_roll || null}, ssc_roll),
            hsc_roll = COALESCE(${hsc_roll || null}, hsc_roll),
            ssc_year = COALESCE(${ssc_year || null}, ssc_year),
            hsc_year = COALESCE(${hsc_year || null}, hsc_year),
            ssc_group = COALESCE(${ssc_group || null}, ssc_group),
            hsc_group = COALESCE(${hsc_group || null}, hsc_group),
            present_address = COALESCE(${present_address || null}, present_address),
            permanent_address = COALESCE(${permanent_address || null}, permanent_address),
            documents_verified = COALESCE(${documents_verified !== undefined ? Boolean(documents_verified) : null}, documents_verified)
        WHERE user_id = ${id}
      `;
    }

    return NextResponse.json({
      success: true,
      message: `${type} record #${id} successfully updated.`
    });
  } catch (err: any) {
    console.error('Error updating record:', err);
    return NextResponse.json({ success: false, message: 'Failed to update record: ' + err.message }, { status: 500 });
  }
}
