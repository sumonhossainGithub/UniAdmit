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

    const payments = await sql`
      SELECT 
        a.id AS application_id,
        a.university_id,
        a.program_id,
        a.payment_amount,
        a.payment_status,
        a.payment_date,
        a.payment_transaction_id,
        a.application_date,
        u.name AS university_name,
        u.short_name AS university_short_name,
        u.logo_url AS university_logo,
        p.name AS program_name,
        p.department AS program_department
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.student_id = ${userId}
      ORDER BY a.payment_date DESC, a.application_date DESC
    `;

    const totalPaid = payments
      .filter(p => p.payment_status === 'paid' || p.payment_status === 'verified')
      .reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0);

    const totalPending = payments
      .filter(p => p.payment_status === 'unpaid')
      .reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0);

    return NextResponse.json({
      success: true,
      count: payments.length,
      summary: {
        total_paid: totalPaid,
        total_pending: totalPending,
        total_transactions: payments.length
      },
      payments
    });
  } catch (err: any) {
    console.error('Student payments error:', err);
    return NextResponse.json({ success: false, message: 'Failed to retrieve payments.' }, { status: 500 });
  }
}
