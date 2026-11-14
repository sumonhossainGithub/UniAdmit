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
    const sql = getSql();

    const [appRecord] = await sql`
      SELECT a.*, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ${id}
    `;

    if (!appRecord) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }

    await sql`
      UPDATE applications
      SET payment_status = 'verified'
      WHERE id = ${id}
    `;

    try {
      await supabase.from('applications').update({
        payment_status: 'verified'
      }).eq('id', String(id));

      await supabase.from('notifications').insert({
        user_id: String(appRecord.student_id),
        title: 'Payment Verified Successfully',
        message: `Your payment of ${appRecord.payment_amount} BDT for ${appRecord.program_name} has been verified by the accounts department.`,
        type: 'success'
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Payment has been verified successfully.'
    });
  } catch (err: any) {
    console.error('Error verifying payment:', err);
    return NextResponse.json({ success: false, message: 'Failed to verify payment.' }, { status: 500 });
  }
}
