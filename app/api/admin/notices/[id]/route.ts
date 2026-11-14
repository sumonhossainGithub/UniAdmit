import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const body = await req.json();
    const { title, content, university_id, is_active } = body;

    const sql = getSql();
    const uniId = (university_id === '' || university_id === null || university_id === undefined) ? null : String(university_id);
    const activeBool = is_active !== undefined ? Boolean(is_active) : true;

    if (sql) {
      try {
        await sql`
          UPDATE notices
          SET title = COALESCE(${title ? title.trim() : null}, title),
              content = COALESCE(${content ? content.trim() : null}, content),
              university_id = ${uniId},
              is_active = ${activeBool}
          WHERE id::text = ${cleanId}
        `;
      } catch (neonErr) {
        console.warn('Neon notice update failed:', neonErr);
      }
    }

    try {
      await supabase.from('notices').update({
        title: title ? title.trim() : undefined,
        content: content ? content.trim() : undefined,
        university_id: uniId,
        is_active: activeBool
      }).eq('id', cleanId);
    } catch (supaErr) {
      console.warn('Supabase notice update failed:', supaErr);
    }

    return NextResponse.json({ success: true, message: 'Notice updated successfully.' });
  } catch (err: any) {
    console.error('Error updating notice:', err);
    return NextResponse.json({ success: false, message: 'Failed to update notice.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const sql = getSql();

    if (sql) {
      try {
        await sql`DELETE FROM notices WHERE id::text = ${cleanId}`;
      } catch (neonErr) {
        console.warn('Neon notice delete failed:', neonErr);
      }
    }

    try {
      await supabase.from('notices').delete().eq('id', cleanId);
    } catch (supaErr) {
      console.warn('Supabase notice delete failed:', supaErr);
    }

    return NextResponse.json({ success: true, message: 'Notice deleted successfully.' });
  } catch (err: any) {
    console.error('Error deleting notice:', err);
    return NextResponse.json({ success: false, message: 'Failed to delete notice.' }, { status: 500 });
  }
}
