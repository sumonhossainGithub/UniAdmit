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
    const body = await req.json().catch(() => ({}));
    const { payment_method = 'bKash', transaction_id } = body;

    const session = await getSessionUser(req);
    const sql = getSql();

    const [application] = await sql`
      SELECT a.*, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ${id}
    `;

    if (!application) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }

    const generatedTxn = transaction_id || `TXN_${payment_method.toUpperCase()}_${Date.now().toString().slice(-6)}`;

    await sql`
      UPDATE applications
      SET payment_status = 'paid',
          payment_date = NOW(),
          payment_transaction_id = ${generatedTxn}
      WHERE id = ${id}
    `;

    try {
      await supabase.from('applications').update({
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        payment_transaction_id: generatedTxn
      }).eq('id', String(id));

      await supabase.from('notifications').insert({
        user_id: String(application.student_id),
        title: 'Payment Received',
        message: `Payment of ${application.payment_amount || 500} BDT for ${application.program_name} at ${application.university_name} has been confirmed. Transaction ID: ${generatedTxn}.`,
        type: 'success'
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Payment received successfully!',
      transaction_id: generatedTxn,
      payment_status: 'paid'
    });
  } catch (err: any) {
    console.error('Error processing payment:', err);
    return NextResponse.json({ success: false, message: 'Failed to process payment.' }, { status: 500 });
  }
}
