import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();

    const [col] = await sql`SELECT COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status IN ('paid', 'verified')`;
    const [ver] = await sql`SELECT COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status = 'verified'`;
    const [pen] = await sql`SELECT COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status = 'unpaid'`;

    const byUniversity = await sql`
      SELECT 
        u.id AS university_id,
        u.name AS university_name,
        u.short_name AS university_short_name,
        COUNT(a.id) AS total_applications,
        SUM(CASE WHEN a.payment_status IN ('paid', 'verified') THEN 1 ELSE 0 END) AS paid_count,
        COALESCE(SUM(CASE WHEN a.payment_status IN ('paid', 'verified') THEN a.payment_amount ELSE 0 END), 0) AS total_fee_collected
      FROM universities u
      LEFT JOIN applications a ON a.university_id = u.id
      GROUP BY u.id, u.name, u.short_name
      ORDER BY total_fee_collected DESC
    `;

    const recentTransactions = await sql`
      SELECT 
        a.id AS application_id,
        a.payment_transaction_id,
        a.payment_amount,
        a.payment_date,
        a.payment_status,
        u.short_name AS university_short_name,
        usr.full_name AS student_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN users usr ON a.student_id = usr.id
      WHERE a.payment_status IN ('paid', 'verified')
      ORDER BY a.payment_date DESC
      LIMIT 15
    `;

    return NextResponse.json({
      success: true,
      financial_summary: {
        total_collected: Number(col.total),
        total_verified: Number(ver.total),
        total_pending: Number(pen.total),
        by_university: byUniversity,
        recent_transactions: recentTransactions
      }
    });
  } catch (err: any) {
    console.error('Financial summary error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
