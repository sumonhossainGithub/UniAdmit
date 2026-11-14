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
    const { status, remarks } = body;

    const validStatuses = ['under_review', 'approved', 'rejected', 'waitlisted', 'pending'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Valid status is required.' }, { status: 400 });
    }

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

    let assignedId = appRecord.assigned_id;
    let admitCardGen = appRecord.admit_card_generated;
    if (status === 'approved' && !assignedId) {
      assignedId = `${appRecord.short_name}-2026-${String(id).padStart(5, '0')}`;
      admitCardGen = true;
    }

    await sql`
      UPDATE applications
      SET status = ${status},
          remarks = COALESCE(${remarks || null}, remarks),
          assigned_id = ${assignedId},
          admit_card_generated = ${admitCardGen ? true : false}
      WHERE id = ${id}
    `;

    try {
      await supabase.from('applications').update({
        status,
        remarks,
        assigned_id: assignedId,
        admit_card_generated: admitCardGen ? true : false
      }).eq('id', String(id));
    } catch {}

    try {
      await supabase.from('notifications').insert({
        user_id: String(appRecord.student_id),
        title: `Admission Application Decision: ${status.toUpperCase()}`,
        message: `Your application for ${appRecord.program_name} at ${appRecord.university_name} has been reviewed and marked as ${status}.${remarks ? ' Note: ' + remarks : ''}`,
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info'
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Application reviewed successfully. New status: ${status}`,
      assigned_id: assignedId
    });
  } catch (err: any) {
    console.error('Error reviewing application:', err);
    return NextResponse.json({ success: false, message: 'Failed to submit review.' }, { status: 500 });
  }
}
