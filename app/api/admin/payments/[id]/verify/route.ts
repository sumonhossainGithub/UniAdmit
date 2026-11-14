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

    let appRecord: any = null;

    // 1. Try Neon
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          SELECT a.*, u.name AS university_name, p.name AS program_name
          FROM applications a
          LEFT JOIN universities u ON a.university_id::text = u.id::text
          LEFT JOIN programs p ON a.program_id::text = p.id::text
          WHERE a.id::text = ${cleanId}
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          appRecord = rows[0];
        }
      } catch (neonErr) {
        console.warn('Neon payment verify lookup failed:', neonErr);
      }
    }

    // 2. Fallback to Supabase
    if (!appRecord) {
      const { data: supaApp } = await supabase
        .from('applications')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (supaApp) {
        const [uniRes, progRes] = await Promise.all([
          supabase.from('universities').select('name').eq('id', String(supaApp.university_id)).maybeSingle(),
          supabase.from('programs').select('name').eq('id', String(supaApp.program_id)).maybeSingle()
        ]);
        appRecord = {
          ...supaApp,
          university_name: uniRes.data?.name || 'University',
          program_name: progRes.data?.name || 'Program'
        };
      }
    }

    if (!appRecord) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }

    // Update Neon if available
    if (sql) {
      try {
        await sql`
          UPDATE applications
          SET payment_status = 'verified'
          WHERE id::text = ${cleanId}
        `;
      } catch (neonUpdateErr) {
        console.warn('Neon payment verify update failed:', neonUpdateErr);
      }
    }

    // Update Supabase
    try {
      await supabase.from('applications').update({
        payment_status: 'verified'
      }).eq('id', cleanId);

      await supabase.from('notifications').insert({
        user_id: String(appRecord.student_id),
        title: 'Payment Verified Successfully',
        message: `Your payment of ${appRecord.payment_amount || 1000} BDT for ${appRecord.program_name} has been verified by the accounts department.`,
        type: 'success'
      });
    } catch (supaErr) {
      console.warn('Supabase payment verify update failed:', supaErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment has been verified successfully.'
    });
  } catch (err: any) {
    console.error('Error verifying payment:', err);
    return NextResponse.json({ success: false, message: 'Failed to verify payment.' }, { status: 500 });
  }
}
