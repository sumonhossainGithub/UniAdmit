import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    let logs: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        logs = await sql`
          SELECT 
            al.id,
            al.action,
            al.details,
            al.created_at,
            usr.full_name AS user_name,
            usr.email AS user_email,
            usr.role AS user_role
          FROM activity_log al
          LEFT JOIN users usr ON al.user_id::text = usr.id::text
          ORDER BY al.created_at DESC
          LIMIT 100
        `;
      } catch (neonErr) {
        console.warn('Neon activity log error, trying Supabase:', neonErr);
      }
    }

    if (!logs || logs.length === 0) {
      const [logsRes, usersRes] = await Promise.all([
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('users').select('*')
      ]);

      const logList = logsRes.data || [];
      const users = usersRes.data || [];
      const usersMap: Record<string, any> = Object.fromEntries(users.map(u => [String(u.id), u]));

      logs = logList.map(l => {
        const usr = usersMap[String(l.user_id)] || {};
        return {
          id: l.id,
          action: l.action,
          details: l.details,
          created_at: l.created_at,
          user_name: usr.full_name || 'System',
          user_email: usr.email || '',
          user_role: usr.role || 'manager'
        };
      });
    }

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err: any) {
    console.error('Activity log error:', err);
    return NextResponse.json({ success: true, count: 0, logs: [] });
  }
}
