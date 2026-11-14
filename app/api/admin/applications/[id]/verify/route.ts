import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { supabase } from '@/lib/supabase';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status = 'approved', remarks } = body;

    const sql = getSql();

    const [appRecord] = await sql`
      SELECT a.*, u.short_name AS university_short_name, u.name AS university_name, p.name AS program_name
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
      assignedId = `${appRecord.university_short_name}-2026-${String(id).padStart(5, '0')}`;
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

      await supabase.from('notifications').insert({
        user_id: String(appRecord.student_id),
        title: `Application Status Update: ${status.toUpperCase()}`,
        message: `Your application for ${appRecord.program_name} at ${appRecord.university_name} is now ${status}. ${remarks ? 'Remarks: ' + remarks : ''}`,
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info'
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Application status updated to ${status}.`,
      assigned_id: assignedId
    });
  } catch (err: any) {
    console.error('Error updating application status:', err);
    return NextResponse.json({ success: false, message: 'Failed to verify application.' }, { status: 500 });
  }
}
