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
    const { status = 'approved', remarks } = body;

    let appRecord: any = null;

    // 1. Try Neon
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          SELECT a.*, u.short_name AS university_short_name, u.name AS university_name, p.name AS program_name
          FROM applications a
          LEFT JOIN universities u ON a.university_id::text = u.id::text
          LEFT JOIN programs p ON a.program_id::text = p.id::text
          WHERE a.id::text = ${cleanId}
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          appRecord = rows[0];
        }
      } catch (neonErr) {
        console.warn('Neon verify application lookup failed:', neonErr);
      }
    }

    // 2. Fallback to Supabase
    if (!appRecord) {
      const { data: supaApp } = await supabase
        .from('applications')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (supaApp) {
        const [uniRes, progRes] = await Promise.all([
          supabase.from('universities').select('name, short_name').eq('id', String(supaApp.university_id)).maybeSingle(),
          supabase.from('programs').select('name').eq('id', String(supaApp.program_id)).maybeSingle()
        ]);
        appRecord = {
          ...supaApp,
          university_short_name: uniRes.data?.short_name || 'UNI',
          university_name: uniRes.data?.name || 'University',
          program_name: progRes.data?.name || 'Program'
        };
      }
    }

    if (!appRecord) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }

    let assignedId = appRecord.assigned_id;
    let admitCardGen = appRecord.admit_card_generated;
    if (status === 'approved' && !assignedId) {
      const shortName = appRecord.university_short_name || 'UNI';
      assignedId = `${shortName}-2026-${cleanId.padStart(5, '0')}`;
      admitCardGen = true;
    }

    // Update Neon if available
    if (sql) {
      try {
        await sql`
          UPDATE applications
          SET status = ${status},
              remarks = COALESCE(${remarks || null}, remarks),
              assigned_id = ${assignedId},
              admit_card_generated = ${admitCardGen ? true : false}
          WHERE id::text = ${cleanId}
        `;
      } catch (neonUpdateErr) {
        console.warn('Neon verify update failed:', neonUpdateErr);
      }
    }

    // Update Supabase
    try {
      const supaUpdate: any = {
        status,
        assigned_id: assignedId,
        admit_card_generated: admitCardGen ? true : false
      };
      if (remarks !== undefined && remarks !== null) supaUpdate.remarks = remarks;

      await supabase.from('applications').update(supaUpdate).eq('id', cleanId);

      await supabase.from('notifications').insert({
        user_id: String(appRecord.student_id),
        title: `Application Status: ${status.toUpperCase().replace('_', ' ')}`,
        message: `Your application #${cleanId} for ${appRecord.program_name} has been marked as ${status.replace('_', ' ')}.${remarks ? ' Remarks: ' + remarks : ''}`,
        type: status === 'approved' ? 'success' : (status === 'rejected' ? 'error' : 'info')
      });
    } catch (supaErr) {
      console.warn('Supabase verify update failed:', supaErr);
    }

    return NextResponse.json({
      success: true,
      message: `Application #${cleanId} updated to ${status}.`
    });
  } catch (err: any) {
    console.error('Error verifying application:', err);
    return NextResponse.json({ success: false, message: 'Failed to update application status.' }, { status: 500 });
  }
}
