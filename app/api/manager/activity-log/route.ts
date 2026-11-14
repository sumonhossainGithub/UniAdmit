import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();

    const logs = await sql`
      SELECT 
        al.id,
        al.action,
        al.details,
        al.created_at,
        usr.full_name AS user_name,
        usr.email AS user_email,
        usr.role AS user_role
      FROM activity_log al
      LEFT JOIN users usr ON al.user_id = usr.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `;

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
