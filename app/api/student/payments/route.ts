import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.id || '3';

    let payments: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        payments = await sql`
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
          LEFT JOIN universities u ON a.university_id::text = u.id::text
          LEFT JOIN programs p ON a.program_id::text = p.id::text
          WHERE a.student_id::text = ${String(userId)}
          ORDER BY a.payment_date DESC, a.application_date DESC
        `;
      } catch (neonErr) {
        console.warn('Neon student payments query failed, using Supabase fallback:', neonErr);
      }
    }

    if (!payments || payments.length === 0) {
      const [appsRes, unisRes, progsRes] = await Promise.all([
        supabase.from('applications').select('*').eq('student_id', String(userId)).order('created_at', { ascending: false }),
        supabase.from('universities').select('id, name, short_name, logo_url'),
        supabase.from('programs').select('id, name, department')
      ]);

      const apps = appsRes.data || [];
      const unisMap: Record<string, any> = Object.fromEntries((unisRes.data || []).map(u => [String(u.id), u]));
      const progsMap: Record<string, any> = Object.fromEntries((progsRes.data || []).map(p => [String(p.id), p]));

      payments = apps.map(a => {
        const u = unisMap[String(a.university_id)] || {};
        const p = progsMap[String(a.program_id)] || {};
        return {
          application_id: a.id,
          university_id: a.university_id,
          program_id: a.program_id,
          payment_amount: a.payment_amount,
          payment_status: a.payment_status || 'unpaid',
          payment_date: a.payment_date,
          payment_transaction_id: a.payment_transaction_id,
          application_date: a.application_date || a.created_at,
          university_name: u.name || 'University',
          university_short_name: u.short_name || 'UNI',
          university_logo: u.logo_url || null,
          program_name: p.name || 'Program',
          program_department: p.department || 'General'
        };
      });
    }

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
