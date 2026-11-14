import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth';

function getSql() {
  return getNeonSql();
}

export async function PUT(req: Request) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.id || '3';
    const body = await req.json().catch(() => ({}));
    const { id } = body;

    const sql = getSql();

    if (id) {
      await sql`UPDATE notifications SET is_read = true WHERE id = ${id} AND user_id = ${userId}`;
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', String(id)).eq('user_id', String(userId));
      } catch {}
    } else {
      await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`;
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', String(userId));
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to update notifications.' }, { status: 500 });
  }
}
