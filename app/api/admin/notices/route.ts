import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    const sql = getSql();

    const notices = await sql`
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

    return NextResponse.json({
      success: true,
      count: notices.length,
      notices
    });
  } catch (err: any) {
    console.error('Error listing notices:', err);
    return NextResponse.json({ success: false, message: 'Failed to retrieve notices.' }, { status: 500 });
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

    const [inserted] = await sql`
      INSERT INTO notices (title, content, university_id, created_by, is_active, created_at)
      VALUES (${title.trim()}, ${content.trim()}, ${uniId}, '1', true, NOW())
      RETURNING id
    `;

    try {
      await supabase.from('notices').insert({
        title: title.trim(),
        content: content.trim(),
        university_id: uniId,
        created_by: '1',
        is_active: true
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Notice created successfully!',
      notice_id: inserted?.id
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating notice:', err);
    return NextResponse.json({ success: false, message: 'Failed to create notice.' }, { status: 500 });
  }
}
