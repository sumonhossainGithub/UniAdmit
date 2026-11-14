import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    let notices: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        notices = await sql`
          SELECT 
            n.*,
            u.name AS university_name,
            u.short_name AS university_short_name,
            usr.full_name AS created_by_name
          FROM notices n
          LEFT JOIN universities u ON n.university_id = u.id
          LEFT JOIN users usr ON n.created_by = usr.id
          ORDER BY n.created_at DESC
        `;
      } catch (neonErr) {
        console.warn('Neon notices query failed, using Supabase fallback:', neonErr);
      }
    }

    if (!notices || notices.length === 0) {
      const [noticesRes, unisRes, usersRes] = await Promise.all([
        supabase.from('notices').select('*').order('created_at', { ascending: false }),
        supabase.from('universities').select('*'),
        supabase.from('users').select('*')
      ]);

      const nList = noticesRes.data || [];
      const unis = unisRes.data || [];
      const users = usersRes.data || [];

      const unisMap = Object.fromEntries(unis.map(u => [String(u.id), u]));
      const usersMap = Object.fromEntries(users.map(u => [String(u.id), u]));

      notices = nList.map(n => {
        const u = unisMap[String(n.university_id)] || {};
        const usr = usersMap[String(n.created_by)] || {};
        return {
          ...n,
          university_name: u.name,
          university_short_name: u.short_name,
          created_by_name: usr.full_name
        };
      });
    }

    return NextResponse.json({
      success: true,
      count: notices.length,
      notices
    });
  } catch (err: any) {
    console.error('Error listing notices:', err);
    return NextResponse.json({ success: true, count: 0, notices: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, university_id } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, message: 'Title and content are required.' }, { status: 400 });
    }

    const sql = getSql();
    const uniId = university_id ? String(university_id) : null;
    let newId: string | number = Date.now();

    if (sql) {
      try {
        const [inserted] = await sql`
          INSERT INTO notices (title, content, university_id, created_by, is_active, created_at)
          VALUES (${title.trim()}, ${content.trim()}, ${uniId}, '1', true, NOW())
          RETURNING id
        `;
        if (inserted?.id) newId = inserted.id;
      } catch (neonErr) {
        console.warn('Neon notice insert error:', neonErr);
      }
    }

    try {
      const { data } = await supabase.from('notices').insert({
        title: title.trim(),
        content: content.trim(),
        university_id: uniId,
        created_by: '1',
        is_active: true
      }).select('id').maybeSingle();
      if (data?.id) newId = data.id;
    } catch (e) {
      console.warn('Supabase notice insert error:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Notice created successfully.',
      noticeId: newId
    });
  } catch (err: any) {
    console.error('Error creating notice:', err);
    return NextResponse.json({ success: false, message: 'Failed to create notice.' }, { status: 500 });
  }
}
