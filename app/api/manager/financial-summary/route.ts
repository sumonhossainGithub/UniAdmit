import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();

    if (sql) {
      try {
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
          LEFT JOIN universities u ON a.university_id = u.id
          LEFT JOIN users usr ON a.student_id = usr.id
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
      } catch (neonErr) {
        console.warn('Neon financial summary error, using Supabase fallback:', neonErr);
      }
    }

    // Supabase fallback
    const [appsRes, unisRes, usersRes] = await Promise.all([
      supabase.from('applications').select('*'),
      supabase.from('universities').select('*'),
      supabase.from('users').select('*')
    ]);

    const apps = appsRes.data || [];
    const unis = unisRes.data || [];
    const users = usersRes.data || [];

    const unisMap: Record<string, any> = Object.fromEntries(unis.map(u => [String(u.id), u]));
    const usersMap: Record<string, any> = Object.fromEntries(users.map(u => [String(u.id), u]));

    let total_collected = 0;
    let total_verified = 0;
    let total_pending = 0;

    const uniStats: Record<string, any> = {};
    unis.forEach(u => {
      uniStats[String(u.id)] = {
        university_id: u.id,
        university_name: u.name,
        university_short_name: u.short_name,
        total_applications: 0,
        paid_count: 0,
        total_fee_collected: 0
      };
    });

    apps.forEach(a => {
      const amt = Number(a.payment_amount) || 500;
      const isPaid = a.payment_status === 'paid' || a.payment_status === 'verified';
      const isVer = a.payment_status === 'verified';
      const isUnpaid = a.payment_status === 'unpaid';

      if (isPaid) total_collected += amt;
      if (isVer) total_verified += amt;
      if (isUnpaid) total_pending += amt;

      const uid = String(a.university_id);
      if (uniStats[uid]) {
        uniStats[uid].total_applications += 1;
        if (isPaid) {
          uniStats[uid].paid_count += 1;
          uniStats[uid].total_fee_collected += amt;
        }
      }
    });

    const recent_transactions = apps
      .filter(a => a.payment_status === 'paid' || a.payment_status === 'verified' || a.payment_transaction_id)
      .slice(0, 15)
      .map(a => {
        const u = unisMap[String(a.university_id)] || {};
        const usr = usersMap[String(a.student_id)] || {};
        return {
          application_id: a.id,
          payment_transaction_id: a.payment_transaction_id || `TXN_${a.id}`,
          payment_amount: a.payment_amount || 500,
          payment_date: a.payment_date || a.created_at,
          payment_status: a.payment_status || 'paid',
          university_short_name: u.short_name || 'UNI',
          student_name: usr.full_name || a.applicant_name || 'Student'
        };
      });

    return NextResponse.json({
      success: true,
      financial_summary: {
        total_collected,
        total_verified,
        total_pending,
        by_university: Object.values(uniStats),
        recent_transactions
      }
    });
  } catch (err: any) {
    console.error('Financial summary error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
