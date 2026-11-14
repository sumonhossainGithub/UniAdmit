import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.id || '3';
    const sql = getSql();

    const notifications = await sql`
      SELECT * FROM notifications
      WHERE user_id = ${userId} OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;

    if (notifications.length === 0) {
      const defaultNotifs = [
        {
          id: 1,
          title: 'Centralized Admission Circular 2026-2027',
          message: 'Applications are currently open for all 12 universities including DU, BUET, and KYAU.',
          type: 'info',
          is_read: false,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'KYAU Merit List Published',
          message: 'First merit list for CSE, EEE, and Pharmacy is available for inspection.',
          type: 'success',
          is_read: false,
          created_at: new Date().toISOString()
        }
      ];
      return NextResponse.json({
        success: true,
        unread_count: 2,
        unreadCount: 2,
        notifications: defaultNotifs
      });
    }

    const unread = notifications.filter(n => !n.is_read).length;

    return NextResponse.json({
      success: true,
      unread_count: unread,
      unreadCount: unread,
      notifications
    });
  } catch (err: any) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({
      success: true,
      unread_count: 0,
      unreadCount: 0,
      notifications: []
    });
  }
}
