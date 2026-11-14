import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { supabase } from '@/lib/supabase';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
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
      const students = await sql`SELECT id FROM users WHERE role = 'student'`;
      for (const s of students) {
        await sql`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (${s.id}, ${title.trim()}, ${message.trim()}, ${type})
        `;
        try {
          await supabase.from('notifications').insert({
            user_id: String(s.id),
            title: title.trim(),
            message: message.trim(),
            type
          });
        } catch {}
        recipientsCount++;
      }
    } else {
      await sql`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (${user_id}, ${title.trim()}, ${message.trim()}, ${type})
      `;
      try {
        await supabase.from('notifications').insert({
          user_id: String(user_id),
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
