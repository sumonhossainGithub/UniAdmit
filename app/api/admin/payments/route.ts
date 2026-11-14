import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET() {
  try {
    const sql = getSql();

    const payments = await sql`
      SELECT 
        a.id AS application_id,
        a.payment_status,
        a.payment_amount,
        a.payment_date,
        a.payment_transaction_id,
        u.name AS university_name,
        u.short_name AS university_short_name,
        p.name AS program_name,
        usr.id AS student_id,
        usr.full_name AS student_name,
        usr.email AS student_email,
        usr.phone AS student_phone
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      WHERE a.payment_status IN ('paid', 'verified') OR a.payment_transaction_id IS NOT NULL
      ORDER BY a.payment_date DESC
    `;

    return NextResponse.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (err: any) {
    console.error('Error listing payments:', err);
    return NextResponse.json({ success: false, message: 'Failed to retrieve payments.' }, { status: 500 });
  }
}
