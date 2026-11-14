import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth';

function getSql() {
  return getNeonSql();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const body = await req.json().catch(() => ({}));
    const { payment_method = 'bKash', transaction_id } = body;

    const session = await getSessionUser(req);
    const sql = getSql();

    let application: any = null;

    // 1. Try Neon
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
          application = rows[0];
        }
      } catch (neonErr) {
        console.warn('Neon pay lookup failed:', neonErr);
      }
    }

    // 2. Fallback to Supabase
    if (!application) {
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
        application = {
          ...supaApp,
          university_name: uniRes.data?.name || 'University',
          program_name: progRes.data?.name || 'Program'
        };
      }
    }

    if (!application) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }

    const generatedTxn = transaction_id || `TXN_${payment_method.toUpperCase()}_${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // Update Neon if available
    if (sql) {
      try {
        await sql`
          UPDATE applications
          SET payment_status = 'paid',
              payment_date = NOW(),
              payment_transaction_id = ${generatedTxn}
          WHERE id::text = ${cleanId}
        `;
      } catch (neonUpdateErr) {
        console.warn('Neon pay update failed:', neonUpdateErr);
      }
    }

    // Update Supabase
    try {
      await supabase.from('applications').update({
        payment_status: 'paid',
        payment_date: nowIso,
        payment_transaction_id: generatedTxn
      }).eq('id', cleanId);

      await supabase.from('notifications').insert({
        user_id: String(application.student_id),
        title: 'Payment Received',
        message: `Your payment of ${application.payment_amount || 1000} BDT via ${payment_method} has been received. Transaction ID: ${generatedTxn}. Verification is in progress.`,
        type: 'info'
      });
    } catch (supaErr) {
      console.warn('Supabase pay update failed:', supaErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment submitted successfully and pending verification.',
      transaction_id: generatedTxn
    });
  } catch (err: any) {
    console.error('Payment processing error:', err);
    return NextResponse.json({ success: false, message: 'Failed to process payment.' }, { status: 500 });
  }
}
