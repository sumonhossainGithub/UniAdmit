import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content, university_id, is_active } = body;

    const sql = getSql();
    const uniId = (university_id === '' || university_id === null || university_id === undefined) ? null : String(university_id);
    const activeBool = is_active !== undefined ? Boolean(is_active) : true;

    await sql`
      UPDATE notices
      SET title = COALESCE(${title ? title.trim() : null}, title),
          content = COALESCE(${content ? content.trim() : null}, content),
          university_id = ${uniId},
          is_active = ${activeBool}
      WHERE id = ${id}
    `;

    try {
      await supabase.from('notices').update({
        title: title ? title.trim() : undefined,
        content: content ? content.trim() : undefined,
        university_id: uniId,
        is_active: activeBool
      }).eq('id', String(id));
    } catch {}

    return NextResponse.json({ success: true, message: 'Notice updated successfully.' });
  } catch (err: any) {
    console.error('Error updating notice:', err);
    return NextResponse.json({ success: false, message: 'Failed to update notice.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getSql();

    await sql`DELETE FROM notices WHERE id = ${id}`;
    try {
      await supabase.from('notices').delete().eq('id', String(id));
    } catch {}

    return NextResponse.json({ success: true, message: 'Notice deleted successfully.' });
  } catch (err: any) {
    console.error('Error deleting notice:', err);
    return NextResponse.json({ success: false, message: 'Failed to delete notice.' }, { status: 500 });
  }
}
