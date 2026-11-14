import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const body = await req.json();
    const { type = 'application', data } = body;

    if (!data) {
      return NextResponse.json({ success: false, message: 'Data payload is required.' }, { status: 400 });
    }

    const sql = getSql();

    if (type === 'application') {
      const { status, remarks, payment_status, assigned_id } = data;

      if (sql) {
        try {
          await sql`
            UPDATE applications
            SET status = COALESCE(${status || null}, status),
                remarks = COALESCE(${remarks || null}, remarks),
                payment_status = COALESCE(${payment_status || null}, payment_status),
                assigned_id = COALESCE(${assigned_id || null}, assigned_id)
            WHERE id::text = ${cleanId}
          `;
        } catch (neonErr) {
          console.warn('Neon application record update failed:', neonErr);
        }
      }

      try {
        const supaUpdate: any = {};
        if (status !== undefined) supaUpdate.status = status;
        if (remarks !== undefined) supaUpdate.remarks = remarks;
        if (payment_status !== undefined) supaUpdate.payment_status = payment_status;
        if (assigned_id !== undefined) supaUpdate.assigned_id = assigned_id;

        await supabase.from('applications').update(supaUpdate).eq('id', cleanId);
      } catch (supaErr) {
        console.warn('Supabase application record update failed:', supaErr);
      }
    } else if (type === 'student') {
      const {
        full_name,
        phone,
        ssc_gpa,
        hsc_gpa,
        ssc_board,
        hsc_board,
        ssc_roll,
        hsc_roll,
        ssc_year,
        hsc_year,
        ssc_group,
        hsc_group,
        present_address,
        permanent_address,
        documents_verified
      } = data;

      if (sql) {
        try {
          await sql`
            UPDATE users
            SET full_name = COALESCE(${full_name ? full_name.trim() : null}, full_name),
                phone = COALESCE(${phone ? phone.trim() : null}, phone)
            WHERE id::text = ${cleanId}
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
                documents_verified = COALESCE(${documents_verified !== undefined ? Boolean(Number(documents_verified)) : null}, documents_verified)
            WHERE user_id::text = ${cleanId}
          `;
        } catch (neonErr) {
          console.warn('Neon student record update failed:', neonErr);
        }
      }

      try {
        const userUpdate: any = {};
        if (full_name) userUpdate.full_name = full_name.trim();
        if (phone !== undefined) userUpdate.phone = phone.trim();
        if (Object.keys(userUpdate).length > 0) {
          await supabase.from('users').update(userUpdate).eq('id', cleanId);
        }

        const profileUpdate: any = {};
        if (ssc_gpa !== undefined && ssc_gpa !== '') profileUpdate.ssc_gpa = Number(ssc_gpa);
        if (hsc_gpa !== undefined && hsc_gpa !== '') profileUpdate.hsc_gpa = Number(hsc_gpa);
        if (ssc_board !== undefined) profileUpdate.ssc_board = ssc_board;
        if (hsc_board !== undefined) profileUpdate.hsc_board = hsc_board;
        if (ssc_roll !== undefined) profileUpdate.ssc_roll = ssc_roll;
        if (hsc_roll !== undefined) profileUpdate.hsc_roll = hsc_roll;
        if (ssc_year !== undefined) profileUpdate.ssc_year = ssc_year;
        if (hsc_year !== undefined) profileUpdate.hsc_year = hsc_year;
        if (ssc_group !== undefined) profileUpdate.ssc_group = ssc_group;
        if (hsc_group !== undefined) profileUpdate.hsc_group = hsc_group;
        if (present_address !== undefined) profileUpdate.present_address = present_address;
        if (permanent_address !== undefined) profileUpdate.permanent_address = permanent_address;
        if (documents_verified !== undefined) profileUpdate.documents_verified = Boolean(Number(documents_verified));

        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('student_profiles').update(profileUpdate).eq('user_id', cleanId);
        }
      } catch (supaErr) {
        console.warn('Supabase student record update failed:', supaErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${type.toUpperCase()} record #${cleanId} successfully updated.`
    });
  } catch (err: any) {
    console.error('Error updating record:', err);
    return NextResponse.json({ success: false, message: 'Failed to update record.' }, { status: 500 });
  }
}
