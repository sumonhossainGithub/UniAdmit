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
    let { assigned_id } = body;

    const sql = getSql();

    const [appRecord] = await sql`
      SELECT a.*, u.short_name, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ${id}
    `;

    if (!appRecord) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }

    if (!assigned_id || !assigned_id.trim()) {
      assigned_id = `${appRecord.short_name}-2026-${String(id).padStart(5, '0')}`;
    }

    await sql`
      UPDATE applications
      SET assigned_id = ${assigned_id.trim()},
          admit_card_generated = true
      WHERE id = ${id}
    `;

    try {
      await supabase.from('applications').update({
        assigned_id: assigned_id.trim(),
        admit_card_generated: true
      }).eq('id', String(id));

      await supabase.from('notifications').insert({
        user_id: String(appRecord.student_id),
        title: 'Roll Number Assigned & Admit Card Ready',
        message: `You have been assigned Student Roll ID: ${assigned_id.trim()} for ${appRecord.program_name}. You can now view and print your Admit Card.`,
        type: 'success'
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Student ID successfully assigned and admit card unlocked!',
      assigned_id: assigned_id.trim()
    });
  } catch (err: any) {
    console.error('Error assigning student ID:', err);
    return NextResponse.json({ success: false, message: 'Failed to assign ID.' }, { status: 500 });
  }
}
