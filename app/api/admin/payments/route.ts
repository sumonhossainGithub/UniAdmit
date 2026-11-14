import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    let payments: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        payments = await sql`
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
          LEFT JOIN universities u ON a.university_id = u.id
          LEFT JOIN programs p ON a.program_id = p.id
          LEFT JOIN users usr ON a.student_id = usr.id
          WHERE a.payment_status IN ('paid', 'verified') OR a.payment_transaction_id IS NOT NULL
          ORDER BY a.payment_date DESC
        `;
      } catch (neonErr) {
        console.warn('Neon payments query failed, using Supabase fallback:', neonErr);
      }
    }

    if (!payments || payments.length === 0) {
      const [appsRes, unisRes, progsRes, usersRes] = await Promise.all([
        supabase.from('applications').select('*').or('payment_status.in.(paid,verified),payment_transaction_id.not.is.null').order('payment_date', { ascending: false }),
        supabase.from('universities').select('*'),
        supabase.from('programs').select('*'),
        supabase.from('users').select('*')
      ]);

      const apps = appsRes.data || [];
      const unis = unisRes.data || [];
      const progs = progsRes.data || [];
      const users = usersRes.data || [];

      const unisMap = Object.fromEntries(unis.map(u => [String(u.id), u]));
      const progsMap = Object.fromEntries(progs.map(p => [String(p.id), p]));
      const usersMap = Object.fromEntries(users.map(u => [String(u.id), u]));

      payments = apps.map(a => {
        const u = unisMap[String(a.university_id)] || {};
        const p = progsMap[String(a.program_id)] || {};
        const usr = usersMap[String(a.student_id)] || {};
        return {
          application_id: a.id,
          payment_status: a.payment_status,
          payment_amount: a.payment_amount,
          payment_date: a.payment_date,
          payment_transaction_id: a.payment_transaction_id,
          university_name: u.name,
          university_short_name: u.short_name,
          program_name: p.name,
          student_id: usr.id,
          student_name: usr.full_name,
          student_email: usr.email,
          student_phone: usr.phone
        };
      });
    }

    return NextResponse.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (err: any) {
    console.error('Error listing payments:', err);
    return NextResponse.json({ success: true, count: 0, payments: [] });
  }
}
