import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, title, message, type = 'info' } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, message: 'Title and message are required.' }, { status: 400 });
    }

    const sql = getSql();
    let recipientsCount = 0;

    if (user_id === 'all' || !user_id) {
      let students: any[] = [];

      if (sql) {
        try {
          students = await sql`SELECT id FROM users WHERE role = 'student'`;
        } catch (neonErr) {
          console.warn('Neon students fetch for notify error:', neonErr);
        }
      }

      if (!students || students.length === 0) {
        const { data } = await supabase.from('users').select('id').eq('role', 'student');
        students = data || [];
      }

      for (const s of students) {
        const sId = String(s.id);

        if (sql) {
          try {
            await sql`
              INSERT INTO notifications (user_id, title, message, type)
              VALUES (${sId}, ${title.trim()}, ${message.trim()}, ${type})
            `;
          } catch {}
        }

        try {
          await supabase.from('notifications').insert({
            user_id: sId,
            title: title.trim(),
            message: message.trim(),
            type
          });
        } catch {}

        recipientsCount++;
      }
    } else {
      const sId = String(user_id);

      if (sql) {
        try {
          await sql`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (${sId}, ${title.trim()}, ${message.trim()}, ${type})
          `;
        } catch {}
      }

      try {
        await supabase.from('notifications').insert({
          user_id: sId,
          title: title.trim(),
          message: message.trim(),
          type
        });
      } catch {}

      recipientsCount = 1;
    }

    return NextResponse.json({
      success: true,
      message: `Notification dispatched successfully to ${recipientsCount} student(s).`
    });
  } catch (err: any) {
    console.error('Error sending notification:', err);
    return NextResponse.json({ success: false, message: 'Failed to send notification.' }, { status: 500 });
  }
}
