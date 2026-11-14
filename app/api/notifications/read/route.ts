import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
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
